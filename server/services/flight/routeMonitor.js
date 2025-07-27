// NOUVEAU SYSTÈME SIMPLE - setInterval au lieu de node-cron
const cron = require('node-cron');
const Route = require('../../models/route.model');
const Alert = require('../../models/alert.model');
const flightService = require('./flightService');
const { incrementApiCallStats } = require('../analytics/statsService');

// Variables globales pour les intervalles
let tier1Interval = null;
let tier2Interval = null; 
let tier3Interval = null;
let diagnosticInterval = null;
let tuesdayIntensiveInterval = null;

// FONCTION DE SCAN DE ROUTE - SIMPLE ET EFFICACE
async function scanRoute(route) {
  try {
    const startTime = Date.now();
    console.log(`🔍 Début scan: ${route.departureAirport.code} → ${route.destinationAirport.code}`);
    
    // Date de départ (7-30 jours à l'avance)
    const departureDate = new Date(Date.now() + (Math.floor(Math.random() * 23) + 7) * 24 * 60 * 60 * 1000);
    
    // Appel API FlightLabs
    const flights = await flightService.getFlights({
      dep_iata: route.departureAirport.code,
      arr_iata: route.destinationAirport.code,
      date: departureDate.toISOString().split('T')[0],
      limit: 10
    });

    console.log(`✈️ Trouvé ${flights?.flights?.length || 0} vols pour ${route.departureAirport.code}-${route.destinationAirport.code}`);

    // Mettre à jour les stats de la route
    await Route.findByIdAndUpdate(route._id, {
      lastScannedAt: new Date(),
      $inc: { totalScans: 1 }
    });

    // Vérifier les deals si des vols sont trouvés
    if (flights && flights.flights && flights.flights.length > 0) {
      for (const flight of flights.flights) {
        const avgPrice = 300; // Prix de référence
        const discountThreshold = 0.30; // 30% minimum
        
        if (flight.price && flight.price < avgPrice * (1 - discountThreshold)) {
          const discountPercentage = Math.round(((avgPrice - flight.price) / avgPrice) * 100);
          
          console.log(`💰 DEAL DÉTECTÉ: ${flight.price}€ (-${discountPercentage}%)`);
          
          // Mettre à jour les stats
          await Route.findByIdAndUpdate(route._id, {
            $inc: { totalDealsFound: 1 }
          });

          // Créer une alerte
          const alert = new Alert({
            user: route.userId,
            departureAirport: route.departureAirport,
            destinationAirport: route.destinationAirport,
            discountPercentage: discountPercentage,
            discountAmount: avgPrice - flight.price,
            price: flight.price,
            originalPrice: avgPrice,
            airline: flight.airline_name || 'Unknown',
            farePolicy: 'Standard',
            stops: 0,
            outboundDate: new Date(departureDate),
            returnDate: new Date(departureDate),
            duration: 120, // 2h par défaut
            bookingLink: '#',
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });

          await alert.save();
          console.log(`📧 Alerte créée pour ${flight.price}€`);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Scan terminé en ${duration}ms`);
    
  } catch (error) {
    console.error(`❌ Erreur scan ${route.departureAirport.code}-${route.destinationAirport.code}:`, error.message);
    
    await Route.findByIdAndUpdate(route._id, {
      lastErrorAt: new Date(),
      $inc: { totalErrors: 1 }
    });
  }
}

// FONCTION DE SCAN PAR TIER - SIMPLE
async function scanTierRoutes(tier) {
  try {
    console.log(`🚀 SCAN ${tier.toUpperCase()} - ${new Date().toISOString()}`);
    
    const routes = await Route.find({ 
      tier: tier, 
      isActive: true 
    });

    console.log(`🎯 Scanning ${routes.length} ${tier} routes`);

    for (const route of routes) {
      console.log(`🔍 Scan: ${route.departureAirport.code} → ${route.destinationAirport.code}`);
      await scanRoute(route);
      
      // Délai entre routes
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ Completed scanning ${tier} routes`);

  } catch (error) {
    console.error(`❌ Error scanning ${tier} routes:`, error.message);
  }
}

// FONCTION MARDI INTENSIF - SCAN TIER 1 TOUTES LES HEURES 00h-10h
async function tuesdayIntensiveScan() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Dimanche, 1=Lundi, 2=Mardi...
  
  // Vérifier si c'est mardi (2) et entre 00h et 10h
  if (dayOfWeek === 2 && hour >= 0 && hour <= 10) {
    console.log(`🔥 MARDI INTENSIF - ${hour}h - SCAN TIER 1 OPTIMAL !`);
    await scanTierRoutes('ultra-priority');
  }
}

module.exports = {
  start: () => {
    console.log('🚀 DÉMARRAGE SYSTÈME OPTIMISÉ - 3h + Mardi intensif');
    
    // SCAN DIAGNOSTIC toutes les minutes
    diagnosticInterval = setInterval(() => {
      console.log('🧪 DIAGNOSTIC OK - ' + new Date().toISOString());
    }, 60000);
    
    // TIER 1: Toutes les 3 heures (10800000 ms) - OPTIMISÉ !
    tier1Interval = setInterval(async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      
      // Éviter les doublons le mardi entre 00h-10h (période intensive)
      if (dayOfWeek === 2 && hour >= 0 && hour <= 10) {
        console.log('⏸️ Tier 1 normal suspendu - Mardi intensif actif');
        return;
      }
      
      await scanTierRoutes('ultra-priority');
    }, 3 * 60 * 60 * 1000); // 3 heures
    
    // TIER 2: Toutes les 6 heures (21600000 ms)  
    tier2Interval = setInterval(async () => {
      await scanTierRoutes('priority');
    }, 6 * 60 * 60 * 1000);
    
    // TIER 3: Toutes les 12 heures (43200000 ms)
    tier3Interval = setInterval(async () => {
      await scanTierRoutes('complementary');
    }, 12 * 60 * 60 * 1000);
    
    // MARDI INTENSIF: Scan Tier 1 toutes les heures 00h-10h
    tuesdayIntensiveInterval = setInterval(async () => {
      await tuesdayIntensiveScan();
    }, 60 * 60 * 1000); // Toutes les heures
    
    // SCAN IMMÉDIAT pour tester
    setTimeout(async () => {
      console.log('🧪 SCAN TEST IMMÉDIAT - 5 routes ultra-priority');
      const testRoutes = await Route.find({ tier: 'ultra-priority', isActive: true }).limit(5);
      for (const route of testRoutes) {
        console.log(`🧪 Test: ${route.departureAirport.code} → ${route.destinationAirport.code}`);
        await scanRoute(route);
      }
      console.log('✅ SCAN TEST TERMINÉ');
    }, 5000);
    
    console.log('✅ SYSTÈME OPTIMISÉ ACTIVÉ');
    console.log('🧪 Diagnostic: toutes les minutes');
    console.log('🎯 Tier 1: toutes les 3h (+ Mardi intensif 00h-10h)');
    console.log('⚡ Tier 2: toutes les 6h'); 
    console.log('📊 Tier 3: toutes les 12h');
    console.log('🔥 Mardi intensif: Tier 1 toutes les heures 00h-10h');
    console.log('📈 Estimation: ~26,886 appels/mois (89.6% du budget)');
  },
  
  stop: () => {
    console.log('⏹️ Arrêt du système optimisé');
    if (tier1Interval) clearInterval(tier1Interval);
    if (tier2Interval) clearInterval(tier2Interval);
    if (tier3Interval) clearInterval(tier3Interval);
    if (diagnosticInterval) clearInterval(diagnosticInterval);
    if (tuesdayIntensiveInterval) clearInterval(tuesdayIntensiveInterval);
  },
  
  // Export pour les tests manuels
  scanRoute,
  scanTierRoutes,
  tuesdayIntensiveScan
};