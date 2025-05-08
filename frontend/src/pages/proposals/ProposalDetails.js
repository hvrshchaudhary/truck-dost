import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // For auth check
import './Proposals.css';
import LiveTripMap from '../../components/LiveTripMap'; // Import the new map component

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const ProposalDetails = () => {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [isTripViewActive, setIsTripViewActive] = useState(false);
  const [tripJustEnded, setTripJustEnded] = useState(false);

  // IMPORTANT: Replace with your actual Mapbox Access Token or use an environment variable
  const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || 'YOUR_MAPBOX_ACCESS_TOKEN';

  const fetchProposalDetails = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      jwtDecode(token); // Validate token
    } catch (e) {
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get(`${API_URL}/api/proposals/${proposalId}`, config);
      setProposal(response.data);
    } catch (err) {
      console.error('Error fetching proposal details:', err);
      setError(err.response?.data?.msg || err.message || 'Failed to load proposal details.');
    } finally {
      setLoading(false);
    }
  }, [proposalId, navigate]);

  useEffect(() => {
    fetchProposalDetails();
  }, [fetchProposalDetails]);

  const handleProposalAction = async (status) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setActionInProgress(true);
    setActionError(null);
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      await axios.put(`${API_URL}/api/proposals/${proposalId}`, { status }, config);
      // Refresh proposal details after action
      fetchProposalDetails(); 
      alert(`Proposal ${status} successfully!`);
    } catch (err) {
      console.error(`Error ${status} proposal:`, err);
      setActionError(err.response?.data?.msg || `Failed to ${status} proposal.`);
      alert(`Failed to ${status} proposal. ${err.response?.data?.msg || 'Please try again.'}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
 
  // Helper to display location
  const getLocationDisplay = (address, coordinates) => {
    if (address) return address;
    if (coordinates && coordinates.coordinates && coordinates.coordinates.length === 2) {
      return `Lat: ${coordinates.coordinates[1].toFixed(4)}, Long: ${coordinates.coordinates[0].toFixed(4)}`;
    }
    return 'N/A';
  };

  const handleStartTrip = () => {
    if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_ACCESS_TOKEN') {
      alert('Mapbox Access Token is not configured. Please set the REACT_APP_MAPBOX_TOKEN environment variable.');
      return;
    }
    if (!trip.endCoordinates || !trip.endCoordinates.coordinates || trip.endCoordinates.coordinates.length !== 2) {
      alert('Destination coordinates are missing or invalid for this trip.');
      return;
    }
    // Also check for start coordinates if multi-leg routing is essential from the beginning
    if (!trip.startCoordinates || !trip.startCoordinates.coordinates || trip.startCoordinates.coordinates.length !== 2) {
        alert('Trip start coordinates are missing or invalid. Cannot start multi-leg trip.');
        // return; // Or allow direct to destination if start is optional for driver
    }

    setIsTripViewActive(true);
    setTripJustEnded(false); // Reset if re-starting a trip view conceptually
  };

  const handleActualTripDeletion = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setActionInProgress(true);
    setActionError(null);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.delete(`${API_URL}/api/proposals/${proposalId}`, config);
      alert('Trip record successfully deleted!');
      setTripJustEnded(false); // Clear the trip ended state
      navigate('/proposals'); // Navigate to proposals list or another appropriate page
    } catch (err) {
      console.error('Error deleting proposal:', err);
      const errorMessage = err.response?.data?.msg || `Failed to delete trip record.`;
      setActionError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleTripEndCallback = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Should not happen if user was able to start the trip, but good practice
      navigate('/login');
      return;
    }
    
    // First, try to mark the proposal as completed on the backend
    // We'll use actionInProgress and actionError for this specific call temporarily
    // or you might want dedicated state for this operation if it becomes complex.
    setActionInProgress(true);
    setActionError(null);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      // Assuming proposalId is accessible in this scope (it should be from useParams)
      const response = await axios.put(`${API_URL}/api/proposals/${proposalId}/complete`, {}, config);
      
      // Update local proposal state with the one from backend if needed
      // This ensures the status shown (if any) is immediately consistent
      if (response.data && response.data.proposal) {
        setProposal(response.data.proposal);
      }
      console.log('Proposal marked as completed on backend.');

      // Proceed with frontend state changes for UI flow
      setIsTripViewActive(false);
      setTripJustEnded(true);

    } catch (err) {
      console.error('Error marking proposal as completed on backend:', err);
      const errorMessage = err.response?.data?.msg || 'Failed to mark trip as completed on server.';
      setActionError(errorMessage); // Set error for potential display
      alert(`Error: ${errorMessage} Please try again or contact support.`);
      // Decide if we should still proceed to set isTripViewActive to false
      // For now, let's still hide the map, but the user might not see delete option if error occurs
      setIsTripViewActive(false);
      // setTripJustEnded(false); // Keep this false if backend update failed, so delete option might not show
    } finally {
      setActionInProgress(false); // Reset for the completion action
    }
  };

  if (loading) {
    return <div className="proposals-container loading-spinner">Loading proposal details...</div>;
  }

  if (error) {
    return (
      <div className="proposals-container error-container">
        <p className="error-message">{error}</p>
        <button onClick={handleBack} className="back-btn">Go Back</button>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="proposals-container">
        <p>Proposal not found.</p>
        <button onClick={handleBack} className="back-btn">Go Back</button>
      </div>
    );
  }

  // Destructure for easier access, assuming proposal.trip and proposal.manufacturer are populated
  const { trip, manufacturer, price, message, status, createdAt, updatedAt } = proposal;

  return (
    <div className="proposal-details-page proposals-container">
      <header className="proposals-header page-header-bar">
        <button onClick={handleBack} className="back-btn">
          &larr; Back
        </button>
        <h1>Proposal Details</h1>
        <span className={`status-tag status-${status}`}>{status}</span>
      </header>

      <div className="proposal-details-content-grid">
        <div className="proposal-main-info card-style">
          <h3>Offer from Manufacturer</h3>
          <p><strong>Company:</strong> {manufacturer?.companyName || 'N/A'}</p>
          <p><strong>Contact:</strong> {manufacturer?.email || 'N/A'} / {manufacturer?.phone || 'N/A'}</p>
          <p><strong>Proposed Price:</strong> <span className="price-highlight">₹{price?.toLocaleString() || 'N/A'}</span></p>
          <p><strong>Message:</strong> {message || 'No message provided.'}</p>
          <p><strong>Received On:</strong> {formatDate(createdAt)}</p>
          {status !== 'pending' && <p><strong>Last Updated:</strong> {formatDate(updatedAt)}</p>}
        </div>

        {trip && (
          <div className="proposal-trip-info card-style">
            <h3>Associated Trip Details</h3>
            <p><strong>Origin:</strong> {getLocationDisplay(trip.startAddress, trip.startCoordinates)}</p>
            <p><strong>Destination:</strong> {getLocationDisplay(trip.endAddress, trip.endCoordinates)}</p>
            <p><strong>Pickup Time:</strong> {formatDate(trip.pickupTime)}</p>
            <p><strong>Drop-off Time:</strong> {formatDate(trip.dropTime)}</p>
            <p><strong>Your Listed Price:</strong> ₹{trip.price?.toLocaleString() || 'N/A'}</p>
            {/* Add more trip details if needed */}
          </div>
        )}

        {status === 'pending' && (
          <div className="proposal-actions-container card-style">
            <h3>Actions</h3>
            <p>Respond to this proposal:</p>
            <div className="action-buttons">
              <button 
                onClick={() => handleProposalAction('accepted')} 
                className="action-btn accept-btn-detail"
                disabled={actionInProgress}
              >
                {actionInProgress ? 'Processing...' : 'Accept Proposal'}
              </button>
              <button 
                onClick={() => handleProposalAction('rejected')} 
                className="action-btn reject-btn-detail"
                disabled={actionInProgress}
              >
                {actionInProgress ? 'Processing...' : 'Reject Proposal'}
              </button>
            </div>
            {actionError && <p className="error-message small-error">{actionError}</p>}
          </div>
        )}

        {status === 'accepted' && trip && (
          <div className="trip-management-container card-style">
            <h3>Trip Management</h3>
            {!isTripViewActive && !tripJustEnded && (
              <button
                onClick={handleStartTrip}
                className="action-btn accept-btn-detail" 
                disabled={actionInProgress} 
              >
                Start Trip
              </button>
            )}

            {isTripViewActive && trip.endCoordinates && trip.endCoordinates.coordinates && (
              <LiveTripMap
                destinationCoordinates={trip.endCoordinates.coordinates} 
                mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
                tripStartCoordinates={trip.startCoordinates?.coordinates}
                onTripEnd={handleTripEndCallback}
              />
            )}

            {tripJustEnded && (
              <div className="trip-ended-actions">
                {/* The LiveTripMap component already shows "Trip Successfully Completed!" */}
                {/* We can add further actions here if needed, or rely on the message from LiveTripMap */}
                <p>The trip has been marked as completed.</p>
                <button 
                  onClick={handleActualTripDeletion}
                  className="action-btn reject-btn-detail" // Using reject style for delete
                  style={{marginTop: '10px'}}
                  disabled={actionInProgress} // Could use a different state for delete in progress
                >
                  {actionInProgress ? 'Deleting...' : 'Delete Trip Record'}
                </button>
                {/* Display actionError if deletion fails */}
                {actionError && <p className="error-message small-error">{actionError}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalDetails; 