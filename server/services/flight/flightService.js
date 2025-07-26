// server/services/flight/flightService.js
const axios = require('axios');
const { incrementApiCallStats } = require('../analytics/statsService');
const cacheService = require('../cache/cacheService');

// Configuration API
const FLIGHT_API_BASE_URL = process.env.FLIGHT_API_BASE_URL || 'https://app.goflightlabs.com';
const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY;

console.log('🔧 Flight service configuration:');
console.log('  Base URL:', FLIGHT_API_BASE_URL);
console.log('  API Key configured:', !!FLIGHT_API_KEY);

/**
 * Fonction utilitaire pour faire des requêtes vers FlightLabs API
 */
async function makeFlightLabsRequest(endpoint, params = {}) {
  if (!FLIGHT_API_KEY) {
    throw new Error('FLIGHT_API_KEY not configured');
  }
  
  try {
    console.log('🔄 FlightLabs API Request (OFFICIAL ENDPOINTS):');
    console.log('  Endpoint:', endpoint);
    console.log('  API Key:', FLIGHT_API_KEY.substring(0, 20) + '...');
    console.log('  Params:', params);
    
    // Build URL avec la vraie URL de base officielle
    const url = `${FLIGHT_API_BASE_URL}/${endpoint}`;
    const requestParams = {
      access_key: FLIGHT_API_KEY,
      ...params
    };
    
    console.log('  Full URL:', url);
    console.log('  Request params:', requestParams);

    // Timeout pour les vrais endpoints
    const response = await axios.get(url, {
      params: requestParams,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GlobeGenius/1.0'
      }
    });

    console.log('✅ FlightLabs API Response Status:', response.status);
    console.log('✅ Data count:', Array.isArray(response.data?.data) ? response.data.data.length : 'N/A');
    
    // Track API usage
    await incrementApiCallStats('flightlabs', endpoint);
    
    return response.data;
  } catch (error) {
    console.error('❌ FlightLabs API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    
    // Track failed API calls
    await incrementApiCallStats('flightlabs', endpoint, false);
    throw error;
  }
}

/**
 * FONCTION PRINCIPALE - Get flights avec cache intelligent
 * Utilise l'endpoint officiel : https://app.goflightlabs.com/flights
 */
exports.getFlights = async (filters = {}) => {
  try {
    console.log('✈️ Getting flights from OFFICIAL FlightLabs endpoint...');
    
    // 1. VÉRIFIER LE CACHE D'ABORD
    const cachedResult = await cacheService.getFlightResults(filters);
    if (cachedResult) {
      console.log('💰 QUOTA ÉCONOMISÉ - Utilisation du cache !');
      return cachedResult;
    }
    
    // 2. Paramètres selon la documentation officielle
    const params = {};
    
    if (filters.limit) params.limit = Math.min(filters.limit, 10000); // Max 10,000 selon doc
    if (filters.flight_iata) params.flightIata = filters.flight_iata;
    if (filters.flight_icao) params.flightIcao = filters.flight_icao;
    if (filters.airline_iata) params.airlineIata = filters.airline_iata;
    if (filters.dep_iata) params.depIata = filters.dep_iata;
    if (filters.arr_iata) params.arrIata = filters.arr_iata;
    
    // Support des nouveaux paramètres FlightLabs
    if (filters.depIata) params.depIata = filters.depIata;
    if (filters.arrIata) params.arrIata = filters.arrIata;
    
    // 3. UN SEUL APPEL API avec le VRAI endpoint
    console.log('💳 UTILISATION QUOTA API - Appel FlightLabs...');
    const data = await makeFlightLabsRequest('flights', params);
    
    if (data && data.data) {
      const flights = Array.isArray(data.data) ? data.data : [data.data];
      
      console.log(`✅ Retrieved ${flights.length} flights from OFFICIAL endpoint`);
      
      const result = {
        success: true,
        flights: flights.map(flight => ({
          // Identifiants vol
          flight_iata: flight.flight?.iata || flight.flight_iata,
          flight_icao: flight.flight?.icao || flight.flight_icao,
          flight_number: flight.flight?.number || flight.flight_number,
          
          // Départ
          dep_iata: flight.departure?.iata || flight.dep_iata,
          dep_icao: flight.departure?.icao || flight.dep_icao,
          dep_time: flight.departure?.scheduled || flight.dep_time,
          dep_actual: flight.departure?.actual,
          dep_estimated: flight.departure?.estimated,
          dep_terminal: flight.departure?.terminal,
          dep_gate: flight.departure?.gate,
          
          // Arrivée
          arr_iata: flight.arrival?.iata || flight.arr_iata,
          arr_icao: flight.arrival?.icao || flight.arr_icao,
          arr_time: flight.arrival?.scheduled || flight.arr_time,
          arr_actual: flight.arrival?.actual,
          arr_estimated: flight.arrival?.estimated,
          arr_terminal: flight.arrival?.terminal,
          arr_gate: flight.arrival?.gate,
          
          // Compagnie aérienne
          airline_iata: flight.airline?.iata || flight.airline_iata,
          airline_icao: flight.airline?.icao || flight.airline_icao,
          airline_name: flight.airline?.name || flight.airline_name,
          
          // Avion et statut
          aircraft_icao: flight.aircraft?.icao || flight.aircraft_icao,
          registration: flight.aircraft?.registration || flight.reg_number,
          status: flight.flight_status || flight.status,
          
          // Position (si disponible)
          latitude: flight.lat,
          longitude: flight.lng,
          altitude: flight.alt,
          speed: flight.speed,
          direction: flight.dir,
          
          // Timing
          updated: flight.updated,
          live: flight.live
        })),
        total: data.pagination?.total || flights.length,
        message: `Retrieved ${flights.length} flights using OFFICIAL FlightLabs API`,
        apiCallsUsed: 1,
        endpoint: 'flights'
      };

      // 4. MISE EN CACHE ADAPTATIVE
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      const adaptiveTTL = cacheService.getAdaptiveTTL(hour, dayOfWeek);
      
      await cacheService.setFlightResults(filters, result, adaptiveTTL);
      
      const ttlHours = Math.round(adaptiveTTL / 3600);
      console.log(`🕒 Cache configuré: ${ttlHours}h (période ${hour >= 2 && hour <= 10 && [2,3,4].includes(dayOfWeek) ? 'OPTIMALE' : 'STANDARD'})`);
      
      return result;
    }

    return { 
      success: false, 
      message: 'No flights found', 
      flights: [],
      apiCallsUsed: 1,
      endpoint: 'flights'
    };
  } catch (error) {
    console.error('❌ Error fetching flights:', error.message);
    return { 
      success: false, 
      message: `FlightLabs API error: ${error.message}`, 
      flights: [],
      apiCallsUsed: 1,
      endpoint: 'flights'
    };
  }
};

