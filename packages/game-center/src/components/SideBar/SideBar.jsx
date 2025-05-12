import React, { useState, useRef } from 'react';
import { Box, CssBaseline, useTheme, Button } from '@mui/material';
import Logo from '../../assets/mlslogoo.png';
import { Link } from 'react-router-dom';
import NavLinks from './NavLinks';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import { useUser } from '../../context/UserContext';
import './SideBar.css';
import { TABS } from '../../utils/constants';

function SideBar() {
    const theme = useTheme();
    const { loading } = useUser();
    const [activeTab, setActiveTab] = useState('games');
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef(null);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Box
                sx={{
                    width: isOpen ? 80 : 0,
                    backgroundColor: theme.palette.background.default,
                    position: 'fixed',
                    top: 70,
                    height: 'calc(100vh - 70px)',
                    zIndex: 1000,
                    transition: 'width 0.3s',
                }}
            >

                <NavLinks />
            </Box>
            <Box sx={{ flexGrow: 1, ml: '80px' }}>
                <CssBaseline />
                <Box
                    className="navbar-up"
                    sx={{
                        backgroundColor: theme.palette.background.paper,
                        display: 'flex',
                        alignItems: 'center',
                        p: '0 20px',
                    }}
                >
                    <Box className="nav-left" sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <Link to="/">
                            <img src={Logo} alt="logo" className="logo" />
                        </Link>
                        <SearchBar searchRef={searchRef} />
                    </Box>
                    <Box className="nav-center" sx={{ display: 'flex', alignItems: 'center', flexGrow: 18 }}>
                        <Box className="nav-tab-wrapper">
                            <span className={`tab-indicator ${activeTab}`} />
                            {TABS.map((tab) => (
                                <Button
                                    key={tab.id}
                                    disableRipple
                                    className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {React.createElement(tab.icon)}
                                    <span>{tab.label}</span>
                                </Button>
                            ))}
                        </Box>
                    </Box>
                    <UserMenu />
                </Box>

            </Box>
        </Box>
    );
}

export default SideBar;