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
    //Get user data,setUser function,and loading state from the UserContext.
    const { user, setUser, loading } = useUser();
    const navigate = useNavigate();
    const { mode } = useContext(ColorModeContext);
    const theme = useTheme();

    // State to store user data like name, email, bio, and profile image.
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
    // useEffect to fetch user data when the component mounts or user/loading state changes.
    useEffect(() => {
        if (loading) return;
        // If no user is logged in, show an error and redirect to login.
        if (!user) {
            setErrorMessage("Please log in to edit your profile.");
            setSnackbarMessage("Please log in to edit your profile.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            setTimeout(() => navigate("/login"), 2000);
            return;
        }
        // Function to fetch user data from the backend.
        const fetchUserData = async () => {
            try {
                // Make a GET request to fetch user profile details.
                const response = await axios.get(`http://localhost:8081/users/user/${user.id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                // Update userData state with the fetched data.
                setUserData({
                    name: response.data.name || "",
                    email: response.data.email || "",
                    profileImage: response.data.avatar_url || "",
                    bio: response.data.bio || "",
                });
            } catch (error) {
                const errorMsg = error.response?.status === 401
                    ? "Session expired. Please log in again."
                    : "Failed to load user data.";
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
    }, [user, loading, navigate]);
    // Handle file selection for profile image upload.
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && !["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
            setErrorMessage("Please select a valid image file (JPEG, PNG, or GIF).");
            setSnackbarMessage("Invalid file type. Please select an image.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
        }
        setSelectedFile(file);
        setPreview(file ? URL.createObjectURL(file) : "");
    };
    // Handle form submission to update the user profile.
    const handleUpdateProfile = async (event) => {
        event.preventDefault();
        if (newPassword && newPassword !== confirmNewPassword) {
            setErrorMessage("New passwords do not match!");
            setSnackbarMessage("New passwords do not match!");
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
        // Include the profile image if a new one is selected.
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
            // Update the user context with the new profile data.
            setUser((prev) => ({
                ...prev,
                name: response.data.user.name,
                email: response.data.user.email,
                bio: response.data.user.bio,
                avatar_url: response.data.user.avatar_url,
            }));
            setSnackbarMessage("Profile updated successfully!");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            setTimeout(() => navigate("/"), 2000);
        } catch (error) {
            const errorMsg = error.response?.status === 401
                ? "Session expired. Please log in again."
                : error.response?.data?.message || "Failed to update profile.";
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

    if (loading) return <div>Loading...</div>;

    return (
        <div className="profile-container">
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
                            label="Biography"
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
                                backgroundColor: theme.palette.primary.main,
                                color: theme.palette.buttonText,
                                "&:hover": {
                                    backgroundColor: theme.palette.buttonHoverBg,
                                    color: theme.palette.buttonHoverText,
                                },
                            }}
                        >
                            Update Profile
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