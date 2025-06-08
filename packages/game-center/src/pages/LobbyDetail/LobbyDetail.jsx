import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, IconButton, Menu, MenuItem } from "@mui/material";
import { Lock, MoreVert } from "@mui/icons-material";
import { useUser } from "../../context/UserContext";
import { ColorModeContext } from "../../context/ThemeContext";
import ChatSection from "../../components/LobbyDetails/ChatSection";
import PlayersSection from "../../components/LobbyDetails/PlayersSection";
import InviteDialog from "../../components/LobbyDetails/InviteDialog";
import { socket, fetchLobbyDetails, leaveLobby, deleteLobby, inviteFriend, apiRequest } from "../../utils/lobbyUtils";
import "./LobbyDetail.css";
import Copy from "../../assets/copy.png";
import Invitation from "../../assets/invitation.png";
import JoyStick from "../../assets/joystick.png";
import LogOut from "../../assets/log-out.png";
import Pencil from "../../assets/pencil.png";
import Trash from "../../assets/trash-bin.png";
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

const LobbyDetails = () => {
    const { t } = useTranslation('lobby');
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
    const [creatorName, setCreatorName] = useState("");
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [invitedUsers, setInvitedUsers] = useState(new Set());
    const [typingUser, setTypingUser] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({});
    const chatRef = useRef(null);
    const lastMessageRef = useRef(null);
    const [anchorEl, setAnchorEl] = useState(null);

    // Fetch lobby details and chat messages on component mount or when ID/user changes
    useEffect(() => {
        const loadLobby = async () => {
            setLoading(true);
            // Fetch lobby details and initial chat messages
            const messages = await fetchLobbyDetails(id, user, setLobby, setCreatorName, setIsJoined, setError, (message, severity) => {
                if (severity === "success") toast.success(message);
                else if (severity === "error") toast.error(message);
                else if (severity === "info") toast.info(message);
                else if (severity === "warning") toast.warning(message);
            }, navigate);
            setChatMessages(messages);
            setLoading(false);
        };
        loadLobby();
    }, [id, user, navigate]);

    // Set up socket events for real-time lobby and chat updates
    useEffect(() => {
        if (!user) return;
        // Handle socket connection and join the lobby if already a member
        const handleSocketConnect = () => {
            socket.emit("set_username", user.name);
            if (isJoined && socket.connected && (!socket.rooms || !new Set(socket.rooms).has(id))) {
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            }
        };
        socket.on("connect", handleSocketConnect);
        // Receive and display new chat messages, keeping only the last 15
        socket.on("receive_message", (message) => {
            const lastMessage = lastMessageRef.current;
            const newMessageString = `${message.user}:${message.content}:${message.timestamp}`;
            if (lastMessage !== newMessageString) {
                setChatMessages((prev) => [...prev, { user: message.user, content: message.content, avatar_url: message.avatar_url }].slice(-15));
                lastMessageRef.current = newMessageString;
            }
        });
        // Notify when a user receives a lobby invite
        socket.on("lobby_invite", ({ lobbyId, lobbyName, senderId, senderName }) => {
            toast.info(t("lobbyInviteMessage", { senderName, lobbyName }));
        });
        // Update lobby when an invite is accepted
        socket.on("lobby_invite_accepted", ({ lobbyId, lobbyName, receiverId, receiverName }) => {
            toast.success(t("lobbyInviteAccepted", { receiverName, lobbyName }));
            if (lobbyId === id) fetchLobbyDetails(id, user, setLobby, setCreatorName, setIsJoined, setError, (message, severity) => {
                if (severity === "success") toast.success(message);
                else if (severity === "error") toast.error(message);
                else if (severity === "info") toast.info(message);
                else if (severity === "warning") toast.warning(message);
            }, navigate);
        });
        // Notify when an invite is rejected
        socket.on("lobby_invite_rejected", ({ lobbyId, lobbyName, receiverId, receiverName }) => {
            toast.info(t("lobbyInviteRejected", { receiverName, lobbyName }));
        });
        // Warn on socket disconnection
        socket.on("disconnect", () => toast.warning(t("connectionLost")));
        // Confirm successful reconnection
        socket.on("reconnect", () => toast.success(t("reconnectSuccess")));
        // Show when a user is typing in the chat
        socket.on("typing", ({ userName }) => setTypingUser(userName));
        // Clear typing indicator when a user stops
        socket.on("stop_typing", () => setTypingUser(null));

        if (socket.connected) handleSocketConnect();

        // Clean up socket event listeners on component unmount
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
    }, [id, user, isJoined, t]);

    // Handle joining the lobby, prompting for a password if needed
    const handleJoinLobby = async () => {
        if (!user) {
            toast.error(t("pleaseLogin"));
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
                toast.info(t("alreadyInLobby"));
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            } else {
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id });
                setLobby((prev) => ({ ...prev, current_players: prev.current_players + 1 }));
                toast.success(t("joinedLobby"));
            }
        } else {
            toast.error(t("joinLobbyFailed", { message: res.message }));
        }
    };

    // Submit the password to join a protected lobby
    const handlePasswordSubmit = async () => {
        const token = localStorage.getItem("token");
        const res = await apiRequest("post", `http://localhost:8081/lobbies/${id}/join`, { userId: user.id, password }, token);
        if (res.success) {
            if (res.data.alreadyJoined) {
                toast.info(t("alreadyInLobby"));
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            } else {
                setIsJoined(true);
                socket.emit("join_lobby", { lobbyId: id, userId: user.id });
                const lobbyRes = await apiRequest("get", `http://localhost:8081/lobbies/${id}`, null, token);
                if (lobbyRes.success) setLobby(lobbyRes.data);
                toast.success(t("joinedLobby"));
            }
            setPasswordDialogOpen(false);
        } else {
            toast.error(t("invalidPassword"));
        }
    };

    // Open the game in a new tab if the user is logged in
    const handlePlayGame = () => {
        if (!user) {
            toast.error(t("pleaseLogin"));
            navigate('/login');
            return;
        }
        if (lobby && lobby.game_id) {
            const token = localStorage.getItem('token');
            const gameUrl = `http://localhost:3001/games/${lobby.game_id}/lobby/${id}?token=${token}`;
            window.open(gameUrl, '_blank');
            toast.info(t("bingoGameStarting", { lobbyName: lobby.name }));
            socket.emit('join_game', { gameName: lobby.game_id, id, userId: user.id });
        } else {
            toast.warning(t("gameNotAvailable"));
        }
    };

    // Copy the lobby link to the clipboard
    const handleCopyLink = () => {
        const link = `${window.location.origin}/lobbies/${id}`;
        navigator.clipboard.writeText(link);
        toast.success(t("linkCopied"));
    };

    // Send a chat message to the lobby
    const handleSendMessage = () => {
        if (newMessage.trim()) {
            socket.emit("send_message", { lobbyId: id, userId: user.id, content: newMessage, avatar_url: user.avatar_url });
            socket.emit("stop_typing", { lobbyId: id });
            setNewMessage("");
        }
    };

    // Emit typing or stop typing events based on message input
    const handleTyping = () => {
        if (newMessage.trim()) socket.emit("typing", { lobbyId: id, userName: user.name });
        else socket.emit("stop_typing", { lobbyId: id });
    };

    // Open the invite dialog and fetch the user’s friends list
    const handleOpenInviteDialog = async () => {
        setInviteDialogOpen(true);
        setFriendsLoading(true);
        const token = localStorage.getItem("token");
        const res = await apiRequest("get", `http://localhost:8081/lobbies/${id}/friends`, null, token);
        if (res.success) {
            setFriends(res.data.friends || []);
            setInvitedUsers(new Set());
        } else {
            toast.error(t("failedToLoadFriends", { message: res.message }));
        }
        setFriendsLoading(false);
    };

    // Invite a friend to the lobby
    const handleInviteFriend = (friendId) => {
        const token = localStorage.getItem("token");
        inviteFriend(id, friendId, user.id, lobby.name, setInvitedUsers, (message, severity) => {
            if (severity === "success") toast.success(message);
            else if (severity === "error") toast.error(message);
            else if (severity === "info") toast.info(message);
            else if (severity === "warning") toast.warning(message);
        }, token);
    };

    // Open the edit dialog with current lobby data
    const handleEditClick = () => {
        setEditForm({
            name: lobby.name,
            max_players: lobby.max_players,
            password: "",
            start_time: lobby.start_time ? new Date(lobby.start_time).toISOString().slice(0, 16) : "",
            end_time: lobby.end_time ? new Date(lobby.end_time).toISOString().slice(0, 16) : "",
            is_event: lobby.is_event,
        });
        setEditDialogOpen(true);
        setAnchorEl(null);
    };

    // Save changes to the lobby after editing
    const handleEditLobby = async () => {
        const token = localStorage.getItem("token");
        const updatedData = {
            name: editForm.name,
            max_players: parseInt(editForm.max_players, 10),
            password: editForm.password || null,
            start_time: editForm.start_time || null,
            end_time: editForm.end_time || null,
            gameId: lobby.game_id,
        };
        const res = await apiRequest("put", `http://localhost:8081/lobbies/${id}`, updatedData, token);
        if (res.success) {
            fetchLobbyDetails(id, user, setLobby, setCreatorName, setIsJoined, setError, (message, severity) => {
                if (severity === "success") toast.success(message);
                else if (severity === "error") toast.error(message);
                else if (severity === "info") toast.info(message);
                else if (severity === "warning") toast.warning(message);
            }, navigate);
            toast.success(t("lobbyUpdated"));
            setEditDialogOpen(false);
        } else {
            toast.error(t("lobbyUpdateFailed", { message: res.message }));
        }
    };

    // Open the menu for lobby actions
    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    // Close the menu for lobby actions
    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // Show a loading message while fetching lobby data
    if (loading) return <Typography>{t("loading")}</Typography>;
    // Display an error message if something goes wrong
    if (error) return <Typography color="error">{error}</Typography>;
    // Show a message if the lobby or user data is not found
    if (!lobby || !user) return <Typography>{t("lobbyOrUserNotFound")}</Typography>;

    // Render the lobby details, including header, players, and chat
    return (
        <div className="lobby-details-container">
            <Box className="lobby-content">
                <Box className="lobby-left-section">
                    <Box className="lobby-header">
                        <Typography variant="h4" sx={{ fontWeight: "bold" }}>{t('lobbyName', { name: lobby.name })}</Typography>
                        <Typography variant="subtitle1" color="text.secondary">{t('game', { game_id: lobby.game_id })}</Typography>
                        <Typography variant="subtitle2" color="text.secondary">{t('players', { current_players: lobby.current_players, max_players: lobby.max_players })}</Typography>
                        <Typography variant="subtitle2" color="text.secondary">{t('createdBy', { creatorName })}</Typography>
                        {lobby.password && <Lock fontSize="small" sx={{ verticalAlign: "middle", ml: 1 }} />}
                        <Box className="lobby-actions">
                            {!isJoined ? (
                                // Show join button if the user hasn’t joined yet
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleJoinLobby}
                                    disabled={lobby.current_players >= lobby.max_players}
                                >
                                    {t('joinLobby')}
                                </Button>
                            ) : (
                                <>
                                    <IconButton
                                        aria-label="more"
                                        aria-controls="lobby-menu"
                                        aria-haspopup="true"
                                        onClick={handleMenuOpen}
                                        color="inherit"
                                    >
                                        <MoreVert />
                                    </IconButton>
                                    <Menu
                                        id="lobby-menu"
                                        anchorEl={anchorEl}
                                        open={Boolean(anchorEl)}
                                        onClose={handleMenuClose}
                                    >
                                        {[
                                            <MenuItem key="leave" onClick={() => { handleMenuClose(); setLeaveConfirmOpen(true); }}>
                                                <img src={LogOut} alt="LogOut" className="lobby-detail-img" /> {t('leaveLobby')}
                                            </MenuItem>,
                                            <MenuItem key="play" onClick={handlePlayGame}>
                                                <img src={JoyStick} alt="Play" className="lobby-detail-img" /> {t('play')}
                                            </MenuItem>,
                                            <MenuItem key="invite" onClick={handleOpenInviteDialog}>
                                                <img src={Invitation} alt="Invitation" className="lobby-detail-img" /> {t('inviteFriends')}
                                            </MenuItem>,
                                            ...(lobby.created_by === user.id ? [
                                                <MenuItem key="edit" onClick={handleEditClick}>
                                                    <img src={Pencil} alt="Pencil" className="lobby-detail-img" /> {t('editLobby')}
                                                </MenuItem>,
                                                <MenuItem key="delete" onClick={() => { handleMenuClose(); setDeleteConfirmOpen(true); }}>
                                                    <img src={Trash} alt="Trash" className="lobby-detail-img" /> {t('deleteLobby')}
                                                </MenuItem>,
                                            ] : []),
                                            <MenuItem key="copy" onClick={handleCopyLink}>
                                                <img src={Copy} alt="Copy" className="lobby-detail-img" /> {t('copyLink')}
                                            </MenuItem>,
                                        ]}
                                    </Menu>
                                </>
                            )}
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
                <DialogTitle>{t('passwordPrompt')}</DialogTitle>
                <DialogContent>
                    <TextField
                        label={t('passwordLabel')}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasswordDialogOpen(false)} color="secondary">{t('cancel')}</Button>
                    <Button onClick={handlePasswordSubmit} variant="contained">{t('submit')}</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={leaveConfirmOpen} onClose={() => setLeaveConfirmOpen(false)}>
                <DialogTitle>{t('leaveConfirm')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('leaveConfirm')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLeaveConfirmOpen(false)} color="primary">{t('no')}</Button>
                    <Button onClick={() => leaveLobby(id, user.id, setIsJoined, setLobby, (message, severity) => {
                        if (severity === "success") toast.success(message);
                        else if (severity === "error") toast.error(message);
                        else if (severity === "info") toast.info(message);
                        else if (severity === "warning") toast.warning(message);
                    }, localStorage.getItem("token"), setLeaveConfirmOpen)} color="secondary" variant="contained">
                        {t('yes')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>{t('deleteConfirm')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('deleteConfirm')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">{t('no')}</Button>
                    <Button onClick={() => deleteLobby(id, (message, severity) => {
                        if (severity === "success") toast.success(message);
                        else if (severity === "error") toast.error(message);
                        else if (severity === "info") toast.info(message);
                        else if (severity === "warning") toast.warning(message);
                    }, navigate, localStorage.getItem("token"))} color="error" variant="contained">
                        {t('yes')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
                <DialogTitle>{t('editLobbyTitle')}</DialogTitle>
                <DialogContent>
                    <TextField
                        label={t('lobbyNameLabel')}
                        name="name"
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        required
                    />
                    <TextField
                        label={t('maxPlayersLabel')}
                        name="max_players"
                        type="number"
                        value={editForm.max_players || ""}
                        onChange={(e) => setEditForm({ ...editForm, max_players: e.target.value })}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        inputProps={{ min: lobby.current_players || 1 }}
                        required
                    />
                    <TextField
                        label={t('passwordLabel')}
                        name="password"
                        type="password"
                        value={editForm.password || ""}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                    />
                    {editForm.is_event && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <TextField
                                label={t('startTimeLabel')}
                                name="start_time"
                                type="datetime-local"
                                value={editForm.start_time || ""}
                                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                                fullWidth
                                margin="normal"
                                variant="outlined"
                            />
                            <TextField
                                label={t('endTimeLabel')}
                                name="end_time"
                                type="datetime-local"
                                value={editForm.end_time || ""}
                                onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                                fullWidth
                                margin="normal"
                                variant="outlined"
                                inputProps={{ min: editForm.start_time || undefined }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)} color="secondary">{t('cancel')}</Button>
                    <Button onClick={handleEditLobby} variant="contained" color="primary">{t('save')}</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default LobbyDetails;