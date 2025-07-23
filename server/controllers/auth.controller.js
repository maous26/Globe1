// server/controllers/auth.controller.js
// Force dotenv loading
require('dotenv').config();

const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Register new user with email only (landing page signup)
exports.registerBasic = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, departureAirport, includeCDG } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    
    // Generate random password for initial signup (will be changed later)
    const randomPassword = Math.random().toString(36).slice(-8);
    
    // Create new user
    user = new User({
      email,
      password: randomPassword,
      departureAirports: [departureAirport],
      includeCDG: includeCDG || false,
      subscriptionType: 'free'
    });
    
    await user.save();
    
    // Create password reset token for first login
    const token = jwt.sign(
      { userId: user._id, resetPassword: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Send welcome email with password setup link
    const { sendWelcomeEmail } = require('../services/email/emailService');
    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-password?token=${token}`;
    await sendWelcomeEmail(user, setupLink);
    
    res.status(201).json({ 
      message: 'Inscription réussie! Vérifiez votre email pour configurer votre compte',
      userId: user._id
    });
    
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
};

// Register premium user with more details
exports.registerPremium = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      email, 
      password, 
      firstName, 
      departureAirport, 
      includeCDG,
      preferences 
    } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      // If user exists but is on free plan, upgrade to premium
      if (user.subscriptionType === 'free') {
        user.firstName = firstName || user.firstName;
        user.password = password || user.password;
        user.subscriptionType = 'premium';
        user.preferences = preferences || user.preferences;
        
        await user.save();
        
        const token = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '30d' }
        );
        
        return res.status(200).json({
          message: 'Votre compte a été mis à jour vers Premium',
          token,
          user: user.toJSON()
        });
      }
      
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    
    // Create new premium user
    user = new User({
      email,
      password,
      firstName,
      departureAirports: [departureAirport],
      includeCDG: includeCDG || false,
      subscriptionType: 'premium',
      preferences: preferences || {}
    });
    
    await user.save();
    
    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Send welcome email
    const { sendWelcomeEmail } = require('../services/email/emailService');
    await sendWelcomeEmail(user);
    
    res.status(201).json({
      message: 'Inscription Premium réussie!',
      token,
      user: user.toJSON()
    });
    
  } catch (err) {
    console.error('Error during premium registration:', err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription premium' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('[LOGIN] Corps reçu:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe incorrect' });
    }
    
    // Update last login
    user.lastLogin = Date.now();
    await user.save();
    
    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(200).json({
      token,
      user: user.toJSON()
    });
    
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
};

// Reset password request
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Aucun compte associé à cet email' });
    }
    
    // Create password reset token
    const token = jwt.sign(
      { userId: user._id, resetPassword: true },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Send password reset email
    // This will be implemented in the email service
    
    res.status(200).json({ message: 'Email de réinitialisation envoyé' });
    
  } catch (err) {
    console.error('Error during password reset request:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la demande de réinitialisation' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.resetPassword) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
    
  } catch (err) {
    console.error('Error during password reset:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Token invalide' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token expiré' });
    }
    res.status(500).json({ message: 'Erreur serveur lors de la réinitialisation du mot de passe' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.status(200).json({ user: user.toJSON() });
    
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur' });
  }
};