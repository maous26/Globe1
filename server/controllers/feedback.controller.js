// server/controllers/feedback.controller.js
const DealFeedback = require('../models/dealFeedback.model');
const Alert = require('../models/alert.model');
const machineLearningService = require('../services/ai/machineLearningService');

/**
 * Enregistrer le feedback d'un utilisateur sur un deal
 */
exports.submitFeedback = async (req, res) => {
  try {
    const {
      alertId,
      dealQualityRating,
      wasBooked,
      reasonNotBooked,
      userComment,
      actualPriceFound,
      timeSpentViewing
    } = req.body;

    // Vérifier que l'alerte existe et appartient à l'utilisateur
    const alert = await Alert.findOne({
      _id: alertId,
      user: req.user.userId
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée ou non autorisée'
      });
    }

    // Vérifier si un feedback existe déjà
    const existingFeedback = await DealFeedback.findOne({
      alertId,
      userId: req.user.userId
    });

    if (existingFeedback) {
      return res.status(409).json({
        success: false,
        message: 'Feedback déjà enregistré pour cette alerte'
      });
    }

    // Détecter le device utilisé (simplifié)
    const userAgent = req.headers['user-agent'] || '';
    let deviceUsed = 'desktop';
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      deviceUsed = /iPad/i.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Créer le feedback
    const feedback = new DealFeedback({
      alertId,
      userId: req.user.userId,
      dealQualityRating,
      wasBooked,
      reasonNotBooked: wasBooked ? undefined : reasonNotBooked,
      userComment,
      deviceUsed,
      clickedAt: new Date(),
      timeSpentViewing,
      actualPriceFound,
      aiValidationScore: alert.aiScore || null, // Supposons qu'on sauvegarde le score IA dans l'alerte
      wasCorrectPrediction: wasBooked ? true : false // Logique simplifiée
    });

    await feedback.save();

    // Mettre à jour le statut de l'alerte si réservé
    if (wasBooked) {
      alert.status = 'booked';
      await alert.save();
    }

    console.log(`✅ Feedback enregistré: ${wasBooked ? 'RÉSERVÉ' : 'NON RÉSERVÉ'} - Note: ${dealQualityRating}/5`);

    res.status(201).json({
      success: true,
      message: 'Feedback enregistré avec succès',
      data: {
        feedbackId: feedback._id,
        thanksMessage: wasBooked 
          ? 'Merci ! Votre feedback nous aide à améliorer nos recommendations.'
          : 'Merci pour votre retour. Nous allons ajuster nos critères pour de meilleurs deals.'
      }
    });

  } catch (error) {
    console.error('Erreur enregistrement feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du feedback'
    });
  }
};

/**
 * Récupérer les feedbacks d'un utilisateur
 */
exports.getUserFeedbacks = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const feedbacks = await DealFeedback.find({
      userId: req.user.userId
    })
    .populate('alertId', 'departureAirport destinationAirport price originalPrice discountPercentage')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await DealFeedback.countDocuments({
      userId: req.user.userId
    });

    res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: feedbacks.length,
          totalFeedbacks: total
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération feedbacks:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des feedbacks'
    });
  }
};

/**
 * Déclencher un entraînement ML manuel (admin only)
 */
exports.triggerMLTraining = async (req, res) => {
  try {
    // Vérifier les permissions admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Admin requis'
      });
    }

    // Lancer l'entraînement
    console.log('🧠 Déclenchement entraînement ML manuel...');
    const result = await machineLearningService.runTrainingCycle();

    if (result) {
      res.json({
        success: true,
        message: 'Entraînement ML lancé avec succès',
        data: {
          modelVersion: result.modelVersion,
          expectedImprovement: result.expectedImprovement,
          newRules: result.newValidationRules
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Échec de l\'entraînement - Pas assez de données ou erreur'
      });
    }

  } catch (error) {
    console.error('Erreur déclenchement ML:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du déclenchement de l\'entraînement'
    });
  }
};

/**
 * Obtenir les statistiques ML (admin only)
 */
exports.getMLStats = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Admin requis'
      });
    }

    // Statistiques générales
    const totalFeedbacks = await DealFeedback.countDocuments();
    const bookingRate = await DealFeedback.aggregate([
      { $match: { wasBooked: { $ne: null } } },
      { $group: { 
        _id: null, 
        total: { $sum: 1 },
        booked: { $sum: { $cond: ['$wasBooked', 1, 0] } }
      }}
    ]);

    const avgRating = await DealFeedback.aggregate([
      { $match: { dealQualityRating: { $exists: true } } },
      { $group: { 
        _id: null, 
        avgRating: { $avg: '$dealQualityRating' }
      }}
    ]);

    // Statut du service ML
    const mlStatus = machineLearningService.getStatus();

    res.json({
      success: true,
      data: {
        feedbackStats: {
          totalFeedbacks,
          bookingRate: bookingRate[0] ? (bookingRate[0].booked / bookingRate[0].total * 100).toFixed(1) : 0,
          averageRating: avgRating[0] ? avgRating[0].avgRating.toFixed(1) : 0
        },
        mlService: mlStatus
      }
    });

  } catch (error) {
    console.error('Erreur récupération stats ML:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

/**
 * Enregistrer un clic sur une alerte (tracking automatique)
 */
exports.trackAlertClick = async (req, res) => {
  try {
    const { alertId } = req.params;
    
    // Vérifier que l'alerte existe et appartient à l'utilisateur
    const alert = await Alert.findOne({
      _id: alertId,
      user: req.user.userId
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    // Mettre à jour le statut de l'alerte
    alert.status = 'clicked';
    await alert.save();

    // Créer ou mettre à jour un feedback basique
    let feedback = await DealFeedback.findOne({
      alertId,
      userId: req.user.userId
    });

    if (!feedback) {
      const userAgent = req.headers['user-agent'] || '';
      let deviceUsed = 'desktop';
      if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
        deviceUsed = /iPad/i.test(userAgent) ? 'tablet' : 'mobile';
      }

      feedback = new DealFeedback({
        alertId,
        userId: req.user.userId,
        deviceUsed,
        clickedAt: new Date(),
        aiValidationScore: alert.aiScore || null
      });
      await feedback.save();
    } else {
      feedback.clickedAt = new Date();
      await feedback.save();
    }

    res.json({
      success: true,
      message: 'Clic enregistré',
      data: {
        redirectUrl: alert.bookingLink
      }
    });

  } catch (error) {
    console.error('Erreur tracking clic:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du clic'
    });
  }
}; 