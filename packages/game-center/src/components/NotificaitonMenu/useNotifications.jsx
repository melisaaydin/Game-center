import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { fetchNotifications, markNotificationAsRead, deleteNotification } from '../../utils/api';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function useNotifications() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const fetchNotificationsHandler = async (isInitialFetch = false) => {
        if (!user) {
            console.log('User not logged in, skipping fetchNotifications');
            return;
        }
        if (isInitialFetch) {
            setLoading(true);
        }
        try {
            const data = await fetchNotifications();
            console.log('Bildirimler alındı:', data);
            if (!Array.isArray(data)) {
                console.warn('Bildirimler dizi değil:', data);
                setNotifications([]);
                setUnreadCount(0);
                return;
            }
            const enrichedNotifications = data.map((notification) => {
                const { sender_id, sender_name, sender_avatar_url, content } = notification;
                return {
                    ...notification,
                    sender_id: sender_id || (content?.senderId ?? null),
                    sender_name: sender_name || (notification.type === 'friend_request' ? 'Unknown User' : 'System'),
                    sender_avatar_url: sender_avatar_url || null,
                    message: content?.message || 'No message provided',
                    isNew: !notifications.some((n) => n.id === notification.id),
                };
            });

            setNotifications((prev) => {
                // Ensure prev is an array
                const prevArray = Array.isArray(prev) ? prev : [];
                const updatedNotifications = enrichedNotifications.map((newNotif) => {
                    const existing = prevArray.find((n) => n.id === newNotif.id);
                    return existing ? { ...existing, ...newNotif, isNew: false } : newNotif;
                });
                return updatedNotifications.filter((n) =>
                    enrichedNotifications.some((newNotif) => newNotif.id === n.id)
                );
            });
            setUnreadCount(enrichedNotifications.filter((n) => !n.is_read).length);
        } catch (err) {
            console.error('Bildirimler alınamadı:', err.response?.data || err.message);
            const message = err.response?.status === 401
                ? 'Session expired. Please log in again.'
                : err.response?.data?.message || 'Failed to load notifications.';
            setSnackbarMessage(message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
            if (isInitialFetch) {
                setNotifications([]);
                setUnreadCount(0);
            }
        } finally {
            if (isInitialFetch) {
                setLoading(false);
            }
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await markNotificationAsRead(notificationId);
            setNotifications((prev) => {
                const prevArray = Array.isArray(prev) ? prev : [];
                return prevArray.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
            });
            setUnreadCount((prev) => Math.max(prev - 1, 0));
        } catch (err) {
            console.error('Bildirim okundu olarak işaretlenemedi:', err.response?.data || err.message);
            const message = err.response?.status === 401
                ? 'Session expired. Please log in again.'
                : err.response?.data?.message || 'Failed to mark notification as read.';
            setSnackbarMessage(message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    const acceptRequest = async (notificationId, requestId) => {
        if (!requestId) {
            console.error('request_id eksik:', { notificationId });
            setSnackbarMessage('Unable to process friend request: Invalid request ID.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        try {
            const response = await axios.post(
                `http://localhost:8081/users/friend-requests/${requestId}/accept`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setNotifications((prev) => {
                const prevArray = Array.isArray(prev) ? prev : [];
                return prevArray.filter((n) => n.id !== notificationId);
            });
            setUnreadCount((prev) => Math.max(prev - 1, 0));
            setSnackbarMessage('Friend request accepted!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            await fetchNotificationsHandler(false);
        } catch (err) {
            console.error('Friend request could not be accepted:', err.response?.data || err.message);
            const message = err.response?.status === 401
                ? 'Session expired. Please log in again.'
                : err.response?.data?.message || 'Failed to accept friend request.';
            setSnackbarMessage(message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    const rejectRequest = async (notificationId, requestId) => {
        if (!requestId) {
            console.error('request_id eksik:', { notificationId });
            setSnackbarMessage('Unable to process friend request: Invalid request ID.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        try {
            const response = await axios.post(
                `http://localhost:8081/users/friend-requests/${requestId}/reject`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            console.log('Arkadaşlık isteği reddedildi:', response.data);
            setNotifications((prev) => {
                const prevArray = Array.isArray(prev) ? prev : [];
                return prevArray.filter((n) => n.id !== notificationId);
            });
            setUnreadCount((prev) => Math.max(prev - 1, 0));
            setSnackbarMessage('Friend request rejected.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            await fetchNotificationsHandler(false); // Refresh notifications
        } catch (err) {
            console.error('Arkadaşlık isteği reddedilemedi:', err.response?.data || err.message);
            const message = err.response?.status === 401
                ? 'Session expired. Please log in again.'
                : err.response?.data?.message || 'Failed to reject friend request.';
            setSnackbarMessage(message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    const deleteNotificationHandler = async (notificationId) => {
        if (!notificationId || isNaN(notificationId)) {
            console.error('Invalid notification ID:', notificationId);
            setSnackbarMessage('Invalid notification ID.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        try {
            console.log('Deleting notification ID:', notificationId);
            await deleteNotification(notificationId);
            setNotifications((prev) => {
                const prevArray = Array.isArray(prev) ? prev : [];
                return prevArray.filter((n) => n.id !== notificationId);
            });
            setUnreadCount((prev) => {
                const prevArray = Array.isArray(notifications) ? notifications : [];
                const deletedNotification = prevArray.find((n) => n.id === notificationId);
                return deletedNotification && !deletedNotification.is_read ? Math.max(prev - 1, 0) : prev;
            });
            setSnackbarMessage('Notification deleted.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            await fetchNotificationsHandler(false); // Refresh notifications
        } catch (err) {
            console.error('Bildirim silinemedi:', err.response?.data || err.message);
            const message = err.response?.status === 401
                ? 'Session expired. Please log in again.'
                : err.response?.status === 404
                    ? 'Notification not found or already deleted.'
                    : err.response?.data?.message || 'Failed to delete notification.';
            setSnackbarMessage(message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        }
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    useEffect(() => {
        if (!user) {
            console.log('User not logged in, clearing notifications');
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        fetchNotificationsHandler(true); // İlk yüklemede loading göster
        const interval = setInterval(() => {
            console.log('Polling notifications...');
            fetchNotificationsHandler(false); // Arka plan yenilemesi, loading yok
        }, 60000); // Changed to 60 seconds to reduce frequency
        return () => {
            console.log('Clearing interval');
            clearInterval(interval);
        };
    }, [user, navigate]);

    return {
        notifications,
        unreadCount,
        loading,
        snackbarOpen,
        snackbarMessage,
        snackbarSeverity,
        fetchNotifications: fetchNotificationsHandler,
        markAsRead,
        acceptRequest,
        rejectRequest,
        deleteNotification: deleteNotificationHandler,
        handleSnackbarClose,
    };
}

export default useNotifications;