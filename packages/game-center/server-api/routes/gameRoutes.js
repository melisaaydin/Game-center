const express = require("express");
const router = express.Router();
const { getAllGames, getGameDetails } = require("../controllers/gameController");

router.get("/", getAllGames);
router.get("/:gameId", getGameDetails);

module.exports = router;
