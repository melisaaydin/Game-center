import React, { useState, useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    IconButton,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import { Check, Close, Delete } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/en-gb";
import "./Friends.css";
import { useTranslation } from 'react-i18next';
import { toast } from "react-toastify";

// Defining the Friends component to manage friend requests and friends list
function Friends() {
    // Initializing translation hook for multilingual support
    const { t } = useTranslation('friends');
    // Managing state for friend requests and friends list
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    // Controlling the delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [friendToDelete, setFriendToDelete] = useState(null);
    // Setting up navigation for profile redirects
    const navigate = useNavigate();

    // Configuring moment.js to use British English locale
    moment.locale("en-gb");

    // Fetching friend requests and friends list on component mount
    useEffect(() => {
        const fetchFriendData = async () => {
            const token = localStorage.getItem("token");
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
                toast.error(t('friendDataLoadFailed'));
            }
        };

        fetchFriendData();
    }, []);

    // Handling the acceptance of a friend request
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
            toast.success(t('friendRequestAccepted'));
        } catch (err) {
            toast.error(t('friendRequestAcceptFailed'));
        }
    };

    // Handling the rejection of a friend request
    const handleRejectRequest = async (requestId) => {
        try {
            await axios.post(
                `http://localhost:8081/users/friend-requests/${requestId}/reject`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
            toast.info(t('friendRequestRejected'));
        } catch (err) {
            toast.error(t('friendRequestRejectFailed'));
        }
    };

    // Removing a friend after confirmation
    const handleDeleteFriend = async () => {
        try {
            await axios.delete(`http://localhost:8081/users/friends/${friendToDelete.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setFriends((prev) => prev.filter((friend) => friend.id !== friendToDelete.id));
            toast.success(t('friendRemoved'));
        } catch (err) {
            console.error("Error removing friend:", err);
            toast.error(t('friendRemoveFailed'));
        } finally {
            setDeleteDialogOpen(false);
            setFriendToDelete(null);
        }
    };

    // Opening the delete confirmation dialog for a friend
    const handleOpenDeleteDialog = (friend) => {
        setFriendToDelete(friend);
        setDeleteDialogOpen(true);
    };

    // Closing the delete confirmation dialog
    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setFriendToDelete(null);
    };

    // Navigating to a user's profile on click
    const handleProfileClick = (userId) => {
        navigate(`/users/user/${userId}`);
    };

    // Determining a friend's activity status based on last active time
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

    // Rendering the friends and friend requests sections
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