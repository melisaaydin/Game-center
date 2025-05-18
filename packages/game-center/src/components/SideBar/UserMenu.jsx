import React, { useState } from 'react';
import { Box, IconButton, Avatar, Menu, MenuItem, Button } from '@mui/material';
import { MdLogout, MdLogin, MdSettings } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { ColorModeContext } from '../../context/ThemeContext';
import Coin from '../../assets/star.png';
import { FaPlus } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import NotificationMenu from '../NotificaitonMenu/NotificationMenu';
import { ReactComponent as Sun } from "../../assets/Sun.svg"
import { ReactComponent as Moon } from "../../assets/Moon.svg"
function UserMenu() {
    const { user, logout } = useUser();
    const navigate = useNavigate();
    const { toggleColorMode, mode } = React.useContext(ColorModeContext);
    const [anchorEl, setAnchorEl] = useState(null);

    const handleAvatarClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        handleClose();
        navigate('/login');
    };

    const handleProfileSettings = () => {
        if (!user) {
            navigate('/login');
            handleClose();
            return;
        }
        navigate('/profile/edit');
        handleClose();
    };

    const handleLogin = () => {
        navigate('/login');
        handleClose();
    };

    return (
        <Box className="nav-right">
            <Box className="coin-box">
                <img src={Coin} alt="coin" className="img" />
                <span>{user?.coins || 125363}</span>
                <Button size="small" className="deposit-btn" disableRipple>
                    <Link to="/deposit">
                        <FaPlus /> Deposit
                    </Link>
                </Button>
            </Box>
            <NotificationMenu />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
            </Box>
        </Box>
    );
}

export default UserMenu;