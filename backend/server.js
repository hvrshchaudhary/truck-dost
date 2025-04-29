const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
    credentials: true
}));

app.use(express.json());

// Root route handler
app.get('/', (req, res) => {
    res.json({ message: 'Truck Dost API is running' });
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    if (req.headers.authorization) {
        console.log('Auth header present');
    }
    next();
});

// Routes
app.use('/api', require('./routes/api'));
app.use('/api/truckDriver', require('./routes/authTruckDriver'));
app.use('/api/manufacturer', require('./routes/authManufacturer'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/proposals', require('./routes/proposals'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

// Start server
async function startServer() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');

        // Start the server
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

startServer();
