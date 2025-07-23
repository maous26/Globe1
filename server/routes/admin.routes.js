// server/routes/admin.routes.js
const express = require('express');
const adminController = require('../controllers/admin.controller');
const { auth, admin } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(auth, admin);

// Dashboard data
router.get('/dashboard', adminController.getDashboardData);

// User management
router.get('/users', adminController.getUsers);
router.patch('/users/subscription', adminController.updateUserSubscription);

// Route management
router.get('/routes', adminController.getRoutes);
router.patch('/routes/:routeId', adminController.updateRoute);
router.post('/routes/optimize', adminController.triggerRouteOptimization);

// Alert management
router.get('/alerts', adminController.getAlerts);

// API Stats
router.get('/api-stats', adminController.getApiStats);

module.exports = router;