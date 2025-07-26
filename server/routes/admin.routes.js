// server/routes/admin.routes.js
const router = require('express').Router();
const { auth, admin } = require('../middlewares/auth.middleware');
const User = require('../models/user.model');
const Route = require('../models/route.model');
const Alert = require('../models/alert.model');
const ApiStats = require('../models/apiStats.model');
const { optimizeRoutes } = require('../services/ai/routeOptimizationService');
const { getTodayStats } = require('../services/analytics/statsService');
const adminController = require('../controllers/admin.controller');
const { importAirlinesFromJson, getBaggagePolicy } = require('../services/baggage/baggageImportService');
const { baggageAIAgent } = require('../services/baggage/baggageAIAgent');
const AirlineBaggage = require('../models/airlineBaggage.model');
const smartRouteOptimizerAgent = require('../services/ai/smartRouteOptimizerAgent');

// Toutes les routes admin nécessitent l'authentification ET les droits admin
router.use(auth, admin);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard', adminController.getDashboardData);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filters
 * @access  Private/Admin
 */
router.get('/users', adminController.getUsers);

// /**
//  * @route   GET /api/admin/users/:id
//  * @desc    Get user details
//  * @access  Private/Admin
//  */
// router.get('/users/:id', adminController.getUserDetails);

/**
 * @route   PUT /api/admin/users/:id/subscription
 * @desc    Update user subscription
 * @access  Private/Admin
 */
router.put('/users/:id/subscription', adminController.updateUserSubscription);

/**
 * @route   GET /api/admin/routes
 * @desc    Get all routes with pagination and filters
 * @access  Private/Admin
 */
router.get('/routes', adminController.getRoutes);

/**
 * @route   POST /api/admin/routes
 * @desc    Create new route
 * @access  Private/Admin
 */
// router.post('/routes', adminController.createRoute);

/**
 * @route   PUT /api/admin/routes/:id
 * @desc    Update route
 * @access  Private/Admin
 */
router.put('/routes/:id', adminController.updateRoute);

/**
 * @route   DELETE /api/admin/routes/:id
 * @desc    Delete route
 * @access  Private/Admin
 */
// router.delete('/routes/:id', adminController.deleteRoute);

/**
 * @route   POST /api/admin/routes/optimize
 * @desc    Run route optimization
 * @access  Private/Admin
 */
router.post('/routes/optimize', async (req, res) => {
  try {
    const { isFullOptimization = false } = req.body;
    
    console.log(`Starting ${isFullOptimization ? 'full' : 'daily'} route optimization...`);
    
    const result = await optimizeRoutes({
      isFullOptimization,
      maxRoutes: isFullOptimization ? 1000 : 50
    });
    
    res.json({
      success: true,
      result,
      message: `Optimisation ${isFullOptimization ? 'complète' : 'quotidienne'} terminée`
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'optimisation' });
  }
});

/**
 * @route   GET /api/admin/api-stats
 * @desc    Get API usage statistics
 * @access  Private/Admin
 */
router.get('/api-stats', adminController.getApiStats);

/**
 * @route   GET /api/admin/alerts
 * @desc    Get all alerts with pagination and filters
 * @access  Private/Admin
 */
router.get('/alerts', adminController.getAlerts);

/**
 * @route   POST /api/admin/routes/scan
 * @desc    Trigger manual route scanning for testing
 * @access  Private/Admin
 */
