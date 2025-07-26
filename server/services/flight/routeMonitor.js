// server/services/flight/routeMonitor.js
const cron = require('node-cron');
const Route = require('../../models/route.model');
const User = require('../../models/user.model');
const Alert = require('../../models/alert.model');
const flightService = require('./flightService');
const { optimizeRoutes } = require('../ai/routeOptimizationService');
const { validateDeal } = require('../ai/dealValidationService');
const { sendAlertEmail } = require('../email/emailService');
const { incrementApiCallStats, getTodayStats } = require('../analytics/statsService');

// Configuration du quota mensuel selon la stratégie 3-tiers
const MONTHLY_API_QUOTA = 30000;
const DAILY_API_LIMIT = Math.floor(MONTHLY_API_QUOTA / 30); // 1000 appels/jour

// Allocation API par tiers (stratégie exacte utilisateur)
const API_ALLOCATION = {
  tier1: { percentage: 50, dailyCalls: 500, tier: 'ultra-priority' },    // 50% = 15,000/mois
  tier2: { percentage: 35, dailyCalls: 350, tier: 'priority' },          // 35% = 10,500/mois  
  tier3: { percentage: 15, dailyCalls: 150, tier: 'complementary' }      // 15% = 4,500/mois
};

// Seuils de réduction pour valider les bonnes affaires par tiers
const DISCOUNT_THRESHOLDS = {
  'ultra-priority': 15,  // 15% minimum pour long-courrier
  'priority': 20,        // 20% pour Europe
  'complementary': 25    // 25% pour domestique
};

// Rotation intelligente : 70% top routes, 30% rotation aléatoire
const ROTATION_STRATEGY = {
  topRoutesPercentage: 70,
  randomRotationPercentage: 30,
  topRoutesCount: 10  // Top 10 par tier
};

// Optimisation saisonnelle
const SEASONAL_MULTIPLIERS = {
  highSeason: { months: [6, 7, 8, 11, 12], multiplier: 1.3 },  // Été + fins d'année
  lowSeason: { months: [1, 2, 3, 9, 10], multiplier: 0.8 },    // Hiver + automne
  normalSeason: { months: [4, 5], multiplier: 1.0 }            // Printemps
};

let isMonitoringActive = false;
let dailyApiCallCount = 0;
let lastOptimizationDate = null;

/**
 * Initialiser les routes avec la stratégie optimisée
 */
