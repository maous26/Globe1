// server/routes/feedback.routes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth.middleware');
const feedbackController = require('../controllers/feedback.controller');

// Routes utilisateur (authentification requise)
router.post('/submit', auth, feedbackController.submitFeedback);
router.get('/my-feedbacks', auth, feedbackController.getUserFeedbacks);
router.post('/track-click/:alertId', auth, feedbackController.trackAlertClick);

// Routes admin (authentification + admin requis)
router.post('/admin/trigger-ml-training', auth, feedbackController.triggerMLTraining);
router.get('/admin/ml-stats', auth, feedbackController.getMLStats);

module.exports = router; 