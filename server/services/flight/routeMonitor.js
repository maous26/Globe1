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

// Configuration du quota mensuel
const MONTHLY_API_QUOTA = 30000;
const DAILY_API_LIMIT = Math.floor(MONTHLY_API_QUOTA / 30); // ~1000 appels/jour

// Fréquences de scan ajustées pour respecter le quota
const TIER_SCAN_FREQUENCY = {
  'ultra-priority': 8,   // 8 fois par jour pour CDG/ORY routes populaires
  'priority': 4,         // 4 fois par jour pour autres routes importantes  
  'standard': 2,         // 2 fois par jour pour routes secondaires
  'low': 1              // 1 fois par jour pour routes moins populaires
};

// Seuils de réduction pour les alertes
const MIN_DISCOUNT_FREE = 30;    // 30% minimum pour utilisateurs gratuits
const MIN_DISCOUNT_PREMIUM = 0;   // Toute réduction pour premium
const MAX_DISCOUNT_FREE = 50;     // 50% maximum pour utilisateurs gratuits

// Limite d'alertes quotidiennes
const MAX_ALERTS_FREE = 3;

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
 * Vérifier le quota d'API avant de scanner
 */
async function checkApiQuotaBeforeScanning() {
  try {
    const todayStats = await getTodayStats();
    const remainingToday = DAILY_API_LIMIT - todayStats.totalCalls;
    
    if (remainingToday <= 0) {
      console.log('⚠️ Quota API quotidien atteint. Scan suspendu jusqu\'à demain.');
      return false;
    }
    
    if (remainingToday < 100) {
      console.log(`⚠️ Quota API faible: ${remainingToday} appels restants aujourd'hui`);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification du quota:', error);
    return true; // Continuer en cas d'erreur
  }
}

/**
 * Planifier la surveillance des routes avec cron
 */
exports.scheduleRouteMonitoring = async () => {
  try {
    // Initialiser les routes si nécessaire
    await exports.initializeRoutes();
    
    // Ultra-priorité: Toutes les 3 heures (8 fois/jour)
    cron.schedule('0 */3 * * *', async () => {
      if (await checkApiQuotaBeforeScanning()) {
        console.log('🔍 Scan ultra-prioritaire...');
        await monitorRoutesByTier('ultra-priority');
      }
    });
    
    // Priorité: Toutes les 6 heures (4 fois/jour)
    cron.schedule('0 */6 * * *', async () => {
      if (await checkApiQuotaBeforeScanning()) {
        console.log('🔍 Scan prioritaire...');
        await monitorRoutesByTier('priority');
      }
    });
    
    // Standard: Toutes les 12 heures (2 fois/jour)
    cron.schedule('0 */12 * * *', async () => {
      if (await checkApiQuotaBeforeScanning()) {
        console.log('🔍 Scan standard...');
        await monitorRoutesByTier('standard');
      }
    });
    
    // Low: Une fois par jour à 3h du matin
    cron.schedule('0 3 * * *', async () => {
      if (await checkApiQuotaBeforeScanning()) {
        console.log('🔍 Scan low priority...');
        await monitorRoutesByTier('low');
      }
    });
    
    // Optimisation quotidienne à 2h du matin
    cron.schedule('0 2 * * *', async () => {
      console.log('🔧 Optimisation quotidienne des routes...');
      await optimizeRoutesDaily();
    });
    
    // Rapport de santé toutes les heures
    cron.schedule('0 * * * *', async () => {
      await logApiUsageStatus();
    });
    
    console.log('✅ Surveillance des routes planifiée avec succès');
  } catch (error) {
    console.error('Erreur lors de la planification de la surveillance:', error);
  }
};

/**
 * Surveiller les routes par niveau de priorité
 */
async function monitorRoutesByTier(tier) {
  try {
    const routes = await Route.find({ tier, isActive: true });
    console.log(`Surveillance de ${routes.length} routes ${tier}`);
    
    for (const route of routes) {
      await processRoute(route);
      
      // Pause entre les requêtes pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 seconde
    }
  } catch (error) {
    console.error(`Erreur lors de la surveillance ${tier}:`, error);
  }
}

/**
 * Traiter une route spécifique
 */
async function processRoute(route) {
  try {
    console.log(`✈️ ${route.departureAirport.code} → ${route.destinationAirport.code}`);
    
    // Mettre à jour le timestamp
    await Route.findByIdAndUpdate(route._id, {
      lastScannedAt: new Date(),
      $inc: { totalScans: 1 }
    });
    
    // Incrémenter les stats
    await incrementApiCallStats(
      'flightSearch', 
      `${route.departureAirport.code}-${route.destinationAirport.code}`
    );
    
    // Dates de recherche (14 jours dans le futur pour avoir des prix intéressants)
    const searchDate = new Date();
    searchDate.setDate(searchDate.getDate() + 14);
    const returnDate = new Date(searchDate);
    returnDate.setDate(returnDate.getDate() + 7);
    
    // Rechercher des vols aller-retour
    const flights = await flightService.searchFlights(
      route.departureAirport.code,
      route.destinationAirport.code,
      {
        departureDate: searchDate.toISOString().split('T')[0],
        returnDate: returnDate.toISOString().split('T')[0],
        tripType: 'roundtrip'
      }
    );
    
    if (!flights || flights.length === 0) {
      console.log('Aucun vol trouvé');
      return;
    }
    
    // Filtrer les bonnes affaires (minimum 20% de réduction)
    const deals = flights.filter(flight => flight.discountPercentage >= 20);
    
    if (deals.length > 0) {
      console.log(`💰 ${deals.length} bonne(s) affaire(s) trouvée(s)!`);
      
      await Route.findByIdAndUpdate(route._id, {
        $inc: { totalDealsFound: deals.length }
      });
      
      // Traiter chaque bonne affaire
      for (const deal of deals) {
        await processDeal(route, deal);
      }
    }
    
  } catch (error) {
    console.error(`Erreur route ${route.departureAirport.code}-${route.destinationAirport.code}:`, error);
    
    await incrementApiCallStats(
      'flightSearch', 
      `${route.departureAirport.code}-${route.destinationAirport.code}`,
      false
    );
  }
}

/**
 * Traiter une bonne affaire trouvée
 */
async function processDeal(route, deal) {
  try {
    // Valider l'affaire avec l'IA
    const isValid = await validateDeal(deal);
    if (!isValid) {
      console.log('❌ Affaire rejetée par validation IA');
      return;
    }
    
    // Trouver les utilisateurs éligibles
    const users = await findEligibleUsers(route, deal);
    
    if (users.length === 0) {
      console.log('Aucun utilisateur éligible');
      return;
    }
    
    console.log(`📧 Envoi d'alertes à ${users.length} utilisateur(s)`);
    
    // Créer et envoyer les alertes
    for (const user of users) {
      await createAndSendAlert(user, route, deal);
    }
    
  } catch (error) {
    console.error('Erreur lors du traitement de l\'affaire:', error);
  }
}

/**
 * Trouver les utilisateurs éligibles pour une alerte
 */
async function findEligibleUsers(route, deal) {
  try {
    const departureCode = route.departureAirport.code;
    
    // Requête pour trouver les utilisateurs
    const query = {
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
    };
    
    // Si c'est CDG/ORY, inclure aussi ceux qui ont activé includeCDG
    if (departureCode === 'CDG' || departureCode === 'ORY') {
      query.$or.push({ includeCDG: true });
    }
    
    const users = await User.find(query);
    
    // Filtrer selon les critères
    const eligibleUsers = [];
    
    for (const user of users) {
      // Vérifier le seuil de réduction
      if (user.subscriptionType === 'free') {
        if (deal.discountPercentage < MIN_DISCOUNT_FREE || 
            deal.discountPercentage > MAX_DISCOUNT_FREE) {
          continue;
        }
        
        // Vérifier la limite quotidienne
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const alertCount = await Alert.countDocuments({
          user: user._id,
          createdAt: { $gte: today }
        });
        
        if (alertCount >= MAX_ALERTS_FREE) {
          continue;
        }
      }
      
      eligibleUsers.push(user);
    }
    
    return eligibleUsers;
  } catch (error) {
    console.error('Erreur recherche utilisateurs:', error);
    return [];
  }
}

/**
 * Créer et envoyer une alerte
 */
async function createAndSendAlert(user, route, deal) {
  try {
    const alert = new Alert({
      user: user._id,
      departureAirport: route.departureAirport,
      destinationAirport: route.destinationAirport,
      price: deal.price,
      originalPrice: deal.originalPrice,
      discountPercentage: deal.discountPercentage,
      discountAmount: deal.discountAmount,
      airline: deal.airline,
      farePolicy: deal.farePolicy || 'Économique',
      stops: deal.stops || 0,
      outboundDate: new Date(deal.departureDate),
      returnDate: new Date(deal.returnDate),
      duration: deal.duration,
      bookingLink: deal.bookingLink,
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    });
    
    await alert.save();
    
    // Mettre à jour les économies potentielles
    await User.findByIdAndUpdate(user._id, {
      $inc: { totalPotentialSavings: deal.discountAmount }
    });
    
    // Envoyer l'email
    await sendAlertEmail(user, alert);
    
    console.log(`✅ Alerte envoyée à ${user.email}`);
  } catch (error) {
    console.error('Erreur création alerte:', error);
  }
}

/**
 * Optimisation quotidienne des routes
 */
async function optimizeRoutesDaily() {
  try {
    const todayStats = await getTodayStats();
    const remainingQuota = MONTHLY_API_QUOTA - (todayStats.totalCalls * 30);
    
    const optimization = await optimizeRoutes({
      quota: remainingQuota,
      isFullOptimization: false
    });
    
    if (optimization.routesToUpdate) {
      for (const update of optimization.routesToUpdate) {
        await Route.findOneAndUpdate(
          {
            'departureAirport.code': update.departureCode,
            'destinationAirport.code': update.destinationCode
          },
          {
            scanFrequency: update.newScanFrequency,
            tier: update.newTier,
            isActive: update.isActive
          }
        );
      }
    }
    
    console.log('✅ Optimisation quotidienne terminée');
  } catch (error) {
    console.error('Erreur optimisation:', error);
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

module.exports.createAndSendAlert = createAndSendAlert;