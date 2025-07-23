// server/routes/auth.routes.js
const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { auth } = require('../middlewares/auth.middleware');

const router = express.Router();

// @route   POST api/auth/register-basic
// @desc    Register user with basic info (free tier)
// @access  Public
router.post(
  '/register-basic',
  [
    check('email', 'Veuillez fournir un email valide').isEmail(),
    check('departureAirport', 'Veuillez sélectionner un aéroport de départ').not().isEmpty()
  ],
  authController.registerBasic
);

// @route   POST api/auth/register-premium
// @desc    Register user with full info (premium tier)
// @access  Public
router.post(
  '/register-premium',
  [
    check('email', 'Veuillez fournir un email valide').isEmail(),
    check('password', 'Le mot de passe doit comporter au moins 6 caractères').isLength({ min: 6 }),
    check('firstName', 'Veuillez fournir votre prénom').not().isEmpty(),
    check('departureAirport', 'Veuillez sélectionner un aéroport de départ').not().isEmpty()
  ],
  authController.registerPremium
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Veuillez fournir un email valide').isEmail(),
    check('password', 'Le mot de passe est requis').exists()
  ],
  authController.login
);

// @route   POST api/auth/reset-password-request
// @desc    Request password reset
// @access  Public
router.post(
  '/reset-password-request',
  [
    check('email', 'Veuillez fournir un email valide').isEmail()
  ],
  authController.requestPasswordReset
);

// @route   POST api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  '/reset-password',
  [
    check('token', 'Token requis').not().isEmpty(),
    check('newPassword', 'Le nouveau mot de passe doit comporter au moins 6 caractères').isLength({ min: 6 })
  ],
  authController.resetPassword
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getCurrentUser);

module.exports = router;