// server/models/apiStats.model.js
const mongoose = require('mongoose');

const apiStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
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
    type: Object,
    default: {
      'gemini-flash': 0,
      'gpt4o-mini': 0
    }
  },
  provider: {
    type: String,
    default: 'goflightlabs'
  },
  monthlyQuotaRemaining: {
    type: Number,
    default: 30000
  },
  lastRequest: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index composé pour les requêtes par date
apiStatsSchema.index({ date: -1, provider: 1 });

// Méthode pour obtenir les stats du mois en cours
apiStatsSchema.statics.getCurrentMonthStats = async function() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const stats = await this.aggregate([
    {
      $match: {
        date: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: '$totalCalls' },
        successfulCalls: { $sum: '$successfulCalls' },
        failedCalls: { $sum: '$failedCalls' },
        geminiCalls: { $sum: '$aiCallsByType.gemini-flash' },
        gptCalls: { $sum: '$aiCallsByType.gpt4o-mini' }
      }
    }
  ]);
  
  return stats[0] || {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    geminiCalls: 0,
    gptCalls: 0
  };
};

// Méthode pour obtenir les routes les plus utilisées
apiStatsSchema.statics.getTopRoutes = async function(limit = 10) {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const stats = await this.find({
    date: { $gte: last30Days }
  });
  
  const routeMap = new Map();
  
  stats.forEach(stat => {
    if (stat.callsByRoute) {
      for (const [route, calls] of stat.callsByRoute) {
        routeMap.set(route, (routeMap.get(route) || 0) + calls);
      }
    }
  });
  
  return Array.from(routeMap.entries())
    .map(([route, calls]) => ({ route, calls }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, limit);
};

const ApiStats = mongoose.model('ApiStats', apiStatsSchema);

module.exports = ApiStats;