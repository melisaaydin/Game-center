import React, { useEffect, useState } from "react";
import { Box, Typography, TextField, Button, Avatar, Paper, IconButton } from "@mui/material";
import { useTranslation } from 'react-i18next';
import Picker from 'emoji-picker-react';
import { EmojiEmotions, Send } from '@mui/icons-material';

// Component for displaying and managing the lobby chat
const ChatSection = ({ chatMessages, newMessage, setNewMessage, typingUser, isJoined, handleSendMessage, handleTyping, mode, chatRef, userName }) => {
    // Get translation function for the 'chatSection' namespace
    const { t } = useTranslation('chatSection');
    // State to control the visibility of the emoji picker
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Auto-scroll to the latest message
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [chatMessages, chatRef]);

    // Handle emoji selection
    const onEmojiClick = (emojiObject) => {
        setNewMessage((prev) => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    return (
        <Paper className="lobby-card chat-card">
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" className="section-title">{t('chat')}</Typography>
                <Box ref={chatRef} className="chat-messages">
                    {chatMessages.map((msg, index) => {
                        // Identify system messages (e.g., join/leave notifications)
                        const isSystemMessage =
                            msg.content.includes("left the lobby") ||
                            msg.content.includes("joined the lobby") || msg.is_system;

                        const isSent = !isSystemMessage && msg.user === userName;
                        const avatarSrc = msg.avatar_url ? `http://localhost:8081/uploads/${msg.avatar_url}` : null;
                        const initial = msg.user ? msg.user.charAt(0).toUpperCase() : "?";

                        // Render system messages
                        if (isSystemMessage) {
                            return (
                                <Box key={index} className="system-message">
                                    <Typography className="message-content" variant="body2">
                                        {t('systemMessage', { message: msg.content })}
                                    </Typography>
                                </Box>
                            );
                        }

                        // Render user messages
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
                {/* Display typing indicator if someone is typing */}
                {typingUser && (
                    <Typography className="typing-indicator">{t('typingIndicator', { user: typingUser })}</Typography>
                )}
                {/* Chat input for joined users */}
                {isJoined && (
                    <Box className="chat-input" sx={{ display: 'flex', alignItems: 'center', mt: 1, position: 'relative' }}>
                        {/* Emoji picker button */}
                        <IconButton
                            onClick={() => setShowEmojiPicker((prev) => !prev)}
                            sx={{
                                p: 1,
                                borderRadius: "8px",
                                transition: "0.3s",
                            }}
                        >
                            <EmojiEmotions sx={{ color: mode === "dark" ? "primary.dark" : "primary.main" }} />
                        </IconButton>
                        {/* Emoji picker */}
                        {showEmojiPicker && (
                            <Box sx={{ position: 'absolute', bottom: '60px', left: 0, zIndex: 1000 }}>
                                <Picker onEmojiClick={onEmojiClick} />
                            </Box>
                        )}
                        {/* Message input field */}
                        <TextField
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                handleTyping();
                            }}
                            onKeyPress={(e) => {
                                if (e.key === "Enter") handleSendMessage();
                            }}
                            placeholder={t('messagePlaceholder')}
                            fullWidth
                            size="small"
                            variant="outlined"
                        />
                        {/* Send button */}
                        <IconButton
                            onClick={handleSendMessage}
                            sx={{
                                ml: 1,
                                backgroundColor: "primary.main",
                                transition: "0.3s",
                                "&:hover": {
                                    backgroundColor: "primary.dark",
                                },
                            }}
                        >
                            <Send sx={{ color: "white" }} />
                        </IconButton>
                    </Box>
                )}
            </Box>
        </Paper>
    );
};

export default ChatSection;