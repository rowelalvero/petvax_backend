// models/Pet.js
const mongoose = require('mongoose');
const validator = require('validator');

const petSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Pet name is required'],
    trim: true
  },
  species: {
    type: String,
    required: [true, 'Species is required'],
    enum: ['dog', 'cat']
  },
  breed: String,
  dateOfBirth: Date,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },
  medicalHistory: [{
    recordType: {
      type: String,
      enum: ['vaccination', 'allergy', 'chronic_condition', 'surgery', 'medication'],
      required: true
    },
    dateRecorded: {
      type: Date,
      default: Date.now
    },
    dateAdministered: Date,  // For vaccinations/meds
    description: String,
    veterinarian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic'
    },
    details: mongoose.Schema.Types.Mixed,  // Flexible field for extra data
    attachments: [String]  // URLs to lab reports/images
  }],
  vaccinationRecords: [{
    vaccineType: {
      type: String,
      enum: ['rabies', 'distemper', 'parvovirus', 'leptospirosis', 'bordetella', 'other']
    },
    dateAdministered: Date,
    nextDueDate: Date,
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic'
    },
    lotNumber: String,
    notes: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Pet = mongoose.model('Pet', petSchema);
module.exports = Pet;