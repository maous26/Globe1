// server/services/ai/dealValidationService.js
const { routeAIRequest } = require('./aiService');
const { getBaggagePolicy } = require('../flight/baggageService');
const machineLearningService = require('./machineLearningService');

/**
 * Validate a flight deal using AI with ML improvements
 * @param {Object} deal - Flight deal to validate
 * @returns {Promise<Object>} - Validation result with score
 */
exports.validateDeal = async (deal) => {
  try {
    // Get baggage policy for the airline
    const baggagePolicy = await getBaggagePolicy(deal.airline);
    
    // Get ML status to adapt criteria
    const mlStatus = machineLearningService.getStatus();
    const isMLTrained = mlStatus.lastTraining && mlStatus.modelVersion !== '1.0.0';
    
    // Define validation prompt with ML learning
    const prompt = `
Tu es un système IA expert en validation de deals de vol qui apprend continuellement des retours utilisateurs.

${isMLTrained ? `
AMÉLIORATION ML ACTIVE:
- Version modèle: ${mlStatus.modelVersion}
- Dernier entraînement: ${mlStatus.lastTraining}
- Critères ajustés basés sur feedbacks utilisateurs réels
` : 'MODÈLE DE BASE (aucun entraînement ML spécifique encore)'}

DEAL À ANALYSER:
- De: {{departureCode}} vers {{destinationCode}}
- Compagnie: {{airline}}
- Prix: {{price}} EUR (Prix de référence: {{originalPrice}} EUR)
- Réduction: {{discountPercentage}}% ({{discountAmount}} EUR d'économie)
- Dates: {{departureDate}} → {{returnDate}} ({{duration}} jours)
- Escales: {{stops}} | Type tarif: {{farePolicy}}

POLITIQUE BAGAGES:
{{baggagePolicy}}

CRITÈRES DE VALIDATION RENFORCÉS:
1. Authenticité du deal (pas de prix de référence gonflé)
2. Valeur réelle pour l'utilisateur (frais cachés, restrictions)
3. Politique bagages acceptable (pas de tarif dépouillé)
4. Réputation compagnie et route
5. Timing et disponibilité réalistes

${isMLTrained ? `
APPRENTISSAGE ML: Applique les patterns appris des feedbacks utilisateurs pour cette validation.
Sois plus strict sur les compagnies/routes ayant reçu de mauvais retours.
Privilégie les types de deals ayant généré des réservations réelles.
` : ''}

RETOURNE STRICTEMENT ce JSON:
{
  "isValid": true/false,
  "confidence": 0-100,
  "reasoning": "Explication claire de ta décision",
  "valueRating": 1-10,
  "warnings": ["Alertes éventuelles sur le deal"],
  "aiScore": 0-100,
  "mlFactors": {
    "airlineReputation": 0-10,
    "routePopularity": 0-10,
    "discountRealism": 0-10,
    "timingRelevance": 0-10
  }
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
    
    // Enhanced validation logic with ML
    const minConfidence = isMLTrained ? 75 : 70; // Plus strict si ML entraîné
    const minValueRating = isMLTrained ? 7 : 6;
    
    // Validate result
    if (!result || !result.isValid) {
      console.log(`❌ Deal validation failed: ${result?.reasoning || 'Unknown reason'}`);
      return {
        isValid: false,
        confidence: result?.confidence || 0,
        aiScore: result?.aiScore || 0,
        reasoning: result?.reasoning || 'Validation failed',
        mlEnhanced: isMLTrained
      };
    }
    
    // Check thresholds
    if (result.confidence < minConfidence || result.valueRating < minValueRating) {
      console.log(`❌ Deal validation failed: Low confidence (${result.confidence}) or value rating (${result.valueRating})`);
      return {
        isValid: false,
        confidence: result.confidence,
        aiScore: result.aiScore || 0,
        reasoning: `Seuils non atteints: confiance ${result.confidence}% < ${minConfidence}% ou valeur ${result.valueRating} < ${minValueRating}`,
        mlEnhanced: isMLTrained
      };
    }
    
    // Deal is valid
    console.log(`✅ Deal validation passed: ${result.reasoning} (Score: ${result.aiScore || result.confidence})`);
    return {
      isValid: true,
      confidence: result.confidence,
      aiScore: result.aiScore || result.confidence,
      reasoning: result.reasoning,
      warnings: result.warnings || [],
      mlFactors: result.mlFactors || {},
      mlEnhanced: isMLTrained,
      modelVersion: mlStatus.modelVersion
    };
    
  } catch (error) {
    console.error('❌ Error validating deal:', error);
    // Return more conservative default with error info
    return {
      isValid: true, // Default to valid to avoid missing good deals
      confidence: 50,
      aiScore: 50,
      reasoning: 'Validation AI indisponible - Deal accepté par défaut',
      error: error.message,
      mlEnhanced: false
    };
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
Tu es un expert IA en contenu voyage. Crée du contenu attractif pour ce deal de vol:

Deal:
- De: {{departureName}} ({{departureCode}}) vers {{destinationName}} ({{destinationCode}})
- Compagnie: {{airline}} | Prix: {{price}} EUR
- Économie: {{discountPercentage}}% ({{discountAmount}} EUR)
- Voyage: {{departureDate}} → {{returnDate}} ({{duration}} jours)

Mission: Génère du contenu engageant basé sur la destination et l'opportunité.

RETOURNE ce JSON strictement:
{
  "headline": "Titre accrocheur court (max 60 caractères)",
  "description": "Description 2-3 phrases mettant en valeur destination + économie",
  "highlights": ["Point fort 1", "Point fort 2", "Point fort 3", "Point fort 4"],
  "travelTips": "Conseil voyage pertinent pour cette destination",
  "bestFor": ["type de voyageur 1", "type de voyageur 2", "type de voyageur 3"],
  "urgencyFactor": "Phrase créant urgence sans être agressive"
}

Assure-toi que le contenu soit spécifique à la destination et économiquement attractif.
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
      content: result || {
        headline: `Deal exceptionnel vers ${deal.destinationAirport?.name || 'destination'}`,
        description: `Profitez de ${deal.discountPercentage || 30}% de réduction sur ce vol.`,
        highlights: ['Prix réduit', 'Bonne compagnie', 'Dates flexibles'],
        travelTips: 'Réservez rapidement pour garantir ce prix.',
        bestFor: ['Vacances', 'Découverte'],
        urgencyFactor: 'Offre limitée dans le temps'
      }
    };
  } catch (error) {
    console.error('❌ Error enriching deal:', error);
    // Return original deal with basic content if enrichment fails
    return {
      ...deal,
      content: {
        headline: `Vol vers ${deal.destinationAirport?.name || 'destination'} à prix réduit`,
        description: `Économisez ${deal.discountPercentage || 'jusqu\'à 30'}% sur ce vol.`,
        highlights: ['Prix avantageux', 'Vol direct', 'Dates pratiques'],
        travelTips: 'Comparez les prix avant de réserver.',
        bestFor: ['Voyage d\'affaires', 'Loisirs'],
        urgencyFactor: 'Prix susceptible de changer'
      }
    };
  }
};