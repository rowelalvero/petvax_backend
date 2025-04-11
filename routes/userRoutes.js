// routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.get(
  '/notifications',
  userController.getNotificationPreferences
);

router.patch(
  '/notifications',
  userController.updateNotificationPreferences
);

module.exports = router;