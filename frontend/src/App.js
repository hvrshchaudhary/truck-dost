import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import About from './components/About';
import ChooseSignup from './pages/ChooseSignup';
import DriverSignup from './pages/DriverSignup';
import ManufacturerSignup from './pages/ManufacturerSignup'; // Updated import for ManufacturerSignup
import Templogin from './pages/Templogin'; // Add this import for Templogin
import ChooseAction from './pages/ChooseAction'; // Import ChooseAction

function App() {
    return (
        <Router>
            <Routes>
                {/* Add route for ChooseAction */}
                <Route path="/" element={<ChooseAction />} /> 
                
                <Route path="/about" element={<About />} />
                <Route path="/signup" element={<ChooseSignup />} />
                <Route path="/signup/driver" element={<DriverSignup />} />
                <Route path="/signup/manufacturer" element={<ManufacturerSignup />} />
                <Route path="/login" element={<Templogin />} /> {/* Route for login */}
            </Routes>
        </Router>
    );
}

export default App;
