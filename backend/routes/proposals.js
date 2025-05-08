const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Proposal = require('../models/Proposal');
const Manufacturer = require('../models/Manufacturer');
const TruckDriver = require('../models/TruckDriver');
const Trip = require('../models/Trip');
const { sendSMS } = require('../utils/smsService');

// Clean up invalid proposals (those with no associated trip)
const cleanupInvalidProposals = async () => {
  try {
    const proposals = await Proposal.find();
    for (const proposal of proposals) {
      const trip = await Trip.findById(proposal.trip);
      if (!trip) {
        await Proposal.findByIdAndDelete(proposal._id);
        console.log(`Deleted invalid proposal ${proposal._id} with no associated trip`);
      }
    }
  } catch (err) {
    console.error('Error cleaning up invalid proposals:', err);
  }
};

// Run cleanup on startup
cleanupInvalidProposals();

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

      // Verify the trip exists and is active
      const tripDoc = await Trip.findById(trip);
      if (!tripDoc) {
        return res.status(404).json({ msg: 'Trip not found' });
      }

      // Check if the trip is still active (not deleted)
      if (tripDoc.status === 'deleted') {
        return res.status(400).json({ msg: 'Cannot create proposal for a deleted trip' });
      }

      // Verify that the trip belongs to the specified driver
      if (tripDoc.driver.toString() !== driver) {
        return res.status(400).json({
          msg: 'Invalid request: The specified trip does not belong to the specified driver'
        });
      }

      // Get driver details for SMS
      const driverDoc = await TruckDriver.findById(driver);
      if (!driverDoc) {
        return res.status(404).json({ msg: 'Driver not found' });
      }

      // Create the proposal
      const newProposal = new Proposal({
        manufacturer: req.user.id,
        driver,
        trip,
        proposalDetails,
        status: 'pending'
      });

      await newProposal.save();

      // Send SMS notification to driver
      try {
        const message = `New proposal received from ${manufacturer.companyName}. Please check your dashboard for details.`;
        await sendSMS(driverDoc.mobileNumber, message);
      } catch (smsError) {
        console.error('Failed to send SMS notification:', smsError);
        // Don't fail the proposal creation if SMS fails
      }

      res.json(newProposal);
    } catch (err) {
      console.error('Error creating proposal:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
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

// @route   GET api/proposals/:id
// @desc    Get a single proposal by ID
// @access  Private (Manufacturer who sent or Driver who received)
router.get('/:id', auth, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('trip') // Populates all fields from the Trip model
      .populate('manufacturer', 'companyName email phone') // Select specific fields
      .populate('driver', 'name email phone'); // Select specific fields for driver

    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found' });
    }

    // Authorization check:
    // User must be the manufacturer who created the proposal or the driver who received it.
    const isManufacturer = proposal.manufacturer._id.toString() === req.user.id;
    const isDriver = proposal.driver._id.toString() === req.user.id;

    if (!isManufacturer && !isDriver) {
      return res.status(403).json({ msg: 'User not authorized to view this proposal' });
    }

    res.json(proposal);
  } catch (err) {
    console.error('Error fetching proposal by ID:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Proposal not found (invalid ID format)' });
    }
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

