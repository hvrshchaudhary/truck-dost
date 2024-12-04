import React from "react";
import Form from "./Form"; // Assuming Form component is reusable

const ManufacturerSignup = () => {
  return (
    <Form
      type="Manufacturer" // Pass "Manufacturer" as the type if needed
      apiUrl="http://localhost:5001/api/manufacturer/register" // Use the correct API for manufacturer
    />
  );
};

export default ManufacturerSignup;
