const express = require("express");
const router = express.Router();
const {
    createLobby,
    getLobbies,
    updateLobby,
    deleteLobby,
    getLobby,
    getLobbyPlayers,
    joinLobby,
    leaveLobby,
    getLobbyMessages,
    sendLobbyMessage,
    inviteToLobby,
    acceptLobbyInvite,
    rejectLobbyInvite,
    getInvitableFriends
} = require("../controllers/lobbyController");
const verifyToken = require("../middleware/verifyToken");

router.get("/", getLobbies);
router.get("/:id", getLobby);
router.get("/:lobbyId/players", getLobbyPlayers);
router.get("/:id/messages", verifyToken, getLobbyMessages);
router.get("/:lobbyId/friends", verifyToken, getInvitableFriends);

router.post("/", verifyToken, createLobby);
router.post("/:id/join", verifyToken, joinLobby);
router.post("/:id/leave", verifyToken, leaveLobby);
router.post("/:id/message", verifyToken, sendLobbyMessage);
router.post("/:id/invite", verifyToken, inviteToLobby);
router.post("/invitations/:invitationId/accept", verifyToken, acceptLobbyInvite);
router.post("/invitations/:invitationId/reject", verifyToken, rejectLobbyInvite);

router.put("/:id", verifyToken, updateLobby);

router.delete("/:id", verifyToken, deleteLobby);

module.exports = router;