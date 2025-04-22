import React, { useEffect, useRef } from "react";
import { Box, Typography, TextField, Button, Avatar, Paper } from "@mui/material";

const ChatSection = ({ chatMessages, newMessage, setNewMessage, typingUser, isJoined, handleSendMessage, handleTyping, mode, chatRef, userName }) => {
    const preferredLanguage = "en";

    const translateMessage = (content) => {
        if (preferredLanguage !== "tr") return content;
        if (content.includes("left the lobby")) return content.replace("left the lobby", "lobiden ayrıldı");
        if (content.includes("joined the lobby")) return content.replace("joined the lobby", "lobiye katıldı");
        return content;
    };

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chatMessages, chatRef]);

    return (
        <Paper elevation={2} className="lobby-card chat-card">
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" className="section-title">Chat</Typography>
                <Box ref={chatRef} className="chat-messages">
                    {chatMessages.map((msg, index) => {
                        const isSystemMessage =
                            msg.content.includes("lobiden ayrıldı") ||
                            msg.content.includes("left the lobby") ||
                            msg.content.includes("lobiye katıldı") ||
                            msg.content.includes("joined the lobby");
                        const translatedContent = translateMessage(msg.content);
                        const isSent = !isSystemMessage && msg.user === userName;
                        const avatarSrc = msg.avatar_url ? `http://localhost:8081/uploads/${msg.avatar_url}` : null;
                        const initial = msg.user ? msg.user.charAt(0).toUpperCase() : "?";

                        if (isSystemMessage) {
                            return (
                                <Box key={index} className="system-message">
                                    <Typography className="message-content" variant="body2">
                                        {translatedContent}
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
                                    <Typography variant="body2">{translatedContent}</Typography>
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