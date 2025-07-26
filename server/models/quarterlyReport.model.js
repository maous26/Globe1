// server/models/quarterlyReport.model.js
const mongoose = require('mongoose');

const QuarterlyReportSchema = new mongoose.Schema({
  quarter: {
    type: String, // Q1-2025, Q2-2025, etc.
    required: true,
    unique: true
  },
  year: {
    type: Number,
    required: true
  },
  quarterNumber: {
    type: Number, // 1, 2, 3, 4
    required: true
  },
  analysisStartDate: {
    type: Date,
    required: true
  },
  analysisEndDate: {
    type: Date,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  totalRoutesAnalyzed: {
    type: Number,
    default: 0
  },
  averagePerformanceScore: {
    type: Number,
    default: 0
  },
  routePerformances: [{
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route'
    },
    route: {
      departure: String,
      destination: String,
      tier: String
    },
    performanceScore: Number,
    totalDeals: Number,
    totalScans: Number,
    roi: Number,
    trend: String, // 'improving', 'declining', 'stable'
    recommendation: String
  }],
  recommendations: [String],
  summary: String,
  nextAnalysisDate: Date,
  optimizationActions: [{
    action: String, // 'route_added', 'route_removed', 'tier_changed'
    routeId: mongoose.Schema.Types.ObjectId,
    details: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  budgetAnalysis: {
    estimatedMonthlyCalls: Number,
    currentUsage: Number,
    budgetEfficiency: Number
  }
}, {
  timestamps: true
});

// Index for efficient querying
QuarterlyReportSchema.index({ year: -1, quarterNumber: -1 });
QuarterlyReportSchema.index({ generatedAt: -1 });

module.exports = mongoose.model('QuarterlyReport', QuarterlyReportSchema); 