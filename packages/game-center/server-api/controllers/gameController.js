const db = require("../models/db");

const getAllGames = async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM games");
        res.json(result.rows);
    } catch (err) {
        console.error("Game fetch error:", err);
        res.status(500).json({ message: "Games could not be received" });
    }
};

const getGameDetails = async (req, res) => {
    const { gameId } = req.params;

    try {
        const result = await db.query("SELECT * FROM games WHERE id = $1", [gameId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Game not found" });
        }
        res.json({ success: true, game: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
};

module.exports = { getAllGames, getGameDetails };