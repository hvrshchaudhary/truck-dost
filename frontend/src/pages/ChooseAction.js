import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ChooseAction.css'; // Ensure to use the correct CSS file

function ChooseAction() {
    const navigate = useNavigate();

    return (
        <div className="choose-action-container">
            <h1 className="title">Truck Intelligence System</h1>
            <p className="welcome-text">Welcome! Please choose an action to proceed:</p>

            <div className="action-buttons">
                <button 
                    className="btn login-btn" 
                    onClick={() => navigate('/login')}
                >
                    Log In
                </button>
                <button 
                    className="btn signup-btn" 
                    onClick={() => navigate('/signup')}
                >
                    Sign Up
                </button>
            </div>

            <div className="additional-info">
                <p>Don't have an account? <strong>Sign up</strong> to get started!</p>
                <p>Already have an account? <strong>Log in</strong> to access your profile.</p>
            </div>
        </div>
    );
}

export default ChooseAction;
