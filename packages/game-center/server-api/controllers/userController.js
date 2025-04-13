const db = require("../models/db");
const bcrypt = require("bcrypt");
const fs = require("fs");

// Get a list of all users (excluding sensitive data like passwords)
const getAllUsers = async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, avatar_url FROM users");
        // Send the users as a JSON response
        res.json({ success: true, users: result.rows });
    } catch (err) {
        // If something goes wrong with the query, send an error response
        res.status(500).json({ success: false, message: "Users could not be retrieved!" });
    }
};

// Get a specific user by their ID
const getUserById = async (req, res) => {
    const userId = req.params.id;
    try {
        const result = await db.query('SELECT id,name,email,avatar_url FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            // If no user found with that ID, return 404
            return res.status(404).json({ message: "User not found!" });
        }
        // Return the user data
        res.json(result.rows[0]);
    } catch (err) {
        // Database error
        res.status(500).json({ message: "User information could not be retrieved!" });
    }
};

// Get the profile of the currently logged-in user
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // This is retrieved from the auth middleware
        const result = await db.query("SELECT id, name, email, avatar_url FROM users WHERE id = $1", [userId]);

        if (result.rows.length === 0) {
            // No matching user found
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Return user profile
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        // Something went wrong while fetching the profile
        res.status(500).json({ success: false, message: "Failed to retrieve profile." });
    }
};

// Update the profile of the current user
const updateProfile = async (req, res) => {
    const userId = req.user.userId;
    const { name, email, oldPassword, newPassword } = req.body;
    const avatar_url = req.file ? req.file.filename : null; // If user uploads a new avatar

    // Check if name and email are provided
    if (!name || !email) {
        return res.status(400).json({ success: false, message: "Name and email required!" });
    }

    try {
        // Get current user data (we need current password to verify if changing)
        let user = await db.query("SELECT password, avatar_url FROM users WHERE id = $1", [userId]);

        if (user.rows.length === 0) {
            // User not found in database
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        user = user.rows[0];

        // If user wants to change password, verify the old one first
        if (oldPassword) {
            const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
            if (!isOldPasswordCorrect) {
                return res.status(401).json({ success: false, message: "The current password is incorrect!" });
            }
        }

        // If new password is provided, hash it
        let hashedPassword = newPassword ? await bcrypt.hash(newPassword, 10) : null;

        // Prepare the SQL query dynamically based on what's being updated
        let updateFields = [`name = $1`, `email = $2`];
        let values = [name, email];

        if (hashedPassword) {
            updateFields.push(`password = $3`);
            values.push(hashedPassword);
        }

        if (avatar_url) {
            updateFields.push(`avatar_url = $${values.length + 1}`);
            values.push(avatar_url);
        }

        // Add the userId to the end of values array for the WHERE clause
        values.push(userId);

        // Construct and execute the SQL query
        const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${values.length} RETURNING *`;
        const result = await db.query(sql, values);

        // Send success response
        res.json({ success: true, message: "Profile updated!", user: result.rows[0] });
    } catch (err) {
        // Catch-all for any unexpected errors
        res.status(500).json({ success: false, message: "Database error!" });
    }
};

// Export all user-related controller functions
module.exports = {
    getUserById,
    getUserProfile,
    updateProfile,
    getAllUsers
};
