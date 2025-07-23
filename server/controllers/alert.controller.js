// server/controllers/alert.controller.js
const Alert = require('../models/alert.model');
const User = require('../models/user.model');
const { getAlternativeDates } = require('../services/flight/flightService');

/**
 * Get all alerts for current user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUserAlerts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get alerts with pagination
    const alerts = await Alert.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Alert.countDocuments({ user: req.userId });
    
    res.status(200).json({
      alerts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting user alerts:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des alertes' });
  }
};

/**
 * Get alert details by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAlertById = async (req, res) => {
  try {
    const alertId = req.params.id;
    
    // Find alert and ensure it belongs to current user
    const alert = await Alert.findOne({
      _id: alertId,
      user: req.userId
    });
    
    if (!alert) {
      return res.status(404).json({ message: 'Alerte non trouvée' });
    }
    
    res.status(200).json({ alert });
  } catch (error) {
    console.error('Error getting alert details:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des détails de l\'alerte' });
  }
};

/**
 * Mark alert as clicked
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.markAlertClicked = async (req, res) => {
  try {
    const alertId = req.params.id;
    
    // Find alert and ensure it belongs to current user
    const alert = await Alert.findOne({
      _id: alertId,
      user: req.userId
    });
    
    if (!alert) {
      return res.status(404).json({ message: 'Alerte non trouvée' });
    }
    
    // Update status to clicked
    alert.status = 'clicked';
    await alert.save();
    
    res.status(200).json({ message: 'Statut de l\'alerte mis à jour' });
  } catch (error) {
    console.error('Error marking alert as clicked:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du statut de l\'alerte' });
  }
};

/**
 * Get alternative dates for an alert
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAlternativeDates = async (req, res) => {
  try {
    const alertId = req.params.id;
    
    // Find alert and ensure it belongs to current user
    const alert = await Alert.findOne({
      _id: alertId,
      user: req.userId
    });
    
    if (!alert) {
      return res.status(404).json({ message: 'Alerte non trouvée' });
    }
    
    // If we already have alternative dates, return them
    if (alert.alternativeDates && alert.alternativeDates.length > 0) {
      return res.status(200).json({ alternativeDates: alert.alternativeDates });
    }
    
    // Otherwise, fetch new alternative dates
    const alternatives = await getAlternativeDates(
      alert.departureAirport.code,
      alert.destinationAirport.code,
      alert.outboundDate,
      alert.returnDate,
      alert.price
    );
    
    // Update alert with new alternatives
    alert.alternativeDates = alternatives.map(alt => ({
      outbound: new Date(alt.outbound),
      return: new Date(alt.return)
    }));
    
    await alert.save();
    
    res.status(200).json({ alternativeDates: alert.alternativeDates });
  } catch (error) {
    console.error('Error getting alternative dates:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des dates alternatives' });
  }
};

/**
 * Get user alert statistics
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUserAlertStats = async (req, res) => {
  try {
    // Get count of alerts by status
    const alertStats = await Alert.aggregate([
      { $match: { user: req.userId } },
      { $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format results
    const stats = {
      total: 0,
      sent: 0,
      clicked: 0,
      expired: 0
    };
    
    alertStats.forEach(stat => {
      stats[stat._id] = stat.count;
      stats.total += stat.count;
    });
    
    // Get user's total potential savings
    const user = await User.findById(req.userId);
    stats.totalPotentialSavings = user.totalPotentialSavings || 0;
    
    // Get most popular destinations
    const popularDestinations = await Alert.aggregate([
      { $match: { user: req.userId } },
      { $group: {
          _id: '$destinationAirport.code',
          name: { $first: '$destinationAirport.name' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get alerts by month
    const alertsByMonth = await Alert.aggregate([
      { $match: { user: req.userId } },
      { $project: {
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' }
        }
      },
      { $group: {
          _id: { month: '$month', year: '$year' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.status(200).json({
      stats,
      popularDestinations,
      alertsByMonth
    });
  } catch (error) {
    console.error('Error getting user alert stats:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques d\'alertes' });
  }
};