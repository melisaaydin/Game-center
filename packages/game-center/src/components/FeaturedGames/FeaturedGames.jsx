import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ColorModeContext } from "../../context/ThemeContext";
import "./FeaturedGames.css";

const FeaturedGames = () => {
    const navigate = useNavigate();
    const { mode } = useContext(ColorModeContext);

    return (
        //grid for home-page
        <div className="grid-property">
            <div className="container">
                <div className="item-a">PVP Game</div>
                <div className="item-b">Roulette</div>
                <div className="item-c">Jackpot</div>
                <div className="item-d" >Slots</div>
                <div className="item-e">Cases</div>
                <div className="item-f">Crash</div>
            </div>
        </div>
    );
};

export default FeaturedGames;