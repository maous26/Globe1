// server/services/flight/flightService.js
const axios = require('axios');
const Redis = require('ioredis');
const statsService = require('../analytics/statsService');
const ApiStats = require('../../models/apiStats.model');

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// GoFlightLabs API configuration
const FLIGHT_API_URL = process.env.FLIGHT_API_URL || 'https://goflightlabs.com';
const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY;

/**
 * Effectuer une requête à l'API GoFlightLabs
 */
async function makeFlightLabsRequest(endpoint, params = {}) {
  try {
    // DEBUG: Afficher la clé API utilisée
    console.log('DEBUG FLIGHT_API_KEY (env):', process.env.FLIGHT_API_KEY);
    // Ajouter la clé d'accès aux paramètres
    const queryParams = {
      access_key: process.env.FLIGHT_API_KEY,
      ...params
    };

    const url = `${FLIGHT_API_URL}/${endpoint}`;
    console.log('GoFlightLabs request URL:', url);
    console.log('GoFlightLabs request params:', queryParams);

    const response = await axios.get(url, {
      params: queryParams,
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error(`Erreur GoFlightLabs ${endpoint}:`, error.message);
    throw new Error(`GoFlightLabs API error: ${error.message}`);
  }
}

/**
 * Rechercher des vols en temps réel
 */
exports.searchFlights = async (origin, destination, date) => {
  try {
    console.log(`Recherche de vols ${origin} -> ${destination} pour`, date);
    // GoFlightLabs attend des paramètres plats
    const params = {
      type: 'departure',
      iataCode: origin,
      date: date.departureDate
    };
    console.log('params envoyés à GoFlightLabs:', params);
    const data = await makeFlightLabsRequest('advanced-future-flights', params);

    if (data && data.success && data.data) {
      // Filtrer les vols vers la destination
      const flights = data.data.filter(flight => 
        flight.airport && flight.airport.fs === destination
      );

      return {
        success: true,
        flights: flights.map(flight => ({
          flightNumber: flight.carrier?.flightNumber,
          airline: flight.carrier?.name,
          departure: {
            airport: origin,
            time: flight.departureTime?.time24,
            timeAMPM: flight.departureTime?.timeAMPM
          },
          arrival: {
            airport: flight.airport?.fs,
            city: flight.airport?.city,
            time: flight.arrivalTime?.time24,
            timeAMPM: flight.arrivalTime?.timeAMPM
          },
          operatedBy: flight.operatedBy,
          sortTime: flight.sortTime
        }))
      };
    }

    return { success: false, message: 'Aucun vol trouvé' };
  } catch (error) {
    console.error('Erreur de recherche de vols:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir les compagnies aériennes
 */
exports.getAirlines = async () => {
  try {
    console.log('Récupération des compagnies aériennes via GoFlightLabs...');
    
    // GoFlightLabs n'a pas d'endpoint airlines simple, utilisons une approche de test
    return {
      success: true,
      airlines: [
        { iata: 'AF', name: 'Air France' },
        { iata: 'BA', name: 'British Airways' },
        { iata: 'LH', name: 'Lufthansa' },
        { iata: 'KL', name: 'KLM' },
        { iata: 'FR', name: 'Ryanair' }
      ],
      message: 'Liste de compagnies aériennes de test - GoFlightLabs ne fournit pas d\'endpoint airlines direct'
    };
  } catch (error) {
    console.error('Erreur de récupération des compagnies aériennes:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir les détails d'un aéroport
 */
exports.getAirportDetails = async (airportCode) => {
  try {
    console.log(`Récupération des détails de l'aéroport ${airportCode}`);
    
    // GoFlightLabs n'a pas d'endpoint airports simple, retournons une réponse de test
    return {
      success: true,
      airport: {
        iata: airportCode,
        name: `${airportCode} Airport`,
        message: 'Données d\'aéroport de test - GoFlightLabs utilise des endpoints spécialisés'
      }
    };
  } catch (error) {
    console.error(`Erreur de récupération de l'aéroport ${airportCode}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Vérifier le quota API
 */
exports.checkApiQuota = async () => {
  try {
    // Mise à jour des statistiques API dans MongoDB
    await ApiStats.findOneAndUpdate(
      { provider: 'goflightlabs' },
      {
        $inc: { totalRequests: 1 },
        $set: { 
          lastRequest: new Date(),
          monthlyQuotaRemaining: 1000 // Quota simulé
        }
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      quota: {
        remaining: 1000,
        total: 10000,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    };
  } catch (error) {
    console.error('Erreur de vérification du quota:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Test de connectivité GoFlightLabs
 */
exports.testConnectivity = async () => {
  const results = {
    configTest: 'FAIL',
    airportTest: 'FAIL',
    flightTest: 'FAIL',
    quotaTest: 'FAIL'
  };

  try {
    // Test de configuration
    if (FLIGHT_API_KEY && FLIGHT_API_URL) {
      results.configTest = 'PASS';
    }

    // Test d'aéroport (utilise future flights)
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 jours dans le futur
      const dateStr = futureDate.toISOString().split('T')[0]; // Format YYYY-MM-DD

      const airportData = await makeFlightLabsRequest('advanced-future-flights', {
        type: 'departure',
        iataCode: 'CDG',
        date: dateStr
      });

      if (airportData && airportData.success) {
        results.airportTest = 'PASS';
      }
    } catch (error) {
      console.log('Test aéroport échoué:', error.message);
    }

    // Test de recherche de vol
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14); // 14 jours dans le futur
      const dateStr = futureDate.toISOString().split('T')[0];

      const flightData = await exports.searchFlights('CDG', 'LHR', dateStr);
      if (flightData && flightData.success) {
        results.flightTest = 'PASS';
      }
    } catch (error) {
      console.log('Test vol échoué:', error.message);
    }

    // Test de quota
    try {
      const quotaData = await exports.checkApiQuota();
      if (quotaData && quotaData.success) {
        results.quotaTest = 'PASS';
      }
    } catch (error) {
      console.log('Test quota échoué:', error.message);
    }

    const passedTests = Object.values(results).filter(r => r === 'PASS').length;
    const totalTests = Object.keys(results).length;

    return {
      success: true,
      results,
      summary: {
        passed: passedTests,
        total: totalTests,
        successRate: Math.round((passedTests / totalTests) * 100)
      },
      message: `GoFlightLabs API: ${passedTests}/${totalTests} tests réussis`
    };

  } catch (error) {
    return {
      success: false,
      results,
      error: error.message,
      message: 'Erreur lors du test de connectivité GoFlightLabs'
    };
  }
};

/**
 * Get alternative dates for flights
 */
exports.getAlternativeDates = async (originCode, destinationCode, departureDate, returnDate, price) => {
  try {
    const cacheKey = `alternatives:${originCode}:${destinationCode}:${departureDate}:${returnDate}:${price}`;
    
    const cachedResults = await redis.get(cacheKey);
    if (cachedResults) {
      return JSON.parse(cachedResults);
    }
    
    // Pour FlightLabs, on peut rechercher plusieurs dates
    const alternatives = [];
    const depDate = new Date(departureDate);
    const retDate = new Date(returnDate);
    
    // Vérifier 3 jours avant et après
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue; // Skip original date
      
      const altDepDate = new Date(depDate);
      altDepDate.setDate(depDate.getDate() + i);
      
      const altRetDate = new Date(retDate);
      altRetDate.setDate(retDate.getDate() + i);
      
      const formattedDep = altDepDate.toISOString().split('T')[0];
      const formattedRet = altRetDate.toISOString().split('T')[0];
      
      // Recherche simplifiée pour les dates alternatives
      try {
        const flights = await exports.searchFlights(originCode, destinationCode, {
          departureDate: formattedDep,
          returnDate: formattedRet
        });
        
        if (flights.length > 0) {
          const bestFlight = flights[0]; // Le moins cher
          if (Math.abs(bestFlight.price - price) / price <= 0.15) { // Dans les 15% du prix original
            alternatives.push({
              outbound: formattedDep,
              return: formattedRet,
              price: bestFlight.price
            });
          }
        }
      } catch (error) {
        console.error(`Error checking alternative date ${formattedDep}:`, error.message);
      }
      
      if (alternatives.length >= 5) break; // Limiter à 5 alternatives
    }
    
    // Cache for 6 hours
    await redis.set(cacheKey, JSON.stringify(alternatives), 'EX', 21600);
    
    return alternatives;
    
  } catch (error) {
    console.error('Error getting alternative dates:', error);
    return [];
  }
};

// Helper functions
function getDefaultDepartureDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function getDefaultReturnDate(departureDate) {
  const returnDate = new Date(departureDate);
  returnDate.setDate(returnDate.getDate() + 7); // 7 jours après le départ
  return returnDate.toISOString().split('T')[0];
}

function estimateBaselinePrice(originCode, destinationCode) {
  // Prix de base estimés pour calculer les réductions
  const basePrices = {
    'CDG-LHR': 250, 'CDG-MAD': 200, 'CDG-BCN': 180, 'CDG-FCO': 220,
    'CDG-JFK': 700, 'CDG-LAX': 900, 'CDG-DXB': 600, 'CDG-HND': 950,
    'ORY-LHR': 230, 'ORY-MAD': 190, 'ORY-BCN': 170
  };
  
  const routeKey = `${originCode}-${destinationCode}`;
  return basePrices[routeKey] || 400; // Prix par défaut
}

function generateBookingLink(itinerary, originCode, destinationCode, departureDate, returnDate) {
  // Lien vers Skyscanner ou autre comparateur
  return `https://www.skyscanner.fr/transport/vols/${originCode}/${destinationCode}/${departureDate}/${returnDate}/`;
}

function generateMockFlights(originCode, destinationCode) {
  // Données de test pour le développement
  return [
    {
      id: 'mock-flight-1',
      price: 299,
      currency: 'EUR',
      airline: 'Air France',
      departureDate: getDefaultDepartureDate(),
      returnDate: getDefaultReturnDate(getDefaultDepartureDate()),
      duration: 7,
      stops: 0,
      farePolicy: {
        isChangeAllowed: true,
        isCancellationAllowed: false,
        isPartiallyChangeable: true,
        isPartiallyRefundable: false
      },
      bookingLink: generateBookingLink({}, originCode, destinationCode, getDefaultDepartureDate(), getDefaultReturnDate(getDefaultDepartureDate())),
      originalPrice: 450,
      discountAmount: 151,
      discountPercentage: 34
    }
  ];
}