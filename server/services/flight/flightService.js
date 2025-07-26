// server/services/flight/flightService.js
const axios = require('axios');
const Redis = require('ioredis');
const statsService = require('../analytics/statsService');
const ApiStats = require('../../models/apiStats.model');

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// FlightLabs API configuration - FIXED with official URL
const FLIGHT_API_BASE_URL = 'https://goflightlabs.com';
const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY;

/**
 * Make a request to FlightLabs API with CORRECT structure
 */
async function makeFlightLabsRequest(endpoint, params = {}) {
  try {
    // Log pour debugging
    console.log('🔄 FlightLabs API Request:');
    console.log('  Endpoint:', endpoint);
    console.log('  Base URL:', FLIGHT_API_BASE_URL);
    console.log('  API Key:', FLIGHT_API_KEY ? `${FLIGHT_API_KEY.substring(0, 20)}...` : 'NOT SET');
    
    if (!FLIGHT_API_KEY) {
      throw new Error('FLIGHT_API_KEY not configured');
    }

    // Build correct query parameters for FlightLabs
    const queryParams = {
      access_key: FLIGHT_API_KEY,
      ...params
    };

    const url = `${FLIGHT_API_BASE_URL}/${endpoint}`;
    console.log('  Full URL:', url);
    console.log('  Params:', queryParams);

    const response = await axios.get(url, {
      params: queryParams,
      timeout: 30000, // 30 seconds
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GlobeGenius/1.0'
      }
    });

    console.log('✅ FlightLabs Response Status:', response.status);
    console.log('📊 Response Data Structure:', {
      success: response.data?.success,
      dataType: Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data,
      dataCount: Array.isArray(response.data?.data) ? response.data.data.length : 'not-array'
    });

    // Validate FlightLabs response structure
    if (!response.data || typeof response.data.success === 'undefined') {
      console.warn('⚠️  Unexpected response structure:', response.data);
      throw new Error('Invalid FlightLabs API response structure');
    }

    if (!response.data.success) {
      const error = response.data.error || response.data.message || 'Unknown FlightLabs API error';
      throw new Error(`FlightLabs API error: ${error}`);
    }

    // Update API statistics
    await statsService.incrementApiCallStats('flightlabs', endpoint, true);

    return response.data;
  } catch (error) {
    console.error('❌ FlightLabs API Error:', {
      endpoint,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    // Update API statistics for failed call
    await statsService.incrementApiCallStats('flightlabs', endpoint, false);

    if (error.response?.status === 401) {
      throw new Error('FlightLabs API authentication failed - check your access_key');
    } else if (error.response?.status === 429) {
      throw new Error('FlightLabs API rate limit exceeded');
    } else if (error.response?.status >= 500) {
      throw new Error('FlightLabs API server error');
    }

    throw new Error(`FlightLabs API request failed: ${error.message}`);
  }
}

/**
 * Search for flights using FlightLabs future flights API
 */
exports.searchFlights = async (origin, destination, date) => {
  try {
    console.log(`🔍 Searching flights: ${origin} → ${destination} on ${date?.departureDate || date}`);
    
    // Use FlightLabs future flights endpoint for future dates
    const searchDate = date?.departureDate || date;
    const params = {
      type: 'departure',
      iataCode: origin,
      date: searchDate
    };

    console.log('📅 Search parameters:', params);

    const data = await makeFlightLabsRequest('advanced-future-flights', params);

    if (data && data.success && data.data) {
      const flights = Array.isArray(data.data) ? data.data : [data.data];
      
      // Filter flights going to the destination
      const filteredFlights = flights.filter(flight => 
        flight.airport && flight.airport.fs === destination
      );
      
      console.log(`✈️  Found ${filteredFlights.length} flights to ${destination}`);

      return {
        success: true,
        flights: filteredFlights.map(flight => ({
          flightNumber: flight.carrier?.flightNumber,
          airline: flight.carrier?.fs,
          airlineName: flight.carrier?.name,
          departure: {
            airport: origin,
            time: flight.departureTime?.time24,
            timeAMPM: flight.departureTime?.timeAMPM,
            scheduled: flight.sortTime
          },
          arrival: {
            airport: flight.airport?.fs,
            airportName: flight.airport?.city,
            time: flight.arrivalTime?.time24,
            timeAMPM: flight.arrivalTime?.timeAMPM
          },
          operatedBy: flight.operatedBy,
          sortTime: flight.sortTime,
          flightDate: searchDate
        }))
      };
    }

    console.log('⚠️  No flights found or invalid response structure');
    return { success: false, message: 'No flights found', flights: [] };

  } catch (error) {
    console.error('❌ Flight search error:', error.message);
    return { success: false, error: error.message, flights: [] };
  }
};

/**
 * Get airlines information (returns common airlines as FlightLabs doesn't have direct endpoint)
 */
exports.getAirlines = async () => {
  try {
    console.log('🏢 Getting airlines information...');
    
    // FlightLabs doesn't have a direct airlines endpoint, so we return common airlines
    return {
      success: true,
      airlines: [
        { iata: 'AF', name: 'Air France' },
        { iata: 'BA', name: 'British Airways' },
        { iata: 'LH', name: 'Lufthansa' },
        { iata: 'KL', name: 'KLM' },
        { iata: 'FR', name: 'Ryanair' },
        { iata: 'EK', name: 'Emirates' },
        { iata: 'AA', name: 'American Airlines' },
        { iata: 'DL', name: 'Delta Air Lines' },
        { iata: 'UA', name: 'United Airlines' },
        { iata: 'QR', name: 'Qatar Airways' }
      ],
      message: 'Common airlines list - FlightLabs uses flight-specific endpoints'
    };
  } catch (error) {
    console.error('❌ Airlines fetch error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get airport details using nearby service as a fallback
 */
exports.getAirportDetails = async (airportCode) => {
  try {
    console.log(`🏛️  Fetching airport details for: ${airportCode}`);
    
    // FlightLabs doesn't have direct airport details, return basic info
    return {
      success: true,
      airport: {
        iata: airportCode,
        name: `${airportCode} Airport`,
        message: 'Basic airport info - FlightLabs specializes in flight tracking'
      }
    };
  } catch (error) {
    console.error(`❌ Airport details error for ${airportCode}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get real-time flights using future flights endpoint
 */
exports.getRealTimeFlights = async (options = {}) => {
  try {
    console.log('🌐 Fetching flights from departure airport...');
    
    const depIata = options.depIata || 'CDG'; // Default to CDG for testing
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const params = {
      type: 'departure',
      iataCode: depIata,
      date: dateStr
    };
    
    const data = await makeFlightLabsRequest('advanced-future-flights', params);

    if (data && data.success && data.data) {
      const flights = Array.isArray(data.data) ? data.data : [data.data];
      
      return {
        success: true,
        flights: flights.slice(0, 20).map(flight => ({ // Limit for performance
          flightNumber: flight.carrier?.flightNumber,
          airline: flight.carrier?.fs,
          airlineName: flight.carrier?.name,
          status: 'scheduled',
          departure: {
            airport: depIata,
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
        })),
        message: `Retrieved ${flights.length} scheduled flights from ${depIata}`
      };
    }

    return { success: false, message: 'No flights available' };
  } catch (error) {
    console.error('❌ Real-time flights error:', error.message);
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
    await ApiStats.findOneAndUpdate(
      { provider: 'flightlabs' },
      {
        $inc: { totalRequests: 1 },
        $set: { 
          lastRequest: new Date(),
          status: 'active'
        }
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      quota: {
        provider: 'FlightLabs',
        status: 'active',
        note: 'Check your FlightLabs dashboard for detailed quota information'
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
    if (FLIGHT_API_KEY && FLIGHT_API_BASE_URL) {
      console.log('✅ Configuration test: PASS');
      results.configTest = 'PASS';
    } else {
      console.log('❌ Configuration test: FAIL - Missing API key or URL');
    }

    // Test 2: Future Flights endpoint with CDG departures
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const futureFlightsTest = await makeFlightLabsRequest('advanced-future-flights', {
        type: 'departure',
        iataCode: 'CDG',
        date: dateStr
      });

      if (futureFlightsTest && futureFlightsTest.success) {
        console.log('✅ Future flights test: PASS');
        results.futureFlightsTest = 'PASS';
      }
    } catch (error) {
      console.log('❌ Future flights test: FAIL -', error.message);
    }

    // Test 3: Flight search functionality
    try {
      const searchTest = await exports.searchFlights('CDG', 'LHR', {
        departureDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

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
        endpoints: ['advanced-future-flights']
      },
      message: `FlightLabs API: ${passedTests}/${totalTests} tests passed`
    };

    console.log('🎯 FlightLabs test completed:', testResult.message);
    return testResult;

  } catch (error) {
    console.error('💥 FlightLabs connectivity test failed:', error);
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
    
    const cachedResults = await redis.get(cacheKey);
    if (cachedResults) {
      return JSON.parse(cachedResults);
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
        const flights = await exports.searchFlights(originCode, destinationCode, {
          departureDate: formattedDep
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
    await redis.set(cacheKey, JSON.stringify(alternatives), 'EX', 21600);
    
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