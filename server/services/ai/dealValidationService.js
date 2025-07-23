// server/services/ai/dealValidationService.js
const { routeAIRequest } = require('./aiService');
const { getBaggagePolicy } = require('../flight/baggageService');

/**
 * Validate a flight deal using AI
 * @param {Object} deal - Flight deal to validate
 * @returns {Promise<boolean>} - Whether the deal is valid
 */
exports.validateDeal = async (deal) => {
  try {
    // Get baggage policy for the airline
    const baggagePolicy = await getBaggagePolicy(deal.airline);
    
    // Define validation prompt
    const prompt = `
You are an AI expert in flight pricing and deals. You need to validate whether the following flight deal is legitimate and represents actual value for users.

Flight Deal:
- From: {{departureCode}}
- To: {{destinationCode}}
- Airline: {{airline}}
- Price: {{price}} EUR
- Original Price (estimated baseline): {{originalPrice}} EUR
- Discount: {{discountPercentage}}% ({{discountAmount}} EUR)
- Outbound Date: {{departureDate}}
- Return Date: {{returnDate}}
- Duration: {{duration}} days
- Stops: {{stops}}
- Fare Policy: {{farePolicy}}

Baggage Policy:
{{baggagePolicy}}

Please analyze this deal and determine if it's:
1. A genuine good deal (not artificially inflated "original price")
2. Worth notifying users about
3. Free of deceptive pricing tactics or hidden fees that would negate the discount
4. Available with reasonable baggage allowance (not a bare fare requiring expensive add-ons)

IMPORTANT: Return ONLY a JSON object with the following structure:
{
  "isValid": true/false,
  "confidence": 0-100,
  "reasoning": "Brief explanation of your decision",
  "valueRating": 1-10,
  "warnings": ["Any warnings about the deal"]
}
`;

    // Call AI for validation
    const result = await routeAIRequest('deal-validation', prompt, {
      departureCode: deal.departureAirport?.code || 'Unknown',
      destinationCode: deal.destinationAirport?.code || 'Unknown',
      airline: deal.airline || 'Unknown',
      price: deal.price || 0,
      originalPrice: deal.originalPrice || 0,
      discountPercentage: deal.discountPercentage || 0,
      discountAmount: deal.discountAmount || 0,
      departureDate: deal.departureDate || 'Unknown',
      returnDate: deal.returnDate || 'Unknown',
      duration: deal.duration || 0,
      stops: deal.stops || 0,
      farePolicy: deal.farePolicy || 'Unknown',
      baggagePolicy: baggagePolicy ? JSON.stringify(baggagePolicy, null, 2) : 'Unknown'
    });
    
    // If validation failed or result is invalid, return false
    if (!result || !result.isValid) {
      console.log(`Deal validation failed: ${result?.reasoning || 'Unknown reason'}`);
      return false;
    }
    
    // Check confidence and value rating
    if (result.confidence < 70 || result.valueRating < 6) {
      console.log(`Deal validation failed: Low confidence (${result.confidence}) or value rating (${result.valueRating})`);
      return false;
    }
    
    // Deal is valid
    console.log(`Deal validation passed: ${result.reasoning}`);
    return true;
  } catch (error) {
    console.error('Error validating deal:', error);
    // Default to valid in case of error to avoid missing good deals
    return true;
  }
};

/**
 * Enrich a flight deal with additional information using AI
 * @param {Object} deal - Flight deal to enrich
 * @returns {Promise<Object>} - Enriched deal
 */
exports.enrichDealWithContent = async (deal) => {
  try {
    // Define enrichment prompt
    const prompt = `
You are an AI travel expert. Enhance the following flight deal with engaging content to make it more appealing to users:

Flight Deal:
- From: {{departureName}} ({{departureCode}})
- To: {{destinationName}} ({{destinationCode}})
- Airline: {{airline}}
- Price: {{price}} EUR
- Discount: {{discountPercentage}}% ({{discountAmount}} EUR)
- Travel Dates: {{departureDate}} to {{returnDate}} ({{duration}} days)

Generate personalized content to make this deal more attractive. Return ONLY a JSON object with the following structure:
{
  "headline": "Short, catchy headline for the deal",
  "description": "Brief 2-3 sentence description highlighting value and destination appeal",
  "highlights": ["3-4 bullet points about the destination or deal"],
  "travelTips": "Brief travel tip relevant to this destination",
  "bestFor": ["weekend getaway", "family trip", "cultural exploration"]
}

Keep all text concise, engaging, and focused on the specific destination and deal.
`;

    // Call AI for enrichment
    const result = await routeAIRequest('content-generation', prompt, {
      departureName: deal.departureAirport?.name || 'Unknown',
      departureCode: deal.departureAirport?.code || 'Unknown',
      destinationName: deal.destinationAirport?.name || 'Unknown',
      destinationCode: deal.destinationAirport?.code || 'Unknown',
      airline: deal.airline || 'Unknown',
      price: deal.price || 0,
      discountPercentage: deal.discountPercentage || 0,
      discountAmount: deal.discountAmount || 0,
      departureDate: deal.departureDate || 'Unknown',
      returnDate: deal.returnDate || 'Unknown',
      duration: deal.duration || 0
    });
    
    // Return enriched deal
    return {
      ...deal,
      content: result
    };
  } catch (error) {
    console.error('Error enriching deal:', error);
    // Return original deal if enrichment fails
    return deal;
  }
};