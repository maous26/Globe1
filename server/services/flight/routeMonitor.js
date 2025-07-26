// server/services/flight/routeMonitor.js
const cron = require('node-cron');
const flightService = require('./flightService');
const Route = require('../../models/route.model');
const Alert = require('../../models/alert.model');
const { sendAlertEmail } = require('../email/emailService');
const { incrementApiCallStats, getTodayStats } = require('../analytics/statsService');
const { dealValidationService } = require('../ai/dealValidationService');

// **NOUVELLE STRATÉGIE DE TIMING OPTIMAL**
// Basée sur l'analyse des meilleurs moments pour détecter les deals

// Fonction pour déterminer la fréquence optimale selon le jour et l'heure
function getOptimalScanFrequency(tier, hour, dayOfWeek) {
  // Mardi = 2, selon la stratégie c'est le meilleur jour
  const isTuesday = dayOfWeek === 2;
  const isWednesday = dayOfWeek === 3;
  const isThursday = dayOfWeek === 4;
  
  // Créneaux optimaux selon ton analyse
  const isUltraOptimalHour = hour >= 2 && hour <= 6;   // 2h-6h : période magique
  const isMorningOptimalHour = hour >= 6 && hour <= 10; // 6h-10h : fenêtre matinale
  const isStandardHour = hour >= 10 && hour <= 18;     // 10h-18h : surveillance standard
  const isReducedHour = hour >= 18 || hour < 2;        // 18h-2h : activité réduite
  
  // Facteur jour (mardi = meilleur, mercredi/jeudi = bon, autres = standard)
  let dayFactor = 1;
  if (isTuesday) dayFactor = 0.5;      // Doublage de fréquence le mardi
  else if (isWednesday || isThursday) dayFactor = 0.75; // +33% mercredi/jeudi
  
  // Fréquence de base selon le tier - AJUSTÉE POUR BUDGET 30K
  let baseFrequency = {
    'ultra-priority': 5,    // 5h de base (au lieu de 4h)
    'priority': 8,          // 8h de base (au lieu de 6h)  
    'complementary': 16     // 16h de base (au lieu de 12h)
  }[tier] || 16;
  
  // Ajustement selon l'heure optimale - PLUS CONSERVATEUR
  if (isUltraOptimalHour) {
    baseFrequency *= dayFactor * 0.3; // Scan toutes les 1.5h en période magique (au lieu de 1h)
  } else if (isMorningOptimalHour) {
    baseFrequency *= dayFactor * 0.6;  // Scan toutes les 3h le matin (au lieu de 2h)
  } else if (isStandardHour) {
    baseFrequency *= dayFactor * 1.2;  // Fréquence légèrement réduite (au lieu de 1.0)
  } else if (isReducedHour) {
    baseFrequency *= dayFactor * 2.0;  // Fréquence plus réduite en soirée/nuit (au lieu de 1.5)
  }
  
  return Math.max(2, Math.round(baseFrequency)); // Minimum 2h (au lieu de 1h)
}

// **MONITORING DYNAMIQUE ADAPTATIF**
// Au lieu de crons fixes, on utilise un scheduler intelligent

let monitoringInterval;

