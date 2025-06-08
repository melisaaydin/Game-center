import React from "react";
import { Box, Typography, List, ListItem, ListItemAvatar, ListItemText, Avatar, Paper } from "@mui/material";
import { useTranslation } from 'react-i18next';

// Component for displaying the list of players in a lobby
const PlayersSection = ({ lobby }) => {
    // Get translation function for the 'playersSection' namespace
    const { t } = useTranslation('playersSection');

    return (
        <Paper className="lobby-card players-card">
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" className="section-title">{t('players')}</Typography>
                {/* Display list of players if available */}
                {lobby.players && lobby.players.length > 0 ? (
                    <List>
                        {lobby.players.map((player) => (
                            <ListItem
                                key={player.id}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <ListItemAvatar>
                                        <Avatar
                                            src={
                                                player?.avatar_url
                                                    ? `http://localhost:8081/uploads/${player.avatar_url}`
                                                    : "/default-avatar.png"
                                            }
                                        />
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={player.name}
                                        secondary={
                                            <Typography
                                                variant="body2"
                                                sx={{ color: player.is_ready ? "green" : "orange" }}
                                            >
                                                {player.is_ready ? t('ready') : t('notReady')}
                                            </Typography>
                                        }
                                    />
                                </Box>
                                <img
                                    src={player.is_ready ? "/ready.png" : "/sand-clock.png"}
                                    alt={player.is_ready ? "Ready" : "Not Ready"}
                                    style={{
                                        width: 30,
                                        height: 30,
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Typography className="section-text">{t('noPlayers')}</Typography>
                )}
            </Box>
        </Paper>
    );
};

export default PlayersSection;