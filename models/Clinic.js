// models/Clinic.js
const mongoose = require('mongoose');
const validator = require('validator');

const clinicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Clinic name is required'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    }
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    validate: {
      validator: function(v) {
        return /^[0-9]{10,15}$/.test(v);
      },
      message: 'Invalid phone number'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email format']
  },
  operatingHours: {
    openingTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
    },
    closingTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
  },
  specialties: {
    type: [String],
    enum: ['general', 'emergency', 'dermatology', 'surgery', 'internal_medicine', 'dentistry'],
    default: ['general']
  },
  emergencySupport: {
    type: Boolean,
    default: false
  },
  services: [{
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    variants: [{
      name: String,
      price: Number,
      _id: false
    }]
  }],
  profileImage: {
    type: String,
    validate: [validator.isURL, 'Invalid logo URL format'],
    default: 'https://example.com/default-clinic-logo.png'
  },
  adminCredentials: {
    username: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      select: false,
    },
    passwordResetToken: String,
    passwordResetExpires: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Geospatial index for location-based queries (critical for geotagging)
clinicSchema.index({ location: '2dsphere' });

const Clinic = mongoose.model('Clinic', clinicSchema);

module.exports = Clinic;