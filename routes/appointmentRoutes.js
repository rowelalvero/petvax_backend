// routes/appointmentRoutes.js
const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Pet Owner Routes
// Standard booking route
router.post('/book', authController.restrictTo('pet_owner'), appointmentController.bookAppointment);

// New route for assessment-triggered bookings
router.post(
    '/book-from-assessment',
    authController.protect,
    validateAssessmentBooking,
    appointmentController.bookFromAssessment
  );

// Clinic Staff Routes
router.get(
  '/clinic',
  authController.restrictTo('veterinarian', 'secretary', 'clinic_owner'),
  appointmentController.getClinicAppointments
);

router.delete(
  '/:id',
  authController.protect,
  appointmentController.cancelAppointment
);

module.exports = router;