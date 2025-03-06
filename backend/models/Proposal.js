const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProposalSchema = new Schema({
  manufacturer: {
    type: Schema.Types.ObjectId,
    ref: 'Manufacturer',
    required: true,
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'TruckDriver',
    required: true,
  },
  trip: {
    type: Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  proposalDetails: {
    type: Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
    required: true,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Proposal', ProposalSchema); 