import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import i18n from '../i18n';

// Creating a context for user data management
const UserContext = createContext();

// Providing a custom hook to access the user context
export const useUser = () => {
    return useContext(UserContext);
};

// Defining the UserProvider component to manage user state and authentication
export const UserProvider = ({ children }) => {
    // Storing user data and loading state
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetching user data from the backend using a token and user ID
    const fetchUserData = useCallback(async (token, userId) => {
        try {
            if (!userId) {
                throw new Error('User ID is undefined');
            }

            const res = await axios.get(`http://localhost:8081/users/user/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.data.id) {
                throw new Error("ID missing in data returned from backend");
            }

            const language = localStorage.getItem('i18nextLng') || 'en';

            setUser({
                id: res.data.id,
                name: res.data.name,
                email: res.data.email,
                avatar_url: res.data.avatar_url,
                language
            });

        } catch (err) {
            console.error('fetchUserData error:', err);
            try {
                const decoded = jwtDecode(token);
                const language = localStorage.getItem('i18nextLng') || 'en';
                i18n.changeLanguage(language);
                setUser({
                    id: decoded.userId,
                    name: decoded.name || 'User',
                    email: decoded.email,
                    avatar_url: decoded.avatar_url || '',
                    language
                });

            } catch (decodeErr) {
                console.error('Token decode error:', decodeErr);
                localStorage.removeItem('token');
                setUser(null);
            }
        }
    }, []);

    // Initializing user data on component mount
    useEffect(() => {
        let isMounted = true;

        const initializeUser = async () => {

            if (!isMounted) return;

            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decodedToken = jwtDecode(token);
                    await fetchUserData(token, decodedToken.userId);
                } catch (err) {
                    console.error('initializeUser error:', err);
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }

            if (isMounted) setLoading(false);
        };

        initializeUser();

        return () => {
            isMounted = false;
        };
    }, [fetchUserData]);

    // Handling user login and setting user data
    const login = async (userData, token) => {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        try {
            const decoded = jwtDecode(token);
            const language = localStorage.getItem('i18nextLng') || 'en';
            i18n.changeLanguage(language);
            setUser({
                id: decoded.userId,
                name: decoded.name || userData.name || 'User',
                email: decoded.email || userData.email,
                avatar_url: decoded.avatar_url || userData.avatar || '',
                language
            });

            await fetchUserData(token, decoded.userId);
        } catch (err) {
            console.error('login error:', err);
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    // Handling user logout and clearing data
    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    // Providing user context to child components
    return (
        <UserContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </UserContext.Provider>
    );
};