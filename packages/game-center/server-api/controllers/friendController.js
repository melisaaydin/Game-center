const db = require("../models/db");
const { handleError, handleUnauthorized, handleNotFound, handleBadRequest } = require("../utils/errorHandler");

// Send a friend request to another user
const sendFriendRequest = async (req, res) => {
    const { friendId } = req.body;
    const senderId = req.user?.userId;
    if (!senderId) {
        return handleUnauthorized(res);
    }
    // Validate friend ID and prevent sending a request to oneself
    if (!friendId || friendId === senderId) {
        return handleBadRequest(res, "Invalid friend ID or cannot send request to yourself");
    }

    try {
        // Check if the target user exists in the database
        const friendCheck = await db.query("SELECT id FROM users WHERE id = $1", [friendId]);
        if (friendCheck.rows.length === 0) {
            return handleNotFound(res, "User not found");
        }
        // Check if a pending friend request already exists between these users
        const existingRequest = await db.query(
            "SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'",
            [senderId, friendId]
        );
        if (existingRequest.rows.length > 0) {
            return handleBadRequest(res, "Friend request already sent");
        }
        // Check if the users are already friends
        const mutualCheck = await db.query(
            "SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
            [senderId, friendId]
        );
        if (mutualCheck.rows.length > 0) {
            return handleBadRequest(res, "You are already friends");
        }
        // Create a new friend request in the database
        const result = await db.query(
            "INSERT INTO friend_requests (sender_id, receiver_id, status, created_at) VALUES ($1, $2, 'pending', NOW()) RETURNING id",
            [senderId, friendId]
        );
        const requestId = result.rows[0].id;
        // Get the sender's name to include in the notification
        const senderResult = await db.query("SELECT name FROM users WHERE id = $1", [senderId]);
        const senderName = senderResult.rows[0]?.name || "Unknown User";

        // Create a notification for the receiver about the friend request
        await db.query(
            "INSERT INTO notifications (user_id, type, content, sender_id, request_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
            [
                friendId,
                "friend_request",
                JSON.stringify({
                    message: `  sent you a friend request`,
                    senderId,
                    senderName,
                    requestId,
                    status: "pending",
                }),
                senderId,
                requestId,
            ]
        );
        // Emit a real-time event to the receiver about the new friend request
        req.io.to(friendId).emit("friend_request", {
            senderId,
            senderName,
            requestId,
        });
        // Send a success response to the sender
        res.json({ success: true, message: "Friend request sent", requestId });
    } catch (err) {
        handleError(res, err, "Failed to send friend request");
    }
};

// Retrieve all pending friend requests for the authenticated user
const getFriendRequests = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        return handleUnauthorized(res, "Unauthorized: No user ID found");
    }

    try {
        // Fetch all pending friend requests for the user, including sender details
        const result = await db.query(
            "SELECT fr.id, fr.sender_id, u.name, u.avatar_url FROM friend_requests fr JOIN users u ON fr.sender_id = u.id WHERE fr.receiver_id = $1 AND fr.status = 'pending'",
            [userId]
        );
        res.json({ success: true, requests: result.rows });
    } catch (err) {
        handleError(res, err, "Failed to retrieve friend requests");
    }
};
// Retrieve the list of friends for the authenticated user
const getFriends = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        return handleUnauthorized(res, "Unauthorized: No user ID found");
    }

    try {
        // Fetch the user's friends along with their details
        const result = await db.query(
            "SELECT u.id, u.name, u.avatar_url, u.last_active FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1",
            [userId]
        );
        res.json({ success: true, friends: result.rows });
    } catch (err) {
        handleError(res, err, "Failed to retrieve friends");
    }
};
// Accept a pending friend request
const acceptFriendRequest = async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res);
    }
    if (!requestId || isNaN(requestId)) {
        return handleBadRequest(res, "Invalid request ID");
    }
    // Check if the friend request exists and is pending
    try {
        const requestCheck = await db.query(
            "SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = 'pending'",
            [requestId, userId]
        );
        if (requestCheck.rows.length === 0) {
            return handleNotFound(res, "Friend request not found or already processed");
        }

        const { sender_id } = requestCheck.rows[0];

        // Start a database transaction to ensure consistency
        await db.query("BEGIN");

        // Add both users as friends in the friends table
        await db.query(
            "INSERT INTO friends (user_id, friend_id, created_at) VALUES ($1, $2, NOW()), ($2, $1, NOW())",
            [userId, sender_id]
        );
        // Update the friend request status to accepted
        await db.query("UPDATE friend_requests SET status = 'accepted' WHERE id = $1", [requestId]);
        // Update the notification to reflect the accepted status
        await db.query(
            "UPDATE notifications SET content = content || $1 WHERE request_id = $2 AND type = 'friend_request'",
            [JSON.stringify({ status: "accepted" }), requestId]
        );
        // Get the receiver's name to include in the notification
        const senderResult = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const receiverName = senderResult.rows[0]?.name || "Unknown User";
        // Create a notification for the sender about the accepted friend request
        await db.query(
            "INSERT INTO notifications (user_id, type, content, sender_id, created_at) VALUES ($1, $2, $3, $4, NOW())",
            [
                sender_id,
                "friend_accepted",
                JSON.stringify({
                    message: `accepted your friend request`,
                    receiverId: userId,
                    receiverName,
                }),
                userId,
            ]
        );

        // Emit a real-time event to the sender about the accepted friend request
        req.io.to(sender_id).emit("friend_accepted", {
            senderId: userId,
            senderName: receiverName,
        });

        // Fetch the friend's details to include in the response
        const friendData = await db.query("SELECT id, name, avatar_url FROM users WHERE id = $1", [
            sender_id,
        ]);

        // Commit the transaction
        await db.query("COMMIT");

        // Send a success response with the friend's details
        res.json({
            success: true,
            message: "Friend request accepted",
            friend: friendData.rows[0],
        });
    } catch (err) {
        // Roll back the transaction in case of an error
        await db.query("ROLLBACK");
        handleError(res, err, "Failed to accept friend request");
    }
};

