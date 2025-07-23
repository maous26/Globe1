// server/services/ai/routeOptimizationService.js
const Route = require('../../models/route.model');
const Alert = require('../../models/alert.model');
const { routeAIRequest } = require('./aiService');

/**
 * Optimize routes based on performance and available API quota
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} - Optimization results
 */
exports.optimizeRoutes = async (options = {}) => {
  try {
    const { quota, isFullOptimization = false } = options;
    
    // Get route performance data
    const routeData = await getRoutePerformanceData();
    
    // Get alert statistics
    const alertStats = await getAlertStatistics();
    
    // Define optimization prompt based on optimization type
    let prompt;
    
    if (isFullOptimization) {
      // Full optimization (monthly) - more comprehensive changes
      prompt = `
You are an AI travel industry expert specializing in flight route optimization. You need to perform a COMPREHENSIVE MONTHLY optimization of our flight deal monitoring system.

We have a monthly budget of 30,000 API calls to monitor routes for flight deals. Based on the performance data and alert statistics provided, optimize our route monitoring strategy.

Current remaining API quota: ${quota}

Route Performance Data:
{{jsonData}}

Alert Statistics:
{{alertStats}}

Please analyze this data and provide a comprehensive optimization plan that:

1. Adjusts scan frequencies for existing routes based on their success rate
2. Changes route tiers (ultra-priority, priority, complementary) when appropriate
3. Recommends new routes to add based on seasonal trends or emerging destinations
4. Suggests routes to remove that consistently underperform
5. Ensures we stay within our monthly API budget of 30,000 calls

Return your optimization plan as a JSON object with the following structure:
{
  "routesToUpdate": [
    {
      "departureCode": "CDG",
      "destinationCode": "JFK",
      "newScanFrequency": 6,
      "newTier": "ultra-priority",
      "isActive": true,
      "reason": "High success rate and discount percentage"
    }
  ],
  "newRoutes": [
    {
      "departureCode": "CDG",
      "departureName": "Paris Charles de Gaulle",
      "destinationCode": "CUN",
      "destinationName": "Cancún",
      "tier": "priority",
      "isSeasonal": true,
      "seasonStart": "2025-11-01",
      "seasonEnd": "2026-03-31",
      "reason": "Growing winter destination with high discount potential"
    }
  ],
  "routesToRemove": [
    {
      "departureCode": "BOD",
      "destinationCode": "BRU",
      "reason": "Consistently low performance and minimal alerts generated"
    }
  ],
  "estimatedApiCalls": 25000,
  "summary": "This optimization balances high-performing routes with seasonal opportunities while staying within the API budget."
}
`;
    } else {
      // Daily optimization - more conservative changes
      prompt = `
You are an AI travel industry expert specializing in flight route optimization. You need to perform a DAILY optimization of our flight deal monitoring system.

We have a monthly budget of 30,000 API calls to monitor routes for flight deals. Based on the performance data provided, make minor adjustments to our route monitoring strategy.

Current remaining API quota: ${quota}

Route Performance Data:
{{jsonData}}

Alert Statistics:
{{alertStats}}

Please analyze this data and provide a conservative optimization plan that:

1. Makes minor adjustments to scan frequencies for existing routes based on recent performance
2. Temporarily pauses very low-performing routes if needed
3. Ensures we stay within our monthly API budget of 30,000 calls

Return your optimization plan as a JSON object with the following structure:
{
  "routesToUpdate": [
    {
      "departureCode": "CDG",
      "destinationCode": "JFK",
      "newScanFrequency": 6,
      "newTier": "ultra-priority",
      "isActive": true,
      "reason": "Recent high success rate"
    }
  ],
  "estimatedApiCalls": 25000,
  "summary": "Minor adjustments to optimize daily API usage while maintaining monitoring of high-value routes."
}
`;
    }
    
    // Call AI for optimization
    const result = await routeAIRequest('route-optimization', prompt, {
      jsonData: routeData,
      alertStats: JSON.stringify(alertStats, null, 2)
    });
    
    // Return optimization results
    return result;
  } catch (error) {
    console.error('Error optimizing routes:', error);
    return {
      routesToUpdate: [],
      newRoutes: [],
      routesToRemove: [],
      estimatedApiCalls: 30000,
      summary: 'Optimization failed. Using default settings.',
      error: error.message
    };
  }
};

