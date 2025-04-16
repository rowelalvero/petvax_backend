const { body } = require('express-validator');

exports.validateClinicCreation = [
  body('name').notEmpty().withMessage('Clinic name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('contactNumber').isMobilePhone().withMessage('Invalid phone number'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('openingTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('closingTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('profileImage').optional().isURL(),
  body('adminUsername').notEmpty().isLength({ min: 4 }),
  body('adminPassword').notEmpty().isLength({ min: 8 })
];