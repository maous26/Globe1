// server/services/flight/airportService.js
const axios = require('axios');
const Redis = require('ioredis');
const flightService = require('./flightService'); // Import du service optimisé

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Récupérer tous les aéroports VIA le service optimisé (économise des API calls)
 * Utilise les données de vols pour extraire les aéroports
 * @returns {Promise<Array>} - Liste des aéroports
 */
exports.getAllAirports = async () => {
  try {
    const cacheKey = 'airports:all';
    
    // Check cache first
    const cachedAirports = await redis.get(cacheKey);
    if (cachedAirports) {
      console.log('✅ Cache hit for airports');
      return JSON.parse(cachedAirports);
    }
    
    console.log('🏢 Extracting airports from FlightLabs flights data (OPTIMIZED)...');
    
    // Utilise le service de vol optimisé pour récupérer les aéroports
    const airportsResult = await flightService.getAirports({ limit: 200 });
    
    if (airportsResult.success && airportsResult.airports.length > 0) {
      // Cache for 6 hours (plus court car extrait des vols)
      await redis.set(cacheKey, JSON.stringify(airportsResult.airports), 'EX', 21600);
      
      console.log(`✅ Extracted ${airportsResult.airports.length} airports using SINGLE API call`);
      return airportsResult.airports;
    }
    
    throw new Error('No airports found in flights data');
    
  } catch (error) {
    console.error('❌ Error extracting airports:', error.message);
    throw new Error(`Failed to fetch airports: ${error.message}`);
  }
};

/**
 * Rechercher des aéroports par filtres (OPTIMISÉ)
 * @param {Object} filters - Filtres de recherche
 * @returns {Promise<Array>} - Liste des aéroports filtrés
 */
exports.searchAirports = async (filters = {}) => {
  try {
    console.log('🔍 Searching airports with optimized method...');
    
    // Récupère les données d'aéroports via le service optimisé
    const airportsResult = await flightService.getAirports(filters);
    
    if (airportsResult.success) {
      let airports = airportsResult.airports;
      
      // Apply additional filters if needed
      if (filters.country) {
        airports = airports.filter(airport => 
          airport.country?.toLowerCase().includes(filters.country.toLowerCase())
        );
      }
      
      if (filters.search) {
        airports = airports.filter(airport => 
          airport.iata?.toLowerCase().includes(filters.search.toLowerCase()) ||
          airport.icao?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      console.log(`✅ Found ${airports.length} airports matching filters`);
      return airports;
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error searching airports:', error.message);
    throw new Error(`Failed to search airports: ${error.message}`);
  }
};

/**
 * Récupérer un aéroport par code IATA (OPTIMISÉ)
 * @param {string} iataCode - Code IATA de l'aéroport
 * @returns {Promise<Object|null>} - Données de l'aéroport
 */
exports.getAirportByIATA = async (iataCode) => {
  try {
    console.log(`🔍 Getting airport ${iataCode} using optimized method...`);
    
    // Utilise le service optimisé pour chercher cet aéroport spécifique
    const airportsResult = await flightService.getAirports({ 
      dep_iata: iataCode, 
      limit: 50 
    });
    
    if (airportsResult.success && airportsResult.airports.length > 0) {
      // Trouve l'aéroport exact
      const airport = airportsResult.airports.find(apt => 
        apt.iata?.toUpperCase() === iataCode.toUpperCase()
      );
      
      if (airport) {
        console.log(`✅ Found airport ${iataCode}`);
        return airport;
      }
    }
    
    console.log(`⚠️ Airport ${iataCode} not found`);
    return null;
    
  } catch (error) {
    console.error('❌ Error getting airport by IATA:', error.message);
    return null;
  }
};

/**
 * Autocomplétion des aéroports (OPTIMISÉ)
 * @param {string} query - Requête de recherche
 * @param {number} limit - Limite de résultats
 * @returns {Promise<Array>} - Liste des suggestions
 */
exports.autocompleteAirports = async (query, limit = 10) => {
  try {
    console.log(`🔍 Autocomplete airports for "${query}" (OPTIMIZED)...`);
    
    // Utilise le cache ou les données de vol
    const airports = await exports.getAllAirports();
    
    if (airports && airports.length > 0) {
      const suggestions = airports
        .filter(airport => 
          airport.iata?.toLowerCase().includes(query.toLowerCase()) ||
          airport.icao?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit)
        .map(airport => ({
          iata: airport.iata,
          icao: airport.icao,
          type: airport.type || 'airport'
        }));
      
      console.log(`✅ Found ${suggestions.length} autocomplete suggestions`);
      return suggestions;
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error in autocomplete:', error.message);
    return [];
  }
};

/**
 * Obtenir les statistiques des aéroports (NOUVEAU)
 * @returns {Promise<Object>} - Statistiques des aéroports
 */
exports.getAirportStats = async () => {
  try {
    console.log('📊 Getting airport statistics from optimized data...');
    
    const airports = await exports.getAllAirports();
    
    if (airports && airports.length > 0) {
      const stats = {
        totalAirports: airports.length,
        departureAirports: airports.filter(apt => apt.type === 'departure').length,
        arrivalAirports: airports.filter(apt => apt.type === 'arrival').length,
        uniqueIATACodes: new Set(airports.map(apt => apt.iata)).size,
        dataSource: 'FlightLabs flights endpoint (optimized)',
        lastUpdated: new Date().toISOString()
      };
      
      return { success: true, stats };
    }
    
    return { success: false, message: 'No airport data available' };
    
  } catch (error) {
    console.error('❌ Error getting airport stats:', error.message);
    return { success: false, message: error.message };
  }
}; 