import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import sha256 from 'sha256';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const { t } = useTranslation('auth');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get("http://localhost:8081/api/auth")
                .then(response => {
                    setUser(response.data.user);
                })
                .catch(() => navigate('/login'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [navigate]);

    const login = (email, password) => {
        const hashedPassword = sha256(password);
        axios.post('/auth/login', { email, password: hashedPassword })
            .then(response => {
                localStorage.setItem('authToken', response.data.token);
                setUser(response.data.user);
            })
            .catch((error) => {
                alert(t('loginFailed'));
            });
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};