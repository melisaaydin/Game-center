const express = require("express");
const router = express.Router();
const {
    getFriendRequests,
    getFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getNotifications,
    markNotificationAsRead,
    getFriendRequestStatus,
    deleteNotification,
    cancelFriendRequest,
} = require("../controllers/friendController");
const verifyToken = require("../middleware/verifyToken");

router.get("/friend-requests", verifyToken, getFriendRequests);
router.get("/friends", verifyToken, getFriends);
router.post("/friend-requests", verifyToken, sendFriendRequest);
router.get("/notifications", verifyToken, getNotifications);
router.get("/friend-requests/status/:friendId", verifyToken, getFriendRequestStatus);

router.post("/friend-requests/:requestId/accept", verifyToken, acceptFriendRequest);
router.post("/friend-requests/:requestId/reject", verifyToken, rejectFriendRequest);

router.post("/notifications/:notificationId/read", verifyToken, markNotificationAsRead);
router.post('/friend-requests/:friendId/cancel', verifyToken, cancelFriendRequest);

router.delete("/notifications/:notificationId", verifyToken, deleteNotification);
router.delete("/friends/:friendId", verifyToken, removeFriend);
module.exports = router;