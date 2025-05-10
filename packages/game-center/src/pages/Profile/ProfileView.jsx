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
import { useUser } from '../../context/UserContext';
import './ProfileView.css';

function ProfileView() {
    const { userId } = useParams();
    const { user } = useUser();
    const [profile, setProfile] = useState(null);
    const [recentGames, setRecentGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [friendRequestStatus, setFriendRequestStatus] = useState('Add Friend');
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
                        setFriendRequestStatus('Sent Request');
                    } else if (statusRes.data.status === 'friends') {
                        setFriendRequestStatus('Friends');
                    } else {
                        setFriendRequestStatus('Add Friend');
                    }
                }

                const gamesRes = await axios.get(`http://localhost:8081/users/user/${userId}/games`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                setRecentGames(gamesRes.data.games || []);

                setLoading(false);
            } catch (err) {
                setError('Failed to load profile.');
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId, user]);

    const handleFriendRequest = async () => {
        if (!user) {
            setSnackbarMessage('Please log in to manage friend requests.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            navigate('/login');
            return;
        }

        try {
            if (friendRequestStatus === 'Add Friend') {
                await axios.post(
                    'http://localhost:8081/users/friend-requests',
                    { friendId: userId },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                setFriendRequestStatus('Sent Request');
                setSnackbarMessage('Friend request sent!');
                setSnackbarSeverity('success');
            } else if (friendRequestStatus === 'Sent Request') {
                await axios.post(
                    `http://localhost:8081/users/friend-requests/${userId}/cancel`,
                    {},
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                setFriendRequestStatus('Add Friend');
                setSnackbarMessage('Friend request canceled!');
                setSnackbarSeverity('info');
            } else if (friendRequestStatus === 'Friends') {
                await axios.delete(`http://localhost:8081/users/friends/${userId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                setFriendRequestStatus('Add Friend');
                setSnackbarMessage('Friend removed!');
                setSnackbarSeverity('info');
            }
            setSnackbarOpen(true);
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to manage friend request.';
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
    if (!profile) return <Typography className="profile-not-found">Profile not found.</Typography>;

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
                                Edit Profile
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
                                    {friendRequestStatus === 'Sent Request'
                                        ? 'Cancel Request'
                                        : friendRequestStatus === 'Friends'
                                            ? 'Remove Friend'
                                            : friendRequestStatus}
                                </Button>
                            </motion.div>
                        )}
                    </Box>
                    <Box className="card-content-profile-view">
                        <Box className="low-cards">
                            <Card className="about-card">
                                <CardContent className="about-card-content">
                                    <Typography className="card-title">About</Typography>
                                    <Typography className="card-text">
                                        {profile.bio || 'No additional information provided.'}
                                    </Typography>
                                </CardContent>
                            </Card>
                            <Card className="games-card">
                                <CardContent className="games-card-content">
                                    <Typography className="card-title">Recent Games</Typography>
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
                                        <Typography className="card-text">No recent games.</Typography>
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