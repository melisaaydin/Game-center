const jwt = require("jsonwebtoken");
require("dotenv").config();
const secretKey = process.env.JWT_SECRET || "your_default_secret";

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: "Token required" });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded;  // decoded bilgileri req.user içine atıyoruz
        next();
    } catch (err) {
        console.error("Token verification failed:", err);
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};

module.exports = verifyToken;
