// server/models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    trim: true
  },
  subscriptionType: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  departureAirports: [{
    type: String,
    trim: true
  }],
  includeCDG: {
    type: Boolean,
    default: false
  },
  preferences: {
    travelType: { 
      type: String, 
      enum: ['adventure', 'luxury', 'budget', 'culture', 'relaxation'],
      default: 'adventure'
    },
    dreamDestination: { type: String },
    preferredAccommodationType: { 
      type: String,
      enum: ['hotel', 'hostel', 'resort', 'airbnb', 'camping'],
      default: 'hotel'
    }
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  totalPotentialSavings: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to return user object without sensitive info
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);