// @route   PUT api/proposals/:id/complete
// @desc    Mark a proposal as completed by the driver
// @access  Private (Truck Drivers only)
router.put('/:id/complete', auth, async (req, res) => {
  try {
    // Check if the user is a truck driver
    const truckDriver = await TruckDriver.findById(req.user.id);
    if (!truckDriver) {
      return res.status(403).json({ msg: 'Only truck drivers can mark proposals as completed' });
    }

    // Find the proposal
    let proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found' });
    }

    // Make sure the truck driver is completing their own received proposal
    if (proposal.driver.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to complete this proposal' });
    }

    // Ensure the proposal was accepted before completing
    if (proposal.status !== 'accepted') {
      return res.status(400).json({ msg: 'Only accepted proposals can be marked as completed' });
    }

    // Update the proposal status to 'completed'
    proposal.status = 'completed';
    await proposal.save();
    
    // Optionally, populate related fields in the response
    // Re-fetch to get populated data if needed by frontend immediately
    const updatedProposal = await Proposal.findById(req.params.id)
      .populate('manufacturer', 'companyName email')
      .populate('trip');

    res.json({ msg: 'Proposal marked as completed successfully', proposal: updatedProposal });

  } catch (err) {
    console.error('Error marking proposal as completed:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Proposal not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/proposals/:id
// @desc    Delete a proposal
// @access  Private (Manufacturers and Truck Drivers)
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log(`Attempting to delete proposal ${req.params.id}`);
    // Find the proposal first
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      console.log(`Proposal ${req.params.id} not found`);
      return res.status(404).json({ msg: 'Proposal not found' });
    }

    console.log(`Found proposal with status: ${proposal.status}`);
    // Check if the user is a manufacturer or truck driver
    const manufacturer = await Manufacturer.findById(req.user.id);
    const truckDriver = await TruckDriver.findById(req.user.id);

    if (!manufacturer && !truckDriver) {
      console.log('User is neither manufacturer nor truck driver');
      return res.status(403).json({ msg: 'Only manufacturers and truck drivers can delete proposals' });
    }

    // If user is a manufacturer
    if (manufacturer) {
      console.log('User is a manufacturer');
      // Make sure the manufacturer is deleting their own proposal
      if (proposal.manufacturer.toString() !== req.user.id) {
        console.log('Manufacturer not authorized to delete this proposal');
        return res.status(401).json({ msg: 'Not authorized to delete this proposal' });
      }
      // Manufacturers can delete pending or rejected proposals
      if (proposal.status !== 'pending' && proposal.status !== 'rejected') {
        console.log(`Manufacturer cannot delete proposal with status: ${proposal.status}`);
        return res.status(400).json({ msg: 'Manufacturers can only delete pending or rejected proposals' });
      }
      // Delete the proposal
      console.log('Deleting proposal...');
      await Proposal.findByIdAndDelete(req.params.id);
      console.log('Proposal deleted successfully');
      return res.json({ msg: 'Proposal removed successfully' });
    }

    // If user is a truck driver
    if (truckDriver) {
      // Make sure the truck driver is deleting their own proposal
      if (proposal.driver.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized to delete this proposal' });
      }
      // Truck drivers can delete cancelled or completed proposals
      if (proposal.status !== 'cancelled' && proposal.status !== 'completed') {
        return res.status(400).json({ msg: 'Truck drivers can only delete cancelled or completed proposals' });
      }
    }

    // Delete the proposal
    await Proposal.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Proposal removed successfully' });
  } catch (err) {
    console.error('Error deleting proposal:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Proposal not found' });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get proposals for a specific driver
router.get('/driver/:driverId', auth, async (req, res) => {
  try {
    const driverId = req.params.driverId;

    // Verify the user is requesting their own proposals
    if (req.user.role === 'truckDriver' && req.user.id !== driverId) {
      return res.status(403).json({ msg: 'Not authorized to view these proposals' });
    }

    const proposals = await Proposal.find({ driver: driverId })
      .populate('driver', 'name mobileNumber truckCapacity')
      .populate('trip', 'startAddress endAddress pickupTime dropTime price')
      .sort({ createdAt: -1 });

    res.json(proposals);
  } catch (err) {
    console.error('Error fetching driver proposals:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT api/proposals/:id/cancel
// @desc    Cancel an accepted proposal
// @access  Private (Manufacturers only)
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    // Find the proposal
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found' });
    }

    // Check if the user is a manufacturer
    const manufacturer = await Manufacturer.findById(req.user.id);
    if (!manufacturer) {
      return res.status(403).json({ msg: 'Only manufacturers can cancel proposals' });
    }

    // Make sure the manufacturer is cancelling their own proposal
    if (proposal.manufacturer.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to cancel this proposal' });
    }

    // Check if the proposal is accepted
    if (proposal.status !== 'accepted') {
      return res.status(400).json({ msg: 'Can only cancel accepted proposals' });
    }

    // Update the proposal status to 'cancelled'
    proposal.status = 'cancelled';
    proposal.cancelledBy = 'manufacturer';
    proposal.cancellationReason = req.body.reason || 'Cancelled by manufacturer';
    proposal.cancelledAt = new Date();

    await proposal.save();

    // Notify the truck driver about the cancellation
    const truckDriver = await TruckDriver.findById(proposal.driver);
    if (truckDriver) {
      // Here you would typically send a notification to the truck driver
      // For now, we'll just log it
      console.log(`Notification sent to truck driver ${truckDriver.name} about proposal cancellation`);
    }

    res.json({
      msg: 'Proposal cancelled successfully',
      proposal: proposal
    });
  } catch (err) {
    console.error('Error cancelling proposal:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Proposal not found' });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router; 