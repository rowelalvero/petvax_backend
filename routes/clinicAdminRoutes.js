const express = require('express');
const authController = require('../controllers/authController');
const clinicController = require('../controllers/clinicController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Only for clinic admins
router.get('/me', (req, res) => {
  if (!req.clinic) throw new AppError('This route is for clinic admins only', 403);
  res.status(200).json({
    status: 'success',
    data: {
      clinic: req.clinic
    }
  });
});

module.exports = router;