import axios from "axios";
import io from "socket.io-client";

const socket = io("http://localhost:8081", {
    reconnection: true,
    reconnectionAttempts: 5,
});

// API çağrıları için genel bir yardımcı fonksiyon
const apiRequest = async (method, url, data = null, token) => {
    try {
        const config = {
            method,
            url,
            headers: { Authorization: `Bearer ${token}` },
            data,
        };
        const res = await axios(config);
        return { success: true, data: res.data };
    } catch (err) {
        return { success: false, message: err.response?.data?.message || err.message };
    }
};

// Lobby detaylarını çekme
const fetchLobbyDetails = async (lobbyId, user, setLobby, setCreatorName, setIsJoined, setError, setSnackbar, navigate) => {
    const token = localStorage.getItem("token");
    if (!token) {
        setError("Please log in!");
        setSnackbar({ open: true, message: "You need to log in!", severity: "error" });
        navigate("/login");
        return;
    }

    const lobbyRes = await apiRequest("get", `http://localhost:8081/lobbies/${lobbyId}`, null, token);
    if (!lobbyRes.success) {
        setError("An error occurred while loading the lobby: " + lobbyRes.message);
        return;
    }

    setLobby(lobbyRes.data);
    setCreatorName(lobbyRes.data.created_by_name || "Unknown User");

    if (user) {
        const playerCheck = lobbyRes.data.players.some((p) => p.id === user.id);
        setIsJoined(playerCheck);
    }

    const messagesRes = await apiRequest("get", `http://localhost:8081/lobbies/${lobbyId}/messages`, null, token);
    if (messagesRes.success) {
        return messagesRes.data.messages || [];
    }
    return [];
};

// Lobiden ayrılma işlemi
const leaveLobby = async (lobbyId, userId, setIsJoined, setLobby, setSnackbar, token, setLeaveConfirmOpen) => {
    // Önce önceki snackbar'ı kapat
    setSnackbar({ open: false, message: "", severity: "success" });

    const res = await apiRequest("post", `http://localhost:8081/lobbies/${lobbyId}/leave`, { userId }, token);
    if (res.success) {
        setIsJoined(false);
        socket.emit("leave_lobby", { lobbyId, userId });
        const lobbyRes = await apiRequest("get", `http://localhost:8081/lobbies/${lobbyId}`, null, token);
        if (lobbyRes.success) setLobby(lobbyRes.data);
        setSnackbar({ open: true, message: "You have left the lobby!", severity: "success" });
        setLeaveConfirmOpen(false); // Dialogu kapat
    } else {
        setSnackbar({ open: true, message: "Could not leave the lobby!", severity: "error" });
        setLeaveConfirmOpen(false); // Hata durumunda da dialogu kapat
    }
};

// Lobby silme işlemi
const deleteLobby = async (lobbyId, setSnackbar, navigate, token) => {
    const res = await apiRequest("delete", `http://localhost:8081/lobbies/${lobbyId}`, null, token);
    if (res.success && res.data.success) {
        setSnackbar({ open: true, message: "Lobby deleted successfully!", severity: "success" });
        navigate("/");
    } else {
        setSnackbar({ open: true, message: "Could not delete lobby: " + (res.message || res.data.message), severity: "error" });
    }
};

// Arkadaşları davet etme işlemi
const inviteFriend = async (lobbyId, friendId, userId, lobbyName, setInvitedUsers, setSnackbar, token) => {
    const res = await apiRequest(
        "post",
        `http://localhost:8081/lobbies/${lobbyId}/invite`,
        { receiverId: friendId.toString() },
        token
    );
    if (res.success) {
        setInvitedUsers((prev) => new Set(prev).add(friendId));
        setSnackbar({ open: true, message: res.data.message || "Invitation sent!", severity: "success" });
        socket.emit("lobby_invite", {
            lobbyId,
            userId,
            invitedUserId: friendId,
            lobbyName,
            invitationId: res.data.invitationId,
        });
    } else {
        setSnackbar({ open: true, message: "Failed to send invitation: " + res.message, severity: "error" });
    }
};

export { socket, fetchLobbyDetails, leaveLobby, deleteLobby, inviteFriend, apiRequest };