// server/scripts/manualRouteScan.js
require('dotenv').config();
const mongoose = require('mongoose');
const Route = require('../models/route.model');
const { processRoute } = require('../services/flight/routeMonitor');

async function manualRouteScan() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('Connected to MongoDB');

    // Get command line arguments for tier
    const args = process.argv.slice(2);
    const tier = args[0] || null;

    // Build query
    const query = { isActive: true };
    if (tier) {
      query.tier = tier;
      console.log(`Scanning only ${tier} routes...`);
    } else {
      console.log('Scanning all active routes...');
    }

    // Get routes to scan
    const routes = await Route.find(query);
    console.log(`Found ${routes.length} routes to scan`);

    if (routes.length === 0) {
      console.log('No routes to scan');
      process.exit(0);
    }

    // Process each route
    console.log('Starting route processing...');
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      console.log(`Processing route ${i+1}/${routes.length}: ${route.departureAirport.code} to ${route.destinationAirport.code}`);
      
      // Process the route
      await processRoute(route);
      
      // Add a small delay to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Route scanning completed');
    process.exit(0);
  } catch (error) {
    console.error('Error scanning routes:', error);
    process.exit(1);
  }
}

manualRouteScan();