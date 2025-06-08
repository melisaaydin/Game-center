import React, { useState, useContext } from 'react';
import { Box, IconButton, Avatar, Menu, MenuItem, Button } from '@mui/material';
import { MdLogout, MdLogin, MdSettings } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { ColorModeContext } from '../../context/ThemeContext';
import Coin from '../../assets/star.png';
import { FaPlus } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import NotificationMenu from '../NotificaitonMenu/NotificationMenu';
import { ReactComponent as Sun } from "../../assets/Sun.svg";
import { ReactComponent as Moon } from "../../assets/Moon.svg";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';

function UserMenu() {
    // Initializing translation hook for multilingual support
    const { t } = useTranslation('userMenu');
    // Accessing user data and logout function from context
    const { user, logout } = useUser();
    // Setting up navigation for redirects
    const navigate = useNavigate();
    // Accessing theme context for toggling color mode
    const { toggleColorMode, mode } = useContext(ColorModeContext);
    // Managing menu anchor state for dropdown
    const [anchorEl, setAnchorEl] = useState(null);

    // Opening the menu on avatar click
    const handleAvatarClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    // Handling user logout and redirecting to login
    const handleLogout = () => {
        logout();
        handleClose();
        navigate('/login');
    };

    // Navigating to profile settings or login based on user state
    const handleProfileSettings = () => {
        if (!user) {
            navigate('/login');
            handleClose();
            return;
        }
        navigate('/profile/edit');
        handleClose();
    };

    // Redirecting to login page
    const handleLogin = () => {
        navigate('/login');
        handleClose();
    };

    // Rendering the user menu with coins, notifications, and theme toggle
    return (
        <Box className="nav-right">
            <Box className="coin-box">
                <img src={Coin} alt="coin" className="img" />
                <span>{t('coins', { count: user?.coins || 125363 })}</span>
                <Button size="small" className="deposit-btn" disableRipple>
                    <Link to="/deposit">
                        <FaPlus /> {t('deposit')}
                    </Link>
                </Button>
            </Box>
            <NotificationMenu />
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
            >
                {user ? (
                    [
                        <MenuItem key="profile-settings" onClick={handleProfileSettings}>
                            <MdSettings style={{ marginRight: 8 }} /> {t('profileSettings')}
                        </MenuItem>,
                        <MenuItem key="logout" onClick={handleLogout}>
                            <MdLogout style={{ marginRight: 8 }} />{t('logout')}
                        </MenuItem>,
                    ]
                ) : (
                    <MenuItem key="login" onClick={handleLogin}>
                        <MdLogin style={{ marginRight: 8 }} /> {t('login')}
                    </MenuItem>
                )}
            </Menu>
            <div className='dark_mode'>
                <input
                    className='dark_mode_input'
                    type='checkbox'
                    id='darkmode-toggle'
                    onChange={toggleColorMode}
                />
                <label className='dark_mode_label' htmlFor='darkmode-toggle'>
                    <Sun />
                    <Moon />
                </label>
            </div>
            <div className='language-sw'>
                <LanguageSwitcher />
            </div>
        </Box>
    );
}

export default UserMenu;