// server/models/alert.model.js
const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  departureAirport: {
    code: { type: String, required: true },
    name: { type: String, required: true }
  },
  destinationAirport: {
    code: { type: String, required: true },
    name: { type: String, required: true }
  },
  price: {
    type: Number,
    required: true
  },
  originalPrice: {
    type: Number,
    required: true
  },
  discountPercentage: {
    type: Number,
    required: true
  },
  discountAmount: {
    type: Number,
    required: true
  },
  airline: {
    type: String,
    required: true
  },
  farePolicy: {
    type: String,
    required: true
  },
  stops: {
    type: Number,
    default: 0
  },
  outboundDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in days
    required: true
  },
  alternativeDates: [{
    outbound: { type: Date },
    return: { type: Date }
  }],
  bookingLink: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'clicked', 'expired'],
    default: 'sent'
  },
  expiryDate: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
AlertSchema.index({ user: 1, createdAt: -1 });
AlertSchema.index({ departureAirport: 1, destinationAirport: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', AlertSchema);