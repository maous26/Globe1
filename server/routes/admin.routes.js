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

module.exports = router;