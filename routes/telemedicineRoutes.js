// routes/telemedicineRoutes.js
const express = require('express');
const telemedicineController = require('../controllers/telemedicineController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Start consultation (vet or owner)
router.post(
  '/appointments/:appointmentId/start',
  authController.restrictTo('veterinarian', 'pet_owner'),
  telemedicineController.initiateConsultation
);

// End consultation (vet only)
router.post(
  '/appointments/:appointmentId/complete',
  authController.restrictTo('veterinarian'),
  telemedicineController.completeConsultation
);

module.exports = router;