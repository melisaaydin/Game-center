import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TextField, Button, Link as MuiLink, IconButton, InputAdornment } from '@mui/material';
import { useUser } from '../../context/UserContext';
import 'animate.css';
import CryptoJS from "crypto-js";
import AuthLayout from "../../layouts/AuthLayout";
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Login.css';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import SocialConnect from '../../components/SocialConnect/SocialConnect';
import { jwtDecode } from "jwt-decode";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff'

// Defining the secret key for encryption from environment variables
const SECRET_KEY = process.env.REACT_APP_SECRET_KEY;

function Login() {
    // Initializing translation hook for multilingual support
    const { t } = useTranslation('login');
    // Managing form state for email, password, and rememberMe checkbox
    const [values, setValues] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    // Storing error messages for form validation
    const [error, setError] = useState("");
    // Setting up navigation for redirecting after login
    const navigate = useNavigate();
    // Accessing login function from user context
    const { login } = useUser();
    // Toggling password visibility
    const [showPassword, setShowPassword] = useState(false);

    // Checking for saved token and remembered user on component mount
    useEffect(() => {
        const savedUser = localStorage.getItem("rememberedUser");
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                login({
                    email: decoded.email,
                    avatar: decoded.avatar,
                    id: decoded.userId,
                    language: decoded.language || 'en'
                }, token);
                navigate("/");
            } catch (err) {
                localStorage.removeItem("token");
            }
        }

        if (savedUser) {
            try {
                const bytes = CryptoJS.AES.decrypt(savedUser, SECRET_KEY);
                const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                setValues(decryptedData);
            } catch (err) {
                console.error("Decryption failed:", err);
            }
        }
    }, [navigate, login]);

    // Handling input changes for form fields
    const handleInput = (event) => {
        setValues(prev => ({ ...prev, [event.target.name]: event.target.value }));
    };

    // Updating rememberMe state based on checkbox
    const handleRememberMe = (event) => {
        setValues({ ...values, rememberMe: event.target.checked });
    };

    // Submitting login form and handling authentication
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!values.email || !values.password) {
            setError("Email ve şifre alanları boş olamaz.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:8081/auth/login", {
                email: values.email,
                password: values.password,
            });

            if (res.data.success) {
                if (values.rememberMe) {
                    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(values), SECRET_KEY).toString();
                    localStorage.setItem("rememberedUser", encryptedData);
                } else {
                    localStorage.removeItem("rememberedUser");
                }

                const token = res.data.token;
                localStorage.setItem("token", token);

                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                const decoded = jwtDecode(token);

                login({ email: decoded.email, avatar: decoded.avatar, id: decoded.userId }, token);

                navigate("/");
            } else {
                setError(res.data.message || "Email veya şifre hatalı!");
            }
        } catch (err) {
            setError("Sunucu hatası! Lütfen tekrar deneyin.");
        }
    };

    // Toggling password visibility on icon click
    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    // Rendering the login form and layout
    return (
        <div className='loginBody container-fluid p-0 loginWrapper'>
            <LanguageSwitcher />
            <div className='col-12 col-md-6 login-left'>
                <AuthLayout />
            </div>
            <div className='col-12 col-md-6 d-flex align-items-center justify-content-center'>
                <div className='card-shadow w-100 px-4 py-5 form'>
                    <div className='mb-4'>
                        <span className='title text-center'> {t('welcome')}</span>
                    </div>
                    <div className='d-flex align-items-center justify-content-center'>
                        <span style={{ fontFamily: 'Poppins' }} className='articleOnSocialnetwork'>{t('socialLogin')}</span>
                    </div>
                    <div style={{ margin: 0, padding: 0 }}>
                        <SocialConnect />
                    </div>
                    <div className="hr-with-text">
                        <hr />
                        <span style={{ fontFamily: 'Poppins' }} className="hr-text">{t('or')}</span>
                        <hr />
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className='mb-3'>
                            <TextField
                                className='text-property'
                                label={t('emailLabel')}
                                name="email"
                                type="email"
                                fullWidth
                                margin="normal"
                                autoComplete="email"
                                value={values.email}
                                onChange={handleInput}
                                variant="outlined"
                                error={!!error}
                                helperText={error && !values.email ? t('emailError') : ""}
                                fontFamily={'Poppins'}
                            />
                            <TextField
                                fontFamily={'Poppins'}
                                className='text-property'
                                label={t('passwordLabel')}
                                name="password"
                                type={showPassword ? "text" : "password"}
                                fullWidth
                                autoComplete="email"
                                margin="normal"
                                value={values.password}
                                onChange={handleInput}
                                variant="outlined"
                                color="primary"
                                error={!!error}
                                helperText={error && !values.password ? t('passwordError') : ""}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                style={{ color: 'var(--primary-color)' }}
                                                aria-label="toggle password visibility"
                                                onClick={handleClickShowPassword}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </div>
                        <div className='bottomSide'>
                            <label>
                                <input
                                    className='checkbox'
                                    type="checkbox"
                                    checked={values.rememberMe}
                                    onChange={handleRememberMe}
                                /> {t('rememberMe')}
                            </label>
                            <MuiLink
                                className='forgotPass'
                                href="/forgotpassword"
                                variant="body2"
                                fontFamily={'Poppins'}
                            >{t('forgotPassword')}</MuiLink>
                        </div>
                        <Button
                            className='loginButton mt-3'
                            type="submit"
                            variant="contained"
                            fullWidth
                        >{t('loginButton')}</Button>
                    </form>
                    <div className='d-flex justify-content-center mt-3'>
                        <MuiLink
                            className='signUpLink'
                            component={Link}
                            to="/signup"
                            variant="body2"
                            fontFamily={'Poppins'}
                        >
                            {t('noAccount')}
                        </MuiLink>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;