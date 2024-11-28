const mongoose = require('mongoose');

const TruckDriverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
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
    truckCapacity: {
        type: Number,
        required: true,
    },
    licensePlateNumber: {
        type: String, // Optional field
        default: null,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('TruckDriver', TruckDriverSchema);
