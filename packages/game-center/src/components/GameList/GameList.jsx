import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./GameList.css";
import { useTranslation } from 'react-i18next';

const GameList = () => {
    const { t } = useTranslation('gameList');
    const [games, setGames] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        axios
            .get("http://localhost:8081/games")
            .then((res) => {
                setGames(res.data);
            })
            .catch((err) => {
                console.error("Error occurred while fetching games:", err);
            });
    }, []);

    return (
        <div className="gamelist-div">
            <span className="section-title">{t('games')}</span>
            <div className="games-grid">
                {games.map((game) => (
                    <div
                        key={game.id}
                        className="game-card-game-list"
                        onClick={() => navigate(`/games/${game.id}`)}
                    >
                        <div className="ticket-wrapper">
                            <div className="img-div">
                                <img
                                    src={`http://localhost:8081${game.image_url}`}
                                    alt={game.title}
                                />
                                <p>{game.title}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GameList;