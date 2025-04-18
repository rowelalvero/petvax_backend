// routes/clinicRoutes.js
const express = require('express');
const clinicController = require('../controllers/clinicController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');
const staffRouter = require('./staffRoutes');
const User = require('../models/User'); // Assuming you have a User model
const { validateClinicCreation } = require('../middlewares/validateClinic');

const router = express.Router();

// Public routes
router.get('/', clinicController.getAllClinics);
router.get('/:id', clinicController.getClinic);
router.get('/nearby', clinicController.getNearbyClinics);
router.post(
  '/find-for-assessment',
  authController.protect,
  clinicController.findClinicsForAssessment
);
// routes/clinicRoutes.js
router.post(
  '/check-availability',
  authController.protect,
  clinicController.checkClinicAvailability
);

// Protected routes
router.use(authController.protect);

// Admin-only routes
router.post(
  '/',
  authController.protect,
  authController.restrictTo('admin'),
  validateClinicCreation,
  clinicController.createClinic
);
router.delete('/:id', authController.protect, authController.restrictTo('admin'), clinicController.deleteClinic);

// Admin or Clinic Owner routes
router.patch('/:id', 
  authController.restrictTo('admin', 'clinic_owner'),
  clinicController.updateClinic
);

router.use('/:clinicId/reviews', reviewRouter);

router.use('/:clinicId/staff', staffRouter);

router.get('/search', clinicController.searchClinics);

// In your routes/clinicRoutes.js or similar
router.post(
  '/:clinicId/add-owner',
  authController.protect,
  authController.restrictTo('admin'),
  clinicController.addClinicOwner
);

// Get owners for a clinic
router.get('/:clinicId/owners', 
  authController.protect,
  authController.restrictTo('admin', 'clinic_owner'),
  async (req, res, next) => {
    try {
      const owners = await User.find({ 
        clinicId: req.params.clinicId,
        role: 'clinic_owner'
      }).select(' -__v');
      console.log(owners);
      res.status(200).json({
        status: 'success',
        data: { owners }
      });
    } catch (err) {
      next(err);
    }
  }
);

// Delete a clinic owner
router.delete('/owners/:ownerId',
  authController.protect,
  authController.restrictTo('admin'),
  async (req, res, next) => {
    try {
      await User.findByIdAndDelete(req.params.ownerId);
      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;