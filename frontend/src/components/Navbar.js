import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Remove token from localStorage
        localStorage.removeItem('token');
        // Redirect to login page
        navigate('/login');
    };

    return (
        <div className="navbar">
            <div className="navbar-content">
                <div className="logo">TruckDost</div>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
        </div>
    );
}

export default Navbar; 