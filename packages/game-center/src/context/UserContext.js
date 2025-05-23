import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { resetLanguage } from '../i18n';
import { toast } from 'react-toastify';

const UserContext = createContext();

export const useUser = () => {
    return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserData = useCallback(async (token, userId) => {
        console.log('fetchUserData called with userId:', userId);
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
            setUser({
                id: res.data.id,
                name: res.data.name,
                email: res.data.email,
                avatar_url: res.data.avatar_url,
            });
        } catch (err) {
            console.error('fetchUserData error:', err);
            localStorage.removeItem('token');
            setUser(null);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initializeUser = async () => {
            console.log('initializeUser called');
            if (!isMounted) return;

            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decodedToken = jwtDecode(token);
                    console.log('Decoded token:', decodedToken);
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

    const login = async (userData, token) => {
        console.log('login called with userData:', userData);
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
            const decoded = jwtDecode(token);
            console.log('Login decoded token:', decoded);
            await fetchUserData(token, decoded.userId);
        } catch (err) {
            console.error('login error:', err);
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    const logout = () => {
        console.log('logout called');
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </UserContext.Provider>
    );
};