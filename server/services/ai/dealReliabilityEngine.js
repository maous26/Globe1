// server/services/ai/dealReliabilityEngine.js
const DealAnalytics = require('../../models/dealAnalytics.model');
const { routeAIRequest } = require('./aiService');
const { incrementApiCallStats } = require('../analytics/statsService');

class DealReliabilityEngine {
  constructor() {
    this.learningActive = true;
    this.suspiciousThresholds = {
      priceDropPercentage: 60, // >60% de réduction = suspect
      unusualTiming: true, // Deals détectés en dehors des créneaux optimaux
      priceVolatility: 0.3, // Variation >30% en peu de temps
      availabilityPattern: 0.1 // Disponibilité <10% = suspect
    };
  }

  /**
   * Analyser un deal détecté et calculer sa fiabilité
   */
  async analyzeDeal(dealData, routeContext) {
    try {
      console.log(`🔍 Analyse fiabilité deal: ${dealData.airline} ${dealData.departureCode}→${dealData.destinationCode}`);
      
      // 1. Analyse des patterns suspects
      const suspiciousFactors = await this.detectSuspiciousFactors(dealData, routeContext);
      
      // 2. Calcul du score de fiabilité basé sur l'historique
      const reliabilityScore = await this.calculateReliabilityScore(dealData, suspiciousFactors);
      
      // 3. Analyse IA du deal
      const aiAnalysis = await this.performAIAnalysis(dealData, suspiciousFactors, routeContext);
      
      // 4. Détermination du timing optimal
      const timePattern = this.analyzeTimePattern(dealData);
      
      // 5. Sauvegarde pour apprentissage
      const analytics = new DealAnalytics({
        routeId: routeContext.routeId,
        departureCode: dealData.departureCode,
        destinationCode: dealData.destinationCode,
        airline: dealData.airline,
        apiCallId: dealData.apiCallId || this.generateCallId(),
        detectedPrice: dealData.price,
        marketPrice: routeContext.averagePrice || 0,
        discountPercentage: dealData.discountPercentage,
        reliabilityScore,
        suspiciousFactors,
        timePattern,
        finalVerdict: {
          isLegitimate: aiAnalysis.isLegitimate,
          confidenceLevel: aiAnalysis.confidence,
          aiAnalysis: aiAnalysis.reasoning,
          lastUpdated: new Date()
        }
      });
      
      await analytics.save();
      
      console.log(`✅ Deal analysé - Fiabilité: ${reliabilityScore}% | Légitimité: ${aiAnalysis.isLegitimate ? 'OUI' : 'NON'}`);
      
      return {
        isReliable: reliabilityScore >= 70 && aiAnalysis.isLegitimate,
        reliabilityScore,
        confidence: aiAnalysis.confidence,
        reasoning: aiAnalysis.reasoning,
        warnings: suspiciousFactors.map(f => f.details),
        analyticsId: analytics._id
      };
      
    } catch (error) {
      console.error('❌ Erreur analyse fiabilité:', error);
      return {
        isReliable: false,
        reliabilityScore: 30,
        confidence: 30,
        reasoning: 'Erreur d\'analyse - Deal rejeté par sécurité',
        warnings: ['Système d\'analyse indisponible']
      };
    }
  }

  /**
   * Détecter les facteurs suspects dans un deal
   */
  async detectSuspiciousFactors(dealData, routeContext) {
    const factors = [];
    
    // 1. Prix anormalement bas
    if (dealData.discountPercentage > this.suspiciousThresholds.priceDropPercentage) {
      factors.push({
        factor: 'price_too_low',
        severity: Math.min(10, Math.floor(dealData.discountPercentage / 10)),
        details: `Réduction de ${dealData.discountPercentage}% (seuil: ${this.suspiciousThresholds.priceDropPercentage}%)`
      });
    }
    
    // 2. Timing inhabituel
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isOptimalTiming = this.isOptimalTiming(hour, dayOfWeek);
    
    if (!isOptimalTiming && dealData.discountPercentage > 40) {
      factors.push({
        factor: 'inconsistent_timing',
        severity: 6,
        details: `Deal majeur détecté hors créneau optimal (${hour}h, jour ${dayOfWeek})`
      });
    }
    
    // 3. Chute soudaine de prix (comparaison avec historique)
    if (routeContext.averagePrice && dealData.price < routeContext.averagePrice * 0.4) {
      factors.push({
        factor: 'sudden_price_drop',
        severity: 8,
        details: `Prix ${dealData.price}€ vs moyenne ${routeContext.averagePrice}€ (${Math.round((1 - dealData.price/routeContext.averagePrice) * 100)}% de baisse)`
      });
    }
    
    // 4. Analyse de disponibilité (si disponible)
    if (dealData.seatsAvailable && dealData.seatsAvailable < 3 && dealData.discountPercentage > 50) {
      factors.push({
        factor: 'unusual_availability',
        severity: 7,
        details: `Très peu de places (${dealData.seatsAvailable}) pour un deal exceptionnel`
      });
    }
    
    return factors;
  }

