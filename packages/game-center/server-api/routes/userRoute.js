const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
    getUserById,
    updateProfile,
    getAllUsers,
    searchUsers,
    getUserGames,
} = require("../controllers/userController");

const verifyToken = require("../middleware/verifyToken");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = multer({ storage });

router.get("/user/:id", getUserById);
router.get("/user/:id/games", verifyToken, getUserGames);

router.get("/", getAllUsers);
router.get("/search", searchUsers);
router.put("/user/:id", verifyToken, upload.single("avatar"), updateProfile);

module.exports = router;