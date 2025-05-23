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
import { useUser } from "../../context/UserContext";
import { ColorModeContext } from "../../context/ThemeContext";
import CreateLobby from "../../components/CreateLobby/CreateLobby";
import LobbyList from "../../components/LobbyList";
import "./GameDetail.css";
import useLobbyUtils from "../../hooks/useLobbyUtils";
import { useTranslation } from 'react-i18next';

function GameDetail() {
    const { t } = useTranslation('gameDetail');
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
            }
        } catch (err) {
            setLobbies([]);
        }
    }, [gameId]);

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

    const handlePlayGame = async () => {
        if (!user) {
            setSnackbarMessage(t('pleaseLogin'));
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            navigate('/login');
            return;
        }
        if (!game || !gameId) {
            setSnackbarMessage(t('gameNotAvailable'));
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        const activeLobby = lobbies.find(
            (lobby) => lobby.game_id === gameId && lobby.lobby_status === 'active' && lobby.current_players > 0
        );

        if (activeLobby) {
            const gameUrl = `http://localhost:3001/games/${gameId}/lobby/${activeLobby.id}`;
            window.open(gameUrl, '_blank');
            setSnackbarMessage(t('gameStarting', { gameId, lobbyId: activeLobby.id }));
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                'http://localhost:8081/lobbies',
                {
                    name: `${user.name}'s Lobby`,
                    max_players: 10,
                    password: null,
                    start_time: null,
                    end_time: null,
                    gameId,
                    created_by: user.id,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
                const newLobby = res.data.lobby;
                await axios.post(
                    `http://localhost:8081/lobbies/${newLobby.id}/join`,
                    { userId: user.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const gameUrl = `http://localhost:3001/games/${gameId}/lobby/${newLobby.id}`;
                window.open(gameUrl, '_blank');
                setSnackbarMessage(t('lobbyCreated'));
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
                fetchLobbies();
            } else {
                setSnackbarMessage(t('lobbyCreateFailed', { message: res.data.message }));
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            }
        } catch (err) {
            setSnackbarMessage(t('lobbyCreateFailed', { message: '' }));
            setSnackbarSeverity('error');
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
                setSnackbarMessage(t('lobbyDeleted'));
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
                setDeleteConfirmOpen(null);
            } else {
                setSnackbarMessage(t('lobbyDeleteFailed', { message: res.data.message }));
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
            }
        } catch (err) {
            setSnackbarMessage(t('lobbyDeleteFailed'));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

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

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditLobby = async () => {
        const token = localStorage.getItem("token");
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
            setSnackbarMessage(t('lobbyUpdated'));
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            setEditDialogOpen(null);
        } else {
            setSnackbarMessage(t('lobbyUpdateFailed', { message: res.message }));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    if (loading) return <div className="loading">{t('loading')}</div>;
    if (!user) {
        navigate("/login");
        return null;
    }
    if (!gameId) return <div className="error">{t('gameIdMissing')}</div>;
    if (!game) return <div className="loading">{t('loadingGame')}</div>;

    return (
        <Box className="game-detail-container">
            <Fade in={true} timeout={500}>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={8}>
                        <Card className="game-card">
                            <CardContent>
                                {activeTab === 0 && (
                                    <Box>
                                        <Typography variant="h5" className="section-title">{t('aboutGame')}</Typography>
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
                                            setSnackbarMessage(t('lobbyCreated'));
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
                                            setSnackbarMessage(t('navigatingToLobby'));
                                            setSnackbarSeverity("info");
                                            setSnackbarOpen(true);
                                        }}
                                    />
                                )}
                                {activeTab === 3 && (
                                    <Box>
                                        <Typography variant="h5" className="section-title">{t('gameHistory')}</Typography>
                                        <Typography className="section-text">{t('noGameHistory')}</Typography>
                                    </Box>
                                )}
                                {activeTab === 4 && (
                                    <Box>
                                        <Typography variant="h5" className="section-title">{t('howToPlay')}</Typography>
                                        <Typography component="ul" className="section-text how-to-play-list">{t('howToPlayNotDefined')}</Typography>
                                    </Box>
                                )}
                                {activeTab === 5 && (
                                    <Box>
                                        <Typography variant="h5" className="section-title">{t('gameSettings')}</Typography>
                                        <Typography className="section-text">{t('noGameSettings')}</Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card className="game-card sidebar-card">
                            <CardContent>
                                <Typography variant="h6" className="section-title">{t('players')}</Typography>
                                <Typography className="section-text">
                                    <strong>{t('confirmedPlayers', { count: totalPlayers })}</strong><br />
                                    <strong>{t('activeLobbies', { count: lobbies.length })}</strong>
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card className="game-card sidebar-card">
                            <CardContent>
                                <Typography variant="h6" className="section-title">{t('quickActions')}</Typography>
                                <Box className="quick-actions-container">
                                    <Button
                                        className="quick-action-button"
                                        variant="contained"
                                        onClick={() => setActiveTab(1)}
                                    >
                                        {t('createLobby')}
                                    </Button>
                                    <Button
                                        className="quick-action-button"
                                        variant="contained"
                                        onClick={() => setActiveTab(2)}
                                    >
                                        {t('viewLobbies')}
                                    </Button>
                                    <Button
                                        className="quick-action-button play-button"
                                        variant="contained"
                                        onClick={handlePlayGame}
                                        startIcon={<SportsEsports className="play-icon" />}
                                    >
                                        {t('play')}
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
                                <Tab label={t('navOverview')} icon={<Info />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label={t('navCreateLobby')} icon={<Add />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label={t('navLobbies')} icon={<Group />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label={t('navGameHistory')} icon={<History />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label={t('navHowToPlay')} icon={<PlayArrow />} className="game-tab" sx={{ textTransform: "initial" }} />
                                <Tab label={t('navSettings')} icon={<Settings />} className="game-tab" sx={{ textTransform: "initial" }} />
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
                <DialogTitle>{t('areYouSure')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('deleteLobbyConfirm')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(null)} color="primary">{t('no')}</Button>
                    <Button onClick={() => handleDeleteLobby(deleteConfirmOpen)} color="error" variant="contained">{t('yes')}</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={editDialogOpen !== null}
                onClose={() => setEditDialogOpen(null)}
            >
                <DialogTitle>{t('editLobbyTitle')}</DialogTitle>
                <DialogContent>
                    <TextField
                        label={t('lobbyNameLabel')}
                        name="name"
                        value={editForm.name || ""}
                        onChange={handleEditFormChange}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        required
                    />
                    <TextField
                        label={t('maxPlayersLabel')}
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
                        label={t('passwordLabel')}
                        name="password"
                        type="password"
                        value={editForm.password || ""}
                        onChange={handleEditFormChange}
                        fullWidth
                        margin="normal"
                        variant="outlined"
                    />
                    {editForm.is_event && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <TextField
                                label={t('startTimeLabel')}
                                name="start_time"
                                type="datetime-local"
                                value={editForm.start_time || ""}
                                onChange={handleEditFormChange}
                                fullWidth
                                margin="normal"
                                variant="outlined"
                            />
                            <TextField
                                label={t('endTimeLabel')}
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
                    <Button onClick={() => setEditDialogOpen(null)} color="secondary">{t('cancel')}</Button>
                    <Button onClick={handleEditLobby} variant="contained" color="primary">{t('save')}</Button>
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