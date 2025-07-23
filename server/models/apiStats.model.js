// server/models/apiStats.model.js
const mongoose = require('mongoose');

const ApiStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  provider: {
    type: String,
    default: 'goflightlabs'
  },
  totalCalls: {
    type: Number,
    default: 0
  },
  successfulCalls: {
    type: Number,
    default: 0
  },
  failedCalls: {
    type: Number,
    default: 0
  },
  callsByRoute: {
    type: Map,
    of: Number,
    default: new Map()
  },
  callsByAirport: {
    type: Map,
    of: Number,
    default: new Map()
  },
  aiCallsByType: {
    'gemini-flash': { type: Number, default: 0 },
    'gpt4o-mini': { type: Number, default: 0 }
  },
  monthlyQuotaRemaining: {
    type: Number
  },
  aiQuotaRemaining: {
    'gemini-flash': { type: Number },
    'gpt4o-mini': { type: Number }
  }
}, {
  timestamps: true
});

// Add index for date-based queries
ApiStatsSchema.index({ date: -1 });

module.exports = mongoose.model('ApiStats', ApiStatsSchema);