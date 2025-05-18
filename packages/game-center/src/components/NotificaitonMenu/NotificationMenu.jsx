import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Typography, Badge, CircularProgress, Alert, Snackbar, Box } from '@mui/material';
import { IoNotifications } from 'react-icons/io5';
import { MdLogin } from 'react-icons/md';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import useNotifications from './useNotifications';
import NotificationItem from './NotificationItem';
import './NotificationMenu.css';
import { debounce } from 'lodash';

function NotificationMenu() {
    // Access the current user from the UserContext
    const { user } = useUser();
    // Hook to navigate to other routes
    const navigate = useNavigate();
    // State to manage the anchor element for the menu
    const [anchorEl, setAnchorEl] = useState(null);

    const {
        notifications,
        unreadCount,
        loading,
        snackbarOpen,
        snackbarMessage,
        snackbarSeverity,
        fetchNotifications,
        markAsRead,
        acceptFriendRequest,
        rejectFriendRequest,
        acceptLobbyInvite,
        rejectLobbyInvite,
        deleteNotification,
        handleSnackbarClose,
        processingInvites,
        processingFriendRequests
    } = useNotifications();

    // Debounce the fetchNotifications function to prevent excessive API calls
    const debouncedFetchNotifications = debounce(fetchNotifications, 500);

    // Handle clicking the notification icon to open the menu
    const handleNotificationClick = (event) => {
        setAnchorEl(event.currentTarget);
        debouncedFetchNotifications();
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogin = () => {
        navigate('/login');
        handleClose();
    };

    return (
        <>
            {/* Notification icon with a badge showing the unread count */}
            <IconButton
                className="right-icon notification-icon"
                disableRipple
                onClick={handleNotificationClick}
                aria-label="Notifications"
            >
                <Badge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
                    <IoNotifications />
                </Badge>
            </IconButton>

            {/* Notification menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    className: 'notification-menu',
                    elevation: 2,
                    sx: { width: '400px', maxHeight: '500px', overflowY: 'auto' },
                }}
                aria-live="polite"
            >
                {!user && (
                    <MenuItem onClick={handleLogin} className="notification-login">
                        <MdLogin style={{ marginRight: 8 }} /> Login to see notifications
                    </MenuItem>
                )}
                {user && loading && (
                    <MenuItem className="notification-loading">
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ ml: 2 }}>
                            Loading notifications...
                        </Typography>
                    </MenuItem>
                )}
                {user && !loading && notifications.length === 0 && (
                    <MenuItem className="notification-empty">
                        <Typography variant="body2">No new notifications</Typography>
                    </MenuItem>
                )}
                {user &&
                    !loading &&
                    notifications.length > 0 &&
                    notifications.map((notification, index) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            index={index}
                            markAsRead={markAsRead}
                            acceptFriendRequest={acceptFriendRequest}
                            rejectFriendRequest={rejectFriendRequest}
                            acceptLobbyInvite={acceptLobbyInvite}
                            rejectLobbyInvite={rejectLobbyInvite}
                            deleteNotification={deleteNotification}
                            navigate={navigate}
                            processingInvites={processingInvites}
                            processingFriendRequests={processingFriendRequests}
                        />
                    ))}
            </Menu>

            {/* Snackbar for displaying success or error messages */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                className="notification-snackbar"
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbarSeverity}
                    className="snackbar-alert"
                    sx={{
                        bgcolor: snackbarSeverity === 'success' ? 'green' : snackbarSeverity === 'error' ? 'red' : 'blue',
                        color: 'white',
                    }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    );
}

export default NotificationMenu;