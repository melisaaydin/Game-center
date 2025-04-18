import axios from 'axios';
export const API_URL = 'http://localhost:8081';

const getToken = () => localStorage.getItem('token');

export const searchGames = async (query) => {
    try {
        const response = await fetch(`${API_URL}/games/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`Games API error: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data.games) ? data.games : [];
    } catch (err) {
        console.error('Search games error:', err.message);
        throw err;
    }
};

export const searchUsers = async (query) => {
    try {
        const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`Users API error: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data.users) ? data.users : [];
    } catch (err) {
        console.error('Search users error:', err.message);
        throw err;
    }
};

export const sendFriendRequest = async (friendId) => {
    const token = getToken();
    if (!token) {
        throw new Error('No authentication token found');
    }
    try {
        const response = await fetch(`${API_URL}/users/friend-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ friendId }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to send friend request.');
        }
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchNotifications = async () => {
    const token = getToken();
    if (!token) {
        return [];
    }
    try {
        const response = await axios.get(`${API_URL}/users/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const notifications = response.data?.notifications || [];
        if (!Array.isArray(notifications)) {
            return [];
        }
        return notifications;
    } catch (err) {
        console.error('Fetch notifications error:', err.response?.data || err.message);
        return [];
    }
};

export const markNotificationAsRead = async (notificationId) => {
    const token = getToken();
    if (!token) {
        throw new Error('No authentication token found');
    }
    try {
        const response = await axios.post(
            `${API_URL}/users/notifications/${notificationId}/read`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (err) {
        throw err;
    }
};
export const deleteNotification = async (notificationId) => {
    const token = getToken();
    if (!token) {
        throw new Error('No authentication token found');
    }
    try {
        const response = await axios.delete(
            `http://localhost:8081/users/notifications/${notificationId}`,
            {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            }
        );
        return response.data;
    } catch (err) {
        throw err;
    }
};