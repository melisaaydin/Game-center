const express = require("express");
const router = express.Router();
const { getAllGames, getGameDetails, searchGames } = require("../controllers/gameController");

router.get("/search", searchGames);
router.get("/", getAllGames);
router.get("/:gameId", getGameDetails);

module.exports = router;