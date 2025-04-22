const useLobbyUtils = (lobbies) => {
    const getTimeDisplay = (startTime) => {
        const now = new Date();
        const start = new Date(startTime);
        const timeDiff = start - now;

        if (timeDiff <= 0) return "Event start!";
        const hoursLeft = timeDiff / (1000 * 60 * 60);
        if (hoursLeft < 24) {
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
            return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        } else {
            return `Başlangıç: ${start.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
        }
    };

    const now = new Date();
    const eventLobbies = lobbies
        .filter((lobby) => lobby.is_event && new Date(lobby.end_time) > now)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const activeLobbies = lobbies
        .filter((lobby) => !lobby.is_event || (lobby.is_event && new Date(lobby.end_time) > now))
        .filter((lobby) => !lobby.is_event);
    const pastLobbies = lobbies.filter((lobby) => lobby.is_event && new Date(lobby.end_time) <= now);



    return { getTimeDisplay, eventLobbies, activeLobbies, pastLobbies };
};

export default useLobbyUtils;