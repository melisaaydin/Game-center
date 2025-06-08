import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Typography, Badge, CircularProgress, Box } from '@mui/material';
import { IoNotifications } from 'react-icons/io5';
import { MdLogin } from 'react-icons/md';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import useNotifications from './useNotifications';
import NotificationItem from './NotificationItem';
import './NotificationMenu.css';
import { debounce } from 'lodash';
import { useTranslation } from 'react-i18next';

// Component for displaying a notification menu
function NotificationMenu() {
    // Get translation function for the 'notifications' namespace
    const { t } = useTranslation('notifications');
    // Get current user from UserContext
    const { user } = useUser();
    // Hook for programmatic navigation
    const navigate = useNavigate();
    // State for the menu's anchor element
    const [anchorEl, setAnchorEl] = useState(null);

    // Use the notifications custom hook
    const {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        acceptFriendRequest,
        rejectFriendRequest,
        acceptLobbyInvite,
        rejectLobbyInvite,
        deleteNotification,
        processingInvites,
        processingFriendRequests
    } = useNotifications();

    // Debounce fetchNotifications to prevent excessive API calls
    const debouncedFetchNotifications = debounce(fetchNotifications, 500);

    // Open the notification menu
    const handleNotificationClick = (event) => {
        setAnchorEl(event.currentTarget);
        debouncedFetchNotifications();
    };

    // Close the notification menu
    const handleClose = () => {
        setAnchorEl(null);
    };

    // Navigate to login page
    const handleLogin = () => {
        navigate('/login');
        handleClose();
    };

    return (
        <>
            {/* Notification icon with badge showing unread count */}
            <IconButton
                className="right-icon notification-icon"
                disableRipple
                onClick={handleNotificationClick}
                aria-label={t('notifications')}
            >
                <Badge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
                    <IoNotifications />
                </Badge>
            </IconButton>

            {/* Notification dropdown menu */}
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
                {/* Show login prompt if user is not authenticated */}
                {!user && (
                    <MenuItem onClick={handleLogin} className="notification-login">
                        <MdLogin style={{ marginRight: 8 }} /> {t('loginToSeeNotifications')}
                    </MenuItem>
                )}
                {/* Show loading spinner while fetching notifications */}
                {user && loading && (
                    <MenuItem className="notification-loading">
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ ml: 2 }}>
                            {t('loadingNotifications')}
                        </Typography>
                    </MenuItem>
                )}
                {/* Show empty message if no notifications exist */}
                {user && !loading && notifications.length === 0 && (
                    <MenuItem className="notification-empty">
                        <Typography variant="body2">{t('noNotifications')}</Typography>
                    </MenuItem>
                )}
                {/* Render notification items */}
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
        </>
    );
}

export default NotificationMenu;