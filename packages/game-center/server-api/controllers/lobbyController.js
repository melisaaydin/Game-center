const db = require("../models/db");
const bcrypt = require("bcrypt");
const { handleError, handleUnauthorized, handleNotFound, handleBadRequest } = require("../utils/errorHandler");

// Create a new lobby
const createLobby = async (req, res) => {
    const { name, is_event, start_time, end_time, password, game_id, max_players } = req.body;
    const userId = req.user ? req.user.userId : req.body.userId;


    if (!userId) {
        return handleUnauthorized(res);
    }

    if (!name || !game_id || !max_players) {
        return handleBadRequest(res, "Lobby name, game ID, and maximum number of players are required!");
    }

    try {
        // Check if user already has an active lobby
        const userLobbyCheck = await db.query(
            "SELECT lp.id FROM lobby_players lp JOIN lobbies l ON lp.lobby_id = l.id WHERE lp.user_id = $1 AND l.lobby_status = 'active'",
            [userId]
        );
        if (userLobbyCheck.rows.length > 0) {
            return handleBadRequest(res, "You are already in a lobby!");
        }

        // Hash the password if provided
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        // Insert new lobby into database
        const query = `
            INSERT INTO lobbies (name, is_event, start_time, end_time, password, game_id, max_players, current_players, created_by, lobby_status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, 'active', NOW(), NOW()) RETURNING *;
        `;
        const values = [name, is_event, start_time || null, end_time || null, hashedPassword, game_id, max_players, userId];

        const result = await db.query(query, values);
        const newLobby = result.rows[0];

        await db.query("INSERT INTO lobby_players (lobby_id, user_id, is_ready) VALUES ($1, $2, TRUE)", [newLobby.id, userId]);
        await db.query("UPDATE lobbies SET current_players = 1 WHERE id = $1", [newLobby.id]);

        res.status(201).json({ success: true, message: "Lobby created.", lobby: newLobby });
    } catch (err) {
        handleError(res, err, "Failed to create lobby");
    }
};

// Get all lobbies
const getLobbies = async (req, res) => {
    const { gameId } = req.query;
    let query = `
        SELECT l.*, u.name as created_by_name 
        FROM lobbies l
        LEFT JOIN users u ON l.created_by = u.id
    `;
    const values = gameId ? [gameId] : [];

    if (gameId) query += " WHERE l.game_id = $1";
    query += " ORDER BY l.is_event DESC, l.created_at DESC";

    try {
        const result = await db.query(query, values);
        const lobbies = result.rows;
        const now = new Date();

        // Update the status of expired or inactive lobbies
        const updatedLobbies = await Promise.all(
            lobbies.map(async (lobby) => {
                lobby.created_by = String(lobby.created_by);
                // Close event lobby if the end time has passed
                if (lobby.is_event && lobby.end_time && lobby.lobby_status === "active") {
                    const endTime = new Date(lobby.end_time);
                    if (endTime <= now) {
                        await db.query("UPDATE lobbies SET lobby_status = 'closed' WHERE id = $1", [lobby.id]);
                        await db.query("DELETE FROM lobby_players WHERE lobby_id = $1", [lobby.id]);
                        req.io.to(lobby.id).emit("lobby_closed", { lobbyId: lobby.id });
                        return { ...lobby, lobby_status: "closed" };
                    }
                }
                return lobby;
            })
        );
        // Return only active lobbies
        const filteredLobbies = updatedLobbies.filter(lobby => lobby.lobby_status !== "closed");
        res.status(200).json({ success: true, lobbies: filteredLobbies });
    } catch (err) {
        // Use handleError for server-side errors
        handleError(res, err, "Failed to retrieve lobbies");
    }
};

