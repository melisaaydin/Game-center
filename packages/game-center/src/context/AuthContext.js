import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import sha256 from 'sha256';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get("http://localhost:8081/api/auth"
            )
                .then(response => {
                    // Eğer token geçerliyse, kullanıcının bilgilerini al
                    setUser(response.data.user);
                })
                .catch(() => navigate('/login'))  // Geçersiz token veya başka bir hata durumunda login sayfasına yönlendir
                .finally(() => setLoading(false));  // Yükleme durumu sonlandırılır
        } else {
            setLoading(false);  // Token yoksa yükleme durumu sonlandırılır
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
                console.error("Login error:", error);
                alert('Login failed. Please check your credentials.');
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