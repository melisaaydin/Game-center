import React, { useContext } from 'react';
import './Home.css';
import SideBar from '../SideBar/SideBar';
import GameList from '../GameList/GameList';
import LobbySection from '../LobbySection/LobbySection';
import { ColorModeContext } from "../../context/ThemeContext";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import Slides from '../Slides/Slides';

const Home = () => {
    const { mode } = useContext(ColorModeContext);
    const theme = useTheme();


    return (
        <div className={`home-container ${mode === "dark" ? "profile-dark" : "profile-light"}`}>
            <SideBar />
            <div className="main-content">
                <div className="game-center-container">
                    <Slides />
                    <GameList />
                </div>
                <div className="lobby-right-container">
                    <LobbySection />
                </div>
            </div>
        </div>
    );
};

export default Home;