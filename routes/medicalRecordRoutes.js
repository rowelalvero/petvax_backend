// routes/medicalRecordRoutes.js
const express = require('express');
const medicalRecordController = require('../controllers/medicalRecordController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Pet owners can view, vets can edit
router.post(
  '/pets/:petId/records',
  authController.restrictTo('veterinarian', 'admin'),
  medicalRecordController.addMedicalRecord
);

router.post(
  '/pets/:petId/vaccinations',
  authController.restrictTo('veterinarian', 'admin'),
  medicalRecordController.addVaccination
);

router.get(
  '/pets/:petId/history',
  authController.restrictTo('pet_owner', 'veterinarian', 'admin'),
  medicalRecordController.getMedicalHistory
);

router.get(
  '/users/:userId/upcoming-vaccines',
  authController.restrictTo('pet_owner'),
  medicalRecordController.getUpcomingVaccinations
);

module.exports = router;