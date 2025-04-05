const db = require("../models/db");
const bcrypt = require("bcrypt");
const fs = require("fs");

const getAllUsers = async (req, res) => {
    try {
        const result = await db.query("SELECT id, name, email, avatar_url FROM users");
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error("Tüm kullanıcıları getirme hatası:", err);
        res.status(500).json({ success: false, message: "Kullanıcılar alınamadı" });
    }
};
// Kullanıcı bilgilerini getirme
const getUserById = async (req, res) => {
    const userId = req.params.id;
    try {
        const result = await db.query('SELECT id,name,email,avatar_url FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }
        console.log("Dönen kullanıcı verisi:", result.rows[0]);
        res.json(result.rows[0]);  // Bu satır sadece kullanıcı bulunduğunda çalışmalı
    } catch (err) {
        console.error("Kullanıcı getirme hatası:", err);
        res.status(500).json({ message: "Kullanıcı bilgisi alınamadı" });
    }
};


// Profil bilgilerini alma
const getUserProfile = async (req, res) => {
    try {
        console.log("User ID from token:", req.user.userId);
        const userId = req.user.userId;
        const result = await db.query("SELECT id, name, email, avatar_url FROM users WHERE id = $1", [userId]);

        if (result.rows.length === 0) {
            console.log("No user found for ID:", userId);
            return res.status(404).json({ success: false, message: "User not found" });
        }
        console.log("Returning user profile:", result.rows[0]);
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to retrieve profile." });
    }
};

const updateProfile = async (req, res) => {
    const userId = req.user.userId;
    const { name, email, oldPassword, newPassword } = req.body; const avatar_url = req.file ? req.file.filename : null;
    console.log("Dosya bilgisi:", req.file);


    console.log("Gelen update isteği:", req.body);
    console.log("Yüklenen dosya:", req.file);

    if (!name || !email) {
        return res.status(400).json({ success: false, message: "Ad ve e-posta gereklidir!" });
    }

    try {
        let user = await db.query("SELECT password, avatar_url FROM users WHERE id = $1", [userId]);

        if (user.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı!" });
        }

        user = user.rows[0];

        if (oldPassword) {
            const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
            if (!isOldPasswordCorrect) {
                return res.status(401).json({ success: false, message: "Mevcut şifre yanlış!" });
            }
        }

        let hashedPassword = newPassword ? await bcrypt.hash(newPassword, 10) : null;
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

        values.push(userId);
        const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${values.length} RETURNING *`;
        const result = await db.query(sql, values);

        res.json({ success: true, message: "Profil güncellendi", user: result.rows[0] });
    } catch (err) {
        console.error("Profil güncelleme hatası:", err);
        res.status(500).json({ success: false, message: "Veritabanı hatası" });
    }
};


module.exports = {
    getUserById,
    getUserProfile,
    updateProfile,
    getAllUsers
};
