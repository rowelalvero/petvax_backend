// controller/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const AppError = require('../utils/appError');

// Helper: Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Register a new user (all roles)
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, role, clinicId } = req.body;

    // Validate clinicId for staff roles
    if (['clinic_owner', 'veterinarian', 'secretary'].includes(role) && !clinicId) {
      throw new AppError('Clinic ID is required for staff roles', 400);
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      role,
      clinicId: role === 'pet_owner' ? undefined : clinicId, // Ignore clinicId for pet owners
    });

    // Remove password from output
    newUser.password = undefined;

    // Generate JWT
    const token = signToken(newUser._id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email/password exist
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    // 2) Find user + password
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      throw new AppError('Incorrect email or password', 401);
    }

    // 3) Generate token
    const token = signToken(user._id);

    // 4) Send response
    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          clinicId: user.clinicId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// Protect routes (JWT check)
exports.protect = async (req, res, next) => {
  try {
    // 1) Get token
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('You are not logged in!', 401);
    }

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      throw new AppError('User no longer exists', 401);
    }

    // 4) Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      throw new AppError('Password changed recently! Please log in again.', 401);
    }

    // Grant access
    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

// Role-based authorization
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};