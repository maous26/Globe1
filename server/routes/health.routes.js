// server/routes/health.routes.js
const router = require('express').Router();
const mongoose = require('mongoose');

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    
    // Check Redis connection (if needed)
    let redisStatus = 'not configured';
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await redis.ping();
      redisStatus = 'connected';
      redis.disconnect();
    } catch (error) {
      redisStatus = 'disconnected';
    }
    
    // Check SendGrid configuration
    const sendgridConfigured = !!process.env.SENDGRID_API_KEY;
    
    // Check Flight API configuration
    const flightApiConfigured = !!process.env.FLIGHT_API_KEY;
    
    const health = {
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbStatus,
        redis: redisStatus,
        sendgrid: sendgridConfigured ? 'configured' : 'not configured',
        flightApi: flightApiConfigured ? 'configured' : 'not configured'
      }
    };
    
    // Determine overall health
    if (dbStatus !== 'connected') {
      health.status = 'degraded';
      health.message = 'Database connection issue';
    }
    
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check (admin only)
 * @access  Private/Admin
 */
router.get('/detailed', async (req, res) => {
  try {
    // This would include more detailed information
    // Add auth middleware for production
    
    const health = {
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3001,
        API_URL: process.env.FLIGHT_API_URL ? 'configured' : 'not configured'
      }
    };
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Detailed health check failed',
      error: error.message
    });
  }
});

module.exports = router;