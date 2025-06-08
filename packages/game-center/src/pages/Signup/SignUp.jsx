import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Validation from './SignUpValidation';
import axios from 'axios';
import AuthLayout from '../../layouts/AuthLayout';
import { TextField, Button, Link as MuiLink, IconButton, InputAdornment } from '@mui/material';
import SocialConnect from '../../components/SocialConnect/SocialConnect';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import './SignUp.css';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useUser } from '../../context/UserContext';

function SignUp() {
    const { t, i18n } = useTranslation('signup');
    const { login, preferredLanguage } = useUser();
    const [values, setValues] = useState({
        name: '',
        email: '',
        password: '',
        language: preferredLanguage || 'en'
    });
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setValues(prev => ({ ...prev, language: i18n.language }));
    }, [i18n.language]);

    const handleInput = (event) => {
        setValues(prev => ({ ...prev, [event.target.name]: event.target.value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        const validationErrors = Validation(values);
        if (!validationErrors.name && !validationErrors.email && !validationErrors.password) {
            try {
                const res = await axios.post('http://localhost:8081/auth/signup', {
                    name: values.name,
                    email: values.email,
                    password: values.password,
                    language: values.language
                });
                const token = res.data.token;
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                login({
                    email: res.data.user.email,
                    avatar: res.data.user.avatar,
                    id: res.data.user.id,
                    language: res.data.user.language
                }, token);
                navigate('/');
            } catch (err) {
                setError(t('serverError'));
            }
        } else {
            setError(t('validationError'));
        }
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div>
            <LanguageSwitcher />
            <div className='signupBody container-fluid p-0 signupWrapper'>
                <div className='row g-0 min-vh-100'>
                    <div className='col-md-6 login-left'>
                        <AuthLayout />
                    </div>
                    <div className='col-12 col-md-6 d-flex align-items-center justify-content-center'>
                        <div className='card-shadow w-100 px-4 py-5 form'>
                            <div className='mb-4'>
                                <span className='title text-center'>{t('welcome')}</span>
                            </div>
                            <div className='d-flex align-items-center justify-content-center'>
                                <span style={{ fontFamily: 'Poppins' }} className='articleOnSocialnetwork'>{t('socialSignUp')}</span>
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
                                        name='name'
                                        label={t('nameLabel')}
                                        type='text'
                                        fullWidth
                                        margin="normal"
                                        className='text-property'
                                        onChange={handleInput}
                                        value={values.name}
                                        placeholder={t('nameLabel')}
                                        variant="outlined"
                                        error={!!error && !values.name}
                                        helperText={error && !values.name ? t('nameError') : ""}
                                        fontFamily={'Poppins'}
                                    />
                                    <TextField
                                        className='text-property'
                                        label={t('emailLabel')}
                                        name="email"
                                        type="email"
                                        fullWidth
                                        margin="normal"
                                        value={values.email}
                                        onChange={handleInput}
                                        variant="outlined"
                                        error={!!error && !values.email}
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
                                        margin="normal"
                                        value={values.password}
                                        onChange={handleInput}
                                        variant="outlined"
                                        color="primary"
                                        error={!!error && !values.password}
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
                                <Button
                                    className='signupButton mt-3'
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                >{t('signUpButton')}</Button>
                            </form>
                            <div className='d-flex justify-content-center mt-3'>
                                <MuiLink
                                    className='loginLink'
                                    component={Link}
                                    to="/login"
                                    variant="body2"
                                    fontFamily={'Poppins'}
                                >
                                    {t('haveAccount')}
                                </MuiLink>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}

export default SignUp;