exports.initializeRoutes = async () => {
  try {
    // Vérifier si les routes sont déjà initialisées
    const routeCount = await Route.countDocuments();
    if (routeCount > 0) {
      console.log(`Routes déjà initialisées (${routeCount} routes trouvées)`);
      return;
    }
    
    console.log('Initialisation des routes stratégiques...');
    
    // Aéroports français principaux (max 7 comme demandé)
    const frenchAirports = [
      { code: 'CDG', name: 'Paris Charles de Gaulle', priority: 1 },
      { code: 'ORY', name: 'Paris Orly', priority: 1 },
      { code: 'NCE', name: 'Nice Côte d\'Azur', priority: 2 },
      { code: 'LYS', name: 'Lyon Saint-Exupéry', priority: 2 },
      { code: 'MRS', name: 'Marseille Provence', priority: 2 },
      { code: 'TLS', name: 'Toulouse-Blagnac', priority: 3 },
      { code: 'BOD', name: 'Bordeaux-Mérignac', priority: 3 }
    ];
    
    // Destinations les plus populaires depuis Paris
    const topDestinationsFromParis = [
      // Europe - Ultra priorité
      { code: 'BCN', name: 'Barcelone', country: 'ES', popularity: 10 },
      { code: 'MAD', name: 'Madrid', country: 'ES', popularity: 9 },
      { code: 'LHR', name: 'Londres Heathrow', country: 'GB', popularity: 10 },
      { code: 'FCO', name: 'Rome Fiumicino', country: 'IT', popularity: 9 },
      { code: 'AMS', name: 'Amsterdam', country: 'NL', popularity: 8 },
      { code: 'LIS', name: 'Lisbonne', country: 'PT', popularity: 8 },
      { code: 'BER', name: 'Berlin', country: 'DE', popularity: 7 },
      { code: 'VIE', name: 'Vienne', country: 'AT', popularity: 6 },
      { code: 'PRG', name: 'Prague', country: 'CZ', popularity: 7 },
      { code: 'ATH', name: 'Athènes', country: 'GR', popularity: 7 },
      
      // Moyen-courrier populaires
      { code: 'DUB', name: 'Dublin', country: 'IE', popularity: 6 },
      { code: 'CPH', name: 'Copenhague', country: 'DK', popularity: 6 },
      { code: 'ZRH', name: 'Zurich', country: 'CH', popularity: 6 },
      { code: 'MXP', name: 'Milan Malpensa', country: 'IT', popularity: 7 },
      { code: 'VCE', name: 'Venise', country: 'IT', popularity: 6 },
      
      // Destinations soleil
      { code: 'PMI', name: 'Palma de Majorque', country: 'ES', popularity: 8 },
      { code: 'AGP', name: 'Malaga', country: 'ES', popularity: 7 },
      { code: 'FAO', name: 'Faro', country: 'PT', popularity: 6 },
      
      // Long-courrier essentiels
      { code: 'JFK', name: 'New York JFK', country: 'US', popularity: 9 },
      { code: 'YUL', name: 'Montréal', country: 'CA', popularity: 7 },
      { code: 'DXB', name: 'Dubaï', country: 'AE', popularity: 8 },
      { code: 'IST', name: 'Istanbul', country: 'TR', popularity: 7 },
      { code: 'CMN', name: 'Casablanca', country: 'MA', popularity: 6 }
    ];
    
    // Destinations Europe depuis aéroports régionaux
    const regionalEuropeDestinations = [
      { code: 'BCN', name: 'Barcelone', country: 'ES' },
      { code: 'MAD', name: 'Madrid', country: 'ES' },
      { code: 'LHR', name: 'Londres Heathrow', country: 'GB' },
      { code: 'FCO', name: 'Rome Fiumicino', country: 'IT' },
      { code: 'AMS', name: 'Amsterdam', country: 'NL' },
      { code: 'LIS', name: 'Lisbonne', country: 'PT' },
      { code: 'PMI', name: 'Palma de Majorque', country: 'ES' },
      { code: 'BRU', name: 'Bruxelles', country: 'BE' },
      { code: 'GVA', name: 'Genève', country: 'CH' }
    ];
    
    const routes = [];
    
    // 1. Routes ultra-prioritaires depuis CDG/ORY
    for (const destination of topDestinationsFromParis) {
      // CDG vers destinations populaires
      if (destination.popularity >= 7) {
        routes.push({
          departureAirport: { code: 'CDG', name: 'Paris Charles de Gaulle' },
          destinationAirport: { code: destination.code, name: destination.name },
          tier: destination.popularity >= 9 ? 'ultra-priority' : 'priority',
          scanFrequency: destination.popularity >= 9 ? 8 : 4,
          isActive: true,
          estimatedMonthlyApiCalls: destination.popularity >= 9 ? 240 : 120
        });
      }
      
      // ORY vers destinations européennes populaires
      if (destination.country !== 'US' && destination.country !== 'CA' && destination.popularity >= 7) {
        routes.push({
          departureAirport: { code: 'ORY', name: 'Paris Orly' },
          destinationAirport: { code: destination.code, name: destination.name },
          tier: destination.popularity >= 8 ? 'priority' : 'standard',
          scanFrequency: destination.popularity >= 8 ? 4 : 2,
          isActive: true,
          estimatedMonthlyApiCalls: destination.popularity >= 8 ? 120 : 60
        });
      }
    }
    
    // 2. Vols intérieurs depuis/vers Paris
    const domesticRoutes = [
      { from: 'CDG', to: 'NCE', tier: 'priority' },
      { from: 'CDG', to: 'MRS', tier: 'priority' },
      { from: 'CDG', to: 'TLS', tier: 'standard' },
      { from: 'CDG', to: 'BOD', tier: 'standard' },
      { from: 'CDG', to: 'LYS', tier: 'standard' },
      { from: 'ORY', to: 'NCE', tier: 'priority' },
      { from: 'ORY', to: 'MRS', tier: 'standard' },
      { from: 'ORY', to: 'TLS', tier: 'standard' }
    ];
    
    for (const route of domesticRoutes) {
      const fromAirport = frenchAirports.find(a => a.code === route.from);
      const toAirport = frenchAirports.find(a => a.code === route.to);
      
      routes.push({
        departureAirport: { code: fromAirport.code, name: fromAirport.name },
        destinationAirport: { code: toAirport.code, name: toAirport.name },
        tier: route.tier,
        scanFrequency: route.tier === 'priority' ? 4 : 2,
        isActive: true,
        estimatedMonthlyApiCalls: route.tier === 'priority' ? 120 : 60
      });
    }
    
    // 3. Routes depuis aéroports régionaux vers Europe (limité)
    const regionalAirports = frenchAirports.filter(a => a.priority === 2).slice(0, 3); // NCE, LYS, MRS
    
    for (const airport of regionalAirports) {
      // Seulement les 5 destinations les plus populaires par aéroport régional
      const topRegionalDest = regionalEuropeDestinations.slice(0, 5);
      
      for (const destination of topRegionalDest) {
        routes.push({
          departureAirport: { code: airport.code, name: airport.name },
          destinationAirport: { code: destination.code, name: destination.name },
          tier: 'standard',
          scanFrequency: 2,
          isActive: true,
          estimatedMonthlyApiCalls: 60
        });
      }
    }
    
    // 4. Quelques vols intérieurs entre régions
    const interRegionalRoutes = [
      { from: 'NCE', to: 'LYS' },
      { from: 'MRS', to: 'LYS' },
      { from: 'TLS', to: 'NCE' }
    ];
    
    for (const route of interRegionalRoutes) {
      const fromAirport = frenchAirports.find(a => a.code === route.from);
      const toAirport = frenchAirports.find(a => a.code === route.to);
      
      routes.push({
        departureAirport: { code: fromAirport.code, name: fromAirport.name },
        destinationAirport: { code: toAirport.code, name: toAirport.name },
        tier: 'low',
        scanFrequency: 1,
        isActive: true,
        estimatedMonthlyApiCalls: 30
      });
    }
    
    // Calculer le total estimé d'appels API
    const totalEstimatedCalls = routes.reduce((sum, route) => 
      sum + (route.estimatedMonthlyApiCalls || route.scanFrequency * 30), 0
    );
    
    console.log(`Total estimé d'appels API mensuels: ${totalEstimatedCalls}`);
    
    // Ajuster si nécessaire pour ne pas dépasser 30000
    if (totalEstimatedCalls > MONTHLY_API_QUOTA) {
      console.log('⚠️ Ajustement des fréquences pour respecter le quota');
      const ratio = MONTHLY_API_QUOTA / totalEstimatedCalls;
      routes.forEach(route => {
        route.scanFrequency = Math.max(1, Math.floor(route.scanFrequency * ratio));
        route.estimatedMonthlyApiCalls = route.scanFrequency * 30;
      });
    }
    
    // Créer les routes dans la base de données
    await Route.insertMany(routes);
    console.log(`✅ ${routes.length} routes initialisées avec succès`);
    
    // Afficher la répartition
    const summary = {
      'ultra-priority': routes.filter(r => r.tier === 'ultra-priority').length,
      'priority': routes.filter(r => r.tier === 'priority').length,
      'standard': routes.filter(r => r.tier === 'standard').length,
      'low': routes.filter(r => r.tier === 'low').length
    };
    
    console.log('Répartition des routes:', summary);
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des routes:', error);
  }
};

