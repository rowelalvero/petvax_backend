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
      validator: function (v) {
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
  owners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  operatingHours: {
    days: [{
      type: Number,
      required: true
    }],
    openingTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
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
  isActive: {
    type: Boolean,
    default: true
  },
  ratingAverage: {
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
    set: val => Math.round(val * 10) / 10 // 4.666666 -> 4.7
  },
  ratingQuantity: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

// Geospatial index for location-based queries (critical for geotagging)
clinicSchema.index({ location: '2dsphere' });

// Add to your Clinic schema:
clinicSchema.index({
  name: 'text',
  address: 'text',
  'services.name': 'text',
  'services.description': 'text'
}, {
  weights: {
    name: 5,
    address: 3,
    'services.name': 2,
    'services.description': 1
  }
});

// Add to your Clinic model:
clinicSchema.index({ ratingAverage: -1 });
clinicSchema.index({ 'services.service': 1 });
clinicSchema.index({ 
  'operatingHours.days': 1,
  'operatingHours.openingTime': 1,
  'operatingHours.closingTime': 1 
});

const Clinic = mongoose.model('Clinic', clinicSchema);

module.exports = Clinic;