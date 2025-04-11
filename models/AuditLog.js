// models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  admin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  action: { 
    type: String, 
    required: true,
    enum: [
      'USER_SUSPENDED', 
      'USER_ACTIVATED',
      'CLINIC_APPROVED', 
      'CLINIC_REJECTED',
      'SYMPTOM_RULE_EDITED'
    ]
  },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId 
  },
  details: { 
    type: mongoose.Schema.Types.Mixed 
  },
  ipAddress: { 
    type: String 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate for admin details (avoid storing duplicate data)
auditLogSchema.virtual('adminDetails', {
  ref: 'User',
  localField: 'admin',
  foreignField: '_id',
  justOne: true,
  options: { select: 'firstName lastName email' }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);