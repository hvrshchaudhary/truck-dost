const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Proposal = require('../models/Proposal');
const Manufacturer = require('../models/Manufacturer');
const TruckDriver = require('../models/TruckDriver');
const Trip = require('../models/Trip');

// @route   POST api/proposals
// @desc    Create a new proposal
// @access  Private (Manufacturers only)
router.post(
  '/',
  [
    auth,
    [
      check('driver', 'Driver ID is required').not().isEmpty(),
      check('trip', 'Trip ID is required').not().isEmpty(),
      check('proposalDetails', 'Proposal details are required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if the user is a manufacturer
      const manufacturer = await Manufacturer.findById(req.user.id);
      if (!manufacturer) {
        return res.status(403).json({ msg: 'Only manufacturers can create proposals' });
      }

      const { driver, trip, proposalDetails } = req.body;

      // Verify that the trip belongs to the specified driver
      const tripDoc = await Trip.findById(trip);
      if (!tripDoc) {
        return res.status(404).json({ msg: 'Trip not found' });
      }
      
      if (tripDoc.driver.toString() !== driver) {
        return res.status(400).json({ 
          msg: 'Invalid request: The specified trip does not belong to the specified driver' 
        });
      }

      // Create a new proposal
      const newProposal = new Proposal({
        manufacturer: req.user.id,
        driver,
        trip,
        proposalDetails,
        status: 'pending',
      });

      const proposal = await newProposal.save();
      res.json(proposal);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/proposals/sent
// @desc    Get all proposals sent by a manufacturer
// @access  Private (Manufacturers only)
router.get('/sent', auth, async (req, res) => {
  try {
    // Check if the user is a manufacturer
    const manufacturer = await Manufacturer.findById(req.user.id);
    if (!manufacturer) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const proposals = await Proposal.find({ manufacturer: req.user.id })
      .populate('driver', 'name email')
      .populate('trip')
      .sort({ createdAt: -1 });

    res.json(proposals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/proposals/received
// @desc    Get all proposals received by a truck driver
// @access  Private (Truck Drivers only)
router.get('/received', auth, async (req, res) => {
  try {
    // Check if the user is a truck driver
    const truckdriver = await TruckDriver.findById(req.user.id);
    if (!truckdriver) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const proposals = await Proposal.find({ driver: req.user.id })
      .populate('manufacturer', 'name email')
      .populate('trip')
      .sort({ createdAt: -1 });

    res.json(proposals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/proposals/:id
// @desc    Update a proposal status (accept/reject)
// @access  Private (Truck Drivers only)
router.put(
  '/:id',
  [
    auth,
    [
      check('status', 'Status is required').isIn(['accepted', 'rejected']),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if the user is a truck driver
      const truckdriver = await TruckDriver.findById(req.user.id);
      if (!truckdriver) {
        return res.status(403).json({ msg: 'Only truck drivers can update proposal status' });
      }

      const { status } = req.body;

      // Find the proposal
      let proposal = await Proposal.findById(req.params.id);

      if (!proposal) {
        return res.status(404).json({ msg: 'Proposal not found' });
      }

      // Make sure the truck driver is updating their own received proposal
      if (proposal.driver.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized to update this proposal' });
      }

      // Update the proposal
      proposal = await Proposal.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate('manufacturer', 'name email').populate('trip');

      res.json(proposal);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Proposal not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/proposals/:id
// @desc    Delete a proposal
// @access  Private (Manufacturers only, for pending proposals)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if the user is a manufacturer
    const manufacturer = await Manufacturer.findById(req.user.id);
    if (!manufacturer) {
      return res.status(403).json({ msg: 'Only manufacturers can delete proposals' });
    }

    // Find the proposal
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found' });
    }

    // Make sure the manufacturer is deleting their own proposal
    if (proposal.manufacturer.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to delete this proposal' });
    }

    // Check if the proposal is still pending
    if (proposal.status !== 'pending') {
      return res.status(400).json({ msg: 'Cannot delete proposals that have been accepted or rejected' });
    }

    await Proposal.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Proposal removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Proposal not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 