// Reject a pending friend request
const rejectFriendRequest = async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res, "Unauthorized: No user ID found");
    }
    if (!requestId || isNaN(requestId)) {
        return handleBadRequest(res, "Invalid request ID");
    }
    try {
        // Update the friend request status to rejected
        const result = await db.query(
            "UPDATE friend_requests SET status = 'rejected' WHERE id = $1 AND receiver_id = $2",
            [requestId, userId]
        );

        if (result.rowCount === 0) {
            return handleNotFound(res, "Friend request not found");
        }
        // Update the notification to reflect the rejected status

        await db.query(
            "UPDATE notifications SET content = content || $1 WHERE request_id = $2 AND type = 'friend_request'",
            [JSON.stringify({ status: "rejected" }), requestId]
        );

        res.json({ success: true, message: "Friend request rejected" });
    } catch (err) {
        handleError(res, err, "Failed to reject friend request");
    }
};
// Remove a friend from the user's friend list
const removeFriend = async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res, "Unauthorized: No user ID found");
    }

    try {
        // Delete the friendship from the friends table
        const result = await db.query(
            "DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
            [userId, friendId]
        );

        if (result.rowCount === 0) {
            return handleNotFound(res, "Friend not found");
        }

        res.json({ success: true, message: "Friend removed" });
    } catch (err) {
        handleError(res, err, "Failed to remove friend");
    }
};

// Check the friend request status between two users
const getFriendRequestStatus = async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res, "Unauthorized: No user ID found");
    }

    try {
        // Check if there is a pending friend request from the user to the target
        const pendingRequest = await db.query(
            "SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'",
            [userId, friendId]
        );
        if (pendingRequest.rows.length > 0) {
            return res.json({ success: true, status: "pending" });
        }
        //Check if the users are already friends
        const areFriends = await db.query(
            "SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
            [userId, friendId]
        );
        if (areFriends.rows.length > 0) {
            return res.json({ success: true, status: "friends" });
        }

        res.json({ success: true, status: "none" });
    } catch (err) {
        handleError(res, err, "Failed to check friend request status");
    }
};

// Cancel a pending friend request sent by the user
const cancelFriendRequest = async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res, "Unauthorized: No user ID found");
    }
    if (!friendId || isNaN(friendId)) {
        return handleBadRequest(res, "Invalid friend ID");
    }

    try {
        // Delete the pending friend request from the database
        const result = await db.query(
            "DELETE FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = $3",
            [userId, friendId, "pending"]
        );

        if (result.rowCount === 0) {
            return handleNotFound(res, "No pending friend request found");
        }

        res.json({ success: true, message: "Friend request canceled" });
    } catch (err) {
        handleError(res, err, "Failed to cancel friend request");
    }
};

module.exports = {
    getFriendRequests,
    getFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriendRequestStatus,
    cancelFriendRequest,
};