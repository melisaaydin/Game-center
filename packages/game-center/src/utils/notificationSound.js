const playNotificationSound = () => {
    const audio = new Audio("/notification.wav");
    audio.play().catch((err) => console.error("Ses çalma hatası:", err));
};

export const handleNotification = (message, isTabActive) => {
    if (!isTabActive) {
        playNotificationSound();
        document.title = `New notifications: ${message}`;
        setTimeout(() => {
            document.title = "Game Lobby";
        }, 5000);
    }
};