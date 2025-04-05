import React from 'react'

import { BsDiscord } from "react-icons/bs";
import { FaFacebookF } from "react-icons/fa";
import { IoLogoGoogle } from "react-icons/io5";
import { SocialContainer, IconWrapper } from './SocialProp'
function SocialConnect() {
    const openWindow = (url) => {
        const width = 600;
        const height = 600;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        window.open(url, '_blank', `width=${width},height=${height},top=${top},left=${left}`);
    };
    const openGoogleLogin = () => {
        window.open('https://accounts.google.com/o/oauth2/v2/auth?scope=openid%20profile%20email&response_type=code&redirect_uri=YOUR_REDIRECT_URI&client_id=YOUR_CLIENT_ID',
            '_blank', 'width=600,height=700');
    }
    const openFacebookLogin = () => {
        window.open('https://accounts.google.com/o/oauth2/v2/auth?scope=openid%20profile%20email&response_type=code&redirect_uri=YOUR_REDIRECT_URI&client_id=YOUR_CLIENT_ID',
            '_blank', 'width=600,height=700');
    };

    const openDiscordLogin = () => {
        window.open('https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=identify&redirect_uri=YOUR_REDIRECT_URI&response_type=code',
            '_blank', 'width=600,height=700');
    };
    return (
        <SocialContainer>
            <IconWrapper onClick={openGoogleLogin}>
                <IoLogoGoogle />
            </IconWrapper>
            <IconWrapper onClick={openFacebookLogin}>
                <FaFacebookF />
            </IconWrapper>
            <IconWrapper onClick={openDiscordLogin}>
                <BsDiscord />
            </IconWrapper>
        </SocialContainer>
    )
}

export default SocialConnect