// models/InventoryAlert.js
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  clinic: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Clinic' 
  },
  itemName: String,
  message: String,
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  resolved: { 
    type: Boolean, 
    default: false 
  },
  resolvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('InventoryAlert', alertSchema);