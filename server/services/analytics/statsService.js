// server/services/analytics/statsService.js
const ApiStats = require('../../models/apiStats.model');

/**
 * Increment API call statistics
 * @param {string} type - Type of API call (flightSearch, alternativeDates, ai)
 * @param {string} target - Target of the call (route, airport, ai model)
 * @param {boolean} success - Whether the call was successful
 */
exports.incrementApiCallStats = async (type, target, success = true) => {
  try {
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find or create stats document for today
    let stats = await ApiStats.findOne({ date: today });
    
    if (!stats) {
      stats = new ApiStats({
        date: today,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        callsByRoute: new Map(),
        callsByAirport: new Map(),
        aiCallsByType: {
          'gemini-flash': 0,
          'gpt4o-mini': 0
        }
      });
    }
    
    // Increment total calls
    stats.totalCalls += 1;
    
    // Increment success/failure counts
    if (success) {
      stats.successfulCalls += 1;
    } else {
      stats.failedCalls += 1;
    }
    
    // Handle specific call types
    if (type === 'flightSearch' && target) {
      // Format: "CDG-JFK"
      const routeParts = target.split('-');
      if (routeParts.length === 2) {
        // Increment route counts
        const routeCount = stats.callsByRoute.get(target) || 0;
        stats.callsByRoute.set(target, routeCount + 1);
        
        // Increment airport counts
        const departureAirport = routeParts[0];
        const destinationAirport = routeParts[1];
        
        const departureCount = stats.callsByAirport.get(departureAirport) || 0;
        stats.callsByAirport.set(departureAirport, departureCount + 1);
        
        const destinationCount = stats.callsByAirport.get(destinationAirport) || 0;
        stats.callsByAirport.set(destinationAirport, destinationCount + 1);
      }
    } else if (type === 'flightlabs' && target) {
      // Gérer les appels FlightLabs (nouveau type ajouté)
      console.log(`📊 Tracking FlightLabs API call: ${target} (${success ? 'SUCCESS' : 'FAILED'})`);
      // Pour FlightLabs, on peut optionnellement tracker par endpoint
      // mais on a déjà les compteurs totaux ci-dessus
    } else if (type === 'alternativeDates' && target) {
      // Same format as flight search
      const routeCount = stats.callsByRoute.get(target) || 0;
      stats.callsByRoute.set(target, routeCount + 1);
    } else if (type === 'ai' && target) {
      // Increment AI model counts
      if (target === 'gemini-flash' || target === 'gpt4o-mini') {
        stats.aiCallsByType[target] += 1;
      }
    }
    
    // Save stats
    await stats.save();
    
    return true;
  } catch (error) {
    console.error('Error incrementing API call stats:', error);
    return false;
  }
};

/**
 * Get API stats for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of API stats
 */
exports.getApiStats = async (startDate, endDate) => {
  try {
    const stats = await ApiStats.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    return stats;
  } catch (error) {
    console.error('Error getting API stats:', error);
    return [];
  }
};

/**
 * Get today's API stats
 * @returns {Promise<Object>} - Today's API stats
 */
exports.getTodayStats = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await ApiStats.findOne({ date: today });
    
    if (!stats) {
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        callsByRoute: {},
        callsByAirport: {},
        aiCallsByType: {
          'gemini-flash': 0,
          'gpt4o-mini': 0
        }
      };
    }
    
    // Convert Maps to objects for easier handling in frontend
    const callsByRoute = {};
    for (const [route, count] of stats.callsByRoute.entries()) {
      callsByRoute[route] = count;
    }
    
    const callsByAirport = {};
    for (const [airport, count] of stats.callsByAirport.entries()) {
      callsByAirport[airport] = count;
    }
    
    return {
      totalCalls: stats.totalCalls,
      successfulCalls: stats.successfulCalls,
      failedCalls: stats.failedCalls,
      callsByRoute,
      callsByAirport,
      aiCallsByType: stats.aiCallsByType
    };
  } catch (error) {
    console.error('Error getting today stats:', error);
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      callsByRoute: {},
      callsByAirport: {},
      aiCallsByType: {
        'gemini-flash': 0,
        'gpt4o-mini': 0
      }
    };
  }
};