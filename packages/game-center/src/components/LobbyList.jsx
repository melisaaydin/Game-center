import React, { useEffect } from "react";
import { Box, Typography, List, ListItem, ListItemText, IconButton } from "@mui/material";
import { Lock, Event, ContentCopy, Delete } from "@mui/icons-material";
import { useUser } from "../context/UserContext";

function LobbyList({
    lobbies,
    eventLobbies,
    activeLobbies,
    pastLobbies,
    getTimeDisplay,
    onCopyLink,
    fetchLobbies,
    userId,
    onDeleteClick,
}) {
    const { user } = useUser();

    useEffect(() => {
        const interval = setInterval(() => { }, 1000);
        return () => clearInterval(interval);
    }, []);

    console.log("Current User ID:", user?.id);
    console.log("Lobbies:", lobbies);

    return (
        <Box>
            {eventLobbies.length > 0 && (
                <>
                    <Typography variant="h6" className="section-title">Event Lobbies</Typography>
                    <List>
                        {eventLobbies.map((lobby) => (
                            <ListItem key={lobby.id}>
                                <ListItemText
                                    primary={lobby.name}
                                    secondary={
                                        <>
                                            {`Players: ${lobby.current_players}/${lobby.max_players}`} <br />
                                            {lobby.start_time && getTimeDisplay(lobby.start_time)}
                                        </>
                                    }
                                />
                                {lobby.password && <Lock fontSize="small" />}
                                <Event fontSize="small" />
                                <IconButton onClick={() => onCopyLink(lobby.id)}>
                                    <ContentCopy fontSize="small" />
                                </IconButton>
                                {parseInt(lobby.created_by) === parseInt(userId) && (
                                    <IconButton onClick={() => onDeleteClick(lobby.id)} color="error">
                                        <Delete fontSize="small" />
                                    </IconButton>
                                )}
                            </ListItem>
                        ))}
                    </List>
                </>
            )}

            <Typography variant="h6" className="section-title" sx={{ mt: eventLobbies.length > 0 ? 2 : 0 }}>
                Active Lobbies
            </Typography>
            <List>
                {activeLobbies.length > 0 ? (
                    activeLobbies.map((lobby) => (
                        <ListItem key={lobby.id}>
                            <ListItemText
                                primary={lobby.name}
                                secondary={`Players: ${lobby.current_players}/${lobby.max_players}`}
                            />
                            {lobby.password && <Lock fontSize="small" />}
                            <IconButton onClick={() => onCopyLink(lobby.id)}>
                                <ContentCopy fontSize="small" />
                            </IconButton>
                            {parseInt(lobby.created_by) === parseInt(userId) && (
                                <IconButton onClick={() => onDeleteClick(lobby.id)} color="--text-color">
                                    <Delete fontSize="small" />
                                </IconButton>
                            )}
                        </ListItem>
                    ))
                ) : (
                    <Typography>No active lobbies yet.</Typography>
                )}
            </List>
        </Box>
    );
}

export default LobbyList;