const db = require("../models/db");
const bcrypt = require("bcrypt");
const fs = require("fs");

const getAllUsers = async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, avatar_url FROM users");
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error("Error getting all users:", err);
        res.status(500).json({ success: false, message: "Users could not be retrieved!" });
    }
};

const getUserById = async (req, res) => {
    const userId = req.params.id;
    try {
        const result = await db.query('SELECT id, name, email, avatar_url, bio FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found!" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error getting user by ID:", err);
        res.status(500).json({ message: "User information could not be retrieved!" });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await db.query("SELECT id, name, email, avatar_url, bio FROM users WHERE id = $1", [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error("Error getting user profile:", err);
        res.status(500).json({ success: false, message: "Failed to retrieve profile." });
    }
};

const updateProfile = async (req, res) => {
    const userId = req.user.userId;
    const { name, email, bio, oldPassword, newPassword } = req.body;
    const avatar_url = req.file ? req.file.filename : null;

    if (!name || !email) {
        return res.status(400).json({ success: false, message: "Name and email required!" });
    }

    try {
        let user = await db.query("SELECT password, avatar_url FROM users WHERE id = $1", [userId]);

        if (user.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        user = user.rows[0];

        if (oldPassword) {
            const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
            if (!isOldPasswordCorrect) {
                return res.status(401).json({ success: false, message: "The current password is incorrect!" });
            }
        }

        let hashedPassword = newPassword ? await bcrypt.hash(newPassword, 10) : null;

        let updateFields = [`name = $1`, `email = $2`, `bio = $3`];
        let values = [name, email, bio || null];

        if (hashedPassword) {
            updateFields.push(`password = $${values.length + 1}`);
            values.push(hashedPassword);
        }

        if (avatar_url) {
            updateFields.push(`avatar_url = $${values.length + 1}`);
            values.push(avatar_url);
        }

        values.push(userId);

        const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${values.length} RETURNING id, name, email, avatar_url, bio`;
        const result = await db.query(sql, values);

        res.json({ success: true, message: "Profile updated!", user: result.rows[0] });
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ success: false, message: "Database error!" });
    }
};

const searchUsers = async (req, res) => {
    const query = req.query.q ? `%${req.query.q}%` : "%";
    try {
        console.log("Searching users with query:", query);
        const result = await db.query(
            "SELECT id, name, avatar_url FROM users WHERE name ILIKE $1 LIMIT 10",
            [query]
        );
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error("Search users error:", err.message, err.stack);
        res.status(500).json({ success: false, message: "Search failed!" });
    }
};

const getUserGames = async (req, res) => {
    const userId = req.params.id;
    try {
        const games = [
            { title: "Chess", played_at: new Date("2025-04-10") },
            { title: "Sudoku", played_at: new Date("2025-04-09") },
            { title: "Tic Tac Toe", played_at: new Date("2025-04-08") },
        ];
        res.json({ success: true, games });
    } catch (err) {
        console.error("Error getting user games:", err);
        res.status(500).json({ success: false, message: "Failed to retrieve user games!" });
    }
};

module.exports = {
    getUserById,
    getUserProfile,
    updateProfile,
    getAllUsers,
    searchUsers,
    getUserGames,
};