import { apiRequest } from "../utils/lobbyUtils";
import { useTranslation } from 'react-i18next';

const useLobbyUtils = (lobbies) => {
    const { t } = useTranslation('lobbyList');
    const getTimeDisplay = (startTime) => {
        const now = new Date();
        const start = new Date(startTime);
        const timeDiff = start - now;

        if (timeDiff <= 0) return t('eventStarted');
        const hoursLeft = timeDiff / (1000 * 60 * 60);
        if (hoursLeft < 24) {
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
            return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        } else {
            return t('startTime', { date: start.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) });
        }
    };

    const updateLobby = async (lobbyId, updatedData, token) => {
        return await apiRequest("put", `http://localhost:8081/lobbies/${lobbyId}`, updatedData, token);
    };

    const now = new Date();

    const eventLobbies = lobbies
        .filter((lobby) =>
            lobby.is_event &&
            lobby.lobby_status === 'active' &&
            (!lobby.end_time || new Date(lobby.end_time) > now)
        )
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const activeLobbies = lobbies.filter((lobby) => !lobby.is_event);

    return { getTimeDisplay, updateLobby, eventLobbies, activeLobbies };
};

export default useLobbyUtils;