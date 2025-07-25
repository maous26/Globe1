// server/controllers/admin.controller.js
const User = require('../models/user.model');
const Route = require('../models/route.model');
const Alert = require('../models/alert.model');
const ApiStats = require('../models/apiStats.model');
const { checkApiQuota } = require('../services/flight/flightService');
const { checkAIQuota } = require('../services/ai/aiService');
const { optimizeRoutes } = require('../services/ai/routeOptimizationService');

/**
 * Get admin dashboard data
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getDashboardData = async (req, res) => {
  try {
    // Get user counts
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ subscriptionType: 'premium' });
    const freeUsers = await User.countDocuments({ subscriptionType: 'free' });
    
    // Get route counts
    const totalRoutes = await Route.countDocuments();
    const activeRoutes = await Route.countDocuments({ isActive: true });
    
    // Get active routes by tier
    const ultraPriorityRoutes = await Route.countDocuments({ tier: 'ultra-priority', isActive: true });
    const priorityRoutes = await Route.countDocuments({ tier: 'priority', isActive: true });
    const complementaryRoutes = await Route.countDocuments({ tier: 'complementary', isActive: true });
    
    // Get alert counts
    const totalAlerts = await Alert.countDocuments();
    const todayAlerts = await Alert.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    
    // Calculate changes from last month
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setHours(0, 0, 0, 0);
    
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    // Get last month data for comparison
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $lt: thisMonthStart }
    });
    const lastMonthPremiumUsers = await User.countDocuments({
      subscriptionType: 'premium',
      createdAt: { $lt: thisMonthStart }
    });
    const lastMonthActiveRoutes = await Route.countDocuments({
      isActive: true,
      createdAt: { $lt: thisMonthStart }
    });
    
    // Calculate yesterday alerts for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const dayAfterYesterday = new Date(yesterday);
    dayAfterYesterday.setDate(dayAfterYesterday.getDate() + 1);
    
    const yesterdayAlerts = await Alert.countDocuments({
      createdAt: { $gte: yesterday, $lt: dayAfterYesterday }
    });
    
    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };
    
    const userChange = calculateChange(totalUsers, lastMonthUsers);
    const premiumUserChange = calculateChange(premiumUsers, lastMonthPremiumUsers);
    const routeChange = calculateChange(activeRoutes, lastMonthActiveRoutes);
    const alertChange = calculateChange(todayAlerts, yesterdayAlerts);
    
    // Get API quota
    const apiQuota = await checkApiQuota();
    
    // Get AI quota
    const aiQuota = await checkAIQuota();
    
    // Get recent API stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - 7);
    
    const apiStats = await ApiStats.find({
      date: { $gte: lastWeekStart }
    }).sort({ date: 1 });
    
    // Format stats for chart
    const dailyApiCalls = apiStats.map(stat => ({
      date: stat.date.toISOString().split('T')[0],
      totalCalls: stat.totalCalls,
      successfulCalls: stat.successfulCalls,
      failedCalls: stat.failedCalls,
      aiCalls: (stat.aiCallsByType['gemini-flash'] || 0) + (stat.aiCallsByType['gpt4o-mini'] || 0)
    }));
    
    // Get recent alerts for chart
    const alertStats = await Alert.aggregate([
      {
        $match: {
          createdAt: { $gte: lastWeekStart }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Format alert stats
    const dailyAlerts = alertStats.map(stat => ({
      date: stat._id,
      count: stat.count
    }));
    
    // Return dashboard data
    res.status(200).json({
      users: {
        total: totalUsers,
        premium: premiumUsers,
        free: freeUsers,
        conversionRate: totalUsers > 0 ? (premiumUsers / totalUsers * 100).toFixed(1) : 0,
        change: userChange
      },
      routes: {
        total: totalRoutes,
        active: activeRoutes,
        byTier: {
          ultraPriority: ultraPriorityRoutes,
          priority: priorityRoutes,
          complementary: complementaryRoutes
        },
        change: routeChange
      },
      alerts: {
        total: totalAlerts,
        today: todayAlerts,
        daily: dailyAlerts,
        change: alertChange
      },
      premium: {
        change: premiumUserChange
      },
      api: {
        quota: apiQuota,
        dailyCalls: dailyApiCalls
      },
      ai: {
        quota: aiQuota
      }
    });
  } catch (error) {
    console.error('Error getting admin dashboard data:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des données du tableau de bord' });
  }
};

/**
 * Get users with pagination
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    
    // Build search query
    const searchQuery = search 
      ? { 
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } }
          ] 
        } 
      : {};
    
    // Get users with pagination
    const users = await User.find(searchQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await User.countDocuments(searchQuery);
    
    res.status(200).json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
};

/**
 * Update user subscription
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.updateUserSubscription = async (req, res) => {
  try {
    const { userId, subscriptionType } = req.body;
    
    if (!userId || !subscriptionType) {
      return res.status(400).json({ message: 'ID utilisateur et type d\'abonnement requis' });
    }
    
    if (!['free', 'premium'].includes(subscriptionType)) {
      return res.status(400).json({ message: 'Type d\'abonnement invalide' });
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { subscriptionType },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.status(200).json({ 
      message: `Abonnement mis à jour vers ${subscriptionType}`,
      user
    });
  } catch (error) {
    console.error('Error updating user subscription:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'abonnement' });
  }
};

/**
 * Get routes with pagination
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getRoutes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const tier = req.query.tier || '';
    const isActive = req.query.isActive === 'true' ? true : (req.query.isActive === 'false' ? false : null);
    
    // Build filter query
    let filterQuery = {};
    
    if (search) {
      filterQuery = { 
        $or: [
          { 'departureAirport.code': { $regex: search, $options: 'i' } },
          { 'departureAirport.name': { $regex: search, $options: 'i' } },
          { 'destinationAirport.code': { $regex: search, $options: 'i' } },
          { 'destinationAirport.name': { $regex: search, $options: 'i' } }
        ] 
      };
    }
    
    if (tier) {
      filterQuery.tier = tier;
    }
    
    if (isActive !== null) {
      filterQuery.isActive = isActive;
    }
    
    // Get routes with pagination
    const routes = await Route.find(filterQuery)
      .sort({ tier: 1, 'departureAirport.code': 1, 'destinationAirport.code': 1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Route.countDocuments(filterQuery);
    
    // Get summary by departure airport
    const departureAirportStats = await Route.aggregate([
      { $match: filterQuery },
      { 
        $group: {
          _id: '$departureAirport.code',
          name: { $first: '$departureAirport.name' },
          count: { $sum: 1 },
          activeCount: { 
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get summary by tier
    const tierStats = await Route.aggregate([
      { $match: filterQuery },
      { 
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
          activeCount: { 
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      routes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      stats: {
        byDeparture: departureAirportStats,
        byTier: tierStats
      }
    });
  } catch (error) {
    console.error('Error getting routes:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des routes' });
  }
};

/**
 * Update route
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.updateRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { tier, scanFrequency, isActive } = req.body;
    
    if (!routeId) {
      return res.status(400).json({ message: 'ID route requis' });
    }
    
    // Validate data
    if (tier && !['ultra-priority', 'priority', 'complementary'].includes(tier)) {
      return res.status(400).json({ message: 'Tier invalide' });
    }
    
    if (scanFrequency && (scanFrequency < 1 || scanFrequency > 12)) {
      return res.status(400).json({ message: 'Fréquence de scan invalide (1-12)' });
    }
    
    // Build update object
    const updateData = {};
    
    if (tier) updateData.tier = tier;
    if (scanFrequency) updateData.scanFrequency = scanFrequency;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Update route
    const route = await Route.findByIdAndUpdate(
      routeId,
      updateData,
      { new: true }
    );
    
    if (!route) {
      return res.status(404).json({ message: 'Route non trouvée' });
    }
    
    res.status(200).json({ 
      message: 'Route mise à jour',
      route
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la route' });
  }
};

/**
 * Get alerts with pagination
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAlerts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    // Build filter query
    let filterQuery = {};
    
    if (search) {
      filterQuery = { 
        $or: [
          { 'departureAirport.code': { $regex: search, $options: 'i' } },
          { 'destinationAirport.code': { $regex: search, $options: 'i' } },
          { 'airline': { $regex: search, $options: 'i' } }
        ] 
      };
    }
    
    if (status) {
      filterQuery.status = status;
    }
    
    // Add date range if provided
    if (startDate && endDate) {
      filterQuery.createdAt = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filterQuery.createdAt = { $gte: startDate };
    } else if (endDate) {
      filterQuery.createdAt = { $lte: endDate };
    }
    
    // Get alerts with pagination and populate user
    const alerts = await Alert.find(filterQuery)
      .populate('user', 'email firstName subscriptionType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Alert.countDocuments(filterQuery);
    
    // Get summary by status
    const statusStats = await Alert.aggregate([
      { $match: filterQuery },
      { 
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get summary by airline
    const airlineStats = await Alert.aggregate([
      { $match: filterQuery },
      { 
        $group: {
          _id: '$airline',
          count: { $sum: 1 },
          avgDiscount: { $avg: '$discountPercentage' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.status(200).json({
      alerts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      stats: {
        byStatus: statusStats,
        byAirline: airlineStats
      }
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des alertes' });
  }
};

/**
 * Get API stats
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getApiStats = async (req, res) => {
  try {
    // Validation et parsing des dates avec gestion d'erreur
    let startDate, endDate;
    
    try {
      startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
      
      // Vérifier que les dates sont valides
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Ensure we have full days
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
    } catch (dateError) {
      console.error('Date parsing error:', dateError);
      // Utiliser des dates par défaut en cas d'erreur
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      endDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Get API stats for date range
    const apiStats = await ApiStats.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    // Get current quota
    const apiQuota = await checkApiQuota();
    
    // Format daily stats
    const dailyStats = apiStats.map(stat => ({
      date: stat.date.toISOString().split('T')[0],
      totalCalls: stat.totalCalls,
      successfulCalls: stat.successfulCalls,
      failedCalls: stat.failedCalls,
      aiCalls: {
        geminiFlash: stat.aiCallsByType['gemini-flash'] || 0,
        gpt4oMini: stat.aiCallsByType['gpt4o-mini'] || 0,
        total: (stat.aiCallsByType['gemini-flash'] || 0) + (stat.aiCallsByType['gpt4o-mini'] || 0)
      }
    }));
    
    // Get route stats
    const routeStats = [];
    
    apiStats.forEach(stat => {
      if (stat.callsByRoute && stat.callsByRoute.size > 0) {
        for (const [route, count] of stat.callsByRoute.entries()) {
          const routeIndex = routeStats.findIndex(r => r.route === route);
          
          if (routeIndex >= 0) {
            routeStats[routeIndex].calls += count;
          } else {
            routeStats.push({ route, calls: count });
          }
        }
      }
    });
    
    // Sort route stats by calls
    routeStats.sort((a, b) => b.calls - a.calls);
    
    // Get airport stats
    const airportStats = [];
    
    apiStats.forEach(stat => {
      if (stat.callsByAirport && stat.callsByAirport.size > 0) {
        for (const [airport, count] of stat.callsByAirport.entries()) {
          const airportIndex = airportStats.findIndex(a => a.airport === airport);
          
          if (airportIndex >= 0) {
            airportStats[airportIndex].calls += count;
          } else {
            airportStats.push({ airport, calls: count });
          }
        }
      }
    });
    
    // Sort airport stats by calls
    airportStats.sort((a, b) => b.calls - a.calls);
    
    // Calculate totals
    const totals = {
      totalCalls: apiStats.reduce((sum, stat) => sum + stat.totalCalls, 0),
      successfulCalls: apiStats.reduce((sum, stat) => sum + stat.successfulCalls, 0),
      failedCalls: apiStats.reduce((sum, stat) => sum + stat.failedCalls, 0),
      aiCalls: {
        geminiFlash: apiStats.reduce((sum, stat) => sum + (stat.aiCallsByType['gemini-flash'] || 0), 0),
        gpt4oMini: apiStats.reduce((sum, stat) => sum + (stat.aiCallsByType['gpt4o-mini'] || 0), 0)
      }
    };
    
    totals.aiCalls.total = totals.aiCalls.geminiFlash + totals.aiCalls.gpt4oMini;
    
    res.status(200).json({
      quota: apiQuota,
      daily: dailyStats,
      routes: routeStats.slice(0, 20), // Top 20 routes
      airports: airportStats.slice(0, 10), // Top 10 airports
      totals
    });
  } catch (error) {
    console.error('Error getting API stats:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques API' });
  }
};

/**
 * Trigger route optimization
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.triggerRouteOptimization = async (req, res) => {
  try {
    const { isFullOptimization = false } = req.body;
    
    // Get current API quota
    const apiQuota = await checkApiQuota();
    
    // Run optimization
    const optimization = await optimizeRoutes({
      quota: apiQuota.remaining,
      isFullOptimization
    });
    
    // Apply optimizations
    let updatedCount = 0;
    let addedCount = 0;
    let removedCount = 0;
    
    // Update existing routes
    if (optimization.routesToUpdate && optimization.routesToUpdate.length > 0) {
      for (const routeUpdate of optimization.routesToUpdate) {
        await Route.findOneAndUpdate(
          {
            'departureAirport.code': routeUpdate.departureCode,
            'destinationAirport.code': routeUpdate.destinationCode
          },
          {
            scanFrequency: routeUpdate.newScanFrequency,
            tier: routeUpdate.newTier,
            isActive: routeUpdate.isActive
          }
        );
        
        updatedCount++;
      }
    }
    
    // Add new routes
    if (isFullOptimization && optimization.newRoutes && optimization.newRoutes.length > 0) {
      const newRoutes = optimization.newRoutes.map(newRoute => ({
        departureAirport: {
          code: newRoute.departureCode,
          name: newRoute.departureName
        },
        destinationAirport: {
          code: newRoute.destinationCode,
          name: newRoute.destinationName
        },
        tier: newRoute.tier,
        scanFrequency: newRoute.tier === 'ultra-priority' ? 6 : (newRoute.tier === 'priority' ? 4 : 2),
        isSeasonal: newRoute.isSeasonal,
        seasonalPeriod: newRoute.isSeasonal ? {
          start: new Date(newRoute.seasonStart),
          end: new Date(newRoute.seasonEnd)
        } : undefined,
        isActive: true
      }));
      
      await Route.insertMany(newRoutes);
      addedCount = newRoutes.length;
    }
    
    // Remove routes
    if (isFullOptimization && optimization.routesToRemove && optimization.routesToRemove.length > 0) {
      for (const routeToRemove of optimization.routesToRemove) {
        await Route.findOneAndDelete({
          'departureAirport.code': routeToRemove.departureCode,
          'destinationAirport.code': routeToRemove.destinationCode
        });
        
        removedCount++;
      }
    }
    
    res.status(200).json({
      message: `Optimisation des routes ${isFullOptimization ? 'complète' : 'quotidienne'} effectuée avec succès`,
      stats: {
        updated: updatedCount,
        added: addedCount,
        removed: removedCount,
        estimatedApiCalls: optimization.estimatedApiCalls
      },
      summary: optimization.summary
    });
  } catch (error) {
    console.error('Error triggering route optimization:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'optimisation des routes' });
  }
};