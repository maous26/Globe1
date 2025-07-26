#!/usr/bin/env node

const mongoose = require('mongoose');
const Route = require('../models/route.model');
const { incrementApiCallStats } = require('../services/analytics/statsService');

async function quickTest() {
  try {
    console.log('🧪 Test rapide - Vérification des connexions...');
    
    // Test MongoDB connection
    console.log('📊 Connexion MongoDB...');
    const dbUri = process.env.MONGODB_URI || 'mongodb://globegenius_app:app_password_123@globegenius-mongodb:27017/globegenius';
    await mongoose.connect(dbUri);
    console.log('✅ MongoDB connecté');
    
    // Test route count
    console.log('📈 Comptage des routes...');
    const routeCount = await Route.countDocuments();
    console.log(`✅ Trouvé ${routeCount} routes`);
    
    // Test API stats
    console.log('📊 Test API stats...');
    await incrementApiCallStats('test', 'quickTest');
    console.log('✅ API stats fonctionnent');
    
    // Test route find
    console.log('🔍 Test requête route...');
    const routes = await Route.find({ isActive: true }).limit(1);
    if (routes.length > 0) {
      console.log(`✅ Route trouvée: ${routes[0].departureAirport.code} → ${routes[0].destinationAirport.code}`);
    } else {
      console.log('⚠️  Aucune route active trouvée');
    }
    
    console.log('🎉 Tous les tests passés !');
    
  } catch (error) {
    console.error('❌ Erreur dans le test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

quickTest(); 