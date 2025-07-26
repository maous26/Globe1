const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth.middleware');
const flightService = require('../services/flight/flightService');
const airportService = require('../services/flight/airportService');

// Search flights
router.get('/search', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }
    
    const flights = await flightService.getFlights({
      dep_iata: origin,
      arr_iata: destination,
      date: departureDate,
      limit: 20
    });
    
    res.json(flights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get alternative dates
router.get('/alternatives', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, price } = req.query;
    
    if (!origin || !destination || !departureDate || !returnDate || !price) {
      return res.status(400).json({ 
        message: 'Origin, destination, departureDate, returnDate, and price are required' 
      });
    }
    
    const alternatives = await flightService.getAlternativeDates(
      origin, 
      destination, 
      departureDate, 
      returnDate, 
      parseFloat(price)
    );
    
    res.json(alternatives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check API quota
router.get('/quota', auth, async (req, res) => {
  try {
    const quota = await flightService.checkApiQuota();
    res.json(quota);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =============== NOUVEAUX ENDPOINTS POUR TESTER FlightLabs ===============

// Test endpoint - Get all airports
router.get('/test/airports', async (req, res) => {
  try {
    console.log('Testing FlightLabs airports endpoint...');
    const airports = await airportService.getAllAirports();
    
    res.json({
      success: true,
      message: 'FlightLabs airports API test successful',
      count: airports.length,
      sample: airports.slice(0, 10), // Premier 10 aéroports
      total: airports.length
    });
  } catch (error) {
    console.error('FlightLabs airports test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'FlightLabs airports API test failed',
      error: error.message
    });
  }
});

// Test endpoint - Search specific airport
router.get('/test/airport/:code', async (req, res) => {
  try {
    const { code } = req.params;
    console.log(`Testing FlightLabs airport search for: ${code}`);
    
    const airport = await airportService.getAirportDetails(code);
    
    if (airport) {
      res.json({
        success: true,
        message: `Airport ${code} found successfully`,
        data: airport
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Airport ${code} not found`
      });
    }
  } catch (error) {
    console.error(`FlightLabs airport search test failed for ${req.params.code}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'FlightLabs airport search test failed',
      error: error.message
    });
  }
});

// Test endpoint - Search flights (basic test)
router.get('/test/flights/:origin/:destination', async (req, res) => {
  try {
    const { origin, destination } = req.params;
    console.log(`Testing FlightLabs flight search: ${origin} -> ${destination}`);
    
    const flights = await flightService.getFlights({
      dep_iata: origin,
      arr_iata: destination,
      limit: 10
    });
    
    res.json({
      success: true,
      message: `Flight search ${origin} -> ${destination} successful`,
      count: flights.length,
      flights: flights.slice(0, 5), // Premier 5 vols
      total: flights.length
    });
  } catch (error) {
    console.error(`FlightLabs flight search test failed for ${req.params.origin}->${req.params.destination}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'FlightLabs flight search test failed',
      error: error.message,
      route: `${req.params.origin} -> ${req.params.destination}`
    });
  }
});

// Test endpoint - Get French airports
router.get('/test/airports/french', async (req, res) => {
  try {
    console.log('Testing FlightLabs French airports...');
    const airports = await airportService.getFrenchAirports();
    
    res.json({
      success: true,
      message: 'French airports retrieved successfully',
      count: airports.length,
      airports: airports
    });
  } catch (error) {
    console.error('FlightLabs French airports test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'FlightLabs French airports test failed',
      error: error.message
    });
  }
});

// Test endpoint - Airlines test
router.get('/test/airlines', async (req, res) => {
  try {
    console.log('Testing FlightLabs airlines endpoint...');
    const result = await flightService.getAirlines();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Airlines retrieved successfully',
        count: result.airlines.length,
        airlines: result.airlines.slice(0, 10), // First 10 airlines
        total_available: result.airlines.length
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch airlines',
        error: result.error || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('FlightLabs airlines test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch airlines',
      error: error.message
    });
  }
});

// Test endpoint - Full API test suite
router.get('/test/all', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    console.log('Starting complete FlightLabs API test suite...');
    
    // Test 1: API Configuration
    results.tests.push({
      name: 'API Configuration',
      status: process.env.FLIGHT_API_URL && process.env.FLIGHT_API_KEY ? 'PASS' : 'FAIL',
      details: {
        api_url_set: !!process.env.FLIGHT_API_URL,
        api_key_set: !!process.env.FLIGHT_API_KEY,
        api_url: process.env.FLIGHT_API_URL
      }
    });
    
    // Test 2: Airport Search
    try {
      const airportResult = await airportService.getAirportDetails('CDG');
      results.tests.push({
        name: 'Airport Search (CDG)',
        status: airportResult.success ? 'PASS' : 'FAIL',
        details: airportResult.success ? { 
          name: airportResult.airport?.name || 'CDG Airport', 
          found: true,
          message: airportResult.airport?.message 
        } : { found: false, error: airportResult.error }
      });
    } catch (error) {
      results.tests.push({
        name: 'Airport Search (CDG)',
        status: 'ERROR',
        error: error.message
      });
    }
    
    // Test 3: Flight Search
    try {
      // Utiliser une date future pour le test
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 jours dans le futur
      const dateStr = futureDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
      
      const flightResult = await flightService.searchFlights('CDG', 'LHR', dateStr);
      results.tests.push({
        name: 'Flight Search (CDG->LHR)',
        status: flightResult.success ? 'PASS' : 'FAIL',
        details: { 
          success: flightResult.success,
          flights_found: flightResult.flights?.length || 0,
          sample_price: flightResult.flights?.[0]?.price || 'N/A',
          error: flightResult.error || null
        }
      });
    } catch (error) {
      results.tests.push({
        name: 'Flight Search (CDG->LHR)',
        status: 'ERROR',
        error: error.message
      });
    }
    
    // Test 4: API Quota Check
    try {
      const quota = await flightService.checkApiQuota();
      results.tests.push({
        name: 'API Quota Check',
        status: 'PASS',
        details: quota
      });
    } catch (error) {
      results.tests.push({
        name: 'API Quota Check',
        status: 'ERROR',
        error: error.message
      });
    }
    
    // Summary
    const passedTests = results.tests.filter(t => t.status === 'PASS').length;
    const totalTests = results.tests.length;
    
    res.json({
      success: passedTests === totalTests,
      message: `FlightLabs API test suite completed: ${passedTests}/${totalTests} tests passed`,
      summary: {
        total_tests: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        success_rate: `${Math.round((passedTests / totalTests) * 100)}%`
      },
      results: results
    });
    
  } catch (error) {
    console.error('API test suite failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'API test suite failed',
      error: error.message,
      results: results
    });
  }
});

// ============================================
// AI TEST ENDPOINTS
// ============================================

const aiService = require('../services/ai/aiService');
const dealValidationService = require('../services/ai/dealValidationService');
const routeOptimizationService = require('../services/ai/routeOptimizationService');

// Test endpoint - Gemini Flash test
router.get('/ai/test/gemini', async (req, res) => {
  try {
    console.log('Testing Gemini Flash API...');
    
    const testPrompt = `You are a travel expert. Analyze this simple flight data and return a JSON response:
    
Flight: Paris CDG to New York JFK
Price: 450 EUR
Normal price: 600 EUR
Discount: 25%

Return a JSON object with:
{
  "isGoodDeal": true/false,
  "confidence": 0-100,
  "reason": "explanation"
}`;
    
    const result = await aiService.callGeminiFlash(testPrompt, {});
    
    res.json({
      success: true,
      message: 'Gemini Flash test successful',
      service: 'gemini-flash',
      result: result
    });
  } catch (error) {
    console.error('Gemini Flash test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gemini Flash test failed',
      service: 'gemini-flash',
      error: error.message
    });
  }
});

// Test endpoint - GPT-4o Mini test
router.get('/ai/test/gpt', async (req, res) => {
  try {
    console.log('Testing GPT-4o Mini API...');
    
    const testPrompt = `You are a travel expert. Analyze this simple flight data and return a JSON response:
    
Flight: Paris CDG to Barcelona BCN
Price: 89 EUR
Normal price: 150 EUR
Discount: 40%

Return a JSON object with:
{
  "isGoodDeal": true/false,
  "confidence": 0-100,
  "reason": "explanation"
}`;
    
    const result = await aiService.callGPT4oMini(testPrompt, {});
    
    res.json({
      success: true,
      message: 'GPT-4o Mini test successful',
      service: 'gpt-4o-mini',
      result: result
    });
  } catch (error) {
    console.error('GPT-4o Mini test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'GPT-4o Mini test failed',
      service: 'gpt-4o-mini',
      error: error.message
    });
  }
});

// Test endpoint - AI Route optimization test
router.get('/ai/test/route-optimization', async (req, res) => {
  try {
    console.log('Testing AI Route Optimization...');
    
    const result = await routeOptimizationService.optimizeRoutes({
      quota: 15000,
      isFullOptimization: false // Daily optimization
    });
    
    res.json({
      success: true,
      message: 'Route optimization test successful',
      service: 'route-optimization',
      result: result
    });
  } catch (error) {
    console.error('Route optimization test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Route optimization test failed',
      service: 'route-optimization',
      error: error.message
    });
  }
});

// Test endpoint - AI Deal validation test
router.get('/ai/test/deal-validation', async (req, res) => {
  try {
    console.log('Testing AI Deal Validation...');
    
    // Mock deal for testing
    const mockDeal = {
      departureAirport: { code: 'CDG', name: 'Paris Charles de Gaulle' },
      destinationAirport: { code: 'BCN', name: 'Barcelona' },
      airline: 'Vueling',
      price: 89,
      originalPrice: 150,
      discountPercentage: 40,
      discountAmount: 61,
      departureDate: '2025-08-15',
      returnDate: '2025-08-22',
      duration: 7,
      stops: 0,
      farePolicy: 'Basic Economy'
    };
    
    const isValid = await dealValidationService.validateDeal(mockDeal);
    const enrichedDeal = await dealValidationService.enrichDealWithContent(mockDeal);
    
    res.json({
      success: true,
      message: 'Deal validation test successful',
      service: 'deal-validation',
      results: {
        isValid: isValid,
        enrichedDeal: enrichedDeal
      }
    });
  } catch (error) {
    console.error('Deal validation test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Deal validation test failed',
      service: 'deal-validation',
      error: error.message
    });
  }
});

// Test endpoint - AI Quota check
router.get('/ai/test/quota', async (req, res) => {
  try {
    console.log('Testing AI Quota check...');
    
    const quotaInfo = await aiService.checkAIQuota();
    
    res.json({
      success: true,
      message: 'AI Quota check successful',
      service: 'quota-check',
      result: quotaInfo
    });
  } catch (error) {
    console.error('AI Quota check failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'AI Quota check failed',
      service: 'quota-check',
      error: error.message
    });
  }
});

// Test endpoint - Debug AI Environment Variables
router.get('/ai/test/debug', async (req, res) => {
  try {
    console.log('Testing AI Environment Variables...');
    
    res.json({
      success: true,
      message: 'AI Environment debug',
      service: 'debug',
      result: {
        GEMINI_API_ENDPOINT: process.env.GEMINI_API_ENDPOINT || 'undefined',
        GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY ? 'SET (length: ' + process.env.GOOGLE_AI_API_KEY.length + ')' : 'undefined',
        GPT_API_ENDPOINT: process.env.GPT_API_ENDPOINT || 'undefined',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'undefined'
      }
    });
  } catch (error) {
    console.error('AI Environment debug failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'AI Environment debug failed',
      service: 'debug',
      error: error.message
    });
  }
});

// Test endpoint - Complete AI test suite
router.get('/ai/test/all', async (req, res) => {
  const results = [];
  let passedTests = 0;
  let totalTests = 0;
  
  try {
    console.log('Starting complete AI test suite...');
    
    // Test 1: AI Quota Check
    try {
      const quotaResult = await aiService.checkAIQuota();
      results.push({
        name: 'AI Quota Check',
        status: 'PASS',
        details: quotaResult
      });
      passedTests++;
    } catch (error) {
      results.push({
        name: 'AI Quota Check',
        status: 'ERROR',
        error: error.message
      });
    }
    totalTests++;
    
    // Test 2: GPT-4o Mini Test
    try {
      const gptResult = await aiService.callGPT4oMini('Return JSON: {"test": "success", "service": "gpt-4o-mini"}', {});
      results.push({
        name: 'GPT-4o Mini API',
        status: gptResult.test === 'success' ? 'PASS' : 'FAIL',
        details: gptResult
      });
      if (gptResult.test === 'success') passedTests++;
    } catch (error) {
      results.push({
        name: 'GPT-4o Mini API',
        status: 'ERROR',
        error: error.message
      });
    }
    totalTests++;
    
    // Test 3: Gemini Flash Test
    try {
      const geminiResult = await aiService.callGeminiFlash('Return JSON: {"test": "success", "service": "gemini-flash"}', {});
      results.push({
        name: 'Gemini Flash API',
        status: geminiResult.test === 'success' ? 'PASS' : 'FAIL',
        details: geminiResult
      });
      if (geminiResult.test === 'success') passedTests++;
    } catch (error) {
      results.push({
        name: 'Gemini Flash API',
        status: 'ERROR',
        error: error.message
      });
    }
    totalTests++;
    
    // Test 4: Deal Validation Test
    try {
      const mockDeal = {
        departureAirport: { code: 'CDG' },
        destinationAirport: { code: 'BCN' },
        airline: 'Vueling',
        price: 89,
        originalPrice: 150,
        discountPercentage: 40
      };
      const isValid = await dealValidationService.validateDeal(mockDeal);
      results.push({
        name: 'Deal Validation',
        status: typeof isValid === 'boolean' ? 'PASS' : 'FAIL',
        details: { isValid: isValid }
      });
      if (typeof isValid === 'boolean') passedTests++;
    } catch (error) {
      results.push({
        name: 'Deal Validation',
        status: 'ERROR',
        error: error.message
      });
    }
    totalTests++;
    
    // Return complete test results
    res.json({
      success: true,
      message: 'AI test suite completed',
      service: 'ai-complete-suite',
      summary: {
        total_tests: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        success_rate: `${Math.round((passedTests / totalTests) * 100)}%`
      },
      results: results
    });
    
  } catch (error) {
    console.error('AI test suite failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'AI test suite failed',
      service: 'ai-complete-suite',
      error: error.message,
      results: results
    });
  }
});

// Test endpoint pour le processus complet d'alerte
router.get('/ai/test/complete-alert-process', async (req, res) => {
  try {
    console.log('Testing complete alert process with AI...');
    
    const Route = require('../models/route.model');
    const User = require('../models/user.model');
    const Alert = require('../models/alert.model');
    const { validateDeal } = require('../services/ai/dealValidationService');
    const { sendAlertEmail } = require('../services/email/emailService');
    
    // 1. Simuler la découverte d'un deal
    const mockDeal = {
      departureAirport: { code: 'CDG', name: 'Paris Charles de Gaulle' },
      destinationAirport: { code: 'BCN', name: 'Barcelona' },
      airline: 'Vueling',
      price: 89,
      originalPrice: 150,
      discountPercentage: 40,
      discountAmount: 61,
      departureDate: '2025-08-15',
      returnDate: '2025-08-22',
      duration: 7,
      stops: 0,
      farePolicy: 'Basic Economy',
      bookingLink: 'https://example.com/book'
    };
    
    console.log('1. Mock deal created:', mockDeal.departureAirport.code, 'to', mockDeal.destinationAirport.code);
    
    // 2. Validation du deal avec l'IA
    console.log('2. Validating deal with AI...');
    const validationResult = await validateDeal(mockDeal);
    console.log('Deal validation result:', validationResult);
    
    // 3. Rechercher un utilisateur test (ou en créer un temporaire)
    let testUser = await User.findOne({ email: 'alertes@globegenius.app' });
    
    if (!testUser) {
      console.log('3. Creating test user...');
      testUser = new User({
        email: 'alertes@globegenius.app',
        firstName: 'Test',
        lastName: 'User',
        password: 'temporaryPassword123!', // Mot de passe temporaire pour le test
        departureAirports: ['CDG'],
        subscriptionType: 'free',
        isEmailVerified: true
      });
      await testUser.save();
    } else {
      console.log('3. Using existing test user:', testUser.email);
    }
    
    // 4. Créer l'alerte en base de données
    console.log('4. Creating alert in database...');
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    
    const alert = new Alert({
      user: testUser._id,
      departureAirport: mockDeal.departureAirport,
      destinationAirport: mockDeal.destinationAirport,
      price: mockDeal.price,
      originalPrice: mockDeal.originalPrice,
      discountPercentage: mockDeal.discountPercentage,
      discountAmount: mockDeal.discountAmount,
      airline: mockDeal.airline,
      farePolicy: mockDeal.farePolicy,
      stops: mockDeal.stops,
      outboundDate: new Date(mockDeal.departureDate),
      returnDate: new Date(mockDeal.returnDate),
      duration: mockDeal.duration,
      bookingLink: mockDeal.bookingLink,
      expiryDate: expiryDate
    });
    
    await alert.save();
    console.log('Alert created with ID:', alert._id);
    
    // 5. Envoyer l'email d'alerte
    console.log('5. Sending alert email...');
    const emailResult = await sendAlertEmail(testUser, alert);
    console.log('Email sending result:', emailResult);
    
    // 6. Mettre à jour les statistiques utilisateur
    console.log('6. Updating user statistics...');
    await User.findByIdAndUpdate(testUser._id, {
      $inc: { totalPotentialSavings: mockDeal.discountAmount }
    });
    
    res.status(200).json({
      success: true,
      message: "Complete alert process test successful",
      service: "complete-alert-process",
      results: {
        dealCreated: true,
        aiValidation: validationResult,
        userFound: true,
        userEmail: testUser.email,
        alertId: alert._id,
        emailSent: emailResult,
        potentialSavings: mockDeal.discountAmount
      },
      processSteps: [
        '✅ 1. Mock deal created',
        `✅ 2. AI validation: ${validationResult?.isValid ? 'VALID' : 'INVALID'}`,
        '✅ 3. Test user found/created',
        '✅ 4. Alert saved to database',
        `✅ 5. Email ${emailResult ? 'sent successfully' : 'failed to send'}`,
        '✅ 6. User statistics updated'
      ]
    });
    
  } catch (error) {
    console.error('Error in complete alert process test:', error);
    res.status(500).json({
      success: false,
      message: "Complete alert process test failed",
      service: "complete-alert-process",
      error: error.message
    });
  }
});

module.exports = router; 