const db = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();  // Environment variables
const secretKey = process.env.JWT_SECRET;

const signup = async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Tüm alanları doldurun!" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *";
        const values = [name, email, hashedPassword];
        const result = await db.query(sql, values);
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error("Veritabanı hatası:", err);
        res.status(500).json({ success: false, message: "Database error", error: err.message });
    }

};
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email ve şifre gerekli!" });
    }

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı!" });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Geçersiz şifre" });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name, avatar: user.avatar }, // Daha fazla veri ekleyebilirsiniz
            secretKey,
            { expiresIn: "2d" } // Token süresi 2 gün
        );

        res.json({
            success: true,
            message: "Giriş başarılı",
            user: { id: user.id, name: user.name, email: user.email },
            token,
        });
    } catch (err) {
        console.error("Login hatası:", err);
        res.status(500).json({ success: false, message: "Veritabanı hatası" });
    }
};
// const login = async (req, res) => {
//     const { email, password } = req.body;

//     // Email ve şifre kontrolü
//     if (!email || !password) {
//         return res.status(400).json({ success: false, message: "Email ve şifre gerekli!" });
//     }

//     try {
//         // Kullanıcıyı veritabanında sorgulama
//         const result = await db.query(
//             "SELECT * FROM users WHERE email = $1",
//             [email]
//         );

//         if (result.rows.length === 0) {
//             return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı!" });
//         }

//         const user = result.rows[0];

//         // Şifreyi kontrol etme
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(401).json({ success: false, message: "Geçersiz şifre" });
//         }

//         // JWT oluşturma
//         const token = jwt.sign(
//             { userId: user.id, username: user.name, email: user.email, avatar: user.avatar }, // Payload
//             secretKey, // Secret key
//             { expiresIn: "2d" } // Token geçerlilik süresi
//         );

//         // Başarılı login cevabı
//         res.json({
//             success: true,
//             message: "Giriş başarılı",
//             user: { id: user.id, name: user.name, email: user.email },
//             token, // JWT token
//         });
//     } catch (err) {
//         console.error("Login hatası:", err);
//         res.status(500).json({ success: false, message: "Veritabanı hatası" });
//     }
// };

module.exports = { signup, login };
