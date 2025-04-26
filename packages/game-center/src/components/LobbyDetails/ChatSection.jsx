import React, { useEffect, useRef } from "react";
import { Box, Typography, TextField, Button, Avatar, Paper } from "@mui/material";

const ChatSection = ({ chatMessages, newMessage, setNewMessage, typingUser, isJoined, handleSendMessage, handleTyping, mode, chatRef, userName }) => {


    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chatMessages, chatRef]);

    return (
        <Paper className="lobby-card chat-card">
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" className="section-title">Chat</Typography>
                <Box ref={chatRef} className="chat-messages">
                    {chatMessages.map((msg, index) => {
                        const isSystemMessage =
                            msg.content.includes("left the lobby") ||
                            msg.content.includes("joined the lobby") || msg.is_system;

                        const isSent = !isSystemMessage && msg.user === userName;
                        const avatarSrc = msg.avatar_url ? `http://localhost:8081/uploads/${msg.avatar_url}` : null;
                        const initial = msg.user ? msg.user.charAt(0).toUpperCase() : "?";

                        if (isSystemMessage) {
                            return (
                                <Box key={index} className="system-message">
                                    <Typography className="message-content" variant="body2">
                                        {msg.content}
                                    </Typography>
                                </Box>
                            );
                        }

                        return (
                            <Box key={index} className={`chat-message ${isSent ? "sent" : "received"}`}>
                                {!isSent && (
                                    <Avatar className="avatar" src={avatarSrc}>
                                        {!avatarSrc && initial}
                                    </Avatar>
                                )}
                                <Box className="message-content">
                                    <Typography variant="body2">{msg.content}</Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
                {typingUser && (
                    <Typography className="typing-indicator">{typingUser} is typing...</Typography>
                )}
                {isJoined && (
                    <Box className="chat-input">
                        <TextField
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                handleTyping();
                            }}
                            onKeyPress={(e) => {
                                if (e.key === "Enter") handleSendMessage();
                            }}
                            placeholder="Message"
                            fullWidth
                            size="small"
                            variant="outlined"
                            sx={{ bgcolor: mode === "dark" ? "#444" : "white" }}
                        />
                        <Button variant="contained" onClick={handleSendMessage}>
                            Send
                        </Button>
                    </Box>
                )}
            </Box>
        </Paper>
    );
};

export default ChatSection;