/**
 * Get route performance data for optimization
 * @returns {Promise<Array>} - Route performance data
 */
async function getRoutePerformanceData() {
  try {
    // Get all routes with their performance metrics
    const routes = await Route.find({}).lean();
    
    // Calculate success rate for each route
    const routeData = routes.map(route => {
      const successRate = route.totalScans > 0 
        ? (route.totalDealsFound / route.totalScans) * 100 
        : 0;
      
      return {
        departureCode: route.departureAirport.code,
        departureName: route.departureAirport.name,
        destinationCode: route.destinationAirport.code,
        destinationName: route.destinationAirport.name,
        tier: route.tier,
        scanFrequency: route.scanFrequency,
        totalScans: route.totalScans,
        totalDealsFound: route.totalDealsFound,
        successRate: parseFloat(successRate.toFixed(2)),
        isActive: route.isActive,
        isSeasonal: route.isSeasonal,
        seasonalPeriod: route.seasonalPeriod,
        lastScannedAt: route.lastScannedAt
      };
    });
    
    return routeData;
  } catch (error) {
    console.error('Error getting route performance data:', error);
    return [];
  }
}

/**
 * Get alert statistics for optimization
 * @returns {Promise<Object>} - Alert statistics
 */
async function getAlertStatistics() {
  try {
    // Get total alerts
    const totalAlerts = await Alert.countDocuments();
    
    // Get alerts by route
    const alertsByRoute = await Alert.aggregate([
      {
        $group: {
          _id: {
            departureCode: '$departureAirport.code',
            destinationCode: '$destinationAirport.code'
          },
          count: { $sum: 1 },
          avgDiscount: { $avg: '$discountPercentage' },
          maxDiscount: { $max: '$discountPercentage' },
          minPrice: { $min: '$price' }
        }
      },
      {
        $project: {
          _id: 0,
          departureCode: '$_id.departureCode',
          destinationCode: '$_id.destinationCode',
          alertCount: '$count',
          avgDiscount: { $round: ['$avgDiscount', 2] },
          maxDiscount: { $round: ['$maxDiscount', 2] },
          minPrice: { $round: ['$minPrice', 2] }
        }
      },
      { $sort: { alertCount: -1 } }
    ]);
    
    // Get alerts by departure airport
    const alertsByDeparture = await Alert.aggregate([
      {
        $group: {
          _id: '$departureAirport.code',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          departureCode: '$_id',
          alertCount: '$count'
        }
      },
      { $sort: { alertCount: -1 } }
    ]);
    
    // Get alerts by destination airport
    const alertsByDestination = await Alert.aggregate([
      {
        $group: {
          _id: '$destinationAirport.code',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          destinationCode: '$_id',
          alertCount: '$count'
        }
      },
      { $sort: { alertCount: -1 }
      // server/services/ai/routeOptimizationService.js (suite)
    },
    { $sort: { alertCount: -1 } }
  ]);
  
  // Get alerts by month (for seasonal patterns)
  const alertsByMonth = await Alert.aggregate([
    {
      $project: {
        month: { $month: '$createdAt' },
        year: { $year: '$createdAt' }
      }
    },
    {
      $group: {
        _id: { month: '$month', year: '$year' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        month: '$_id.month',
        year: '$_id.year',
        count: '$count'
      }
    },
    { $sort: { year: 1, month: 1 } }
  ]);
  
  // Get user engagement metrics
  const userEngagement = await Alert.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: '$count'
      }
    }
  ]);
  
  // Format engagement data
  const engagement = {
    total: totalAlerts,
    clicked: 0,
    expired: 0,
    sent: 0
  };
  
  userEngagement.forEach(status => {
    engagement[status.status] = status.count;
  });
  
  // Return combined statistics
  return {
    totalAlerts,
    alertsByRoute,
    alertsByDeparture,
    alertsByDestination,
    alertsByMonth,
    engagement
  };
} catch (error) {
  console.error('Error getting alert statistics:', error);
  return {
    totalAlerts: 0,
    alertsByRoute: [],
    alertsByDeparture: [],
    alertsByDestination: [],
    alertsByMonth: [],
    engagement: { total: 0, clicked: 0, expired: 0, sent: 0 }
  };
}
}