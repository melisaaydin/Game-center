import React, { useState, useEffect, useContext } from "react";
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
import { Lock, Event, ContentCopy } from "@mui/icons-material";
import axios from "axios";
import { useUser } from "../../context/UserContext";
import { ColorModeContext } from "../../context/ThemeContext";
import CreateLobby from "../../pages/CreateLobby";
import "./LobbySection.css";
import useLobbyUtils from "../../hooks/useLobbyUtils";
function LobbySection() {
    const { user } = useUser();
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
    const { getTimeDisplay, eventLobbies, activeLobbies, pastLobbies } = useLobbyUtils(lobbies);

    useEffect(() => {
        const fetchLobbies = async () => {
            try {
                const res = await axios.get("http://localhost:8081/lobbies");
                if (res.data.success) {
                    setLobbies(res.data.lobbies || []);
                }
            } catch (err) {
                console.error("Lobiler alınamadı:", err);
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
                console.error("Oyunlar alınamadı:", err);
                setErrorGames("Oyunlar yüklenirken bir hata oluştu.");
                setLoadingGames(false);
            }
        };

        fetchLobbies();
        fetchGames();

        // Geri sayım için her saniye güncelleme
        const interval = setInterval(() => {
            setLobbies((prevLobbies) => [...prevLobbies]); // State'i yenileyerek render tetiklenir
        }, 1000);

        return () => clearInterval(interval); // Cleanup
    }, []);

    const handleCreateLobby = () => {
        setOpenDialog(true);
    };

    const handleGameSelect = (event) => {
        setSelectedGameId(event.target.value);
    };

    const handleLobbyCreated = () => {
        setOpenDialog(false);
        setSelectedGameId("");
        axios.get("http://localhost:8081/lobbies").then((res) => {
            if (res.data.success) setLobbies(res.data.lobbies || []);
        });
        setSnackbarMessage("Lobi başarıyla oluşturuldu!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
    };

    const handleCopyLink = (lobbyId) => {
        const link = `${window.location.origin}/lobbies/${lobbyId}`;
        navigator.clipboard.writeText(link);
        setSnackbarMessage("Lobi bağlantısı panoya kopyalandı!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbarOpen(false);
    };


    return (
        <Box className="lobby-section">
            {/* Etkinlik Lobileri */}
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
                                <IconButton onClick={() => handleCopyLink(lobby.id)}>
                                    <ContentCopy fontSize="small" />
                                </IconButton>
                            </ListItem>
                        ))}
                    </List>
                </>
            )}

            {/* Aktif Lobiler */}
            <Typography variant="h6" className="lobby-section-title" sx={{ mt: eventLobbies.length > 0 ? 3 : 0 }}>
                Active Lobbies
            </Typography>
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
                            <IconButton onClick={() => handleCopyLink(lobby.id)}>
                                <ContentCopy fontSize="small" />
                            </IconButton>
                        </ListItem>
                    ))
                ) : (
                    <Typography className="no-lobbies">No active lobbies yet.</Typography>
                )}
            </List>

            {/* Geçmiş Etkinlik Lobileri */}
            {pastLobbies.length > 0 && (
                <>
                    <Typography variant="h6" className="lobby-section-title" sx={{ mt: 3 }}>
                        Past Event Lobbies
                    </Typography>
                    <List className="lobby-list">
                        {pastLobbies.map((lobby) => (
                            <ListItem key={lobby.id} className="lobby-item">
                                <ListItemText
                                    primary={lobby.name}
                                    secondary={`Players: ${lobby.current_players}/${lobby.max_players}`}
                                    primaryTypographyProps={{ className: "lobby-name" }}
                                    secondaryTypographyProps={{ className: "lobby-info" }}
                                />
                                {lobby.password && <Lock fontSize="small" className="lobby-icon" />}
                                <Event fontSize="small" className="lobby-icon" />
                                <IconButton onClick={() => handleCopyLink(lobby.id)}>
                                    <ContentCopy fontSize="small" />
                                </IconButton>
                            </ListItem>
                        ))}
                    </List>
                </>
            )}

            {/* Dummy Eklemeler */}
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

            {/* Lobi Oluşturma Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Create a New Lobby</DialogTitle>
                <DialogContent>
                    {loadingGames ? (
                        <Typography>Yükleniyor...</Typography>
                    ) : errorGames ? (
                        <Typography color="error">{errorGames}</Typography>
                    ) : games.length === 0 ? (
                        <Typography>Hiç oyun bulunamadı.</Typography>
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

            {/* Snackbar Bildirimi */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{
                    width: "100%", // Esnek genişlik
                    color: mode === "dark" ? "#fff" : "#000", // Tema moduna göre yazı rengi
                    bgcolor: mode === "dark" ? "grey.800" : undefined, // Koyu modda arka plan
                }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default LobbySection;