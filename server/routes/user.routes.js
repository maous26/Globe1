const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth.middleware');
const User = require('../models/user.model');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { 
      firstName, 
      dreamDestinations, 
      travelType, 
      flexibleAirports, 
      budget, 
      travelFrequency 
    } = req.body;

    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (dreamDestinations) user.dreamDestinations = dreamDestinations;
    if (travelType) {
      user.preferences = user.preferences || {};
      user.preferences.travelType = travelType;
    }
    if (flexibleAirports !== undefined) {
      user.preferences = user.preferences || {};
      user.preferences.flexibleAirports = flexibleAirports;
    }
    if (budget) {
      user.preferences = user.preferences || {};
      user.preferences.budget = budget;
    }
    if (travelFrequency) {
      user.preferences = user.preferences || {};
      user.preferences.travelFrequency = travelFrequency;
    }

    // Save user
    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(req.userId).select('-password');
    
    console.log('✅ User profile updated:', { 
      userId: req.userId, 
      firstName: updatedUser.firstName,
      dreamDestinations: updatedUser.dreamDestinations?.length || 0,
      preferences: Object.keys(updatedUser.preferences || {}).length
    });

    res.json({ 
      message: 'Profil mis à jour avec succès',
      user: updatedUser 
    });
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('preferences');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json({ preferences: user.preferences || {} });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Update preferences
    user.preferences = { ...user.preferences, ...req.body };
    await user.save();

    console.log('✅ User preferences updated:', { 
      userId: req.userId, 
      preferences: Object.keys(user.preferences).length
    });

    res.json({ 
      message: 'Préférences mises à jour avec succès',
      preferences: user.preferences 
    });
  } catch (error) {
    console.error('❌ Error updating user preferences:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 