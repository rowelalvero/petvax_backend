// controller/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const AppError = require('../utils/appError');
const Clinic = require('../models/Clinic');
const bcrypt = require('bcrypt');

// Helper: Generate JWT token
const signToken = (id, type = 'user') => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
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

exports.clinicAdminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('Please provide username and password', 400);
    }

    // 1) Find clinic by admin username
    const clinic = await Clinic.findOne({ 'adminCredentials.username': username })
      .select('+adminCredentials.password');
    
    if (!clinic || !(await bcrypt.compare(password, clinic.adminCredentials.password))) {
      throw new AppError('Incorrect username or password', 401);
    }

    // 2) Generate token
    const token = signToken(clinic._id, 'clinic');

    // 3) Send response
    res.status(200).json({
      status: 'success',
      token,
      data: {
        clinic: {
          id: clinic._id,
          name: clinic.name,
          profileImage: clinic.profileImage
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// Generate password reset token for clinic admin
exports.forgotClinicAdminPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // 1) Find clinic by email
    const clinic = await Clinic.findOne({ email });
    if (!clinic) {
      throw new AppError('No clinic found with that email', 404);
    }

    // 2) Generate random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    clinic.adminCredentials.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    clinic.adminCredentials.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    await clinic.save({ validateBeforeSave: false });

    // 3) Send email with reset token
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-clinic-password/${resetToken}`;

    try {
      await sendEmail({
        email: clinic.email,
        subject: 'Your password reset token (valid for 10 min)',
        message: `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`
      });

      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
      });
    } catch (err) {
      // Reset the token fields if email fails
      clinic.adminCredentials.passwordResetToken = undefined;
      clinic.adminCredentials.passwordResetExpires = undefined;
      await clinic.save({ validateBeforeSave: false });

      throw new AppError('There was an error sending the email. Try again later!', 500);
    }
  } catch (err) {
    next(err);
  }
};

// Reset clinic admin password
exports.resetClinicAdminPassword = async (req, res, next) => {
  try {
    // 1) Get token and hash it
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // 2) Find clinic by token and check expiration
    const clinic = await Clinic.findOne({
      'adminCredentials.passwordResetToken': hashedToken,
      'adminCredentials.passwordResetExpires': { $gt: Date.now() }
    });

    if (!clinic) {
      throw new AppError('Token is invalid or has expired', 400);
    }

    // 3) Update password and clear reset fields
    clinic.adminCredentials.password = req.body.password;
    clinic.adminCredentials.passwordResetToken = undefined;
    clinic.adminCredentials.passwordResetExpires = undefined;
    await clinic.save();

    // 4) Log the clinic admin in (send JWT)
    const token = signToken(clinic._id, 'clinic');

    res.status(200).json({
      status: 'success',
      token,
      data: {
        clinic: {
          id: clinic._id,
          name: clinic.name
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// Protect routes (JWT check)
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('You are not logged in!', 401);
    }

    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Check if clinic or user
    if (decoded.type === 'clinic') {
      const currentClinic = await Clinic.findById(decoded.id);
      if (!currentClinic) {
        throw new AppError('Clinic no longer exists', 401);
      }
      req.clinic = currentClinic;
    } else {
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        throw new AppError('User no longer exists', 401);
      }
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        throw new AppError('Password changed recently! Please log in again.', 401);
      }
      req.user = currentUser;
    }

    next();
  } catch (err) {
    next(err);
  }
};

exports.updateClinicAdminPassword = async (req, res, next) => {
  try {
    if (!req.clinic) {
      throw new AppError('This route is for clinic admins only', 403);
    }

    // 1) Get clinic from collection
    const clinic = await Clinic.findById(req.clinic._id).select('+adminCredentials.password');

    // 2) Check if POSTed current password is correct
    if (!(await bcrypt.compare(req.body.currentPassword, clinic.adminCredentials.password))) {
      throw new AppError('Your current password is wrong', 401);
    }

    // 3) If so, update password
    clinic.adminCredentials.password = req.body.newPassword;
    await clinic.save();

    // 4) Log clinic in, send JWT
    const token = signToken(clinic._id, 'clinic');

    res.status(200).json({
      status: 'success',
      token,
      data: {
        clinic: {
          id: clinic._id,
          name: clinic.name
        }
      }
    });
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