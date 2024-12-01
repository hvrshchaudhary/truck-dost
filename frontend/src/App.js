import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import About from './components/About';
import Form from './pages/Form'; // Import Form from the pages folder

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/form" element={<Form />} /> 
            </Routes>
        </Router>
    );
}

export default App;
