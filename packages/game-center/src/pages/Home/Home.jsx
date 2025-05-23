import React, { useContext } from 'react';
import './Home.css';
import GameList from '../../components/GameList/GameList';
import LobbySection from '../../components/LobbySection/LobbySection';
import { ColorModeContext } from "../../context/ThemeContext";
import Slides from '../../components/Slides/Slides';
import { useTranslation } from 'react-i18next';

const Home = () => {
    const { t } = useTranslation('home');
    const { mode } = useContext(ColorModeContext);

    return (
        <div className={`home-container ${mode === "dark" ? "profile-dark" : "profile-light"}`}>
            <div className="main-content">
                <div className="game-center-container">
                    <Slides />
                    <GameList />
                </div>
                <div className="lobby-right-container">
                    <h2>{t('lobbies')}</h2>
                    <LobbySection />
                </div>
            </div>
        </div>
    );
};

export default Home;