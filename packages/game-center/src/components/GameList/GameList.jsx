import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./GameList.css";

const GameList = () => {
    const [games, setGames] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        axios
            .get("http://localhost:8081/games")
            .then((res) => {
                console.log("Oyunlar:", res.data); // Gelen veriyi kontrol et
                setGames(res.data);
            })
            .catch((err) => {
                console.error("Oyunları çekerken hata oluştu:", err);
            });
    }, []);

    return (
        <div className="gamelist-div">
            <span className="section-title">🎮 Slot Games</span>
            <div className="games-grid">
                {games.map((game) => (
                    <div
                        key={game.id}
                        className="game-card-game-list"
                        onClick={() => navigate(`/games/${game.id}`)} // "/games/" olarak düzeltildi
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