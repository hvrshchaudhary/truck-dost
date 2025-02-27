const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TruckDriver',
    required: true,
  },
  // Coordinates stored as GeoJSON Points for geospatial queries
  startCoordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // Format: [longitude, latitude]
  },
  endCoordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // Format: [longitude, latitude]
  },
  // Optional addresses provided by reverse geocoding on the frontend
  startAddress: {
    type: String,
    required: true,
  },
  endAddress: {
    type: String,
    required: true,
  },
  pickupTime: {
    type: Date,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create geospatial indexes for efficient location queries
TripSchema.index({ startCoordinates: '2dsphere' });
TripSchema.index({ endCoordinates: '2dsphere' });

module.exports = mongoose.model('Trip', TripSchema);
