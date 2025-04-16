// controllers/clinicController.js
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const AppError = require('../utils/appError');
const bcrypt = require('bcryptjs');

// 1. CREATE CLINIC (Admin only)
exports.createClinic = async (req, res, next) => {
  try {
    const {
      name,
      address,
      location,
      contactNumber,
      email,
      operatingHours,
      profileImage,
      adminCredentials
    } = req.body;
    
    const { longitude, latitude } = location.coordinates || {};
    const { openingTime, closingTime } = operatingHours || {};
    const { username, password } = adminCredentials || {};
    
    console.log("Clinic creation request body:", req.body);
    console.log(longitude, latitude);
    console.log(location.coordinates);

    // Validate coordinates
    if (!longitude || !latitude || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      throw new AppError('Invalid coordinates. Provide valid longitude (-180 to 180) and latitude (-90 to 90).', 400);
    }

    // Hash the admin password
    const hashedPassword = await bcrypt.hash(password, 12);

    const newClinic = await Clinic.create({
      name,
      address,
      location: {
        type: 'Point',
        coordinates: [location.coordinates[0], location.coordinates[1]]
      },
      contactNumber,
      email,
      operatingHours: {
        openingTime,
        closingTime
      },
      profileImage,
      adminCredentials: {
        username: username,
        password: hashedPassword
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        clinic: newClinic
      }
    });
  } catch (err) {
    next(err);
  }
};

// 2. GET ALL CLINICS (Public)
exports.getAllClinics = async (req, res, next) => {
  try {
    const clinics = await Clinic.find({ isActive: true });

    res.status(200).json({
      status: 'success',
      results: clinics.length,
      data: {
        clinics
      }
    });
  } catch (err) {
    next(err);
  }
};

// 3. GET SINGLE CLINIC (Public)
exports.getClinic = async (req, res, next) => {
  try {
    const clinic = await Clinic.findById(req.params.id).populate('services');

    if (!clinic || !clinic.isActive) {
      throw new AppError('Clinic not found or inactive', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        clinic
      }
    });
  } catch (err) {
    next(err);
  }
};

// 4. UPDATE CLINIC (Admin/Clinic Owner)
exports.updateClinic = async (req, res, next) => {
  try {
    // Check ownership (admin or clinic owner)
    if (req.user.role === 'clinic_owner') {
      const clinic = await Clinic.findById(req.params.id);
      if (!clinic || clinic._id.toString() !== req.user.clinicId.toString()) {
        throw new AppError('You do not own this clinic', 403);
      }
    }

    const updatedClinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        clinic: updatedClinic
      }
    });
  } catch (err) {
    next(err);
  }
};

// 5. DELETE/DEACTIVATE CLINIC (Admin only)
exports.deleteClinic = async (req, res, next) => {
  try {
    // Soft delete (set isActive: false)
    await Clinic.findByIdAndUpdate(req.params.id, { isActive: false });

    // Deactivate all associated staff
    await User.updateMany(
      { clinicId: req.params.id },
      { accountStatus: 'suspended' }
    );

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};

// 6. NEARBY CLINICS (Public) - Geotagging
exports.getNearbyClinics = async (req, res, next) => {
  try {
    const { longitude, latitude, maxDistance = 5000 } = req.query;

    if (!longitude || !latitude) {
      throw new AppError('Provide longitude and latitude as query parameters', 400);
    }

    const clinics = await Clinic.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      isActive: true
    });

    res.status(200).json({
      status: 'success',
      results: clinics.length,
      data: {
        clinics
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.findClinicsForAssessment = async (req, res, next) => {
  try {
    const { assessmentResult, userLocation } = req.body;
    
    if (!assessmentResult || !assessmentResult.urgency) {
      throw new AppError('Valid assessment data is required', 400);
    }

    const clinics = await clinicMatcher.findBestClinics(assessmentResult, userLocation);
    
    res.status(200).json({
      status: 'success',
      data: {
        clinics
      }
    });
  } catch (err) {
    next(err);
  }
};

// controllers/clinicController.js
exports.checkClinicAvailability = async (req, res, next) => {
  try {
    const { clinicId, durationMinutes, startDate, endDate } = req.body;
    
    const slots = await clinicMatcher.checkClinicAvailability(
      clinicId,
      durationMinutes,
      'routine', // Default urgency
      { startDate, endDate }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        availableSlots: slots
      }
    });
  } catch (err) {
    next(err);
  }
};