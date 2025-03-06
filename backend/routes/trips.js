const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Trip = require('../models/Trip');
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
  async (req, res) => {
    // Extract query parameters for start and end coordinates
    const { startLongitude, startLatitude, endLongitude, endLatitude } = req.query;
    if (!startLongitude || !startLatitude || !endLongitude || !endLatitude) {
      return res.status(400).json({ error: "Please provide startLongitude, startLatitude, endLongitude, and endLatitude query parameters." });
    }

    const sLng = parseFloat(startLongitude);
    const sLat = parseFloat(startLatitude);
    const eLng = parseFloat(endLongitude);
    const eLat = parseFloat(endLatitude);

    try {
      // Option 1: Use $geoWithin with $centerSphere instead of $near for one of the coordinates
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
      });
      
      return res.json(trips);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
