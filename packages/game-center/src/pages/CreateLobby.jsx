import React, { useState } from "react";
import { Box, TextField, Button, Typography, Switch, FormControlLabel, IconButton, Snackbar, Alert } from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import axios from "axios";
import { useUser } from "../context/UserContext";

function CreateLobby({ gameId, onLobbyCreated }) {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        is_event: false,
        start_time: "",
        end_time: "",
        password: "",
        max_players: 10,
    });
    const [error, setError] = useState(null);
    const [lobbyLink, setLobbyLink] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!gameId) {
            setError("Oyun ID'si eksik! Lütfen bir oyun seçin.");
            return;
        }

        if (!formData.name || !formData.max_players) {
            setError("Lobi adı ve maksimum oyuncu sayısı zorunludur!");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(
                "http://localhost:8081/lobbies",
                {
                    ...formData,
                    game_id: gameId,
                    max_players: parseInt(formData.max_players),
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );
            if (res.data.success) {
                const lobbyId = res.data.lobby.id;
                const link = `${window.location.origin}/lobbies/${lobbyId}`;
                setLobbyLink(link);
                onLobbyCreated();
                setSnackbarMessage("Lobi başarıyla oluşturuldu!");
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
            } else {
                setError(res.data.message || "Lobi oluşturulamadı.");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Lobi oluşturulamadı: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(lobbyLink);
        setSnackbarMessage("Lobi bağlantısı kopyalandı!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbarOpen(false);
    };

    return (
        <Box className="create-lobby-container">
            <Typography variant="h5" className="lobby-title" gutterBottom>
                Create a New Lobby
            </Typography>
            {error && <Typography className="error-text" color="error">{error}</Typography>}
            {lobbyLink ? (
                <Box className="lobby-success">
                    <Typography className="success-text">Lobi başarıyla oluşturuldu!</Typography>
                    <Typography className="lobby-link" sx={{ mt: 1 }}>
                        Lobi Bağlantısı: {lobbyLink}
                    </Typography>
                    <Button
                        className="copy-button"
                        variant="contained"
                        startIcon={<ContentCopy />}
                        onClick={handleCopyLink}
                        sx={{ mt: 2 }}
                    >
                        Bağlantıyı Kopyala
                    </Button>
                </Box>
            ) : (
                <form className="lobby-form" onSubmit={handleSubmit}>
                    <TextField
                        className="text-property lobby-input"
                        label="Lobby Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        autoComplete="username"
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.is_event}
                                onChange={handleChange}
                                name="is_event"
                                color="primary"
                                className="lobby-switch"
                            />
                        }
                        label="Is Event?"
                        className="lobby-switch-label"
                    />
                    {formData.is_event && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <TextField
                                className="text-property lobby-input"
                                label="Start Time"
                                name="start_time"
                                type="datetime-local"
                                value={formData.start_time}
                                onChange={handleChange}
                                fullWidth
                                margin="normal"
                            />
                            <TextField
                                className="text-property lobby-input"
                                label="End Time"
                                name="end_time"
                                type="datetime-local"
                                value={formData.end_time}
                                onChange={handleChange}
                                fullWidth
                                margin="normal"
                            />
                        </Box>
                    )}
                    <TextField
                        className="text-property lobby-input"
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        autoComplete="current-password"
                    />
                    <TextField
                        className="text-property lobby-input"
                        label="Max Players"
                        name="max_players"
                        type="number"
                        value={formData.max_players}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        className="create-button"
                        sx={{ mt: 2 }}
                    >
                        {loading ? "Oluşturuluyor..." : "Create Lobby"}
                    </Button>
                </form>
            )}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default CreateLobby;