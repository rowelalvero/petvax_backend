// routes/analyticsRoutes.js
const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const authController = require('../controllers/authController');
const exportController = require('../controllers/exportController');

const router = express.Router();

router.use(authController.protect);

router.post(
    '/export',
    authController.restrictTo('clinic_owner', 'admin'),
    exportController.exportAnalytics
  );

// Clinic owners/admins only
router.get(
  '/clinics/:clinicId/:range',
  authController.restrictTo('clinic_owner', 'admin'),
  analyticsController.getClinicAnalytics
);

router.get(
  '/clinics/:clinicId/heatmap',
  authController.restrictTo('clinic_owner', 'admin'),
  analyticsController.getServiceHeatmap
);

// Internal use only
router.post(
  '/update-daily',
  authController.restrictTo('admin'),
  analyticsController.updateDailyAnalytics
);

module.exports = router;