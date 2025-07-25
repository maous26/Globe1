// server/scripts/seedDatabase.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Route = require('../models/route.model');
const { initializeRoutes } = require('../services/flight/routeMonitor');

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('Connected to MongoDB');

    // Check if admin user exists
    const adminExists = await User.findOne({ email: 'admin@globegenius.com' });
    if (!adminExists) {
      console.log('Creating admin user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      await User.collection.insertOne({
        email: 'admin@globegenius.com',
        password: hashedPassword,
        firstName: 'Admin',
        isAdmin: true,
        subscriptionType: 'premium',
        departureAirports: ['CDG'],
        includeCDG: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }

    // Check if test user exists
    const testUserExists = await User.findOne({ email: 'user@example.com' });
    if (!testUserExists) {
      console.log('Creating test user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      await User.collection.insertOne({
        email: 'user@example.com',
        password: hashedPassword,
        firstName: 'Test',
        isAdmin: false,
        subscriptionType: 'free',
        departureAirports: ['CDG'],
        includeCDG: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Test user created');
    } else {
      console.log('Test user already exists');
    }

    // Initialize routes if none exist
    const routesCount = await Route.countDocuments();
    if (routesCount === 0) {
      console.log('Initializing routes...');
      await initializeRoutes();
      console.log('Routes initialized');
    } else {
      console.log(`${routesCount} routes already exist`);
    }

    console.log('Database seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();