const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const apiRoutes = require('./routes/api');
const authTruckDriver = require('./routes/authTruckDriver');
const authManufacturer = require('./routes/authManufacturer');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);
app.use('/api/truckDriver', authTruckDriver);
app.use('/api/manufacturer', authManufacturer);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Routes
app.get('/', (req, res) => {
    res.send('Hello from the backend!!!');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
