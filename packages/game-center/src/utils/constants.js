import Home from '../assets/home.png';
import Cup from '../assets/cup.png';
import Friends from '../assets/friendship.png';
import Settings from '../assets/settings.png';
import { FaXTwitter } from "react-icons/fa6";
import { FaYoutube, FaTelegramPlane } from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";
import { MdGames } from "react-icons/md";


export const NAV_LINKS = [
    { path: '/', label: 'Home', icon: Home, key: 'home' },
    { path: '/', label: 'LeaderBoard', icon: Cup, key: 'leaderboard' },
    { path: '/friends', label: 'Friends', icon: Friends, key: 'friends' },
    { path: '/', label: 'Settings', icon: Settings, key: 'settings' },
];

export const SOCIAL_LINKS = [
    { path: 'https://youtube.com', icon: FaYoutube, label: 'YouTube' },
    { path: 'https://twitter.com', icon: FaXTwitter, label: 'Twitter' },
    { path: 'https://telegram.org', icon: FaTelegramPlane, label: 'Telegram' },
];

export const TABS = [
    { id: 'games', label: 'Games', icon: MdGames },
    { id: 'matches', label: 'Matches', icon: GiCrossedSwords },
];

export const API_URL = 'http://localhost:8081';