  /**
   * Calculer le score de fiabilité basé sur l'historique
   */
  async calculateReliabilityScore(dealData, suspiciousFactors) {
    try {
      // Score de base
      let score = 80;
      
      // Pénalités pour facteurs suspects
      suspiciousFactors.forEach(factor => {
        score -= (factor.severity * 3); // Chaque point de gravité = -3 points
      });
      
      // Bonus pour compagnies fiables (apprentissage automatique)
      const airlineReliability = await this.getAirlineReliability(dealData.airline);
      score += (airlineReliability - 50) * 0.4; // Bonus/malus selon historique
      
      // Bonus pour timing optimal
      const now = new Date();
      if (this.isOptimalTiming(now.getHours(), now.getDay())) {
        score += 10;
      }
      
      // Contraindre entre 0 et 100
      return Math.max(0, Math.min(100, Math.round(score)));
      
    } catch (error) {
      console.error('Erreur calcul score fiabilité:', error);
      return 50; // Score neutre en cas d'erreur
    }
  }

  /**
   * Analyse IA approfondie du deal
   */
  async performAIAnalysis(dealData, suspiciousFactors, routeContext) {
    try {
      await incrementApiCallStats('ai', 'deal-reliability');
      
      const prompt = `
Analyseur IA expert en détection d'erreurs de prix et deals frauduleux.

DEAL À ANALYSER:
- Route: ${dealData.departureCode} → ${dealData.destinationCode}
- Compagnie: ${dealData.airline}
- Prix détecté: ${dealData.price}€ 
- Prix marché: ${routeContext.averagePrice || 'Inconnu'}€
- Réduction: ${dealData.discountPercentage}%
- Timing: ${new Date().toLocaleString('fr-FR')}

FACTEURS SUSPECTS DÉTECTÉS:
${suspiciousFactors.length > 0 ? suspiciousFactors.map(f => `- ${f.factor}: ${f.details} (gravité: ${f.severity}/10)`).join('\n') : 'Aucun facteur suspect majeur'}

HISTORIQUE COMPAGNIE:
${dealData.airline} - Données d'apprentissage en cours de collecte

MISSION: Détermine si ce deal est LÉGITIME ou une ERREUR/FRAUDE.

Base ton analyse sur:
1. Cohérence du prix vs marché habituel
2. Patterns temporels (erreurs souvent détectées la nuit/weekend)  
3. Historique de la compagnie (low-cost vs premium)
4. Probabilité technique d'erreur système
5. Disponibilité et restrictions potentielles

RETOURNE UNIQUEMENT ce JSON:
{
  "isLegitimate": true/false,
  "confidence": 0-100,
  "reasoning": "Analyse détaillée de ta décision",
  "riskFactors": ["facteur1", "facteur2"],
  "recommendation": "ACCEPT" | "REJECT" | "VERIFY_MANUALLY"
}
`;

      const result = await routeAIRequest('deal-reliability', prompt, {
        dealData: JSON.stringify(dealData),
        suspiciousFactors: JSON.stringify(suspiciousFactors),
        routeContext: JSON.stringify(routeContext)
      });
      
      return {
        isLegitimate: result.isLegitimate || false,
        confidence: result.confidence || 50,
        reasoning: result.reasoning || 'Analyse IA non disponible',
        recommendation: result.recommendation || 'REJECT'
      };
      
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      return {
        isLegitimate: false,
        confidence: 30,
        reasoning: 'Erreur analyse IA - Deal rejeté par précaution',
        recommendation: 'REJECT'
      };
    }
  }

  /**
   * Analyser le pattern temporel du deal
   */
  analyzeTimePattern(dealData) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isOptimalTiming = this.isOptimalTiming(hour, dayOfWeek);
    
    // Score de timing basé sur ta stratégie
    let timingScore = 50;
    
    // Mardi = meilleur jour
    if (dayOfWeek === 2) timingScore += 20;
    else if ([3, 4].includes(dayOfWeek)) timingScore += 10; // Mercredi/Jeudi
    else if ([5, 6, 0].includes(dayOfWeek)) timingScore -= 15; // Weekend/Vendredi
    
    // Créneaux horaires optimaux
    if (hour >= 2 && hour <= 6) timingScore += 25; // Période magique
    else if (hour >= 6 && hour <= 10) timingScore += 15; // Matin optimal
    else if (hour >= 18 && hour <= 22) timingScore -= 10; // Pic activité
    
