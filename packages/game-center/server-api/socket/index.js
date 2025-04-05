const setupSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("Yeni kullanıcı bağlandı:", socket.id);

        socket.on("joinRoom", (roomId) => {
            socket.join(roomId);
            console.log(`Kullanıcı ${socket.id} odasına katıldı: ${roomId}`);
        });

        socket.on("chatMessage", ({ roomId, userId, message }) => {
            io.to(roomId).emit("chatMessage", { userId, message, timestamp: new Date() });
        });

        socket.on("disconnect", () => {
            console.log("Kullanıcı ayrıldı:", socket.id);
        });
    });
};

export default setupSocket;
