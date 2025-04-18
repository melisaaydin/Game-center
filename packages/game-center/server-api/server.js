const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const db = require("./models/db");
require("dotenv").config();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Log all incoming requests for debugging
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Mount routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/games", require("./routes/gameRoutes"));
app.use("/users", require("./routes/userRoute"));
app.use("/lobbies", require("./routes/lobbyRoutes"));
app.use("/users", require("./routes/friendRoutes"))
app.get("/", (req, res) => {
    res.send("Game Lobby API is running!");
});

// Catch-all route for debugging 404s
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ message: "Endpoint not found" });
});

const closeExpiredLobbies = async () => {
    try {
        const eventLobbiesResult = await db.query(
            `
      UPDATE lobbies 
      SET lobby_status = 'closed' 
      WHERE is_event = true AND end_time < NOW() AND lobby_status = 'active' 
      RETURNING id;
      `
        );
        console.log(`${eventLobbiesResult.rowCount} lobby closed.`);
        if (eventLobbiesResult.rows.length > 0) {
            eventLobbiesResult.rows.forEach((lobby) => {
                io.to(lobby.id).emit("event_started", { lobbyId: lobby.id });
            });
        }
        const normalLobbiesResult = await db.query(
            `
      UPDATE lobbies 
      SET lobby_status = 'closed' 
      WHERE is_event = false 
      AND lobby_status = 'active' 
      AND last_active < NOW() - INTERVAL '8 hours' 
      RETURNING id;
      `
        );
        console.log(`${normalLobbiesResult.rowCount} normal lobi kapatıldı.`);
    } catch (err) {
        console.error("Bug fix for closing expired lobbies: ", err);
    }
};
setInterval(closeExpiredLobbies, 10 * 60 * 1000);

io.on("connection", (socket) => {
    console.log("New connection:", socket.id);

    socket.on("set_username", (username) => {
        socket.username = username;
        console.log(`Username set: ${username} for socket ${socket.id}`);
    });

    socket.on("sendMessage", (content) => {
        io.emit("newMessage", {
            username: socket.username || "Anonim",
            content,
            timestamp: new Date().toISOString(),
        });
    });

    socket.on("join_lobby", async ({ lobbyId, userId, silent }) => {
        socket.join(lobbyId);
        console.log(`${socket.username || userId} joined lobby ${lobbyId}`);
        if (!silent) {
            const joinMessage = {
                user: "System",
                content: `${socket.username || "Bir kullanıcı"} lobiye katıldı!`,
                timestamp: new Date().toISOString(),
            };
            await db.query(
                "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
                [lobbyId, userId || null, joinMessage.content]
            );
            io.to(lobbyId).emit("receive_message", joinMessage);
            io.to(lobbyId).emit("lobby_joined", { userId });
            await db.query(
                "INSERT INTO notifications (user_id, type, content) VALUES ($1, 'lobby_joined', $2)",
                [userId, JSON.stringify({ lobbyId })]
            );
        }
    });

    socket.on("send_message", async ({ lobbyId, userId, content }) => {
        const message = {
            user: socket.username || "Anonim",
            content,
            timestamp: new Date().toISOString(),
        };
        try {
            await db.query(
                "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
                [lobbyId, userId, content]
            );
            io.to(lobbyId).emit("receive_message", message);
            console.log(`Message sent to lobby ${lobbyId}: ${content}`);
        } catch (err) {
            console.error("Error saving message:", err);
        }
    });

    socket.on("leave_lobby", async ({ lobbyId, userId }) => {
        socket.leave(lobbyId);
        console.log(`${socket.username || userId} left lobby ${lobbyId}`);
        const leaveMessage = {
            user: "System",
            content: `${socket.username || "A user"} left the lobby!`,
            timestamp: new Date().toISOString(),
        };
        await db.query(
            "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
            [lobbyId, userId || null, leaveMessage.content]
        );
        io.to(lobbyId).emit("receive_message", leaveMessage);
    });

    socket.on("game_invite", async ({ lobbyId, userId, invitedUserId }) => {
        try {
            await db.query(
                "INSERT INTO notifications (user_id, type, content) VALUES ($1, 'game_invite', $2)",
                [invitedUserId, JSON.stringify({ lobbyId, senderId: userId })]
            );
            socket.to(invitedUserId).emit("game_invite", { lobbyId, senderId: userId });
        } catch (err) {
            console.error("Error sending invite:", err);
        }
    });

    socket.on("friend_request", async ({ senderId, receiverId }) => {
        socket.to(receiverId).emit("friend_request", { senderId });
    });

    socket.on("friend_accepted", async ({ senderId, receiverId }) => {
        socket.to(senderId).emit("friend_accepted", { receiverId });
    });

    socket.on("turn_based", async ({ gameId, userId }) => {
        socket.to(userId).emit("turn_based", { gameId });
    });
    socket.on("friend_removed", async ({ userId, friendId }) => {
        socket.to(friendId).emit("friend_removed", { userId });
    });
    socket.on("event_started", async ({ lobbyId }) => {
        socket.to(lobbyId).emit("event_started", { lobbyId });
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.username || socket.id}`);
    });
});

const PORT = 8081;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));