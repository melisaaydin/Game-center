import React from 'react';
import { MenuItem, Typography, Box, Avatar, Button } from '@mui/material';
import { IoPersonAdd, IoNotifications } from 'react-icons/io5';
import { MdCheck, MdClose, MdDelete } from 'react-icons/md';
import moment from 'moment';

function NotificationItem({ notification, index, markAsRead, acceptRequest, rejectRequest, deleteNotification, navigate }) {
    if (!notification || !notification.id) {
        console.warn('Invalid notification:', notification);
        return null;
    }

    const handleProfileClick = (userId) => {
        if (!userId) {
            console.warn('Profil için userId eksik');
            return;
        }
        navigate(`/users/user/${userId}`);
    };

    return (
        <MenuItem
            className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => !notification.is_read && markAsRead(notification.id)}
        >
            <Box className="notification-content">
                <Avatar
                    src={
                        notification.sender_avatar_url
                            ? `http://localhost:8081/uploads/${notification.sender_avatar_url}`
                            : notification.sender_name === 'System'
                                ? '/system-avatar.png'
                                : '/default-avatar.png'
                    }
                    className="notification-avatar"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (notification.sender_id) handleProfileClick(notification.sender_id);
                    }}
                    alt={notification.sender_name || 'Notification'}
                />
                <Box className="notification-text">
                    {notification.type === 'friend_request' ? (
                        <>
                            <Box className="notification-header">
                                <IoPersonAdd className="notification-icon" />
                                <Typography
                                    variant="body2"
                                    className="notification-message"
                                    onClick={() => notification.sender_id && handleProfileClick(notification.sender_id)}
                                >
                                    <strong>{notification.sender_name || 'Unknown User'}</strong>{' '}
                                    {notification.content?.message || 'sent you a friend request'}
                                </Typography>
                            </Box>
                            <Typography variant="caption" className="notification-timestamp">
                                {moment(notification.created_at).fromNow()}
                            </Typography>
                            {notification.request_id ? (
                                <Box className="notification-actions">
                                    <Button
                                        className="action-button accept"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            acceptRequest(notification.id, notification.request_id);
                                        }}
                                        aria-label="Accept friend request"
                                        sx={{ '&:hover': { transform: 'none', boxShadow: 'none' } }}
                                    >
                                        <MdCheck style={{ marginRight: 4 }} /> Accept
                                    </Button>
                                    <Button
                                        className="action-button reject"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            rejectRequest(notification.id, notification.request_id);
                                        }}
                                        aria-label="Reject friend request"
                                        sx={{ '&:hover': { transform: 'none', boxShadow: 'none' } }}
                                    >
                                        <MdClose style={{ marginRight: 4 }} /> Reject
                                    </Button>
                                    <Button
                                        className="action-button delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification.id);
                                        }}
                                        aria-label="Delete notification"
                                        sx={{ '&:hover': { transform: 'none', boxShadow: 'none' } }}
                                    >
                                        <MdDelete style={{ marginRight: 4 }} /> Delete
                                    </Button>
                                </Box>
                            ) : (
                                <Box className="notification-actions">
                                    <Button
                                        className="action-button delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification.id);
                                        }}
                                        aria-label="Delete notification"
                                        sx={{ '&:hover': { transform: 'none', boxShadow: 'none' } }}
                                    >
                                        <MdDelete style={{ marginRight: 4 }} /> Delete
                                    </Button>
                                </Box>
                            )}
                        </>
                    ) : notification.type === 'friend_accepted' ? (
                        <>
                            <Box className="notification-header">
                                <IoPersonAdd className="notification-icon" />
                                <Typography
                                    variant="body2"
                                    className="notification-message"
                                    onClick={() => notification.sender_id && handleProfileClick(notification.sender_id)}
                                >
                                    <strong>{notification.sender_name || 'Unknown User'}</strong>{' '}
                                    {notification.content?.message || 'accepted your friend request'}
                                </Typography>
                            </Box>
                            <Typography variant="caption" className="notification-timestamp">
                                {moment(notification.created_at).fromNow()}
                            </Typography>
                            <Box className="notification-actions">
                                <Button
                                    className="action-button delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                    }}
                                    aria-label="Delete notification"
                                    sx={{ '&:hover': { transform: 'none', boxShadow: 'none' } }}
                                >
                                    <MdDelete style={{ marginRight: 4 }} /> Delete
                                </Button>
                            </Box>
                        </>
                    ) : (
                        <>
                            <Box className="notification-header">
                                <IoNotifications className="notification-icon" />
                                <Typography variant="body2" className="notification-message">
                                    {notification.content?.message || 'New notification'}
                                </Typography>
                            </Box>
                            <Typography variant="caption" className="notification-timestamp">
                                {moment(notification.created_at).fromNow()}
                            </Typography>
                            <Box className="notification-actions">
                                <Button
                                    className="action-button delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                    }}
                                    aria-label="Delete notification"
                                    sx={{ '&:hover': { transform: 'none', boxShadow: 'none' } }}
                                >
                                    <MdDelete style={{ marginRight: 4 }} /> Delete
                                </Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>
        </MenuItem>
    );
}

export default NotificationItem;