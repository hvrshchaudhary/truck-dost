const mongoose = require('mongoose');

const ManufacturerSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    gstNumber: {
        type: String, // Optional field
        default: null,
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Manufacturer', ManufacturerSchema);
