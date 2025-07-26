// server/services/baggage/baggageImportService.js
const fs = require('fs').promises;
const path = require('path');
const AirlineBaggage = require('../../models/airlineBaggage.model');

/**
 * Parse dimensions string (e.g., "55x40x23") into object
 */
const parseDimensions = (dimensionsStr) => {
  if (!dimensionsStr || typeof dimensionsStr !== 'string') return null;
  
  const dimensions = dimensionsStr.match(/(\d+)x(\d+)x(\d+)/);
  if (!dimensions) return null;
  
  return {
    length: parseInt(dimensions[1]),
    width: parseInt(dimensions[2]),
    height: parseInt(dimensions[3])
  };
};

/**
 * Parse weight from string (e.g., "8kg", "10kg")
 */
const parseWeight = (weightStr) => {
  if (!weightStr || typeof weightStr !== 'string') return null;
  
  const weight = weightStr.match(/(\d+)kg/);
  return weight ? parseInt(weight[1]) : null;
};

/**
 * Parse checked baggage allowance
 */
const parseCheckedBaggage = (baggageStr) => {
  if (!baggageStr || typeof baggageStr !== 'string') return { pieces: 0, weight: 0 };
  
  // Handle different formats
  if (baggageStr.includes('inclus')) {
    const pieces = baggageStr.match(/(\d+)x/);
    const weight = baggageStr.match(/(\d+)kg/);
    
    return {
      pieces: pieces ? parseInt(pieces[1]) : 1,
      weight: weight ? parseInt(weight[1]) : 23
    };
  }
  
  if (baggageStr.includes('payant')) {
    return { pieces: 0, weight: 0 };
  }
  
  // For weight ranges like "20-30kg"
  const weightRange = baggageStr.match(/(\d+)-?(\d+)?kg/);
  if (weightRange) {
    return {
      pieces: 1,
      weight: parseInt(weightRange[1])
    };
  }
  
  return { pieces: 0, weight: 0 };
};

/**
 * Convert French airline data to our schema format
 */
const convertToSchema = (airline) => {
  const cabinDimensions = parseDimensions(airline.bagage_cabine_eco);
  const personalDimensions = parseDimensions(airline.bagage_personnel_gratuit);
  const cabinWeight = parseWeight(airline.bagage_cabine_eco);
  const checkedBaggage = parseCheckedBaggage(airline.bagage_soute_eco);
  
  // Generate airline code from name
  const airlineCode = airline.compagnie
    .replace(/[^a-zA-Z\s]/g, '')
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 3);
  
  return {
    airlineCode: airlineCode,
    airlineName: airline.compagnie,
    
    cabinBaggage: {
      dimensions: cabinDimensions || personalDimensions,
      weight: {
        economy: cabinWeight || 0,
        business: cabinWeight ? Math.ceil(cabinWeight * 1.5) : 0,
        first: cabinWeight ? Math.ceil(cabinWeight * 2) : 0
      },
      pieces: {
        economy: 1,
        business: 1,
        first: 2
      },
      restrictions: airline.type === 'Low-cost' ? ['Strict size enforcement', 'Additional fees may apply'] : []
    },
    
    checkedBaggage: {
      freeAllowance: {
        economy: {
          pieces: checkedBaggage.pieces,
          weight: checkedBaggage.weight,
          dimensions: {
            length: 158, // Standard IATA limit (sum of dimensions)
            width: 0,
            height: 0
          }
        },
        business: {
          pieces: Math.max(checkedBaggage.pieces, 2),
          weight: Math.max(checkedBaggage.weight, 32),
          dimensions: {
            length: 158,
            width: 0,
            height: 0
          }
        },
        first: {
          pieces: Math.max(checkedBaggage.pieces, 2),
          weight: Math.max(checkedBaggage.weight, 32),
          dimensions: {
            length: 158,
            width: 0,
            height: 0
          }
        }
      },
      excessFees: {
        perKg: airline.type === 'Low-cost' ? 25 : 15, // EUR per kg
        perPiece: airline.type === 'Low-cost' ? 50 : 75 // EUR per additional piece
      }
    },
    
    specialItems: {
      sports: {
        allowed: true,
        fee: airline.type === 'Low-cost' ? 50 : 75,
        restrictions: ['Pre-booking required', 'Size restrictions apply']
      },
      musical: {
        allowed: true,
        fee: airline.type === 'Low-cost' ? 75 : 100,
        restrictions: ['Fragile instrument policy applies']
      },
      electronics: {
        laptops: true,
        cameras: true,
        restrictions: airline.type === 'Low-cost' ? ['Must fit in personal item'] : []
      }
    },
    
    routes: {
      domestic: { different: false },
      international: { different: false },
      longHaul: { 
        different: airline.type === 'Long-courrier',
        policy: airline.type === 'Long-courrier' ? {
          checkedBaggage: { pieces: 2, weight: 32 }
        } : null
      }
    },
    
    lastUpdated: new Date(),
    updatedBy: 'ai-agent',
    source: 'airlines-baggage-policies.json',
    version: 1
  };
};

