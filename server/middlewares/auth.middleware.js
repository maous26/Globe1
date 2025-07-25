// server/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware to verify JWT token and add userId to request
exports.auth = async (req, res, next) => {
  try {
    // Get token from header - support both formats
    let token = req.header('x-auth-token');
    
    // Also check for Authorization Bearer header
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    console.log('[Auth Middleware] Token reçu:', token ? token.substring(0, 20) + '...' : 'undefined');
    
    // Check if no token
    if (!token) {
      return res.status(401).json({ message: 'Aucun token, autorisation refusée' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user ID to request
    req.userId = decoded.userId;
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Middleware to check if user is admin
exports.admin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Accès refusé - Droits administrateur requis' });
    }
    
    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Middleware to check if user has premium subscription
exports.premium = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (user.subscriptionType !== 'premium') {
      return res.status(403).json({ 
        message: 'Accès refusé - Abonnement premium requis',
        isPremium: false
      });
    }
    
    next();
  } catch (err) {
    console.error('Premium middleware error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Middleware to check daily alert limit for free users
exports.checkAlertLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // If premium, no limit check needed
    if (user.subscriptionType === 'premium') {
      return next();
    }
    
    // For free users, check if they've reached the daily limit
    const Alert = require('../models/alert.model');
    
    // Get start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Count today's alerts for this user
    const alertCount = await Alert.countDocuments({
      user: user._id,
      createdAt: { $gte: today }
    });
    
    // Check if limit reached (3 per day for free users)
    if (alertCount >= 3) {
      return res.status(403).json({ 
        message: 'Limite quotidienne d\'alertes atteinte pour les utilisateurs gratuits (3/jour)',
        upgradeRequired: true
      });
    }
    
    next();
  } catch (err) {
    console.error('Alert limit middleware error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};