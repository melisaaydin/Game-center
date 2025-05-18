import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Button, Snackbar, Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, IconButton, Menu, MenuItem } from "@mui/material";
import { Lock, MoreVert } from "@mui/icons-material";
import { useUser } from "../../context/UserContext";
import { ColorModeContext } from "../../context/ThemeContext";
import ChatSection from "../../components/LobbyDetails/ChatSection";
import PlayersSection from "../../components/LobbyDetails/PlayersSection";
import InviteDialog from "../../components/LobbyDetails/InviteDialog";
// Import utility functions for lobby operations and socket communication
import { socket, fetchLobbyDetails, leaveLobby, deleteLobby, inviteFriend, apiRequest } from "../../utils/lobbyUtils";
import "./LobbyDetail.css";
import Copy from "../../assets/copy.png"
import Invitation from "../../assets/invitation.png"
import JoyStick from "../../assets/joystick.png"
import LogOut from "../../assets/log-out.png"
import Pencil from "../../assets/pencil.png"
import Trash from "../../assets/trash-bin.png"
// LobbyDetails component displays detailed information about a specific lobby
const LobbyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate(); // Hook to navigate between routes
    const { user } = useUser(); // Get user data from context
    const { mode } = useContext(ColorModeContext); // Get current theme mode
    const [lobby, setLobby] = useState(null); // State to hold lobby data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isJoined, setIsJoined] = useState(false); // Track if user is joined
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [chatMessages, setChatMessages] = useState([]); // Store chat messages
    const [newMessage, setNewMessage] = useState(""); // New message input
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" }); // Snackbar state for notifications
    const [creatorName, setCreatorName] = useState("");
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [invitedUsers, setInvitedUsers] = useState(new Set()); // Track invited users
    const [typingUser, setTypingUser] = useState(null); // Track who is typing
    const [editDialogOpen, setEditDialogOpen] = useState(false); // Control edit dialog visibility
    const [editForm, setEditForm] = useState({}); // Form data for editing lobby
    const chatRef = useRef(null);
    const lastMessageRef = useRef(null); // Reference to last message for deduplication
    const [anchorEl, setAnchorEl] = useState(null); // Anchor for the menu

    // Fetch lobby details when the component mounts
    useEffect(() => {
        const loadLobby = async () => {
            setLoading(true);
            // Fetch lobby data and messages from the backend
            const messages = await fetchLobbyDetails(id, user, setLobby, setCreatorName, setIsJoined, setError, setSnackbar, navigate);
            setChatMessages(messages); // Update chat messages
            setLoading(false); // Stop loading
        };
        loadLobby();
    }, [id, user, navigate]);

    // Set up socket connections and handle real-time events
    useEffect(() => {
        if (!user) return; // Exit if no user is logged in
        // Handle socket connection
        const handleSocketConnect = () => {
            socket.emit("set_username", user.name); // Set the user's name for socket
            // Join the lobby if the user is already in it
            if (isJoined && socket.connected && (!socket.rooms || !new Set(socket.rooms).has(id))) {
                socket.emit("join_lobby", { lobbyId: id, userId: user.id, silent: true });
            }
        };
        socket.on("connect", handleSocketConnect); // Listen for socket connection
        socket.on("receive_message", (message) => {
            const lastMessage = lastMessageRef.current;
            const newMessageString = `${message.user}:${message.content}:${message.timestamp}`; // Unique identifier for deduplication
            // Add the message to the chat if it's new
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
        socket.on("typing", ({ userName }) => setTypingUser(userName)); // Update typing user
        socket.on("stop_typing", () => setTypingUser(null)); // Clear typing user

        if (socket.connected) handleSocketConnect(); // Initial connection handling

        return () => {
            socket.off("connect", handleSocketConnect); // Clean up listeners on unmount
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

    // Handle joining the lobby
    const handleJoinLobby = async () => {
        if (!user) {
            setSnackbar({ open: true, message: "Please log in!", severity: "error" });
            return;
        }
        if (lobby.password && !isJoined) {
            setPasswordDialogOpen(true); // Open password dialog for locked lobbies
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

    // Handle submitting the password for a locked lobby
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
            setPasswordDialogOpen(false); // Close the dialog
        } else {
            setSnackbar({ open: true, message: res.message || "Incorrect password or an error occurred!", severity: "error" });
        }
    };

    // Handle playing the game associated with the lobby
    const handlePlayGame = () => {
        if (!user) {
            setSnackbar({ open: true, message: 'Please log in!', severity: 'error' });
            navigate('/login');
            return;
        }
        if (lobby && lobby.game_id) {
            const token = localStorage.getItem('token');
            const gameUrl = `http://localhost:3001/games/${lobby.game_id}/lobby/${id}?token=${token}`;
            window.open(gameUrl, '_blank'); // Open game in a new tab
            setSnackbar({ open: true, message: `${lobby.game_id} game is starting for lobby ${id}...`, severity: 'info' });
            socket.emit('join_game', { gameName: lobby.game_id, id, userId: user.id });
        } else {
            setSnackbar({ open: true, message: 'Game not available yet!', severity: 'warning' });
        }
    };

    // Copy the lobby link to the clipboard
    const handleCopyLink = () => {
        const link = `${window.location.origin}/lobbies/${id}`; // Construct the lobby URL
        navigator.clipboard.writeText(link); // Copy to clipboard
        setSnackbar({ open: true, message: "Lobby link copied to clipboard!", severity: "success" });
    };

    // Handle sending a chat message
    const handleSendMessage = () => {
        if (newMessage.trim()) {
            socket.emit("send_message", { lobbyId: id, userId: user.id, content: newMessage, avatar_url: user.avatar_url });
            socket.emit("stop_typing", { lobbyId: id }); // Notify others typing has stopped
            setNewMessage(""); // Clear input
        }
    };

    // Handle typing events in the chat
    const handleTyping = () => {
        if (newMessage.trim()) socket.emit("typing", { lobbyId: id, userName: user.name }); // Notify others of typing
        else socket.emit("stop_typing", { lobbyId: id }); // Notify stop if input is empty
    };

    // Open the invite friends dialog and load the friends list
    const handleOpenInviteDialog = async () => {
        setInviteDialogOpen(true); // Open the invite dialog
        setFriendsLoading(true); // Start loading friends
        const token = localStorage.getItem("token");
        const res = await apiRequest("get", `http://localhost:8081/lobbies/${id}/friends`, null, token);
        if (res.success) {
            setFriends(res.data.friends || []); // Update friends list
            setInvitedUsers(new Set()); // Reset invited users
        } else {
            setSnackbar({ open: true, message: "Failed to load friends: " + res.message, severity: "error" });
        }
        setFriendsLoading(false); // Stop loading
    };

    // Invite a friend to the lobby
    const handleInviteFriend = (friendId) => {
        const token = localStorage.getItem("token");
        inviteFriend(id, friendId, user.id, lobby.name, setInvitedUsers, setSnackbar, token); // Send invite request
    };

    // Show the full date if the event is more than 24 hours away
    const handleEditClick = () => {
        // Initialize editForm with current lobby data
        setEditForm({
            name: lobby.name,
            max_players: lobby.max_players,
            password: "",
            start_time: lobby.start_time ? new Date(lobby.start_time).toISOString().slice(0, 16) : "",
            end_time: lobby.end_time ? new Date(lobby.end_time).toISOString().slice(0, 16) : "",
            is_event: lobby.is_event,
        });
        setEditDialogOpen(true); // Open edit dialog
        setAnchorEl(null); // Close the menu
    };

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
            fetchLobbyDetails(id, user, setLobby, setCreatorName, setIsJoined, setError, setSnackbar, navigate); // Refresh lobby data
            setSnackbar({ open: true, message: "Lobby updated successfully!", severity: "success" });
            setEditDialogOpen(false); // Close dialog
        } else {
            setSnackbar({ open: true, message: "Failed to update lobby: " + res.message, severity: "error" });
        }
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget); // Open the menu
    };
    const handleMenuClose = () => {
        setAnchorEl(null); // Close the menu
    };

    if (loading) return <Typography>Loading...</Typography>; // Show loading state
    if (error) return <Typography color="error">{error}</Typography>; // Show error if any
    if (!lobby || !user) return <Typography>Lobby or user data not found.</Typography>; // Fallback if data is missing

    return (
        <div className="lobby-details-container">
            <Box className="lobby-content">
                {/* Left section with lobby details and players */}
                <Box className="lobby-left-section">
                    <Box className="lobby-header">
                        <Typography variant="h4" sx={{ fontWeight: "bold" }}>{lobby.name}</Typography>
                        <Typography variant="subtitle1" color="text.secondary">Game: {lobby.game_id}</Typography>
                        <Typography variant="subtitle2" color="text.secondary">Players: {lobby.current_players}/{lobby.max_players}</Typography>
                        <Typography variant="subtitle2" color="text.secondary">Created by: {creatorName}</Typography>
                        {/* Show a lock icon if the lobby has a password */}
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
                                                <img src={LogOut} alt="LogOut" className="lobby-detail-img" /> Leave Lobby
                                            </MenuItem>,
                                            <MenuItem key="play" onClick={handlePlayGame}>
                                                <img src={JoyStick} alt="Play" className="lobby-detail-img" /> Play
                                            </MenuItem>,
                                            <MenuItem key="invite" onClick={handleOpenInviteDialog}>
                                                <img src={Invitation} alt="Invitation" className="lobby-detail-img" /> Invite Friends
                                            </MenuItem>,
                                            ...(lobby.created_by === user.id ? [
                                                <MenuItem key="edit" onClick={handleEditClick}>
                                                    <img src={Pencil} alt="Pencil" className="lobby-detail-img" /> Edit Lobby
                                                </MenuItem>,
                                                <MenuItem key="delete" onClick={() => { handleMenuClose(); setDeleteConfirmOpen(true); }}>
                                                    <img src={Trash} alt="Trash" className="lobby-detail-img" /> Delete Lobby
                                                </MenuItem>,
                                            ] : []),
                                            <MenuItem key="copy" onClick={handleCopyLink}>
                                                <img src={Copy} alt="Copy" className="lobby-detail-img" /> Copy Lobby Link
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
            {/* Dialog for editing lobby details */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
                <DialogTitle>Edit Lobby Details</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Lobby Name"
                        name="name"
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        required
                    />
                    <TextField
                        label="Max Players"
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
                        label="Password (leave blank to remove)"
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
                                label="Start Time"
                                name="start_time"
                                type="datetime-local"
                                value={editForm.start_time || ""}
                                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                                fullWidth
                                margin="normal"
                                variant="outlined"
                            />
                            <TextField
                                label="End Time"
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
                    <Button onClick={() => setEditDialogOpen(false)} color="secondary">Cancel</Button>
                    <Button onClick={handleEditLobby} variant="contained" color="primary">Save</Button>
                </DialogActions>
            </Dialog>
            {/* Snackbar for notifications */}
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
        </div>
    );
};

export default LobbyDetails;