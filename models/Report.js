// model/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  clinic: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Clinic' 
  },
  type: {
    type: String,
    enum: ['appointments', 'revenue', 'inventory', 'custom'],
    required: true
  },
  filters: mongoose.Schema.Types.Mixed,
  generatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  format: {
    type: String,
    enum: ['pdf', 'csv', 'json'],
    default: 'pdf'
  },
  downloadUrl: String,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7*24*60*60*1000) // 7 days expiry
  }
}, { timestamps: true });

// Auto-generate download URL
reportSchema.pre('save', function(next) {
  if (!this.downloadUrl) {
    this.downloadUrl = `/reports/download/${this._id}.${this.format}`;
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);