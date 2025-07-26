// server/services/ai/smartRouteOptimizerAgent.js
const Route = require('../../models/route.model');
const Alert = require('../../models/alert.model');
const { aiService } = require('./aiService');
const cron = require('node-cron');

class SmartRouteOptimizerAgent {
  constructor() {
    this.isRunning = false;
    this.lastOptimization = null;
    this.maxMonthlyCallsTarget = 26000; // 26K pour garder une marge de sécurité sur 30K
  }

  /**
   * Démarrage de l'agent avec planification automatique
   */
  start() {
    console.log('🤖 Démarrage de l\'Agent IA d\'Optimisation des Routes');
    
    // Analyse trimestrielle le 1er de chaque trimestre à 02:00
    // Janvier, Avril, Juillet, Octobre
    cron.schedule('0 2 1 1,4,7,10 *', () => {
      console.log('📅 Analyse IA trimestrielle déclenchée');
      this.performQuarterlyAnalysis();
    });

    // Optimisation légère mensuelle le 15 de chaque mois à 03:00 (pour ajustements mineurs)
    cron.schedule('0 3 15 * *', () => {
      console.log('📅 Optimisation IA mensuelle légère déclenchée');
      this.performMonthlyLightOptimization();
    });

    console.log('✅ Agent IA planifié: 1er trimestre 02:00 (analyse complète) + 15 du mois 03:00 (ajustements)');
  }

