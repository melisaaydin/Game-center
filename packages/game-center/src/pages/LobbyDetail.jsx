import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Box,
    Typography,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    IconButton,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import { Lock, ContentCopy, ExitToApp, PlayArrow } from "@mui/icons-material";
import "./LobbyDetail.css";

const LobbyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lobby, setLobby] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isJoined, setIsJoined] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    useEffect(() => {
        const fetchLobbyDetails = async () => {
            try {
                setLoading(true);
                console.log("Lobi ID:", id);
                const res = await axios.get(`http://localhost:8081/lobbies/${id}`);
                console.log("Lobi Detayları:", res.data);
                setLobby(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Lobi detayları alınamadı:", err.message);
                console.error("Hata Detayları:", err.response);
                setError("Lobi yüklenirken bir hata oluştu.");
                setLoading(false);
            }
        };

        fetchLobbyDetails();
    }, [id]);

    const handleJoinLobby = async () => {
        if (lobby.password && !isJoined) {
            setPasswordDialogOpen(true);
            return;
        }

        try {
            await axios.post(`http://localhost:8081/lobbies/${id}/join`, {
                userId: "currentUserId",
            });
            setIsJoined(true);
            setChatMessages([...chatMessages, { user: "System", message: "You joined the lobby!" }]);
            // Lobi bilgilerini güncelle
            const res = await axios.get(`http://localhost:8081/lobbies/${id}`);
            setLobby(res.data);
        } catch (err) {
            console.error("Lobiye katılamadı:", err);
            alert("Lobiye katılamadınız.");
        }
    };

    const handlePasswordSubmit = async () => {
        try {
            const res = await axios.post(`http://localhost:8081/lobbies/${id}/join`, {
                userId: "currentUserId",
                password,
            });
            setIsJoined(true);
            setPasswordDialogOpen(false);
            setChatMessages([...chatMessages, { user: "System", message: "You joined the lobby!" }]);
            // Lobi bilgilerini güncelle
            const lobbyRes = await axios.get(`http://localhost:8081/lobbies/${id}`);
            setLobby(lobbyRes.data);
        } catch (err) {
            console.error("Şifre yanlış:", err);
            alert("Şifre yanlış.");
        }
    };

    const handleLeaveLobby = async () => {
        try {
            await axios.post(`http://localhost:8081/lobbies/${id}/leave`, {
                userId: "currentUserId",
            });
            setIsJoined(false);
            setChatMessages([...chatMessages, { user: "System", message: "You left the lobby!" }]);
            // Lobi bilgilerini güncelle
            const res = await axios.get(`http://localhost:8081/lobbies/${id}`);
            setLobby(res.data);
        } catch (err) {
            console.error("Lobiden ayrılamadı:", err);
            alert("Lobiden ayrılamadınız.");
        }
    };

    const handleStartGame = async () => {
        try {
            await axios.post(`http://localhost:8081/lobbies/${id}/start`);
            alert("Oyun başlatıldı!");
        } catch (err) {
            console.error("Oyun başlatılamadı:", err);
            alert("Oyun başlatılamadı.");
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/lobbies/${id}`;
        navigator.clipboard.writeText(link);
        alert("Lobi bağlantısı kopyalandı!");
    };

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            setChatMessages([...chatMessages, { user: "You", message: newMessage }]);
            setNewMessage("");
        }
    };

    if (loading) return <div>Yükleniyor...</div>;
    if (error) return <div>{error}</div>;
    if (!lobby) return <div>Lobi bulunamadı.</div>;

    return (
        <Box className="lobby-details-container">
            {/* Lobi Bilgileri */}
            <Box className="lobby-header">
                <Typography variant="h4">{lobby.name}</Typography>
                <Typography variant="subtitle1">Game: {lobby.game_id}</Typography>
                <Typography variant="subtitle2">
                    Players: {lobby.current_players}/{lobby.max_players}
                </Typography>
                <Typography variant="subtitle2">Created by: {lobby.created_by}</Typography>
                {lobby.password && <Lock fontSize="small" />}
            </Box>

            {/* Eylem Butonları */}
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
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleLeaveLobby}
                            startIcon={<ExitToApp />}
                        >
                            Leave Lobby
                        </Button>
                        {lobby.created_by === "currentUserId" && (
                            <Button
                                variant="contained"
                                color="success"
                                onClick={handleStartGame}
                                startIcon={<PlayArrow />}
                            >
                                Start Game
                            </Button>
                        )}
                    </>
                )}
                <Button
                    variant="outlined"
                    onClick={handleCopyLink}
                    startIcon={<ContentCopy />}
                >
                    Invite Friends
                </Button>
                <Button variant="outlined" onClick={() => navigate("/")}>
                    Back to Home
                </Button>
            </Box>

            {/* Oyuncu Listesi */}
            <Box className="lobby-players">
                <Typography variant="h6">Players</Typography>
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
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography>No players in this lobby yet.</Typography>
                )}
            </Box>

            {/* Sohbet Bölümü */}
            <Box className="lobby-chat">
                <Typography variant="h6">Chat</Typography>
                <Box className="chat-messages">
                    {chatMessages.map((msg, index) => (
                        <Typography key={index}>
                            <strong>{msg.user}:</strong> {msg.message}
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
                        />
                        <Button onClick={handleSendMessage}>Send</Button>
                    </Box>
                )}
            </Box>

            {/* Şifre Girme Dialog’u */}
            <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
                <DialogTitle>Enter Password</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handlePasswordSubmit}>Submit</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LobbyDetails;