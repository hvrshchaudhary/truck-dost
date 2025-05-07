import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                <img src={`${process.env.PUBLIC_URL}/images/image3.jpeg`} alt="Truck Dost Logo" />
                <span>Truck Dost</span>
            </Link>
            <div className="navbar-links">
                <Link to="/trips/create" className="nav-link">Create Trip</Link>

            </div>
        </nav>
    );
};

export default Navbar; 