    return {
      detectedAt: now,
      dayOfWeek,
      hourOfDay: hour,
      isOptimalTiming,
      timingScore: Math.max(0, Math.min(100, timingScore))
    };
  }

  /**
   * Obtenir la fiabilité d'une compagnie aérienne
   */
  async getAirlineReliability(airline) {
    try {
      const stats = await DealAnalytics.aggregate([
        { $match: { airline, 'finalVerdict.isLegitimate': { $ne: null } } },
        { $group: {
          _id: null,
          totalDeals: { $sum: 1 },
          legitimateDeals: { $sum: { $cond: ['$finalVerdict.isLegitimate', 1, 0] } },
          avgReliability: { $avg: '$reliabilityScore' }
        }}
      ]);
      
      if (stats.length === 0) return 50; // Neutre pour nouvelles compagnies
      
      const stat = stats[0];
      const legitimacyRate = (stat.legitimateDeals / stat.totalDeals) * 100;
      
      // Combine taux de légitimité et score de fiabilité moyen
      return Math.round((legitimacyRate + stat.avgReliability) / 2);
      
    } catch (error) {
      console.error('Erreur récupération fiabilité compagnie:', error);
      return 50;
    }
  }

  /**
   * Déterminer si le timing est optimal selon ta stratégie
   */
  isOptimalTiming(hour, dayOfWeek) {
    // Mardi entre 2h-10h = période optimale
    if (dayOfWeek === 2 && hour >= 2 && hour <= 10) return true;
    
    // Mercredi/Jeudi matin = bon timing
    if ([3, 4].includes(dayOfWeek) && hour >= 6 && hour <= 10) return true;
    
    // Période magique générale (2h-6h) tous les jours sauf weekend
    if (hour >= 2 && hour <= 6 && ![0, 6].includes(dayOfWeek)) return true;
    
    return false;
  }

  /**
   * Apprendre des résultats pour améliorer les critères
   */
  async learnFromOutcome(analyticsId, actualOutcome, evidence = []) {
    try {
      const analytics = await DealAnalytics.findById(analyticsId);
      if (!analytics) return false;
      
      // Mettre à jour les données d'apprentissage
      analytics.learningData = {
        wasCorrectPrediction: analytics.finalVerdict.isLegitimate === (actualOutcome === 'legitimate_deal'),
        actualOutcome,
        evidenceCollected: evidence,
        improvementSuggestions: this.generateImprovementSuggestions(analytics, actualOutcome)
      };
      
      await analytics.save();
      
      // Ajuster les seuils si nécessaire
      if (this.learningActive) {
        await this.adjustThresholds(analytics, actualOutcome);
      }
      
      console.log(`📚 Apprentissage enregistré: ${actualOutcome} - Prédiction ${analytics.learningData.wasCorrectPrediction ? 'CORRECTE' : 'INCORRECTE'}`);
      return true;
      
    } catch (error) {
      console.error('Erreur apprentissage:', error);
      return false;
    }
  }

  /**
   * Générer des suggestions d'amélioration
   */
  generateImprovementSuggestions(analytics, actualOutcome) {
    const suggestions = [];
    
    if (actualOutcome === 'pricing_error' && analytics.finalVerdict.isLegitimate) {
      suggestions.push('Augmenter sensibilité détection prix anormalement bas');
      if (analytics.discountPercentage > 50) {
        suggestions.push('Réduire seuil acceptation réductions >50%');
      }
    }
    
    if (actualOutcome === 'legitimate_deal' && !analytics.finalVerdict.isLegitimate) {
      suggestions.push('Assouplir critères pour éviter faux négatifs');
      if (analytics.timePattern.isOptimalTiming) {
        suggestions.push('Donner plus de poids au timing optimal');
      }
    }
    
    return suggestions;
  }

  /**
   * Ajuster automatiquement les seuils basés sur l'apprentissage
   */
  async adjustThresholds(analytics, actualOutcome) {
    // Logique d'ajustement automatique des seuils
    // (Implémentation simplifiée)
    
    if (actualOutcome === 'pricing_error' && analytics.discountPercentage < this.suspiciousThresholds.priceDropPercentage) {
      // Réduire le seuil si on a raté une erreur de prix
      this.suspiciousThresholds.priceDropPercentage = Math.max(40, this.suspiciousThresholds.priceDropPercentage - 5);
      console.log(`🎯 Seuil ajusté: priceDropPercentage = ${this.suspiciousThresholds.priceDropPercentage}%`);
    }
  }

  generateCallId() {
    return `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtenir les statistiques d'apprentissage
   */
  async getLearningStats() {
    try {
      const stats = await DealAnalytics.aggregate([
        { $match: { 'learningData.actualOutcome': { $exists: true } } },
        { $group: {
          _id: '$learningData.actualOutcome',
          count: { $sum: 1 },
          correctPredictions: { $sum: { $cond: ['$learningData.wasCorrectPrediction', 1, 0] } },
          avgReliabilityScore: { $avg: '$reliabilityScore' }
        }}
      ]);
      
      const totalAnalyzed = await DealAnalytics.countDocuments();
      const withLearningData = stats.reduce((sum, s) => sum + s.count, 0);
      
      return {
        totalDealsAnalyzed: totalAnalyzed,
        dealsWithOutcome: withLearningData,
        learningRate: totalAnalyzed > 0 ? (withLearningData / totalAnalyzed * 100).toFixed(1) : 0,
        outcomeBreakdown: stats,
        currentThresholds: this.suspiciousThresholds
      };
      
    } catch (error) {
      console.error('Erreur stats apprentissage:', error);
      return null;
    }
  }
}

module.exports = new DealReliabilityEngine(); 