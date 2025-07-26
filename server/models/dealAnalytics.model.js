// server/models/dealAnalytics.model.js
const mongoose = require('mongoose');

const DealAnalyticsSchema = new mongoose.Schema({
  // Identification du deal
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  departureCode: String,
  destinationCode: String,
  airline: String,
  
  // Données API collectées
  apiCallId: String, // Identifiant unique de l'appel API
  detectedPrice: Number,
  marketPrice: Number, // Prix moyen du marché pour cette route
  discountPercentage: Number,
  
  // Analyse de fiabilité
  reliabilityScore: {
    type: Number, // 0-100
    default: 50
  },
  suspiciousFactors: [{
    factor: {
      type: String,
      enum: [
        'price_too_low',
        'sudden_price_drop', 
        'inconsistent_timing',
        'unusual_availability',
        'api_response_anomaly',
        'pricing_pattern_break'
      ]
    },
    severity: {
      type: Number, // 1-10
      min: 1,
      max: 10
    },
    details: String
  }],
  
  // Validation croisée
  crossValidation: {
    checkedSources: Number, // Nombre de sources vérifiées
    confirmedBy: Number, // Nombre de sources confirmant le prix
    conflictingSources: Number,
    lastValidationAt: Date
  },
  
  // Patterns temporels
  timePattern: {
    detectedAt: Date,
    dayOfWeek: Number, // 0-6
    hourOfDay: Number, // 0-23
    isOptimalTiming: Boolean, // Basé sur ta stratégie timing
    timingScore: Number // 0-100
  },
  
  // Évolution du deal
  priceEvolution: [{
    timestamp: Date,
    price: Number,
    availability: Boolean,
    source: String
  }],
  
  // Résultat final
  finalVerdict: {
    isLegitimate: {
      type: Boolean,
      default: null
    },
    confidenceLevel: {
      type: Number, // 0-100
      default: 50
    },
    aiAnalysis: String,
    humanVerified: Boolean, // Pour deals douteux qu'on vérifie manuellement
    lastUpdated: Date
  },
  
  // Métriques d'apprentissage
  learningData: {
    wasCorrectPrediction: Boolean,
    actualOutcome: {
      type: String,
      enum: ['legitimate_deal', 'pricing_error', 'fake_deal', 'temporary_glitch', 'unknown']
    },
    evidenceCollected: [String], // Preuves collectées automatiquement
    improvementSuggestions: [String]
  }
}, {
  timestamps: true
});

// Index pour requêtes ML
DealAnalyticsSchema.index({ routeId: 1, createdAt: -1 });
DealAnalyticsSchema.index({ airline: 1, reliabilityScore: -1 });
DealAnalyticsSchema.index({ 'finalVerdict.isLegitimate': 1 });
DealAnalyticsSchema.index({ 'timePattern.isOptimalTiming': 1 });
DealAnalyticsSchema.index({ discountPercentage: -1 });

module.exports = mongoose.model('DealAnalytics', DealAnalyticsSchema); 