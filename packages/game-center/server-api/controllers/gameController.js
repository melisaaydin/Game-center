const db = require("../models/db");

// Fetch all games from the database
const getAllGames = async (req, res) => {
    try {
        // Query all games
        const result = await db.query("SELECT * FROM games");

        // Send the result back as JSON
        res.json(result.rows);
    } catch (err) {
        // Log and handle errors
        console.error("Game fetch error:", err);
        res.status(500).json({ message: "Games could not be retrieved" });
    }
};

// Get detailed information about a specific game by ID
const getGameDetails = async (req, res) => {
    const { gameId } = req.params;

    try {
        // Query the game with the given ID
        const result = await db.query("SELECT * FROM games WHERE id = $1", [gameId]);

        // If no game is found, return 404
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Game not found" });
        }

        // Return game details
        res.json({ success: true, game: result.rows[0] });
    } catch (err) {
        // Handle database errors
        res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
};

// Export controller functions
module.exports = { getAllGames, getGameDetails };
