import React, { useState, useEffect, useContext } from "react";
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Card,
    CardContent,
    Fade,
    Grid,
    Snackbar,
    Alert,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import { Info, Group, Add, History, PlayArrow, Settings, SportsEsports, Delete } from "@mui/icons-material";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useTheme } from "@mui/material/styles";
import { ColorModeContext } from "../../context/ThemeContext";
import CreateLobby from "../../components/CreateLobby/CreateLobby";
import LobbyList from "../../components/LobbyList";
import "./GameDetail.css";
import useLobbyUtils from "../../hooks/useLobbyUtils";

function GameDetail() {
    const { gameId } = useParams();
    const { user, loading } = useUser();
    const navigate = useNavigate();
    const theme = useTheme();
    const { mode } = useContext(ColorModeContext);
    const [activeTab, setActiveTab] = useState(0);
    const [game, setGame] = useState(null);
    const [lobbies, setLobbies] = useState([]);
    const [totalPlayers, setTotalPlayers] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(null);
    const { getTimeDisplay, eventLobbies, activeLobbies, pastLobbies } = useLobbyUtils(lobbies);

    useEffect(() => {
        if (!gameId) {
            console.error("gameId is missing!");
            navigate("/games");
        } else {
            console.log("gameId received:", gameId);
        }
    }, [gameId, navigate]);

    useEffect(() => {
        const fetchGame = async () => {
            if (!gameId) return;
            try {
                const res = await axios.get(`http://localhost:8081/games/${gameId}`);
                if (res.data.success) {
                    setGame(res.data.game);
                } else {
                    console.error("Game not found:", res.data.message);
                    navigate("/games");
                }
            } catch (err) {
                console.error("Could not load game:", err);
                navigate("/games");
            }
        };
        fetchGame();
        const interval = setInterval(() => {
            setLobbies((prevLobbies) => [...prevLobbies]);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameId, navigate]);

    const fetchLobbies = async () => {
        if (!gameId) return;
        try {
            const res = await axios.get(`http://localhost:8081/lobbies?gameId=${gameId}`);
            if (res.data.success) {
                setLobbies(res.data.lobbies || []);
                const total = (res.data.lobbies || []).reduce((sum, lobby) => sum + (lobby.current_players || 0), 0);
                setTotalPlayers(total);
            } else {
                setLobbies([]);
                console.error("Could not fetch lobbies:", res.data.message);
            }
        } catch (err) {
            setLobbies([]);
            console.error("Could not fetch lobbies:", err);
        }
    };

    useEffect(() => {
        fetchLobbies();
        const interval = setInterval(fetchLobbies, 30000);
        return () => clearInterval(interval);
    }, [gameId]);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbarOpen(false);
    };

    const handlePlayGame = () => {
        if (gameId === "tombala") {
            const gameUrl = `${window.location.origin}/games/tombala`;
            window.open(gameUrl, "_blank");
            setSnackbarMessage("Opening Tombala game...");
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
        } else {
            setSnackbarMessage("Game not available yet!");
            setSnackbarSeverity("warning");
            setSnackbarOpen(true);
        }
    };

    const handleDeleteClick = (lobbyId) => {
        setDeleteConfirmOpen(lobbyId);
    };

    const handleDeleteLobby = async (lobbyId) => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.delete(`http://localhost:8081/lobbies/${lobbyId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
                fetchLobbies();
                setSnackbarMessage("Lobby deleted successfully!");
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
                setDeleteConfirmOpen(null);
            } else {
                setSnackbarMessage(res.data.message);
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
            }
        } catch (err) {
            setSnackbarMessage("Could not delete lobby!");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (!user) {
        navigate("/login");
        return null;
    }
    if (!gameId) return <div className="error">Game ID is missing! Please select a game.</div>;
    if (!game) return <div className="loading">Loading game...</div>;

    return (
        <Box className="game-detail-container">
            <Box sx={{ justifyContent: "center", alignItems: "center", display: "flex" }}>
                <Tabs value={activeTab} onChange={handleTabChange} className="game-tabs">
                    <Tab label="Overview" icon={<Info />} className="game-tab" sx={{ textTransform: "initial" }} />
                    <Tab label="Create Lobby" icon={<Add />} className="game-tab" sx={{ textTransform: "initial" }} />
                    <Tab label="Lobbies" icon={<Group />} className="game-tab" sx={{ textTransform: "initial" }} />
                    <Tab label="Game History" icon={<History />} className="game-tab" sx={{ textTransform: "initial" }} />
                    <Tab label="How to Play" icon={<PlayArrow />} className="game-tab" sx={{ textTransform: "initial" }} />
                    <Tab label="Settings" icon={<Settings />} className="game-tab" sx={{ textTransform: "initial" }} />
                </Tabs>
            </Box>

            <Fade in={true} timeout={500}>
                <Grid container spacing={3} sx={{ padding: "0 20px" }}>
                    <Grid item xs={12} md={8}>
                        <Card className="game-card">
                            <CardContent>
                                {activeTab === 0 && (
                                    <Box>
                                        <Typography variant="h5" className="section-title">About Game</Typography>
                                        <Typography className="section-text">{game.description}</Typography>
                                        {game.image_url && (
                                            <img
                                                src={`http://localhost:8081${game.image_url}`}
                                                alt={game.title}
                                                className="game-image"
                                            />
                                        )}
                                    </Box>
                                )}
                                {activeTab === 1 && (
                                    <CreateLobby
                                        gameId={gameId}
                                        onLobbyCreated={() => {
                                            fetchLobbies();
                                            setSnackbarMessage("Lobby created successfully!");
                                            setSnackbarSeverity("success");
                                            setSnackbarOpen(true);
                                        }}
                                    />
                                )}
                                {activeTab === 2 && (
                                    <LobbyList
                                        gameId={gameId}
                                        lobbies={lobbies}
                                        fetchLobbies={fetchLobbies}
                                        eventLobbies={eventLobbies}
                                        activeLobbies={activeLobbies}
                                        pastLobbies={pastLobbies}
                                        getTimeDisplay={getTimeDisplay}
                                        onCopyLink={(lobbyId) => {
                                            const link = `${window.location.origin}/lobbies/${lobbyId}`;
                                            navigator.clipboard.writeText(link);
                                            setSnackbarMessage("Lobby link copied!");
                                            setSnackbarSeverity("success");
                                            setSnackbarOpen(true);
                                        }}
                                        userId={user.id}
                                        onDeleteClick={handleDeleteClick}
                                    />
                                )}
                                {activeTab === 3 && (
                                    <Box>
                                        <Typography variant="h5" className="section-title">Game History</Typography>
                                        <Typography className="section-text">
                                            You don't have any gaming history yet.
                                        </Typography>
                                    </Box>
                                )}
                                {activeTab === 4 && (
                                    <Box>
                                        <Typography variant="h5" className="section-title">How to Play?</Typography>
                                        <Typography component="ul" className="section-text how-to-play-list">
                                            <li>Mode of play will be standard Entite.</li>
                                            <li>All players must be logged in to Entite.</li>
                                            <li>Players have 5 minutes to join the pre-game lobby.</li>
                                        </Typography>
                                    </Box>
                                )}
                                {activeTab === 5 && (
                                    <Box>
                                        <Typography variant="h5" className="section-title">Game Settings</Typography>
                                        <Typography className="section-text">
                                            <strong>Card Size:</strong> 5x5 (Fixed)<br />
                                            <strong>Game Speed:</strong> Medium (Constant)
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card className="game-card sidebar-card">
                            <CardContent>
                                <Typography variant="h6" className="section-title">Players</Typography>
                                <Typography className="section-text">
                                    <strong>Confirmed:</strong> {totalPlayers} Players<br />
                                    <strong>Active Lobbies:</strong> {lobbies.length}
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card className="game-card sidebar-card">
                            <CardContent>
                                <Typography variant="h6" className="section-title">Quick Actions</Typography>
                                <Box className="quick-actions-container">
                                    <Button
                                        className="quick-action-button"
                                        variant="contained"
                                        onClick={() => setActiveTab(1)}
                                    >
                                        Create Lobby
                                    </Button>
                                    <Button
                                        className="quick-action-button"
                                        variant="contained"
                                        onClick={() => setActiveTab(2)}
                                    >
                                        View Lobbies
                                    </Button>
                                    <Button
                                        className="quick-action-button play-button"
                                        variant="contained"
                                        onClick={handlePlayGame}
                                        startIcon={<SportsEsports className="play-icon" />}
                                    >
                                        Play
                                    </Button>
                                    <Button
                                        className="quick-action-button back-button"
                                        variant="text"
                                        onClick={() => navigate("/")}
                                    >
                                        Back to Home
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Fade>

            <Dialog className="dialog-for-delete" open={deleteConfirmOpen !== null} onClose={() => setDeleteConfirmOpen(null)}>
                <DialogTitle>Are You Sure?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this lobby?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(null)} color="primary">
                        No
                    </Button>
                    <Button onClick={() => handleDeleteLobby(deleteConfirmOpen)} color="error" variant="contained">
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbarSeverity}
                    sx={{
                        width: "100%",
                        color: mode === "dark" ? "#fff" : "#000",
                        bgcolor: mode === "dark" ? "grey.800" : undefined,
                    }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default GameDetail;