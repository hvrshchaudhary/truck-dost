import React, { useState } from "react";
import "./Form.css";

function Form() {
  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: "",
    password: "",
    truckCapacity: "",
    licensePlateNumber: "",
    date: "", // Assuming the date field is relevant (e.g., registration date)
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
      const response = await fetch("http://localhost:5001/api/truckDriver/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData), // Send form data as JSON
      });

      const data = await response.json();

      if (data.errors) {
        setResponseMessage(data.errors.map((error) => error.msg).join(", "));
      } else if (data.token) {
        setResponseMessage("Registration successful!");
        // Optionally, you could store the token in localStorage or state to manage user authentication
      }
    } catch (error) {
      console.error("Error:", error);
      setResponseMessage("An error occurred while submitting the form.");
    }
  };

  return (
    <div className="container">
      <h1 className="form-title">Truck Dost Driver Registration</h1>
      <form className="styled-form" onSubmit={handleSubmit}>
        {/* Name Field */}
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter Your Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* Mobile Number Field */}
        <div className="form-group">
          <label htmlFor="mobileNumber">Mobile Number</label>
          <input
            type="text"
            id="mobileNumber"
            name="mobileNumber"
            placeholder="Enter Your Number"
            value={formData.mobileNumber}
            onChange={handleChange}
            required
            pattern="^\d{10}$"
          />
        </div>

        {/* Password Field */}
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

        {/* Truck Capacity Field */}
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

        {/* License Plate Number Field */}
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

        {/* Date Field */}
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

        {/* Buttons */}
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
      {responseMessage && <p>{responseMessage}</p>}
    </div>
  );
}

export default Form;
