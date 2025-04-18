// routes/staffRoutes.js
const express = require('express');
const staffController = require('../controllers/staffController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.post(
  '/',
  authController.restrictTo('admin', 'clinic_owner'),
  staffController.addStaff
);

router.get(
  '/',
  authController.restrictTo('admin', 'clinic_owner', 'veterinarian', 'secretary'),
  staffController.getClinicStaff
);

router.get(
  '/all', // Admin only route to see all staff across clinics
  authController.restrictTo('admin'),
  staffController.getAllStaff
);

router.patch(
  '/:id',
  authController.restrictTo('admin', 'clinic_owner'),
  staffController.updateStaff
);

router.delete(
  '/:id',
  authController.restrictTo('admin', 'clinic_owner'),
  staffController.removeStaff
);

module.exports = router;