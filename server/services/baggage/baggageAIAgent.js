// server/services/baggage/baggageAIAgent.js
const { callGPT4oMini } = require('../ai/aiService');
const { getAirlinesNeedingUpdate, updateAirlinePolicy } = require('./baggageImportService');
const cron = require('node-cron');

/**
 * AI Agent pour mettre à jour les politiques de bagages
 */
class BaggageAIAgent {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.scheduleMonthlyUpdate();
  }

  /**
   * Planifier la mise à jour mensuelle automatique
   */
  scheduleMonthlyUpdate() {
    // Exécuter le 1er de chaque mois à 02:00
    cron.schedule('0 2 1 * *', () => {
      console.log('🤖 Démarrage de la mise à jour mensuelle des politiques de bagages...');
      this.updateAllOutdatedPolicies();
    });

    // Exécuter aussi chaque dimanche à 03:00 pour vérifications hebdomadaires
    cron.schedule('0 3 * * 0', () => {
      console.log('🔍 Vérification hebdomadaire des politiques de bagages...');
      this.updateAllOutdatedPolicies();
    });

    console.log('⏰ Agent IA bagages programmé - Mise à jour mensuelle activée');
  }

  /**
   * Générer un prompt IA pour rechercher les politiques de bagages
   */
  generateBaggagePolicyPrompt(airlineName) {
    return `
Tu es un expert en aviation et politiques aériennes. Je vais te demander de rechercher les informations ACTUELLES et OFFICIELLES sur les politiques de bagages pour une compagnie aérienne spécifique.

Compagnie aérienne: ${airlineName}

Recherche et retourne les informations suivantes ACTUELLES (2025) sous format JSON UNIQUEMENT:

{
  "airlineName": "${airlineName}",
  "cabinBaggage": {
    "dimensions": {
      "length": [nombre en cm],
      "width": [nombre en cm], 
      "height": [nombre en cm]
    },
    "weight": {
      "economy": [poids en kg],
      "business": [poids en kg],
      "first": [poids en kg]
    },
    "pieces": {
      "economy": [nombre de pièces],
      "business": [nombre de pièces],
      "first": [nombre de pièces]
    },
    "restrictions": ["liste des restrictions"]
  },
  "checkedBaggage": {
    "freeAllowance": {
      "economy": {
        "pieces": [nombre],
        "weight": [poids en kg]
      },
      "business": {
        "pieces": [nombre],
        "weight": [poids en kg]
      },
      "first": {
        "pieces": [nombre],
        "weight": [poids en kg]
      }
    },
    "excessFees": {
      "perKg": [prix en EUR par kg supplémentaire],
      "perPiece": [prix en EUR par bagage supplémentaire]
    }
  },
  "specialItems": {
    "sports": {
      "allowed": [true/false],
      "fee": [prix en EUR],
      "restrictions": ["liste des restrictions"]
    },
    "musical": {
      "allowed": [true/false],
      "fee": [prix en EUR],
      "restrictions": ["liste des restrictions"]
    }
  },
  "lastUpdated": "${new Date().toISOString()}",
  "dataSource": "Recherche IA ${new Date().getFullYear()}"
}

IMPORTANT:
- Utilise UNIQUEMENT des informations récentes et officielles (2024-2025)
- Convertis tous les prix en EUR si nécessaire
- Retourne UNIQUEMENT le JSON, sans texte additionnel
- Si certaines informations ne sont pas disponibles, utilise des valeurs par défaut raisonnables
- Assure-toi que tous les champs numériques sont des nombres, pas des chaînes
    `;
  }

  /**
   * Mettre à jour la politique d'une compagnie via IA
   */
  async updateAirlineWithAI(airline) {
    try {
      console.log(`🔄 Mise à jour IA pour ${airline.airlineName}...`);
      
      const prompt = this.generateBaggagePolicyPrompt(airline.airlineName);
      
      // Appeler l'IA pour obtenir les nouvelles données
      const aiResponse = await callGPT4oMini(prompt);
      
      if (!aiResponse || typeof aiResponse !== 'object') {
        throw new Error('Réponse IA invalide');
      }

      // Validation et nettoyage des données
      const updatedPolicy = this.validateAndCleanAIResponse(aiResponse, airline);
      
      // Mettre à jour dans la base de données
      await updateAirlinePolicy(airline.airlineCode, updatedPolicy);
      
      console.log(`✅ ${airline.airlineName} mise à jour avec succès via IA`);
      return { success: true, airline: airline.airlineName };
      
    } catch (error) {
      console.error(`❌ Erreur mise à jour IA pour ${airline.airlineName}:`, error.message);
      return { success: false, airline: airline.airlineName, error: error.message };
    }
  }

  /**
   * Valider et nettoyer la réponse de l'IA
   */
  validateAndCleanAIResponse(aiResponse, originalAirline) {
    try {
      // Valeurs par défaut si l'IA n'a pas fourni certaines données
      const defaults = {
        cabinBaggage: {
          dimensions: { length: 55, width: 40, height: 23 },
          weight: { economy: 8, business: 12, first: 15 },
          pieces: { economy: 1, business: 1, first: 2 }
        },
        checkedBaggage: {
          freeAllowance: {
            economy: { pieces: 1, weight: 23 },
            business: { pieces: 2, weight: 32 },
            first: { pieces: 2, weight: 32 }
          },
          excessFees: { perKg: 20, perPiece: 75 }
        }
      };

      const cleanedPolicy = {
        // Conserver les informations de base
        airlineCode: originalAirline.airlineCode,
        airlineName: originalAirline.airlineName,
        
        // Bagages cabine avec validation
        cabinBaggage: {
          dimensions: {
            length: Number(aiResponse.cabinBaggage?.dimensions?.length) || defaults.cabinBaggage.dimensions.length,
            width: Number(aiResponse.cabinBaggage?.dimensions?.width) || defaults.cabinBaggage.dimensions.width,
            height: Number(aiResponse.cabinBaggage?.dimensions?.height) || defaults.cabinBaggage.dimensions.height
          },
          weight: {
            economy: Number(aiResponse.cabinBaggage?.weight?.economy) || defaults.cabinBaggage.weight.economy,
            business: Number(aiResponse.cabinBaggage?.weight?.business) || defaults.cabinBaggage.weight.business,
            first: Number(aiResponse.cabinBaggage?.weight?.first) || defaults.cabinBaggage.weight.first
          },
          pieces: {
            economy: Number(aiResponse.cabinBaggage?.pieces?.economy) || defaults.cabinBaggage.pieces.economy,
            business: Number(aiResponse.cabinBaggage?.pieces?.business) || defaults.cabinBaggage.pieces.business,
            first: Number(aiResponse.cabinBaggage?.pieces?.first) || defaults.cabinBaggage.pieces.first
          },
          restrictions: Array.isArray(aiResponse.cabinBaggage?.restrictions) ? 
            aiResponse.cabinBaggage.restrictions : ['Standard IATA restrictions apply']
        },
        
        // Bagages en soute avec validation
        checkedBaggage: {
          freeAllowance: {
            economy: {
              pieces: Number(aiResponse.checkedBaggage?.freeAllowance?.economy?.pieces) || defaults.checkedBaggage.freeAllowance.economy.pieces,
              weight: Number(aiResponse.checkedBaggage?.freeAllowance?.economy?.weight) || defaults.checkedBaggage.freeAllowance.economy.weight,
              dimensions: { length: 158, width: 0, height: 0 } // Standard IATA
            },
            business: {
              pieces: Number(aiResponse.checkedBaggage?.freeAllowance?.business?.pieces) || defaults.checkedBaggage.freeAllowance.business.pieces,
              weight: Number(aiResponse.checkedBaggage?.freeAllowance?.business?.weight) || defaults.checkedBaggage.freeAllowance.business.weight,
              dimensions: { length: 158, width: 0, height: 0 }
            },
            first: {
              pieces: Number(aiResponse.checkedBaggage?.freeAllowance?.first?.pieces) || defaults.checkedBaggage.freeAllowance.first.pieces,
              weight: Number(aiResponse.checkedBaggage?.freeAllowance?.first?.weight) || defaults.checkedBaggage.freeAllowance.first.weight,
              dimensions: { length: 158, width: 0, height: 0 }
            }
          },
          excessFees: {
            perKg: Number(aiResponse.checkedBaggage?.excessFees?.perKg) || defaults.checkedBaggage.excessFees.perKg,
            perPiece: Number(aiResponse.checkedBaggage?.excessFees?.perPiece) || defaults.checkedBaggage.excessFees.perPiece
          }
        },
        
        // Objets spéciaux
        specialItems: {
          sports: {
            allowed: aiResponse.specialItems?.sports?.allowed !== false,
            fee: Number(aiResponse.specialItems?.sports?.fee) || 75,
            restrictions: Array.isArray(aiResponse.specialItems?.sports?.restrictions) ?
              aiResponse.specialItems.sports.restrictions : ['Pre-booking required']
          },
          musical: {
            allowed: aiResponse.specialItems?.musical?.allowed !== false,
            fee: Number(aiResponse.specialItems?.musical?.fee) || 100,
            restrictions: Array.isArray(aiResponse.specialItems?.musical?.restrictions) ?
              aiResponse.specialItems.musical.restrictions : ['Fragile instrument policy']
          },
          electronics: {
            laptops: true,
            cameras: true,
            restrictions: ['Standard electronics policy applies']
          }
        },
        
        // Conserver les routes existantes
        routes: originalAirline.routes || {
          domestic: { different: false },
          international: { different: false },
          longHaul: { different: false }
        },
        
        // Métadonnées de mise à jour
        lastUpdated: new Date(),
        updatedBy: 'ai-agent',
        source: aiResponse.dataSource || `AI-Updated-${new Date().getFullYear()}`,
        version: (originalAirline.version || 0) + 1
      };

      return cleanedPolicy;
      
    } catch (error) {
      console.error('Erreur validation réponse IA:', error);
      throw new Error('Données IA invalides');
    }
  }

  /**
   * Mettre à jour toutes les politiques obsolètes
   */
  async updateAllOutdatedPolicies() {
    if (this.isRunning) {
      console.log('⚠️  Mise à jour déjà en cours...');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();

    try {
      console.log('🚀 Démarrage de la mise à jour automatique des politiques de bagages...');
      
      // Récupérer les compagnies qui ont besoin d'une mise à jour
      const outdatedAirlines = await getAirlinesNeedingUpdate();
      
      if (outdatedAirlines.length === 0) {
        console.log('✅ Toutes les politiques de bagages sont à jour !');
        return { message: 'Toutes les politiques sont à jour', updated: 0 };
      }

      console.log(`📋 ${outdatedAirlines.length} compagnies nécessitent une mise à jour`);
      
      const results = [];
      let successful = 0;
      let failed = 0;

      // Traiter les compagnies par lots pour éviter de surcharger l'API
      for (let i = 0; i < outdatedAirlines.length; i++) {
        const airline = outdatedAirlines[i];
        
        // Délai entre les appels API
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 secondes
        }
        
        const result = await this.updateAirlineWithAI(airline);
        results.push(result);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
        
        // Log de progression
        console.log(`📊 Progression: ${i + 1}/${outdatedAirlines.length} (✅ ${successful} | ❌ ${failed})`);
      }

      console.log('🎯 Mise à jour terminée:');
      console.log(`  ✅ Réussies: ${successful}`);
      console.log(`  ❌ Échouées: ${failed}`);
      console.log(`  📊 Total: ${outdatedAirlines.length}`);

      return {
        message: 'Mise à jour terminée',
        total: outdatedAirlines.length,
        successful,
        failed,
        results
      };

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour automatique:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Déclencher une mise à jour manuelle
   */
  async triggerManualUpdate() {
    console.log('🎮 Déclenchement manuel de la mise à jour des politiques de bagages...');
    return await this.updateAllOutdatedPolicies();
  }

  /**
   * Obtenir le statut de l'agent
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextScheduledRun: 'Premier du mois suivant à 02:00'
    };
  }
}

// Instance singleton de l'agent
const baggageAIAgent = new BaggageAIAgent();

module.exports = {
  baggageAIAgent,
  BaggageAIAgent
}; 