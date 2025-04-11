// models/ClinicAnalytics.js
const mongoose = require('mongoose');

const clinicAnalyticsSchema = new mongoose.Schema({
  clinic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  metrics: {
    appointments: {
      total: Number,
      completed: Number,
      cancelled: Number,
      byService: [{
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service'
        },
        count: Number
      }]
    },
    revenue: {
      total: Number,
      byPaymentMethod: {
        gcash: Number,
        cash: Number,
        card: Number
      }
    },
    newPatients: Number,
    averageRating: Number
  }
}, { timestamps: true });

// Pre-aggregate daily stats at midnight
clinicAnalyticsSchema.index({ clinic: 1, date: 1 });
module.exports = mongoose.model('ClinicAnalytics', clinicAnalyticsSchema);