import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Templogin.css';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// API base URLs to try in order
const API_BASE_URLS = [
  'http://localhost:5001',
  'http://localhost:5002', // Fallback port
  'http://localhost:5000'  // Another common port
];

function Login() {
  const [formData, setFormData] = useState({
    mobileNumber: '',
    password: '',
    userType: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'online', 'offline'
  const [activeBaseUrl, setActiveBaseUrl] = useState('');
  const navigate = useNavigate();

  const { mobileNumber, password, userType } = formData;

  // Check server status on component mount
  useEffect(() => {
    checkAllServers();
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          // Token is valid
          if (decoded.user.role === 'truckDriver') {
            navigate('/truck-driver-dashboard');
          } else if (decoded.user.role === 'manufacturer') {
            navigate('/manufacturer-dashboard');
          }
        } else {
          // Token expired
          localStorage.removeItem('token');
        }
      } catch (err) {
        // Invalid token
        localStorage.removeItem('token');
        console.error('Invalid token:', err);
      }
    }
  }, [navigate]);

  // Try all server URLs in sequence until one responds
  const checkAllServers = async () => {
    setServerStatus('checking');
    console.log('Checking server availability...');

    for (const url of API_BASE_URLS) {
      try {
        console.log(`Trying server at ${url}...`);
        const response = await axios.get(`${url}`, { timeout: 3000 });
        if (response.status === 200) {
          setServerStatus('online');
          setActiveBaseUrl(url);
          console.log(`Server is online at ${url}`);
          return url;
        }
      } catch (err) {
        console.log(`Server at ${url} is not responding:`, err.message);
      }
    }

    setServerStatus('offline');
    console.error('All server URLs failed to respond');
    return null;
  };

  // Handle input change
  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle form submission
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (serverStatus === 'offline' || !activeBaseUrl) {
      // Try to reconnect to the server first
      const workingUrl = await checkAllServers();
      if (serverStatus === 'offline' || !workingUrl) {
        setError('Server is offline. Please try again later.');
        setIsLoading(false);
        return;
      }
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000 // 10 second timeout
    };
    const body = JSON.stringify({ mobileNumber, password });

    if (!userType) {
      setError('Please select a user type');
      setIsLoading(false);
      return;
    }

    let loginUrl = '';
    let dashboard = '';
    if (userType === 'truckDriver') {
      loginUrl = `${activeBaseUrl}/api/truckDriver/login`;
      dashboard = '/truck-driver-dashboard';
    } else if (userType === 'manufacturer') {
      loginUrl = `${activeBaseUrl}/api/manufacturer/login`;
      dashboard = '/manufacturer-dashboard';
    }

    try {
      console.log(`Attempting ${userType} login for ${mobileNumber} at ${loginUrl}`);
      const res = await axios.post(loginUrl, body, config);

      if (res.data.token) {
        console.log('Login successful, token received');

        try {
          const decoded = jwtDecode(res.data.token);
          console.log('Token decoded:', decoded.user);

          localStorage.setItem('token', res.data.token);
          // Store the working base URL for future API calls
          localStorage.setItem('apiBaseUrl', activeBaseUrl);

          if ((userType === 'truckDriver' && decoded.user.role === 'truckDriver') ||
            (userType === 'manufacturer' && decoded.user.role === 'manufacturer')) {
            setSuccess(`Login successful as ${userType === 'truckDriver' ? 'Truck Driver' : 'Manufacturer'}!`);
            console.log(`Redirecting to ${dashboard}`);
            setTimeout(() => navigate(dashboard), 500);
          } else {
            setError(`Role mismatch: Expected ${userType} but got ${decoded.user.role}`);
            console.error('Role mismatch:', decoded.user.role);
          }
        } catch (decodeErr) {
          setError('Invalid token format');
          console.error('Token decode error:', decodeErr);
        }
      } else {
        setError('No token received from server');
        console.error('No token in response:', res.data);
      }
    } catch (err) {
      console.error(`${userType} login failed:`, err);
      if (err.response) {
        console.log('Error response:', err.response.data);
        setError(err.response.data.errors ?
          err.response.data.errors[0].msg :
          err.response.data.msg || 'Login failed: Invalid credentials');
      } else if (err.request) {
        console.log('Error request:', err.request);
        setError('No response from server. Please try again later.');
        setServerStatus('offline');
        // Try other servers
        checkAllServers();
      } else {
        setError('Login request failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Login Truck-Dost</h1>

      {serverStatus === 'offline' && (
        <div className="server-status error">
          <p>Server is currently offline.</p>
          <button onClick={checkAllServers} className="retry-btn">
            Retry Connection
          </button>
        </div>
      )}

      {serverStatus === 'checking' && (
        <div className="server-status">
          <p>Checking server connection...</p>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="userType">User Type:</label>
          <select id="userType" name="userType" value={userType} onChange={onChange} required>
            <option value="">Select a user type</option>
            <option value="truckDriver">Truck Driver</option>
            <option value="manufacturer">Manufacturer</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="mobileNumber">Mobile Number:</label>
          <input
            type="text"
            id="mobileNumber"
            name="mobileNumber"
            value={mobileNumber}
            onChange={onChange}
            placeholder="Enter your mobile number"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={onChange}
            placeholder="Enter your password"
            required
          />
        </div>
        <button
          type="submit"
          className="btn"
          disabled={isLoading || serverStatus === 'offline' || serverStatus === 'checking'}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </div>
  );
}

export default Login;
