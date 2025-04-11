// models/PendingClinic.js
const mongoose = require('mongoose');
const Clinic = require('./Clinic');

const pendingClinicSchema = new mongoose.Schema({
  // Copy all fields from Clinic schema
  ...Clinic.schema.obj,
  
  // Additional fields for approval workflow
  submittedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  rejectionReason: String,
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reviewedAt: Date
}, { 
  timestamps: true,
  // Prevent versioning conflicts
  optimisticConcurrency: true 
});

// Prevent duplicate submissions
pendingClinicSchema.index({ name: 1, submittedBy: 1 }, { unique: true });

module.exports = mongoose.model('PendingClinic', pendingClinicSchema);