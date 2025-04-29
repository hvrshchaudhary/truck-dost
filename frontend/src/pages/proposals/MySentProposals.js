import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './Proposals.css';

function MySentProposals() {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProposals = async () => {
            try {
                // Check authentication
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                try {
                    const decoded = jwtDecode(token);
                    if (decoded.user.role !== 'manufacturer') {
                        localStorage.removeItem('token');
                        navigate('/login');
                        return;
                    }
                } catch (err) {
                    console.error('Token verification failed:', err);
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }

                // Fetch proposals
                const config = {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                };

                const response = await axios.get('http://localhost:5001/api/proposals/sent', config);
                setProposals(response.data);
            } catch (err) {
                console.error('Error fetching proposals:', err);
                setError('Failed to load your proposals');
            } finally {
                setLoading(false);
            }
        };

        fetchProposals();
    }, [navigate]);

    const handleBack = () => {
        navigate('/manufacturer-dashboard');
    };

    // Helper function to get status badge class
    const getStatusClass = (status) => {
        switch (status) {
            case 'accepted':
                return 'status-badge accepted';
            case 'rejected':
                return 'status-badge rejected';
            default:
                return 'status-badge pending';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="proposals-container">
                <div className="loading">Loading proposals...</div>
            </div>
        );
    }

    return (
        <div className="proposals-container">
            <div className="proposals-header">
                <h1>My Sent Proposals</h1>
                <button onClick={handleBack} className="back-btn">Back to Dashboard</button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {proposals.length === 0 ? (
                <div className="no-proposals">
                    <p>You haven't sent any proposals yet.</p>
                    <button onClick={() => navigate('/find-trips')} className="action-btn">Find Trips</button>
                </div>
            ) : (
                <div className="proposals-list">
                    {proposals.map(proposal => (
                        <div key={proposal._id} className="proposal-card">
                            <div className="proposal-header">
                                <h3>Proposal #{proposal._id.substring(0, 8)}</h3>
                                <span className={getStatusClass(proposal.status)}>
                                    {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                                </span>
                            </div>

                            <div className="proposal-trip-details">
                                <div className="trip-route">
                                    <div className="route-point">
                                        <div className="point-marker origin"></div>
                                        <div className="point-details">
                                            <span className="point-label">Pickup</span>
                                            <span className="point-value">{proposal.trip.startLocationName || 'Unknown Location'}</span>
                                        </div>
                                    </div>
                                    <div className="route-line"></div>
                                    <div className="route-point">
                                        <div className="point-marker destination"></div>
                                        <div className="point-details">
                                            <span className="point-label">Delivery</span>
                                            <span className="point-value">{proposal.trip.endLocationName || 'Unknown Location'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="trip-info">
                                    <div className="info-item">
                                        <span className="info-label">Trip Date:</span>
                                        <span className="info-value">{formatDate(proposal.trip.date)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Vehicle:</span>
                                        <span className="info-value">{proposal.trip.vehicleType}</span>
                                    </div>
                                    {proposal.trip.availableCapacity && (
                                        <div className="info-item">
                                            <span className="info-label">Capacity:</span>
                                            <span className="info-value">{proposal.trip.availableCapacity} kg</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="proposal-details">
                                <div className="proposal-detail-item">
                                    <span className="detail-label">Your Message:</span>
                                    <span className="detail-value message">{proposal.message || 'No message provided'}</span>
                                </div>
                                <div className="proposal-detail-item">
                                    <span className="detail-label">Proposed on:</span>
                                    <span className="detail-value">{formatDate(proposal.createdAt)}</span>
                                </div>
                                {proposal.status === 'accepted' && (
                                    <div className="accepted-info">
                                        <div className="driver-info">
                                            <span className="detail-label">Driver Contact:</span>
                                            <span className="detail-value">{proposal.trip.driver?.mobileNumber || 'Contact not available'}</span>
                                        </div>
                                    </div>
                                )}
                                {proposal.status === 'rejected' && proposal.rejectionReason && (
                                    <div className="rejected-info">
                                        <span className="detail-label">Rejection Reason:</span>
                                        <span className="detail-value">{proposal.rejectionReason}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MySentProposals; 