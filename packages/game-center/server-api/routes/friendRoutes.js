const express = require("express");
const router = express.Router();
const {
    getFriendRequests,
    getFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriendRequestStatus,
    cancelFriendRequest,
} = require("../controllers/friendController");
const verifyToken = require("../middleware/verifyToken");
const updateLastActive = require("../middleware/updateLastActive");


router.get("/friend-requests", verifyToken, updateLastActive, getFriendRequests);
router.get("/friends", verifyToken, updateLastActive, getFriends);
router.get("/friend-requests/status/:friendId", verifyToken, updateLastActive, getFriendRequestStatus);

router.post("/friend-requests/:requestId/accept", verifyToken, updateLastActive, acceptFriendRequest);
router.post("/friend-requests/:requestId/reject", verifyToken, updateLastActive, rejectFriendRequest);
router.post("/friend-requests", verifyToken, updateLastActive, sendFriendRequest);
router.post("/friend-requests/:friendId/cancel", verifyToken, updateLastActive, cancelFriendRequest);

router.delete("/friends/:friendId", verifyToken, updateLastActive, removeFriend);
module.exports = router;