// model/ReportTemplate.js
const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  defaultFilters: mongoose.Schema.Types.Mixed,
  availableFields: [{
    name: String,
    label: String,
    required: Boolean
  }],
  clinicSpecific: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('ReportTemplate', templateSchema);