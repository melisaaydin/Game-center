import React from 'react';
import { BsDiscord } from "react-icons/bs";
import { FaFacebookF } from "react-icons/fa";
import { IoLogoGoogle } from "react-icons/io5";
import { SocialContainer, IconWrapper } from './SocialProp';

function SocialConnect() {
    const openPopup = (url) => {
        const width = 600;
        const height = 600;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        window.open(url, '_blank', `width=${width},height=${height},top=${top},left=${left}`);
    };

    const openGoogleLogin = () => {
        const googleUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
            'scope=openid%20profile%20email&' +
            'response_type=code&' +
            'redirect_uri=YOUR_REDIRECT_URI&' +
            'client_id=YOUR_CLIENT_ID';
        openPopup(googleUrl);
    };

    const openFacebookLogin = () => {
        const facebookUrl = 'https://www.facebook.com/v12.0/dialog/oauth?' +
            'client_id=YOUR_CLIENT_ID&' +
            'redirect_uri=YOUR_REDIRECT_URI&' +
            'response_type=code&' +
            'scope=email,public_profile';
        openPopup(facebookUrl);
    };

    const openDiscordLogin = () => {
        const discordUrl = 'https://discord.com/oauth2/authorize?' +
            'client_id=YOUR_CLIENT_ID&' +
            'redirect_uri=YOUR_REDIRECT_URI&' +
            'response_type=code&' +
            'scope=identify';
        openPopup(discordUrl);
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
    );
}

export default SocialConnect;
