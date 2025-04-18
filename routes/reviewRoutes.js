// routes/reviewRoutes.js
const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router.route('/')
  .get(reviewController.getClinicReviews)
  .post(
    authController.restrictTo('pet_owner'),
    reviewController.createReview
  );

router.route('/all-reviews')
  .get(
    authController.restrictTo('admin'),
    reviewController.getAllReviews
  );

router.route('/:id')
  .patch(
    authController.restrictTo('pet_owner', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('pet_owner', 'admin', 'clinic_owner'),
    reviewController.deleteReview
  );

module.exports = router;