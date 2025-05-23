import React from 'react';
import { MenuItem, Typography, Box, Avatar, Button, IconButton } from '@mui/material';
import { IoPersonAdd, IoNotifications } from 'react-icons/io5';
import { MdCheck, MdClose, MdGroup } from 'react-icons/md';
import { Close } from '@mui/icons-material';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
// Component to render a single notification item in the notification menu
function NotificationItem({
    notification,
    index,
    markAsRead,
    acceptFriendRequest,
    rejectFriendRequest,
    acceptLobbyInvite,
    rejectLobbyInvite,
    deleteNotification,
    navigate,
    processingInvites,
    processingFriendRequests,
}) {
    const { t } = useTranslation('notifications');
    // Validate the notification object to ensure it has an ID
    if (!notification || !notification.id) {
        return null;
    }

    // Navigate to the user's profile when their avatar or name is clicked
    const handleProfileClick = (userId) => {
        if (!userId) {
            return;
        }
        navigate(`/users/user/${userId}`);
    };

    // Handle accepting a lobby invitation
    const handleAcceptLobbyInvite = async (notificationId, invitationId) => {
        await acceptLobbyInvite(notificationId, invitationId);
    };

    // Handle rejecting a lobby invitation
    const handleRejectLobbyInvite = async (notificationId, invitationId) => {
        await rejectLobbyInvite(notificationId, invitationId);
    };

    return (
        <MenuItem
            className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => !notification.is_read && markAsRead(notification.id)}
        >
            <Box className="notification-content" sx={{ position: 'relative' }}>
                {/* Delete button for the notification */}
                <IconButton
                    disableRipple
                    className="delete-icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                    }}
                    aria-label={t('deleteNotification')}
                    sx={{
                        position: 'absolute',
                        top: 1,
                        right: 1,
                        paddingTop: '3px',
                        paddingRight: '2px',
                    }}
                >
                    <Close sx={{ fontSize: '14px' }} />
                </IconButton>

                {/* Avatar of the sender or system */}
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

                {/* Notification content */}
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
                                    {notification.content?.message || t('friendRequestMessage', { senderName: notification.sender_name })}
                                </Typography>
                            </Box>
                            <Typography variant="caption" className="notification-timestamp">
                                {moment(notification.created_at).fromNow()}
                            </Typography>
                            {notification.request_id && (!notification.content?.status || notification.content?.status === 'pending') ? (
                                <Box className="notification-actions">
                                    <Button
                                        className="action-button accept"
                                        variant="contained"
                                        color="success"
                                        size="small"
                                        disabled={processingFriendRequests?.has(notification.request_id)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            acceptFriendRequest(notification.id, notification.request_id);
                                        }}
                                        aria-label={t('accept')}
                                        sx={{ mr: 1 }}
                                    >
                                        <MdCheck style={{ marginRight: 4 }} /> {t('accept')}
                                    </Button>
                                    <Button
                                        className="action-button reject"
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        disabled={processingFriendRequests?.has(notification.request_id)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            rejectFriendRequest(notification.id, notification.request_id);
                                        }}
                                        aria-label={t('reject')}
                                        sx={{ mr: 1 }}
                                    >
                                        <MdClose style={{ marginRight: 4 }} /> {t('reject')}
                                    </Button>
                                </Box>
                            ) : (
                                <Box className="notification-actions">
                                    {notification.content?.status === 'accepted' && (
                                        <Typography variant="caption" color="success.main">
                                            {t('friendRequestAccepted')}
                                        </Typography>
                                    )}
                                    {notification.content?.status === 'rejected' && (
                                        <Typography variant="caption" color="error">
                                            {t('friendRequestRejected')}
                                        </Typography>
                                    )}
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
                                    {notification.content?.message || t('friendAcceptedMessage', { senderName: notification.sender_name })}
                                </Typography>
                            </Box>
                            <Typography variant="caption" className="notification-timestamp">
                                {moment(notification.created_at).fromNow()}
                            </Typography>
                        </>
                    ) : notification.type === 'lobby_invite' ? (
                        <>
                            <Box className="notification-header">
                                <MdGroup className="notification-icon" />
                                <Typography
                                    variant="body2"
                                    className="notification-message"
                                    onClick={() => notification.content?.id && navigate(`/lobbies/${notification.content.id}`)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <strong>{notification.sender_name || 'Unknown User'}</strong>{' '}
                                    {notification.content?.message || t('lobbyInviteMessage', { senderName: notification.sender_name })}
                                </Typography>
                            </Box>
                            <Typography variant="caption" className="notification-timestamp">
                                {moment(notification.created_at).fromNow()}
                            </Typography>
                            {notification.content?.invitationId && notification.content?.status === 'pending' ? (
                                <Box className="notification-actions">
                                    <Button
                                        className="action-button join-lobby"
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        disabled={processingInvites?.has(notification.content.invitationId)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log('Accepting lobby invite with invitationId:', notification.content.invitationId);
                                            handleAcceptLobbyInvite(notification.id, notification.content.invitationId);
                                        }}
                                        aria-label={t('joinLobby')}
                                        sx={{ mr: 1, bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
                                    >
                                        <MdCheck style={{ marginRight: 4 }} /> {t('joinLobby')}
                                    </Button>
                                    <Button
                                        className="action-button decline-lobby"
                                        variant="outlined"
                                        color="warning"
                                        size="small"
                                        disabled={processingInvites?.has(notification.content.invitationId)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log('Rejecting lobby invite with invitationId:', notification.content.invitationId);
                                            handleRejectLobbyInvite(notification.id, notification.content.invitationId);
                                        }}
                                        aria-label={t('decline')}
                                        sx={{ mr: 1 }}
                                    >
                                        <MdClose style={{ marginRight: 4 }} /> {t('decline')}
                                    </Button>
                                </Box>
                            ) : (
                                <Box className="notification-actions">
                                    {notification.content?.status === 'accepted' && notification.content?.id ? (
                                        <Button
                                            className="action-button view-lobby"
                                            variant="contained"
                                            color="primary"
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/lobbies/${notification.content.id}`);
                                            }}
                                            aria-label={t('viewLobby')}
                                            sx={{ mr: 1 }}
                                        >
                                            {t('viewLobby')}
                                        </Button>
                                    ) : notification.content?.status === 'rejected' ? (
                                        <Typography variant="caption" color="error">
                                            {t('lobbyInviteRejected')}
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" color="error">
                                            {t('invitationNotFound')}
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </>
                    ) : notification.type === 'lobby_invite_accepted' || notification.type === 'lobby_joined' ? (
                        <>
                            <Box className="notification-header">
                                <MdGroup className="notification-icon" />
                                <Typography
                                    variant="body2"
                                    className="notification-message"
                                    onClick={() => notification.content?.lobbyId && navigate(`/lobbies/${notification.content.lobbyId}`)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <strong>{notification.sender_name || 'Unknown User'}</strong>{' '}
                                    {notification.content?.message || t('lobbyJoinedMessage', { senderName: notification.sender_name })}
                                </Typography>
                            </Box>
                            <Typography variant="caption" className="notification-timestamp">
                                {moment(notification.created_at).fromNow()}
                            </Typography>
                            <Box className="notification-actions">
                                <Button
                                    className="action-button view-lobby"
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/lobbies/${notification.content.lobbyId}`);
                                    }}
                                    aria-label={t('viewLobby')}
                                    sx={{ mr: 1 }}
                                >
                                    {t('viewLobby')}
                                </Button>
                            </Box>
                        </>
                    ) : (
                        <>
                            <Box className="notification-header">
                                <IoNotifications className="notification-icon" />
                                <Typography variant="body2" className="notification-message">
                                    {notification.content?.message || t('newNotification', { ns: 'common' }) || 'New notification'}
                                </Typography>
                            </Box>
                            <Typography variant="caption" className="notification-timestamp">
                                {moment(notification.created_at).fromNow()}
                            </Typography>
                        </>
                    )}
                </Box>
            </Box>
        </MenuItem>
    );
}

export default NotificationItem;