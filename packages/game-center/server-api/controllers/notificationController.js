const db = require("../models/db");
const { handleError, handleUnauthorized, handleNotFound, handleBadRequest } = require("../utils/errorHandler");

// Helper function to format a notification for the response
const formatNotification = (n) => {
    let content = typeof n.content === 'string' ? JSON.parse(n.content) : n.content || {};

    // Set the status based on the notification type
    content.status = n.type === 'friend_request' ? n.friend_request_status || 'pending' :
        n.type === 'lobby_invite' ? n.invitation_status || 'pending' : null;

    return {
        id: n.id,
        type: n.type,
        sender_id: n.sender_id || null,
        sender_name: n.sender_name || (n.type === 'friend_request' ? 'Unknown User' : 'System'),
        sender_avatar_url: n.sender_avatar_url || null,
        request_id: n.request_id || null,
        is_read: n.is_read,
        content,
        created_at: n.created_at,
    };
};

// Retrieve all notifications for the authenticated user
const getNotifications = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res);
    }

    try {
        // Fetch notifications with sender details and related statuses
        const result = await db.query(
            `SELECT n.*, 
                    u.name AS sender_name, 
                    u.avatar_url AS sender_avatar_url, 
                    fr.status AS friend_request_status, 
                    i.status AS invitation_status,
                    i.id AS invitation_id
             FROM notifications n
             LEFT JOIN users u ON n.sender_id = u.id
             LEFT JOIN friend_requests fr ON n.request_id = fr.id AND n.type = 'friend_request'
             LEFT JOIN invitations i ON n.invitation_id = i.id AND n.type = 'lobby_invite'
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC`,
            [userId]
        );

        // Format the notifications for the response
        const formattedNotifications = result.rows.map(formatNotification);

        res.json({ success: true, notifications: formattedNotifications });
    } catch (err) {
        handleError(res, err, "Failed to retrieve notifications");
    }
};

// Mark a notification as read
const markNotificationAsRead = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res);
    }

    if (!notificationId || isNaN(notificationId)) {
        return handleBadRequest(res, "A valid notification ID is required");
    }

    try {
        // Check if the notification exists
        const notificationCheck = await db.query("SELECT * FROM notifications WHERE id = $1", [notificationId]);
        if (notificationCheck.rows.length === 0) {
            return handleNotFound(res, "Notification not found");
        }

        // Check if the user has permission to modify the notification
        if (notificationCheck.rows[0].user_id !== userId) {
            return handleUnauthorized(res, "You do not have permission to modify this notification");
        }

        // Mark the notification as read
        await db.query(
            "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
            [notificationId, userId]
        );

        // Send a success response
        res.json({ success: true, message: "Notification marked as read" });
    } catch (err) {
        handleError(res, err, "Failed to mark notification as read");
    }
};

// Delete a notification
const deleteNotification = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return handleUnauthorized(res);
    }

    if (!notificationId || isNaN(notificationId)) {
        return handleBadRequest(res, "A valid notification ID is required");
    }

    try {
        // Check if the notification exists
        const notificationCheck = await db.query("SELECT * FROM notifications WHERE id = $1", [notificationId]);
        if (notificationCheck.rows.length === 0) {
            return handleNotFound(res, "Notification not found");
        }

        // Check if the user has permission to delete the notification
        if (notificationCheck.rows[0].user_id !== userId) {
            return handleUnauthorized(res, "You do not have permission to delete this notification");
        }

        // Delete the notification
        await db.query(
            "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
            [notificationId, userId]
        );

        // Send a success response
        res.json({ success: true, message: "Notification deleted" });
    } catch (err) {
        handleError(res, err, "Failed to delete notification");
    }
};

// Export all functions
module.exports = {
    getNotifications,
    markNotificationAsRead,
    deleteNotification,
};