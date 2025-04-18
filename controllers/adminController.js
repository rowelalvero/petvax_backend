// controllers/adminController.js
const AuditLog = require('../models/AuditLog');
const PendingClinic = require('../models/PendingClinic');
const User = require('../models/User');
const AppError = require('../utils/appError');
const Clinic = require('../models/Clinic');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');

// Get system-wide analytics
exports.getSystemAnalytics = async (req, res, next) => {
  try {
    const [users, clinics, appointments, revenue] = await Promise.all([
      User.countDocuments(),
      Clinic.countDocuments({ isActive: true }),
      Appointment.countDocuments(),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    res.status(200).json({
      users: users,
      activeClinics: clinics,
      totalAppointments: appointments,
      totalRevenue: revenue[0]?.total || 0,
    });
  } catch (err) {
    next(err);
  }
};

// Suspend a user
exports.suspendUser = async (req, res, next) => {
  const { userId, reason } = req.body;
  const user = await User.findByIdAndUpdate(
    userId,
    { accountStatus: 'suspended' },
    { new: true }
  );

  await AuditLog.create({
    admin: req.user.id,
    action: 'USER_SUSPENDED',
    targetId: user._id,
    details: { reason },
  });

  res.status(200).json({ status: 'success', user });
};

// Log an admin action (reusable middleware)
const logAdminAction = async (req, adminId, action, targetId, details = {}) => {
  await AuditLog.create({
    admin: adminId,
    action,
    targetId,
    details,
    ipAddress: req.ip
  });
};

// Get all audit logs (with pagination)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .populate('adminDetails'),
      AuditLog.countDocuments()
    ]);

    res.status(200).json({
      status: 'success',
      results: logs.length,
      total,
      data: { logs }
    });
  } catch (err) {
    next(err);
  }
};

// Filter logs by action type
exports.filterAuditLogs = async (req, res, next) => {
  try {
    const { action } = req.params;
    const logs = await AuditLog.find({ action })
      .sort('-createdAt')
      .populate('adminDetails');

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: { logs }
    });
  } catch (err) {
    next(err);
  }
};

// Get all pending clinics
exports.getPendingClinics = async (req, res, next) => {
  try {
    const clinics = await PendingClinic.find({ status: 'pending' })
      .populate('submittedBy', 'firstName lastName email');

    res.status(200).json({
      status: 'success',
      results: clinics.length,
      data: { clinics }
    });
  } catch (err) {
    next(err);
  }
};

// Approve/Reject a clinic
exports.processClinicApproval = async (req, res, next) => {
  try {
    const { clinicId, action, reason } = req.body;
    const clinic = await PendingClinic.findById(clinicId);

    if (!clinic) throw new AppError('Clinic not found', 404);
    if (clinic.status !== 'pending') {
      throw new AppError('Clinic already processed', 400);
    }

    if (action === 'approve') {
      // Create active clinic
      const { _id, __v, status, submittedBy, ...clinicData } = clinic.toObject();
      const newClinic = await Clinic.create(clinicData);

      // Update pending record
      clinic.status = 'approved';
      clinic.reviewedBy = req.user.id;
      clinic.reviewedAt = new Date();
      await clinic.save();

      // Log action
      await logAdminAction(
        req.user.id, 
        'CLINIC_APPROVED', 
        newClinic._id
      );

      res.status(200).json({
        status: 'success',
        data: { clinic: newClinic }
      });

    } else if (action === 'reject') {
      if (!reason) throw new AppError('Rejection reason required', 400);

      clinic.status = 'rejected';
      clinic.rejectionReason = reason;
      clinic.reviewedBy = req.user.id;
      clinic.reviewedAt = new Date();
      await clinic.save();

      await logAdminAction(
        req.user.id, 
        'CLINIC_REJECTED', 
        clinic._id,
        { reason }
      );

      res.status(200).json({ status: 'success' });
    } else {
      throw new AppError('Invalid action', 400);
    }
  } catch (err) {
    next(err);
  }
};