/**
 * Import airlines from JSON file
 */
const importAirlinesFromJson = async () => {
  try {
    console.log('🎒 Starting airlines baggage policies import...');
    
    // Read JSON file
    const jsonPath = path.join(process.cwd(), 'airlines-baggage-policies.json');
    const fileContent = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(fileContent);
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    for (const airline of data.compagnies_aeriennes) {
      try {
        const baggagePolicy = convertToSchema(airline);
        
        // Check if airline already exists
        const existing = await AirlineBaggage.findOne({ 
          $or: [
            { airlineCode: baggagePolicy.airlineCode },
            { airlineName: baggagePolicy.airlineName }
          ]
        });
        
        if (existing) {
          // Update existing policy
          await AirlineBaggage.findByIdAndUpdate(existing._id, {
            ...baggagePolicy,
            version: existing.version + 1,
            lastUpdated: new Date()
          });
          updated++;
          console.log(`✅ Updated: ${baggagePolicy.airlineName}`);
        } else {
          // Create new policy
          await AirlineBaggage.create(baggagePolicy);
          imported++;
          console.log(`✨ Imported: ${baggagePolicy.airlineName}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${airline.compagnie}:`, error.message);
        errors++;
      }
    }
    
    console.log('🎯 Import completed:');
    console.log(`  - New airlines: ${imported}`);
    console.log(`  - Updated airlines: ${updated}`);
    console.log(`  - Errors: ${errors}`);
    console.log(`  - Total processed: ${data.compagnies_aeriennes.length}`);
    
    return {
      success: true,
      imported,
      updated,
      errors,
      total: data.compagnies_aeriennes.length
    };
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
};

/**
 * Get baggage policy for an airline by name or code
 */
const getBaggagePolicy = async (airlineNameOrCode) => {
  try {
    const policy = await AirlineBaggage.findOne({
      $or: [
        { airlineCode: airlineNameOrCode.toUpperCase() },
        { airlineName: { $regex: airlineNameOrCode, $options: 'i' } }
      ]
    });
    
    return policy;
  } catch (error) {
    console.error('Error fetching baggage policy:', error);
    return null;
  }
};

/**
 * Get airlines that need policy updates (older than 1 month)
 */
const getAirlinesNeedingUpdate = async () => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const airlines = await AirlineBaggage.find({
      lastUpdated: { $lt: oneMonthAgo }
    }).select('airlineCode airlineName lastUpdated');
    
    return airlines;
  } catch (error) {
    console.error('Error fetching airlines needing update:', error);
    return [];
  }
};

/**
 * Update airline policy with AI-generated data
 */
const updateAirlinePolicy = async (airlineCode, newPolicyData) => {
  try {
    const airline = await AirlineBaggage.findOne({ airlineCode });
    if (!airline) {
      throw new Error(`Airline ${airlineCode} not found`);
    }
    
    const updatedPolicy = await AirlineBaggage.findByIdAndUpdate(
      airline._id,
      {
        ...newPolicyData,
        lastUpdated: new Date(),
        updatedBy: 'ai-agent',
        version: airline.version + 1
      },
      { new: true }
    );
    
    console.log(`✅ Updated policy for ${airline.airlineName}`);
    return updatedPolicy;
    
  } catch (error) {
    console.error(`❌ Error updating policy for ${airlineCode}:`, error);
    throw error;
  }
};

module.exports = {
  importAirlinesFromJson,
  getBaggagePolicy,
  getAirlinesNeedingUpdate,
  updateAirlinePolicy,
  convertToSchema
}; 