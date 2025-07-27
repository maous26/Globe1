// server/services/ai/dealValidationService.js
const { routeAIRequest } = require('./aiService');
const { getBaggagePolicy } = require('../flight/baggageService');
const dealReliabilityEngine = require('./dealReliabilityEngine');

/**
 * Validate a flight deal using AI with automatic learning from data patterns
 * @param {Object} deal - Flight deal to validate
 * @param {Object} routeContext - Context about the route (averagePrice, etc.)
 * @returns {Promise<Object>} - Validation result with reliability analysis
 */
exports.validateDeal = async (deal, routeContext = {}) => {
  try {
    console.log(`🔍 Validation deal: ${deal.airline} ${deal.departureAirport?.code}→${deal.destinationAirport?.code} - ${deal.price}€`);
    
    // 1. VALIDATION IA PRIORITAIRE (ML pas encore assez de données)
    console.log(`🤖 Validation IA prioritaire - ML en apprentissage passif`);
    
    // 2. VALIDATION TRADITIONNELLE AVEC POLITIQUE BAGAGES
    const baggagePolicy = await getBaggagePolicy(deal.airline);
    
    const validationPrompt = `
Expert en validation de deals de vol avec apprentissage automatique.

DEAL:
- ${deal.departureAirport?.code || 'Unknown'} → ${deal.destinationAirport?.code || 'Unknown'}
- Compagnie: ${deal.airline || 'Unknown'}
- Prix: ${deal.price || 0}€ (Réduction: ${deal.discountPercentage || 0}%)
- Date: ${deal.departureDate || 'Unknown'}

STRATÉGIE DE VALIDATION:
- Mode: IA PRIORITAIRE (ML insuffisamment entraîné)
- ML Status: Collecte de données en cours
- IA prend toutes les décisions de validation
- Données envoyées au ML pour apprentissage passif

POLITIQUE BAGAGES:
${baggagePolicy ? JSON.stringify(baggagePolicy, null, 2) : 'Non disponible'}

VALIDATION FINALE REQUISE:
En tant qu'expert IA, vous devez analyser ce deal COMPLÈTEMENT car le ML n'a pas encore assez de données.

Analysez:
1. Cohérence prix/distance (deal trop beau = suspect)
2. Fiabilité compagnie aérienne
3. Timing de l'offre (jour/heure optimal?)
4. Politique bagages (frais cachés?)
5. Disponibilité sièges vs prix
6. Patterns suspects (erreur de prix?)

RETOURNE ce JSON avec ANALYSE COMPLÈTE:
{
  "isValid": true/false,
  "confidence": 0-100,
  "reasoning": "Analyse IA complète - pourquoi accepter/rejeter",
  "valueRating": 1-10,
  "warnings": ["alertes importantes pour utilisateur"],
  "aiScore": 0-100,
  "recommendation": "ACCEPT" | "REJECT" | "REVIEW",
  "suspiciousFactors": ["facteurs suspects détectés"],
  "priceAnalysis": "Analyse du prix vs marché"
}
`;

    // 3. APPEL IA POUR VALIDATION PRIORITAIRE
    const validationResult = await routeAIRequest('deal-validation', validationPrompt, {
      dealData: JSON.stringify(deal),
      baggagePolicy: baggagePolicy ? JSON.stringify(baggagePolicy) : 'None'
    });

    // 4. IA PREND LA DÉCISION FINALE (ML en apprentissage passif)
    const aiScore = validationResult.confidence || 50;
    const isAccepted = (validationResult.isValid !== false) && aiScore >= 70; // Seuil IA : 70%

    console.log(`${isAccepted ? '✅' : '❌'} Deal ${isAccepted ? 'ACCEPTÉ' : 'REJETÉ'} par IA - Score: ${aiScore}% (Seuil: 70%)`);
    
    // 5. APPRENTISSAGE ML PASSIF (collecte données pour futur)
    try {
      const reliabilityAnalysis = await dealReliabilityEngine.analyzeDeal({
        departureCode: deal.departureAirport?.code,
        destinationCode: deal.destinationAirport?.code,
        airline: deal.airline,
        price: deal.price,
        discountPercentage: deal.discountPercentage,
        seatsAvailable: deal.seatsAvailable
      }, {
        routeId: routeContext.routeId,
        averagePrice: routeContext.averagePrice,
        aiDecision: isAccepted,
        aiScore: aiScore
      });
      console.log(`📚 Données ML collectées pour apprentissage (Score ML actuel: ${reliabilityAnalysis.reliabilityScore}%)`);
    } catch (mlError) {
      console.log(`⚠️ ML apprentissage passif échoué: ${mlError.message}`);
    }

    return {
      isValid: isAccepted,
      confidence: aiScore,
      aiScore: aiScore,
      reasoning: `IA PRIORITAIRE: ${validationResult.reasoning || 'Analyse IA standard'}`,
      warnings: [
        ...(validationResult.warnings || [])
      ],
      valueRating: validationResult.valueRating || Math.round(aiScore / 10),
      suspiciousFactors: validationResult.suspiciousFactors || [],
      priceAnalysis: validationResult.priceAnalysis || '',
      mode: 'AI_PRIORITY_ML_LEARNING',
      recommendation: validationResult.recommendation || (isAccepted ? 'ACCEPT' : 'REJECT')
    };
    
  } catch (error) {
    console.error('❌ Error validating deal:', error);
    
    // Fallback conservateur
    return {
      isValid: false,
      confidence: 30,
      aiScore: 30,
      reasoning: 'Erreur système de validation - Deal rejeté par sécurité',
      warnings: ['Système de validation temporairement indisponible'],
      valueRating: 3,
      error: error.message,
      mlEnhanced: false,
      recommendation: 'REJECT'
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
Tu es un expert IA en contenu voyage. Crée du contenu attractif pour ce deal de vol VALIDÉ:

Deal:
- De: {{departureName}} ({{departureCode}}) vers {{destinationName}} ({{destinationCode}})
- Compagnie: {{airline}} | Prix: {{price}} EUR
- Économie: {{discountPercentage}}% ({{discountAmount}} EUR)
- Voyage: {{departureDate}} → {{returnDate}} ({{duration}} jours)

Mission: Génère du contenu engageant basé sur la destination et l'opportunité FIABLE.

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
        headline: `Deal fiable vers ${deal.destinationAirport?.name || 'destination'}`,
        description: `Profitez de ${deal.discountPercentage || 30}% de réduction sur ce vol validé par notre IA.`,
        highlights: ['Prix vérifié', 'Deal fiable', 'Bonne compagnie', 'Timing optimal'],
        travelTips: 'Réservez rapidement, ce deal a été validé par notre système anti-fraude.',
        bestFor: ['Vacances', 'Découverte', 'Affaires'],
        urgencyFactor: 'Deal vérifié - Nombre de places limité'
      }
    };
  } catch (error) {
    console.error('❌ Error enriching deal:', error);
    // Return original deal with basic content if enrichment fails
    return {
      ...deal,
      content: {
        headline: `Vol vers ${deal.destinationAirport?.name || 'destination'} - Prix vérifié`,
        description: `Économisez ${deal.discountPercentage || 'jusqu\'à 30'}% sur ce vol validé par notre IA.`,
        highlights: ['Prix authentique', 'Deal contrôlé', 'Système anti-fraude', 'Qualité vérifiée'],
        travelTips: 'Comparez toujours les prix avant de réserver.',
        bestFor: ['Voyage d\'affaires', 'Loisirs', 'Famille'],
        urgencyFactor: 'Disponibilité limitée - Prix vérifié'
      }
    };
  }
};

/**
 * Feedback sur le résultat d'un deal pour apprentissage automatique
 * @param {String} analyticsId - ID de l'analyse pour apprentissage
 * @param {String} outcome - Résultat réel ('legitimate_deal', 'pricing_error', etc.)
 * @param {Array} evidence - Preuves collectées
 */
exports.reportDealOutcome = async (analyticsId, outcome, evidence = []) => {
  try {
    if (!analyticsId) return false;
    
    console.log(`📚 Feedback apprentissage: ${outcome} pour deal ${analyticsId}`);
    
    const success = await dealReliabilityEngine.learnFromOutcome(analyticsId, outcome, evidence);
    
    if (success) {
      console.log('✅ Apprentissage automatique mis à jour');
    }
    
    return success;
    
  } catch (error) {
    console.error('❌ Erreur feedback deal outcome:', error);
    return false;
  }
};

/**
 * Obtenir les statistiques du système d'apprentissage
 */
exports.getLearningStats = async () => {
  try {
    return await dealReliabilityEngine.getLearningStats();
  } catch (error) {
    console.error('❌ Erreur stats apprentissage:', error);
    return null;
  }
};