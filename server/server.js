// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const routeMonitor = require('./services/flight/routeMonitor');
const cacheService = require('./services/cache/cacheService');

// Load environment variables
dotenv.config();
if (process.env.SENDGRID_API_KEY) {
  console.log('SENDGRID_API_KEY (from env):', process.env.SENDGRID_API_KEY.slice(0, 6) + '...' , '| type:', typeof process.env.SENDGRID_API_KEY);
} else {
  console.log('SENDGRID_API_KEY (from env): undefined');
}
console.log('FLIGHT_API_URL:', process.env.FLIGHT_API_URL);
if (process.env.FLIGHT_API_KEY) {
  console.log('FLIGHT_API_KEY:', process.env.FLIGHT_API_KEY.slice(0,6) + '...');
} else {
  console.log('FLIGHT_API_KEY is not set');
}

// Initialize Express app
const app = express();

// CORS configuration - Allow all localhost ports
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,x-auth-token'
}));
app.options('*', cors()); // Handle preflight requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius')
  .then(async () => {
    console.log('MongoDB connected');
    
    // Initialize cache service
    try {
      console.log('🔄 Initializing Redis cache...');
      await cacheService.initialize();
      console.log('✅ Cache service ready');
    } catch (error) {
      console.warn('⚠️  Cache initialization failed, continuing without cache:', error.message);
    }
    
    // Initialize email templates
    const { initializeEmailTemplates } = require('./services/email/emailService');
    initializeEmailTemplates();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const alertRoutes = require('./routes/alert.routes');
const adminRoutes = require('./routes/admin.routes');
const flightRoutes = require('./routes/flight.routes');
const healthRoutes = require('./routes/health.routes');

// Services
const { startRouteMonitoring } = require('./services/flight/routeMonitor');
const { baggageAIAgent } = require('./services/baggage/baggageAIAgent');
const smartRouteOptimizerAgent = require('./services/ai/smartRouteOptimizerAgent');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/health', healthRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/`);
  console.log(`🔧 Admin: http://localhost:3000/admin`);
  
  // Start route monitoring after server is ready
  try {
    console.log('🔄 Initializing route monitoring...');
    routeMonitor.start();
    console.log('✅ Route monitoring initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize route monitoring:', error);
  }

  // Initialize baggage AI agent
  try {
    console.log('🤖 Baggage AI Agent initialized and scheduled');
    console.log('📅 Automatic updates: 1er du mois à 02:00 & Dimanche à 03:00');
    console.log('🎒 Baggage policies system ready');
  } catch (error) {
    console.error('❌ Failed to initialize baggage AI agent:', error);
  }

  // Initialize Smart Route Optimizer AI Agent
  try {
    console.log('🧠 Initializing Smart Route Optimizer AI Agent...');
    smartRouteOptimizerAgent.start();
    console.log('🎯 Smart Route Optimizer AI ready');
    console.log('📅 Analyse trimestrielle automatique: 1er trimestre 02:00 (Jan/Avr/Jul/Oct)');
    console.log('🔧 Ajustements mensuels: 15 du mois 03:00 (optimisations légères)');
    console.log('🔄 Remplacement automatique des routes sous-performantes (trimestriel)');
    console.log('💰 Respect strict du budget 30K calls/mois');
  } catch (error) {
    console.error('❌ Failed to initialize Smart Route Optimizer AI:', error);
  }
});

module.exports = app; // For testing purposes