/**
 * Démarre le monitoring des routes avec la stratégie 3-tiers optimisée
 */
exports.startRouteMonitoring = async () => {
  try {
    if (isMonitoringActive) {
      console.log('🔄 Le monitoring des routes est déjà actif');
      return;
    }

    console.log('🚀 Démarrage du monitoring intelligent des routes 3-tiers...');
    
    // Test initial pour vérifier la connectivité
    await this.performInitialTest();
    
    // Lancement du monitoring par tiers
    await this.scheduleMonitoringByTier();
    
    // Optimisation quotidienne à 02:00
    cron.schedule('0 2 * * *', () => {
      this.optimizeRoutesDaily();
    });
    
    // Reset compteur quotidien à minuit
    cron.schedule('0 0 * * *', () => {
      dailyApiCallCount = 0;
      console.log('🌅 Reset du compteur API quotidien');
    });
    
    isMonitoringActive = true;
    console.log('✅ Monitoring des routes 3-tiers démarré avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du monitoring:', error);
    throw error;
  }
};

/**
 * Test initial de connectivité et configuration
 */
exports.performInitialTest = async () => {
  try {
    console.log('🧪 Test initial du système de monitoring...');
    
    // Vérifier les routes en base
    const routeCount = await Route.countDocuments();
    const tierStats = await Route.aggregate([
      { $group: { _id: '$tier', count: { $sum: 1 } } }
    ]);
    
    console.log(`📊 ${routeCount} routes trouvées:`);
    tierStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} routes`);
    });
    
    // Test API GoFlightLabs avec une route de test
    const testRoute = await Route.findOne({ tier: 'ultra-priority' });
    if (testRoute) {
      console.log('🧪 Test API flight avec route:', 
        `${testRoute.departureAirport.code} → ${testRoute.destinationAirport.code}`);
      
      // Test non-bloquant
      try {
        await flightService.getFlights({
          dep_iata: testRoute.departureAirport.code,
          arr_iata: testRoute.destinationAirport.code,
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          limit: 5
        });
        console.log('✅ API GoFlightLabs connectée');
      } catch (apiError) {
        console.warn('⚠️  API GoFlightLabs indisponible, monitoring continuera:', apiError.message);
      }
    }
    
    console.log('✅ Test initial terminé');
    
  } catch (error) {
    console.error('❌ Erreur test initial:', error);
    throw error;
  }
};

/**
 * Planification du monitoring par tiers avec fréquences adaptées
 */
exports.scheduleMonitoringByTier = async () => {
  console.log('📅 Planification du monitoring par tiers selon STRATÉGIE 3-TIERS...');
  console.log('🎯 Tier 1 (Ultra-priority): Toutes les 4h - 500 appels/jour');
  console.log('🎯 Tier 2 (Priority): Toutes les 6h - 350 appels/jour');
  console.log('🎯 Tier 3 (Complementary): Toutes les 12h - 150 appels/jour');
  
  // Tier 1 (Ultra-priority) - Toutes les 4h (6 fois/jour) - STRATÉGIE RESPECTÉE
  cron.schedule('0 */4 * * *', () => {
    console.log('🚀 TIER 1 - Monitoring ultra-priority (toutes les 4h)');
    this.monitorRoutesByTier('ultra-priority', Math.floor(API_ALLOCATION.tier1.dailyCalls / 6));
  });
  
  // Tier 2 (Priority) - Toutes les 6h (4 fois/jour) - STRATÉGIE RESPECTÉE
  cron.schedule('0 */6 * * *', () => {
    console.log('🎯 TIER 2 - Monitoring priority (toutes les 6h)');
    this.monitorRoutesByTier('priority', Math.floor(API_ALLOCATION.tier2.dailyCalls / 4));
  });
  
  // Tier 3 (Complementary) - Toutes les 12h (2 fois/jour) - STRATÉGIE RESPECTÉE
  cron.schedule('0 */12 * * *', () => {
    console.log('📊 TIER 3 - Monitoring complementary (toutes les 12h)');
    this.monitorRoutesByTier('complementary', Math.floor(API_ALLOCATION.tier3.dailyCalls / 2));
  });
  
  console.log('✅ Monitoring planifié selon STRATÉGIE 3-TIERS stricte');
  console.log('   📈 Tier 1: 4h → 6 exécutions/jour × ~83 appels = 500 appels/jour');
  console.log('   📊 Tier 2: 6h → 4 exécutions/jour × ~87 appels = 350 appels/jour');  
  console.log('   📉 Tier 3: 12h → 2 exécutions/jour × 75 appels = 150 appels/jour');
};

/**
 * Monitoring des routes par tier avec rotation intelligente
 */
exports.monitorRoutesByTier = async (tier, maxCallsForSession) => {
  try {
    if (dailyApiCallCount >= DAILY_API_LIMIT) {
      console.log(`⚠️  Limite API quotidienne atteinte (${dailyApiCallCount}/${DAILY_API_LIMIT})`);
      return;
    }
    
    console.log(`🔍 Monitoring ${tier} (max ${maxCallsForSession} calls)`);
    
    // Récupération des routes du tier avec performance
    const allRoutes = await Route.find({ 
      tier, 
      isActive: true 
    }).sort({ totalDealsFound: -1, totalScans: 1 }); // Trier par performance
    
    if (allRoutes.length === 0) {
      console.log(`⚠️  Aucune route active trouvée pour ${tier}`);
      return;
    }
    
    // Application de la rotation intelligente 70/30
    const routesToScan = this.applyIntelligentRotation(allRoutes, maxCallsForSession);
    
    console.log(`📊 ${routesToScan.length} routes sélectionnées pour ${tier}`);
    
    // Traitement des routes avec multiplicateur saisonnier
    const seasonalMultiplier = this.getSeasonalMultiplier();
    const adjustedCallLimit = Math.floor(maxCallsForSession * seasonalMultiplier);
    
    let processedCount = 0;
    for (const route of routesToScan) {
      if (dailyApiCallCount >= DAILY_API_LIMIT || processedCount >= adjustedCallLimit) {
        break;
      }
      
      await this.processRoute(route);
      processedCount++;
      
      // Délai entre appels pour éviter rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ ${tier}: ${processedCount} routes traitées`);
    
  } catch (error) {
    console.error(`❌ Erreur monitoring ${tier}:`, error);
  }
};

