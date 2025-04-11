// middlewares/validateAssessmentBooking.js
const AppError = require('../utils/appError');

exports.validateAssessmentBooking = (req, res, next) => {
  const { assessmentId, clinicId, petId } = req.body;
  
  if (!assessmentId || !clinicId || !petId) {
    return next(new AppError('Missing required booking fields', 400));
  }

  // Add any additional validation here
  next();
};
