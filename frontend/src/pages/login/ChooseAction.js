import React from 'react';
import { Link } from 'react-router-dom';
import { images } from '../../assets/images';
import './ChooseAction.css';

const ChooseAction = () => {
    return (
        <div className="auth-page">
            <div className="auth-container">
                <h1>Choose Your Role</h1>
                <div className="role-buttons">
                    <Link to="/signup/driver" className="btn btn-primary">
                        <img src={images.driver} alt="Truck Driver" className="role-icon" />
                        <span>I'm a Truck Driver</span>
                    </Link>
                    <Link to="/signup/manufacturer" className="btn btn-secondary">
                        <img src={images.manufacturer} alt="Manufacturer" className="role-icon" />
                        <span>I'm a Manufacturer</span>
                    </Link>
                </div>
                <p className="auth-footer">
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default ChooseAction;
