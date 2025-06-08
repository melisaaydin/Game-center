import React, { useState, useEffect } from "react";
import {
    Button,
    TextField,
    CircularProgress,
    Avatar,
    IconButton,
    InputAdornment,
} from "@mui/material";
import axios from "axios";
import "./ProfileSetting.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useUser } from "../../context/UserContext";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useTheme } from "@mui/material/styles";
import { toast } from "react-toastify";

function ProfileSettings() {
    // Get translation function for the 'profile' namespace
    const { t } = useTranslation('profile');
    // Access user data, update function, and loading state from UserContext
    const { user, setUser, loading } = useUser();
    // Hook to navigate programmatically to other routes
    const navigate = useNavigate();
    const theme = useTheme();
    // State to store user profile data like name, email, bio, and image
    const [userData, setUserData] = useState({ name: "", email: "", bio: "", profileImage: "" });
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [updateLoading, setUpdateLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Fetch user data on component mount or when user/loading changes
    useEffect(() => {
        // Wait for loading to complete; redirect to login if no user
        if (loading) return;
        if (!user) {
            setErrorMessage(t('loginToEditProfile'));
            toast.error(t('loginToEditProfile'));
            setTimeout(() => navigate("/login"), 2000);
            return;
        }
        // Function to fetch user data from the server
        const fetchUserData = async () => {
            try {
                const response = await axios.get(`http://localhost:8081/users/user/${user.id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                // Update state with fetched user data, defaulting to empty strings if null
                setUserData({
                    name: response.data.name || "",
                    email: response.data.email || "",
                    profileImage: response.data.avatar_url || "",
                    bio: response.data.bio || "",
                });
            } catch (error) {
                // Handle errors, such as session expiration or failed data fetch
                const errorMsg = error.response?.status === 401
                    ? t('sessionExpired')
                    : t('failedToLoadUserData');
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
                if (error.response?.status === 401) {
                    setTimeout(() => navigate("/login"), 2000);
                }
            }
        };

        // Call the fetch function
        fetchUserData();
    }, [user, loading, navigate, t]);

    // Handle file selection for profile image upload
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        // Validate file type; only allow images
        if (file && !["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
            setErrorMessage(t('invalidFileType'));
            toast.error(t('invalidFileType'));
            return;
        }
        setSelectedFile(file);
        // Create a preview URL for the selected image
        setPreview(file ? URL.createObjectURL(file) : "");
    };

    // Handle form submission to update the user profile
    const handleUpdateProfile = async (event) => {
        event.preventDefault();
        // Check if passwords match when a new password is provided
        if (newPassword && newPassword !== confirmNewPassword) {
            setErrorMessage(t('passwordsDoNotMatch'));
            toast.error(t('passwordsDoNotMatch'));
            return;
        }
        // Prepare form data for the update request
        const formData = new FormData();
        formData.append("name", userData.name);
        formData.append("email", userData.email);
        formData.append("bio", userData.bio);
        // Include password fields only if both are provided
        if (currentPassword && newPassword) {
            formData.append("oldPassword", currentPassword);
            formData.append("newPassword", newPassword);
        }
        // Add the selected file if a new image is uploaded
        if (selectedFile) {
            formData.append("avatar", selectedFile);
        }

        try {
            // Start loading state during the update
            setUpdateLoading(true);
            const response = await axios.put(`http://localhost:8081/users/user/${user.id}`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            // Update user context with the new profile data
            setUser((prev) => ({
                ...prev,
                name: response.data.user.name,
                email: response.data.user.email,
                bio: response.data.user.bio,
                avatar_url: response.data.user.avatar_url,
            }));
            toast.success(t('profileUpdated'));
            // Redirect to home after a successful update
            setTimeout(() => navigate("/"), 2000);
        } catch (error) {
            // Handle errors, such as session expiration or update failure
            const errorMsg = error.response?.status === 401
                ? t('sessionExpired')
                : error.response?.data?.message || t('failedToUpdateProfile');
            setErrorMessage(errorMsg);
            toast.error(errorMsg);
        } finally {
            // Stop loading state regardless of success or failure
            setUpdateLoading(false);
        }
    };

    // Toggle password visibility for input fields
    const handleClickShowPassword = () => setShowPassword(!showPassword);

    // Show a loading message while user data is being fetched
    if (loading) return <div>{t('loading')}</div>;

    // Render the profile settings form
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
                        // Display the update button with theme-based styling
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
        </div>
    );
}

export default ProfileSettings;