/**
 * Application de la rotation intelligente 70% top routes / 30% aléatoire
 */
exports.applyIntelligentRotation = (allRoutes, maxCalls) => {
  const topCount = Math.floor(maxCalls * ROTATION_STRATEGY.topRoutesPercentage / 100);
  const randomCount = Math.floor(maxCalls * ROTATION_STRATEGY.randomRotationPercentage / 100);
  
  // 70% : Top routes par performance
  const topRoutes = allRoutes
    .slice(0, Math.min(ROTATION_STRATEGY.topRoutesCount, topCount));
  
  // 30% : Sélection aléatoire parmi les routes restantes
  const remainingRoutes = allRoutes.slice(ROTATION_STRATEGY.topRoutesCount);
  const randomRoutes = this.shuffleArray(remainingRoutes)
    .slice(0, Math.min(randomCount, remainingRoutes.length));
  
  return [...topRoutes, ...randomRoutes];
};

/**
 * Obtient le multiplicateur saisonnier pour ajuster les fréquences
 */
exports.getSeasonalMultiplier = () => {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  if (SEASONAL_MULTIPLIERS.highSeason.months.includes(currentMonth)) {
    return SEASONAL_MULTIPLIERS.highSeason.multiplier;
  } else if (SEASONAL_MULTIPLIERS.lowSeason.months.includes(currentMonth)) {
    return SEASONAL_MULTIPLIERS.lowSeason.multiplier;
  } else {
    return SEASONAL_MULTIPLIERS.normalSeason.multiplier;
  }
};

