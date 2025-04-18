import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from "jwt-decode";

const UserContext = createContext();

export const useUser = () => {
    return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [preferredLanguage, setPreferredLanguage] = useState("en");

    const fetchUserData = useCallback(async (token, userId) => {
        try {
            if (!userId) {
                throw new Error("User ID is undefined");
            }
            const res = await axios.get(`http://localhost:8081/users/user/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.data.id) {
                throw new Error("Backend'den dönen veride ID eksik");
            }
            setUser({
                id: res.data.id,
                name: res.data.name,
                email: res.data.email,
                avatar_url: res.data.avatar_url,
            });
            setPreferredLanguage(res.data.language || "en");
        } catch (err) {
            console.error("Kullanıcı bilgisi alınamadı:", err.message, err.stack);
            localStorage.removeItem("token");
            setUser(null);
            setPreferredLanguage("en");
        }
    }, []);

    useEffect(() => {
        const initializeUser = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const decodedToken = jwtDecode(token);
                    await fetchUserData(token, decodedToken.userId);
                } catch (err) {
                    localStorage.removeItem("token");
                    setUser(null);
                    setPreferredLanguage("en");
                }
            } else {
                setUser(null);
                setPreferredLanguage("en");
            }
            setLoading(false);
        };

        initializeUser();
    }, [fetchUserData]);

    const login = async (userData, token) => {
        localStorage.setItem("token", token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
            const decoded = jwtDecode(token);
            await fetchUserData(token, decoded.userId);
        } catch (err) {
            localStorage.removeItem("token");
            setUser(null);
            setPreferredLanguage("en");
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setPreferredLanguage("en");
    };

    return (
        <UserContext.Provider value={{ user, setUser, login, logout, loading, preferredLanguage, setPreferredLanguage }}>
            {children}
        </UserContext.Provider>
    );
};