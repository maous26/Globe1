// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { scheduleRouteMonitoring } = require('./services/flight/routeMonitor');

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

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,x-auth-token'
}));
app.options('*', cors()); // Handle preflight requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius')
  .then(() => {
    console.log('MongoDB connected');
    // Initialize email templates
    const { initializeEmailTemplates } = require('./services/email/emailService');
    initializeEmailTemplates();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const alertRoutes = require('./routes/alert.routes');
const adminRoutes = require('./routes/admin.routes');
const flightRoutes = require('./routes/flight.routes');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/flights', flightRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start route monitoring if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    scheduleRouteMonitoring();
    console.log('Route monitoring started');
  }
});

module.exports = app; // For testing purposes