function startAdaptiveMonitoring() {
  console.log('🚀 Démarrage du monitoring adaptatif basé sur le timing optimal');
  
  // Vérification toutes les heures pour ajuster la stratégie
  monitoringInterval = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0=dimanche, 1=lundi, 2=mardi...
    
    console.log(`⏰ Évaluation monitoring - ${now.toISOString().split('T')[0]} ${hour}h (jour ${dayOfWeek})`);
    
    try {
      // Détermine si on doit scanner maintenant
      const routes = await Route.find({ isActive: true });
      
      for (const route of routes) {
        const optimalFreq = getOptimalScanFrequency(route.tier, hour, dayOfWeek);
        const hoursSinceLastScan = route.lastScannedAt 
          ? (now - route.lastScannedAt) / (1000 * 60 * 60)
          : 24; // Si jamais scanné, considérer 24h
        
        if (hoursSinceLastScan >= optimalFreq) {
          console.log(`🔍 Scan optimal pour ${route.departureAirport.code}-${route.destinationAirport.code} (${route.tier}) - dernière fois: ${hoursSinceLastScan.toFixed(1)}h`);
          await scanRoute(route, { isOptimalTiming: true, hour, dayOfWeek });
        }
      }
      
      // Log de la stratégie actuelle
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      console.log(`📊 Stratégie active: ${dayNames[dayOfWeek]} ${hour}h - Période ${getTimingPeriodName(hour, dayOfWeek)}`);
    } catch (error) {
      console.error('❌ Erreur dans le monitoring adaptatif:', error.message);
    }
    
  }, 60 * 60 * 1000); // Vérification toutes les heures
}

function getTimingPeriodName(hour, dayOfWeek) {
  const isTuesday = dayOfWeek === 2;
  
  if (hour >= 2 && hour <= 6) {
    return isTuesday ? '🔥 ULTRA-OPTIMAL (Mardi magique)' : '⭐ OPTIMAL (Période magique)';
  } else if (hour >= 6 && hour <= 10) {
    return isTuesday ? '🚀 EXCELLENT (Mardi matin)' : '✅ BON (Fenêtre matinale)';
  } else if (hour >= 10 && hour <= 18) {
    return '📊 STANDARD (Surveillance normale)';
  } else {
    return '💤 RÉDUIT (Activité faible)';
  }
}

