// routes/clinicRoutes.js
const express = require('express');
const clinicController = require('../controllers/clinicController');
const authController = require('../controllers/authController');
const { validateClinicCreation } = require('../middlewares/validateClinic');

const router = express.Router();

// Public routes
router.get('/', clinicController.getAllClinics);
router.get('/:id', clinicController.getClinic);
router.get('/nearby', clinicController.getNearbyClinics);
router.post(
  '/find-for-assessment',
  authController.protect,
  clinicController.findClinicsForAssessment
);
// routes/clinicRoutes.js
router.post(
  '/check-availability',
  authController.protect,
  clinicController.checkClinicAvailability
);

// Protected routes
router.use(authController.protect);

// Admin-only routes
router.post(
  '/',
  authController.protect,
  authController.restrictTo('admin'),
  validateClinicCreation,
  clinicController.createClinic
);
router.delete('/:id', authController.protect, authController.restrictTo('admin'), clinicController.deleteClinic);

// Admin or Clinic Owner routes
router.patch('/:id', 
  authController.restrictTo('admin', 'clinic_owner'),
  clinicController.updateClinic
);

module.exports = router;