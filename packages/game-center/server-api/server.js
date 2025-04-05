const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});


// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/games", require("./routes/gameRoutes"));
app.use("/users", require("./routes/userRoute"));
app.use('/lobbies', require("./routes/lobbyRoutes"));

app.get('/', (req, res) => {
    res.send('Game Lobby API is running!');
});


const closeExpiredLobbies = async () => {
    try {
        //for event lobbies
        const eventLobbiesResult = await db.query(`
            UPDATE lobbies 
            SET status = 'closed' 
            WHERE is_event = true AND end_time < NOW() AND status = 'active' 
            RETURNING id;
        
        `);
        console.log(`${eventLobbiesResult.rowCount} lobby closed.`);
        //for normal lobbies
        const normalLobbiesResult = await db.query(`
            UPDATE lobbies 
            SET status = 'closed' 
            WHERE is_event = false 
            AND status = 'active' 
            AND last_active < NOW() - INTERVAL '8 hours' 
            RETURNING id;
        `);
        console.log(`${normalLobbiesResult.rowCount} normal lobi kapatıldı.`);
    } catch (err) {
        console.error("Bug fix for closing expired lobbies: ", err);
    }
};
setInterval(closeExpiredLobbies, 10 * 60 * 1000);

// WebSocket
io.on("connection", (socket) => {
    console.log("New connection:", socket.id);

    socket.on("set_username", (username) => {
        socket.username = username;
    });

    socket.on("sendMessage", (content) => {
        io.emit("newMessage", {
            username: socket.username || "Anonim",
            content,
            timestamp: new Date().toISOString(),
        });
    });

    socket.on("join_room", (roomId) => {
        socket.join(roomId);
    });

    socket.on("send_message", ({ room_id, content }) => {
        io.to(room_id).emit("receive_message", {
            username: socket.username || "Anonim",
            content,
            timestamp: new Date().toISOString(),
        });
    });
    socket.on("leave_lobby", async ({ lobbyId, userId }) => {
        const lobby = await db.query("SELECT * FROM lobbies WHERE id = $1 AND created_by = $2", [lobbyId, userId]);
        if (lobby.rows.length > 0) {
            await db.query("UPDATE lobbies SET last_active = NOW() WHERE id = $1", [lobbyId]);
            console.log(`Kullanıcı ${userId}, lobi ${lobbyId}'den ayrıldı.`);
        }
    });
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.username || socket.id}`);
    });
});

const PORT = 8081;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
