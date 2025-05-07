import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // For auth check
import './Proposals.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const ProposalDetails = () => {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionError, setActionError] = useState(null);

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
      </div>
    </div>
  );
};

export default ProposalDetails; 