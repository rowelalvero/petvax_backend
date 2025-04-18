// controllers/staffController.js
const User = require('../models/User');
const AppError = require('../utils/appError');
const Clinic = require('../models/Clinic');

// Get all staff across all clinics (admin only)
exports.getAllStaff = async (req, res, next) => {
    try {
      // 1. Filtering
      const queryObj = { ...req.query };
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
      excludedFields.forEach(el => delete queryObj[el]);
  
      // 2. Advanced filtering
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
      
      let query = User.find({
        ...JSON.parse(queryStr),
        role: { $in: ['veterinarian', 'secretary', 'clinic_owner'] }
      });
  
      // 3. Sorting
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt');
      }
  
      // 4. Field limiting
      if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        query = query.select(fields);
      } else {
        query = query.select('-__v -password');
      }
  
      // 5. Pagination
      const page = req.query.page * 1 || 1;
      const limit = req.query.limit * 1 || 100;
      const skip = (page - 1) * limit;
  
      query = query.skip(skip).limit(limit);
  
      // 6. Populate clinic details
      query = query.populate({
        path: 'clinicId',
        select: 'name address'
      });
  
      // Execute query
      const staff = await query;
  
      res.status(200).json({
        status: 'success',
        results: staff.length,
        data: {
          staff
        }
      });
    } catch (err) {
      next(err);
    }
  };

// Add new staff member
exports.addStaff = async (req, res, next) => {
  try {
    // Only clinic owner or admin can add staff
    if (req.user.role === 'clinic_owner' && req.user.clinicId.toString() !== req.body.clinicId) {
      throw new AppError('You can only add staff to your own clinic', 403);
    }

    const { email, role, position, specialties } = req.body;

    // Check if clinic exists
    const clinic = await Clinic.findById(req.body.clinicId);
    if (!clinic) {
      throw new AppError('Clinic not found', 404);
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      // User exists - update their role and clinic
      if (user.clinicId && user.clinicId.toString() !== req.body.clinicId) {
        throw new AppError('User already belongs to another clinic', 400);
      }
      
      user.role = role;
      user.clinicId = req.body.clinicId;
      user.position = position;
      if (role === 'veterinarian') user.specialties = specialties;
      await user.save();
    } else {
      // Create new user
      const password = generateRandomPassword(); // Implement this function
      user = await User.create({
        email,
        password,
        role,
        clinicId: req.body.clinicId,
        position,
        specialties: role === 'veterinarian' ? specialties : undefined
      });
      
      // Send welcome email with credentials
      await sendWelcomeEmail(user.email, password); // Implement this
    }

    res.status(201).json({
      status: 'success',
      data: {
        staff: user
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get all staff for a clinic
exports.getClinicStaff = async (req, res, next) => {
  try {
    // Clinic owner can only see their own staff
    const clinicId = req.user.role === 'clinic_owner' 
      ? req.user.clinicId 
      : req.params.clinicId;

    const staff = await User.find({ 
      clinicId,
      role: { $in: ['veterinarian', 'secretary', 'clinic_owner'] }
    }).select('-password -__v');

    res.status(200).json({
      status: 'success',
      results: staff.length,
      data: {
        staff
      }
    });
  } catch (err) {
    next(err);
  }
};

// Update staff member
exports.updateStaff = async (req, res, next) => {
  try {
    const { position, specialties, isActiveStaff, schedule } = req.body;
    
    // Clinic owner can only update their own staff
    const filter = { _id: req.params.id };
    if (req.user.role === 'clinic_owner') {
      filter.clinicId = req.user.clinicId;
    }

    const updatedStaff = await User.findOneAndUpdate(
      filter,
      { position, specialties, isActiveStaff, schedule },
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      throw new AppError('Staff member not found or you are not authorized', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        staff: updatedStaff
      }
    });
  } catch (err) {
    next(err);
  }
};

// Remove staff member (soft delete)
exports.removeStaff = async (req, res, next) => {
  try {
    // Clinic owner can only remove their own staff
    const filter = { _id: req.params.id };
    if (req.user.role === 'clinic_owner') {
      filter.clinicId = req.user.clinicId;
    }

    const staff = await User.findOneAndUpdate(
      filter,
      { isActiveStaff: false, clinicId: null },
      { new: true }
    );

    if (!staff) {
      throw new AppError('Staff member not found or you are not authorized', 404);
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};