/**
 * Traitement d'une route individuelle avec IA
 */
exports.processRoute = async (route) => {
  try {
    // Dates de recherche (7-30 jours à l'avance)
    const departureDate = new Date(Date.now() + (Math.floor(Math.random() * 23) + 7) * 24 * 60 * 60 * 1000);
    const returnDate = new Date(departureDate.getTime() + (Math.floor(Math.random() * 14) + 3) * 24 * 60 * 60 * 1000);
    
    // Recherche de vols avec la nouvelle API
    const flights = await flightService.getFlights({
      dep_iata: route.departureAirport.code,
      arr_iata: route.destinationAirport.code,
      date: departureDate.toISOString().split('T')[0],
      limit: 10
    });
    
    dailyApiCallCount++;
    await incrementApiCallStats('flights', 'success');
    
    // Mise à jour statistiques route
    await Route.findByIdAndUpdate(route._id, {
      $inc: { totalScans: 1 },
      lastScanDate: new Date()
    });
    
    if (!flights || flights.length === 0) {
      return;
    }
    
    // Validation IA des deals
    for (const flight of flights.slice(0, 3)) { // Limite à 3 meilleurs vols
      const isValidDeal = await this.validateFlightDeal(flight, route);
      
      if (isValidDeal) {
        await this.createAndSendAlert(flight, route);
        
        // Mise à jour compteur deals
        await Route.findByIdAndUpdate(route._id, {
          $inc: { totalDealsFound: 1 }
        });
      }
    }
    
  } catch (error) {
    console.error(`❌ Erreur traitement route ${route.departureAirport.code}-${route.destinationAirport.code}:`, error);
    await incrementApiCallStats('flights', 'error');
  }
};

