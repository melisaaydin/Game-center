import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Avatar,
    Button,
    Card,
    CardContent,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Snackbar,
    Alert,
} from '@mui/material';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../context/UserContext';
import './ProfileView.css';

function ProfileView() {
    const { t } = useTranslation('profile');
    const { userId } = useParams();
    const { user } = useUser();
    const [profile, setProfile] = useState(null);
    const [recentGames, setRecentGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [friendRequestStatus, setFriendRequestStatus] = useState(t('addFriend'));
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profileRes = await axios.get(`http://localhost:8081/users/user/${userId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                setProfile(profileRes.data);

                if (user && user.id !== userId) {
                    const statusRes = await axios.get(`http://localhost:8081/users/friend-requests/status/${userId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    });
                    if (statusRes.data.status === 'pending') {
                        setFriendRequestStatus(t('cancelRequest'));
                    } else if (statusRes.data.status === 'friends') {
                        setFriendRequestStatus(t('removeFriend'));
                    } else {
                        setFriendRequestStatus(t('addFriend'));
                    }
                }

                const gamesRes = await axios.get(`http://localhost:8081/users/user/${userId}/games`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                setRecentGames(gamesRes.data.games || []);

                setLoading(false);
            } catch (err) {
                setError(t('failedToLoadProfile'));
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId, user, t]);

    const handleFriendRequest = async () => {
        if (!user) {
            setSnackbarMessage(t('loginToManageFriends'));
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            navigate('/login');
            return;
        }

        try {
            if (friendRequestStatus === t('addFriend')) {
                await axios.post(
                    'http://localhost:8081/users/friend-requests',
                    { friendId: userId },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                setFriendRequestStatus(t('cancelRequest'));
                setSnackbarMessage(t('friendRequestSent'));
                setSnackbarSeverity('success');
            } else if (friendRequestStatus === t('cancelRequest')) {
                await axios.post(
                    `http://localhost:8081/users/friend-requests/${userId}/cancel`,
                    {},
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                setFriendRequestStatus(t('addFriend'));
                setSnackbarMessage(t('friendRequestCanceled'));
                setSnackbarSeverity('info');
            } else if (friendRequestStatus === t('removeFriend')) {
                await axios.delete(`http://localhost:8081/users/friends/${userId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                setFriendRequestStatus(t('addFriend'));
                setSnackbarMessage(t('friendRemoved'));
                setSnackbarSeverity('info');
            }
            setSnackbarOpen(true);
        } catch (err) {
            const message = err.response?.data?.message || t('failedToLoadProfile');
            setSnackbarMessage(message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleEditProfile = () => {
        navigate(`/profile/edit`);
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    if (loading) return <CircularProgress className="profile-loading" />;
    if (error) return <Typography className="profile-error">{error}</Typography>;
    if (!profile) return <Typography className="profile-not-found">{t('profileNotFound')}</Typography>;

    return (
        <div className="main-content-profile-view">
            <Box className="profile-view-container">
                <Box className="profile-card">
                    <Box className="profile-header">
                        <Box className="profile-info">
                            <Avatar
                                className="profile-view-avatar"
                                src={
                                    profile.avatar_url
                                        ? `http://localhost:8081/uploads/${profile.avatar_url}`
                                        : '/default-avatar.png'
                                }
                            />
                            <Box>
                                <Typography className="profile-name">{profile.name}</Typography>
                            </Box>
                        </Box>
                        {user && user.id === profile.id ? (
                            <Button className="edit-profile-button" variant="contained" onClick={handleEditProfile}>
                                {t('editProfile')}
                            </Button>
                        ) : (
                            <motion.div
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Button
                                    className="friend-request-button"
                                    variant="contained"
                                    onClick={handleFriendRequest}
                                >
                                    {friendRequestStatus}
                                </Button>
                            </motion.div>
                        )}
                    </Box>
                    <Box className="card-content-profile-view">
                        <Box className="low-cards">
                            <Card className="about-card">
                                <CardContent className="about-card-content">
                                    <Typography className="card-title">{t('about')}</Typography>
                                    <Typography className="card-text">
                                        {profile.bio || t('noBio')}
                                    </Typography>
                                </CardContent>
                            </Card>
                            <Card className="games-card">
                                <CardContent className="games-card-content">
                                    <Typography className="card-title">{t('recentGames')}</Typography>
                                    {recentGames.length > 0 ? (
                                        <List>
                                            {recentGames.slice(0, 3).map((game, index) => (
                                                <ListItem key={index} className="game-list-item">
                                                    <ListItemText
                                                        primary={game.title}
                                                        secondary={`Played on ${new Date(game.played_at).toLocaleDateString()}`}
                                                        primaryTypographyProps={{ className: 'game-title' }}
                                                        secondaryTypographyProps={{ className: 'game-date' }}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    ) : (
                                        <Typography className="card-text">{t('noRecentGames')}</Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Box>
                    </Box>
                </Box>
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={6000}
                    onClose={handleSnackbarClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        onClose={handleSnackbarClose}
                        severity={snackbarSeverity}
                        className="snackbar-alert"
                    >
                        {snackbarMessage}
                    </Alert>
                </Snackbar>
            </Box>
        </div>
    );
}

export default ProfileView;