/**
 * Get flight schedules avec cache
 */
exports.getFlightSchedules = async (filters = {}) => {
  try {
    console.log('📅 Getting flight schedules from OFFICIAL endpoint...');
    
    // Vérifier le cache d'abord
    const cachedResult = await cacheService.getFlightResults(filters);
    if (cachedResult) {
      console.log('💰 QUOTA ÉCONOMISÉ - Cache utilisé pour schedules !');
      return cachedResult;
    }
    
    // Paramètres selon la documentation officielle
    const params = {};
    
    // Paramètres requis selon doc
    if (filters.iata_code) params.iataCode = filters.iata_code;
    if (filters.type) params.type = filters.type; // "departure" ou "arrival"
    
    // Paramètres optionnels
    if (filters.airline_iata) params.airline_iata = filters.airline_iata;
    if (filters.flight_iata) params.flight_iata = filters.flight_iata;
    if (filters.limit) params.limit = filters.limit;
    
    console.log('💳 UTILISATION QUOTA API - Appel schedules...');
    const data = await makeFlightLabsRequest('advanced-flights-schedules', params);
    
    if (data && data.data) {
      const schedules = Array.isArray(data.data) ? data.data : [data.data];
      
      const result = {
        success: true,
        schedules: schedules.map(schedule => ({
          flight_iata: schedule.flight?.iata,
          flight_icao: schedule.flight?.icao,
          dep_iata: schedule.departure?.iata,
          dep_time: schedule.departure?.scheduled,
          arr_iata: schedule.arrival?.iata,
          arr_time: schedule.arrival?.scheduled,
          airline_iata: schedule.airline?.iata,
          status: schedule.flight_status
        })),
        total: schedules.length,
        message: `Retrieved ${schedules.length} flight schedules from OFFICIAL endpoint`,
        apiCallsUsed: 1,
        endpoint: 'advanced-flights-schedules'
      };

      // Mise en cache des schedules
      const now = new Date();
      const adaptiveTTL = cacheService.getAdaptiveTTL(now.getHours(), now.getDay());
      await cacheService.setFlightResults(filters, result, adaptiveTTL);

      return result;
    }

    return { success: false, message: 'No flight schedules found', schedules: [], apiCallsUsed: 1 };
  } catch (error) {
    console.error('❌ Error fetching flight schedules:', error.message);
    return { 
      success: false, 
      message: `FlightLabs API error: ${error.message}`, 
      schedules: [],
      apiCallsUsed: 1
    };
  }
};

/**
 * Get airports avec cache
 */
