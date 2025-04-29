import axios from "axios";
import io from "socket.io-client";

// Initialize Socket.IO client with reconnection settings
const socket = io("http://localhost:8081", {
    reconnection: true,
    reconnectionAttempts: 5,
});

// Generic API request helper function
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

// Fetch lobby details and messages
const fetchLobbyDetails = async (lobbyId, user, setLobby, setCreatorName, setIsJoined, setError, setSnackbar, navigate) => {
    // Retrieve authentication token from local storage
    const token = localStorage.getItem("token");
    if (!token) {
        setError("Please log in!");
        setSnackbar({ open: true, message: "You need to log in!", severity: "error" });
        navigate("/login");
        return;
    }

    // Fetch lobby details from the server
    const lobbyRes = await apiRequest("get", `http://localhost:8081/lobbies/${lobbyId}`, null, token);
    if (!lobbyRes.success) {
        setError("An error occurred while loading the lobby: " + lobbyRes.message);
        return;
    }

    // Update state with lobby data and creator name
    setLobby(lobbyRes.data);
    setCreatorName(lobbyRes.data.created_by_name || "Unknown User");

    // Check if the user is already in the lobby
    if (user) {
        const playerCheck = lobbyRes.data.players.some((p) => p.id === user.id);
        setIsJoined(playerCheck);
    }

    // Fetch lobby messages
    const messagesRes = await apiRequest("get", `http://localhost:8081/lobbies/${lobbyId}/messages`, null, token);
    if (messagesRes.success) {
        return messagesRes.data.messages || [];
    }
    return [];
};

// Handle leaving a lobby
const leaveLobby = async (lobbyId, userId, setIsJoined, setLobby, setSnackbar, token, setLeaveConfirmOpen) => {
    setSnackbar({ open: false, message: "", severity: "success" });

    // Send request to leave the lobby
    const res = await apiRequest("post", `http://localhost:8081/lobbies/${lobbyId}/leave`, { userId }, token);
    if (res.success) {
        // Update state to reflect user has left
        setIsJoined(false);
        socket.emit("leave_lobby", { lobbyId, userId });

        // Refresh lobby details
        const lobbyRes = await apiRequest("get", `http://localhost:8081/lobbies/${lobbyId}`, null, token);
        if (lobbyRes.success) setLobby(lobbyRes.data);

        // Show success message and close confirmation dialog
        setSnackbar({ open: true, message: "You have left the lobby!", severity: "success" });
        setLeaveConfirmOpen(false);
    } else {
        // Show error message and close confirmation dialog
        setSnackbar({ open: true, message: "Could not leave the lobby!", severity: "error" });
        setLeaveConfirmOpen(false);
    }
};

// Handle deleting a lobby
const deleteLobby = async (lobbyId, setSnackbar, navigate, token) => {
    // Send request to delete the lobby
    const res = await apiRequest("delete", `http://localhost:8081/lobbies/${lobbyId}`, null, token);
    if (res.success && res.data.success) {
        // Show success message and navigate to home
        setSnackbar({ open: true, message: "Lobby deleted successfully!", severity: "success" });
        navigate("/");
    } else {
        // Show error message
        setSnackbar({ open: true, message: "Could not delete lobby: " + (res.message || res.data.message), severity: "error" });
    }
};

// Handle inviting a friend to a lobby
const inviteFriend = async (lobbyId, friendId, userId, lobbyName, setInvitedUsers, setSnackbar, token) => {
    // Send invitation request
    const res = await apiRequest(
        "post",
        `http://localhost:8081/lobbies/${lobbyId}/invite`,
        { receiverId: friendId.toString() },
        token
    );
    if (res.success) {
        // Update invited users list
        setInvitedUsers((prev) => new Set(prev).add(friendId));

        setSnackbar({ open: true, message: res.data.message || "Invitation sent!", severity: "success" });

        // Emit socket event for real-time notification
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

// Handle updating lobby details
const updateLobby = async (lobbyId, updatedData, token) => {
    return await apiRequest("put", `http://localhost:8081/lobbies/${lobbyId}`, updatedData, token);
};

export { socket, fetchLobbyDetails, leaveLobby, deleteLobby, inviteFriend, apiRequest, updateLobby };