import React from "react";
import "./Form.css";

function Form() {
  return (
    <div className="container">
      <h1 className="form-title">Truck Dost Application Form</h1>
      <form className="styled-form">
        {/* Name Field */}
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter Your Name"
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
            required
          />
        </div>

        {/* Date Field */}
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input type="date" id="date" name="date" required />
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
    </div>
  );
}

export default Form;