// Get details of a single lobby, including its players
const getLobby = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(id)) {
        // Use handleBadRequest for invalid lobby ID
        return handleBadRequest(res, "A valid lobby ID is required.");
    }

    try {
        // Fetch the lobby details along with the creator's name
        const result = await db.query(
            `SELECT l.*, u.name AS created_by_name 
             FROM lobbies l 
             LEFT JOIN users u ON l.created_by = u.id 
             WHERE l.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            // Use handleNotFound for non-existent lobby
            return handleNotFound(res, "Lobby not found!");
        }

        const lobby = result.rows[0];

        // Fetch the list of players in the lobby
        const playersResult = await db.query(
            `SELECT u.id, u.name, u.avatar_url, lp.is_ready
             FROM lobby_players lp
             JOIN users u ON lp.user_id = u.id
             WHERE lp.lobby_id = $1`,
            [id]
        );
        const players = playersResult.rows;
        // Send the lobby details along with its players
        res.json({ ...lobby, players });
    } catch (err) {
        handleError(res, err, "Failed to retrieve lobby details");
    }
};

// Update details of an existing lobby
const updateLobby = async (req, res) => {
    const { id } = req.params;
    const { name, max_players, password, is_event, start_time, end_time, gameId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res);
    }

    if (!name || !gameId || !max_players) {
        return handleBadRequest(res, "Lobby name, game ID, and maximum number of players are required!");
    }

    try {
        // Check if the lobby exists and the user is the creator
        const lobbyResult = await db.query(
            "SELECT * FROM lobbies WHERE id = $1 AND created_by = $2",
            [id, userId]
        );
        if (lobbyResult.rows.length === 0) {
            return handleUnauthorized(res, "You do not have permission to update this lobby or the lobby was not found!");
        }

        const lobby = lobbyResult.rows[0];

        if (max_players !== undefined && max_players < lobby.current_players) {
            return handleBadRequest(res, "Max players cannot be less than current players!");
        }

        // Hash the password if provided, or set to null if explicitly removed
        const hashedPassword = password ? await bcrypt.hash(password, 10) : password === null ? null : lobby.password;

        // Prepare the query and values
        const query = `
            UPDATE lobbies
            SET 
                name = COALESCE($1, name),
                max_players = COALESCE($2, max_players),
                password = $3,
                is_event = COALESCE($4, is_event),
                start_time = $5,
                end_time = $6,
                game_id = COALESCE($7, game_id),
                updated_at = NOW()
            WHERE id = $8
            RETURNING *
        `;
        const values = [
            name || null,
            max_players || null,
            hashedPassword,
            is_event !== undefined ? is_event : null,
            start_time || null,
            end_time || null,
            gameId || null,
            id
        ];

        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return handleNotFound(res, "Lobby not found.");
        }

        res.status(200).json({ success: true, lobby: result.rows[0] });
    } catch (err) {
        handleError(res, err, "Failed to update lobby");
    }
};

// Delete a lobby and its associated data
const deleteLobby = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    try {
        // Check if the user has permission to delete the lobby
        const lobbyResult = await db.query(
            "SELECT * FROM lobbies WHERE id = $1 AND created_by = $2",
            [id, userId]
        );
        if (lobbyResult.rows.length === 0) {

            return handleUnauthorized(res, "You do not have permission to delete this lobby!");
        }

        // Delete related records
        await db.query("DELETE FROM lobby_players WHERE lobby_id = $1", [id]);
        await db.query("DELETE FROM lobby_messages WHERE lobby_id = $1", [id]);
        await db.query("DELETE FROM lobbies WHERE id = $1", [id]);

        res.status(200).json({ success: true, message: "Lobby deleted successfully" });
    } catch (err) {
        handleError(res, err, "Failed to delete lobby");
    }
};

// Get all players in a specific lobby
const getLobbyPlayers = async (req, res) => {
    const { lobbyId } = req.params;

    try {
        const query = `
            SELECT u.id, u.name, u.avatar_url 
            FROM users u
            WHERE u.lobby_id = $1;
        `;
        const result = await db.query(query, [lobbyId]);
        res.status(200).json({ success: true, players: result.rows });
    } catch (err) {
        handleError(res, err, "Failed to retrieve players");
    }
};

// Join a user to a lobby
const joinLobby = async (req, res) => {
    const { id } = req.params;
    const { userId, password } = req.body;

    if (!userId) {
        return handleBadRequest(res, "A valid user ID is required!");
    }

    try {
        // Check if user is already in another active lobby
        const userLobbyCheck = await db.query(
            "SELECT lp.id FROM lobby_players lp JOIN lobbies l ON lp.lobby_id = l.id WHERE lp.user_id = $1 AND l.lobby_status = 'active'",
            [userId]
        );
        if (userLobbyCheck.rows.length > 0) {
            return handleBadRequest(res, "You are already in another active lobby!");
        }
        // Fetch the lobby details
        const lobbyResult = await db.query("SELECT * FROM lobbies WHERE id = $1", [id]);
        if (lobbyResult.rows.length === 0) {
            return handleNotFound(res, "Lobby not found.");
        }

        const lobby = lobbyResult.rows[0];

        // Validate password if lobby is protected
        if (lobby.password && !password) {
            return handleBadRequest(res, "Password is required.");
        }
        if (lobby.password && !(await bcrypt.compare(password, lobby.password))) {
            return handleUnauthorized(res, "Wrong password.");
        }

        // Check if the lobby has reached its maximum capacity
        if (lobby.current_players >= lobby.max_players) {
            return handleBadRequest(res, "Lobby is full.");
        }
        // Check if user already joined this lobby
        const userCheck = await db.query("SELECT * FROM lobby_players WHERE lobby_id = $1 AND user_id = $2", [id, userId]);
        if (userCheck.rows.length > 0) {
            return res.status(200).json({ success: true, message: "Already in this lobby.", alreadyJoined: true });
        }
        // Add user to lobby
        await db.query(
            "INSERT INTO lobby_players (lobby_id, user_id, is_ready) VALUES ($1, $2, FALSE)",
            [id, userId]
        );

        // Update the lobby's player count
        await db.query(
            "UPDATE lobbies SET current_players = current_players + 1 WHERE id = $1",
            [id]
        );

        // Fetch user and lobby details for notification
        const userResult = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const lobbyName = lobby.name || "Unnamed Lobby";
        const userName = userResult.rows[0]?.name || "Unknown User";

        // Fetch lobby players to notify them
        const playersResult = await db.query(
            "SELECT user_id FROM lobby_players WHERE lobby_id = $1 AND user_id != $2",
            [id, userId]
        );
        const players = playersResult.rows;

        // Create notifications for all other players in the lobby
        for (const player of players) {
            await db.query(
                "INSERT INTO notifications (user_id, type, content, sender_id, created_at) VALUES ($1, $2, $3, $4, NOW())",
                [
                    player.user_id,
                    "lobby_joined",
                    JSON.stringify({
                        lobbyId: id,
                        lobbyName,
                        userId,
                        userName,
                        message: `joined ${lobbyName}!`,
                    }),
                    userId,
                ]
            );

            // Emit real-time notification to each player
            req.io.to(player.user_id).emit("lobby_joined", {
                lobbyId: id,
                lobbyName,
                userId,
                userName,
            });
        }

        // Emit lobby_joined event to the lobby room
        req.io.to(id).emit("lobby_joined", { userId, userName });

        res.status(200).json({ success: true, message: "You have joined the lobby." });
    } catch (err) {
        handleError(res, err, "Failed to join the lobby");
    }
};

// Remove a user from a lobby
const leaveLobby = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
        return handleBadRequest(res, "A valid user ID is required!");
    }

    try {
        // Start a database transaction
        await db.query("BEGIN");

        // Remove user from lobby
        const result = await db.query(
            "DELETE FROM lobby_players WHERE lobby_id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rowCount === 0) {
            await db.query("ROLLBACK");
            // Use handleBadRequest for users not in the lobby
            return handleBadRequest(res, "You are not in this lobby.");
        }

        // Update the lobby's player count
        const updateResult = await db.query(
            "UPDATE lobbies SET current_players = GREATEST(current_players - 1, 0), updated_at = NOW() WHERE id = $1 RETURNING current_players",
            [id]
        );
        if (updateResult.rows.length === 0) {
            await db.query("ROLLBACK");
            return handleNotFound(res, "Lobby not found.");
        }
        const newPlayerCount = updateResult.rows[0].current_players;

        // Get user’s name for the chat message
        const userResult = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            await db.query("ROLLBACK");
            return handleNotFound(res, "User not found.");
        }
        const userName = userResult.rows[0].name;

        // Add a system message to the lobby chat indicating the user has left
        const leaveMessage = {
            user: "System",
            content: `${userName} left the lobby!`,
            timestamp: new Date().toISOString(),
            isSystem: true
        };
        await db.query(
            "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
            [id, null, leaveMessage.content]
        );

        // Emit the system message to the lobby
        req.io.to(id).emit("receive_message", leaveMessage);

        // Check if there are no players left in the lobby
        if (newPlayerCount <= 0) {
            await db.query("UPDATE lobbies SET lobby_status = 'closed' WHERE id = $1", [id]);
            await db.query("DELETE FROM lobby_players WHERE lobby_id = $1", [id]);
        }

        await db.query("COMMIT"); // Commit the transaction
        res.status(200).json({ success: true, message: "You left the lobby." });
    } catch (err) {
        await db.query("ROLLBACK");
        handleError(res, err, "Failed to leave the lobby");
    }
};

// Get all chat messages for a specific lobby
const getLobbyMessages = async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch all messages for the lobby, including user details
        const result = await db.query(
            `SELECT lm.id, lm.message AS content, lm.created_at, u.name AS user, u.avatar_url
             FROM lobby_messages lm
             LEFT JOIN users u ON lm.user_id = u.id
             WHERE lm.lobby_id = $1
             ORDER BY lm.created_at ASC`,
            [parseInt(id)]
        );
        res.status(200).json({ success: true, messages: result.rows });
    } catch (err) {
        // Use handleError for server-side errors
        handleError(res, err, "Failed to retrieve messages");
    }
};

// Send a message to a lobby's chat
const sendLobbyMessage = async (req, res) => {
    const { id } = req.params;
    const { userId, message } = req.body;
    if (!userId || !message) {
        return handleBadRequest(res, "User ID and message are required!");
    }

    try {
        // Insert the new message into the lobby chat
        await db.query(
            "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
            [id, userId, message]
        );
        res.status(200).json({ success: true, message: "Message sent." });
    } catch (err) {
        handleError(res, err, "Failed to send message");
    }
};

// Invite a user to a lobby
const inviteToLobby = async (req, res) => {
    const { id } = req.params;
    const { receiverId } = req.body;
    const senderId = req.user?.userId;

    if (!senderId) {
        return handleUnauthorized(res);
    }
    if (!receiverId || isNaN(receiverId)) {
        return handleBadRequest(res, "Receiver ID is required and must be a valid number!");
    }
    const parsedLobbyId = parseInt(id);
    if (isNaN(parsedLobbyId)) {
        return handleBadRequest(res, "Invalid lobby ID format!");
    }

    try {
        // Check if the lobby exists and is active
        const lobbyCheck = await db.query("SELECT * FROM lobbies WHERE id = $1 AND lobby_status = 'active'", [parsedLobbyId]);
        if (lobbyCheck.rows.length === 0) {
            return handleNotFound(res, "Lobby not found or is not active!");
        }

        // Check if the sender is in the lobby
        const senderInLobby = await db.query(
            "SELECT * FROM lobby_players WHERE lobby_id = $1 AND user_id = $2",
            [parsedLobbyId, senderId]
        );
        if (senderInLobby.rows.length === 0) {
            return handleBadRequest(res, "You must be in the lobby to send an invite!");
        }

        // Check if the receiver is already in the lobby
        const playerCheck = await db.query(
            "SELECT * FROM lobby_players WHERE lobby_id = $1 AND user_id = $2",
            [parsedLobbyId, receiverId]
        );
        if (playerCheck.rows.length > 0) {
            return handleBadRequest(res, "User is already in the lobby!");
        }

        // Check if an invite has already been sent
        const existingInvite = await db.query(
            "SELECT * FROM invitations WHERE lobby_id = $1 AND sender_id = $2 AND receiver_id = $3 AND status = 'pending'",
            [parsedLobbyId, senderId, receiverId]
        );
        if (existingInvite.rows.length > 0) {
            return handleBadRequest(res, "Invite already sent!");
        }

        // Create a new invitation
        const inviteResult = await db.query(
            "INSERT INTO invitations (lobby_id, sender_id, receiver_id, status, created_at) VALUES ($1, $2, $3, 'pending', NOW()) RETURNING id",
            [parsedLobbyId, senderId, receiverId]
        );
        const invitationId = inviteResult.rows[0].id;

        // Fetch sender and lobby details for the notification
        const senderResult = await db.query("SELECT name FROM users WHERE id = $1", [senderId]);
        const lobbyResult = await db.query("SELECT name FROM lobbies WHERE id = $1", [parsedLobbyId]);
        const senderName = senderResult.rows[0]?.name || "Unknown User";
        const lobbyName = lobbyResult.rows[0]?.name || "Unnamed Lobby";

        // Create a notification for the receiver
        await db.query(
            "INSERT INTO notifications (user_id, type, content, sender_id, invitation_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
            [
                receiverId,
                "lobby_invite",
                JSON.stringify({
                    id: parsedLobbyId,
                    lobbyName,
                    senderId,
                    senderName,
                    invitationId,
                    message: `invited you to join ${lobbyName}`,
                    status: 'pending'
                }),
                senderId,
                invitationId
            ]
        );

        // Emit a real-time event to the receiver
        req.io.to(receiverId).emit("lobby_invite", {
            id: parsedLobbyId,
            lobbyName,
            senderId,
            senderName,
            invitationId,
        });

        res.json({ success: true, message: "Invite sent successfully!", invitationId });
    } catch (err) {
        handleError(res, err, "Failed to send invite");
    }
};

// Accept a lobby invitation
const acceptLobbyInvite = async (req, res) => {
    const { invitationId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
        return handleUnauthorized(res);
    }

    try {
        const userLobbyCheck = await db.query(
            "SELECT lp.id FROM lobby_players lp JOIN lobbies l ON lp.lobby_id = l.id WHERE lp.user_id= $1 AND l.lobby_status='active'",
            [userId]
        );
        if (userLobbyCheck.rows.length > 0) {
            return handleBadRequest(res, "You are already in another active lobby!");
        }
        const inviteResult = await db.query(
            "SELECT * FROM invitations WHERE id = $1 AND receiver_id = $2 AND status = 'pending'",
            [invitationId, userId]
        );
        if (inviteResult.rows.length === 0) {
            return handleNotFound(res, "Invitation not found or already processed!");
        }
        const { lobby_id, sender_id } = inviteResult.rows[0];
        const lobbyCheck = await db.query("SELECT * FROM lobbies WHERE id = $1", [lobby_id]);
        if (lobbyCheck.rows.length === 0) {
            return handleNotFound(res, "Lobby no longer exists!");
        }
        const lobby = lobbyCheck.rows[0];

        if (lobby.current_players >= lobby.max_players) {
            // Use handleBadRequest for full lobby
            return handleBadRequest(res, "Lobby is full!");
        }

        // Update the invitation status to 'accepted'
        await db.query("UPDATE invitations SET status = 'accepted' WHERE id = $1", [invitationId]);

        // Fetch the existing notification to update its content
        const notificationResult = await db.query(
            "SELECT content FROM notifications WHERE invitation_id = $1 AND type = 'lobby_invite'",
            [invitationId]
        );
        if (notificationResult.rows.length > 0) {
            const existingContent = notificationResult.rows[0].content || {};
            const updatedContent = {
                ...existingContent,
                status: 'accepted',
                id: lobby_id,
            };

            // Update the notification with the new content
            await db.query(
                "UPDATE notifications SET content = $1 WHERE invitation_id = $2 AND type = 'lobby_invite'",
                [JSON.stringify(updatedContent), invitationId]
            );
        }
        // Add the user to the lobby
        await db.query(
            "INSERT INTO lobby_players (lobby_id, user_id, joined_at) VALUES ($1, $2, NOW())",
            [lobby_id, userId]
        );
        // Update the lobby's player count
        await db.query(
            "UPDATE lobbies SET current_players = current_players + 1 WHERE id = $1",
            [lobby_id]
        );
        // Fetch sender, receiver, and lobby details for the notification
        const senderResult = await db.query("SELECT name FROM users WHERE id = $1", [sender_id]);
        const receiverResult = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const lobbyResult = await db.query("SELECT name FROM lobbies WHERE id = $1", [lobby_id]);
        const senderName = senderResult.rows[0]?.name || "Unknown User";
        const receiverName = receiverResult.rows[0]?.name || "Unknown User";
        const lobbyName = lobbyResult.rows[0]?.name || "Unnamed Lobby";

        // Create a notification for the sender
        await db.query(
            "INSERT INTO notifications (user_id, type, content, sender_id, created_at) VALUES ($1, $2, $3, $4, NOW())",
            [
                sender_id,
                "lobby_invite_accepted",
                JSON.stringify({
                    lobbyId: lobby_id,
                    lobbyName,
                    receiverId: userId,
                    receiverName,
                    message: `accepted your invitation to ${lobbyName}`,
                }),
                userId,
            ]
        );
        req.io.to(lobby_id).emit("lobby_joined", { userId, userName: receiverName });
        req.io.to(sender_id).emit("lobby_invite_accepted", {
            lobbyId: lobby_id,
            lobbyName,
            receiverId: userId,
            receiverName,
        });
        res.json({ success: true, message: "Invitation accepted and joined the lobby!", lobbyId: lobby_id });
    } catch (err) {
        handleError(res, err, "Failed to accept invite");
    }
};

// Reject a lobby invitation
const rejectLobbyInvite = async (req, res) => {
    const { invitationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res);
    }

    try {
        // Fetch the invitation details
        const inviteResult = await db.query(
            "SELECT * FROM invitations WHERE id = $1 AND receiver_id = $2 AND status = 'pending'",
            [invitationId, userId]
        );
        if (inviteResult.rows.length === 0) {
            return handleNotFound(res, "Invitation not found or already processed!");
        }

        // Update the invitation status to 'rejected'
        await db.query("UPDATE invitations SET status = 'rejected' WHERE id = $1", [invitationId]);

        // Fetch the existing notification to update its content
        const notificationResult = await db.query(
            "SELECT content FROM notifications WHERE invitation_id = $1 AND type = 'lobby_invite'",
            [invitationId]
        );
        if (notificationResult.rows.length > 0) {
            const existingContent = notificationResult.rows[0].content || {};
            const updatedContent = {
                ...existingContent,
                status: 'rejected',
            };

            // Update the notification with the new content
            await db.query(
                "UPDATE notifications SET content = $1 WHERE invitation_id = $2 AND type = 'lobby_invite'",
                [JSON.stringify(updatedContent), invitationId]
            );
        }

        const { sender_id, lobby_id } = inviteResult.rows[0];

        // Fetch lobby and receiver details for the notification
        const lobbyResult = await db.query("SELECT name FROM lobbies WHERE id = $1", [lobby_id]);
        const receiverResult = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        const lobbyName = lobbyResult.rows[0]?.name || "Unnamed Lobby";
        const receiverName = receiverResult.rows[0]?.name || "Unknown User";

        // Create a notification for the sender
        await db.query(
            "INSERT INTO notifications (user_id, type, content, sender_id, created_at) VALUES ($1, $2, $3, $4, NOW())",
            [
                sender_id,
                "lobby_invite_rejected",
                JSON.stringify({
                    lobbyId: lobby_id,
                    lobbyName,
                    receiverId: userId,
                    receiverName,
                    message: `${receiverName} rejected your invitation to ${lobbyName}`,
                }),
                userId,
            ]
        );
        // Emit real-time event to the sender
        req.io.to(sender_id).emit("lobby_invite_rejected", {
            lobbyId: lobby_id,
            lobbyName,
            receiverId: userId,
            receiverName,
        });

        res.json({ success: true, message: "Invitation rejected!" });
    } catch (err) {
        handleError(res, err, "Failed to reject invite");
    }
};

// Get invitable friends for a lobby
const getInvitableFriends = async (req, res) => {
    const userId = req.user?.userId;
    const { lobbyId } = req.params;

    if (!userId) {
        return handleUnauthorized(res);
    }
    if (!lobbyId || isNaN(lobbyId)) {
        return handleBadRequest(res, "A valid lobby ID is required.");
    }

    try {
        const lobbyCheck = await db.query("SELECT * FROM lobbies WHERE id = $1 AND lobby_status = 'active'", [lobbyId]);
        if (lobbyCheck.rows.length === 0) {
            return handleNotFound(res, "Lobby not found or is not active!");
        }

        const result = await db.query(
            `SELECT u.id, u.name, u.avatar_url 
             FROM users u 
             INNER JOIN friends f ON u.id = f.friend_id 
             WHERE f.user_id = $1 
             AND u.id NOT IN (SELECT user_id FROM lobby_players WHERE lobby_id = $2)
             AND u.id NOT IN (
                 SELECT receiver_id 
                 FROM invitations 
                 WHERE lobby_id = $2 AND status = 'pending'
             )`,
            [userId, lobbyId]
        );
        res.json({ success: true, friends: result.rows });
    } catch (err) {
        handleError(res, err, "Failed to retrieve friend list");
    }
};

module.exports = {
    createLobby,
    getLobbies,
    updateLobby,
    deleteLobby,
    getLobby,
    getLobbyPlayers,
    joinLobby,
    leaveLobby,
    getLobbyMessages,
    sendLobbyMessage,
    inviteToLobby,
    acceptLobbyInvite,
    rejectLobbyInvite,
    getInvitableFriends,
};