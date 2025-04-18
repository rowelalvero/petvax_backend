// controllers/reviewController.js
const Review = require('../models/Review');
const AppError = require('../utils/appError');
const Clinic = require('../models/Clinic');
const Appointment = require('../models/Appointment');

// Create a new review
exports.createReview = async (req, res, next) => {
  try {
    // Allow nested routes
    if (!req.body.clinic) req.body.clinic = req.params.clinicId;
    if (!req.body.user) req.body.user = req.user.id;

    // Check if the user has an appointment with this clinic
    const hasAppointment = await Appointment.findOne({
      user: req.user.id,
      clinic: req.body.clinic,
      status: 'completed'
    });

    if (!hasAppointment && req.user.role !== 'admin') {
      throw new AppError('You can only review clinics you\'ve visited', 400);
    }

    const newReview = await Review.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        review: newReview
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get all reviews for a clinic
exports.getClinicReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ clinic: req.params.clinicId })
      .populate({
        path: 'user',
        select: 'firstName lastName'
      })
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      data: {
        reviews
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get all reviews (admin only)
exports.getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate({
        path: 'user',
        select: 'firstName lastName'
      })
      .populate({
        path: 'clinic',
        select: 'name'
      });

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      data: {
        reviews
      }
    });
  } catch (err) {
    next(err);
  }
};

// Update a review
exports.updateReview = async (req, res, next) => {
  try {
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!review) {
      throw new AppError('Review not found or you are not the author', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        review
      }
    });
  } catch (err) {
    next(err);
  }
};

// Delete a review
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      $or: [
        { user: req.user.id },
        { clinic: req.user.clinicId } // Clinic owner can delete reviews
      ]
    });

    if (!review) {
      throw new AppError('Review not found or you are not authorized', 404);
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};