import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Typography,
    Button,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Select,
    Snackbar,
    Alert,
} from "@mui/material";
import { Lock, Event } from "@mui/icons-material";
import axios from "axios";
import { ColorModeContext } from "../../context/ThemeContext";
import CreateLobby from "../CreateLobby/CreateLobby";
import "./LobbySection.css";
import useLobbyUtils from "../../hooks/useLobbyUtils";
function LobbySection() {
    const { mode } = useContext(ColorModeContext);
    const [lobbies, setLobbies] = useState([]);
    const [games, setGames] = useState([]);
    const [loadingGames, setLoadingGames] = useState(true);
    const [errorGames, setErrorGames] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedGameId, setSelectedGameId] = useState("");
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("");
    const { getTimeDisplay, eventLobbies, activeLobbies } = useLobbyUtils(lobbies);
    const navigate = useNavigate();

    // Fetch lobbies and games on initial load
    useEffect(() => {
        const fetchLobbies = async () => {
            try {
                const res = await axios.get("http://localhost:8081/lobbies");
                if (res.data.success) {
                    setLobbies(res.data.lobbies || []);
                }
            } catch (err) {
                console.error("Lobbies could not be received:", err);
            }
        };

        const fetchGames = async () => {
            try {
                setLoadingGames(true);
                const res = await axios.get("http://localhost:8081/games");
                if (res.data.success) {
                    setGames(res.data.games || []);
                } else {
                    setGames(res.data || []);
                }
                setLoadingGames(false);
            } catch (err) {
                console.error("Games could not be received:", err);
                setErrorGames("Error occured while games loading.");
                setLoadingGames(false);
            }
        };

        fetchLobbies();
        fetchGames();


        const interval = setInterval(() => {
            setLobbies((prevLobbies) => [...prevLobbies]);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleCreateLobby = () => {
        setOpenDialog(true);
    };

    const handleGameSelect = (event) => {
        setSelectedGameId(event.target.value);
    };
    // After a lobby is created, close dialog and fetch lobbies again
    const handleLobbyCreated = () => {
        setOpenDialog(false);
        setSelectedGameId("");
        //Get the lobby list from the server and pass it to the lobbies variable to display it on the page.
        axios.get("http://localhost:8081/lobbies").then((res) => {
            if (res.data.success) setLobbies(res.data.lobbies || []);
        });
        setSnackbarMessage("Lobbby created successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbarOpen(false);
    };


    return (
        <Box className="lobby-section">
            {/* Event Lobbies */}
            {eventLobbies.length > 0 && (
                <>
                    <Typography variant="h6" className="lobby-section-title">
                        Event Lobbies
                    </Typography>
                    <List className="lobby-list">
                        {eventLobbies.map((lobby) => (
                            <ListItem key={lobby.id} className="lobby-item">
                                <ListItemText
                                    primary={lobby.name}
                                    secondary={
                                        <>
                                            {`Players: ${lobby.current_players}/${lobby.max_players}`} <br />
                                            {lobby.start_time && getTimeDisplay(lobby.start_time)}
                                        </>
                                    }
                                    primaryTypographyProps={{ className: "lobby-name" }}
                                    secondaryTypographyProps={{ className: "lobby-info" }}
                                />
                                {lobby.password && <Lock fontSize="small" className="lobby-icon" />}
                                <Event fontSize="small" className="lobby-icon" />
                                <Button
                                    variant="contained"
                                    onClick={() => navigate(`/lobbies/${lobby.id}`)}
                                    sx={{ ml: 1 }}
                                >
                                    Go to lobby
                                </Button>
                            </ListItem>
                        ))}
                    </List>
                </>
            )}
            {/* Active Lobbies */}
            <Typography variant="h6" className="lobby-section-title" sx={{ mt: eventLobbies.length > 0 ? 3 : 0 }}>
                Active Lobbies
            </Typography>
            {/* Button to open create lobby dialog */}
            <Button
                variant="contained"
                className="create-lobby-button"
                onClick={handleCreateLobby}
                sx={{ mb: 2 }}
            >
                Create New Lobby
            </Button>
            <List className="lobby-list">
                {activeLobbies.length > 0 ? (
                    activeLobbies.map((lobby) => (
                        <ListItem key={lobby.id} className="lobby-item">
                            <ListItemText
                                primary={lobby.name}
                                secondary={`Players: ${lobby.current_players}/${lobby.max_players}`}
                                primaryTypographyProps={{ className: "lobby-name" }}
                                secondaryTypographyProps={{ className: "lobby-info" }}
                            />
                            {lobby.password && <Lock fontSize="small" className="lobby-icon" />}
                            <Button
                                variant="contained"
                                onClick={() => navigate(`/lobbies/${lobby.id}`)}
                                sx={{ ml: 1 }}
                            >
                                Go to lobby
                            </Button>
                        </ListItem>
                    ))
                ) : (
                    <Typography className="no-lobbies">No active lobbies yet.</Typography>
                )}
            </List>
            <Box className="dummy-section" sx={{ mt: 3 }}>
                <Typography variant="h6" className="dummy-title">
                    Chat
                </Typography>
                <Typography className="dummy-text">Coming soon...</Typography>
            </Box>
            <Box className="dummy-section" sx={{ mt: 2 }}>
                <Typography variant="h6" className="dummy-title">
                    Statistics
                </Typography>
                <Typography className="dummy-text">Wins: 0 | Losses: 0</Typography>
            </Box>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Create a New Lobby</DialogTitle>
                <DialogContent>
                    {loadingGames ? (
                        <Typography>Loading...</Typography>
                    ) : errorGames ? (
                        <Typography color="error">{errorGames}</Typography>
                    ) : games.length === 0 ? (
                        <Typography>No games found.</Typography>
                    ) : (
                        <>
                            <Select
                                value={selectedGameId}
                                onChange={handleGameSelect}
                                displayEmpty
                                fullWidth
                                sx={{ mb: 2 }}
                            >
                                <MenuItem value="" disabled>
                                    Select a Game
                                </MenuItem>
                                {games.map((game) => (
                                    <MenuItem key={game.id} value={game.id}>
                                        {game.title}
                                    </MenuItem>
                                ))}
                            </Select>
                            {selectedGameId && (
                                <CreateLobby gameId={selectedGameId} onLobbyCreated={handleLobbyCreated} />
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{
                    width: "100%",
                    color: mode === "dark" ? "#fff" : "#000",
                    bgcolor: mode === "dark" ? "grey.800" : undefined,
                }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default LobbySection;