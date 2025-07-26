#!/usr/bin/env node

const mongoose = require('mongoose');
const Route = require('../models/route.model');
const routeMonitor = require('../services/flight/routeMonitor');

async function testRouteMonitoring() {
  try {
    console.log('🧪 TEST DU MONITORING ADAPTATIF');
    console.log('================================');
    
    // Connexion MongoDB
    const dbUri = process.env.MONGODB_URI || 'mongodb://globegenius_app:app_password_123@globegenius-mongodb:27017/globegenius';
    await mongoose.connect(dbUri);
    console.log('✅ MongoDB connecté');
    
    // Récupérer une route active
    const testRoute = await Route.findOne({ isActive: true });
    if (!testRoute) {
      console.log('❌ Aucune route active trouvée');
      return;
    }
    
    console.log(`🔍 Test avec route: ${testRoute.departureAirport.code} → ${testRoute.destinationAirport.code}`);
    console.log(`   Tier: ${testRoute.tier}`);
    console.log(`   Dernière scan: ${testRoute.lastScannedAt || 'Jamais'}`);
    
    // Test scan manuel
    console.log('📡 Démarrage scan manuel...');
    const context = {
      isOptimalTiming: true,
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
    
    await routeMonitor.scanRoute(testRoute, context);
    console.log('✅ Scan terminé avec succès');
    
    // Vérifier les stats mises à jour
    const updatedRoute = await Route.findById(testRoute._id);
    console.log('📊 Stats après scan:');
    console.log(`   Total scans: ${updatedRoute.totalScans}`);
    console.log(`   Deals trouvés: ${updatedRoute.totalDealsFound}`);
    console.log(`   Dernière scan: ${updatedRoute.lastScannedAt}`);
    
    console.log('🎉 Test du monitoring réussi !');
    
  } catch (error) {
    console.error('❌ Erreur dans le test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testRouteMonitoring(); 