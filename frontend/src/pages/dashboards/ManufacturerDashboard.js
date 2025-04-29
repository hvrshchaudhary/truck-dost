import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './ManufacturerDashboard.css';

function ManufacturerDashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [proposalsError, setProposalsError] = useState(null);
  const [activeSection, setActiveSection] = useState('proposals');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    companyName: '',
    address: '',
    gstNumber: '',
    mobileNumber: '',
    email: '',
    contactPerson: '',
    website: '',
    description: ''
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
      if (decoded.user.role !== 'manufacturer') {
        // If not a manufacturer, redirect to login
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setUserData(decoded.user);
      fetchProposals();
      if (userData) {
        setProfileData({
          companyName: userData.companyName || '',
          address: userData.address || '',
          gstNumber: userData.gstNumber || '',
          mobileNumber: userData.mobileNumber || '',
          email: userData.email || '',
          contactPerson: userData.contactPerson || '',
          website: userData.website || '',
          description: userData.description || ''
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

  const fetchProposals = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setProposalsLoading(true);
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      // Fetch proposals sent by this manufacturer
      const res = await axios.get('http://localhost:5001/api/proposals/sent', config);

      // Filter out any proposals with null trips
      const validProposals = res.data.filter(proposal => proposal.trip !== null);

      setProposals(validProposals);
      setProposalsError(null);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setProposalsError('Failed to load proposals');
    } finally {
      setProposalsLoading(false);
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
      const response = await axios.delete(
        `http://localhost:5001/api/proposals/${proposalId}`,
        config
      );

      if (response.data.msg === 'Proposal removed successfully') {
        // Update the proposals list by removing the deleted proposal
        setProposals(prevProposals => prevProposals.filter(proposal => proposal._id !== proposalId));
        alert('Proposal deleted successfully!');
      } else {
        throw new Error(response.data.msg || 'Failed to delete proposal');
      }
    } catch (err) {
      console.error('Error deleting proposal:', err);
      if (err.response) {
        if (err.response.status === 401) {
          alert('Authentication failed. Please log out and log in again.');
        } else if (err.response.status === 403) {
          alert('You are not authorized to delete this proposal.');
        } else if (err.response.status === 404) {
          alert('Proposal not found. It may have already been deleted.');
        } else if (err.response.status === 400) {
          alert(err.response.data.msg || 'Cannot delete this proposal.');
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

  const handleCancelProposal = async (proposalId) => {
    if (!proposalId) {
      console.error('No proposal ID provided for cancellation');
      return;
    }

    // Show confirmation dialog with reason input
    const reason = window.prompt('Please provide a reason for cancellation:');
    if (!reason) {
      return; // User cancelled the prompt
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

      // Cancel the proposal
      const response = await axios.put(
        `http://localhost:5001/api/proposals/${proposalId}/cancel`,
        { reason },
        config
      );

      if (response.data.msg === 'Proposal cancelled successfully') {
        // Update the proposals list
        setProposals(prevProposals =>
          prevProposals.map(proposal =>
            proposal._id === proposalId
              ? { ...proposal, status: 'cancelled' }
              : proposal
          )
        );
        alert('Proposal cancelled successfully! The truck driver has been notified.');
      } else {
        throw new Error(response.data.msg || 'Failed to cancel proposal');
      }
    } catch (err) {
      console.error('Error cancelling proposal:', err);
      if (err.response) {
        if (err.response.status === 401) {
          alert('Authentication failed. Please log out and log in again.');
        } else if (err.response.status === 403) {
          alert('You are not authorized to cancel this proposal.');
        } else if (err.response.status === 404) {
          alert('Proposal not found.');
        } else if (err.response.status === 400) {
          alert(err.response.data.msg || 'Cannot cancel this proposal.');
        } else {
          alert(`Failed to cancel proposal: ${err.response.data.msg || 'Unknown error'}`);
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

  const handleFindTrips = () => {
    navigate('/find-trips');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString();
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

      const response = await axios.put(
        'http://localhost:5001/api/manufacturer/profile',
        profileData,
        config
      );

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
        <h2 className="section-title">Company Profile</h2>
        <button
          onClick={() => isEditing ? handleProfileUpdate() : setIsEditing(true)}
          className="action-btn"
        >
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>
      <div className="profile-form">
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
          <label>GST Number</label>
          <input
            type="text"
            name="gstNumber"
            value={profileData.gstNumber}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Mobile Number</label>
          <input
            type="tel"
            name="mobileNumber"
            value={profileData.mobileNumber}
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
          <label>Contact Person</label>
          <input
            type="text"
            name="contactPerson"
            value={profileData.contactPerson}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Website</label>
          <input
            type="url"
            name="website"
            value={profileData.website}
            onChange={handleProfileChange}
            disabled={!isEditing}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={profileData.description}
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
              <h2 className="section-title">Your Proposals</h2>
              <button onClick={handleFindTrips} className="action-btn">Find Available Trips</button>
            </div>
            {proposalsLoading ? (
              <p>Loading proposals...</p>
            ) : proposalsError ? (
              <p className="error-text">{proposalsError}</p>
            ) : proposals.length === 0 ? (
              <p>No proposals sent yet.</p>
            ) : (
              <div className="proposals-list">
                {proposals.map(proposal => (
                  <div key={proposal._id} className="proposal-card">
                    <div className="proposal-header">
                      <h3>Proposal for Trip #{proposal.trip ? `#${proposal.trip._id.substring(0, 8)}` : 'Unknown Trip'}</h3>
                      <span className={`status-badge ${proposal.status}`}>
                        {proposal.status}
                      </span>
                    </div>

                    <div className="proposal-details">
                      <p><strong>Driver:</strong> {proposal.driver?.name || 'Unknown Driver'}</p>
                      <p><strong>From:</strong> {proposal.trip ? proposal.trip.startAddress : 'Location not available'}</p>
                      <p><strong>To:</strong> {proposal.trip ? proposal.trip.endAddress : 'Location not available'}</p>
                      <p><strong>Pickup Time:</strong> {proposal.trip ? formatDate(proposal.trip.pickupTime) : 'Not specified'}</p>
                      <p><strong>Delivery Time:</strong> {proposal.trip ? formatDate(proposal.trip.dropTime) : 'Not specified'}</p>
                      <p><strong>Proposed Price:</strong> ₹{proposal.proposalDetails?.requestedPrice || 'Not specified'}</p>
                      {proposal.proposalDetails?.message && (
                        <p><strong>Message:</strong> {proposal.proposalDetails.message}</p>
                      )}
                    </div>

                    <div className="proposal-actions">
                      {proposal.status === 'accepted' && (
                        <button
                          onClick={() => handleCancelProposal(proposal._id)}
                          className="cancel-btn"
                        >
                          Cancel Proposal
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteProposal(proposal._id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
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
              <h2 className="section-title">Available Trips</h2>
              <button onClick={handleFindTrips} className="action-btn">Find More Trips</button>
            </div>
            {/* Add trips content here */}
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
        <h1>Manufacturer Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
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
                  <span>📋</span> Proposals
                </button>
              </li>
              <li>
                <button
                  className={activeSection === 'trips' ? 'active' : ''}
                  onClick={() => setActiveSection('trips')}
                >
                  <span>🚛</span> Available Trips
                </button>
              </li>
              <li>
                <button
                  className={activeSection === 'profile' ? 'active' : ''}
                  onClick={() => setActiveSection('profile')}
                >
                  <span>👤</span> Profile
                </button>
              </li>
              <li>
                <button
                  className="logout-btn"
                  onClick={handleLogout}
                >
                  <span>🚪</span> Logout
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

export default ManufacturerDashboard; 