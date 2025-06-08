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
} from '@mui/material';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-toastify';
import './ProfileView.css';

// Main component for displaying a user's profile and recent games
function ProfileView() {
    // Get translation function for the 'profile' namespace and user ID from URL params
    const { t } = useTranslation('profile');
    // Extract the userId from the route parameters
    const { userId } = useParams();
    // Get current user data from the UserContext
    const { user } = useUser();
    // State to store the profile data of the user being viewed
    const [profile, setProfile] = useState(null);
    // State to store the user's recent games
    const [recentGames, setRecentGames] = useState([]);
    // State to track loading status while fetching data
    const [loading, setLoading] = useState(true);
    // State to store any error messages during data fetching
    const [error, setError] = useState(null);
    // State to manage the text and action of the friend request button
    const [friendRequestStatus, setFriendRequestStatus] = useState(t('addFriend'));
    // Hook to navigate programmatically to other routes
    const navigate = useNavigate();

    // Fetch profile data, friend request status, and recent games on component mount or when userId/user changes
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Request the profile data for the specified userId
                const profileRes = await axios.get(`http://localhost:8081/users/user/${userId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                // Update state with the fetched profile data
                setProfile(profileRes.data);

                // If the current user is not the profile owner, check friend request status
                if (user && user.id !== userId) {
                    const statusRes = await axios.get(`http://localhost:8081/users/friend-requests/status/${userId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    });
                    // Update button text based on friend request status
                    if (statusRes.data.status === 'pending') {
                        setFriendRequestStatus(t('cancelRequest'));
                    } else if (statusRes.data.status === 'friends') {
                        setFriendRequestStatus(t('removeFriend'));
                    } else {
                        setFriendRequestStatus(t('addFriend'));
                    }
                }

                // Fetch the user's recent games
                const gamesRes = await axios.get(`http://localhost:8081/users/user/${userId}/games`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                // Update state with the fetched games, defaulting to an empty array if none
                setRecentGames(gamesRes.data.games || []);

                // Set loading to false once all data is fetched
                setLoading(false);
            } catch (err) {
                // Handle errors by setting an error message and stopping loading
                setError(t('failedToLoadProfile'));
                setLoading(false);
            }
        };
        // Call the fetch function
        fetchProfile();
    }, [userId, user, t]);

    // Handle friend request actions: add, cancel, or remove a friend
    const handleFriendRequest = async () => {
        // Check if the user is logged in; redirect to login if not
        if (!user) {
            toast.error(t('loginToManageFriends'));
            navigate('/login');
            return;
        }

        try {
            // If the button says "Add Friend", send a friend request
            if (friendRequestStatus === t('addFriend')) {
                await axios.post(
                    'http://localhost:8081/users/friend-requests',
                    { friendId: userId },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                setFriendRequestStatus(t('cancelRequest'));
                toast.success(t('friendRequestSent'));
                // If the button says "Cancel Request", cancel the pending request
            } else if (friendRequestStatus === t('cancelRequest')) {
                await axios.post(
                    `http://localhost:8081/users/friend-requests/${userId}/cancel`,
                    {},
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                setFriendRequestStatus(t('addFriend'));
                toast.info(t('friendRequestCanceled'));
                // If the button says "Remove Friend", delete the friendship
            } else if (friendRequestStatus === t('removeFriend')) {
                await axios.delete(`http://localhost:8081/users/friends/${userId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                setFriendRequestStatus(t('addFriend'));
                toast.info(t('friendRemoved'));
            }
        } catch (err) {
            // Show an error message if the request fails
            const message = err.response?.data?.message || t('failedToLoadProfile');
            toast.error(message);
        }
    };

    // Navigate to the edit profile page if the user is the profile owner
    const handleEditProfile = () => {
        navigate(`/profile/edit`);
    };

    // Show a loading spinner while data is being fetched
    if (loading) return <CircularProgress className="profile-loading" />;
    // Display an error message if data fetching failed
    if (error) return <Typography className="profile-error">{error}</Typography>;
    // Show a message if the profile data is not found
    if (!profile) return <Typography className="profile-not-found">{t('profileNotFound')}</Typography>;

    // Render the profile view with user info, bio, and recent games
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
                            // Show edit button if the current user is the profile owner
                            <Button className="edit-profile-button" variant="contained" onClick={handleEditProfile}>
                                {t('editProfile')}
                            </Button>
                        ) : (
                            // Show friend request button with animation for other users
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
                                        // List recent games if available, showing up to 3
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
            </Box>
        </div>
    );
}

export default ProfileView;