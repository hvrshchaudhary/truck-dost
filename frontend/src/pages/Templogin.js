import React, { useState } from 'react';
import axios from 'axios'; // Ensure axios is installed: npm install axios
import './Templogin.css';

function Login() {
  const [formData, setFormData] = useState({
    mobileNumber: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { mobileNumber, password } = formData;

  // Handle input change
  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle form submission
  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      const body = JSON.stringify({ mobileNumber, password });

      // API call to backend
      const res = await axios.post('http://localhost:5001/api/truckDriver/register', body, config); // Replace with your backend URL

      // Display success message and store JWT token
      setSuccess('Login successful!');
      localStorage.setItem('token', res.data.token); // Store token in localStorage
    } catch (err) {
      // Handle errors
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
