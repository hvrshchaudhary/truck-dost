import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import './App.css';

// Wrapper component for auth pages
const AuthPageWrapper = ({ children }) => {
  return <div className="auth-page">{children}</div>;
};

function App() {
    return (
        <Router>
            <div className="app-container">
                <Routes>
                    {/* Add route for ChooseAction */}
                    <Route path="/" element={<AuthPageWrapper><ChooseAction /></AuthPageWrapper>} /> 
                    
                    <Route path="/signup" element={<AuthPageWrapper><ChooseSignup /></AuthPageWrapper>} />
                    <Route path="/signup/driver" element={<AuthPageWrapper><DriverSignup /></AuthPageWrapper>} />
                    <Route path="/signup/manufacturer" element={<AuthPageWrapper><ManufacturerSignup /></AuthPageWrapper>} />
                    <Route path="/login" element={<AuthPageWrapper><Templogin /></AuthPageWrapper>} /> 
                    
                    {/* Dashboard routes */}
                    <Route path="/truck-driver-dashboard" element={<TruckDriverDashboard />} />
                    <Route path="/manufacturer-dashboard" element={<ManufacturerDashboard />} />
                    
                    {/* Trip management routes */}
                    <Route path="/trips/create" element={<TripForm />} />
                    <Route path="/find-trips" element={<FindTrips />} />
                    
                    {/* Proposals routes */}
                    <Route path="/proposals/trip/:tripId" element={<TripProposals />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
