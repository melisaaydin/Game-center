import React, { useState, useEffect, useContext, useCallback } from "react";
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
} from "@mui/material";
import { Info, Group, Add, History, PlayArrow, Settings, SportsEsports } from "@mui/icons-material";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
// Import custom context and components for user data and lobby functionality
import { useUser } from "../../context/UserContext";
import { ColorModeContext } from "../../context/ThemeContext";
import CreateLobby from "../../components/CreateLobby/CreateLobby";
import LobbyList from "../../components/LobbyList";
import "./GameDetail.css";
import useLobbyUtils from "../../hooks/useLobbyUtils";

import { socket } from "../../utils/lobbyUtils";
function GameDetail() {
    //Get gameId from the URL parameters
    const { gameId } = useParams();
    const { user, loading } = useUser();
    const navigate = useNavigate();
    const { mode } = useContext(ColorModeContext);
    const [activeTab, setActiveTab] = useState(0);
    const [game, setGame] = useState(null);
    const [lobbies, setLobbies] = useState([]);
    const [totalPlayers, setTotalPlayers] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(null);
    const [editForm, setEditForm] = useState({});
    const { getTimeDisplay, eventLobbies, activeLobbies, updateLobby } = useLobbyUtils(lobbies);

    useEffect(() => {
        if (!gameId) {
            navigate("/games");
        } else {
            console.log("gameId received:", gameId);
        }
    }, [gameId, navigate]);
    // Fetch game data and set up a dummy interval to refresh lobbies
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
        // Set up an interval to trigger a re-render every second
        const interval = setInterval(() => {
            setLobbies((prevLobbies) => [...prevLobbies]);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameId, navigate]);
    // Function to fetch lobbies for the current game
    const fetchLobbies = useCallback(async () => {
        if (!gameId) return;
        try {
            const res = await axios.get(`http://localhost:8081/lobbies?gameId=${gameId}`);
            if (res.data.success) {
                setLobbies(res.data.lobbies || []);
                const total = (res.data.lobbies || []).reduce(
                    (sum, lobby) => sum + (lobby.current_players || 0),
                    0
                );
                setTotalPlayers(total);
            } else {
                setLobbies([]);
                console.error("Could not fetch lobbies:", res.data.message);
            }
        } catch (err) {
            setLobbies([]);
            console.error("Could not fetch lobbies:", err);
        }
    }, [gameId]);
    // Fetch lobbies when the component mounts and periodically refresh them
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
        if (game && gameId) {
            const gameName = gameId.toLowerCase();
            const roomId = Math.random.toString(36).substr(2, 8); //random room code
            const gameUrl = `${window.location.origin}/games/${gameName}/random/${roomId}`; // Dynamic URL
            window.open(gameUrl, "_blank");
            setSnackbarMessage(`Joining random ${gameId} game with room code: ${roomId}...`);
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
            socket.emit("create_game_room", { gameId, roomId, userId: user.id });
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

    // Handle opening the edit dialog
    const handleEditClick = (lobby) => {
        setEditForm({
            name: lobby.name,
            max_players: lobby.max_players,
            password: "",
            start_time: lobby.start_time ? new Date(lobby.start_time).toISOString().slice(0, 16) : "",
            end_time: lobby.end_time ? new Date(lobby.end_time).toISOString().slice(0, 16) : "",
            is_event: lobby.is_event,
        });
        setEditDialogOpen(lobby.id);
    };


    // Handle form input changes
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    // Handle submitting the updated lobby details
    const handleEditLobby = async () => {
        const token = localStorage.getItem("token");
        // Prepare the updated data
        const updatedData = {
            name: editForm.name,
            max_players: parseInt(editForm.max_players, 10),
            password: editForm.password || null,
            start_time: editForm.start_time || null,
            end_time: editForm.end_time || null,
            gameId: gameId,
        };

        const res = await updateLobby(editDialogOpen, updatedData, token);
        if (res.success) {
            fetchLobbies();
            setSnackbarMessage("Lobby updated successfully!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            setEditDialogOpen(null);
        } else {
            setSnackbarMessage("Failed to update lobby: " + res.message);
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
            <Fade in={true} timeout={500}>
                <Grid container spacing={1}>
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
                                        getTimeDisplay={getTimeDisplay}
                                        userId={user.id}
                                        onDeleteClick={handleDeleteClick}
                                        onEditClick={handleEditClick}
                                        onViewDetails={(lobbyId) => {
                                            navigate(`/lobbies/${lobbyId}`);
                                            setSnackbarMessage("Navigating to lobby details...");
                                            setSnackbarSeverity("info");
                                            setSnackbarOpen(true);
                                        }}

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
                                            Not defined yet.
                                        </Typography>
                                    </Box>
                                )}
                                {activeTab === 5 && (
                                    <Box>
                                        <Typography variant="h5" className="section-title">Game Settings</Typography>
                                        <Typography className="section-text">
                                            No game settings yet.
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
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Box sx={{ position: 'fixed', right: 15, top: 80, width: 80 }}>
                            <Tabs
                                value={activeTab}
                                onChange={handleTabChange}
                                className="game-tabs"
                                orientation="vertical"
                                variant="scrollable"
                            >
                                <Tab label="Overview" icon={<Info />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label="Create Lobby" icon={<Add />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label="Lobbies" icon={<Group />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label="Game History" icon={<History />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label="How to Play" icon={<PlayArrow />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label="Settings" icon={<Settings />} className="game-tab" sx={{ textTransform: "initial" }} />
                            </Tabs>
                        </Box>
                    </Grid>
                </Grid>
            </Fade>

            <Dialog
                className="dialog-for-delete"
                open={deleteConfirmOpen !== null}
                onClose={() => setDeleteConfirmOpen(null)}
            >
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

            <Dialog
                open={editDialogOpen !== null}
                onClose={() => setEditDialogOpen(null)}
            >
                <DialogTitle>Edit Lobby Details</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Lobby Name"
                        name="name"
                        value={editForm.name || ""}
                        onChange={handleEditFormChange}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        required
                    />
                    <TextField
                        label="Max Players"
                        name="max_players"
                        type="number"
                        value={editForm.max_players || ""}
                        onChange={handleEditFormChange}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        inputProps={{ min: lobbies.find((l) => l.id === editDialogOpen)?.current_players || 1 }}
                        required
                    />
                    <TextField
                        label="Password (leave blank to remove)"
                        name="password"
                        type="password"
                        value={editForm.password || ""}
                        onChange={handleEditFormChange}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                    />
                    {/* Show start_time and end_time fields only for event lobbies */}
                    {editForm.is_event && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <TextField
                                label="Start Time"
                                name="start_time"
                                type="datetime-local"
                                value={editForm.start_time || ""}
                                onChange={handleEditFormChange}
                                fullWidth
                                margin="normal"
                                variant="outlined"
                            />
                            <TextField
                                label="End Time"
                                name="end_time"
                                type="datetime-local"
                                value={editForm.end_time || ""}
                                onChange={handleEditFormChange}
                                fullWidth
                                margin="normal"
                                variant="outlined"
                                inputProps={{ min: editForm.start_time || undefined }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(null)} color="secondary">Cancel</Button>
                    <Button onClick={handleEditLobby} variant="contained" color="primary">Save</Button>
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