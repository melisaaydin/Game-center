import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemAvatar, ListItemText, Avatar, Button, Typography, Box, CircularProgress } from "@mui/material";

const InviteDialog = ({ open, onClose, friends, friendsLoading, invitedUsers, handleInvite }) => (
    <Dialog open={open} onClose={onClose}>
        <DialogTitle>Invite Friends to Lobby</DialogTitle>
        <DialogContent>
            {friendsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                    <CircularProgress />
                </Box>
            ) : friends.length > 0 ? (
                <List>
                    {friends.map((friend) => (
                        <ListItem key={friend.id} sx={{ display: "flex", alignItems: "center" }}>
                            <ListItemAvatar>
                                <Avatar
                                    src={
                                        friend?.avatar_url
                                            ? `http://localhost:8081/uploads/${friend.avatar_url}`
                                            : "/default-avatar.png"
                                    }
                                />
                            </ListItemAvatar>
                            <ListItemText primary={friend.name} />
                            {invitedUsers.has(friend.id) ? (
                                <Typography className="invited" variant="body2" sx={{ ml: 2 }}>
                                    Invited
                                </Typography>
                            ) : (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleInvite(friend.id)}
                                    sx={{ ml: 2 }}
                                >
                                    Invite
                                </Button>
                            )}
                        </ListItem>
                    ))}
                </List>
            ) : (
                <Typography>No friends found to invite.</Typography>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose} color="secondary">Close</Button>
        </DialogActions>
    </Dialog>
);

export default InviteDialog;