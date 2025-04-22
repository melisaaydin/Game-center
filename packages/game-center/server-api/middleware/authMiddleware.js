const jwt = require("jsonwebtoken");
const secretKey = process.env.JWT_SECRET || "your_default_secret";

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ error: "Token not found" });

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.status(403).json({ error: "Token is invalid" });
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
