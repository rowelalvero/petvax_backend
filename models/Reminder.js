const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sendAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Auto-delete after sendAt passes
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  channel: {
    type: String,
    enum: ['sms', 'email', 'both'],
    required: true
  }
}, { timestamps: true });

const Reminder = mongoose.model('Reminder', reminderSchema);
module.exports = Reminder;