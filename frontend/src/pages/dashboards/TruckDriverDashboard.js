import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './Dashboard.css';

function TruckDriverDashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState(null);
  const [deletingTripId, setDeletingTripId] = useState(null); // Track which trip is being deleted
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
      if (decoded.user.role !== 'truckDriver') {
        // If not a truck driver, redirect to login
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

  // Fetch driver's trips
  useEffect(() => {
    const fetchTrips = async () => {
      if (!userData) return;
      
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        setTripsLoading(true);
        // Fixed: Use correct Authorization header format as expected by the backend
        const config = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };
        
        const res = await axios.get('http://localhost:5001/api/trips', config);
        setTrips(res.data);
        setTripsError(null);
      } catch (err) {
        console.error('Error fetching trips:', err);
        
        // Add better error handling and debugging
        if (err.response) {
          console.log('Error response status:', err.response.status);
          console.log('Error response data:', err.response.data);
          
          if (err.response.status === 401) {
            setTripsError('Authentication failed. Please log out and log in again.');
          } else {
            setTripsError(`Failed to load trips: ${err.response.data.msg || 'Unknown error'}`);
          }
        } else {
          setTripsError('Failed to connect to the server. Please try again later.');
        }
      } finally {
        setTripsLoading(false);
      }
    };

    fetchTrips();
  }, [userData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCreateNewTrip = () => {
    // Navigate to the trip creation form
    navigate('/trips/create');
  };
  
  // Handle deleting a trip
  const handleDeleteTrip = async (tripId) => {
    if (!tripId) {
      console.error('No trip ID provided for deletion');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      navigate('/login');
      return;
    }
    
    try {
      setDeletingTripId(tripId); // Set the trip being deleted
      console.log(`Attempting to delete trip with ID: ${tripId}`);
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      // Call the DELETE endpoint with the correct URL
      const apiUrl = `http://localhost:5001/api/trips/${tripId}`;
      console.log('Sending DELETE request to:', apiUrl);
      
      const response = await axios.delete(apiUrl, config);
      console.log('Delete response:', response.data);
      
      // Update the trips list by removing the deleted trip
      setTrips(prevTrips => prevTrips.filter(trip => trip._id !== tripId));
      
      // Show success message
      alert('Trip deleted successfully!');
    } catch (err) {
      console.error('Error deleting trip:', err);
      
      // Add comprehensive error logging
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error status:', err.response.status);
        console.error('Error data:', err.response.data);
        console.error('Error headers:', err.response.headers);
      } else if (err.request) {
        // The request was made but no response was received
        console.error('Error request:', err.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', err.message);
      }
      
      // Show error notification
      alert(`Failed to delete trip: ${err.response?.data?.msg || err.message || 'Unknown error'}`);
    } finally {
      setDeletingTripId(null);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Extract coordinates to display if address is missing
  const getLocationDisplay = (address, coordinates) => {
    if (address) return address;
    
    if (coordinates && coordinates.coordinates && coordinates.coordinates.length === 2) {
      return `Lat: ${coordinates.coordinates[1]}, Long: ${coordinates.coordinates[0]}`;
    }
    
    return 'Location not specified';
  };

  if (loading) {
    return <div className="dashboard-container">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Truck Driver Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>
      <div className="dashboard-content">

        
        {/* Listed Trips Section */}
        <div className="trips-section">
          <div className="section-header">
            <h2>Your Listed Trips</h2>
            <button onClick={handleCreateNewTrip} className="action-btn">List New Trip</button>
          </div>
          
          {tripsLoading ? (
            <p>Loading trips...</p>
          ) : tripsError ? (
            <p className="error-text">{tripsError}</p>
          ) : trips.length === 0 ? (
            <p>You haven't listed any trips yet.</p>
          ) : (
            <div className="trips-list">
              {trips.map((trip) => (
                <div key={trip._id} className="trip-card">
                  <div className="trip-header">
                    <h3>Trip #{trip._id ? trip._id.substring(0, 8) : 'Unknown'}</h3>
                  </div>
                  <div className="trip-details">
                    <div className="trip-route">
                      <div className="trip-location">
                        <span className="location-label">From:</span>
                        <span className="location-value">
                          {getLocationDisplay(trip.startAddress, trip.startCoordinates)}
                        </span>
                      </div>
                      <div className="trip-location">
                        <span className="location-label">To:</span>
                        <span className="location-value">
                          {getLocationDisplay(trip.endAddress, trip.endCoordinates)}
                        </span>
                      </div>
                    </div>
                    <div className="trip-times">
                      <div className="trip-time">
                        <span className="time-label">Pickup:</span>
                        <span className="time-value">{formatDate(trip.pickupTime)}</span>
                      </div>
                      <div className="trip-time">
                        <span className="time-label">Drop:</span>
                        <span className="time-value">{formatDate(trip.dropTime)}</span>
                      </div>
                    </div>
                    <div className="trip-price">
                      <span className="price-label">Price:</span>
                      <span className="price-value">₹{trip.price || '0'}</span>
                    </div>
                  </div>
                  <div className="trip-actions">
                    <button 
                      onClick={() => handleDeleteTrip(trip._id)} 
                      className="delete-btn"
                      disabled={deletingTripId === trip._id}
                    >
                      {deletingTripId === trip._id ? 'Deleting...' : 'Delete Trip'}
                    </button>
                    <button
                      onClick={() => navigate(`/proposals/trip/${trip._id}`)}
                      className="proposals-btn"
                    >
                      Proposals
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TruckDriverDashboard;