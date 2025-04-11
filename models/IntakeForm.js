// model/IntakeForm.js
const mongoose = require('mongoose');

const intakeFormSchema = new mongoose.Schema({
  appointment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment', 
    required: true 
  },
  answers: [{
    questionId: { type: String, required: true },
    questionText: String,
    response: mongoose.Schema.Types.Mixed // Supports text/numbers/booleans
  }],
  submittedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('IntakeForm', intakeFormSchema);