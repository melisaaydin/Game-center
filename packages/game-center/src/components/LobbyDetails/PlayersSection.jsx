import React from "react";
import { Box, Typography, List, ListItem, ListItemAvatar, ListItemText, Avatar, Paper } from "@mui/material";

const PlayersSection = ({ lobby }) => (
    <Paper elevation={2} className="lobby-card players-card">
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" className="section-title">Players</Typography>
            {lobby.players && lobby.players.length > 0 ? (
                <List>
                    {lobby.players.map((player) => (
                        <ListItem key={player.id}>
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
                                secondary={player.is_ready ? "Ready" : "Not Ready"}
                                sx={{ color: player.is_ready ? "green" : "orange" }}
                            />
                        </ListItem>
                    ))}
                </List>
            ) : (
                <Typography className="section-text">No players in this lobby yet.</Typography>
            )}
        </Box>
    </Paper>
);

export default PlayersSection;