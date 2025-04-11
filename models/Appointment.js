// models/Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: [true, 'Pet ID is required']
  },
  clinic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required']
  },
  veterinarian: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.service.category !== 'grooming'; // Vets not required for grooming
    }
  },
  symptomAssessment: {
    diagnosis: String,
    urgency: {
      type: String,
      enum: ['emergency', 'urgent', 'routine']
    },
    recommendedServices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    }],
    assessmentData: mongoose.Schema.Types.Mixed, // Stores raw symptom data
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  date: {
    type: Date,
    required: [true, 'Appointment date is required'],
    validate: {
      validator: function(date) {
        return date > new Date(); // Future dates only
      },
      message: 'Appointment date must be in the future'
    }
  },
  startTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  endTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  telemedicine: {
    type: {
      type: String,
      enum: ['none', 'scheduled', 'completed'],
      default: 'none'
    },
    meetingId: String,
    joinUrl: String,
    startUrl: String,
    recordingUrl: String,
    prescription: {
      medication: String,
      dosage: String,
      instructions: String,
      signedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  paymentMethod: {
    type: String,
    enum: ['gcash', 'card', 'cash']
  },
  paymentAmount: {
    type: Number
  },
  notes: String
}, { timestamps: true });

// Prevent double bookings
appointmentSchema.index({ clinic: 1, veterinarian: 1, date: 1, startTime: 1 }, { unique: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;