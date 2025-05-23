import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { NAV_LINKS, SOCIAL_LINKS } from '../../utils/constants';
import { useTranslation } from 'react-i18next';

function NavLinks() {
    const { t } = useTranslation('navLinks');
    const location = useLocation();

    return (
        <Box className="sideBar" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flexGrow: 1 }}>
                {NAV_LINKS.map((link) => (
                    <Link
                        key={link.key}
                        className={`link ${location.pathname === link.path ? 'active' : ''}`}
                        to={link.path}
                    >
                        <img src={link.icon} alt={t(link.key)} className="image" />
                        <span className="span">{t(link.key)}</span>
                    </Link>
                ))}
            </Box>
            <Box className="down">
                {SOCIAL_LINKS.map((social) => (
                    <a
                        key={social.path}
                        href={social.path}
                        className="link"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {React.createElement(social.icon, { className: 'icon' })}
                        <span className="span">{t(social.key)}</span>
                    </a>
                ))}
            </Box>
        </Box>
    );
}

export default NavLinks;