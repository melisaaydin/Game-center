import Home from '../assets/home.png';
import Cup from '../assets/cup.png';
import Friends from '../assets/friendship.png';
import Settings from '../assets/settings.png';
import { FaXTwitter } from "react-icons/fa6";
import { FaYoutube, FaTelegramPlane } from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";
import { MdGames } from "react-icons/md";

export const NAV_LINKS = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/', label: 'LeaderBoard', icon: Cup },
    { path: '/friends', label: 'Friends', icon: Friends },
    { path: '/', label: 'Settings', icon: Settings },
];

export const SOCIAL_LINKS = [
    { path: 'https://youtube.com', icon: FaYoutube },
    { path: 'https://twitter.com', icon: FaXTwitter },
    { path: 'https://telegram.org', icon: FaTelegramPlane },
];

export const TABS = [
    { id: 'games', label: 'Games', icon: MdGames },
    { id: 'matches', label: 'Matches', icon: GiCrossedSwords },
];

export const API_URL = 'http://localhost:8081';