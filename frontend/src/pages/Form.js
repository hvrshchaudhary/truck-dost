import React, { useState } from "react";
import "./Form.css";

function Form({ type, apiUrl }) {
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    gstNumber: "",
    mobileNumber: "",
    password: "",
    truckCapacity: "",
    licensePlateNumber: "",
    date: "",
  });

  const [responseMessage, setResponseMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.errors) {
        setResponseMessage(data.errors.map((error) => error.msg).join(", "));
      } else if (data.token) {
        setResponseMessage("Registration successful!");
      }
    } catch (error) {
      console.error("Error:", error);
      setResponseMessage("An error occurred while submitting the form.");
    }
  };

  return (
    <div className="container">
      <h1 className="form-title">{type} Registration</h1>
      <form className="styled-form" onSubmit={handleSubmit}>
        {/* Conditional rendering for Manufacturer and Driver fields */}
        {type === "Manufacturer" && (
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
          </>
        )}

        {type === "Driver" && (
          <>
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
              <label htmlFor="licensePlateNumber">License Plate Number</label>
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

        {/* Common fields for both Manufacturer and Driver */}
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
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        {/* Submit Button */}
        <div className="form-buttons">
          <button type="reset" className="reset-btn">
            Reset
          </button>
          <button type="submit" className="submit-btn">
            Submit
          </button>
        </div>
      </form>

      {/* Display response message */}
      {responseMessage && <p className="error-message">{responseMessage}</p>}
    </div>
  );
}

export default Form;
