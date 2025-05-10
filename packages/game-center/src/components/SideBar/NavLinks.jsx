import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { NAV_LINKS, SOCIAL_LINKS } from '../../utils/constants';

function NavLinks() {
    const location = useLocation();
    return (
        <Box className="sideBar" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flexGrow: 1 }}>
                {NAV_LINKS.map((link) => (
                    <Link
                        key={link.path}
                        className={`link ${location.pathname === link.path ? 'active' : ''}`}
                        to={link.path}
                    >
                        <img src={link.icon} alt={link.label} className="image" />
                        <span className="span">{link.label}</span>

                    </Link>

                ))}
            </Box>
            <Box className="down">
                {SOCIAL_LINKS.map((social) => {
                    return (
                        <a
                            key={social.path}
                            href={social.path}
                            className="link"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {React.createElement(social.icon, { className: 'icon' })}
                            <span className="span">{social.label}</span>
                        </a>
                    );
                })}
            </Box>
        </Box>
    );
}

export default NavLinks;