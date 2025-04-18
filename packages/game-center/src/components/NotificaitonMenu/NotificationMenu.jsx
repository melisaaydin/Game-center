import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Typography, Badge, CircularProgress, Alert, Snackbar } from '@mui/material';
import { IoNotifications } from 'react-icons/io5';
import { MdLogin } from 'react-icons/md';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import useNotifications from './useNotifications';
import NotificationItem from './NotificationItem';
import './NotificationMenu.css';
import { debounce } from 'lodash';

function NotificationMenu() {
    const { user } = useUser();
    const navigate = useNavigate();
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
        acceptRequest,
        rejectRequest,
        deleteNotification,
        handleSnackbarClose,
    } = useNotifications();

    const debouncedFetchNotifications = debounce(fetchNotifications, 500);

    const handleNotificationClick = (event) => {
        console.log('Notification icon clicked');
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
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    className: 'notification-menu',
                    elevation: 3,
                }}
                aria-live="polite"
            >
                {user ? (
                    loading ? (
                        <MenuItem className="notification-loading">
                            <CircularProgress size={24} />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                                Loading notifications...
                            </Typography>
                        </MenuItem>
                    ) : notifications.length === 0 ? (
                        <MenuItem className="notification-empty">
                            <Typography variant="body2">No new notifications</Typography>
                        </MenuItem>
                    ) : (
                        notifications.map((notification, index) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                index={index}
                                markAsRead={markAsRead}
                                acceptRequest={acceptRequest}
                                rejectRequest={rejectRequest}
                                deleteNotification={deleteNotification}
                                navigate={navigate}
                            />
                        ))
                    )
                ) : (
                    <MenuItem onClick={handleLogin} className="notification-login">
                        <MdLogin style={{ marginRight: 8 }} /> Login to see notifications
                    </MenuItem>
                )}
            </Menu>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                className="notification-snackbar"
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} className="snackbar-alert">
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    );
}

export default NotificationMenu;