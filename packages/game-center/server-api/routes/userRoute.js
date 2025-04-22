// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
    getUserById,
    updateProfile,
    getAllUsers,
    searchUsers,
    getUserGames,
} = require("../controllers/userController");
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

// Multer ayarları
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = multer({ storage });

// User Routes
router.get("/user/:id", getUserById);
router.get("/user/:id/games", verifyToken, updateLastActive, getUserGames);
router.get("/", getAllUsers);
router.get("/search", searchUsers);
router.put("/user/:id", verifyToken, updateLastActive, upload.single("avatar"), updateProfile);

//Friends routes
router.get("/friend-requests", verifyToken, updateLastActive, getFriendRequests);
router.get("/friends", verifyToken, updateLastActive, getFriends);
router.get("/friend-requests/status/:friendId", verifyToken, updateLastActive, getFriendRequestStatus);

router.post("/friend-requests/:requestId/accept", verifyToken, updateLastActive, acceptFriendRequest);
router.post("/friend-requests/:requestId/reject", verifyToken, updateLastActive, rejectFriendRequest);
router.post("/friend-requests", verifyToken, updateLastActive, sendFriendRequest);
router.post("/friend-requests/:friendId/cancel", verifyToken, updateLastActive, cancelFriendRequest);

router.delete("/friends/:friendId", verifyToken, updateLastActive, removeFriend);

module.exports = router;