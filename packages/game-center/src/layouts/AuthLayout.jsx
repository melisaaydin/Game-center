import characterImage from '../assets/nobackground.png';
import './AuthLayout.css'
import React from 'react'

function AuthLayout() {
    return (
        <div className="auth-image-container">
            <img src={characterImage} alt="character" className="auth-image"
            />
        </div>

    )
}

export default AuthLayout;

