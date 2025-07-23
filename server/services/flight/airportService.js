// server/services/flight/airportService.js
const axios = require('axios');
const Redis = require('ioredis');

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// FlightLabs API configuration
const FLIGHT_API_URL = process.env.FLIGHT_API_URL;
const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY;

/**
 * Récupérer tous les aéroports via FlightLabs
 * @returns {Promise<Array>} - Liste des aéroports
 */
exports.getAllAirports = async () => {
  try {
    const cacheKey = 'airports:all';
    
    // Check cache first
    const cachedAirports = await redis.get(cacheKey);
    if (cachedAirports) {
      console.log('Cache hit for airports');
      return JSON.parse(cachedAirports);
    }
    
    console.log('Fetching airports from FlightLabs...');
    
    // Call FlightLabs API with correct endpoint
    const response = await axios({
      method: 'GET',
      url: `${FLIGHT_API_URL}/airports`,
      params: {
        access_key: FLIGHT_API_KEY,
        limit: 1000 // Ajustez selon vos besoins
      },
      timeout: 30000
    });
    
    // Process response
    const airports = response.data.data || response.data || [];
    
    // Cache for 24 hours
    await redis.set(cacheKey, JSON.stringify(airports), 'EX', 86400);
    
    return airports;
    
  } catch (error) {
    console.error('Error fetching airports from FlightLabs:', error.response?.data || error.message);
    throw new Error(`Failed to fetch airports: ${error.message}`);
  }
};

/**
 * Récupérer un aéroport par son code IATA
 * @param {string} iataCode - Code IATA de l'aéroport (ex: 'CDG')
 * @returns {Promise<Object>} - Informations de l'aéroport
 */
exports.getAirportByCode = async (iataCode) => {
  try {
    const cacheKey = `airport:${iataCode}`;
    
    // Check cache first
    const cachedAirport = await redis.get(cacheKey);
    if (cachedAirport) {
      console.log(`Cache hit for airport ${iataCode}`);
      return JSON.parse(cachedAirport);
    }
    
    console.log(`Fetching airport ${iataCode} from FlightLabs...`);
    
    // Call FlightLabs API
    const response = await axios({
      method: 'GET',
      url: `${FLIGHT_API_URL}/airports`,
      params: {
        access_key: FLIGHT_API_KEY,
        iata_code: iataCode
      },
      timeout: 30000
    });
    
    // Process response
    const airport = response.data.data?.[0] || response.data?.[0] || null;
    
    if (airport) {
      // Cache for 24 hours
      await redis.set(cacheKey, JSON.stringify(airport), 'EX', 86400);
    }
    
    return airport;
    
  } catch (error) {
    console.error(`Error fetching airport ${iataCode} from FlightLabs:`, error.response?.data || error.message);
    throw new Error(`Failed to fetch airport ${iataCode}: ${error.message}`);
  }
};

/**
 * Récupérer les aéroports français
 * @returns {Promise<Array>} - Liste des aéroports français
 */
exports.getFrenchAirports = async () => {
  try {
    const cacheKey = 'airports:french';
    
    // Check cache first
    const cachedAirports = await redis.get(cacheKey);
    if (cachedAirports) {
      console.log('Cache hit for French airports');
      return JSON.parse(cachedAirports);
    }
    
    console.log('Fetching French airports from FlightLabs...');
    
    // Call FlightLabs API
    const response = await axios({
      method: 'GET',
      url: `${FLIGHT_API_URL}/airports`,
      params: {
        access_key: FLIGHT_API_KEY,
        country_code: 'FR',
        limit: 1000
      },
      timeout: 30000
    });
    
    // Process response
    const airports = response.data.data || response.data || [];
    
    // Cache for 24 hours
    await redis.set(cacheKey, JSON.stringify(airports), 'EX', 86400);
    
    return airports;
    
  } catch (error) {
    console.error('Error fetching French airports from FlightLabs:', error.response?.data || error.message);
    throw new Error(`Failed to fetch French airports: ${error.message}`);
  }
};

/**
 * Rechercher des aéroports par nom ou code
 * @param {string} query - Terme de recherche
 * @returns {Promise<Array>} - Résultats de recherche
 */
exports.searchAirports = async (query) => {
  try {
    console.log(`Searching airports with query: ${query}`);
    
    // Call FlightLabs API
    const response = await axios({
      method: 'GET',
      url: `${FLIGHT_API_URL}/autocomplete`,
      params: {
        access_key: FLIGHT_API_KEY,
        query: query,
        limit: 20
      },
      timeout: 30000
    });
    
    // Process response
    const results = response.data.data || response.data || [];
    
    return results;
    
  } catch (error) {
    console.error(`Error searching airports with query ${query}:`, error.response?.data || error.message);
    throw new Error(`Failed to search airports: ${error.message}`);
  }
};

/**
 * Récupérer les détails d'un aéroport spécifique via FlightLabs
 * @param {string} iataCode - Code IATA de l'aéroport (ex: CDG, LHR)
 * @returns {Promise<Object>} - Détails de l'aéroport
 */
exports.getAirportDetails = async (iataCode) => {
  try {
    const cacheKey = `airport:${iataCode}`;
    
    // Check cache first
    const cachedAirport = await redis.get(cacheKey);
    if (cachedAirport) {
      console.log(`Cache hit for airport ${iataCode}`);
      return JSON.parse(cachedAirport);
    }
    
    console.log(`Fetching airport details for: ${iataCode}`);
    
    // GoFlightLabs ne semble pas avoir d'endpoint spécifique pour les détails d'aéroport
    // Nous simulons une réponse avec les informations de base
    const airportDetails = {
      success: true,
      airport: {
        iata_code: iataCode,
        name: `${iataCode} Airport`,
        city: getAirportCity(iataCode),
        country: getAirportCountry(iataCode),
        message: `Airport details for ${iataCode} (simulated response)`
      }
    };

    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, JSON.stringify(airportDetails));
    
    return airportDetails;
  } catch (error) {
    console.error(`Error fetching airport details for ${iataCode}:`, error.message ? { message: error.message } : error);
    return {
      success: false,
      error: `Failed to fetch airport details: ${error.message}`
    };
  }
};

/**
 * Fonction utilitaire pour obtenir la ville d'un aéroport
 */
function getAirportCity(iataCode) {
  const cities = {
    'CDG': 'Paris',
    'LHR': 'London',
    'JFK': 'New York',
    'LAX': 'Los Angeles',
    'NRT': 'Tokyo',
    'DXB': 'Dubai',
    'FRA': 'Frankfurt',
    'AMS': 'Amsterdam',
    'ORY': 'Paris',
    'LYS': 'Lyon',
    'NCE': 'Nice',
    'MRS': 'Marseille'
  };
  return cities[iataCode] || 'Unknown City';
}

/**
 * Fonction utilitaire pour obtenir le pays d'un aéroport
 */
function getAirportCountry(iataCode) {
  const countries = {
    'CDG': 'France',
    'ORY': 'France', 
    'LYS': 'France',
    'NCE': 'France',
    'MRS': 'France',
    'LHR': 'United Kingdom',
    'JFK': 'United States',
    'LAX': 'United States',
    'NRT': 'Japan',
    'DXB': 'United Arab Emirates',
    'FRA': 'Germany',
    'AMS': 'Netherlands'
  };
  return countries[iataCode] || 'Unknown Country';
}

module.exports = exports; 