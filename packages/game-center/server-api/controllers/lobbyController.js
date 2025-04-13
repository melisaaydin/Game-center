const db = require("../models/db");
const bcrypt = require("bcrypt");

// Create a new lobby
const createLobbie = async (req, res) => {
    const { name, is_event, start_time, end_time, password, game_id, max_players } = req.body;
    const userId = req.user ? req.user.userId : req.body.userId;

    // Validate user ID
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ success: false, message: "A valid userId required!" });
    }

    // Validate required fields
    if (!name || !game_id || !max_players) {
        return res.status(400).json({
            success: false, message: "Lobby name, game ID and maximum number of players are required!"
        });
    }

    try {
        // Check if user already has an active lobby
        const userLobbyCheck = await db.query(
            "SELECT lp.id FROM lobby_players lp JOIN lobbies l ON lp.lobby_id = l.id WHERE lp.user_id = $1 AND l.lobby_status = 'active'",
            [userId]
        );
        if (userLobbyCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: "You are already in a lobby!" });
        }

        // Hash the password if provided
        let hashedPassword = null;
        if (password) {
            try {
                hashedPassword = await bcrypt.hash(password, 10);
            } catch (bcryptErr) {
                return res.status(500).json({ success: false, message: "An error occurred while hashing the password." });
            }
        }

        // Insert new lobby into database
        const query = `
            INSERT INTO lobbies (name, is_event, start_time, end_time, password, game_id, max_players, current_players, created_by, lobby_status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, 'active', NOW(), NOW()) RETURNING *;
        `;
        const values = [name, is_event, start_time || null, end_time || null, hashedPassword, game_id, max_players, userId];

        const result = await db.query(query, values);
        const newLobby = result.rows[0];

        // Add lobby creator as the first player (marked as ready)
        const addOwnerQuery = `
            INSERT INTO lobby_players (lobby_id, user_id, is_ready)
            VALUES ($1, $2, TRUE) RETURNING *;
        `;
        await db.query(addOwnerQuery, [newLobby.id, userId]);
        await db.query("UPDATE lobbies SET current_players = 1 WHERE id = $1", [newLobby.id]);

        res.status(201).json({ success: true, message: "Lobby created.", lobby: newLobby });
    } catch (err) {
        res.status(500).json({ success: false, message: "An error occurred while creating the lobby: " + err.message });
    }
};

// Get all lobbies (optionally filtered by game ID)
const getLobbies = async (req, res) => {
    const { gameId } = req.query;
    let query = `
        SELECT l.*, u.name as created_by_name 
        FROM lobbies l
        LEFT JOIN users u ON l.created_by = u.id
    `;
    const values = [];

    if (gameId) {
        query += " WHERE l.game_id = $1";
        values.push(gameId);
    }
    query += " ORDER BY l.is_event DESC, l.created_at DESC";

    try {
        const result = await db.query(query, values);
        const lobbies = result.rows;

        const now = new Date();

        // Update expired or inactive lobbies
        const updatedLobbies = await Promise.all(
            lobbies.map(async (lobby) => {
                lobby.created_by = String(lobby.created_by);
                // Close event lobby if time has expired
                if (lobby.is_event && lobby.end_time && lobby.lobby_status === "active") {
                    const endTime = new Date(lobby.end_time);
                    if (endTime <= now) {
                        await db.query("UPDATE lobbies SET lobby_status = 'closed' WHERE id = $1", [lobby.id]);
                        await db.query("DELETE FROM lobby_players WHERE lobby_id = $1", [lobby.id]);
                        return { ...lobby, lobby_status: "closed" };
                    }
                }

                // Close normal lobby if owner left and it's older than 8 hours
                if (!lobby.is_event && lobby.lobby_status === "active") {
                    const createdBy = await db.query(
                        "SELECT lp.id FROM lobby_players lp WHERE lp.user_id = $1 AND lp.lobby_id = $2",
                        [lobby.created_by, lobby.id]
                    );
                    if (createdBy.rows.length === 0) {
                        const leftTime = new Date(lobby.updated_at);
                        const diffHours = (now - leftTime) / (1000 * 60 * 60);
                        if (diffHours >= 8) {
                            await db.query("UPDATE lobbies SET lobby_status = 'closed' WHERE id = $1", [lobby.id]);
                            await db.query("DELETE FROM lobby_players WHERE lobby_id = $1", [lobby.id]);
                            return { ...lobby, lobby_status: "closed" };
                        }
                    }
                }
                return lobby;
            })
        );

        // Return only active lobbies
        const filteredLobbies = updatedLobbies.filter(lobby => lobby.lobby_status !== "closed");
        res.status(200).json({ success: true, lobbies: filteredLobbies });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lobbies could not be received" });
    }
};