// **FONCTION DE SCAN AMÉLIORÉE**
async function scanRoute(route, context = {}) {
  try {
    const startTime = Date.now();
    console.log(`🔍 Début scan de ${route.departureAirport.code} → ${route.destinationAirport.code} (${route.tier})`);
    
    if (context.isOptimalTiming) {
      console.log(`   ⏰ Timing: ${getTimingPeriodName(context.hour, context.dayOfWeek)}`);
    }

    // Dates de recherche (7-30 jours à l'avance)
    const departureDate = new Date(Date.now() + (Math.floor(Math.random() * 23) + 7) * 24 * 60 * 60 * 1000);
    
    // Get flight data
    const flights = await flightService.getFlights({
      dep_iata: route.departureAirport.code,
      arr_iata: route.destinationAirport.code,
      date: departureDate.toISOString().split('T')[0],
      limit: 10
    });

    console.log(`✈️ Trouvé ${flights?.length || 0} vols pour ${route.departureAirport.code}-${route.destinationAirport.code}`);

    // Update route stats
    await Route.findByIdAndUpdate(route._id, {
      lastScannedAt: new Date(),
      $inc: { totalScans: 1 }
    });

    // Validate deals if flights found
    if (flights && flights.length > 0) {
      for (const flight of flights) {
        // Simple deal validation logic
        const avgPrice = 300; // Prix moyen de référence
        const discountThreshold = 0.30; // 30% de réduction minimum (corrigé)
        
        if (flight.price && flight.price < avgPrice * (1 - discountThreshold)) {
          const discountPercentage = Math.round(((avgPrice - flight.price) / avgPrice) * 100);
          
          console.log(`💰 Deal valide détecté: ${flight.price}€ (${discountPercentage}% de réduction)`);
          
          // Increment API call stats (ajouté pour traçabilité)
          await incrementApiCallStats();
          
          // Update route deal stats
          await Route.findByIdAndUpdate(route._id, {
            $inc: { totalDealsFound: 1 }
          });

          // Create alert
          const alert = new Alert({
            user: route.userId,
            departureAirport: route.departureAirport,
            destinationAirport: route.destinationAirport,
            discountPercentage: discountPercentage,
            discountAmount: avgPrice - flight.price,
            price: flight.price,
            originalPrice: avgPrice,
            airline: flight.airline || 'N/A',
            farePolicy: flight.fare_type || 'Standard',
            stops: flight.stops || 0,
            outboundDate: new Date(flight.departure_time || departureDate),
            returnDate: new Date(flight.return_time || departureDate), // Required field
            duration: Math.round((flight.duration || 120) / 60), // Convert to hours
            bookingLink: flight.booking_url || '#',
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry
          });

          await alert.save();
          
          console.log(`📧 Alerte créée pour le deal ${flight.price}€ (-${discountPercentage}%)`);
        } else if (flight.price) {
          const discountPercentage = Math.round(((avgPrice - flight.price) / avgPrice) * 100);
          console.log(`⏸️  Deal ignoré: ${flight.price}€ (${discountPercentage}% < 30% minimum)`);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Scan terminé en ${duration}ms`);

  } catch (error) {
    console.error(`❌ Erreur lors du scan de ${route.departureAirport.code}-${route.destinationAirport.code}:`, error.message);
    
    // Update route with error stats
    await Route.findByIdAndUpdate(route._id, {
      lastErrorAt: new Date(),
      $inc: { totalErrors: 1 }
    });
  }
}

// Function to scan all routes of a specific tier
async function scanTierRoutes(tier) {
  try {
    const routes = await Route.find({ 
      tier: tier, 
      isActive: true 
    });

    console.log(`🎯 Scanning ${routes.length} ${tier} routes`);

    for (const route of routes) {
      await scanRoute(route);
      
      // Small delay between route scans to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ Completed scanning ${tier} routes`);

  } catch (error) {
    console.error(`❌ Error scanning ${tier} routes:`, error.message);
  }
}

// **CONSERVATION DES CRONS DE BASE** (pour fallback)
// Tier 1: Toutes les 4 heures (ultra-priority routes)
const tier1Job = cron.schedule('0 */4 * * *', async () => {
  console.log('🔥 TIER 1 - Scan ultra-priority routes (toutes les 4h)');
  await scanTierRoutes('ultra-priority');
}, { scheduled: false });

// Tier 2: Toutes les 6 heures (priority routes)  
const tier2Job = cron.schedule('0 */6 * * *', async () => {
  console.log('⚡ TIER 2 - Scan priority routes (toutes les 6h)');
  await scanTierRoutes('priority');
}, { scheduled: false });

// Tier 3: Toutes les 12 heures (complementary routes)
const tier3Job = cron.schedule('0 */12 * * *', async () => {
  console.log('📊 TIER 3 - Scan complementary routes (toutes les 12h)');
  await scanTierRoutes('complementary');
}, { scheduled: false });

module.exports = {
  start: () => {
    console.log('🚀 Démarrage du monitoring des routes avec timing optimal');
    console.log('📅 Stratégie: Mardi 2h-10h = période magique, surveillance adaptative 24/7');
    
    // Démarrer le monitoring adaptatif
    startAdaptiveMonitoring();
    
    // Garder les crons comme backup (mais désactivés)
    console.log('⚠️  Crons traditionnels en standby (système adaptatif activé)');
  },
  
  stop: () => {
    console.log('⏹️  Arrêt du monitoring des routes');
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
    tier1Job.stop();
    tier2Job.stop(); 
    tier3Job.stop();
  },
  
  // Fonction pour scanner manuellement une tier
  scanTier: scanTierRoutes,
  
  // Export de la fonction scanRoute pour tests manuels
  scanRoute: scanRoute,
  
  // Fonction pour basculer entre mode adaptatif et mode fixe
  switchToAdaptiveMode: () => {
    tier1Job.stop();
    tier2Job.stop();
    tier3Job.stop();
    startAdaptiveMonitoring();
    console.log('🔄 Basculement vers le mode adaptatif activé');
  },
  
  switchToFixedMode: () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
    tier1Job.start();
    tier2Job.start(); 
    tier3Job.start();
    console.log('🔄 Basculement vers le mode fixe activé');
  }
};