  /**
   * Analyse complète des performances des routes
   */
  async analyzeRoutePerformances() {
    try {
      console.log('📊 Analyse IA des performances des routes...');

      // Récupérer toutes les routes avec leurs stats
      const routes = await Route.find({ isActive: true }).lean();
      
      // Analyser les alertes générées par route dans les 30 derniers jours
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const alertStats = await Alert.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              dep: '$departureAirport.code',
              dest: '$destinationAirport.code'
            },
            alertCount: { $sum: 1 },
            avgDiscount: { $avg: '$discountPercentage' },
            totalSavings: { $sum: '$discountAmount' },
            lastAlert: { $max: '$createdAt' }
          }
        }
      ]);

      // Enrichir les routes avec les données d'alertes
      const enrichedRoutes = routes.map(route => {
        const alertData = alertStats.find(alert => 
          alert._id.dep === route.departureAirport.code && 
          alert._id.dest === route.destinationAirport.code
        ) || { alertCount: 0, avgDiscount: 0, totalSavings: 0 };

        // Calcul du score de performance IA
        const performanceScore = this.calculatePerformanceScore(route, alertData);
        
        return {
          ...route,
          alertsGenerated: alertData.alertCount,
          avgDiscount: alertData.avgDiscount,
          totalSavings: alertData.totalSavings,
          lastAlert: alertData.lastAlert,
          performanceScore: performanceScore,
          callsPerMonth: this.estimateMonthlyCallsForRoute(route),
          roi: this.calculateROI(route, alertData)
        };
      });

      return enrichedRoutes.sort((a, b) => b.performanceScore - a.performanceScore);

    } catch (error) {
      console.error('❌ Erreur analyse performances:', error);
      return [];
    }
  }

  /**
   * Calcul intelligent du score de performance avec IA
   */
  calculatePerformanceScore(route, alertData) {
    // Facteurs de performance pondérés
    const successRate = route.totalScans > 0 ? (route.totalDealsFound / route.totalScans) : 0;
    const alertFrequency = alertData.alertCount || 0;
    const avgDiscount = alertData.avgDiscount || 0;
    const totalSavings = alertData.totalSavings || 0;
    
    // Pénalité pour les routes inactives récemment
    const daysSinceLastScan = route.lastScannedAt ? 
      (Date.now() - new Date(route.lastScannedAt)) / (1000 * 60 * 60 * 24) : 999;
    const recencyFactor = Math.max(0, 1 - (daysSinceLastScan / 30));

    // Score pondéré intelligent
    const score = (
      successRate * 30 +           // 30% - Taux de succès des scans
      alertFrequency * 25 +        // 25% - Nombre d'alertes générées
      (avgDiscount / 100) * 20 +   // 20% - Qualité des réductions trouvées
      (totalSavings / 1000) * 15 + // 15% - Économies totales générées
      recencyFactor * 10           // 10% - Activité récente
    );

    return Math.round(score * 100) / 100;
  }

  /**
   * Estimation des calls mensuels pour une route
   */
  estimateMonthlyCallsForRoute(route) {
    // Utilise la stratégie timing optimal que nous avons implémentée
    const baseCallsPerDay = {
      'ultra-priority': 862 * (66/126), // Proportion des ultra-priority
      'priority': 862 * (60/126),       // Proportion des priority
      'complementary': 862 * (0/126)    // Plus de complementary actives
    }[route.tier] || 20;

    return Math.round(baseCallsPerDay * 30);
  }

  /**
   * Calcul du ROI (Return on Investment)
   */
  calculateROI(route, alertData) {
    const callCost = 0.01; // 1 centime par call (estimation)
    const monthlyCalls = this.estimateMonthlyCallsForRoute(route);
    const monthlyCost = monthlyCalls * callCost;
    const monthlySavings = (alertData.totalSavings || 0) * 12; // Annualiser les économies

    return monthlyCost > 0 ? (monthlySavings / monthlyCost) : 0;
  }

  /**
   * Identification des routes sous-performantes
   */
  identifyUnderperformingRoutes(enrichedRoutes, targetReduction = 0) {
    // Seuils pour identifier les routes sous-performantes
    const thresholds = {
      minPerformanceScore: 5,    // Score minimum
      maxDaysSinceLastAlert: 15, // Maximum de jours sans alerte
      minROI: 0.1,              // ROI minimum de 10%
      minAlertsPerMonth: 1       // Minimum 1 alerte par mois
    };

    const underperforming = enrichedRoutes.filter(route => {
      const daysSinceLastAlert = route.lastAlert ? 
        (Date.now() - new Date(route.lastAlert)) / (1000 * 60 * 60 * 24) : 999;

      return (
        route.performanceScore < thresholds.minPerformanceScore ||
        daysSinceLastAlert > thresholds.maxDaysSinceLastAlert ||
        route.roi < thresholds.minROI ||
        route.alertsGenerated < thresholds.minAlertsPerMonth
      );
    });

    console.log(`📉 Routes sous-performantes identifiées: ${underperforming.length}`);
    
    // Si on a besoin de réduire davantage pour respecter le budget
    if (targetReduction > 0) {
      return underperforming
        .sort((a, b) => a.performanceScore - b.performanceScore) // Pires en premier
        .slice(0, targetReduction);
    }

    return underperforming;
  }

  /**
   * Génération IA de nouvelles routes candidates
   */
  async generateNewRouteCandidates(replacementCount) {
    try {
      console.log(`🤖 Génération IA de ${replacementCount} nouvelles routes candidates...`);

      // Analyser les tendances actuelles
      const currentTopRoutes = await Route.find({ isActive: true })
        .sort({ totalDealsFound: -1 })
        .limit(10)
        .lean();

      // Prompt IA pour générer de nouvelles routes prometteuses
      const aiPrompt = `
Analyse les routes de vol les plus performantes et génère ${replacementCount} nouvelles routes prometteuses.

Routes actuelles top performers:
${currentTopRoutes.map(r => `${r.departureAirport.code}-${r.destinationAirport.code} (${r.totalDealsFound} deals, ${r.tier})`).join('\n')}

Critères pour les nouvelles routes:
- Focus destinations européennes populaires depuis CDG/ORY
- Éviter les routes domestiques françaises
- Privilégier les destinations avec forte saisonnalité
- Considérer les nouvelles destinations tendance
- Routes long-courrier vers destinations émergentes

Période actuelle: ${new Date().toISOString().split('T')[0]}
Saison: ${this.getCurrentSeason()}

Réponds au format JSON strict:
{
  "newRoutes": [
    {
      "departure": "CDG",
      "destination": "BCN", 
      "destinationName": "Barcelone",
      "tier": "priority",
      "reasoning": "Destination très populaire avec forte demande",
      "expectedPerformance": 8.5,
      "isSeasonal": false
    }
  ]
}`;

      const aiResponse = await aiService.generateCompletion(aiPrompt, {
        maxTokens: 1500,
        temperature: 0.7
      });

      const newRoutes = this.parseAIRouteResponse(aiResponse);
      console.log(`✅ ${newRoutes.length} nouvelles routes générées par IA`);
      
      return newRoutes;

    } catch (error) {
      console.error('❌ Erreur génération IA routes:', error);
      return this.getFallbackRoutes(replacementCount);
    }
  }

  /**
   * Parse la réponse IA et valide les routes
   */
  parseAIRouteResponse(aiResponse) {
    try {
      const parsed = JSON.parse(aiResponse);
      
      return parsed.newRoutes.map(route => ({
        departureAirport: {
          code: route.departure,
          name: this.getAirportName(route.departure)
        },
        destinationAirport: {
          code: route.destination,
          name: route.destinationName
        },
        tier: route.tier,
        reasoning: route.reasoning,
        expectedPerformance: route.expectedPerformance,
        isSeasonal: route.isSeasonal || false,
        isActive: true,
        totalScans: 0,
        totalDealsFound: 0
      }));

    } catch (error) {
      console.warn('⚠️  Erreur parsing réponse IA, utilisation fallback');
      return this.getFallbackRoutes(3);
    }
  }

  /**
   * Routes de fallback en cas d'erreur IA
   */
  getFallbackRoutes(count) {
    const fallbackRoutes = [
      { dep: 'CDG', dest: 'IST', destName: 'Istanbul', tier: 'priority' },
      { dep: 'ORY', dest: 'VIE', destName: 'Vienne', tier: 'priority' },
      { dep: 'CDG', dest: 'PRG', destName: 'Prague', tier: 'priority' },
      { dep: 'ORY', dest: 'BUD', destName: 'Budapest', tier: 'priority' },
      { dep: 'CDG', dest: 'WAW', destName: 'Varsovie', tier: 'priority' }
    ];

    return fallbackRoutes.slice(0, count).map(route => ({
      departureAirport: { code: route.dep, name: this.getAirportName(route.dep) },
      destinationAirport: { code: route.dest, name: route.destName },
      tier: route.tier,
      reasoning: 'Route générée automatiquement - fallback',
      expectedPerformance: 7.0,
      isSeasonal: false,
      isActive: true,
      totalScans: 0,
      totalDealsFound: 0
    }));
  }

  /**
   * Analyse trimestrielle complète automatique
   */
  async performQuarterlyAnalysis() {
    if (this.isRunning) {
      console.log('⚠️  Analyse déjà en cours, skip');
      return;
    }

    this.isRunning = true;
    
    try {
      console.log('🔄 Analyse IA trimestrielle démarrée...');
      console.log('📊 Période d\'analyse: 3 derniers mois');

      // 1. Analyser les performances sur 3 mois
      const enrichedRoutes = await this.analyzeQuarterlyPerformances();
      
      // 2. Vérifier le budget mensuel
      const totalMonthlyCalls = enrichedRoutes.reduce((sum, route) => sum + route.callsPerMonth, 0);
      
      console.log(`💰 Estimation calls mensuels actuels: ${totalMonthlyCalls.toLocaleString()}`);
      console.log(`🎯 Target maximum: ${this.maxMonthlyCallsTarget.toLocaleString()}`);

      // 3. Analyse approfondie pour remplacement si nécessaire
      const quarterlyReport = await this.generateQuarterlyReport(enrichedRoutes);
      console.log(`📈 Rapport trimestriel généré: ${quarterlyReport.summary}`);

      // 4. Identifier les routes à remplacer (plus strict en analyse trimestrielle)
      const callsOverBudget = Math.max(0, totalMonthlyCalls - this.maxMonthlyCallsTarget);
      const routesToReplace = Math.ceil(callsOverBudget / 700); // Estimation 700 calls par route

      if (routesToReplace > 0 || enrichedRoutes.some(r => r.performanceScore < 2)) {
        console.log(`🔄 Remplacement de ${routesToReplace} routes identifiées`);
        await this.performRouteReplacement(enrichedRoutes, routesToReplace);
      } else {
        console.log('✅ Aucune optimisation majeure nécessaire ce trimestre');
      }

      // 5. Sauvegarder le rapport trimestriel
      await this.saveQuarterlyReport(quarterlyReport);

      this.lastOptimization = new Date();
      console.log('✅ Analyse trimestrielle terminée');

    } catch (error) {
      console.error('❌ Erreur analyse trimestrielle:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Optimisation mensuelle légère (ajustements mineurs uniquement)
   */
  async performMonthlyLightOptimization() {
    if (this.isRunning) {
      console.log('⚠️  Analyse déjà en cours, skip');
      return;
    }

    try {
      console.log('🔄 Optimisation mensuelle légère...');

      // Analyse rapide sur le mois écoulé seulement
      const routes = await this.analyzeRoutePerformances();
      
      // Seulement des ajustements mineurs (pas de remplacement majeur)
      const urgentIssues = routes.filter(r => r.performanceScore < 1 || r.alertsGenerated === 0);
      
      if (urgentIssues.length > 0) {
        console.log(`⚠️  ${urgentIssues.length} routes nécessitent attention urgente`);
        // Juste désactiver temporairement les routes problématiques
        for (const route of urgentIssues.slice(0, 3)) { // Max 3 ajustements par mois
          await Route.findByIdAndUpdate(route._id, {
            isActive: false,
            deactivatedReason: `Pause mensuelle - Performance critique: ${route.performanceScore}`,
            temporaryDeactivation: true,
            reactivationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
          });
          console.log(`⏸️  Route ${route.departureAirport.code}-${route.destinationAirport.code} mise en pause`);
        }
      } else {
        console.log('✅ Aucun ajustement nécessaire ce mois');
      }

    } catch (error) {
      console.error('❌ Erreur optimisation mensuelle:', error);
    }
  }

  /**
   * Analyser les performances sur 3 mois (trimestriel)
   */
  async analyzeQuarterlyPerformances() {
    try {
      console.log('📊 Analyse IA des performances trimestrielles...');

      // Récupérer toutes les routes avec leurs stats
      const routes = await Route.find({ isActive: true }).lean();
      
      // Analyser les alertes générées par route dans les 90 derniers jours
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const alertStats = await Alert.aggregate([
        {
          $match: {
            createdAt: { $gte: ninetyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              dep: '$departureAirport.code',
              dest: '$destinationAirport.code'
            },
            alertCount: { $sum: 1 },
            avgDiscount: { $avg: '$discountPercentage' },
            totalSavings: { $sum: '$discountAmount' },
            lastAlert: { $max: '$createdAt' },
            // Statistiques trimestrielles
            monthlyDistribution: {
              $push: {
                month: { $month: '$createdAt' },
                discount: '$discountPercentage'
              }
            }
          }
        }
      ]);

      // Enrichir les routes avec les données d'alertes trimestrielles
      const enrichedRoutes = routes.map(route => {
        const alertData = alertStats.find(alert => 
          alert._id.dep === route.departureAirport.code && 
          alert._id.dest === route.destinationAirport.code
        ) || { alertCount: 0, avgDiscount: 0, totalSavings: 0 };

        // Calcul du score de performance trimestriel (plus strict)
        const performanceScore = this.calculateQuarterlyPerformanceScore(route, alertData);
        
        return {
          ...route,
          alertsGenerated: alertData.alertCount,
          avgDiscount: alertData.avgDiscount,
          totalSavings: alertData.totalSavings,
          lastAlert: alertData.lastAlert,
          monthlyDistribution: alertData.monthlyDistribution || [],
          performanceScore: performanceScore,
          callsPerMonth: this.estimateMonthlyCallsForRoute(route),
          roi: this.calculateROI(route, alertData),
          quarterlyTrend: this.calculateQuarterlyTrend(alertData.monthlyDistribution)
        };
      });

      return enrichedRoutes.sort((a, b) => b.performanceScore - a.performanceScore);

    } catch (error) {
      console.error('❌ Erreur analyse performances trimestrielles:', error);
      return [];
    }
  }

  /**
   * Calcul du score de performance trimestriel (plus exigeant)
   */
  calculateQuarterlyPerformanceScore(route, alertData) {
    const successRate = route.totalScans > 0 ? (route.totalDealsFound / route.totalScans) : 0;
    const alertFrequency = alertData.alertCount || 0;
    const avgDiscount = alertData.avgDiscount || 0;
    const totalSavings = alertData.totalSavings || 0;
    
    // Pénalité plus stricte pour les routes inactives
    const daysSinceLastScan = route.lastScannedAt ? 
      (Date.now() - new Date(route.lastScannedAt)) / (1000 * 60 * 60 * 24) : 999;
    const recencyFactor = Math.max(0, 1 - (daysSinceLastScan / 90)); // Sur 90 jours

    // Score trimestriel plus exigeant (seuils plus élevés)
    const score = (
      successRate * 35 +           // 35% - Taux de succès des scans
      (alertFrequency / 3) * 30 +  // 30% - Nombre d'alertes (divisé par 3 pour trimestre)
      (avgDiscount / 100) * 20 +   // 20% - Qualité des réductions trouvées
      (totalSavings / 3000) * 10 + // 10% - Économies totales (seuil plus élevé)
      recencyFactor * 5            // 5% - Activité récente
    );

    return Math.round(score * 100) / 100;
  }

  /**
   * Calculer la tendance trimestrielle
   */
  calculateQuarterlyTrend(monthlyDistribution) {
    if (!monthlyDistribution || monthlyDistribution.length < 2) {
      return 'stable';
    }

    const months = monthlyDistribution.map(d => d.month).sort();
    const first = monthlyDistribution.filter(d => d.month === months[0]);
    const last = monthlyDistribution.filter(d => d.month === months[months.length - 1]);

    if (last.length > first.length) return 'croissante';
    if (last.length < first.length) return 'décroissante';
    return 'stable';
  }

  /**
   * Générer un rapport trimestriel détaillé
   */
  async generateQuarterlyReport(enrichedRoutes) {
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    const currentYear = new Date().getFullYear();

    const report = {
      quarter: `Q${currentQuarter} ${currentYear}`,
      generatedAt: new Date(),
      summary: {
        totalRoutes: enrichedRoutes.length,
        totalMonthlyCalls: enrichedRoutes.reduce((sum, r) => sum + r.callsPerMonth, 0),
        budgetUtilization: 0,
        topPerformers: enrichedRoutes.slice(0, 10),
        underPerformers: enrichedRoutes.filter(r => r.performanceScore < 3),
        trends: {
          growing: enrichedRoutes.filter(r => r.quarterlyTrend === 'croissante').length,
          declining: enrichedRoutes.filter(r => r.quarterlyTrend === 'décroissante').length,
          stable: enrichedRoutes.filter(r => r.quarterlyTrend === 'stable').length
        }
      },
      recommendations: this.generateQuarterlyRecommendations(enrichedRoutes)
    };

    report.summary.budgetUtilization = (report.summary.totalMonthlyCalls / this.maxMonthlyCallsTarget * 100).toFixed(1);

    return report;
  }

  /**
   * Générer des recommandations trimestrielles
   */
  generateQuarterlyRecommendations(routes) {
    const recommendations = [];

    // Routes en croissance
    const growingRoutes = routes.filter(r => r.quarterlyTrend === 'croissante' && r.performanceScore > 7);
    if (growingRoutes.length > 0) {
      recommendations.push({
        type: 'upgrade',
        message: `${growingRoutes.length} routes montrent une croissance excellente - considérer upgrade vers tier supérieur`,
        routes: growingRoutes.slice(0, 5).map(r => `${r.departureAirport.code}-${r.destinationAirport.code}`)
      });
    }

    // Routes en déclin
    const decliningRoutes = routes.filter(r => r.quarterlyTrend === 'décroissante' && r.performanceScore < 4);
    if (decliningRoutes.length > 0) {
      recommendations.push({
        type: 'review',
        message: `${decliningRoutes.length} routes en déclin nécessitent révision ou remplacement`,
        routes: decliningRoutes.slice(0, 5).map(r => `${r.departureAirport.code}-${r.destinationAirport.code}`)
      });
    }

    // Budget
    const totalCalls = routes.reduce((sum, r) => sum + r.callsPerMonth, 0);
    if (totalCalls > this.maxMonthlyCallsTarget * 0.9) {
      recommendations.push({
        type: 'budget',
        message: `Utilisation budget à ${(totalCalls/this.maxMonthlyCallsTarget*100).toFixed(1)}% - optimisation nécessaire`
      });
    }

    return recommendations;
  }

  /**
   * Sauvegarder le rapport trimestriel en base
   */
  async saveQuarterlyReport(report) {
    try {
      // Créer un modèle simple pour stocker les rapports (on pourrait créer un modèle dédié)
      const Route = require('../../models/route.model');
      
      // Pour l'instant, on log juste le rapport (tu pourrais créer un modèle QuarterlyReport)
      console.log('📊 RAPPORT TRIMESTRIEL SAUVEGARDÉ:', {
        quarter: report.quarter,
        routes: report.summary.totalRoutes,
        budget: report.summary.budgetUtilization + '%',
        recommandations: report.recommendations.length
      });

      // TODO: Créer un modèle QuarterlyReport si tu veux persister en DB
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde rapport:', error);
    }
  }

  /**
   * Remplacement intelligent des routes
   */
  async performRouteReplacement(enrichedRoutes, targetCount) {
    try {
      console.log(`🔄 Remplacement de ${targetCount} routes sous-performantes...`);

      // Identifier les routes à remplacer
      const routesToReplace = this.identifyUnderperformingRoutes(enrichedRoutes, targetCount);
      
      if (routesToReplace.length === 0) {
        console.log('✅ Aucune route à remplacer');
        return;
      }

      // Générer de nouvelles routes avec l'IA
      const newRoutes = await this.generateNewRouteCandidates(routesToReplace.length);

      // Effectuer le remplacement
      for (let i = 0; i < Math.min(routesToReplace.length, newRoutes.length); i++) {
        const oldRoute = routesToReplace[i];
        const newRoute = newRoutes[i];

        // Désactiver l'ancienne route
        await Route.findByIdAndUpdate(oldRoute._id, {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedReason: `Remplacée par IA - Performance: ${oldRoute.performanceScore}`
        });

        // Créer la nouvelle route
        const routeData = {
          ...newRoute,
          createdAt: new Date(),
          createdBy: 'AI_Agent',
          replacedRoute: oldRoute._id
        };

        const savedRoute = await Route.create(routeData);

        console.log(`🔄 Remplacement effectué:`);
        console.log(`   ❌ ${oldRoute.departureAirport.code}-${oldRoute.destinationAirport.code} (score: ${oldRoute.performanceScore})`);
        console.log(`   ✅ ${newRoute.departureAirport.code}-${newRoute.destinationAirport.code} (attendu: ${newRoute.expectedPerformance})`);
      }

      console.log(`✅ ${routesToReplace.length} routes remplacées avec succès`);

    } catch (error) {
      console.error('❌ Erreur remplacement routes:', error);
    }
  }

  /**
   * Optimisation mensuelle plus approfondie
   */
  async performMonthlyOptimization() {
    console.log('🌟 Optimisation mensuelle approfondie IA...');
    
    // Optimisation plus agressive une fois par mois
    await this.performMonthlyLightOptimization();
    
    // Analyse saisonnière supplémentaire
    await this.updateSeasonalRoutes();
  }

  /**
   * Mise à jour des routes saisonnières
   */
  async updateSeasonalRoutes() {
    try {
      console.log('🌞 Mise à jour des routes saisonnières...');

      const currentMonth = new Date().getMonth() + 1;
      const currentSeason = this.getCurrentSeason();

      // Activer/désactiver les routes selon la saison
      const seasonalRoutes = await Route.find({ isSeasonal: true });

      for (const route of seasonalRoutes) {
        if (route.seasonalPeriod && route.seasonalPeriod.start && route.seasonalPeriod.end) {
          const startMonth = new Date(route.seasonalPeriod.start).getMonth() + 1;
          const endMonth = new Date(route.seasonalPeriod.end).getMonth() + 1;
          
          const shouldBeActive = this.isInSeasonalPeriod(currentMonth, startMonth, endMonth);
          
          if (route.isActive !== shouldBeActive) {
            await Route.findByIdAndUpdate(route._id, {
              isActive: shouldBeActive,
              lastSeasonalUpdate: new Date()
            });
            
            console.log(`🔄 Route saisonnière ${route.departureAirport.code}-${route.destinationAirport.code}: ${shouldBeActive ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Erreur mise à jour saisonnière:', error);
    }
  }

  /**
   * Détermine la saison actuelle
   */
  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * Vérifie si on est dans une période saisonnière
   */
  isInSeasonalPeriod(currentMonth, startMonth, endMonth) {
    if (startMonth <= endMonth) {
      return currentMonth >= startMonth && currentMonth <= endMonth;
    } else {
      // Période qui chevauche l'année (ex: Dec-Feb)
      return currentMonth >= startMonth || currentMonth <= endMonth;
    }
  }

  /**
   * Utilitaire pour obtenir le nom d'un aéroport
   */
  getAirportName(code) {
    const airports = {
      'CDG': 'Paris Charles de Gaulle',
      'ORY': 'Paris Orly',
      'BCN': 'Barcelone',
      'MAD': 'Madrid',
      'IST': 'Istanbul',
      'VIE': 'Vienne',
      'PRG': 'Prague',
      'BUD': 'Budapest',
      'WAW': 'Varsovie'
    };
    
    return airports[code] || code;
  }

  /**
   * Obtenir un rapport de performance (trimestriel ou mensuel)
   */
  async getPerformanceReport(type = 'monthly') {
    if (type === 'quarterly') {
      const enrichedRoutes = await this.analyzeQuarterlyPerformances();
      const totalCalls = enrichedRoutes.reduce((sum, r) => sum + r.callsPerMonth, 0);
      
      return {
        type: 'quarterly',
        totalRoutes: enrichedRoutes.length,
        totalMonthlyCalls: totalCalls,
        budgetUtilization: (totalCalls / this.maxMonthlyCallsTarget * 100).toFixed(1),
        topPerformers: enrichedRoutes.slice(0, 5),
        underPerformers: enrichedRoutes.slice(-5),
        trends: {
          growing: enrichedRoutes.filter(r => r.quarterlyTrend === 'croissante').length,
          declining: enrichedRoutes.filter(r => r.quarterlyTrend === 'décroissante').length,
          stable: enrichedRoutes.filter(r => r.quarterlyTrend === 'stable').length
        },
        lastOptimization: this.lastOptimization,
        nextAnalysis: this.getNextQuarterlyDate()
      };
    } else {
      const enrichedRoutes = await this.analyzeRoutePerformances();
      const totalCalls = enrichedRoutes.reduce((sum, r) => sum + r.callsPerMonth, 0);
      
      return {
        type: 'monthly',
        totalRoutes: enrichedRoutes.length,
        totalMonthlyCalls: totalCalls,
        budgetUtilization: (totalCalls / this.maxMonthlyCallsTarget * 100).toFixed(1),
        topPerformers: enrichedRoutes.slice(0, 5),
        underPerformers: enrichedRoutes.slice(-5),
        lastOptimization: this.lastOptimization
      };
    }
  }

  /**
   * Calculer la prochaine date d'analyse trimestrielle
   */
  getNextQuarterlyDate() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    
    // Mois de début de trimestre: 1, 4, 7, 10
    const quarterStarts = [1, 4, 7, 10];
    const nextQuarter = quarterStarts.find(month => month > currentMonth) || quarterStarts[0];
    
    const nextYear = nextQuarter === 1 && currentMonth > 10 ? now.getFullYear() + 1 : now.getFullYear();
    
    return new Date(nextYear, nextQuarter - 1, 1, 2, 0, 0); // 1er du mois à 02:00
  }
}

// Instance singleton
const smartRouteOptimizerAgent = new SmartRouteOptimizerAgent();

module.exports = smartRouteOptimizerAgent; 