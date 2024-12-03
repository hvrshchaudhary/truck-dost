import React, { useState } from 'react';
import './Form.css';

function Form({ type }) {
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    password: '',
    truckCapacity: '',
    licensePlateNumber: '',
    companyName: '', // For Manufacturer
    address: '', // For Manufacturer
    gstNumber: '', // For Manufacturer (Optional)
  });

  const [responseMessage, setResponseMessage] = useState('');
  const [errors, setErrors] = useState([]);

  const apiUrl = type === 'Driver'
    ? 'http://localhost:5001/api/truckDriver/register'
    : 'http://localhost:5001/api/manufacturer/register';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleReset = () => {
    setFormData({
      name: '',
      mobileNumber: '',
      password: '',
      truckCapacity: '',
      licensePlateNumber: '',
      companyName: '',
      address: '',
      gstNumber: '',
    });
    setResponseMessage('');
    setErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponseMessage('Submitting...');
    setErrors([]);

    // Remove irrelevant fields based on type
    const dataToSend = { ...formData };
    if (type === 'Driver') {
      delete dataToSend.companyName;
      delete dataToSend.address;
      delete dataToSend.gstNumber;
    } else if (type === 'Manufacturer') {
      delete dataToSend.truckCapacity;
      delete dataToSend.licensePlateNumber;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (data.errors) {
        setErrors(data.errors.map((error) => error.msg));
        setResponseMessage('Failed to register. Please fix the errors.');
      } else if (data.token) {
        setResponseMessage('Registration successful!');
      } else {
        setResponseMessage('Unexpected response. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      setResponseMessage('An error occurred while submitting the form.');
    }
  };

  return (
    <div className="container">
      <h1 className="form-title">{type} Registration</h1>
      <form className="styled-form" onSubmit={handleSubmit}>
        {type === 'Driver' && (
          <>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Enter Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="mobileNumber">Mobile Number</label>
              <input
                type="text"
                id="mobileNumber"
                name="mobileNumber"
                placeholder="Enter Mobile Number"
                value={formData.mobileNumber}
                onChange={handleChange}
                required
                pattern="^\d{10}$"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="truckCapacity">Truck Capacity</label>
              <input
                type="text"
                id="truckCapacity"
                name="truckCapacity"
                placeholder="Enter Truck Capacity"
                value={formData.truckCapacity}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="licensePlateNumber">License Plate Number (Optional)</label>
              <input
                type="text"
                id="licensePlateNumber"
                name="licensePlateNumber"
                placeholder="Enter License Plate Number"
                value={formData.licensePlateNumber}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        {type === 'Manufacturer' && (
          <>
            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                placeholder="Enter Company Name"
                value={formData.companyName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                name="address"
                placeholder="Enter Address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="gstNumber">GST Number (Optional)</label>
              <input
                type="text"
                id="gstNumber"
                name="gstNumber"
                placeholder="Enter GST Number"
                value={formData.gstNumber}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="mobileNumber">Mobile Number</label>
              <input
                type="text"
                id="mobileNumber"
                name="mobileNumber"
                placeholder="Enter Mobile Number"
                value={formData.mobileNumber}
                onChange={handleChange}
                required
                pattern="^\d{10}$"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </>
        )}

        <div className="form-buttons">
          <button type="reset" className="reset-btn" onClick={handleReset}>
            Reset
          </button>
          <button type="submit" className="submit-btn">
            Submit
          </button>
        </div>
      </form>

      {responseMessage && <p className="response-message">{responseMessage}</p>}
      {errors.length > 0 && (
        <ul className="error-messages">
          {errors.map((error, index) => (
            <li key={index} className="error-item">{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Form;
