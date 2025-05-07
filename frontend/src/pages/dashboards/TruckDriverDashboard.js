import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './Dashboard.css';

function TruckDriverDashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [tripsError, setTripsError] = useState(null);
  const [proposalsError, setProposalsError] = useState(null);
  const [deletingTripId, setDeletingTripId] = useState(null);
  const [activeSection, setActiveSection] = useState('proposals');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    licenseNumber: '',
    vehicleType: '',
    vehicleNumber: '',
    experience: '',
    companyName: ''
  });
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
      if (userData) {
        setProfileData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          licenseNumber: userData.licenseNumber || '',
          vehicleType: userData.vehicleType || '',
          vehicleNumber: userData.vehicleNumber || '',
          experience: userData.experience || '',
          companyName: userData.companyName || ''
        });
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('token');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Fetch driver's trips and proposals
  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        setTripsLoading(true);
        setProposalsLoading(true);

        const config = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };

        // Fetch trips for the driver
        const tripsRes = await axios.get(
          `http://localhost:5001/api/trips`,
          config
        );
        setTrips(tripsRes.data);
        setTripsError(null);

        // Fetch received proposals for the driver
        try {
          const proposalsRes = await axios.get(
            `http://localhost:5001/api/proposals/received`,
            config
          );
          setProposals(proposalsRes.data);
          setProposalsError(null);
        } catch (proposalErr) {
          console.error('Error fetching proposals:', proposalErr);
          if (proposalErr.response?.status === 404) {
            // No proposals found is not an error
            setProposals([]);
            setProposalsError(null);
          } else {
            setProposalsError(`Failed to load proposals: ${proposalErr.response?.data?.msg || 'Unknown error'}`);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response) {
          if (err.response.status === 401) {
            setTripsError('Authentication failed. Please log out and log in again.');
            setProposalsError('Authentication failed. Please log out and log in again.');
          } else {
            setTripsError(`Failed to load trips: ${err.response.data.msg || 'Unknown error'}`);
          }
        } else if (err.request) {
          setTripsError('Failed to connect to the server. Please check your internet connection and try again.');
          setProposalsError('Failed to connect to the server. Please check your internet connection and try again.');
        } else {
          setTripsError('An unexpected error occurred. Please try again later.');
          setProposalsError('An unexpected error occurred. Please try again later.');
        }
      } finally {
        setTripsLoading(false);
        setProposalsLoading(false);
      }
    };

    fetchData();
  }, [userData]);

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

    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this trip? This will also delete all associated proposals.')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      navigate('/login');
      return;
    }

    try {
      setDeletingTripId(tripId);

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      // Delete the trip (this will also delete associated proposals on the backend)
      await axios.delete(
        `http://localhost:5001/api/trips/${tripId}`,
        config
      );

      // Update the trips list by removing the deleted trip
      setTrips(prevTrips => prevTrips.filter(trip => trip._id !== tripId));

      // Update the proposals list by removing proposals associated with the deleted trip
      setProposals(prevProposals => prevProposals.filter(proposal => proposal.trip?._id !== tripId));

      // Show success message
      alert('Trip and associated proposals deleted successfully!');
    } catch (err) {
      console.error('Error deleting trip:', err);
      if (err.response) {
        if (err.response.status === 401) {
          alert('Authentication failed. Please log out and log in again.');
        } else if (err.response.status === 404) {
          alert('Trip not found. It may have already been deleted.');
        } else {
          alert(`Failed to delete trip: ${err.response.data.msg || 'Unknown error'}`);
        }
      } else if (err.request) {
        alert('Failed to connect to the server. Please check your internet connection and try again.');
      } else {
        alert('An unexpected error occurred. Please try again later.');
      }
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

  // Handle accepting a proposal
  const handleAcceptProposal = async (proposalId) => {
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

      // Update the proposal status to 'accepted'
      await axios.put(
        `http://localhost:5001/api/proposals/${proposalId}`,
        { status: 'accepted' },
        config
      );

      // Update the proposals list
      setProposals(prevProposals =>
        prevProposals.map(proposal =>
          proposal._id === proposalId
            ? { ...proposal, status: 'accepted' }
            : proposal
        )
      );

      alert('Proposal accepted successfully!');
    } catch (err) {
      console.error('Error accepting proposal:', err);
      alert(`Failed to accept proposal: ${err.response?.data?.msg || err.message || 'Unknown error'}`);
    }
  };

  // Handle rejecting a proposal
  const handleRejectProposal = async (proposalId) => {
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

      // Update the proposal status to 'rejected'
      await axios.put(
        `http://localhost:5001/api/proposals/${proposalId}`,
        { status: 'rejected' },
        config
      );

      // Update the proposals list
      setProposals(prevProposals =>
        prevProposals.map(proposal =>
          proposal._id === proposalId
            ? { ...proposal, status: 'rejected' }
            : proposal
        )
      );

      alert('Proposal rejected successfully!');
    } catch (err) {
      console.error('Error rejecting proposal:', err);
      alert(`Failed to reject proposal: ${err.response?.data?.msg || err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteProposal = async (proposalId) => {
    if (!proposalId) {
      console.error('No proposal ID provided for deletion');
      return;
    }

    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this proposal?')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
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

      // Delete the proposal
      await axios.delete(
        `http://localhost:5001/api/proposals/${proposalId}`,
        config
      );

      // Update the proposals list by removing the deleted proposal
      setProposals(prevProposals => prevProposals.filter(proposal => proposal._id !== proposalId));

      // Show success message
      alert('Proposal deleted successfully!');
    } catch (err) {
      console.error('Error deleting proposal:', err);
      if (err.response) {
        if (err.response.status === 401) {
          alert('Authentication failed. Please log out and log in again.');
        } else if (err.response.status === 404) {
          alert('Proposal not found. It may have already been deleted.');
        } else {
          alert(`Failed to delete proposal: ${err.response.data.msg || 'Unknown error'}`);
        }
      } else if (err.request) {
        alert('Failed to connect to the server. Please check your internet connection and try again.');
      } else {
        alert('An unexpected error occurred. Please try again later.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      console.log('Updating profile with token:', token.substring(0, 20) + '...'); // Log part of token for debugging

      const response = await axios.put(
        'http://localhost:5001/api/truckDriver/profile',
        profileData,
        config
      );

      console.log('Profile update response:', response.data); // Log response for debugging

      // Update the user data with the new profile information
      setUserData(prev => ({
        ...prev,
        ...response.data
      }));

      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      if (err.response) {
        console.error('Error response:', err.response.data); // Log error response for debugging
        if (err.response.status === 401) {
          alert('Session expired. Please log in again.');
          navigate('/login');
        } else {
          alert(`Failed to update profile: ${err.response.data.message || 'Unknown error'}`);
        }
      } else {
        alert('Failed to connect to the server. Please try again later.');
      }
    }
  };

  const renderProfileSection = () => (
    <div className="section">
      <div className="section-header">
        <h2 className="section-title">Your Profile</h2>
        <button
          onClick={() => isEditing ? handleProfileUpdate() : setIsEditing(true)}
          className="action-btn"
        >
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>
      <div className="profile-form">
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            name="name"
            value={profileData.name}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={profileData.email}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            value={profileData.phone}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Address</label>
          <textarea
            name="address"
            value={profileData.address}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>License Number</label>
          <input
            type="text"
            name="licenseNumber"
            value={profileData.licenseNumber}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Vehicle Type</label>
          <input
            type="text"
            name="vehicleType"
            value={profileData.vehicleType}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Vehicle Number</label>
          <input
            type="text"
            name="vehicleNumber"
            value={profileData.vehicleNumber}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Experience (years)</label>
          <input
            type="number"
            name="experience"
            value={profileData.experience}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Company Name</label>
          <input
            type="text"
            name="companyName"
            value={profileData.companyName}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'proposals':
        return (
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Received Proposals</h2>
            </div>
            {proposalsLoading ? (
              <p>Loading proposals...</p>
            ) : proposalsError ? (
              <p className="error-text">{proposalsError}</p>
            ) : proposals.length === 0 ? (
              <p>No proposals received yet.</p>
            ) : (
              <div className="proposals-list">
                {proposals.map(proposal => (
                  <div key={proposal._id} className="proposal-card">
                    <div className="proposal-header">
                      <h3>Proposal from {proposal.manufacturer?.companyName || 'Unknown Manufacturer'}</h3>
                      <span className={`status-badge ${proposal.status}`}>
                        {proposal.status}
                      </span>
                    </div>

                    <div className="proposal-details">
                      <p><strong>From:</strong> {proposal.trip ? getLocationDisplay(proposal.trip.startAddress, proposal.trip.startCoordinates) : 'Location not available'}</p>
                      <p><strong>To:</strong> {proposal.trip ? getLocationDisplay(proposal.trip.endAddress, proposal.trip.endCoordinates) : 'Location not available'}</p>
                      <p><strong>Pickup Time:</strong> {proposal.trip ? formatDate(proposal.trip.pickupTime) : 'Not specified'}</p>
                      <p><strong>Delivery Time:</strong> {proposal.trip ? formatDate(proposal.trip.dropTime) : 'Not specified'}</p>
                      <p><strong>Proposed Price:</strong> ₹{proposal.proposalDetails?.requestedPrice || 'Not specified'}</p>
                      {proposal.proposalDetails?.message && (
                        <p><strong>Message:</strong> {proposal.proposalDetails.message}</p>
                      )}
                    </div>

                    <div className="proposal-actions">
                      {proposal.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAcceptProposal(proposal._id)}
                            className="accept-btn"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectProposal(proposal._id)}
                            className="reject-btn"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {(proposal.status === 'pending' || proposal.status === 'cancelled') && (
                        <button
                          onClick={() => handleDeleteProposal(proposal._id)}
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'trips':
        return (
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Your Listed Trips</h2>
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
                {trips.map(trip => (
                  <div key={trip._id} className="trip-card">
                    <div className="trip-header">
                      <h3>Trip #{trip._id.substring(0, 8)}</h3>
                      <button
                        onClick={() => handleDeleteTrip(trip._id)}
                        className="delete-btn"
                        disabled={deletingTripId === trip._id}
                      >
                        {deletingTripId === trip._id ? 'Deleting...' : 'Delete Trip'}
                      </button>
                    </div>

                    <div className="trip-details">
                      <p><strong>From:</strong> {getLocationDisplay(trip.startAddress, trip.startCoordinates)}</p>
                      <p><strong>To:</strong> {getLocationDisplay(trip.endAddress, trip.endCoordinates)}</p>
                      <p><strong>Pickup Time:</strong> {formatDate(trip.pickupTime)}</p>
                      <p><strong>Delivery Time:</strong> {formatDate(trip.dropTime)}</p>
                      <p><strong>Price:</strong> ₹{trip.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'profile':
        return renderProfileSection();
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="dashboard-container">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Truck Driver Dashboard</h1>
      </div>
      <div className="dashboard-content">
        <div className="dashboard-sections">
          <nav className="section-nav">
            <ul>
              <li>
                <button
                  className={activeSection === 'proposals' ? 'active' : ''}
                  onClick={() => setActiveSection('proposals')}
                >
                  Received Proposals
                </button>
              </li>
              <li>
                <button
                  className={activeSection === 'trips' ? 'active' : ''}
                  onClick={() => setActiveSection('trips')}
                >
                  Your Trips
                </button>
              </li>
              <li>
                <button
                  className={activeSection === 'profile' ? 'active' : ''}
                  onClick={() => setActiveSection('profile')}
                >
                  Profile
                </button>
              </li>
              <li>
                <button
                  className="logout-btn"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </li>
            </ul>
          </nav>
          <div className="main-content">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TruckDriverDashboard;