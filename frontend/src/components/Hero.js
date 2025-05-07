import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { images } from '../assets/images';
import './Hero.css';

const Hero = () => {
    const navigate = useNavigate();

    return (
        <section className="hero-section">
            <div className="hero-overlay"></div>
            <div className="hero-content">
                <h1 className="hero-title">
                    <span className="title-line">Welcome to</span>
                    <span className="title-highlight">Truck Dost</span>
                </h1>
                <p className="hero-subtitle">
                    Connect with reliable truck drivers and manufacturers for seamless logistics
                </p>
                <div className="hero-buttons">
                    <button
                        onClick={() => navigate('/choose-role')}
                        className="btn btn-primary"
                    >
                        Get Started
                        <span className="btn-arrow">→</span>
                    </button>
                    <Link to="/find-trips" className="btn btn-secondary">
                        Find Trips
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default Hero; 