/**
 * Validation d'un deal avec seuils par tiers
 */
exports.validateFlightDeal = async (flight, route) => {
  try {
    const threshold = DISCOUNT_THRESHOLDS[route.tier];
    const discount = flight.discount || 0;
    
    // Validation basique par seuil
    if (discount < threshold) {
      return false;
    }
    
    // Validation IA avancée
    const aiValidation = await validateDeal({
      flight,
      route: {
        from: route.departureAirport.code,
        to: route.destinationAirport.code,
        tier: route.tier
      },
      discount,
      price: flight.price
    });
    
    return aiValidation.isValid;
    
  } catch (error) {
    console.error('❌ Erreur validation deal:', error);
    return discount >= DISCOUNT_THRESHOLDS[route.tier]; // Fallback sur seuil simple
  }
};

/**
 * Optimisation quotidienne avec IA
 */
exports.optimizeRoutesDaily = async () => {
  try {
    console.log('🤖 Optimisation quotidienne des routes avec IA...');
    
    const today = new Date().toDateString();
    if (lastOptimizationDate === today) {
      console.log('Optimisation déjà effectuée aujourd\'hui');
      return;
    }
    
    // Analyse des performances par tier
    const tierPerformance = await this.analyzeTierPerformance();
    
    // Optimisation IA des fréquences
    const optimizationResult = await optimizeRoutes({
      tierPerformance,
      currentAllocation: API_ALLOCATION,
      seasonalFactor: this.getSeasonalMultiplier(),
      dailyBudget: DAILY_API_LIMIT
    });
    
    if (optimizationResult.adjustments) {
      console.log('🎯 Ajustements recommandés:', optimizationResult.adjustments);
      await this.applyOptimizationAdjustments(optimizationResult.adjustments);
    }
    
    lastOptimizationDate = today;
    console.log('✅ Optimisation quotidienne terminée');
    
  } catch (error) {
    console.error('❌ Erreur optimisation quotidienne:', error);
  }
};

/**
 * Analyse des performances par tier
 */
exports.analyzeTierPerformance = async () => {
  const performance = await Route.aggregate([
    {
      $group: {
        _id: '$tier',
        totalRoutes: { $sum: 1 },
        totalScans: { $sum: '$totalScans' },
        totalDeals: { $sum: '$totalDealsFound' },
        avgSuccessRate: { 
          $avg: { 
            $cond: [
              { $gt: ['$totalScans', 0] },
              { $divide: ['$totalDealsFound', '$totalScans'] },
              0
            ]
          }
        }
      }
    }
  ]);
  
  return performance.reduce((acc, tier) => {
    acc[tier._id] = {
      routes: tier.totalRoutes,
      scans: tier.totalScans,
      deals: tier.totalDeals,
      successRate: tier.avgSuccessRate || 0
    };
    return acc;
  }, {});
};

/**
 * Utilitaire pour mélanger un tableau
 */
exports.shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Créer et envoyer une alerte pour un deal validé
 */
