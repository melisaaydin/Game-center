const express = require("express");
const router = express.Router();

const {
    getNotifications,
    markNotificationAsRead,
    deleteNotification,
} = require("../controllers/notificationController");
const verifyToken = require("../middleware/verifyToken");
const updateLastActive = require("../middleware/updateLastActive");

router.get("/", verifyToken, updateLastActive, getNotifications);

router.post("/:notificationId/read", verifyToken, updateLastActive, markNotificationAsRead);

router.delete("/:notificationId", verifyToken, updateLastActive, deleteNotification);

module.exports = router;