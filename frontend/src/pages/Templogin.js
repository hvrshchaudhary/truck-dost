import React, { useState } from 'react';
import axios from 'axios'; // Ensure axios is installed: npm install axios
import './Templogin.css';
import { useNavigate } from 'react-router-dom'; // For redirection after login
import {jwtDecode} from 'jwt-decode'; // Correct import for jwt-decode

function Login() {
  const [formData, setFormData] = useState({
    mobileNumber: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate(); // For redirection after login

  const { mobileNumber, password } = formData;

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

    try {
      // First try to login as a truck driver
      const truckDriverLogin = await axios.post(
        'http://localhost:5001/api/truckDriver/login',
        body,
        config
      );
      if (truckDriverLogin.data.token) {
        const decoded = jwtDecode(truckDriverLogin.data.token); // Decode JWT token
        localStorage.setItem('token', truckDriverLogin.data.token); // Store token in localStorage

        // Redirect to truck driver dashboard if the role is 'truckDriver'
        if (decoded.user.role === 'truckDriver') {
          navigate('/truck-driver-dashboard');
          setSuccess('Login successful as Truck Driver!');
          return; // Return early if truck driver login is successful
        }
      }
    } catch (err) {
      console.error('Truck Driver login failed:', err); // Log if truck driver login fails
    }

    try {
      // If truck driver login fails, try logging in as a manufacturer
      const manufacturerLogin = await axios.post(
        'http://localhost:5001/api/manufacturer/login',
        body,
        config
      );

      if (manufacturerLogin.data.token) {
        const decoded = jwtDecode(manufacturerLogin.data.token); // Decode JWT token
        localStorage.setItem('token', manufacturerLogin.data.token); // Store token in localStorage

        // Redirect to manufacturer dashboard if the role is 'manufacturer'
        if (decoded.user.role === 'manufacturer') {
          navigate('/manufacturer-dashboard');
          setSuccess('Login successful as Manufacturer!');
          return; // Return early if manufacturer login is successful
        }
      }
    } catch (err) {
      console.error('Manufacturer login failed:', err); // Log if manufacturer login fails
      if (err.response && err.response.data.errors) {
        setError(err.response.data.errors[0].msg); // Display error message from backend
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="login-container">
      <h1>Login Truck-Dost</h1>
      <form onSubmit={onSubmit}>
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
 