import React, { useState } from 'react';
import axios from 'axios'; // Ensure axios is installed: npm install axios
import './Templogin.css';
import { useNavigate } from 'react-router-dom'; // For redirection after login
import {jwtDecode} from 'jwt-decode'; // Correct import for jwt-decode

function Login() {
  const [formData, setFormData] = useState({
    mobileNumber: '',
    password: '',
    userType: ''  // Added field for user type selection
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate(); // For redirection after login

  const { mobileNumber, password, userType } = formData;

  // Handle input change
  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle form submission
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const body = JSON.stringify({ mobileNumber, password });

    if (!userType) {
      setError('Please select a user type');
      return;
    }

    let loginUrl = '';
    let dashboard = '';
    if (userType === 'truckDriver') {
      loginUrl = 'http://localhost:5001/api/truckDriver/login';
      dashboard = '/truck-driver-dashboard';
    } else if (userType === 'manufacturer') {
      loginUrl = 'http://localhost:5001/api/manufacturer/login';
      dashboard = '/manufacturer-dashboard';
    }

    try {
      const res = await axios.post(loginUrl, body, config);
      if (res.data.token) {
        const decoded = jwtDecode(res.data.token);
        localStorage.setItem('token', res.data.token);
        if ((userType === 'truckDriver' && decoded.user.role === 'truckDriver') ||
            (userType === 'manufacturer' && decoded.user.role === 'manufacturer')) {
          navigate(dashboard);
          setSuccess(`Login successful as ${userType === 'truckDriver' ? 'Truck Driver' : 'Manufacturer'}!`);
          return;
        } else {
          setError('Returned role mismatch');
        }
      }
    } catch (err) {
      console.error(`${userType} login failed:`, err);
      setError(err.response && err.response.data.errors ? err.response.data.errors[0].msg : 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <h1>Login Truck-Dost</h1>
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
        <button type="submit" className="btn">
          Login
        </button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </div>
  );
}

export default Login;
 