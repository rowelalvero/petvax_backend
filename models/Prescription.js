// models/Prescription.js
const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  appointment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment' 
  },
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
  veterinarian: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  notes: String,
  issuedAt: { type: Date, default: Date.now },
  isDigital: { type: Boolean, default: true }
});

// Generate PDF automatically on save
prescriptionSchema.post('save', function(doc) {
  require('../services/prescriptionService').generatePrescriptionPDF(doc);
});

module.exports = mongoose.model('Prescription', prescriptionSchema);