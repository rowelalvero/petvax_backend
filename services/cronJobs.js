// services/cronJobs.js
const cron = require('node-cron');
const ClinicAnalytics = require('../models/ClinicAnalytics');
const Appointment = require('../models/Appointment');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily analytics aggregation...');
  await ClinicAnalytics.updateDailyAnalytics();
});