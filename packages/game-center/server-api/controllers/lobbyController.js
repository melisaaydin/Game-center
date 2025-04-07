const db = require("../models/db");
const bcrypt = require("bcrypt");

const createLobbie = async (req, res) => {
    const { name, is_event, start_time, end_time, password, game_id, max_players } = req.body;
    const userId = req.user ? req.user.userId : req.body.userId;


    if (!userId || isNaN(userId)) {
        return res.status(400).json({ success: false, message: "Geçerli bir userId gerekli!" });
    }

    if (!name || !game_id || !max_players) {

        return res.status(400).json({ success: false, message: "Lobi adı, oyun ID'si ve maksimum oyuncu sayısı zorunludur!" });
    }

    try {
        const userLobbyCheck = await db.query("SELECT id FROM lobby_players WHERE user_id = $1", [userId]);
        if (userLobbyCheck.rows.length > 0) {

            return res.status(400).json({ success: false, message: "You are already in a lobby!" });
        }

        let hashedPassword = null;
        if (password) {
            try {
                hashedPassword = await bcrypt.hash(password, 10);

            } catch (bcryptErr) {
                return res.status(500).json({ success: false, message: "Şifre hash'leme sırasında hata oluştu." });
            }
        }

        const query = `
            INSERT INTO lobbies (name, is_event, start_time, end_time, password, game_id, max_players, current_players, created_by, lobby_status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, 'active', NOW(), NOW()) RETURNING *;
        `;
        const values = [name, is_event, start_time || null, end_time || null, hashedPassword, game_id, max_players, userId];


        const result = await db.query(query, values);
        const newLobby = result.rows[0];


        const addOwnerQuery = `
            INSERT INTO lobby_players (lobby_id, user_id, is_ready)
            VALUES ($1, $2, TRUE) RETURNING *;
        `;
        await db.query(addOwnerQuery, [newLobby.id, userId]);
        await db.query("UPDATE lobbies SET current_players = 1 WHERE id = $1", [newLobby.id]);

        res.status(201).json({ success: true, message: "Lobi oluşturuldu.", lobby: newLobby });
    } catch (err) {

        res.status(500).json({ success: false, message: "Lobi oluşturulurken hata oluştu: " + err.message });
    }
};

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
        const updatedLobbies = await Promise.all(
            lobbies.map(async (lobby) => {

                if (lobby.is_event && lobby.end_time && lobby.lobby_status === "active") {
                    const endTime = new Date(lobby.end_time);
                    if (endTime <= now) {
                        await db.query("UPDATE lobbies SET lobby_status = 'closed' WHERE id = $1", [lobby.id]);
                        return { ...lobby, lobby_status: "closed" };
                    }
                }

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
                            return { ...lobby, lobby_status: "closed" };
                        }
                    }
                }
                return lobby;
            })
        );

        const filteredLobbies = updatedLobbies.filter((lobby) => {
            if (lobby.lobby_status === "closed") return false;
            return true;
        });

        res.status(200).json({ success: true, lobbies: filteredLobbies });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lobiler alınamadı" });
    }
};
const getLobby = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Geçerli bir lobi ID'si gerekli." });
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
            return res.status(404).json({ message: "Lobi bulunamadı" });
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

        const lobbyWithPlayers = { ...lobby, players };

        res.json(lobbyWithPlayers);
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası", error: error.message });
    }
};
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
            res.status(404).json({ message: "Lobi bulunamadı" });
        }
    } catch (err) {
        res.status(500).json({ message: "Lobi güncellenemedi" });
    }
};

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
                message: "Bu lobiyi silme yetkiniz yok veya lobi bulunamadı!",
            });
        }

        await db.query("DELETE FROM lobby_players WHERE lobby_id = $1", [id]);
        await db.query("DELETE FROM lobby_messages WHERE lobby_id = $1", [id]);
        await db.query("DELETE FROM lobbies WHERE id = $1", [id]);

        res.status(200).json({ success: true, message: "Lobi başarıyla silindi!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lobi silinemedi!" });
    }
};

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
        console.error("Oyuncular alınamadı:", err);
        res.status(500).json({ success: false, message: "Oyuncular alınamadı" });
    }
};
const joinLobby = async (req, res) => {
    const { id } = req.params;
    const { userId, password } = req.body;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ success: false, message: "Geçerli bir userId gerekli!" });
    }

    try {
        const lobbyResult = await db.query("SELECT * FROM lobbies WHERE id = $1", [id]);
        if (lobbyResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Lobi bulunamadı." });
        }

        const lobby = lobbyResult.rows[0];

        const userCheck = await db.query("SELECT * FROM lobby_players WHERE lobby_id = $1 AND user_id = $2", [id, userId]);
        if (userCheck.rows.length > 0) {
            return res.status(200).json({ success: true, message: "Zaten bu lobidesiniz.", alreadyJoined: true });
        }

        if (lobby.password && !password) {
            return res.status(400).json({ success: false, message: "Şifre gerekli." });
        }
        if (lobby.password && !(await bcrypt.compare(password, lobby.password))) {
            return res.status(401).json({ success: false, message: "Şifre yanlış." });
        }

        if (lobby.current_players >= lobby.max_players) {
            return res.status(400).json({ success: false, message: "Lobi dolu." });
        }

        await db.query(
            "INSERT INTO lobby_players (lobby_id, user_id, is_ready) VALUES ($1, $2, FALSE)",
            [id, userId]
        );

        await db.query(
            "UPDATE lobbies SET current_players = current_players + 1 WHERE id = $1",
            [id]
        );

        res.status(200).json({ success: true, message: "Lobiye katıldınız." });
    } catch (err) {
        console.error("Lobiye katılma hatası:", err);
        res.status(500).json({ success: false, message: "Lobiye katılamadınız." });
    }
};
const leaveLobby = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ success: false, message: "Geçerli bir userId gerekli!" });
    }

    try {

        const result = await db.query(
            "DELETE FROM lobby_players WHERE lobby_id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ success: false, message: "Bu lobide değilsiniz." });
        }

        await db.query(
            "UPDATE lobbies SET current_players = current_players - 1 WHERE id = $1",
            [id]
        );

        const lobbyResult = await db.query("SELECT * FROM lobbies WHERE id = $1", [id]);
        const lobby = lobbyResult.rows[0];
        if (lobby.created_by === parseInt(userId) && lobby.current_players <= 1) {
            await db.query("UPDATE lobbies SET lobby_status = 'closed' WHERE id = $1", [id]);
        }

        res.status(200).json({ success: true, message: "Lobiden ayrıldınız." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lobiden ayrılamadınız." });
    }
};
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

        res.status(500).json({ success: false, message: "Mesajlar alınamadı." });
    }
};
const sendLobbyMessage = async (req, res) => {
    const { id } = req.params;
    const { userId, message } = req.body;

    if (!userId || !message) {
        return res.status(400).json({ success: false, message: "userId ve mesaj gerekli!" });
    }

    try {
        await db.query(
            "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
            [id, userId, message]
        );
        res.status(200).json({ success: true, message: "Mesaj gönderildi." });
    } catch (err) {
        console.error("Mesaj gönderme hatası:", err);
        res.status(500).json({ success: false, message: "Mesaj gönderilemedi." });
    }
};

module.exports = { createLobbie, getLobbies, updateLobbie, deleteLobby, getLobby, getLobbyPlayers, joinLobby, leaveLobby, getLobbyMessages, sendLobbyMessage };