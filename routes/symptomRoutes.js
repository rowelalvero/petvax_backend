// routes/symptomRoutes.js
const express = require('express');
const symptomController = require('../controllers/symptomController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public route for symptom assessment
router.post('/assess', symptomController.assessSymptoms);

// Protected routes for managing symptom rules
router.use(authController.protect);
router.use(authController.restrictTo('admin', 'veterinarian'));

router.route('/rules')
  .get(symptomController.getAllSymptomRules)
  .post(symptomController.createSymptomRule);

module.exports = router;