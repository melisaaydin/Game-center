import React from "react";
import { Box, Typography, List, ListItem, ListItemText, IconButton } from "@mui/material";
import { Lock, Event, ContentCopy, Delete, Edit } from "@mui/icons-material";

// LobbyList component displays a list of lobbies categorized as event or active lobbies
function LobbyList({
    eventLobbies,
    activeLobbies,
    getTimeDisplay,
    onCopyLink,
    userId,
    onDeleteClick,
    onEditClick,
}) {

    // Render the lobby list with event and active sections
    return (
        <Box>
            {/* Display event lobbies if there are any */}
            {eventLobbies.length > 0 && (
                <>
                    <Typography variant="h6" className="section-title">Event lobbies</Typography>
                    <List>
                        {/* Iterate over event lobbies and render each one */}
                        {eventLobbies.map((lobby) => (
                            <ListItem key={lobby.id} sx={{ display: "flex", alignItems: "center" }}>
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
                                <IconButton onClick={() => onCopyLink(lobby.id)} title="Coppy link">
                                    <ContentCopy fontSize="small" />
                                </IconButton>
                                {parseInt(lobby.created_by) === parseInt(userId) && (
                                    <>
                                        {/* Button to open the edit dialog for the lobby */}
                                        <IconButton onClick={() => onEditClick(lobby)} title="Edit lobby">
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        {/* Button to trigger the delete confirmation dialog */}
                                        <IconButton onClick={() => onDeleteClick(lobby.id)} title="Delete lobby" color="error">
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </>
                                )}
                            </ListItem>
                        ))}
                    </List>
                </>
            )}

            <Typography variant="h6" className="section-title" sx={{ mt: eventLobbies.length > 0 ? 2 : 0 }}>
                Active lobbies
            </Typography>
            <List>
                {/* Display active lobbies or a message if there are none */}
                {activeLobbies.length > 0 ? (
                    activeLobbies.map((lobby) => (
                        <ListItem key={lobby.id} sx={{ display: "flex", alignItems: "center" }}>
                            <ListItemText
                                primary={lobby.name}
                                secondary={`Players: ${lobby.current_players}/${lobby.max_players}`}
                            />
                            {/* Show a lock icon if the lobby has a password */}
                            {lobby.password && <Lock fontSize="small" />}
                            <IconButton onClick={() => onCopyLink(lobby.id)} title="Coppy link">
                                <ContentCopy fontSize="small" />
                            </IconButton>
                            {/* Show edit and delete buttons only if the user is the lobby creator */}
                            {parseInt(lobby.created_by) === parseInt(userId) && (
                                <>
                                    {/* Button to open the edit dialog for the lobby */}
                                    <IconButton onClick={() => onEditClick(lobby)} title="Edit lobby">
                                        <Edit fontSize="small" />
                                    </IconButton>
                                    {/* Button to trigger the delete confirmation dialog */}
                                    <IconButton onClick={() => onDeleteClick(lobby.id)} title="Delete lobby" color="error">
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </>
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