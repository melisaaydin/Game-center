import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { fetchNotifications, markNotificationAsRead, deleteNotification } from '../../utils/api';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import io from 'socket.io-client';

const socket = io('http://localhost:8081', {
    reconnection: true,
    reconnectionAttempts: 5,
});

function useNotifications() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [processingInvites, setProcessingInvites] = useState(new Set());
    const [processingFriendRequests, setProcessingFriendRequests] = useState(new Set());
    // Handle errors and display appropriate snackbar messages
    const handleError = (err, defaultMessage, isAuthError) => {
        let message;
        if (err.response?.status === 401) {
            message = 'Your session has expired. Please log in again.';
        } else if (err.response?.status === 400 && err.response?.data?.message.includes('already')) {
            message = 'You are already in another active lobby!';
        } else if (err.response?.status === 404) {
            message = 'Invitation not found or has expired.';
        } else {
            message = err.response?.data?.message || defaultMessage;
        }
        setSnackbarMessage(message);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
        }
        return message;
    };
    // Fetch and process notifications from the server
    const fetchNotificationsHandler = async (isInitialFetch = false) => {
        if (!user) return;
        if (isInitialFetch) setLoading(true);
        try {
            const data = await fetchNotifications();
            if (!Array.isArray(data)) {
                setNotifications([]);
                setUnreadCount(0);
                return;
            }
            // Enrich notifications with additional data and formatting
            const enrichedNotifications = data.map((notification) => {
                const content = typeof notification.content === 'string' ? JSON.parse(notification.content) : notification.content || {};
                console.log(
                    `Notification ID: ${notification.id}, invitation_id: ${notification.invitation_id}, content.invitationId: ${content.invitationId}`
                );
                return {
                    ...notification,
                    sender_id: notification.sender_id || content.senderId || null,
                    sender_name: notification.sender_name || (notification.type === 'friend_request' ? 'Unknown User' : 'System'),
                    sender_avatar_url: notification.sender_avatar_url || null,
                    message: content.message || 'Message not provided!',
                    invitation_id:
                        notification.type === 'lobby_invite'
                            ? notification.invitation_id || content.invitationId || null
                            : null,
                    request_id: notification.type === 'friend_request' ? notification.request_id || content.requestId : null,
                    isNew: !notifications.some((n) => n.id === notification.id),
                    timeAgo: moment(notification.created_at).fromNow(),
                    content: {
                        ...content,
                        id: content.id || content.lobbyId || null,
                        invitationId: notification.type === 'lobby_invite' ? notification.invitation_id || content.invitationId || null : null,
                        status: content.status || (notification.type === 'lobby_invite' || notification.type === 'friend_request' ? 'pending' : null),
                    },
                };
            });
            // Update notifications state, preserving existing notifications where applicable
            setNotifications((prev) => {
                const updatedNotifications = enrichedNotifications.map((newNotif) => {
                    const existing = prev.find((n) => n.id === newNotif.id);
                    return existing ? { ...existing, ...newNotif, isNew: false } : newNotif;
                });
                return updatedNotifications.filter((n) => enrichedNotifications.some((newNotif) => newNotif.id === n.id));
            });
            setUnreadCount(enrichedNotifications.filter((n) => !n.is_read).length);
        } catch (err) {
            handleError(err, 'Failed to load notifications.', true);
            if (isInitialFetch) {
                setNotifications([]);
                setUnreadCount(0);
            }
        } finally {
            if (isInitialFetch) setLoading(false);
        }
    };
    // Mark a notification as read
    const markAsRead = async (notificationId) => {
        try {
            await markNotificationAsRead(notificationId);
            setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
            setUnreadCount((prev) => Math.max(prev - 1, 0));
        } catch (err) {
            handleError(err, 'Failed to mark notification as read.', true);
        }
    };
    // Accept a friend request
    const acceptFriendRequest = async (notificationId, requestId) => {
        if (!requestId) {
            setSnackbarMessage('Failed to process friend request: Invalid request ID.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        if (processingFriendRequests.has(requestId)) {
            return;
        }
        setProcessingFriendRequests((prev) => new Set(prev).add(requestId));
        try {
            await axios.post(
                `http://localhost:8081/users/friend-requests/${requestId}/accept`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId
                        ? { ...n, content: { ...n.content, status: 'accepted' }, is_read: true }
                        : n
                )
            );
            setSnackbarMessage('Friend request accepted!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            await fetchNotificationsHandler(false);
        } catch (err) {
            handleError(err, 'Failed to accept friend request.', true);
        } finally {
            setProcessingFriendRequests((prev) => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
            });
        }
    };
    // Reject a friend request
    const rejectFriendRequest = async (notificationId, requestId) => {
        if (!requestId) {
            setSnackbarMessage('Failed to process friend request: Invalid request ID.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        if (processingFriendRequests.has(requestId)) {
            return;
        }
        setProcessingFriendRequests((prev) => new Set(prev).add(requestId));
        try {
            await axios.post(
                `http://localhost:8081/users/friend-requests/${requestId}/reject`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId
                        ? { ...n, content: { ...n.content, status: 'rejected' }, is_read: true }
                        : n
                )
            );
            setSnackbarMessage('Friend request rejected.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            await fetchNotificationsHandler(false);
        } catch (err) {
            handleError(err, 'Failed to reject friend request.', true);
        } finally {
            setProcessingFriendRequests((prev) => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
            });
        }
    };
    // Accept a lobby invitation
    const acceptLobbyInvite = async (notificationId, invitationId) => {
        if (!invitationId) {
            setSnackbarMessage('Failed to process lobby invite: Invalid invite ID.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        if (processingInvites.has(invitationId)) {
            return;
        }
        setProcessingInvites((prev) => new Set(prev).add(invitationId));
        try {
            const response = await axios.post(
                `http://localhost:8081/lobbies/invitations/${invitationId}/accept`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            const lobbyId = response.data.lobbyId;
            if (!lobbyId) {
                console.warn('No lobbyId returned in acceptLobbyInvite response');
            }
            setNotifications((prev) => {
                const updatedNotifications = prev.map((n) =>
                    n.id === notificationId
                        ? {
                            ...n,
                            invitation_id: invitationId,
                            content: {
                                ...n.content,
                                status: 'accepted',
                                id: lobbyId || n.content.id || n.content.lobbyId,
                                invitationId: invitationId,
                            },
                            is_read: true,
                        }
                        : n
                );
                return [...updatedNotifications];
            });
            setUnreadCount((prev) => Math.max(prev - 1, 0));
            setSnackbarMessage('Lobby invitation accepted!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            await fetchNotificationsHandler(false);
        } catch (err) {
            handleError(err, 'Failed to accept lobby invitation.', true);
        } finally {
            setProcessingInvites((prev) => {
                const newSet = new Set(prev);
                newSet.delete(invitationId);
                return newSet;
            });
        }
    };
    // Reject a lobby invitation
    const rejectLobbyInvite = async (notificationId, invitationId) => {
        if (!invitationId) {
            setSnackbarMessage('Failed to process lobby invite: Invalid invite ID.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        if (processingInvites.has(invitationId)) {
            return;
        }
        setProcessingInvites((prev) => new Set(prev).add(invitationId));
        try {
            await axios.post(
                `http://localhost:8081/lobbies/invitations/${invitationId}/reject`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId
                        ? {
                            ...n,
                            invitation_id: invitationId,
                            content: {
                                ...n.content,
                                status: 'rejected',
                                invitationId: invitationId,
                            },
                            is_read: true,
                        }
                        : n
                )
            );
            setSnackbarMessage('Lobby invitation rejected.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            await fetchNotificationsHandler(false);
        } catch (err) {
            console.error('Reject lobby invite error:', err.response?.data || err.message);
            handleError(err, 'Failed to reject lobby invitation.', true);
        } finally {
            setProcessingInvites((prev) => {
                const newSet = new Set(prev);
                newSet.delete(invitationId);
                return newSet;
            });
        }
    };

    const deleteNotificationHandler = async (notificationId) => {
        if (!notificationId || isNaN(notificationId)) {
            setSnackbarMessage('Invalid notification ID.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        try {
            await deleteNotification(notificationId);
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
            setUnreadCount((prev) => {
                const deletedNotification = notifications.find((n) => n.id === notificationId);
                return deletedNotification && !deletedNotification.is_read ? Math.max(prev - 1, 0) : prev;
            });
            setSnackbarMessage('Notification deleted.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            await fetchNotificationsHandler(false);
        } catch (err) {
            handleError(err, 'Failed to delete notification.', true);
        }
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };
    // Fetch notifications on mount and periodically
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        fetchNotificationsHandler(true);
        const interval = setInterval(() => fetchNotificationsHandler(false), 60000);
        return () => clearInterval(interval);
    }, [user, navigate]);
    // Set up socket listeners for real-time notifications
    useEffect(() => {
        if (!user) return;

        socket.on('lobby_invite', ({ lobbyId, lobbyName, senderId, senderName, invitationId }) => {
            setSnackbarMessage(`${senderName} invited you to ${lobbyName}!`);
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            fetchNotificationsHandler(false);
        });

        socket.on('lobby_invite_accepted', ({ lobbyId, lobbyName, receiverId, receiverName }) => {
            setSnackbarMessage(`${receiverName} joined ${lobbyName}!`);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchNotificationsHandler(false);
        });

        socket.on('lobby_invite_rejected', ({ lobbyId, lobbyName, receiverId, receiverName }) => {
            setSnackbarMessage(`${receiverName} declined the invitation to ${lobbyName}.`);
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            fetchNotificationsHandler(false);
        });

        socket.on('friend_request', ({ senderId, senderName, requestId }) => {
            setSnackbarMessage(`${senderName} sent you a friend request!`);
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            fetchNotificationsHandler(false);
        });

        socket.on('friend_accepted', ({ senderId, senderName }) => {
            setSnackbarMessage(`${senderName} accepted your friend request!`);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchNotificationsHandler(false);
        });
        // Clean up socket listeners on unmount
        return () => {
            socket.off('lobby_invite');
            socket.off('lobby_invite_accepted');
            socket.off('lobby_invite_rejected');
            socket.off('friend_request');
            socket.off('friend_accepted');
        };
    }, [user, fetchNotificationsHandler]);
    // Return hook values and functions
    return {
        notifications,
        unreadCount,
        loading,
        snackbarOpen,
        snackbarMessage,
        snackbarSeverity,
        fetchNotifications: fetchNotificationsHandler,
        markAsRead,
        acceptFriendRequest,
        rejectFriendRequest,
        acceptLobbyInvite,
        rejectLobbyInvite,
        deleteNotification: deleteNotificationHandler,
        handleSnackbarClose,
        processingInvites,
        processingFriendRequests
    };
}

export default useNotifications;