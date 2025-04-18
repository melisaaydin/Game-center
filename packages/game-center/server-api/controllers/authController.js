const db = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const secretKey = process.env.JWT_SECRET;

// Handle user registration
const signup = async (req, res) => {
    const { name, email, password } = req.body;

    // Check if all fields are provided
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Please fill in all fields!" }); // Translated from Turkish
    }

    try {
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *";
        const values = [name, email, hashedPassword];

        // Insert new user into the database
        const result = await db.query(sql, values);

        // Send success response with user data
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        // Catch any database errors
        res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
};

// Handle user login
const login = async (req, res) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password required!" });
    }

    try {
        // Look for the user in the database by email
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        // If user not found, return error
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: "User not found!" });
        }

        const user = result.rows[0];

        // Check if the password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid password!" });
        }

        // Create a JWT token for session
        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name, avatar: user.avatar },
            secretKey,
            { expiresIn: "2d" } // Token will be valid for 2 days
        );

        // Send the token and user info in the response
        res.json({
            success: true,
            message: "Login successful!",
            user: { id: user.id, name: user.name, email: user.email },
            token,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error" });
    }
};

module.exports = { signup, login };
