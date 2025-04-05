import React, { useState, useEffect } from "react";
import {
    Button,
    TextField,
    CircularProgress,
    Avatar,
    IconButton,
    InputAdornment,
    Snackbar,
    Alert,
} from "@mui/material";
import axios from "axios";
import "./ProfileSetting.css";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useTheme } from "@mui/material/styles";
import { useContext } from "react";
import { ColorModeContext } from "../../context/ThemeContext";

function ProfileSettings() {
    const { userId } = useParams();
    const { user, setUser, loading } = useUser();
    const navigate = useNavigate();
    const { mode } = useContext(ColorModeContext);
    const theme = useTheme();

    const [userData, setUserData] = useState({ name: "", email: "", profileImage: "" });
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [updateLoading, setUpdateLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");

    useEffect(() => {
        if (loading) return;
        if (!userId || !user || userId !== String(user.id)) {
            setErrorMessage("Kullanıcı ID'si geçersiz veya eşleşmiyor.");
            return;
        }

        const fetchUserData = async () => {
            try {
                const response = await axios.get(`http://localhost:8081/users/user/${userId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                setUserData({
                    name: response.data.name || "",
                    email: response.data.email || "",
                    profileImage: response.data.avatar_url || "",
                });
            } catch (error) {
                setErrorMessage("Kullanıcı verileri yüklenemedi.");
            }
        };

        fetchUserData();
    }, [userId, user, loading]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleUpdateProfile = async (event) => {
        event.preventDefault();
        if (newPassword && newPassword !== confirmNewPassword) {
            setErrorMessage("Yeni şifreler eşleşmiyor!");
            setSnackbarMessage("Yeni şifreler eşleşmiyor!");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
        }

        const formData = new FormData();
        formData.append("name", userData.name);
        formData.append("email", userData.email);
        if (currentPassword && newPassword) {
            formData.append("oldPassword", currentPassword);
            formData.append("newPassword", newPassword);
        }
        if (selectedFile) {
            formData.append("avatar", selectedFile);
        }

        try {
            setUpdateLoading(true);
            const response = await axios.put(`http://localhost:8081/users/user/${userId}`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setUser((prev) => ({
                ...prev,
                name: response.data.user.name,
                email: response.data.user.email,
                avatar_url: response.data.user.avatar_url,
            }));
            setSnackbarMessage("Profil başarıyla güncellendi!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            setTimeout(() => navigate("/"), 2000); // 2 saniye sonra yönlendirme
        } catch (error) {
            setErrorMessage("Güncelleme sırasında hata oluştu: " + (error.response?.data?.message || error.message));
            setSnackbarMessage("Profil güncellenemedi: " + (error.response?.data?.message || error.message));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleClickShowPassword = () => setShowPassword(!showPassword);

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbarOpen(false);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className={`profile-container ${mode === "dark" ? "profile-dark" : "profile-light"}`}>
            <div className="form-container">
                <div className="form-title">
                    <span>Profile Settings</span>
                </div>
                <form onSubmit={handleUpdateProfile} encType="multipart/form-data">
                    <div className="avatar-upload">
                        <Avatar
                            className="avatar-profile"
                            src={
                                preview ||
                                (userData.profileImage
                                    ? `http://localhost:8081/uploads/${userData.profileImage}`
                                    : "/default-avatar.png")
                            }
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            id="file-input"
                            style={{ display: "none" }}
                        />
                        <label htmlFor="file-input" className="custom-file-label">
                            Choose File
                        </label>
                    </div>

                    <div className="input-group">
                        <TextField
                            label="Name"
                            name="name"
                            value={userData.name}
                            onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                            fullWidth
                            margin="normal"
                            variant="outlined"
                            InputProps={{ style: { color: theme.palette.text.primary } }}
                        />
                    </div>

                    <div className="input-group">
                        <TextField
                            label="Email"
                            name="email"
                            value={userData.email}
                            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                            fullWidth
                            margin="normal"
                            variant="outlined"
                            InputProps={{ style: { color: theme.palette.text.primary } }}
                        />
                    </div>

                    <div className="input-group">
                        <TextField
                            label="Old Password"
                            name="oldPassword"
                            type={showPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            fullWidth
                            margin="normal"
                            variant="outlined"
                            InputProps={{
                                style: { color: theme.palette.text.primary },
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            style={{ color: "var(--primary-color)" }}
                                            onClick={handleClickShowPassword}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </div>

                    <div className="input-group">
                        <TextField
                            label="New Password"
                            name="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            fullWidth
                            margin="normal"
                            variant="outlined"
                            InputProps={{
                                style: { color: theme.palette.text.primary },
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            style={{ color: "var(--primary-color)" }}
                                            onClick={handleClickShowPassword}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </div>

                    <div className="input-group">
                        <TextField
                            label="Confirm New Password"
                            name="confirmNewPassword"
                            type={showPassword ? "text" : "password"}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            fullWidth
                            margin="normal"
                            variant="outlined"
                            InputProps={{
                                style: { color: theme.palette.text.primary },
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            style={{ color: "var(--primary-color)" }}
                                            onClick={handleClickShowPassword}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </div>

                    {errorMessage && <div className="error-message">{errorMessage}</div>}

                    {updateLoading ? (
                        <CircularProgress />
                    ) : (
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            sx={{
                                backgroundColor: "var(--button-bg)",
                                color: "var(--button-text)",
                                "&:hover": {
                                    backgroundColor: "var(--button-hover-bg)",
                                    color: "var(--button-hover-text)",
                                },
                            }}
                        >
                            Update Profile
                        </Button>
                    )}
                </form>
            </div>

            {/* Snackbar Bildirimi */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "top", horizontal: "left" }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbarSeverity}
                    sx={{
                        width: "100%",
                        color: mode === "dark" ? "#fff" : "#000", // Tema moduna göre yazı rengi
                        bgcolor: mode === "dark" ? "grey.800" : undefined, // Koyu modda arka plan
                    }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
}

export default ProfileSettings;