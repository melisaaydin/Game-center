import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Button, Snackbar, Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { Lock, ContentCopy, ExitToApp, PlayArrow, SportsEsports, Delete } from "@mui/icons-material";
import { FcInvite } from "react-icons/fc";
import { useUser } from "../../context/UserContext";
import { ColorModeContext } from "../../context/ThemeContext";
import ChatSection from "../../components/LobbyDetails/ChatSection";
import PlayersSection from "../../components/LobbyDetails/PlayersSection";
import InviteDialog from "../../components/LobbyDetails/InviteDialog";
import { socket, fetchLobbyDetails, leaveLobby, deleteLobby, inviteFriend, apiRequest } from "../../utils/lobbyUtils";
import "./LobbyDetail.css";

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
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [creatorName, setCreatorName] = useState("");
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [invitedUsers, setInvitedUsers] = useState(new Set());
    const [typingUser, setTypingUser] = useState(null);
    const chatRef = useRef(null);
    const lastMessageRef = useRef(null);

    useEffect(() => {
        const loadLobby = async () => {
            setLoading(true);
            const messages = await fetchLobbyDetails(id, user, setLobby, setCreatorName, setIsJoined, setError, setSnackbar, navigate);
            setChatMessages(messages);
            setLoading(false);
        };
        loadLobby();
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
            const newMessageString = `${message.user}:${message.content}:${message.timestamp}`;
            if (lastMessage !== newMessageString) {
                setChatMessages((prev) => [...prev, { user: message.user, content: message.content, avatar_url: message.avatar_url }]);
                lastMessageRef.current = newMessageString;
            }
        });
        socket.on("lobby_invite", ({ lobbyId, lobbyName, senderId, senderName }) => {
            setSnackbar({ open: true, message: `${senderName} invited you to join ${lobbyName}`, severity: "info" });
        });
        socket.on("lobby_invite_accepted", ({ lobbyId, lobbyName, receiverId, receiverName }) => {
            setSnackbar({ open: true, message: `${receiverName} joined ${lobbyName}!`, severity: "success" });
            if (lobbyId === id) fetchLobbyDetails(id, user, setLobby, setCreatorName, setIsJoined, setError, setSnackbar, navigate);
        });
        socket.on("lobby_invite_rejected", ({ lobbyId, lobbyName, receiverId, receiverName }) => {
            setSnackbar({ open: true, message: `${receiverName} rejected the invitation to ${lobbyName}.`, severity: "info" });
        });
        socket.on("disconnect", () => setSnackbar({ open: true, message: "Connection lost, reconnecting...", severity: "warning" }));
        socket.on("reconnect", () => {
            setSnackbar({ open: true, message: "Reconnected successfully!", severity: "success" });
            if (isJoined && socket.connected && (!socket.rooms || !new Set(socket.rooms).has(id))) {
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            }
        });
        socket.on("typing", ({ userName }) => setTypingUser(userName));
        socket.on("stop_typing", () => setTypingUser(null));

        if (socket.connected) handleSocketConnect();

        return () => {
            socket.off("connect", handleSocketConnect);
            socket.off("receive_message");
            socket.off("lobby_invite");
            socket.off("lobby_invite_accepted");
            socket.off("lobby_invite_rejected");
            socket.off("disconnect");
            socket.off("reconnect");
            socket.off("typing");
            socket.off("stop_typing");
        };
    }, [id, user, isJoined]);

    const handleJoinLobby = async () => {
        if (!user) {
            setSnackbar({ open: true, message: "Please log in!", severity: "error" });
            return;
        }
        if (lobby.password && !isJoined) {
            setPasswordDialogOpen(true);
            return;
        }

        const token = localStorage.getItem("token");
        const res = await apiRequest("post", `http://localhost:8081/lobbies/${id}/join`, { userId: user.id }, token);
        if (res.success) {
            if (res.data.alreadyJoined) {
                setSnackbar({ open: true, message: "You are already in this lobby!", severity: "info" });
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            } else {
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id });
                setLobby((prev) => ({ ...prev, current_players: prev.current_players + 1 }));
                setSnackbar({ open: true, message: "You have joined the lobby!", severity: "success" });
            }
        } else {
            setSnackbar({ open: true, message: "Could not join the lobby: " + res.message, severity: "error" });
        }
    };

    const handlePasswordSubmit = async () => {
        const token = localStorage.getItem("token");
        const res = await apiRequest("post", `http://localhost:8081/lobbies/${id}/join`, { userId: user.id, password }, token);
        if (res.success) {
            if (res.data.alreadyJoined) {
                setSnackbar({ open: true, message: "You are already in this lobby!", severity: "info" });
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            } else {
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id });
                const lobbyRes = await apiRequest("get", `http://localhost:8081/lobbies/${id}`, null, token);
                if (lobbyRes.success) setLobby(lobbyRes.data);
                setSnackbar({ open: true, message: "You have joined the lobby!", severity: "success" });
            }
            setPasswordDialogOpen(false);
        } else {
            setSnackbar({ open: true, message: res.message || "Incorrect password or an error occurred!", severity: "error" });
        }
    };

    const handlePlayGame = () => {
        if (lobby.game_id === "tombala") {
            const gameUrl = `${window.location.origin}/packages/${lobby.game_id}`;
            window.open(gameUrl, "_blank");
            setSnackbar({ open: true, message: `Opening ${lobby.game_id} game...`, severity: "info" });
        } else {
            setSnackbar({ open: true, message: "Game not available yet!", severity: "warning" });
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/lobbies/${id}`;
        navigator.clipboard.writeText(link);
        setSnackbar({ open: true, message: "Lobby link copied to clipboard!", severity: "success" });
    };

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            socket.emit("send_message", { lobbyId: id, userId: user.id, content: newMessage, avatar_url: user.avatar_url });
            socket.emit("stop_typing", { lobbyId: id });
            setNewMessage("");
        }
    };

    const handleTyping = () => {
        if (newMessage.trim()) socket.emit("typing", { lobbyId: id, userName: user.name });
        else socket.emit("stop_typing", { lobbyId: id });
    };

    const handleOpenInviteDialog = async () => {
        setInviteDialogOpen(true);
        setFriendsLoading(true);
        const token = localStorage.getItem("token");
        const res = await apiRequest("get", `http://localhost:8081/lobbies/${id}/friends`, null, token);
        if (res.success) {
            setFriends(res.data.friends || []);
            setInvitedUsers(new Set());
        } else {
            setSnackbar({ open: true, message: "Failed to load friends: " + res.message, severity: "error" });
        }
        setFriendsLoading(false);
    };

    const handleInviteFriend = (friendId) => {
        const token = localStorage.getItem("token");
        inviteFriend(id, friendId, user.id, lobby.name, setInvitedUsers, setSnackbar, token);
    };

    if (loading) return <Typography>Loading...</Typography>;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!lobby || !user) return <Typography>Lobby or user data not found.</Typography>;

    return (
        <Box className="lobby-details-container">
            <Box className="lobby-content">
                <Box className="lobby-left-section">
                    <Box className="lobby-header">
                        <Typography variant="h4" sx={{ fontWeight: "bold" }}>{lobby.name}</Typography>
                        <Typography variant="subtitle1" color="text.secondary">Game: {lobby.game_id}</Typography>
                        <Typography variant="subtitle2" color="text.secondary">Players: {lobby.current_players}/{lobby.max_players}</Typography>
                        <Typography variant="subtitle2" color="text.secondary">Created by: {creatorName}</Typography>
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
                                    <Button variant="contained" color="secondary" onClick={() => setLeaveConfirmOpen(true)} startIcon={<ExitToApp />}>
                                        Leave Lobby
                                    </Button>
                                    <Button variant="contained" color="primary" onClick={handlePlayGame} startIcon={<SportsEsports />}>
                                        Play
                                    </Button>
                                    <Button variant="outlined" onClick={handleOpenInviteDialog} startIcon={<FcInvite />}>
                                        Invite Friends
                                    </Button>
                                    {lobby.created_by === user.id && (
                                        <Button variant="contained" color="error" onClick={() => setDeleteConfirmOpen(true)} startIcon={<Delete />}>
                                            Delete Lobby
                                        </Button>
                                    )}
                                </>
                            )}
                            <Button variant="outlined" onClick={handleCopyLink} startIcon={<ContentCopy />}>Copy Lobby Link</Button>
                            <Button variant="outlined" onClick={() => navigate("/")}>Back to Home</Button>
                        </Box>
                    </Box>
                    <PlayersSection lobby={lobby} />
                </Box>
                <ChatSection
                    chatMessages={chatMessages}
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    typingUser={typingUser}
                    isJoined={isJoined}
                    handleSendMessage={handleSendMessage}
                    handleTyping={handleTyping}
                    mode={mode}
                    chatRef={chatRef}
                    userName={user.name}
                />
            </Box>

            <InviteDialog
                open={inviteDialogOpen}
                onClose={() => setInviteDialogOpen(false)}
                friends={friends}
                friendsLoading={friendsLoading}
                invitedUsers={invitedUsers}
                handleInvite={handleInviteFriend}
            />

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

            <Dialog open={leaveConfirmOpen} onClose={() => setLeaveConfirmOpen(false)}>
                <DialogTitle>Are You Sure You Want to Leave?</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to leave the lobby?</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLeaveConfirmOpen(false)} color="primary">No</Button>
                    <Button onClick={() => leaveLobby(id, user.id, setIsJoined, setLobby, setSnackbar, localStorage.getItem("token"), setLeaveConfirmOpen)} color="secondary" variant="contained">
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Are You Sure You Want to Delete?</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to delete this lobby? This action cannot be undone.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">No</Button>
                    <Button onClick={() => deleteLobby(id, setSnackbar, navigate, localStorage.getItem("token"))} color="error" variant="contained">
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={(e, reason) => reason !== "clickaway" && setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={(e, reason) => {
                        if (reason !== "clickaway") {
                            setSnackbar({ ...snackbar, open: false });
                        }
                    }}
                    severity={snackbar.severity}
                    sx={{ width: "100%", bgcolor: snackbar.severity === "success" ? "green" : snackbar.severity === "error" ? "red" : "blue", color: "white" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default LobbyDetails;