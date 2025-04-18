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
      contactNumber,
      email,
      location,
      operatingHours,
      profileImage,
      isActive,
      emergencySupport
    } = req.body;

    const newClinic = await Clinic.create({
      name,
      address,
      contactNumber,
      email,
      location: {
        type: 'Point',
        coordinates: [location.coordinates[0], location.coordinates[1]]
      },
      operatingHours: {
        openingTime: operatingHours.openingTime,
        closingTime: operatingHours.closingTime
      },
      isActive,
      emergencySupport,
      profileImage
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
    const clinics = await Clinic.find({ isActive: true })
      .populate({
        path: 'owners',
        match: { role: 'clinic_owner' }
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

// 3. GET SINGLE CLINIC (Public)
exports.getClinic = async (req, res, next) => {
  try {
    const clinic = await Clinic.findById(req.params.id)
      .populate('services') // Populate services
      .populate({
        path: 'owners',
        match: { role: 'clinic_owner' }
      }); // Populate owners

    if (!clinic || !clinic.isActive) {
      throw new AppError('Clinic not found or inactive', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { clinic }
    });
  } catch (err) {
    next(err);
  }
};

exports.searchClinics = async (req, res, next) => {
  try {
    const { 
      query, 
      location, 
      specialty, 
      emergency, 
      minRating,
      service,
      openNow,
      limit = 10 
    } = req.query;
    
    // Base query for active clinics
    const searchQuery = { isActive: true };

    // Text search (if query provided)
    if (query) {
      searchQuery.$text = { $search: query };
    }

    // Location filter (nearby clinics)
    if (location) {
      const [latitude, longitude, radius = 5000] = location.split(',').map(Number);
      
      searchQuery.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: radius // Default 5km radius
        }
      };
    }

    // Specialty filter
    if (specialty) {
      searchQuery.specialties = specialty;
    }

    // Emergency support filter
    if (emergency === 'true') {
      searchQuery.emergencySupport = true;
    }

    // Minimum rating filter
    if (minRating) {
      searchQuery.ratingAverage = { 
        $gte: parseFloat(minRating) 
      };
    }

    // Service availability filter
    if (service) {
      searchQuery['services.service'] = mongoose.Types.ObjectId(service);
    }

    // Open now filter
    if (openNow === 'true') {
      const now = new Date();
      const currentDay = now.getDay(); // 0-6 (Sunday-Saturday)
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // For clinics with weekly schedule
      if (req.query.ignoreWeeklySchedule !== 'true') {
        searchQuery['operatingHours.days'] = currentDay;
      }
      
      searchQuery['operatingHours.openingTime'] = { $lte: currentTime };
      searchQuery['operatingHours.closingTime'] = { $gte: currentTime };
    }

    const clinics = await Clinic.find(searchQuery)
      .select('-__v') // Removed '-adminCredentials' from here
      .limit(parseInt(limit))
      .populate({
        path: 'services.service',
        select: 'name description'
      })
      .lean();

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

// 4. UPDATE CLINIC (Admin/Clinic Owner)
exports.updateClinic = async (req, res, next) => {
  try {
    console.log(req.user.role );
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

// In your controllers/clinicController.js
exports.addClinicOwner = async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    const { firstName, lastName, email, password, phoneNumber } = req.body;

    // Validate clinic exists
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      throw new AppError('Clinic not found', 404);
    }

    // Create user with clinic_owner role
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      role: 'clinic_owner',
      clinicId: clinic._id,
      position: 'Clinic Owner'
    });

    console.log('New user created:', newUser);

    // Remove password from output
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
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