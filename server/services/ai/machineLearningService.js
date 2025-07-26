// server/services/ai/machineLearningService.js
const DealFeedback = require('../../models/dealFeedback.model');
const Alert = require('../../models/alert.model');
const Route = require('../../models/route.model');
const { routeAIRequest } = require('./aiService');

class MachineLearningService {
  constructor() {
    this.trainingInProgress = false;
    this.lastTraining = null;
    this.modelVersion = '1.0.0';
  }

  /**
   * Collecter les données de feedback pour entraînement
   */
  async collectTrainingData(daysBack = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Récupérer les feedbacks avec les alertes associées
      const feedbacks = await DealFeedback.aggregate([
        {
          $match: {
            createdAt: { $gte: cutoffDate },
            dealQualityRating: { $exists: true },
            wasBooked: { $ne: null }
          }
        },
        {
          $lookup: {
            from: 'alerts',
            localField: 'alertId',
            foreignField: '_id',
            as: 'alert'
          }
        },
        {
          $unwind: '$alert'
        }
      ]);

      console.log(`📊 Collecté ${feedbacks.length} feedbacks pour entraînement`);
      return feedbacks;
    } catch (error) {
      console.error('❌ Erreur collecte données ML:', error);
      return [];
    }
  }

  /**
   * Analyser les patterns de feedback pour améliorer les critères IA
   */
  async analyzeUserPatterns(feedbacks) {
    try {
      // Analyser les patterns de satisfaction
      const satisfactionByAirline = this.groupFeedbackBy(feedbacks, 'alert.airline');
      const satisfactionByRoute = this.groupFeedbackBy(feedbacks, route => 
        `${route.alert.departureAirport.code}-${route.alert.destinationAirport.code}`
      );
      const satisfactionByDiscount = this.groupFeedbackByRange(feedbacks, 'alert.discountPercentage');
      const bookingRateByScore = this.analyzeBookingVsAIScore(feedbacks);

      return {
        airlinePreferences: satisfactionByAirline,
        routePerformance: satisfactionByRoute,
        discountEffectiveness: satisfactionByDiscount,
        aiAccuracy: bookingRateByScore,
        totalFeedbacks: feedbacks.length,
        bookingRate: this.calculateBookingRate(feedbacks),
        averageRating: this.calculateAverageRating(feedbacks)
      };
    } catch (error) {
      console.error('❌ Erreur analyse patterns:', error);
      return null;
    }
  }

  /**
   * Entraîner l'IA avec les nouvelles données
   */
  async trainWithFeedback(analysisData) {
    if (this.trainingInProgress) {
      console.log('⏳ Entraînement déjà en cours...');
      return false;
    }

    try {
      this.trainingInProgress = true;
      console.log('🧠 Démarrage entraînement ML...');

      // Prompt d'entraînement pour l'IA
      const trainingPrompt = `
Tu es un système IA de validation de deals de vol qui doit apprendre des feedbacks utilisateur.

DONNÉES D'ENTRAÎNEMENT (${analysisData.totalFeedbacks} feedbacks sur 30 jours):
- Taux de réservation global: ${analysisData.bookingRate}%
- Note moyenne: ${analysisData.averageRating}/5
- Précision IA actuelle: ${analysisData.aiAccuracy.accuracy}%

PATTERNS IDENTIFIÉS:
Airlines préférées: ${JSON.stringify(analysisData.airlinePreferences, null, 2)}
Routes performantes: ${JSON.stringify(analysisData.routePerformance, null, 2)}
Réductions efficaces: ${JSON.stringify(analysisData.discountEffectiveness, null, 2)}

PROBLÈMES DÉTECTÉS:
${this.identifyProblems(analysisData)}

Mission: Génère des nouvelles règles de validation améliorées basées sur ces données.

Retourne un JSON avec:
{
  "updatedCriteria": {
    "minConfidenceThreshold": 0-100,
    "minValueRating": 1-10,
    "airlineWeights": {"Air France": 1.2, "Ryanair": 0.8},
    "discountThresholds": {"domestic": 25, "international": 20},
    "routePriority": {"CDG-NYC": "high", "PAR-LON": "medium"}
  },
  "newValidationRules": [
    "Augmenter seuil pour compagnies low-cost en période haute",
    "Privilégier deals >35% pour routes saturées"
  ],
  "modelVersion": "1.1.0",
  "expectedImprovement": "15% taux booking, 0.3 pts note moyenne"
}
`;

      // Appeler l'IA pour génération des nouvelles règles
      const improvedCriteria = await routeAIRequest('model-training', trainingPrompt, analysisData);

      if (improvedCriteria && improvedCriteria.updatedCriteria) {
        // Sauvegarder les nouveaux critères
        await this.saveImprovedCriteria(improvedCriteria);
        
        this.modelVersion = improvedCriteria.modelVersion || '1.1.0';
        this.lastTraining = new Date();
        
        console.log('✅ Entraînement ML terminé avec succès');
        console.log('📈 Améliorations attendues:', improvedCriteria.expectedImprovement);
        
        return improvedCriteria;
      } else {
        throw new Error('IA n\'a pas retourné de critères valides');
      }

    } catch (error) {
      console.error('❌ Erreur entraînement ML:', error);
      return false;
    } finally {
      this.trainingInProgress = false;
    }
  }

  /**
   * Identifier les problèmes dans les données
   */
  identifyProblems(data) {
    const problems = [];
    
    if (data.bookingRate < 15) {
      problems.push('Taux de réservation très faible (<15%)');
    }
    
    if (data.averageRating < 3.5) {
      problems.push('Satisfaction utilisateur insuffisante (<3.5/5)');
    }
    
    if (data.aiAccuracy.accuracy < 70) {
      problems.push('Précision IA insuffisante (<70%)');
    }

    return problems.length > 0 ? problems.join(', ') : 'Aucun problème majeur détecté';
  }

  /**
   * Sauvegarder les critères améliorés
   */
  async saveImprovedCriteria(criteria) {
    try {
      // On pourrait créer un modèle MLSettings pour persister cela
      // Pour l'instant, on log et on pourrait utiliser un fichier config
      console.log('💾 Nouveaux critères ML:', JSON.stringify(criteria, null, 2));
      
      // TODO: Implémenter sauvegarde en DB ou fichier config
      // Cette configuration serait utilisée par dealValidationService
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde critères:', error);
    }
  }

  /**
   * Fonctions utilitaires d'analyse
   */
  groupFeedbackBy(feedbacks, keyFunc) {
    const groups = {};
    feedbacks.forEach(feedback => {
      const key = typeof keyFunc === 'function' ? keyFunc(feedback) : feedback[keyFunc];
      if (!groups[key]) {
        groups[key] = { ratings: [], bookings: 0, total: 0 };
      }
      groups[key].ratings.push(feedback.dealQualityRating);
      groups[key].total++;
      if (feedback.wasBooked) groups[key].bookings++;
    });

    // Calculer moyennes
    Object.keys(groups).forEach(key => {
      const group = groups[key];
      group.avgRating = group.ratings.reduce((a, b) => a + b, 0) / group.ratings.length;
      group.bookingRate = (group.bookings / group.total * 100).toFixed(1);
    });

    return groups;
  }

  groupFeedbackByRange(feedbacks, field) {
    const ranges = {
      '20-30%': [],
      '30-40%': [],
      '40-50%': [],
      '50%+': []
    };

    feedbacks.forEach(feedback => {
      const value = feedback.alert[field] || 0;
      if (value >= 50) ranges['50%+'].push(feedback);
      else if (value >= 40) ranges['40-50%'].push(feedback);
      else if (value >= 30) ranges['30-40%'].push(feedback);
      else ranges['20-30%'].push(feedback);
    });

    return ranges;
  }

  analyzeBookingVsAIScore(feedbacks) {
    const withScores = feedbacks.filter(f => f.aiValidationScore);
    if (withScores.length === 0) return { accuracy: 0, correlation: 0 };

    const correctPredictions = withScores.filter(f => 
      (f.aiValidationScore > 70 && f.wasBooked) || 
      (f.aiValidationScore <= 70 && !f.wasBooked)
    ).length;

    return {
      accuracy: (correctPredictions / withScores.length * 100).toFixed(1),
      totalWithScores: withScores.length,
      correctPredictions
    };
  }

  calculateBookingRate(feedbacks) {
    const bookings = feedbacks.filter(f => f.wasBooked).length;
    return (bookings / feedbacks.length * 100).toFixed(1);
  }

  calculateAverageRating(feedbacks) {
    const ratings = feedbacks.map(f => f.dealQualityRating);
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  }

  /**
   * Lancer un cycle d'entraînement complet
   */
  async runTrainingCycle() {
    try {
      console.log('🚀 Démarrage cycle d\'entraînement ML complet...');
      
      // 1. Collecter les données
      const feedbacks = await this.collectTrainingData(30);
      
      if (feedbacks.length < 10) {
        console.log('⚠️ Pas assez de feedbacks pour entraîner (minimum 10)');
        return false;
      }

      // 2. Analyser les patterns
      const analysis = await this.analyzeUserPatterns(feedbacks);
      
      // 3. Entraîner avec les nouvelles données
      const result = await this.trainWithFeedback(analysis);
      
      console.log('✅ Cycle d\'entraînement ML terminé');
      return result;
      
    } catch (error) {
      console.error('❌ Erreur cycle entraînement:', error);
      return false;
    }
  }

  /**
   * Obtenir le statut de l'entraînement ML
   */
  getStatus() {
    return {
      modelVersion: this.modelVersion,
      lastTraining: this.lastTraining,
      trainingInProgress: this.trainingInProgress,
      nextTrainingDue: this.getNextTrainingDate()
    };
  }

  getNextTrainingDate() {
    if (!this.lastTraining) return 'Aucun entraînement précédent';
    
    const nextTraining = new Date(this.lastTraining);
    nextTraining.setDate(nextTraining.getDate() + 7); // Chaque semaine
    
    return nextTraining;
  }
}

module.exports = new MachineLearningService(); 