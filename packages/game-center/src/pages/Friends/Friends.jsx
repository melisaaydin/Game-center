import React, { useState, useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    IconButton,
    Snackbar,
    Alert,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import { Check, Close, Delete } from "@mui/icons-material";
import axios from "axios";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "./Friends.css";

function Friends() {
    const { user } = useUser();
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [friendToDelete, setFriendToDelete] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFriendData = async () => {
            try {
                const reqRes = await axios.get("http://localhost:8081/users/friend-requests", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                setFriendRequests(reqRes.data.requests || []);

                const friendsRes = await axios.get("http://localhost:8081/users/friends", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                setFriends(friendsRes.data.friends || []);
            } catch (err) {
                setSnackbarMessage("Failed to load friend data.");
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
            }
        };

        fetchFriendData();
    }, []);

    const handleAcceptRequest = async (requestId) => {
        try {
            const res = await axios.post(
                `http://localhost:8081/users/friend-requests/${requestId}/accept`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
            if (res.data.friend) {
                setFriends((prev) => [...prev, res.data.friend]);
            }
            setSnackbarMessage("Friend request accepted!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Failed to accept friend request.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            await axios.post(
                `http://localhost:8081/users/friend-requests/${requestId}/reject`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
            setSnackbarMessage("Friend request rejected.");
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Failed to reject friend request.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    const handleDeleteFriend = async () => {
        try {
            await axios.delete(`http://localhost:8081/users/friends/${friendToDelete.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setFriends((prev) => prev.filter((friend) => friend.id !== friendToDelete.id));
            setSnackbarMessage("Friend removed successfully.");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error removing friend:", err);
            setSnackbarMessage("Failed to remove friend.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        } finally {
            setDeleteDialogOpen(false);
            setFriendToDelete(null);
        }
    };

    const handleOpenDeleteDialog = (friend) => {
        setFriendToDelete(friend);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setFriendToDelete(null);
    };

    const handleProfileClick = (userId) => {
        navigate(`/users/user/${userId}`);
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbarOpen(false);
    };

    const getActivityStatus = (lastActive) => {
        if (!lastActive) return null;
        const now = moment();
        const last = moment(lastActive);
        const diffHours = now.diff(last, "hours");
        if (diffHours < 24) {
            if (diffHours < 1) {
                return (
                    <>
                        Online <span className="online-indicator" />
                    </>
                );
            }
            return `Last seen ${last.fromNow()}`;
        }
        return null;
    };

    return (
        <div className="main-content-friends">
            <Box className="friends-section">
                <Typography variant="h5" className="section-title">
                    Friends
                </Typography>
                <Box className="requests-section">
                    <Typography variant="h6" className="subsection-title">
                        Friend Requests
                    </Typography>
                    {friendRequests.length > 0 ? (
                        friendRequests.map((request) => (
                            <Card
                                key={request?.id || Math.random()}
                                className="friend-card"
                                onClick={() => request?.sender_id && handleProfileClick(request.sender_id)}
                                sx={{ borderRadius: "14px" }}
                            >
                                <CardContent className="friend-card-content">
                                    <Box className="friend-info">
                                        <Avatar
                                            src={
                                                request?.avatar_url
                                                    ? `http://localhost:8081/uploads/${request.avatar_url}`
                                                    : "/default-avatar.png"
                                            }
                                            className="avatar"
                                            sx={{ width: 56, height: 56 }}
                                        />
                                        <Typography variant="subtitle1" className="friend-name">
                                            {request?.name || "Unknown User"}
                                        </Typography>
                                    </Box>
                                    <Box className="friend-actions">
                                        <IconButton
                                            className="action-button accept"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                request?.id && handleAcceptRequest(request.id);
                                            }}
                                            disabled={!request?.id}
                                        >
                                            <Check />
                                        </IconButton>
                                        <IconButton
                                            className="action-button reject"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                request?.id && handleRejectRequest(request.id);
                                            }}
                                            disabled={!request?.id}
                                        >
                                            <Close />
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Typography className="no-data">No friend requests.</Typography>
                    )}
                </Box>
                <Box className="friends-section">
                    <Typography variant="h6" className="subsection-title">
                        My Friends
                    </Typography>
                    {friends.length > 0 ? (
                        friends.map((friend) => (
                            <Card
                                key={friend?.id || Math.random()}
                                className="friend-card"
                                onClick={() => friend?.id && handleProfileClick(friend.id)}
                                sx={{ borderRadius: "14px" }}
                            >
                                <CardContent className="friend-card-content">
                                    <Box className="friend-info">
                                        <Avatar
                                            src={
                                                friend?.avatar_url
                                                    ? `http://localhost:8081/uploads/${friend.avatar_url}`
                                                    : "/default-avatar.png"
                                            }
                                            className="avatar"
                                            sx={{ width: 56, height: 56 }}
                                        />
                                        <Box>
                                            <Typography variant="subtitle1" className="friend-name">
                                                {friend?.name || "Unknown User"}
                                            </Typography>
                                            <Typography variant="caption" className="activity-status">
                                                {getActivityStatus(friend?.last_active)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box className="friend-actions">
                                        <IconButton
                                            className="action-button delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                friend && handleOpenDeleteDialog(friend);
                                            }}
                                            disabled={!friend?.id}
                                        >
                                            <Delete />
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Typography className="no-data">No friends yet.</Typography>
                    )}
                </Box>
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={3000}
                    onClose={handleSnackbarClose}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                    className="animated-snackbar"
                >
                    <Alert
                        onClose={handleSnackbarClose}
                        severity={snackbarSeverity}
                        sx={{ borderRadius: "8px", boxShadow: "0 2px 8px var(--shadow-color)" }}
                    >
                        {snackbarMessage}
                    </Alert>
                </Snackbar>
                <Dialog
                    open={deleteDialogOpen}
                    onClose={handleCloseDeleteDialog}
                    className="animated-dialog"
                    PaperProps={{ sx: { borderRadius: "12px", padding: "16px" } }}
                >
                    <DialogTitle sx={{ fontWeight: 600 }}>Remove Friend</DialogTitle>
                    <DialogContent>
                        <Typography>
                            {friendToDelete && `Are you sure you want to remove ${friendToDelete.name || "Unknown User"} from your friends?`}
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog} sx={{ borderRadius: "8px" }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteFriend}
                            color="error"
                            sx={{ borderRadius: "8px" }}
                        >
                            Remove Friend
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </div>
    );
}

export default Friends;