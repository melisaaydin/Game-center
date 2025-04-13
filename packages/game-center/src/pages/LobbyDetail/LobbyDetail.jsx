import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import {
    Box,
    Typography,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Snackbar,
    Alert,
    Paper,
} from "@mui/material";
import { Lock, ContentCopy, ExitToApp, PlayArrow, SportsEsports, Delete } from "@mui/icons-material";
import { useUser } from "../../context/UserContext";
import { ColorModeContext } from "../../context/ThemeContext";
import "./LobbyDetail.css";

const socket = io("http://localhost:8081", {
    reconnection: true,
    reconnectionAttempts: 5,
});

const LobbyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const { mode } = useContext(ColorModeContext);
    const [lobby, setLobby] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isJoined, setIsJoined] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");
    const [creatorName, setCreatorName] = useState("");
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const chatRef = useRef(null);
    const lastMessageRef = useRef(null);
    const preferredLanguage = "en"; // Assume English as default; you can make this dynamic based on user settings

    useEffect(() => {
        const fetchLobbyDetails = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");
                if (!token) {
                    setError("Please log in!");
                    setSnackbarMessage("You need to log in!");
                    setSnackbarSeverity("error");
                    setSnackbarOpen(true);
                    navigate("/login");
                    return;
                }

                const res = await axios.get(`http://localhost:8081/lobbies/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setLobby(res.data);
                setCreatorName(res.data.created_by_name || "Unknown User");

                if (user) {
                    const playerCheck = res.data.players.some((p) => p.id === user.id);
                    setIsJoined(playerCheck);
                }

                const messagesRes = await axios.get(`http://localhost:8081/lobbies/${id}/messages`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setChatMessages(messagesRes.data.messages || []);
                setLoading(false);
            } catch (err) {
                setError("An error occurred while loading the lobby: " + (err.response?.data?.message || err.message));
                setLoading(false);
            }
        };

        fetchLobbyDetails();
    }, [id, user, navigate]);

    useEffect(() => {
        if (!user) return;

        const handleSocketConnect = () => {
            socket.emit("set_username", user.name);
            if (isJoined && socket.connected && (!socket.rooms || !new Set(socket.rooms).has(id))) {
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            }
        };

        socket.on("connect", handleSocketConnect);
        socket.on("receive_message", (message) => {
            const lastMessage = lastMessageRef.current;
            const newMessageString = `${message.user}: ${message.content}`;
            if (lastMessage !== newMessageString) {
                let translatedContent = message.content;
                if (preferredLanguage === "tr" && message.content.includes("left the lobby")) {
                    translatedContent = message.content.replace("left the lobby", "lobiden ayrıldı");
                } else if (preferredLanguage === "en" && message.content.includes("lobiden ayrıldı")) {
                    translatedContent = message.content.replace("lobiden ayrıldı", "left the lobby");
                }
                setChatMessages((prevMessages) => [...prevMessages, { user: message.user, content: translatedContent }]);
                lastMessageRef.current = newMessageString;
            }
        });
        socket.on("disconnect", () => {
            setSnackbarMessage("Connection lost, reconnecting...");
            setSnackbarSeverity("warning");
            setSnackbarOpen(true);
        });
        socket.on("reconnect", () => {
            setSnackbarMessage("Reconnected successfully!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            if (isJoined && socket.connected && (!socket.rooms || !new Set(socket.rooms).has(id))) {
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            }
        });

        if (socket.connected) handleSocketConnect();

        return () => {
            socket.off("connect", handleSocketConnect);
            socket.off("receive_message");
            socket.off("disconnect");
            socket.off("reconnect");
        };
    }, [id, user, isJoined]);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleJoinLobby = async () => {
        if (!user) {
            setSnackbarMessage("Please log in!");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
        }
        if (lobby.password && !isJoined) {
            setPasswordDialogOpen(true);
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `http://localhost:8081/lobbies/${id}/join`,
                { userId: user.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.alreadyJoined) {
                setSnackbarMessage("You are already in this lobby!");
                setSnackbarSeverity("info");
                setSnackbarOpen(true);
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
                return;
            }
            setIsJoined(true);
            socket.emit("join_lobby", { lobbyId: id, userId: user.id });
            setLobby((prev) => ({ ...prev, current_players: prev.current_players + 1 }));
            setSnackbarMessage("You have joined the lobby!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Could not join the lobby: " + (err.response?.data?.message || err.message));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    const handlePasswordSubmit = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `http://localhost:8081/lobbies/${id}/join`,
                { userId: user.id, password },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.alreadyJoined) {
                setSnackbarMessage("You are already in this lobby!");
                setSnackbarSeverity("info");
                setSnackbarOpen(true);
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
                setPasswordDialogOpen(false);
                return;
            }
            setIsJoined(true);
            socket.emit("join_lobby", { lobbyId: id, userId: user.id });
            setPasswordDialogOpen(false);
            const lobbyRes = await axios.get(`http://localhost:8081/lobbies/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLobby(lobbyRes.data);
            setSnackbarMessage("You have joined the lobby!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage(err.response?.data?.message || "Incorrect password or an error occurred!");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    const handleLeaveLobbyClick = () => {
        setLeaveConfirmOpen(true);
    };

    const handleLeaveLobbyConfirm = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `http://localhost:8081/lobbies/${id}/leave`,
                { userId: user.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsJoined(false);
            socket.emit("leave_lobby", { lobbyId: id, userId: user.id });
            const res = await axios.get(`http://localhost:8081/lobbies/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLobby(res.data);
            setSnackbarMessage("You have left the lobby!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            setLeaveConfirmOpen(false);
        } catch (err) {
            setSnackbarMessage("Could not leave the lobby!");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            setLeaveConfirmOpen(false);
        }
    };

    const handleStartGame = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(`http://localhost:8081/lobbies/${id}/start`, null, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSnackbarMessage("Game started successfully!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Could not start the game!");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/lobbies/${id}`;
        navigator.clipboard.writeText(link);
        setSnackbarMessage("Lobby link copied to clipboard!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
    };

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            socket.emit("send_message", { lobbyId: id, userId: user.id, content: newMessage });
            setNewMessage("");
        }
    };

    const handlePlayGame = () => {
        if (lobby.game_id === "tombala") {
            const gameUrl = `${window.location.origin}/packages/${lobby.game_id}`;
            window.open(gameUrl, "_blank");
            setSnackbarMessage(`Opening ${lobby.game_id} game...`);
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
        } else {
            setSnackbarMessage("Game not available yet!");
            setSnackbarSeverity("warning");
            setSnackbarOpen(true);
        }
    };

    const handleDeleteLobbyClick = () => {
        setDeleteConfirmOpen(true);
    };

    const handleDeleteLobbyConfirm = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.delete(`http://localhost:8081/lobbies/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                setSnackbarMessage("Lobby deleted successfully!");
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
                setDeleteConfirmOpen(false);
                navigate("/games");
            } else {
                throw new Error(res.data.message);
            }
        } catch (err) {
            setSnackbarMessage("Could not delete lobby: " + (err.response?.data?.message || err.message));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            setDeleteConfirmOpen(false);
        }
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbarOpen(false);
    };

    if (loading) return <Typography>Loading...</Typography>;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!lobby || !user) return <Typography>Lobby or user data not found.</Typography>;

    return (
        <Box className={`lobby-details-container ${mode === "dark" ? "lobby-dark-theme" : "lobby-light-theme"}`}>
            {/* Main Content: Players on the left, Chat on the right */}
            <Box className="lobby-content">
                {/* Left Section: Header + Players */}
                <Box className="lobby-left-section">
                    {/* Lobby Header */}
                    <Box className="lobby-header">
                        <Typography variant="h4" className="lobby-header-title" sx={{ fontWeight: "bold" }}>
                            {lobby.name}
                        </Typography>
                        <Typography variant="subtitle1" className="lobby-header-title" color="text.secondary">
                            Game: {lobby.game_id}
                        </Typography>
                        <Typography variant="subtitle2" className="lobby-header-title" color="text.secondary">
                            Players: {lobby.current_players}/{lobby.max_players}
                        </Typography>
                        <Typography variant="subtitle2" className="lobby-header-title" color="text.secondary">
                            Created by: {creatorName}
                        </Typography>
                        {lobby.password && <Lock fontSize="small" sx={{ verticalAlign: "middle", ml: 1 }} />}
                        <Box className="lobby-actions">
                            {!isJoined ? (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleJoinLobby}
                                    disabled={lobby.current_players >= lobby.max_players}
                                >
                                    Join Lobby
                                </Button>
                            ) : (
                                <>
                                    <Button variant="contained" color="secondary" onClick={handleLeaveLobbyClick} startIcon={<ExitToApp />}>
                                        Leave Lobby
                                    </Button>
                                    <Button variant="contained" color="primary" onClick={handlePlayGame} startIcon={<SportsEsports />}>
                                        Play
                                    </Button>
                                    {lobby.created_by === user.id && (
                                        <>
                                            <Button variant="contained" color="success" onClick={handleStartGame} startIcon={<PlayArrow />}>
                                                Start Game
                                            </Button>
                                            <Button variant="contained" color="error" onClick={handleDeleteLobbyClick} startIcon={<Delete />}>
                                                Delete Lobby
                                            </Button>
                                        </>
                                    )}
                                </>
                            )}
                            <Button variant="outlined" onClick={handleCopyLink} startIcon={<ContentCopy />}>
                                Invite Friends
                            </Button>
                            <Button variant="outlined" onClick={() => navigate("/")}>
                                Back to Home
                            </Button>
                        </Box>
                    </Box>

                    {/* Players Card */}
                    <Paper elevation={2} className="lobby-card players-card">
                        <Box sx={{ p: 2 }}>
                            <Typography variant="h6" className="section-title">Players</Typography>
                            {lobby.players && lobby.players.length > 0 ? (
                                <List>
                                    {lobby.players.map((player) => (
                                        <ListItem key={player.id}>
                                            <ListItemAvatar>
                                                <Avatar src={player.avatar_url} />
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={player.name}
                                                secondary={player.is_ready ? "Ready" : "Not Ready"}
                                                sx={{ color: player.is_ready ? "green" : "orange" }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography className="section-text">No players in this lobby yet.</Typography>
                            )}
                        </Box>
                    </Paper>
                </Box>

                {/* Right Column: Chat */}
                <Paper elevation={2} className="lobby-card chat-card">
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" className="section-title">Chat</Typography>
                        <Box ref={chatRef} className="chat-messages">
                            {chatMessages.map((msg, index) => (
                                <Typography
                                    key={index}
                                    className="section-text"
                                    sx={{
                                        mb: 1,
                                        bgcolor: msg.user === "System" ? (mode === "dark" ? "#444" : "#e0f7fa") : "transparent",
                                        p: 1,
                                        borderRadius: 1,
                                    }}
                                >
                                    <strong>{msg.user}:</strong> {msg.content}
                                </Typography>
                            ))}
                        </Box>
                        {isJoined && (
                            <Box className="chat-input">
                                <TextField
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    fullWidth
                                    size="small"
                                    sx={{ bgcolor: mode === "dark" ? "#444" : "white" }}
                                />
                                <Button variant="contained" onClick={handleSendMessage}>
                                    Send
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>

            {/* Password Dialog */}
            <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
                <DialogTitle>Enter Lobby Password</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasswordDialogOpen(false)} color="secondary">Cancel</Button>
                    <Button onClick={handlePasswordSubmit} variant="contained">Submit</Button>
                </DialogActions>
            </Dialog>

            {/* Leave Confirmation Dialog */}
            <Dialog open={leaveConfirmOpen} onClose={() => setLeaveConfirmOpen(false)}>
                <DialogTitle>Are You Sure You Want to Leave?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to leave the lobby?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLeaveConfirmOpen(false)} color="primary">No</Button>
                    <Button onClick={handleLeaveLobbyConfirm} color="secondary" variant="contained">Yes</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Are You Sure You Want to Delete?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this lobby? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">No</Button>
                    <Button onClick={handleDeleteLobbyConfirm} color="error" variant="contained">Yes</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbarSeverity}
                    sx={{ width: "100%", bgcolor: snackbarSeverity === "success" ? "green" : snackbarSeverity === "error" ? "red" : "blue", color: "white" }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default LobbyDetails;