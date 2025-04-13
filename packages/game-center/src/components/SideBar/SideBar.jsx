import React, { useContext, useState } from 'react';
import { Button, Box, CssBaseline, Avatar, Switch, IconButton, Menu, MenuItem } from '@mui/material';
import Logo from '../../assets/mlslogoo.png';
import { IoSearch, IoNotifications } from "react-icons/io5";
import './SideBar.css';
import { FaPlus } from "react-icons/fa6";
import { Link, useNavigate } from 'react-router-dom';
import { MdLogout, MdLogin, MdSettings } from "react-icons/md";
import Cup from '../../assets/cup.png';
import Coin from '../../assets/star.png';
import Settings from '../../assets/settings.png';
import { useTheme } from '@mui/material/styles';
import Friends from '../../assets/friendship.png';
import { MdGames } from "react-icons/md";
import Home from '../../assets/home.png';
import { RiSwordLine } from "react-icons/ri";
import { ColorModeContext } from "../../context/ThemeContext";
import { useUser } from '../../context/UserContext';
import { FaYoutube } from "react-icons/fa";
import { FaTwitter } from "react-icons/fa6";
import { FaTelegramPlane } from "react-icons/fa";

function SideBar() {
    const { toggleColorMode, mode } = useContext(ColorModeContext);
    const theme = useTheme();
    const { user, logout, loading } = useUser();
    const [activeTab, setActiveTab] = useState("games");
    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();

    if (loading) {
        return <div>Loading...</div>;
    }

    const handleAvatarClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        handleClose();
        navigate("/login");
    };

    const handleProfileSettings = () => {
        if (user?.id) {
            navigate(`/users/user/${user.id}`);
        } else {
            console.error("User ID bulunamadı!");
        }
        handleClose();
    };

    const handleLogin = () => {
        navigate("/login");
        handleClose();
    };

    return (
        <Box>
            <Box>
                <Box sx={{ backgroundColor: theme.palette.background.default }}>
                    <Box className="sideBar">
                        <div>
                            <Link className="link" to="/">
                                <img src={Home} alt="" className="image" />
                                <span className="span">Home</span>
                            </Link>
                            <Link className="link" to="/">
                                <img src={Cup} alt="" className="image" />
                                <span className="span">LeaderBoard</span>
                            </Link>
                            <Link className="link" to="/">
                                <img src={Friends} alt="" className="image" />
                                <span className="span">Friends</span>
                            </Link>
                            <Link className="link" to="/">
                                <img src={Settings} alt="" className="image" />
                                <span className="span">Settings</span>
                            </Link>
                        </div>
                        <div className="down">
                            <Link to="/" className="link">
                                <FaYoutube className="icon" />
                            </Link>
                            <Link to="/" className="link">
                                <FaTwitter className="icon" />
                            </Link>
                            <Link to="/" className="link">
                                <FaTelegramPlane className="icon" />
                            </Link>
                        </div>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1 }}>
                <CssBaseline />
                <Box className="navbar-up" sx={{ backgroundColor: theme.palette.background.paper }}>
                    <Box className="nav-left">
                        <Link to="/">
                            <img src={Logo} alt="logo" className="logo" />
                        </Link>
                        <div className="headerSearch">
                            <input type="text" placeholder="Search..." />
                            <Button disableRipple>
                                <IoSearch />
                            </Button>
                        </div>
                    </Box>

                    <Box className="nav-center">
                        <Box className="nav-tab-wrapper">
                            <span className={`tab-indicator ${activeTab}`} />
                            <Button
                                disableRipple
                                disableFocusRipple
                                className={`nav-btn ${activeTab === 'games' ? 'active' : ''}`}
                                onClick={() => setActiveTab("games")}
                            >
                                <MdGames />
                                <span>Games</span>
                            </Button>
                            <Button
                                disableRipple
                                className={`nav-btn matches ${activeTab === 'matches' ? 'active' : ''}`}
                                onClick={() => setActiveTab("matches")}
                            >
                                <RiSwordLine />
                                <span>Matches</span>
                            </Button>
                        </Box>
                    </Box>

                    <Box className="nav-right">
                        <Box className="coin-box">
                            <img src={Coin} alt="coin" className="img" />
                            <span>125363</span>
                            <Button size="small" className="deposit-btn" disableRipple>
                                <Link to="/deposit">
                                    <FaPlus /> Deposit
                                </Link>
                            </Button>
                        </Box>
                        <Box>
                            <IconButton className="right-icon" disableRipple>
                                <IoNotifications />
                            </IconButton>
                            <IconButton disableRipple onClick={handleAvatarClick}>
                                <Avatar
                                    className="avatar"
                                    src={user?.avatar_url ? `http://localhost:8081/uploads/${user.avatar_url}` : '/default-avatar.png'}
                                />
                            </IconButton>
                            <Menu
                                className="menu"
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                                sx={{
                                    '& .MuiPaper-root': {
                                        backgroundColor: theme.palette.background.default,
                                        color: theme.palette.text.primary,
                                    },
                                }}
                            >
                                {user ? (
                                    [
                                        <MenuItem key="profile-settings" onClick={handleProfileSettings}>
                                            <MdSettings style={{ marginRight: 8 }} /> Profile Settings
                                        </MenuItem>,
                                        <MenuItem key="logout" onClick={handleLogout}>
                                            <MdLogout style={{ marginRight: 8 }} /> Logout
                                        </MenuItem>,
                                    ]
                                ) : (
                                    <MenuItem key="login" onClick={handleLogin}>
                                        <MdLogin style={{ marginRight: 8 }} /> Login
                                    </MenuItem>
                                )}
                            </Menu>
                            <Switch onChange={toggleColorMode} checked={mode === 'dark'} />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

export default SideBar;