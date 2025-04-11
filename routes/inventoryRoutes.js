// routes/inventoryRoutes.js
const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('veterinarian', 'clinic_owner'));

router.get('/', inventoryController.getInventory);
router.patch('/update-stock', inventoryController.updateStock);
router.get('/alerts', inventoryController.getAlerts);

module.exports = router;