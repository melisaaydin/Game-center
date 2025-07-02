const db = require("../models/db");

// Fetch all games from the database
const getAllGames = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM games");
        res.json(result.rows);
    } catch (err) {
        console.error("Game fetch error:", err);
        res.status(500).json({ message: "Games could not be retrieved" });
    }
};

// Get detailed information about a specific game by ID
const getGameDetails = async (req, res) => {
    const { gameId } = req.params;

    try {
        const result = await db.query("SELECT * FROM games WHERE id = $1::text", [gameId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Game not found" });
        }
        res.json({ success: true, game: result.rows[0] });
    } catch (err) {
        console.error("Game details error:", err);
        res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
};

// Search games by title
const searchGames = async (req, res) => {
    const { q } = req.query;
    try {
        const result = await db.query(
            "SELECT id, title, image_url FROM games WHERE title ILIKE $1",
            [`%${q}%`]
        );
        res.json({ games: result.rows });
    } catch (err) {
        console.error("Search games error:", err.message, err.stack);
        res.status(500).json({ success: false, message: "Failed to search games!" });
    }
};

module.exports = { getAllGames, getGameDetails, searchGames };