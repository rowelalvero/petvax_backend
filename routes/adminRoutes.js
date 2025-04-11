// routes/adminRoutes.js
const express = require('express');
const symptomController = require('../controllers/symptomController');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.route('/rules')
  .get(symptomController.getAllSymptomRules)
  .post(symptomController.createSymptomRule);

router.route('/rules/:id')
  .patch(symptomController.updateSymptomRule)
  .delete(symptomController.deleteSymptomRule);

router.patch('/rules/:id/toggle', symptomController.toggleRuleStatus);
router.get('/analytics/rules', symptomController.getRuleAnalytics);

// Analytics
router.get('/analytics', adminController.getSystemAnalytics);

// User Management
router.patch('/users/suspend', adminController.suspendUser);
router.get('/users', adminController.getAllUsers); // Add filtering later

// Clinic Approvals
router.get('/clinics/pending', adminController.getPendingClinics);
router.post('/clinics/process-approval', adminController.processClinicApproval);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/filter/:action', adminController.filterAuditLogs);

module.exports = router;