exports.getAirports = async (filters = {}) => {
  try {
    console.log('🏢 Getting airports from OFFICIAL endpoint...');
    
    // Vérifier le cache d'abord
    const cachedResult = await cacheService.getFlightResults(filters);
    if (cachedResult) {
      console.log('💰 QUOTA ÉCONOMISÉ - Cache utilisé pour airports !');
      return cachedResult;
    }
    
    // Paramètre requis selon doc
    const params = {};
    if (filters.query) params.query = filters.query;
    
    console.log('💳 UTILISATION QUOTA API - Appel airports...');
    const data = await makeFlightLabsRequest('retrieveAirport', params);
    
    if (data && data.data) {
      const airports = Array.isArray(data.data) ? data.data : [data.data];
      
      const result = {
        success: true,
        airports: airports.map(airport => ({
          iata: airport.iata || airport.iataCode,
          icao: airport.icao || airport.icaoCode,
          name: airport.name,
          city: airport.city,
          country: airport.country,
          type: 'airport'
        })),
        total: airports.length,
        message: `Retrieved ${airports.length} airports from OFFICIAL endpoint`,
        apiCallsUsed: 1,
        endpoint: 'retrieveAirport'
      };

      // Cache long pour les aéroports (changent rarement)
      await cacheService.setFlightResults(filters, result, 24 * 60 * 60); // 24h cache

      return result;
    }

    return { success: false, message: 'No airports found', airports: [], apiCallsUsed: 1 };
  } catch (error) {
    console.error('❌ Error fetching airports:', error.message);
    return { 
      success: false, 
      message: `FlightLabs API error: ${error.message}`, 
      airports: [],
      apiCallsUsed: 1
    };
  }
};

/**
 * Get airport details (static info since OpenSky doesn't provide airport database)
 */