exports.createAndSendAlert = async (flight, route) => {
  try {
    // Trouver les utilisateurs éligibles
    const eligibleUsers = await this.findEligibleUsers(route);
    
    if (eligibleUsers.length === 0) {
      console.log('Aucun utilisateur éligible pour cette alerte');
      return;
    }
    
    // Créer et envoyer les alertes
    for (const user of eligibleUsers.slice(0, 10)) { // Limite à 10 utilisateurs par deal
      const alert = new Alert({
        user: user._id,
        routeId: route._id,
        departureAirport: route.departureAirport,
        destinationAirport: route.destinationAirport,
        discountPercentage: flight.discount || 0,
        price: flight.price || 0,
        originalPrice: flight.originalPrice || flight.price,
        airline: flight.airline || 'Compagnie non spécifiée',
        departureDate: flight.departureDate,
        returnDate: flight.returnDate,
        bookingUrl: flight.bookingUrl || '#',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      });

      await alert.save();
      
      // Envoyer l'email de façon non-bloquante
      try {
        await sendAlertEmail(user, alert);
        console.log(`📧 Alerte envoyée à ${user.email}`);
      } catch (emailError) {
        console.warn(`⚠️  Erreur envoi email à ${user.email}:`, emailError.message);
      }
    }

  } catch (error) {
    console.error('❌ Erreur création/envoi alerte:', error);
  }
};

/**
 * Trouver les utilisateurs éligibles pour une alerte
 */
exports.findEligibleUsers = async (route) => {
  try {
    const departureCode = route.departureAirport.code;
    
    // Requête pour trouver les utilisateurs intéressés par cette route
    const users = await User.find({
      $or: [
        { departureAirports: departureCode },
        { 
          includeCDG: true, 
          $or: [
            { departureAirports: { $size: 0 } },
            { departureAirports: { $exists: false } }
          ]
        }
      ]
    }).limit(50); // Limite pour performance
    
    return users;
    
  } catch (error) {
    console.error('❌ Erreur recherche utilisateurs éligibles:', error);
    return [];
  }
};

/**
 * Application des ajustements d'optimisation
 */
