const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const db = require("./models/db");
require("dotenv").config();


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});


app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));


app.use("/auth", require("./routes/authRoutes"));
app.use("/games", require("./routes/gameRoutes"));
app.use("/users", require("./routes/userRoute"));
app.use('/lobbies', require("./routes/lobbyRoutes"));

app.get('/', (req, res) => {
    res.send('Game Lobby API is running!');
});


const closeExpiredLobbies = async () => {
    try {
        const eventLobbiesResult = await db.query(`
            UPDATE lobbies 
            SET status = 'closed' 
            WHERE is_event = true AND end_time < NOW() AND status = 'active' 
            RETURNING id;
        
        `);
        console.log(`${eventLobbiesResult.rowCount} lobby closed.`);
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
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.username || socket.id}`);
    });
    socket.on("lobby_updated", (updatedLobby) => {
        setLobby(updatedLobby);
        if (user) {
            const playerCheck = updatedLobby.players.some((p) => p.id === user.id);
            setIsJoined(playerCheck);
        }
    });
});

const PORT = 8081;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
