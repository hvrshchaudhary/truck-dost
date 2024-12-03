import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ChooseSignup.css'; // Import the CSS file for the new styles

const ChooseSignup = () => {
    const navigate = useNavigate();

    return (
        <div className="choose-signup-container">
            <div className="content">
                <h1 className="title">Create Your Account</h1>
                <p className="subtitle">Please choose your sign-up type</p>
                <div className="button-container">
                    <button
                        className="signup-button driver-btn"
                        onClick={() => navigate('/signup/driver')}
                    >
                        Driver Signup
                    </button>
                    <button
                        className="signup-button manufacturer-btn"
                        onClick={() => navigate('/signup/manufacturer')}
                    >
                        Manufacturer Signup
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChooseSignup;
