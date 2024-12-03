import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import About from './components/About';
import ChooseSignup from './pages/ChooseSignup';
import DriverSignup from './pages/DriverSignup';
import ManufacturerSignup from './pages/ManufacturerSignup'; // Updated import for ManufacturerSignup

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/signup" element={<ChooseSignup />} />
                <Route path="/signup/driver" element={<DriverSignup />} />
                <Route path="/signup/manufacturer" element={<ManufacturerSignup />} /> {/* Updated route */}
            </Routes>
        </Router>
    );
}

export default App;

