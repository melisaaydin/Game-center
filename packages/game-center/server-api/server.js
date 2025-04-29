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

// Middleware to log all incoming requests and attach the Socket.IO instance to the request object
app.use((req, res, next) => {
    req.io = io;
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Mount routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/games", require("./routes/gameRoutes"));
app.use("/lobbies", require("./routes/lobbyRoutes"));
app.use("/users", require("./routes/userRoute"));
// app.use("/users", require("./routes/friendRoutes"))
app.use("/notifications", require("./routes/notificationRoutes"));


app.get("/", (req, res) => {
    res.send("Game Lobby API is running!");
});

// Catch-all route to handle 404 errors for undefined endpoints
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ message: "Endpoint not found" });
});

// Function to close expired lobbies (event-based and normal lobbies)
const closeExpiredLobbies = async () => {
    try {
        // Close event lobbies whose end time has passed
        const eventLobbiesResult = await db.query(
            `
      UPDATE lobbies 
      SET lobby_status = 'closed' 
      WHERE is_event = true AND end_time < NOW() AND lobby_status = 'active' 
      RETURNING id;
      `
        );
        // Notify clients in the affected lobbies about the event start
        if (eventLobbiesResult.rows.length > 0) {
            eventLobbiesResult.rows.forEach((lobby) => {
                io.to(lobby.id).emit("lobby_closed", { lobbyId: lobby.id });
            });
        }
        // Close normal lobbies where the owner has left and 8 hours have passed
        const normalLobbiesResult = await db.query(
            `
    UPDATE lobbies 
      SET lobby_status = 'closed' 
      WHERE is_event = false 
      AND lobby_status = 'active' 
      AND updated_at < NOW() - INTERVAL '8 hours'
      AND NOT EXISTS (
          SELECT 1 
          FROM lobby_players lp 
          JOIN lobbies l ON lp.lobby_id = l.id 
          WHERE lp.lobby_id = lobbies.id 
          AND lp.user_id = l.created_by
      )
      RETURNING id;
      `
        );
        // Clean up lobby_players and notify clients for closed normal lobbies
        if (normalLobbiesResult.rows.length > 0) {
            for (const lobby of normalLobbiesResult.rows) {
                await db.query("DELETE FROM lobby_players WHERE lobby_id = $1", [lobby.id]);
            }
        }
    } catch (err) {
        console.error("Bug fix for closing expired lobbies: ", err);
    }
};
// Run the closeExpiredLobbies function every 10 minutes
setInterval(closeExpiredLobbies, 10 * 60 * 1000);

io.on("connection", (socket) => {
    // Set a username for the socket connection
    socket.on("set_username", (username) => {
        socket.username = username;
    });
    // Handle sending a global message to all connected clients
    socket.on("sendMessage", (content) => {
        io.emit("newMessage", {
            username: socket.username || "Anonim",
            content,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle a user joining a lobby
    socket.on("join_lobby", async ({ lobbyId, userId, silent }) => {
        socket.join(lobbyId);
        // Send a join message to the lobby unless silent mode is enabled
        if (!silent) {
            const userResult = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
            const username = userResult.rows[0]?.name || socket.username || "A user";
            const joinMessage = {
                user: "System",
                content: `${username} joined the lobby!`,
                timestamp: new Date().toISOString(),
                isSystem: true
            };
            await db.query(
                "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
                [lobbyId, userId || null, joinMessage.content]
            );
            io.to(lobbyId).emit("receive_message", joinMessage);
            io.to(lobbyId).emit("lobby_joined", { userId });
            // Create a notification for the user joining the lobby
            await db.query(
                "INSERT INTO notifications (user_id, type, content) VALUES ($1, 'lobby_joined', $2)",
                [userId, JSON.stringify({ lobbyId })]
            );
        }
    });
    // Handle sending a message to a specific lobby
    socket.on("send_message", async ({ lobbyId, userId, content }) => {
        const message = {
            user: socket.username || "Anonymous",
            content,
            timestamp: new Date().toISOString(),
        };
        try {
            // Save the message to the database and broadcast it to the lobby
            await db.query(
                "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
                [lobbyId, userId, content]
            );
            io.to(lobbyId).emit("receive_message", message);
        } catch (err) {
            console.error("Error saving message:", err);
        }
    });
    // Handle a user leaving a lobby
    socket.on("leave_lobby", async ({ lobbyId, userId }) => {
        socket.leave(lobbyId);
        const leaveMessage = {
            user: "System",
            content: `${socket.username || "A user"} left the lobby!`,
            timestamp: new Date().toISOString(),
        };
        try {
            // Prevent duplicate leave messages within 5 seconds
            const existingMessage = await db.query(
                "SELECT * FROM lobby_messages WHERE lobby_id = $1 AND message = $2 AND created_at > NOW() - INTERVAL '5 seconds'",
                [lobbyId, leaveMessage.content]
            );
            if (existingMessage.rows.length === 0) {
                await db.query(
                    "INSERT INTO lobby_messages (lobby_id, user_id, message) VALUES ($1, $2, $3)",
                    [lobbyId, userId || null, leaveMessage.content]
                );
                io.to(lobbyId).emit("receive_message", leaveMessage);
            }
        } catch (err) {
            console.error("Error handling leave_lobby:", err);
        }
    });
    // Handle sending a lobby invitation
    socket.on("lobby_invite", async ({ lobbyId, userId, invitedUserId, lobbyName, invitationId }) => {
        try {
            socket.to(invitedUserId).emit("lobby_invite", {
                lobbyId,
                lobbyName,
                senderId: userId,
                senderName: socket.username || "Anonymous",
                invitationId,
            });
        } catch (err) {
            console.error("Error emitting lobby invite:", err);
        }
    });
    // Handle a user accepting a lobby invitation
    socket.on("lobby_invite_accepted", async ({ lobbyId, receiverId, lobbyName }) => {
        try {
            socket.to(lobbyId).emit("lobby_joined", { userId: receiverId });
        } catch (err) {
            console.error("Error emitting lobby invite accepted:", err);
        }
    });
    // Handle a user rejecting a lobby invitation
    socket.on("lobby_invite_rejected", async ({ lobbyId, receiverId, lobbyName, receiverName }) => {
        try {
            socket.to(lobbyId).emit("lobby_invite_rejected", { receiverId, receiverName, lobbyName });
        } catch (err) {
            console.error("Error emitting lobby invite rejected:", err);
        }
    });
    // Handle sending a game invitation
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
    // Handle sending a friend request
    socket.on("friend_request", async ({ senderId, receiverId }) => {
        socket.to(receiverId).emit("friend_request", { senderId });
    });
    // Handle a friend request being accepted
    socket.on("friend_accepted", async ({ senderId, receiverId }) => {
        socket.to(senderId).emit("friend_accepted", { receiverId });
    });
    // Handle turn-based game events
    socket.on("turn_based", async ({ gameId, userId }) => {
        socket.to(userId).emit("turn_based", { gameId });
    });
    // Handle a friend being removed
    socket.on("friend_removed", async ({ userId, friendId }) => {
        socket.to(friendId).emit("friend_removed", { userId });
    });
    // Handle an event starting in a lobby
    socket.on("event_started", async ({ lobbyId }) => {
        socket.to(lobbyId).emit("event_started", { lobbyId });
    });
    // Handle client disconnection
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.username || socket.id}`);
    });
});

const PORT = 8081;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));