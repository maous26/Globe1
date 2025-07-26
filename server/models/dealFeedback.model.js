// server/models/dealFeedback.model.js
const mongoose = require('mongoose');

const DealFeedbackSchema = new mongoose.Schema({
  // Référence à l'alerte
  alertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Feedback utilisateur
  dealQualityRating: {
    type: Number, // 1-5 étoiles
    min: 1,
    max: 5
  },
  wasBooked: {
    type: Boolean, // L'utilisateur a-t-il réservé ce deal?
    default: null
  },
  reasonNotBooked: {
    type: String,
    enum: [
      'price_changed', 
      'not_available', 
      'hidden_fees', 
      'inconvenient_dates',
      'poor_airline',
      'better_deal_found',
      'changed_mind',
      'other'
    ]
  },
  userComment: {
    type: String,
    maxlength: 500
  },
  
  // Données pour ML
  deviceUsed: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet']
  },
  clickedAt: {
    type: Date // Quand l'utilisateur a cliqué sur le deal
  },
  timeSpentViewing: {
    type: Number // Secondes passées à regarder le deal
  },
  
  // Validation automatique vs réalité
  aiValidationScore: {
    type: Number, // Score donné par l'IA au moment de l'alerte
    min: 0,
    max: 100
  },
  actualPriceFound: {
    type: Number // Prix réel trouvé par l'utilisateur
  },
  
  // Métadonnées d'amélioration
  wasCorrectPrediction: {
    type: Boolean // L'IA avait-elle raison?
  },
  improvementSuggestions: [{
    category: {
      type: String,
      enum: ['price_accuracy', 'timing', 'airline_preference', 'route_popularity']
    },
    suggestion: String
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour requêtes ML
DealFeedbackSchema.index({ userId: 1, createdAt: -1 });
DealFeedbackSchema.index({ alertId: 1 });
DealFeedbackSchema.index({ wasBooked: 1 });
DealFeedbackSchema.index({ dealQualityRating: 1 });
DealFeedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DealFeedback', DealFeedbackSchema); 