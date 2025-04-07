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

    const fetchUserData = useCallback(async (token, userId) => {
        try {
            if (!userId) {
                console.error("User ID is undefined");
                return;
            }
            console.log("Fetching user data for ID:", userId);
            const res = await axios.get(`http://localhost:8081/users/user/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log("Fetched user data:", res.data);
            if (!res.data.id) {
                console.error("Backend'den dönen veride ID eksik:", res.data);
            }
            setUser({
                id: res.data.id,
                name: res.data.name,
                email: res.data.email,
                avatar_url: res.data.avatar_url,
            });
        } catch (err) {
            console.error("Kullanıcı bilgisi alınamadı:", err.response?.data || err.message);
            localStorage.removeItem("token");
            setUser(null);
        }
    }, []);

    useEffect(() => {
        const initializeUser = async () => {
            const token = localStorage.getItem("token");
            console.log("Initializing user with token:", token);
            if (token) {
                try {
                    const decodedToken = jwtDecode(token);
                    console.log("Decoded token:", decodedToken);
                    await fetchUserData(token, decodedToken.userId);
                } catch (err) {
                    console.error("Token decoding failed:", err);
                    localStorage.removeItem("token");
                    setUser(null);
                }
            } else {
                console.log("No token found");
                setUser(null);
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
            console.log("Login - Decoded token:", decoded);
            await fetchUserData(token, decoded.userId);
        } catch (err) {
            console.error("Login token decoding failed:", err);
            localStorage.removeItem("token");
            setUser(null);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        console.log("User logged out");
    };

    return (
        <UserContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </UserContext.Provider>
    );
};