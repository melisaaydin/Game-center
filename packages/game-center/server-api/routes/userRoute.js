const express = require("express");
const multer = require("multer");
const router = express.Router();
const { getUserById, updateProfile, getAllUsers } = require("../controllers/userController");
const verifyToken = require("../middleware/verifyToken");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Dosyaların kaydedileceği klasör
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname); // Benzersiz dosya adı
    },
});
const upload = multer({ storage });
router.get("/user/:id", getUserById);
router.get("/", getAllUsers);

router.put("/user/:id", verifyToken, upload.single("avatar"), updateProfile);
module.exports = router;
