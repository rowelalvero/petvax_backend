// models/AppointmentQueue.js
const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  clinic: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Clinic', 
    required: true 
  },
  appointments: [{
    appointment: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Appointment' 
    },
    status: { 
      type: String, 
      enum: ['waiting', 'in-progress', 'completed', 'cancelled'],
      default: 'waiting'
    },
    checkedInAt: Date,
    roomNumber: String
  }],
  currentPosition: { type: Number, default: 0 }
}, { timestamps: true });

// Update queue when appointments are modified
queueSchema.post('save', function(doc) {
  require('../services/socketService').emitQueueUpdate(doc.clinic);
});

module.exports = mongoose.model('AppointmentQueue', queueSchema);