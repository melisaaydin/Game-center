const db = require("../models/db");

const sendFriendRequest = async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!" });
    }


    if (!friendId) {
        return res.status(400).json({ success: false, message: "Friend ID is required!" });
    }

    if (userId === friendId) {
        return res.status(400).json({ success: false, message: "Cannot send friend request to yourself!" });
    }

    try {
        const userCheck = await db.query("SELECT id FROM users WHERE id = $1", [friendId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        const existingRequest = await db.query(
            "SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'",
            [userId, friendId]
        );
        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Friend request already sent!" });
        }

        const areFriends = await db.query(
            "SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
            [userId, friendId]
        );
        if (areFriends.rows.length > 0) {
            return res.status(400).json({ success: false, message: "You are already friends!" });
        }

        const requestResult = await db.query(
            "INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending') RETURNING id",
            [userId, friendId]
        );
        const requestId = requestResult.rows[0].id;

        await db.query(
            "INSERT INTO notifications (user_id, type, content, sender_id, request_id) VALUES ($1, $2, $3, $4, $5)",
            [friendId, 'friend_request', JSON.stringify({ senderId: userId, message: `Friend request` }), userId, requestId]
        );

        res.json({ success: true, message: "Friend request sent!", requestId });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to send friend request: " + err.message });
    }
};

const getFriendRequests = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!" });
    }

    try {
        const result = await db.query(
            "SELECT fr.id, fr.sender_id, u.name, u.avatar_url FROM friend_requests fr JOIN users u ON fr.sender_id = u.id WHERE fr.receiver_id = $1 AND fr.status = 'pending'",
            [userId]
        );
        res.json({ success: true, requests: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to retrieve friend requests!" });
    }
};

const getFriends = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!" });
    }

    try {
        const result = await db.query(
            "SELECT u.id, u.name, u.avatar_url FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1",
            [userId]
        );
        res.json({ success: true, friends: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to retrieve friends!" });
    }
};

const acceptFriendRequest = async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!" });
    }

    try {
        const request = await db.query(
            "SELECT sender_id FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = 'pending'",
            [requestId, userId]
        );

        if (request.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Friend request not found!" });
        }

        const senderId = request.rows[0].sender_id;

        await db.query("UPDATE friend_requests SET status = 'accepted' WHERE id = $1", [requestId]);
        await db.query(
            "INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)",
            [userId, senderId]
        );

        // Fetch the new friend's data
        const friendData = await db.query(
            "SELECT id, name, avatar_url FROM users WHERE id = $1",
            [senderId]
        );

        if (friendData.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Sender user not found!" });
        }

        await db.query(
            "INSERT INTO notifications (user_id, type, content, sender_id) VALUES ($1, $2, $3, $4)",
            [senderId, 'friend_accepted', JSON.stringify({ receiverId: userId, message: `Friend request accepted` }), userId]
        );

        res.json({
            success: true,
            message: "Friend request accepted!",
            friend: {
                id: friendData.rows[0].id,
                name: friendData.rows[0].name || 'Unknown User',
                avatar_url: friendData.rows[0].avatar_url || '',
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to accept friend request!" });
    }
};
const rejectFriendRequest = async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!" });
    }

    try {
        const result = await db.query(
            "UPDATE friend_requests SET status = 'rejected' WHERE id = $1 AND receiver_id = $2",
            [requestId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Friend request not found!" });
        }
        res.json({ success: true, message: "Friend request rejected!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to reject friend request!" });
    }
};

const removeFriend = async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!" });
    }

    try {
        const result = await db.query(
            "DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
            [userId, friendId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Friend not found!" });
        }

        res.json({ success: true, message: "Friend removed!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to remove friend!" });
    }
};

