const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Trip = require('../models/Trip');
const Proposal = require('../models/Proposal');
const auth = require('../middleware/auth');

// POST /api/trips
// Create a new trip for the authenticated truck driver
router.post(
  '/',
  auth, // Auth middleware ensures req.user is populated with the driver's data (e.g., req.user.id)
  [
    // Validate that startCoordinates and endCoordinates are arrays of two numbers (longitude and latitude)
    check('startCoordinates', 'Start coordinates are required and must be an array of two numbers')
      .isArray({ min: 2, max: 2 }),
    check('endCoordinates', 'End coordinates are required and must be an array of two numbers')
      .isArray({ min: 2, max: 2 }),
    // Validate that pickupTime is a valid ISO8601 date string
    check('pickupTime', 'Pickup time is required and must be a valid date')
      .isISO8601(),
    // Validate that dropTime is a valid ISO8601 date string
    check('dropTime', 'Drop time is required and must be a valid date')
      .isISO8601(),
    // Validate that price is numeric
    check('price', 'Price is required and must be a number')
      .isNumeric(),
    // Optional: Validate startAddress and endAddress if provided as strings
    check('startAddress').notEmpty().isString(),
    check('endAddress').notEmpty().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startCoordinates, endCoordinates, pickupTime, dropTime, price, startAddress, endAddress } = req.body;

    try {
      // Create a new Trip document, associating it with the authenticated driver's id
      const newTrip = new Trip({
        driver: req.user.id, // Comes from the auth middleware (decoded JWT)
        startCoordinates: { type: 'Point', coordinates: startCoordinates },
        endCoordinates: { type: 'Point', coordinates: endCoordinates },
        pickupTime,
        dropTime,
        price,
        startAddress, // Provided by frontend after reverse geocoding
        endAddress,   // Provided by frontend after reverse geocoding
      });

      await newTrip.save();
      res.json(newTrip);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);
//
// GET /api/trips
// Retrieve all trips created by the authenticated truck driver
router.get(
  '/',
  auth, // Ensures req.user is populated with the authenticated driver's data
  async (req, res) => {
    try {
      // Find trips where the driver field matches the authenticated driver's id
      const trips = await Trip.find({ driver: req.user.id });
      res.json(trips);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// Add new route to fetch drivers traveling near a route (within 25kms of the provided start and end locations)
router.get(
  '/near-route',
  auth, // Ensure the user is authenticated
  async (req, res) => {
    // Extract query parameters for start and end coordinates
    const { startLongitude, startLatitude, endLongitude, endLatitude } = req.query;
    if (!startLongitude || !startLatitude || !endLongitude || !endLatitude) {
      return res.status(400).json({ error: "Please provide startLongitude, startLatitude, endLongitude, and endLatitude query parameters." });
    }

    try {
      const sLng = parseFloat(startLongitude);
      const sLat = parseFloat(startLatitude);
      const eLng = parseFloat(endLongitude);
      const eLat = parseFloat(endLatitude);

      console.log('Searching for trips near:', { sLng, sLat, eLng, eLat });

      // Find trips near the specified route
      const trips = await Trip.find({
        startCoordinates: {
          $near: {
            $geometry: { type: "Point", coordinates: [sLng, sLat] },
            $maxDistance: 25000
          }
        },
        endCoordinates: {
          $geoWithin: {
            $centerSphere: [[eLng, eLat], 25000 / 6378100] // radius in radians (25km / Earth radius)
          }
        }
      }).populate('driver', 'name mobileNumber truckCapacity'); // Include relevant driver details

      console.log(`Found ${trips.length} trips matching the location criteria`);
      if (trips.length > 0) {
        console.log('First trip driver info:', trips[0].driver);
      }

      return res.json(trips);
    } catch (err) {
      console.error('Error in near-route search:', err.message);
      res.status(500).send('Server error');
    }
  }
);

// GET /api/trips/:id
// Get a specific trip by ID
router.get(
  '/:id',
  auth, // Ensure user is authenticated
  async (req, res) => {
    try {
      // Find the trip by ID
      const trip = await Trip.findById(req.params.id);

      // Check if trip exists
      if (!trip) {
        return res.status(404).json({ msg: 'Trip not found' });
      }

      // Check if the authenticated user owns the trip or is authorized to view it
      if (trip.driver.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized to view this trip' });
      }

      res.json(trip);
    } catch (err) {
      console.error('Get trip error:', err.message);

      // Check if error is due to invalid ObjectId
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Trip not found - invalid ID format' });
      }

      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
);

// DELETE /api/trips/:id
// Delete a trip and its associated proposals
router.delete(
  '/:id',
  auth, // Ensure user is authenticated
  async (req, res) => {
    try {
      // Find the trip
      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({ msg: 'Trip not found' });
      }

      // Check if the trip belongs to the authenticated user
      if (trip.driver.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }

      // Delete all proposals associated with this trip
      await Proposal.deleteMany({ trip: req.params.id });

      // Delete the trip using deleteOne
      const result = await Trip.deleteOne({ _id: req.params.id });

      if (result.deletedCount === 0) {
        return res.status(404).json({ msg: 'Trip not found or already deleted' });
      }

      res.json({ msg: 'Trip and associated proposals removed' });
    } catch (err) {
      console.error('Delete trip error:', err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Trip not found' });
      }
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
);

// Get trips for a specific driver
router.get('/driver/:driverId', auth, async (req, res) => {
  try {
    const driverId = req.params.driverId;

    // Verify the user is requesting their own trips
    if (req.user.role === 'truckDriver' && req.user.id !== driverId) {
      return res.status(403).json({ msg: 'Not authorized to view these trips' });
    }

    const trips = await Trip.find({ driver: driverId })
      .populate('driver', 'name mobileNumber truckCapacity')
      .sort({ createdAt: -1 });

    res.json(trips);
  } catch (err) {
    console.error('Error fetching driver trips:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
