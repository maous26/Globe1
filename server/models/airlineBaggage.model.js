// server/models/airlineBaggage.model.js
const mongoose = require('mongoose');

const BaggagePolicySchema = new mongoose.Schema({
  // Airline information
  airlineCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  airlineName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Cabin baggage policy
  cabinBaggage: {
    dimensions: {
      length: { type: Number }, // cm
      width: { type: Number },  // cm
      height: { type: Number }  // cm
    },
    weight: {
      economy: { type: Number }, // kg
      business: { type: Number }, // kg
      first: { type: Number }    // kg
    },
    pieces: {
      economy: { type: Number, default: 1 },
      business: { type: Number, default: 1 },
      first: { type: Number, default: 2 }
    },
    restrictions: [String] // Additional restrictions
  },
  
  // Checked baggage policy
  checkedBaggage: {
    freeAllowance: {
      economy: {
        pieces: { type: Number, default: 1 },
        weight: { type: Number }, // kg
        dimensions: {
          length: { type: Number },
          width: { type: Number },
          height: { type: Number }
        }
      },
      business: {
        pieces: { type: Number, default: 2 },
        weight: { type: Number },
        dimensions: {
          length: { type: Number },
          width: { type: Number },
          height: { type: Number }
        }
      },
      first: {
        pieces: { type: Number, default: 2 },
        weight: { type: Number },
        dimensions: {
          length: { type: Number },
          width: { type: Number },
          height: { type: Number }
        }
      }
    },
    excessFees: {
      perKg: { type: Number }, // EUR per kg
      perPiece: { type: Number } // EUR per additional piece
    }
  },
  
  // Special items
  specialItems: {
    sports: {
      allowed: { type: Boolean, default: true },
      fee: { type: Number, default: 0 },
      restrictions: [String]
    },
    musical: {
      allowed: { type: Boolean, default: true },
      fee: { type: Number, default: 0 },
      restrictions: [String]
    },
    electronics: {
      laptops: { type: Boolean, default: true },
      cameras: { type: Boolean, default: true },
      restrictions: [String]
    }
  },
  
  // Regional variations
  routes: {
    domestic: {
      different: { type: Boolean, default: false },
      policy: mongoose.Schema.Types.Mixed
    },
    international: {
      different: { type: Boolean, default: false },
      policy: mongoose.Schema.Types.Mixed
    },
    longHaul: {
      different: { type: Boolean, default: false },
      policy: mongoose.Schema.Types.Mixed
    }
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    enum: ['manual', 'ai-agent', 'api'],
    default: 'manual'
  },
  source: {
    type: String,
    default: 'airline-official-website'
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index for efficient querying
BaggagePolicySchema.index({ airlineCode: 1 });
BaggagePolicySchema.index({ airlineName: 1 });
BaggagePolicySchema.index({ lastUpdated: -1 });

// Methods
BaggagePolicySchema.methods.needsUpdate = function() {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return this.lastUpdated < oneMonthAgo;
};

BaggagePolicySchema.methods.getBaggageInfo = function(classType = 'economy') {
  return {
    airline: this.airlineName,
    cabin: {
      weight: this.cabinBaggage.weight[classType] || this.cabinBaggage.weight.economy,
      pieces: this.cabinBaggage.pieces[classType] || this.cabinBaggage.pieces.economy,
      dimensions: this.cabinBaggage.dimensions
    },
    checked: {
      pieces: this.checkedBaggage.freeAllowance[classType]?.pieces || this.checkedBaggage.freeAllowance.economy.pieces,
      weight: this.checkedBaggage.freeAllowance[classType]?.weight || this.checkedBaggage.freeAllowance.economy.weight,
      dimensions: this.checkedBaggage.freeAllowance[classType]?.dimensions || this.checkedBaggage.freeAllowance.economy.dimensions
    },
    fees: this.checkedBaggage.excessFees
  };
};

module.exports = mongoose.model('AirlineBaggage', BaggagePolicySchema); 