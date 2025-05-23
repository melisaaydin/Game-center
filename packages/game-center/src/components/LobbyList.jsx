import { Box, Typography, List, ListItem, ListItemText, Button, IconButton } from "@mui/material";
import { Lock, Event, Delete, Edit } from "@mui/icons-material";
import { useTranslation } from 'react-i18next';

function LobbyList({
    eventLobbies,
    activeLobbies,
    getTimeDisplay,
    onViewDetails,
    userId,
    onDeleteClick,
    onEditClick,
}) {
    const { t } = useTranslation('lobbyList');

    return (
        <Box>
            {eventLobbies.length > 0 && (
                <>
                    <Typography variant="h6" className="section-title">{t('eventLobbies')}</Typography>
                    <List>
                        {eventLobbies.map((lobby) => (
                            <ListItem key={lobby.id} sx={{ display: "flex", alignItems: "center" }}>
                                <ListItemText
                                    primary={lobby.name}
                                    secondary={
                                        <>
                                            {t('players', { current: lobby.current_players, max: lobby.max_players })} <br />
                                            {lobby.start_time && getTimeDisplay(lobby.start_time)}
                                        </>
                                    }
                                />
                                <Box className="lobby-actions">
                                    {lobby.password && <Lock fontSize="small" />}
                                    <Event fontSize="small" />
                                    {parseInt(lobby.created_by) === parseInt(userId) && (
                                        <>
                                            <IconButton onClick={() => onEditClick(lobby)} title={t('editLobby')}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton onClick={() => onDeleteClick(lobby.id)} title={t('deleteLobby')} color="error">
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                    <Button
                                        className="lobby-action-button"
                                        variant="contained"
                                        onClick={() => onViewDetails(lobby.id)}
                                    >
                                        {t('viewDetails')}
                                    </Button>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                </>
            )}

            <Typography variant="h6" className="section-title" sx={{ mt: eventLobbies.length > 0 ? 2 : 0 }}>
                {t('activeLobbies')}
            </Typography>
            <List>
                {activeLobbies.length > 0 ? (
                    activeLobbies.map((lobby) => (
                        <ListItem key={lobby.id} sx={{ display: "flex", alignItems: "center" }}>
                            <ListItemText
                                primary={lobby.name}
                                secondary={t('players', { current: lobby.current_players, max: lobby.max_players })}
                            />
                            <Box className="lobby-actions">
                                {lobby.password && <Lock fontSize="small" />}
                                <Button
                                    className="lobby-action-button"
                                    variant="contained"
                                    onClick={() => onViewDetails(lobby.id)}
                                >
                                    {t('viewDetails')}
                                </Button>
                                {parseInt(lobby.created_by) === parseInt(userId) && (
                                    <>
                                        <IconButton onClick={() => onEditClick(lobby)} title={t('editLobby')}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton onClick={() => onDeleteClick(lobby.id)} title={t('deleteLobby')} color="error">
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </>
                                )}
                            </Box>
                        </ListItem>
                    ))
                ) : (
                    <Typography>{t('noActiveLobbies')}</Typography>
                )}
            </List>
        </Box>
    );
}

export default LobbyList;