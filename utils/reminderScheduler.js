// utils/reminderScheduler.js
const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Run every day at 8 AM
cron.schedule('0 8 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Find tomorrow's appointments
    const appointments = await Appointment.find({
      date: {
        $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
        $lt: new Date(tomorrow.setHours(23, 59, 59, 999))
      },
      status: 'confirmed'
    }).populate('user clinic service');

    // 2. Send reminders
    for (const appt of appointments) {
      await client.messages.create({
        body: `Reminder: ${appt.service.name} appointment at ${appt.clinic.name} tomorrow at ${appt.startTime}. Address: ${appt.clinic.address}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: appt.user.phoneNumber
      });
    }
  } catch (err) {
    console.error('Reminder error:', err);
  }
});