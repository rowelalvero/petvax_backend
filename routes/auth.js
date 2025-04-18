// routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

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