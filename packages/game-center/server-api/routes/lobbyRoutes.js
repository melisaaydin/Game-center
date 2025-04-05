const express = require("express");
const router = express.Router();
const {
    createLobbie,
    getLobbies,
    updateLobbie,
    deleteLobby,
    getLobby,
    joinLobby,
    leaveLobby,
    getLobbyPlayers,
} = require("../controllers/lobbyController");
const verifyToken = require("../middleware/verifyToken");

router.post("/", verifyToken, createLobbie);
router.get("/", getLobbies);
router.get("/:id", getLobby);
router.put("/:id", verifyToken, updateLobbie);
router.delete("/:id", verifyToken, deleteLobby);
router.get("/:lobbyId/players", getLobbyPlayers);
router.post("/:id/join", verifyToken, joinLobby);
router.post("/:id/leave", verifyToken, leaveLobby);
module.exports = router;