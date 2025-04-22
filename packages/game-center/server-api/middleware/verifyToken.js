const jwt = require("jsonwebtoken");
require("dotenv").config();
const secretKey = process.env.JWT_SECRET || "your_default_secret";

const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
        return res.status(403).json({ success: false, message: "Token gerekli" });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = { userId: decoded.userId };
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Geçersiz token" });
    }
};

module.exports = verifyToken;