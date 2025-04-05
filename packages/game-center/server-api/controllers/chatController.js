// const db = require("../config/db");

// exports.sendMessage = async (req, res) => {
//     const { user_id, username, message, room_id } = req.body;
//     if (!user_id || !username || !message || !room_id) {
//         return res.status(400).json({ success: false, message: "All fields are required!" });
//     }

//     try {
//         const sql = `
//             INSERT INTO chat_messages (user_id, username, message, room_id)
//             VALUES ($1, $2, $3, $4) RETURNING *`;
//         const values = [user_id, username, message, room_id];
//         const result = await db.query(sql, values);

//         res.json({ success: true, message: "Message sent", data: result.rows[0] });
//     } catch (err) {
//         console.error("Message send error:", err);
//         res.status(500).json({ success: false, message: "Message could not be sent" });
//     }
// };

// exports.getChatMessages = async (req, res) => {
//     const { room_id } = req.params;

//     try {
//         const sql = `
//             SELECT * FROM chat_messages
//             WHERE room_id = $1
//             ORDER BY created_at ASC`;
//         const result = await db.query(sql, [room_id]);

//         res.json({ success: true, messages: result.rows });
//     } catch (err) {
//         console.error("Message fetch error:", err);
//         res.status(500).json({ success: false, message: "Messages could not be retrieved" });
//     }
// };
