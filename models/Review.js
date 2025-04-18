// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  clinic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    maxlength: [500, 'Comment cannot exceed 500 characters'],
    trim: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Prevent duplicate reviews from the same user for the same clinic
reviewSchema.index({ clinic: 1, user: 1 }, { unique: true });

// Virtual populate to get user details without storing them
reviewSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
  options: { select: 'firstName lastName' }
});

// Update clinic rating when a new review is saved
reviewSchema.post('save', async function() {
  await this.constructor.calculateAverageRating(this.clinic);
});

// Static method to calculate average rating
reviewSchema.statics.calculateAverageRating = async function(clinicId) {
  const stats = await this.aggregate([
    { $match: { clinic: clinicId } },
    { $group: {
      _id: '$clinic',
      nRating: { $sum: 1 },
      avgRating: { $avg: '$rating' }
    }}
  ]);

  if (stats.length > 0) {
    await mongoose.model('Clinic').findByIdAndUpdate(clinicId, {
      ratingQuantity: stats[0].nRating,
      ratingAverage: stats[0].avgRating
    });
  } else {
    await mongoose.model('Clinic').findByIdAndUpdate(clinicId, {
      ratingQuantity: 0,
      ratingAverage: 4.5 // Default if no reviews
    });
  }
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;