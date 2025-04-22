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
        if (result.rowCount === 0) {
            console.log(`updateLastActive: No user found with ID ${userId}`);
        } else {
            console.log(`updateLastActive: Updated last_active for user ${userId} to ${result.rows[0].last_active}`);
        }
    } catch (err) {
        console.error(`updateLastActive: Error updating last_active for user ${userId}:`, err);
    }
    next();
};

module.exports = updateLastActive;