router.post('/routes/scan', async (req, res) => {
  try {
    const { tier = 'ultra-priority', maxCalls = 5 } = req.body;
    
    console.log(`🚀 Manual scan triggered by admin: ${tier} (max ${maxCalls} calls)`);
    
    // Import the monitoring function
    const { monitorRoutesByTier } = require('../services/flight/routeMonitor');
    
    // Trigger monitoring
    await monitorRoutesByTier(tier, maxCalls);
    
    res.json({
      success: true,
      message: `Manual scan completed for ${tier}`,
      tier,
      maxCalls
    });
  } catch (error) {
    console.error('Manual scan error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du scan manuel',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/admin/routes/manual-scan
 * @desc    Trigger manual route scan for testing
 * @access  Private/Admin
 */
router.post('/routes/manual-scan', async (req, res) => {
  try {
    console.log('🔄 Scan manuel des routes déclenché par admin');
    
    const Route = require('../models/route.model');
    const routes = await Route.find({ isActive: true }).limit(5); // Test avec 5 routes
    
    if (routes.length === 0) {
      return res.status(400).json({ message: 'Aucune route active trouvée' });
    }

    // Déclencher le scan de manière asynchrone
    const scanPromises = routes.map(async (route) => {
      try {
        // Import dynamique pour éviter les dépendances circulaires
        const routeMonitor = require('../services/flight/routeMonitor');
        const { scanRoute } = routeMonitor;
        
        if (scanRoute) {
          console.log(`🔍 Scan de ${route.departureAirport.code}-${route.destinationAirport.code}`);
          await scanRoute(route, { 
            isOptimalTiming: true, 
            hour: new Date().getHours(), 
            dayOfWeek: new Date().getDay(),
            manualTrigger: true 
          });
          return { route: `${route.departureAirport.code}-${route.destinationAirport.code}`, status: 'success' };
        } else {
          return { route: `${route.departureAirport.code}-${route.destinationAirport.code}`, status: 'function_not_found' };
        }
      } catch (error) {
        console.error(`❌ Erreur scan ${route.departureAirport.code}-${route.destinationAirport.code}:`, error.message);
        return { route: `${route.departureAirport.code}-${route.destinationAirport.code}`, status: 'error', error: error.message };
      }
    });

    Promise.all(scanPromises)
      .then((results) => {
        console.log('✅ Scans manuels terminés:', results);
      })
      .catch((error) => {
        console.error('❌ Erreur scans manuels:', error);
      });
    
    res.status(200).json({ 
      message: `Scan manuel de ${routes.length} routes déclenché`,
      routes: routes.map(r => `${r.departureAirport.code}-${r.destinationAirport.code}`),
      status: 'running',
      note: 'Vérifiez les logs backend pour les résultats'
    });
  } catch (error) {
    console.error('Error triggering manual route scan:', error);
    res.status(500).json({ message: 'Erreur lors du déclenchement du scan manuel' });
  }
});

/**
 * @route   GET /api/admin/baggage-policies
 * @desc    Get all baggage policies with pagination
 * @access  Private/Admin
 */
router.get('/baggage-policies', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', airline = '' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { airlineName: { $regex: search, $options: 'i' } },
        { airlineCode: { $regex: search, $options: 'i' } }
      ];
    }
    if (airline) {
      query.airlineName = { $regex: airline, $options: 'i' };
    }
    
    const skip = (page - 1) * limit;
    const policies = await AirlineBaggage.find(query)
      .sort({ lastUpdated: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await AirlineBaggage.countDocuments(query);
    
    res.json({
      policies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching baggage policies:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des politiques de bagages' 
    });
  }
});

/**
 * @route   GET /api/admin/baggage-policies/:airline
 * @desc    Get specific airline baggage policy
 * @access  Private/Admin
 */
router.get('/baggage-policies/:airline', async (req, res) => {
  try {
    const { airline } = req.params;
    const policy = await getBaggagePolicy(airline);
    
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Politique de bagages non trouvée pour cette compagnie'
      });
    }
    
    res.json({
      success: true,
      policy
    });
  } catch (error) {
    console.error('Error fetching baggage policy:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de la politique de bagages' 
    });
  }
});

/**
 * @route   POST /api/admin/baggage-policies/import
 * @desc    Import baggage policies from JSON file
 * @access  Private/Admin
 */
