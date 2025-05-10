const playNotificationSound = () => {
    const audio = new Audio("/notification.wav");
    audio.play().catch((err) => console.error("Ses çalma hatası:", err));
};

export const handleNotification = (message) => {
    if (document.hidden) {
        playNotificationSound();
    }
};