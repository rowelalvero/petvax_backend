// routes/serviceRoutes.js
const express = require('express');
const serviceController = require('../controllers/serviceController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.post(
  '/',
  authController.restrictTo('admin', 'clinic_owner'),
  serviceController.createService
);

router.post(
  '/add-to-clinic',
  authController.restrictTo('admin', 'clinic_owner'),
  serviceController.addServiceToClinic
);

module.exports = router;