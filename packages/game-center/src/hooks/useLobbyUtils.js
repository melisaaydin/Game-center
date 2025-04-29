// Custom hook to provide utility functions and filtered lobby lists
const useLobbyUtils = (lobbies) => {
    // Format the start time of a lobby for display
    const getTimeDisplay = (startTime) => {
        const now = new Date();
        const start = new Date(startTime);
        const timeDiff = start - now;

        // If the event has started, show a message
        if (timeDiff <= 0) return "Event started!";
        const hoursLeft = timeDiff / (1000 * 60 * 60);
        // Show a countdown if the event is within 24 hours
        if (hoursLeft < 24) {
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
            return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        } else {
            // Show the full date if the event is more than 24 hours away
            return `Starts: ${start.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
        }
    };

    // Get the current time for filtering
    const now = new Date();

    // Filter lobbies that are events and haven't ended yet
    const eventLobbies = lobbies
        .filter((lobby) =>
            lobby.is_event &&
            lobby.lobby_status === 'active' &&
            (!lobby.end_time || new Date(lobby.end_time) > now)
        )
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Filter lobbies that are not events
    const activeLobbies = lobbies.filter((lobby) => !lobby.is_event);


    return { getTimeDisplay, eventLobbies, activeLobbies };
};

export default useLobbyUtils;