const getNotifications = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!", notifications: [] });
    }

    try {
        const notifications = await db.query(
            "SELECT n.*, fr.id AS request_id, u.name AS sender_name, u.avatar_url AS sender_avatar_url " +
            "FROM notifications n " +
            "LEFT JOIN friend_requests fr ON n.request_id = fr.id AND fr.status = 'pending' " +
            "LEFT JOIN users u ON n.sender_id = u.id " +
            "WHERE n.user_id = $1 ORDER BY n.created_at DESC",
            [userId]
        );

        const formattedNotifications = notifications.rows.map((n) => {
            let content = null;
            try {
                content = n.content ? (typeof n.content === 'string' ? JSON.parse(n.content) : n.content) : null;
            } catch (e) {
                console.warn(`Invalid JSON content for notification ${n.id}:`, n.content);
            }
            return {
                id: n.id,
                type: n.type,
                sender_id: n.sender_id || null,
                sender_name: n.sender_name || (n.type === 'friend_request' ? 'Unknown User' : 'System'),
                sender_avatar_url: n.sender_avatar_url || null,
                request_id: n.request_id || null,
                is_read: n.is_read,
                content,
                created_at: n.created_at,
            };
        });
        res.json({ success: true, notifications: formattedNotifications || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to retrieve notifications: " + err.message, notifications: [] });
    }
};

const markNotificationAsRead = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!" });
    }

    try {
        const result = await db.query(
            "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
            [notificationId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Notification not found!" });
        }

        res.json({ success: true, message: "Notification marked as read!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to mark notification as read!" });
    }
};

const deleteNotification = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!" });
    }

    if (!notificationId || isNaN(notificationId)) {
        return res.status(400).json({ success: false, message: "Invalid notification ID!" });
    }

    try {
        const result = await db.query(
            "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
            [notificationId, userId]
        );

        if (result.rowCount === 0) {
            console.warn(`Notification ID: ${notificationId} not found for user ID: ${userId}`);
            return res.status(404).json({ success: false, message: "Notification not found or you don't have permission!" });
        }

        console.log(`Notification ID: ${notificationId} deleted successfully`);
        res.json({ success: true, message: "Notification deleted!" });
    } catch (err) {
        console.error(`Error deleting notification ID: ${notificationId}`, err.message, err.stack);
        res.status(500).json({ success: false, message: `Failed to delete notification: ${err.message}` });
    }
};
const getFriendRequestStatus = async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        console.error("User ID missing from token");
        return res.status(401).json({ success: false, message: "Unauthorized: No user ID found!" });
    }

    try {
        const pendingRequest = await db.query(
            "SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'",
            [userId, friendId]
        );
        if (pendingRequest.rows.length > 0) {
            return res.json({ success: true, status: "pending" });
        }

        const areFriends = await db.query(
            "SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
            [userId, friendId]
        );
        if (areFriends.rows.length > 0) {
            return res.json({ success: true, status: "friends" });
        }

        res.json({ success: true, status: "none" });
    } catch (err) {
        console.error("Error checking friend status:", err.message, err.stack);
        res.status(500).json({ success: false, message: "Failed to check friend request status!" });
    }
};
const cancelFriendRequest = async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        console.error('User ID missing from token');
        return res.status(401).json({ success: false, message: 'Unauthorized: No user ID found!' });
    }

    if (!friendId || isNaN(friendId)) {
        console.error(`Invalid friend ID: ${friendId}`);
        return res.status(400).json({ success: false, message: 'Invalid friend ID!' });
    }

    try {
        console.log(`Attempting to cancel friend request from user ID: ${userId} to friend ID: ${friendId}`);
        const result = await db.query(
            'DELETE FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = $3',
            [userId, friendId, 'pending']
        );

        if (result.rowCount === 0) {
            console.warn(`No pending friend request found from user ID: ${userId} to friend ID: ${friendId}`);
            return res.status(404).json({ success: false, message: 'No pending friend request found!' });
        }

        console.log(`Friend request canceled successfully from user ID: ${userId} to friend ID: ${friendId}`);
        res.json({ success: true, message: 'Friend request canceled!' });
    } catch (err) {
        console.error(`Error canceling friend request: ${err.message}`, err.stack);
        res.status(500).json({ success: false, message: `Failed to cancel friend request: ${err.message}` });
    }
};
module.exports = {
    getFriendRequests,
    getFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getNotifications,
    markNotificationAsRead,
    deleteNotification,
    getFriendRequestStatus,
    cancelFriendRequest
};