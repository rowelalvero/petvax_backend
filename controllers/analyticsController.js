// controllers/analyticsController.js
const ClinicAnalytics = require('../models/ClinicAnalytics');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const AppError = require('../utils/appError');
const Clinic = require('../models/Clinic');
const mongoose = require('mongoose');

// Daily stats aggregation (run via cron job)
exports.updateDailyAnalytics = async (req, res, next) => {
  try {
    const clinics = await Clinic.find({ isActive: true });
    
    await Promise.all(clinics.map(async clinic => {
      const startOfDay = new Date().setHours(0,0,0,0);
      const endOfDay = new Date().setHours(23,59,59,999);

      const [appointments, payments] = await Promise.all([
        Appointment.aggregate([
          { $match: { 
            clinic: clinic._id,
            date: { $gte: startOfDay, $lte: endOfDay } 
          }},
          { $group: {
            _id: '$status',
            count: { $sum: 1 }
          }}
        ]),
        Payment.aggregate([
          { $match: { 
            'appointment.clinic': clinic._id,
            createdAt: { $gte: startOfDay, $lte: endOfDay } 
          }},
          { $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' }
          }}
        ])
      ]);

      await ClinicAnalytics.create({
        clinic: clinic._id,
        metrics: {
          appointments: {
            total: appointments.reduce((sum, a) => sum + a.count, 0),
            completed: appointments.find(a => a._id === 'completed')?.count || 0,
            cancelled: appointments.find(a => a._id === 'cancelled')?.count || 0
          },
          revenue: {
            total: payments.reduce((sum, p) => sum + p.total, 0),
            byPaymentMethod: {
              gcash: payments.find(p => p._id === 'gcash')?.total || 0,
              cash: payments.find(p => p._id === 'cash')?.total || 0
            }
          }
        }
      });
    }));

    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

// Get clinic analytics
exports.getClinicAnalytics = async (req, res, next) => {
  try {
    const { clinicId, range = '7d' } = req.params;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (range) {
      case '24h':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 1)) };
        break;
      case '7d':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now.setDate(now.getDate() - 30)) };
        break;
    }

    const analytics = await ClinicAnalytics.find({
      clinic: clinicId,
      date: dateFilter
    }).sort('date');

    res.status(200).json({
      status: 'success',
      data: { analytics }
    });
  } catch (err) {
    next(err);
  }
};

// Service popularity heatmap
exports.getServiceHeatmap = async (req, res, next) => {
  try {
    const { clinicId } = req.params;
    
    const heatmap = await Appointment.aggregate([
      { $match: { clinic: mongoose.Types.ObjectId(clinicId) } },
      { $group: {
        _id: {
          hour: { $hour: '$date' },
          dayOfWeek: { $dayOfWeek: '$date' },
          service: '$service'
        },
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: { heatmap }
    });
  } catch (err) {
    next(err);
  }
};