// server/services/flight/baggageService.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

// Path to baggage policy CSV file
const BAGGAGE_POLICY_FILE = path.join(__dirname, '../../data/politiques_bagages_complet.csv');

// In-memory cache for baggage policies
let baggagePoliciesCache = null;
let lastCacheUpdate = null;

/**
 * Load baggage policies from CSV file
 * @returns {Promise<Array>} - Array of baggage policies
 */
async function loadBaggagePolicies() {
  try {
    // Check if cache is still valid (less than 1 day old)
    const now = new Date();
    if (baggagePoliciesCache && lastCacheUpdate && 
        (now - lastCacheUpdate) < 24 * 60 * 60 * 1000) {
      return baggagePoliciesCache;
    }
    
    // Check if file exists
    if (!fs.existsSync(BAGGAGE_POLICY_FILE)) {
      console.error('Baggage policy file not found:', BAGGAGE_POLICY_FILE);
      return [];
    }
    
    // Read and parse CSV file
    const policies = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(BAGGAGE_POLICY_FILE)
        .pipe(csv())
        .on('data', (data) => policies.push(data))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });
    
    // Update cache
    baggagePoliciesCache = policies;
    lastCacheUpdate = now;
    
    return policies;
  } catch (error) {
    console.error('Error loading baggage policies:', error);
    return [];
  }
}

/**
 * Get baggage policy for a specific airline
 * @param {string} airline - Airline name
 * @returns {Promise<Object|null>} - Baggage policy or null if not found
 */
exports.getBaggagePolicy = async (airline) => {
  try {
    // Load policies if not cached
    const policies = await loadBaggagePolicies();
    
    // Find policy for airline (case insensitive)
    const airlineLower = airline.toLowerCase();
    const policy = policies.find(p => p.Compagnie.toLowerCase() === airlineLower);
    
    if (!policy) {
      // Try to find a similar airline name
      const similarPolicy = policies.find(p => 
        airlineLower.includes(p.Compagnie.toLowerCase()) || 
        p.Compagnie.toLowerCase().includes(airlineLower)
      );
      
      if (similarPolicy) {
        return formatPolicy(similarPolicy);
      }
      
      return null;
    }
    
    return formatPolicy(policy);
  } catch (error) {
    console.error('Error getting baggage policy:', error);
    return null;
  }
};

/**
 * Get all baggage policies
 * @returns {Promise<Array>} - Array of all baggage policies
 */
exports.getAllBaggagePolicies = async () => {
  try {
    const policies = await loadBaggagePolicies();
    return policies.map(formatPolicy);
  } catch (error) {
    console.error('Error getting all baggage policies:', error);
    return [];
  }
};

/**
 * Initialize baggage policies data
 * @param {string} csvData - CSV data
 * @returns {Promise<boolean>} - Success status
 */
exports.initializeBaggagePolicies = async (csvData) => {
  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write CSV data to file
    await promisify(fs.writeFile)(BAGGAGE_POLICY_FILE, csvData, 'utf8');
    
    // Reset cache
    baggagePoliciesCache = null;
    lastCacheUpdate = null;
    
    // Load policies to verify
    const policies = await loadBaggagePolicies();
    
    return policies.length > 0;
  } catch (error) {
    console.error('Error initializing baggage policies:', error);
    return false;
  }
};

/**
 * Format baggage policy for API response
 * @param {Object} policy - Raw policy from CSV
 * @returns {Object} - Formatted policy
 */
function formatPolicy(policy) {
  return {
    airline: policy.Compagnie,
    country: policy.Pays,
    type: policy.Type,
    personalItem: policy.Bagage_Personnel_Gratuit,
    cabinBaggage: policy.Bagage_Cabine_Eco,
    checkedBaggage: policy.Bagage_Soute_Eco,
    cabinBaggagePrice: policy.Prix_Bagage_Cabine,
    checkedBaggagePrice: policy.Prix_Bagage_Soute
  };
}