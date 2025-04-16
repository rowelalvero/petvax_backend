// routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/clinic-admin/login', authController.clinicAdminLogin);

router.post('/clinic-admin/forgot-password', authController.forgotClinicAdminPassword);
router.patch('/reset-clinic-password/:token', authController.resetClinicAdminPassword);

// Protected route (admin-only)
router.get(
  '/admin-only',
  authController.protect,
  authController.restrictTo('admin'),
  (req, res) => {
    res.status(200).json({ status: 'success', data: { message: 'Admin access granted' } });
  }
);

module.exports = router;