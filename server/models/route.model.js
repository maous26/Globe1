// server/models/route.model.js
const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
  departureAirport: {
    code: { type: String, required: true },
    name: { type: String, required: true }
  },
  destinationAirport: {
    code: { type: String, required: true },
    name: { type: String, required: true }
  },
  tier: {
    type: String,
    enum: ['ultra-priority', 'priority', 'complementary'],
    default: 'complementary'
  },
  scanFrequency: {
    type: Number, // Scans per day
    default: 2,
    min: 1,
    max: 12
  },
  basePrice: {
    type: Number,
    default: 0
  },
  lastScannedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSeasonal: {
    type: Boolean,
    default: false
  },
  seasonalPeriod: {
    start: { type: Date },
    end: { type: Date }
  },
  successRate: {
    type: Number,
    default: 0
  },
  totalScans: {
    type: Number,
    default: 0
  },
  totalDealsFound: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
RouteSchema.index({ 'departureAirport.code': 1, 'destinationAirport.code': 1 }, { unique: true });
RouteSchema.index({ tier: 1, isActive: 1 });
RouteSchema.index({ lastScannedAt: 1, isActive: 1 });

module.exports = mongoose.model('Route', RouteSchema);