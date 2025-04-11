// models/SymptomRule.js
const mongoose = require('mongoose');

const symptomRuleSchema = new mongoose.Schema({
  symptom: {
    type: String,
    required: [true, 'Symptom name is required'],
    enum: ['fever', 'vomiting', 'lethargy', 'loss_of_appetite', 'coughing', 'diarrhea', 'itching', 'limping']
  },
  questions: [{
    text: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['boolean', 'number', 'multiple_choice'],
      required: true
    },
    options: [String], // For multiple_choice type
    required: {
      type: Boolean,
      default: false
    }
  }],
  conditions: [{
    criteria: mongoose.Schema.Types.Mixed, // Flexible structure for rule matching
    diagnosis: {
      type: String,
      required: true
    },
    urgency: {
      type: String,
      enum: ['emergency', 'urgent', 'routine'],
      default: 'routine'
    },
    recommendedServices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    }],
    suggestedClinics: {
      type: String,
      enum: ['general', 'emergency', 'dermatology', 'surgery']
    },
    followUpAdvice: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

symptomRuleSchema.index({ symptom: 1, isActive: 1 });

const SymptomRule = mongoose.model('SymptomRule', symptomRuleSchema);

module.exports = SymptomRule;