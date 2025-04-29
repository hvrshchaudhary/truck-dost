import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ChooseSignup from './pages/login/ChooseSignup';
import DriverSignup from './pages/login/DriverSignup';
import ManufacturerSignup from './pages/login/ManufacturerSignup';
import Templogin from './pages/login/Templogin';
import ChooseAction from './pages/login/ChooseAction';
import TruckDriverDashboard from './pages/dashboards/TruckDriverDashboard';
import ManufacturerDashboard from './pages/dashboards/ManufacturerDashboard';
import TripForm from './pages/trips/TripForm';
import FindTrips from './pages/trips/FindTrips';
import TripProposals from './pages/proposals/TripProposals';
import MySentProposals from './pages/proposals/MySentProposals';
import Navbar from './components/Navbar';
import './App.css';

// Wrapper component for auth pages
const AuthPageWrapper = ({ children }) => {
    return <div className="auth-page">{children}</div>;
};

// Wrapper for pages that need the Navbar
const NavbarWrapper = ({ children }) => {
    return (
        <>
            <Navbar />
            <div className="main-container">{children}</div>
        </>
    );
};

// For port 3003 direct access component
const DirectAccessHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const port = window.location.port;
        const pathname = window.location.pathname;

        // If running on port 3003 and path is directly the root
        if (port === '3003' && pathname === '/') {
            // Auto-login for dev purposes
            localStorage.setItem('token', 'driverDevToken');
            // Redirect to truck driver dashboard
            navigate('/truck-driver-dashboard');
        }
    }, [navigate]);

    return null;
};

function App() {
    return (
        <Router>
            <DirectAccessHandler />
            <div className="app-container">
                <Routes>
                    {/* Auth routes */}
                    <Route path="/" element={<AuthPageWrapper><ChooseAction /></AuthPageWrapper>} />
                    <Route path="/signup" element={<AuthPageWrapper><ChooseSignup /></AuthPageWrapper>} />
                    <Route path="/signup/driver" element={<AuthPageWrapper><DriverSignup /></AuthPageWrapper>} />
                    <Route path="/signup/manufacturer" element={<AuthPageWrapper><ManufacturerSignup /></AuthPageWrapper>} />
                    <Route path="/login" element={<AuthPageWrapper><Templogin /></AuthPageWrapper>} />

                    {/* Dashboard routes - with Navbar */}
                    <Route path="/truck-driver-dashboard" element={<NavbarWrapper><TruckDriverDashboard /></NavbarWrapper>} />
                    <Route path="/manufacturer-dashboard" element={<ManufacturerDashboard />} />

                    {/* Trip management routes - with Navbar */}
                    <Route path="/trips/create" element={<NavbarWrapper><TripForm /></NavbarWrapper>} />
                    <Route path="/find-trips" element={<NavbarWrapper><FindTrips /></NavbarWrapper>} />

                    {/* Proposals routes - with Navbar */}
                    <Route path="/proposals/trip/:tripId" element={<NavbarWrapper><TripProposals /></NavbarWrapper>} />
                    <Route path="/my-proposals" element={<NavbarWrapper><MySentProposals /></NavbarWrapper>} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
