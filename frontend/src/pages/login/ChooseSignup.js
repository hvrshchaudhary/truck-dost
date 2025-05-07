import React from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../../assets/images';
import './ChooseSignup.css';

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
                        <img src={images.driver} alt="Truck Driver" className="role-icon" />
                        <span>Driver Signup</span>
                    </button>
                    <button
                        className="signup-button manufacturer-btn"
                        onClick={() => navigate('/signup/manufacturer')}
                    >
                        <img src={images.manufacturer} alt="Manufacturer" className="role-icon" />
                        <span>Manufacturer Signup</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChooseSignup;
