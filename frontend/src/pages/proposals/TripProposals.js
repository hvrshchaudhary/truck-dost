import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './Proposals.css';

const TripProposals = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [tripData, setTripData] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  
  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.user.role !== 'truckDriver') {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setUserData(decoded.user);
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);
  
  // Fetch trip data and proposals
  useEffect(() => {
    const fetchTripData = async () => {
      if (!userData) return;
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      setLoading(true);
      
      try {
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        // Fetch trip details
        console.log(`Fetching trip with ID: ${tripId}`);
        const tripResponse = await axios.get(
          `http://localhost:5001/api/trips/${tripId}`,
          config
        );
        
        setTripData(tripResponse.data);
        console.log('Trip data loaded successfully:', tripResponse.data);
        
        // Now fetch proposals for this trip
        console.log('Fetching proposals for trip:', tripId);
        const proposalsResponse = await axios.get(
          `http://localhost:5001/api/proposals/received`,
          config
        );
        
        // Filter proposals for this specific trip
        const tripProposals = proposalsResponse.data.filter(
          proposal => proposal.trip && proposal.trip._id === tripId
        );
        
        console.log(`Found ${tripProposals.length} proposals for this trip`);
        setProposals(tripProposals);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        
        let errorMessage = 'Failed to load data. Please try again.';
        
        if (err.response) {
          console.error('Error response:', err.response.status, err.response.data);
          
          if (err.response.status === 401) {
            errorMessage = 'Authentication failed. Please log out and log in again.';
            localStorage.removeItem('token');
            setTimeout(() => navigate('/login'), 2000);
          } else if (err.response.status === 404) {
            errorMessage = 'Trip not found. It may have been deleted or the ID is invalid.';
          } else if (err.response.data && err.response.data.msg) {
            errorMessage = err.response.data.msg;
          }
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    if (userData && tripId) {
      fetchTripData();
    }
  }, [tripId, userData, navigate]);
  
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
  
  // Handle proposal action (accept/reject)
  const handleProposalAction = async (proposalId, status) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      // Update proposal status
      await axios.put(
        `http://localhost:5001/api/proposals/${proposalId}`,
        { status },
        config
      );
      
      // Update proposals in state
      setProposals(prevProposals => 
        prevProposals.map(proposal => 
          proposal._id === proposalId 
            ? { ...proposal, status } 
            : proposal
        )
      );
      
      alert(`Proposal ${status} successfully!`);
    } catch (err) {
      console.error(`Error processing proposal:`, err);
      
      // Simple error message without redundant details
      alert(`Failed to process proposal. Please try again.`);
    }
  };
  
  // Handle going back to dashboard
  const handleBack = () => {
    navigate('/truck-driver-dashboard');
  };
  
  // Display location from either address or coordinates
  const getLocationDisplay = (address, coordinates) => {
    if (address) return address;
    
    if (coordinates && coordinates.coordinates && coordinates.coordinates.length === 2) {
      return `Lat: ${coordinates.coordinates[1]}, Long: ${coordinates.coordinates[0]}`;
    }
    
    return 'Location not specified';
  };

  if (loading) {
    return (
      <div className="proposals-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="proposals-container">
      <header className="proposals-header">
        <button onClick={handleBack} className="back-btn">
          &larr; Back to Dashboard
        </button>
        <h1>Proposals</h1>
      </header>
      
      {error ? (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <div className="error-actions">
            <button onClick={() => window.location.reload()} className="refresh-btn">
              Refresh
            </button>
            <button onClick={handleBack} className="back-btn-large">
              Back to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <>
          {tripData && (
            <div className="trip-details-card">
              <h2>Trip Details</h2>
              <div className="trip-info">
                <div className="trip-route">
                  <div className="location-info">
                    <span className="info-label">From:</span>
                    <span className="info-value">
                      {getLocationDisplay(tripData.startAddress, tripData.startCoordinates)}
                    </span>
                  </div>
                  <div className="location-info">
                    <span className="info-label">To:</span>
                    <span className="info-value">
                      {getLocationDisplay(tripData.endAddress, tripData.endCoordinates)}
                    </span>
                  </div>
                </div>
                <div className="trip-times">
                  <div className="time-info">
                    <span className="info-label">Pickup:</span>
                    <span className="info-value">{formatDate(tripData.pickupTime)}</span>
                  </div>
                  <div className="time-info">
                    <span className="info-label">Drop:</span>
                    <span className="info-value">{formatDate(tripData.dropTime)}</span>
                  </div>
                  <div className="price-info">
                    <span className="info-label">Your Price:</span>
                    <span className="info-value">₹{tripData.price || '0'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="proposals-section">
            {proposals.length === 0 ? (
              <div className="no-proposals-message">
                No proposals received for this trip yet.
              </div>
            ) : (
              <div className="proposals-list">
                {proposals.map((proposal) => (
                  <div 
                    key={proposal._id} 
                    className={`proposal-card ${proposal.status}`}
                  >
                    <div className="proposal-header">
                      <h3>Proposal from {proposal.manufacturer?.companyName || 'Unknown Manufacturer'}</h3>
                      <span className={`proposal-status ${proposal.status}`}>
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="proposal-content">
                      <div className="proposal-details">
                        {proposal.proposalDetails}
                      </div>
                      
                      <div className="manufacturer-info">
                        <div className="info-item">
                          <span className="info-label">Company:</span>
                          <span className="info-value">{proposal.manufacturer?.companyName || 'Unknown'}</span>
                        </div>
                        {proposal.manufacturer?.address && (
                          <div className="info-item">
                            <span className="info-label">Address:</span>
                            <span className="info-value">{proposal.manufacturer.address}</span>
                          </div>
                        )}
                        {proposal.manufacturer?.gstNumber && (
                          <div className="info-item">
                            <span className="info-label">GST:</span>
                            <span className="info-value">{proposal.manufacturer.gstNumber}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="proposal-date">
                        <span className="date-label">Received on:</span>
                        <span className="date-value">{formatDate(proposal.createdAt)}</span>
                      </div>
                    </div>
                    
                    {proposal.status === 'pending' && (
                      <div className="proposal-actions">
                        <button 
                          onClick={() => handleProposalAction(proposal._id, 'accepted')}
                          className="accept-btn"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleProposalAction(proposal._id, 'rejected')}
                          className="reject-btn"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TripProposals; 