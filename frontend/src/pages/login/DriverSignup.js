import React from "react";
import Form from "../../components/Form";

const DriverSignup = () => {
  return (
    <Form
      type="Driver"
      apiUrl="http://localhost:5001/api/truckDriver/register"
    />
  );
};

export default DriverSignup;