exports.applyOptimizationAdjustments = async (adjustments) => {
  try {
    console.log('🔧 Application des ajustements d\'optimisation...');
    
    for (const adjustment of adjustments) {
      if (adjustment.action === 'increase_frequency' && adjustment.confidence > 0.8) {
        await Route.updateMany(
          { tier: adjustment.tier },
          { $inc: { scanFrequency: 1 } }
        );
        console.log(`📈 Fréquence augmentée pour ${adjustment.tier}`);
      }
      
      if (adjustment.action === 'decrease_frequency' && adjustment.confidence > 0.8) {
        await Route.updateMany(
          { tier: adjustment.tier, scanFrequency: { $gt: 1 } },
          { $inc: { scanFrequency: -1 } }
        );
        console.log(`📉 Fréquence diminuée pour ${adjustment.tier}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur application ajustements:', error);
  }
};

/**
 * Optimisation quotidienne des routes avec IA
 */
async function optimizeRoutesDaily() {
  try {
    console.log('🔧 Optimisation quotidienne avec stratégie 3-tiers...');
    
    // Get current API quota
    const todayStats = await getTodayStats();
    const remainingQuota = MONTHLY_API_QUOTA - (todayStats.totalCalls * 30);
    
    // Call 3-tier AI optimization
    const { optimizeRoutes } = require('../ai/routeOptimizationService');
    const optimization = await optimizeRoutes({
      quota: remainingQuota,
      isFullOptimization: false // Daily optimization
    });
    
    if (optimization && optimization.dailyAdjustments) {
      console.log('✅ Optimisation IA appliquée:');
      
      // Log tier-wise optimizations
      Object.entries(optimization.dailyAdjustments).forEach(([tier, data]) => {
        if (data.routesToUpdate && data.routesToUpdate.length > 0) {
          console.log(`  ${tier}: ${data.routesToUpdate.length} routes optimisées`);
        }
      });
      
      // Update route monitoring with new tier allocations
      await updateTierMonitoringSchedule();
    } else {
      console.log('⚠️  Aucune optimisation appliquée - utilisation des paramètres par défaut');
    }
    
    console.log('✅ Optimisation quotidienne terminée');
  } catch (error) {
    console.error('❌ Erreur optimisation quotidienne:', error);
  }
}

/**
 * Mettre à jour les horaires de surveillance selon la stratégie 3-tiers
 */
async function updateTierMonitoringSchedule() {
  try {
    // Réallouer dynamiquement les fréquences selon les performances
    const tierPerformance = await analyzeTierPerformance();
    
    // Ajuster les fréquences de scan dans les limites budgétaires
    for (const [tier, performance] of Object.entries(tierPerformance)) {
      if (performance.successRate > 5) { // Si taux de succès > 5%
        await Route.updateMany(
          { tier, isActive: true },
          { $inc: { scanFrequency: Math.min(1, getMaxFrequencyForTier(tier) - performance.avgFrequency) } }
        );
        console.log(`📈 ${tier}: Fréquence augmentée (succès: ${performance.successRate}%)`);
      } else if (performance.successRate < 1) { // Si taux de succès < 1%
        await Route.updateMany(
          { tier, isActive: true },
          { $inc: { scanFrequency: -1 } }
        );
        console.log(`📉 ${tier}: Fréquence réduite (succès: ${performance.successRate}%)`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur mise à jour horaires:', error);
  }
}

/**
 * Analyser les performances par tier
 */
async function analyzeTierPerformance() {
  const tiers = ['ultra-priority', 'priority', 'complementary'];
  const performance = {};
  
  for (const tier of tiers) {
    const routes = await Route.find({ tier, isActive: true });
    const totalScans = routes.reduce((sum, route) => sum + route.totalScans, 0);
    const totalDeals = routes.reduce((sum, route) => sum + route.totalDealsFound, 0);
    const avgFrequency = routes.reduce((sum, route) => sum + route.scanFrequency, 0) / routes.length;
    
    performance[tier] = {
      routeCount: routes.length,
      totalScans,
      totalDeals,
      successRate: totalScans > 0 ? (totalDeals / totalScans * 100) : 0,
      avgFrequency: avgFrequency || 0
    };
  }
  
  return performance;
}

/**
 * Obtenir la fréquence maximum pour un tier
 */
function getMaxFrequencyForTier(tier) {
  // Hard-coded allocation to avoid import issues
  const API_ALLOCATION = {
    tier1: { frequency: 12 },
    tier2: { frequency: 6 },
    tier3: { frequency: 2 }
  };
  
  switch(tier) {
    case 'ultra-priority':
      return API_ALLOCATION.tier1.frequency;
    case 'priority':
      return API_ALLOCATION.tier2.frequency;
    case 'complementary':
      return API_ALLOCATION.tier3.frequency;
    default:
      return 2;
  }
}

/**
 * Surveiller et optimiser avec IA en temps réel
 */
async function smartTierMonitoring() {
  try {
    console.log('🧠 Surveillance intelligente 3-tiers démarrée...');
    
    // Analyser les performances actuelles
    const performance = await analyzeTierPerformance();
    
    // Optimisation dynamique si nécessaire
    let needsOptimization = false;
    Object.values(performance).forEach(perf => {
      if (perf.successRate < 0.5 || perf.successRate > 8) {
        needsOptimization = true;
      }
    });
    
    if (needsOptimization) {
      console.log('⚡ Déclenchement optimisation IA en temps réel...');
      await optimizeRoutesDaily();
    }
    
    // Rapport de performance
    console.log('📊 Performance actuelle par tier:');
    Object.entries(performance).forEach(([tier, perf]) => {
      console.log(`  ${tier}: ${perf.routeCount} routes, ${perf.successRate.toFixed(2)}% succès`);
    });
    
  } catch (error) {
    console.error('❌ Erreur surveillance intelligente:', error);
  }
}

/**
 * Logger le statut d'utilisation de l'API
 */
async function logApiUsageStatus() {
  try {
    const stats = await getTodayStats();
    const percentage = (stats.totalCalls / DAILY_API_LIMIT) * 100;
    
    console.log(`📊 Utilisation API: ${stats.totalCalls}/${DAILY_API_LIMIT} (${percentage.toFixed(1)}%)`);
    
    if (percentage > 90) {
      console.warn('⚠️ ATTENTION: Quota API quotidien presque atteint!');
    }
  } catch (error) {
    console.error('Erreur log status:', error);
  }
}

module.exports.optimizeRoutesDaily = optimizeRoutesDaily;
module.exports.smartTierMonitoring = smartTierMonitoring;
module.exports.updateTierMonitoringSchedule = updateTierMonitoringSchedule;