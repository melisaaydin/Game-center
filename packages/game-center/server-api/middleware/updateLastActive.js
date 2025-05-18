const db = require("../models/db");

const updateLastActive = async (req, res, next) => {
    const userId = req.user?.userId;

    if (!userId) {
        return next();
    }

    try {
        const result = await db.query(
            "UPDATE users SET last_active = NOW() WHERE id = $1 RETURNING last_active",
            [userId]
        );
    } catch (err) {
        console.error(`updateLastActive: Error updating last_active for user ${userId}:`, err);
    }
    next();
};

module.exports = updateLastActive;