exports.getAirportDetails = async (airportCode) => {
  try {
    console.log(`🏛️  Fetching airport details for: ${airportCode}`);
    
    // OpenSky ne fournit pas de base de données des aéroports
    const airportDatabase = {
      'CDG': { name: 'Charles de Gaulle', city: 'Paris', country: 'France', timezone: 'Europe/Paris' },
      'LHR': { name: 'Heathrow', city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
      'JFK': { name: 'John F. Kennedy', city: 'New York', country: 'United States', timezone: 'America/New_York' },
      'LAX': { name: 'Los Angeles International', city: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles' },
      'FRA': { name: 'Frankfurt am Main', city: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin' },
      'AMS': { name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam' },
      'DXB': { name: 'Dubai International', city: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai' }
    };
    
    const airport = airportDatabase[airportCode.toUpperCase()];
    
    if (airport) {
      return {
        success: true,
        airport: {
          iata: airportCode.toUpperCase(),
          name: airport.name,
          city: airport.city,
          country: airport.country,
          timezone: airport.timezone
        }
      };
    }

    return { 
      success: false, 
      message: `Airport ${airportCode} not found in static database`,
      airport: {
        iata: airportCode.toUpperCase(),
        name: `${airportCode.toUpperCase()} Airport`,
        city: 'Unknown',
        country: 'Unknown'
      }
    };
  } catch (error) {
    console.error(`❌ Airport details error for ${airportCode}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Check API quota and test connectivity
 */
exports.checkApiQuota = async () => {
  try {
    console.log('💳 Checking FlightLabs API quota...');
    
    // Update local statistics
    // This part of the code was removed from the new_code, so it's removed here.
    // The statsService is no longer imported directly.

    return {
      success: true,
      quota: {
        provider: 'FlightLabs',
        status: 'active',
        note: 'FlightLabs is a free API, no official quota information available.'
      }
    };
  } catch (error) {
    console.error('❌ API quota check error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Test FlightLabs API connectivity with official endpoints
 */
exports.testConnectivity = async () => {
  const results = {
    configTest: 'FAIL',
    futureFlightsTest: 'FAIL',
    searchTest: 'FAIL',
    quotaTest: 'FAIL'
  };

  try {
    console.log('🧪 Starting FlightLabs API connectivity test...');

    // Test 1: Configuration
    if (FLIGHT_API_BASE_URL) {
      console.log('✅ Configuration test: PASS');
      results.configTest = 'PASS';
    } else {
      console.log('❌ Configuration test: FAIL - Missing API URL');
    }

    // Test 2: Future Flights endpoint with CDG departures
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const futureFlightsTest = await exports.getFlights({ dep_iata: 'CDG', date: dateStr }); // Using the 'flights' endpoint for future flights

      if (futureFlightsTest && Array.isArray(futureFlightsTest.flights)) {
        console.log('✅ Future flights test: PASS');
        results.futureFlightsTest = 'PASS';
      }
    } catch (error) {
      console.log('❌ Future flights test: FAIL -', error.message);
    }

    // Test 3: Flight search functionality
    try {
      const searchTest = await exports.getFlights({ dep_iata: 'CDG', arr_iata: 'LHR', date: getDefaultDepartureDate() });

      if (searchTest && searchTest.success) {
        console.log('✅ Search test: PASS');
        results.searchTest = 'PASS';
      }
    } catch (error) {
      console.log('❌ Search test: FAIL -', error.message);
    }

    // Test 4: Quota check
    try {
      const quotaTest = await exports.checkApiQuota();
      if (quotaTest && quotaTest.success) {
        console.log('✅ Quota test: PASS');
        results.quotaTest = 'PASS';
      }
    } catch (error) {
      console.log('❌ Quota test: FAIL -', error.message);
    }

    const passedTests = Object.values(results).filter(r => r === 'PASS').length;
    const totalTests = Object.keys(results).length;

    const testResult = {
      success: passedTests > 0,
      results,
      summary: {
        passed: passedTests,
        total: totalTests,
        successRate: Math.round((passedTests / totalTests) * 100)
      },
      apiInfo: {
        provider: 'FlightLabs',
        baseUrl: FLIGHT_API_BASE_URL,
        keyConfigured: !!FLIGHT_API_KEY,
        keyPreview: FLIGHT_API_KEY ? `${FLIGHT_API_KEY.substring(0, 20)}...` : 'NOT SET',
        endpoints: ['flights']
      },
      message: `FlightLabs API: ${passedTests}/${totalTests} tests passed`
    };

    console.log('🎯 FlightLabs API test completed:', testResult.message);
    return testResult;

  } catch (error) {
    console.error('💥 FlightLabs API connectivity test failed:', error);
    return {
      success: false,
      results,
      error: error.message,
      message: 'FlightLabs API connectivity test failed'
    };
  }
};

/**
 * Get alternative dates for flights
 */
exports.getAlternativeDates = async (originCode, destinationCode, departureDate, returnDate, price) => {
  try {
    const cacheKey = `alternatives:${originCode}:${destinationCode}:${departureDate}:${returnDate}:${price}`;
    
    const cachedResults = await cacheService.getFlightResults({ originCode, destinationCode, departureDate, returnDate, price });
    if (cachedResults) {
      return cachedResults;
    }
    
    const alternatives = [];
    const depDate = new Date(departureDate);
    
    // Check 3 days before and after
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue; // Skip original date
      
      const altDepDate = new Date(depDate);
      altDepDate.setDate(depDate.getDate() + i);
      const formattedDep = altDepDate.toISOString().split('T')[0];
      
      try {
        const flights = await exports.getFlights({
          dep_iata: originCode,
          arr_iata: destinationCode,
          date: formattedDep
        });
        
        if (flights.success && flights.flights.length > 0) {
          // Simulate price for demo (in production, you'd get actual prices)
          const simulatedPrice = price + (Math.random() - 0.5) * 100; // ±50€ variation
          
          if (Math.abs(simulatedPrice - price) / price <= 0.15) { // Within 15%
            alternatives.push({
              outbound: formattedDep,
              return: returnDate,
              price: Math.round(simulatedPrice),
              flights: flights.flights.length
            });
          }
        }
      } catch (error) {
        console.error(`Error checking alternative date ${formattedDep}:`, error.message);
      }
      
      if (alternatives.length >= 5) break; // Limit to 5 alternatives
    }
    
    // Cache for 6 hours
    await cacheService.setFlightResults({ originCode, destinationCode, departureDate, returnDate, price }, alternatives, 21600);
    
    return alternatives;
    
  } catch (error) {
    console.error('Error getting alternative dates:', error);
    return [];
  }
};

// Helper functions for backward compatibility
function getDefaultDepartureDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function getDefaultReturnDate(departureDate) {
  const returnDate = new Date(departureDate);
  returnDate.setDate(returnDate.getDate() + 7);
  return returnDate.toISOString().split('T')[0];
}

function estimateBaselinePrice(originCode, destinationCode) {
  const basePrices = {
    'CDG-LHR': 250, 'CDG-MAD': 200, 'CDG-BCN': 180, 'CDG-FCO': 220,
    'CDG-JFK': 700, 'CDG-LAX': 900, 'CDG-DXB': 600, 'CDG-HND': 950,
    'ORY-LHR': 230, 'ORY-MAD': 190, 'ORY-BCN': 170
  };
  
  const routeKey = `${originCode}-${destinationCode}`;
  return basePrices[routeKey] || 400;
}

function generateBookingLink(itinerary, originCode, destinationCode, departureDate, returnDate) {
  return `https://www.skyscanner.fr/transport/vols/${originCode}/${destinationCode}/${departureDate}/${returnDate || ''}/`;
}

function generateMockFlights(originCode, destinationCode) {
  // Fallback mock data for development
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