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
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useUser } from "../../context/UserContext";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useTheme } from "@mui/material/styles";
import { useContext } from "react";
import { ColorModeContext } from "../../context/ThemeContext";

function ProfileSettings() {
    const { t } = useTranslation('profile');
    const { user, setUser, loading } = useUser();
    const navigate = useNavigate();
    const { mode } = useContext(ColorModeContext);
    const theme = useTheme();

    const [userData, setUserData] = useState({ name: "", email: "", bio: "", profileImage: "" });
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
        if (!user) {
            setErrorMessage(t('loginToEditProfile'));
            setSnackbarMessage(t('loginToEditProfile'));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            setTimeout(() => navigate("/login"), 2000);
            return;
        }
        const fetchUserData = async () => {
            try {
                const response = await axios.get(`http://localhost:8081/users/user/${user.id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                setUserData({
                    name: response.data.name || "",
                    email: response.data.email || "",
                    profileImage: response.data.avatar_url || "",
                    bio: response.data.bio || "",
                });
            } catch (error) {
                const errorMsg = error.response?.status === 401
                    ? t('sessionExpired')
                    : t('failedToLoadUserData');
                setErrorMessage(errorMsg);
                setSnackbarMessage(errorMsg);
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
                if (error.response?.status === 401) {
                    setTimeout(() => navigate("/login"), 2000);
                }
            }
        };

        fetchUserData();
    }, [user, loading, navigate, t]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && !["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
            setErrorMessage(t('invalidFileType'));
            setSnackbarMessage(t('invalidFileType'));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
        }
        setSelectedFile(file);
        setPreview(file ? URL.createObjectURL(file) : "");
    };

    const handleUpdateProfile = async (event) => {
        event.preventDefault();
        if (newPassword && newPassword !== confirmNewPassword) {
            setErrorMessage(t('passwordsDoNotMatch'));
            setSnackbarMessage(t('passwordsDoNotMatch'));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
        }
        const formData = new FormData();
        formData.append("name", userData.name);
        formData.append("email", userData.email);
        formData.append("bio", userData.bio);
        if (currentPassword && newPassword) {
            formData.append("oldPassword", currentPassword);
            formData.append("newPassword", newPassword);
        }
        if (selectedFile) {
            formData.append("avatar", selectedFile);
        }

        try {
            setUpdateLoading(true);
            const response = await axios.put(`http://localhost:8081/users/user/${user.id}`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setUser((prev) => ({
                ...prev,
                name: response.data.user.name,
                email: response.data.user.email,
                bio: response.data.user.bio,
                avatar_url: response.data.user.avatar_url,
            }));
            setSnackbarMessage(t('profileUpdated'));
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            setTimeout(() => navigate("/"), 2000);
        } catch (error) {
            const errorMsg = error.response?.status === 401
                ? t('sessionExpired')
                : error.response?.data?.message || t('failedToUpdateProfile');
            setErrorMessage(errorMsg);
            setSnackbarMessage(errorMsg);
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

    if (loading) return <div>{t('loading')}</div>;

    return (
        <div className="profile-container">
            <div className="form-container">
                <div className="form-title">
                    <span>{t('profileSettings')}</span>
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
                            {t('chooseFile')}
                        </label>
                    </div>

                    <div className="input-group">
                        <TextField
                            label={t('name')}
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
                            label={t('email')}
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
                            label={t('bio')}
                            name="bio"
                            value={userData.bio}
                            onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                            fullWidth
                            margin="normal"
                            variant="outlined"
                            multiline
                            rows={4}
                            InputProps={{ style: { color: theme.palette.text.primary } }}
                        />
                    </div>
                    <div className="input-group">
                        <TextField
                            label={t('oldPassword')}
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
                            label={t('newPassword')}
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
                            label={t('confirmNewPassword')}
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
                                backgroundColor: theme.palette.primary.main,
                                color: theme.palette.buttonText,
                                "&:hover": {
                                    backgroundColor: theme.palette.buttonHoverBg,
                                    color: theme.palette.buttonHoverText,
                                },
                            }}
                        >
                            {t('updateProfile')}
                        </Button>
                    )}
                </form>
            </div>
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
                        color: mode === "dark" ? "#fff" : "#000",
                        bgcolor: mode === "dark" ? "grey.800" : undefined,
                    }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
}

export default ProfileSettings;