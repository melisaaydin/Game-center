import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import Validation from './SignUpValidation';
import axios from 'axios';
import AuthLayout from '../../layouts/AuthLayout';
import { TextField, Button, Link as MuiLink, IconButton, InputAdornment } from '@mui/material';
import SocialConnect from '../../components/SocialConnect/SocialConnect';
import Visibility from '@mui/icons-material/Visibility'; // Göz simgesi
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import './SignUp.css'
function SignUp() {
    const [values, setValues] = useState({
        name: '',
        email: '',
        password: ''
    });

    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const handleInput = (event) => {
        setValues(prev => ({ ...prev, [event.target.name]: event.target.value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setError("");
        const validationErrors = Validation(values);
        if (!validationErrors.name && !validationErrors.email && !validationErrors.password) {
            axios.post('http://localhost:8081/auth/signup', {
                name: values.name,
                email: values.email,
                password: values.password
            })
                .then(res => navigate('/login'))
                .catch(err => console.log(err));
        }
    };
    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className='signupBody container-fluid p-0 signupWrapper'>
            <div className='row g-0 min-vh-100'>
                <div className='col-md-6 login-left'>
                    <AuthLayout />
                </div>
                <div className='col-12 col-md-6 d-flex align-items-center justify-content-center'>
                    <div className=' card-shadow w-100 px-4 py-5 form'>
                        <div className='mb-4' >
                            <span className='title text-center'> Welcome!</span>
                        </div>
                        <div className='d-flex align-items-center justify-content-center '>
                            <span style={{ fontFamily: 'Poppins' }} className='articleOnSocialnetwork'>SignUp using social networks</span>
                        </div>
                        <div style={{ margin: 0, padding: 0 }}>
                            <SocialConnect />
                        </div>
                        <div className="hr-with-text">
                            <hr />
                            <span style={{ fontFamily: 'Poppins' }} class="hr-text">OR</span>
                            <hr />
                        </div>


                        <form onSubmit={handleSubmit}>
                            <div className='mb-3'>
                                <TextField
                                    name='name'
                                    label='Name'
                                    type='name'
                                    fullWidth
                                    margin="normal"
                                    className='text-property'
                                    onChange={handleInput}
                                    value={values.name}
                                    placeholder='Enter Name'
                                    variant="outlined"
                                    error={!!error}
                                    helperText={error && !values.name ? "Enter name!" : ""}
                                    fontFamily={'Poppins'}
                                />
                                <TextField
                                    className='text-property'
                                    label="Email"
                                    name="email"
                                    type="email"
                                    fullWidth
                                    margin="normal"
                                    value={values.email}
                                    onChange={handleInput}
                                    variant="outlined"
                                    error={!!error}
                                    helperText={error && !values.email ? "Enter e-mail address!" : ""}
                                    fontFamily={'Poppins'}

                                />
                                <TextField
                                    fontFamily={'Poppins'}
                                    className='text-property'
                                    label="Password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    fullWidth
                                    margin="normal"
                                    value={values.password}
                                    onChange={handleInput}
                                    variant="outlined"
                                    color="primary"
                                    error={!!error}
                                    helperText={error && !values.password ? "Enter password!" : ""}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton style={{ color: 'rgb(86, 18, 29)' }}
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
                            <Button className='signupButton mt-3'
                                type="submit"
                                variant="contained"
                                fullWidth>Sign Up</Button>
                        </form>
                        <div className='  d-flex justify-content-center mt-3'>
                            <MuiLink className='loginLink'
                                component={Link}
                                to="/login"
                                variant="body2"
                                fontFamily={'Poppins'}
                            >
                                You have already one?
                            </MuiLink>
                        </div>

                    </div>
                </div>

            </div>


        </div>
    );
}

export default SignUp;
