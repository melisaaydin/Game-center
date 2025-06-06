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
import "moment/locale/en-gb";
import "./Friends.css";
import { useTranslation } from 'react-i18next';

function Friends() {
    const { t } = useTranslation('friends');
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [friendToDelete, setFriendToDelete] = useState(null);
    const navigate = useNavigate();

    moment.locale("en-gb");

    useEffect(() => {
        const fetchFriendData = async () => {
            const token = localStorage.getItem("token");
            console.log("Frontend - Token:", token);
            try {
                const reqRes = await axios.get("http://localhost:8081/users/friend-requests", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                setFriendRequests(reqRes.data.requests || []);
                console.log("Friend Requests:", JSON.stringify(reqRes.data.requests, null, 2));

                const friendsRes = await axios.get("http://localhost:8081/users/friends", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                setFriends(friendsRes.data.friends || []);
                console.log("Friends:", JSON.stringify(friendsRes.data.friends, null, 2));
            } catch (err) {
                setSnackbarMessage(t('friendDataLoadFailed'));
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
            setSnackbarMessage(t('friendRequestAccepted'));
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage(t('friendRequestAcceptFailed'));
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
            setSnackbarMessage(t('friendRequestRejected'));
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage(t('friendRequestRejectFailed'));
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
            setSnackbarMessage(t('friendRemoved'));
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error removing friend:", err);
            setSnackbarMessage(t('friendRemoveFailed'));
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
        const diffMinutes = now.diff(last, "minutes");
        if (diffMinutes < 5) {
            return true;
        }
        if (now.diff(last, "hours") >= 24) {
            return null;
        }
        return t('lastActive', { time: last.fromNow() });
    };

    return (
        <div className="main-content-friends">
            <Box className="friends-section">
                <Box className="section-title-container">
                    <Typography variant="h5" className="section-title">
                        {t('friendsTitle')}
                        <span className="animated-emoji">🎀</span>
                    </Typography>
                </Box>
                <Box className="friends-content-container">
                    <Box className="requests-section">
                        <Typography variant="h6" className="subsection-title">{t('friendRequests')}</Typography>
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
                                            <Box className="avatar-container">
                                                <Avatar
                                                    src={
                                                        request?.avatar_url
                                                            ? `http://localhost:8081/uploads/${request.avatar_url}`
                                                            : "/default-avatar.png"
                                                    }
                                                    className="avatar"
                                                    sx={{ width: 56, height: 56 }}
                                                />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle1" className="friend-name">
                                                    {request?.name || "Unknown User"}
                                                </Typography>
                                            </Box>
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
                            <Typography className="no-data">{t('noFriendRequests')}</Typography>
                        )}
                    </Box>
                    <Box className="friends-list-section">
                        <Typography variant="h6" className="subsection-title">{t('myFriends')}</Typography>
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
                                            <Box className="avatar-container">
                                                <Avatar
                                                    src={
                                                        friend?.avatar_url
                                                            ? `http://localhost:8081/uploads/${friend.avatar_url}`
                                                            : "/default-avatar.png"
                                                    }
                                                    className="avatar"
                                                    sx={{ width: 56, height: 56 }}
                                                />
                                                {getActivityStatus(friend?.last_active) === true && (
                                                    <span className="online-indicator" />
                                                )}
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle1" className="friend-name">
                                                    {friend?.name || "Unknown User"}
                                                </Typography>
                                                <Typography variant="caption" className="activity-status">
                                                    {typeof getActivityStatus(friend?.last_active) === "string" &&
                                                        getActivityStatus(friend?.last_active)}
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
                            <Typography className="no-data">{t('noFriends')}</Typography>
                        )}
                    </Box>
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
                    <DialogTitle sx={{ fontWeight: 600 }}>{t('removeFriend')}</DialogTitle>
                    <DialogContent>
                        <Typography>
                            {friendToDelete && t('removeFriendConfirm', { name: friendToDelete.name || "Unknown User" })}
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog} sx={{ borderRadius: "8px" }}>{t('cancel')}</Button>
                        <Button
                            onClick={handleDeleteFriend}
                            color="error"
                            sx={{ borderRadius: "8px" }}
                        >
                            {t('removeFriendButton')}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </div>
    );
}

export default Friends;