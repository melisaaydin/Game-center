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
    DialogActions,
    Snackbar,
    Alert,
    Paper,
} from "@mui/material";
import { Lock, ContentCopy, ExitToApp, PlayArrow } from "@mui/icons-material";
import { useUser } from "../context/UserContext";
import { ColorModeContext } from "../context/ThemeContext";
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
    const chatRef = useRef(null);

    useEffect(() => {
        const fetchLobbyDetails = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");
                if (!token) {
                    setError("Lütfen giriş yapın!");
                    setSnackbarMessage("Oturum açmanız gerekiyor!");
                    setSnackbarSeverity("error");
                    setSnackbarOpen(true);
                    navigate("/login");
                    return;
                }

                const res = await axios.get(`http://localhost:8081/lobbies/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLobby(res.data);
                setCreatorName(res.data.created_by_name || "Bilinmeyen Kullanıcı");

                if (user) {
                    const playerCheck = res.data.players.some((p) => p.id === user.id);
                    setIsJoined(playerCheck);
                }

                const messagesRes = await axios.get(`http://localhost:8081/lobbies/${id}/messages`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setChatMessages(messagesRes.data.messages);
                setLoading(false);
            } catch (err) {
                setError("Lobi yüklenirken bir hata oluştu: " + (err.response?.data?.message || err.message));
                setLoading(false);
            }
        };

        fetchLobbyDetails();
    }, [id, user, navigate]);

    useEffect(() => {
        if (!user) return;

        const handleSocketConnect = () => {
            console.log("Socket connected:", socket.id);
            socket.emit("set_username", user.name);

            if (isJoined && socket.connected && (!socket.rooms || !new Set(socket.rooms).has(id))) {
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
                console.log(`Rejoining lobby ${id} silently for user ${user.id}`);
            }
        };

        socket.on("connect", handleSocketConnect);

        socket.on("receive_message", (message) => {
            setChatMessages((prevMessages) => [...prevMessages, { user: message.user, content: message.content }]);
        });

        socket.on("disconnect", () => {
            setSnackbarMessage("Bağlantı kesildi, yeniden bağlanılıyor...");
            setSnackbarSeverity("warning");
            setSnackbarOpen(true);
        });

        socket.on("reconnect", () => {
            setSnackbarMessage("Yeniden bağlanıldı!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            if (isJoined && socket.connected && (!socket.rooms || !new Set(socket.rooms).has(id))) {
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            }
        });

        if (socket.connected) {
            handleSocketConnect();
        }

        return () => {
            if (isJoined) {
                socket.emit("leave_lobby", { lobbyId: id, userId: user.id });
            }
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
            setSnackbarMessage("Lütfen giriş yapın!");
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
                setSnackbarMessage("Zaten bu lobidesiniz!");
                setSnackbarSeverity("info");
                setSnackbarOpen(true);
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
                return;
            }
            setIsJoined(true);
            socket.emit("join_lobby", { lobbyId: id, userId: user.id });
            setLobby((prev) => ({ ...prev, current_players: prev.current_players + 1 }));
            setSnackbarMessage("Lobiye katıldınız!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Lobiye katılamadınız: " + (err.response?.data?.message || err.message));
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
                setSnackbarMessage("Zaten bu lobidesiniz!");
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
            setSnackbarMessage("Lobiye katıldınız!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Şifre yanlış veya hata oluştu!");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    const handleLeaveLobby = async () => {
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
            setSnackbarMessage("Lobiden ayrıldınız!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Lobiden ayrılamadınız!");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    const handleStartGame = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.post(`http://localhost:8081/lobbies/${id}/start`, null, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSnackbarMessage("Oyun başlatıldı!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Oyun başlatılamadı!");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/lobbies/${id}`;
        navigator.clipboard.writeText(link);
        setSnackbarMessage("Lobi bağlantısı kopyalandı!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
    };

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            socket.emit("send_message", { lobbyId: id, userId: user.id, content: newMessage });
            setNewMessage("");
        }
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbarOpen(false);
    };

    if (loading) return <Typography>Yükleniyor...</Typography>;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!lobby) return <Typography>Lobi bulunamadı.</Typography>;

    return (
        <Box
            className={`lobby-details-container ${mode === "dark" ? "lobby-dark-theme" : "lobby-light-theme"}`}
        >
            <Box className="lobby-header">
                <Typography className="lobby-header-title" variant="h4" sx={{ fontWeight: "bold" }}>
                    {lobby.name}
                </Typography>
                <Typography className="lobby-header-title" variant="subtitle1" color="text.secondary">
                    Game: {lobby.game_id}
                </Typography>
                <Typography className="lobby-header-title" variant="subtitle2" color="text.secondary">
                    Players: {lobby.current_players}/{lobby.max_players}
                </Typography>
                <Typography className="lobby-header-title" variant="subtitle2" color="text.secondary">
                    Created by: {creatorName}
                </Typography>
                {lobby.password && <Lock fontSize="small" sx={{ verticalAlign: "middle", ml: 1 }} />}
            </Box>

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
                        <Button variant="contained" color="secondary" onClick={handleLeaveLobby} startIcon={<ExitToApp />}>
                            Leave Lobby
                        </Button>
                        {lobby.created_by === String(user?.id) && (
                            <Button variant="contained" color="success" onClick={handleStartGame} startIcon={<PlayArrow />}>
                                Start Game
                            </Button>
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

            <Box className="lobby-content">
                <Paper elevation={2} className="lobby-card">
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" className="section-title">
                            Players
                        </Typography>
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

                <Paper elevation={2} className="lobby-card">
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" className="section-title">
                            Chat
                        </Typography>
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
                    <Button onClick={() => setPasswordDialogOpen(false)} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handlePasswordSubmit} variant="contained">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>

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