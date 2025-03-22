import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import './Dashboard.css';

function ManufacturerDashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for token and decode it
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.user.role !== 'manufacturer') {
        // If not a manufacturer, redirect to login
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setUserData(decoded.user);
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('token');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  
  const handleFindTrips = () => {
    // Navigate to find trips page
    navigate('/find-trips');
  };

  if (loading) {
    return <div className="dashboard-container">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Manufacturer Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>
      
      <div className="dashboard-content">
        <div className="find-trips-container">
          <button 
            onClick={handleFindTrips} 
            className="find-trips-btn"
          >
            <span className="btn-icon">🔍</span>
            <span className="btn-text">Find Available Trips</span>
          </button>
          <p className="find-trips-description">
            Search for available truck trips to transport your goods
          </p>
        </div>
      </div>
    </div>
  );
}

export default ManufacturerDashboard; 