// Get a single lobby with players
const getLobby = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "A valid lobby ID is required." });
    }

    try {
        const result = await db.query(
            `SELECT l.*, u.name AS created_by_name 
             FROM lobbies l 
             LEFT JOIN users u ON l.created_by = u.id 
             WHERE l.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Lobby could not found!" });
        }

        const lobby = result.rows[0];
        const playersResult = await db.query(
            `SELECT u.id, u.name, u.avatar_url, lp.is_ready
             FROM lobby_players lp
             JOIN users u ON lp.user_id = u.id
             WHERE lp.lobby_id = $1`,
            [id]
        );
        const players = playersResult.rows;
        res.json({ ...lobby, players });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update lobby details
const updateLobbie = async (req, res) => {
    const { id } = req.params;
    const { name, is_event, start_time, end_time, password, gameId, max_players } = req.body;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const query = `
        UPDATE lobbies
        SET name = $1, is_event = $2, start_time = $3, end_time = $4, password = $5, game_id = $6, max_players = $7, updated_at = NOW()
        WHERE id = $8 RETURNING *;
    `;
    const values = [name, is_event, start_time, end_time, hashedPassword, gameId, max_players, id];

    try {
        const result = await db.query(query, values);
        const updatedLobby = result.rows[0];
        if (updatedLobby) {
            res.status(200).json(updatedLobby);
        } else {
            res.status(404).json({ message: "Lobby could not found." });
        }
    } catch (err) {
        res.status(500).json({ message: "Lobby could not be updated." });
    }
};

// Delete a lobby (only by creator)
const deleteLobby = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    try {
        const lobbyResult = await db.query(
            "SELECT * FROM lobbies WHERE id = $1 AND created_by = $2",
            [id, userId]
        );
        if (lobbyResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to delete this lobby or the lobby was not found!",
            });
        }

        // Delete related records
        await db.query("DELETE FROM lobby_players WHERE lobby_id = $1", [id]);
        await db.query("DELETE FROM lobby_messages WHERE lobby_id = $1", [id]);
        await db.query("DELETE FROM lobbies WHERE id = $1", [id]);

        res.status(200).json({ success: true, message: "Lobby deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Could not delete lobby!" });
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
        console.error("Players could not be recruited:", err);
        res.status(500).json({ success: false, message: "Players could not be recruited" });
    }
};

// Join a lobby
const joinLobby = async (req, res) => {
    const { id } = req.params;
    const { userId, password } = req.body;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ success: false, message: "A valid userId is required!" });
    }

    try {
        // Check if user is already in another active lobby
        const userLobbyCheck = await db.query(
            "SELECT lp.id FROM lobby_players lp JOIN lobbies l ON lp.lobby_id = l.id WHERE lp.user_id = $1 AND l.lobby_status = 'active'",
            [userId]
        );
        if (userLobbyCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: "You are already in another active lobby!" });
        }

        const lobbyResult = await db.query("SELECT * FROM lobbies WHERE id = $1", [id]);
        if (lobbyResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Lobby not found." });
        }

        const lobby = lobbyResult.rows[0];

        // Check if user already joined this lobby
        const userCheck = await db.query("SELECT * FROM lobby_players WHERE lobby_id = $1 AND user_id = $2", [id, userId]);
        if (userCheck.rows.length > 0) {
            return res.status(200).json({ success: true, message: "Already in this lobby.", alreadyJoined: true });
        }

        // Validate password if lobby is protected
        if (lobby.password && !password) {
            return res.status(400).json({ success: false, message: "Password is required." });
        }
        if (lobby.password && !(await bcrypt.compare(password, lobby.password))) {
            return res.status(401).json({ success: false, message: "Wrong password." });
        }

        // Check capacity
        if (lobby.current_players >= lobby.max_players) {
            return res.status(400).json({ success: false, message: "Lobby is full." });
        }

        // Add user to lobby
        await db.query(
            "INSERT INTO lobby_players (lobby_id, user_id, is_ready) VALUES ($1, $2, FALSE)",
            [id, userId]
        );

        // Update lobby player count
        await db.query(
            "UPDATE lobbies SET current_players = current_players + 1 WHERE id = $1",
            [id]
        );

        res.status(200).json({ success: true, message: "You have joined the lobby." });
    } catch (err) {
        console.error("Lobby join error:", err);
        res.status(500).json({ success: false, message: "You were unable to join the lobby." });
    }
};

// Leave a lobby
const leaveLobby = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ success: false, message: "A valid user ID is required!" });
    }

    try {
        await db.query("BEGIN"); // Start transaction

        // Remove user from lobby_players
        const result = await db.query(
            "DELETE FROM lobby_players WHERE lobby_id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rowCount === 0) {
            await db.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "You are not in this lobby." });
        }

        // Update lobby player count
        const updateResult = await db.query(
            "UPDATE lobbies SET current_players = GREATEST(current_players - 1, 0), updated_at = NOW() WHERE id = $1 RETURNING current_players",
            [id]
        );
        if (updateResult.rows.length === 0) {
            await db.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Lobby not found." });
        }
        const newPlayerCount = updateResult.rows[0].current_players;

        // Get user’s name for the chat message
        const userResult = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            await db.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "User not found." });
        }
        const userName = userResult.rows[0].name;

        // Send "user_name left" message to lobby_messages
        await db.query(
            "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
            [id, userId, `${userName} left the lobby.`]
        );

        // Check if there are no players left in the lobby
        if (newPlayerCount <= 0) {
            await db.query("UPDATE lobbies SET lobby_status = 'closed' WHERE id = $1", [id]);
            await db.query("DELETE FROM lobby_players WHERE lobby_id = $1", [id]);
        }

        await db.query("COMMIT");
        res.status(200).json({ success: true, message: "You left the lobby." });
    } catch (err) {
        await db.query("ROLLBACK");
        console.error("Error leaving lobby:", err);
        res.status(500).json({ success: false, message: "You could not leave the lobby." });
    }
};

// Get all chat messages for a lobby
const getLobbyMessages = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT lm.id, lm.message AS content, lm.created_at, u.name AS user
             FROM lobby_messages lm
             LEFT JOIN users u ON lm.user_id = u.id
             WHERE lm.lobby_id = $1
             ORDER BY lm.created_at ASC`,
            [id]
        );
        res.status(200).json({ success: true, messages: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Messages could not be received." });
    }
};

// Send a message in a lobby
const sendLobbyMessage = async (req, res) => {
    const { id } = req.params;
    const { userId, message } = req.body;

    if (!userId || !message) {
        return res.status(400).json({ success: false, message: "userId and message required!" });
    }

    try {
        await db.query(
            "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
            [id, userId, message]
        );
        res.status(200).json({ success: true, message: "Message sent." });
    } catch (err) {
        console.error("Error sending message:", err);
        res.status(500).json({ success: false, message: "Message could not be sent." });
    }
};

// Export all functions
module.exports = {
    createLobbie,
    getLobbies,
    updateLobbie,
    deleteLobby,
    getLobby,
    getLobbyPlayers,
    joinLobby,
    leaveLobby,
    getLobbyMessages,
    sendLobbyMessage
};