router.post('/baggage-policies/import', async (req, res) => {
  try {
    console.log('🚀 Import des politiques de bagages déclenché par admin');
    
    const result = await importAirlinesFromJson();
    
    res.json({
      success: true,
      message: 'Import des politiques de bagages terminé',
      data: result
    });
  } catch (error) {
    console.error('Error importing baggage policies:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'import des politiques de bagages',
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/admin/baggage-policies/ai-update
 * @desc    Trigger AI update of outdated baggage policies
 * @access  Private/Admin
 */
router.post('/baggage-policies/ai-update', async (req, res) => {
  try {
    console.log('🤖 Mise à jour IA des politiques de bagages déclenchée par admin');
    
    if (baggageAIAgent.isRunning) {
      return res.status(409).json({
        success: false,
        message: 'Une mise à jour IA est déjà en cours'
      });
    }
    
    // Déclencher la mise à jour en arrière-plan
    baggageAIAgent.triggerManualUpdate()
      .then(result => {
        console.log('✅ Mise à jour IA terminée:', result);
      })
      .catch(error => {
        console.error('❌ Erreur mise à jour IA:', error);
      });
    
    res.json({
      success: true,
      message: 'Mise à jour IA des politiques de bagages démarrée',
      status: 'En cours...'
    });
  } catch (error) {
    console.error('Error triggering AI update:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du déclenchement de la mise à jour IA',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/admin/baggage-ai-status
 * @desc    Get AI agent status
 * @access  Private/Admin
 */
router.get('/baggage-ai-status', async (req, res) => {
  try {
    const status = baggageAIAgent.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting AI status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération du statut de l\'agent IA' 
    });
  }
});

/**
 * @route   GET /api/admin/baggage-stats
 * @desc    Get baggage policies statistics
 * @access  Private/Admin
 */
router.get('/baggage-stats', async (req, res) => {
  try {
    const total = await AirlineBaggage.countDocuments();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const outdated = await AirlineBaggage.countDocuments({
      lastUpdated: { $lt: oneMonthAgo }
    });
    
    const updated = total - outdated;
    
    // Statistiques par source de mise à jour
    const byUpdatedBy = await AirlineBaggage.aggregate([
      { $group: { _id: '$updatedBy', count: { $sum: 1 } } }
    ]);
    
    // Dernières mises à jour
    const recentUpdates = await AirlineBaggage.find()
      .sort({ lastUpdated: -1 })
      .limit(5)
      .select('airlineName lastUpdated updatedBy version');
    
    res.json({
      success: true,
      stats: {
        total,
        updated,
        outdated,
        updateSources: byUpdatedBy,
        recentUpdates
      }
    });
  } catch (error) {
    console.error('Error getting baggage stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques' 
    });
  }
});

/**
 * @route   GET /api/admin/ai-optimizer/quarterly-report
 * @desc    Get quarterly AI route optimizer performance report
 * @access  Private/Admin
 */
router.get('/ai-optimizer/quarterly-report', async (req, res) => {
  try {
    const report = await smartRouteOptimizerAgent.getPerformanceReport('quarterly');
    res.status(200).json(report);
  } catch (error) {
    console.error('Error getting quarterly AI optimizer report:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du rapport trimestriel IA' });
  }
});

/**
 * @route   POST /api/admin/ai-optimizer/manual-quarterly-analysis
 * @desc    Trigger manual quarterly AI route analysis
 * @access  Private/Admin
 */
router.post('/ai-optimizer/manual-quarterly-analysis', async (req, res) => {
  try {
    console.log('🔄 Analyse IA trimestrielle manuelle déclenchée par admin');
    
    // Déclencher l'analyse trimestrielle de manière asynchrone
    smartRouteOptimizerAgent.performQuarterlyAnalysis()
      .then(() => {
        console.log('✅ Analyse IA trimestrielle manuelle terminée');
      })
      .catch(error => {
        console.error('❌ Erreur analyse IA trimestrielle manuelle:', error);
      });
    
    res.status(200).json({ 
      message: 'Analyse IA trimestrielle déclenchée avec succès',
      status: 'running',
      note: 'Cette analyse approfondie peut prendre plusieurs minutes'
    });
  } catch (error) {
    console.error('Error triggering quarterly AI analysis:', error);
    res.status(500).json({ message: 'Erreur lors du déclenchement de l\'analyse IA trimestrielle' });
  }
});

/**
 * @route   GET /api/admin/ai-optimizer/report
 * @desc    Get AI route optimizer performance report
 * @access  Private/Admin
 */
router.get('/ai-optimizer/report', async (req, res) => {
  try {
    const report = await smartRouteOptimizerAgent.getPerformanceReport();
    res.status(200).json(report);
  } catch (error) {
    console.error('Error getting AI optimizer report:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du rapport IA' });
  }
});

/**
 * @route   POST /api/admin/ai-optimizer/manual-optimization
 * @desc    Trigger manual AI route optimization
 * @access  Private/Admin
 */
router.post('/ai-optimizer/manual-optimization', async (req, res) => {
  try {
    console.log('🔄 Optimisation IA manuelle déclenchée par admin');
    
    // Déclencher l'optimisation de manière asynchrone
    smartRouteOptimizerAgent.performWeeklyOptimization()
      .then(() => {
        console.log('✅ Optimisation IA manuelle terminée');
      })
      .catch(error => {
        console.error('❌ Erreur optimisation IA manuelle:', error);
      });
    
    res.status(200).json({ 
      message: 'Optimisation IA déclenchée avec succès',
      status: 'running'
    });
  } catch (error) {
    console.error('Error triggering manual AI optimization:', error);
    res.status(500).json({ message: 'Erreur lors du déclenchement de l\'optimisation IA' });
  }
});

/**
 * @route   GET /api/admin/cache/stats
 * @desc    Get cache statistics
 * @access  Private/Admin
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const cacheService = require('../services/cache/cacheService');
    const stats = await cacheService.getCacheStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des stats cache' });
  }
});

module.exports = router;