import React, { useEffect } from "react";
import { Box, Typography, List, ListItem, ListItemText, IconButton } from "@mui/material";
import { Lock, Event, ContentCopy } from "@mui/icons-material";

function LobbyList({ lobbies, eventLobbies, activeLobbies, pastLobbies, getTimeDisplay, onCopyLink }) {
    useEffect(() => {
        const interval = setInterval(() => { }, 1000);
        return () => clearInterval(interval);
    }, []);

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
                        </ListItem>
                    ))
                ) : (
                    <Typography>No active lobbies yet.</Typography>
                )}
            </List>

            {pastLobbies.length > 0 && (
                <>
                    <Typography variant="h6" className="section-title" sx={{ mt: 2 }}>
                        Past Event Lobbies
                    </Typography>
                    <List>
                        {pastLobbies.map((lobby) => (
                            <ListItem key={lobby.id}>
                                <ListItemText
                                    primary={lobby.name}
                                    secondary={`Players: ${lobby.current_players}/${lobby.max_players}`}
                                />
                                {lobby.password && <Lock fontSize="small" />}
                                <Event fontSize="small" />
                                <IconButton onClick={() => onCopyLink(lobby.id)}>
                                    <ContentCopy fontSize="small" />
                                </IconButton>
                            </ListItem>
                        ))}
                    </List>
                </>
            )}
        </Box>
    );
}

export default LobbyList;