// models/Service.js
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    enum: ['vaccination', 'grooming', 'consultation', 'deworming', 'surgery']
  },
  description: {
    type: String,
    trim: true
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative']
  },
  durationMinutes: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [5, 'Minimum duration is 5 minutes']
  },
  category: {
    type: String,
    required: true,
    enum: ['preventive', 'treatment', 'hygiene', 'emergency']
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;