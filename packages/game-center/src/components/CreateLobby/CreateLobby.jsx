import React, { useState } from "react";
import { Box, TextField, Button, Typography, Switch, FormControlLabel } from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import axios from "axios";
import { useTranslation } from 'react-i18next';
import { toast } from "react-toastify";

function CreateLobby({ gameId, onLobbyCreated }) {
    const { t } = useTranslation('createLobby');
    const [loading, setLoading] = useState(false);
    // State for managing form input data
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

    // Handle changes in form inputs
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    // Handle form submission to create a new lobby
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!gameId) {
            setError(t('selectGameError'));
            return;
        }

        if (!formData.name || !formData.max_players) {
            setError(t('requiredFieldsError'));
            return;
        }

        setLoading(true);
        try {
            // Send a POST request to create the lobby
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
            // Handle the response
            if (res.data.success) {
                const lobbyId = res.data.lobby.id;
                const link = `${window.location.origin}/lobbies/${lobbyId}`;
                setLobbyLink(link);
                onLobbyCreated();
                toast.success(t('lobbyCreated'));
            } else {
                setError(t('failedToCreate', { message: res.data.message || 'Unknown error' }));
            }
        } catch (err) {
            setError(t('failedToCreate', { message: err.response?.data?.message || err.message }));
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(lobbyLink);
        toast.success(t('linkCopied'));
    };

    return (
        <Box className="create-lobby-container">
            {error && <Typography className="error-text" color="error">{error}</Typography>}
            {lobbyLink ? (
                <Box className="lobby-success">
                    <Typography className="success-text">{t('lobbyCreated')}</Typography>
                    <Typography className="lobby-link" sx={{ mt: 1 }}>
                        {t('lobbyLink', { link: lobbyLink })}
                    </Typography>
                    <Button
                        className="copy-button"
                        variant="contained"
                        startIcon={<ContentCopy />}
                        onClick={handleCopyLink}
                        sx={{ mt: 2 }}
                    >
                        {t('copyLink')}
                    </Button>
                </Box>
            ) : (
                <form className="lobby-form" onSubmit={handleSubmit}>
                    <TextField
                        className="text-property lobby-input"
                        label={t('lobbyName')}
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
                        label={t('isEvent')}
                        className="lobby-switch-label"
                    />
                    {formData.is_event && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <TextField
                                className="text-property lobby-input"
                                label={t('startTime')}
                                name="start_time"
                                type="datetime-local"
                                value={formData.start_time}
                                onChange={handleChange}
                                fullWidth
                                margin="normal"
                            />
                            <TextField
                                className="text-property lobby-input"
                                label={t('endTime')}
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
                        label={t('password')}
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
                        label={t('maxPlayers')}
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
                        {loading ? t('creating') : t('createLobby')}
                    </Button>
                </form>
            )}
        </Box>
    );
}

export default CreateLobby;