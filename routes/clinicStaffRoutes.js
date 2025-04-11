// routes/clinicStaffRoutes.js
const express = require('express');
const clinicStaffController = require('../controllers/clinicStaffController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('veterinarian', 'secretary'));

// Queue Management
router.get('/queue', clinicStaffController.getClinicQueue);
router.patch('/queue/update-status', clinicStaffController.updateAppointmentStatus);

// Intake Forms
router.post('/intake-forms', clinicStaffController.submitIntakeForm);
router.get('/appointments/:appointmentId/intake-forms', clinicStaffController.getIntakeForms);

module.exports = router;