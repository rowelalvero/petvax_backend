const schedule = require('node-schedule');
const Pet = require('../models/Pet');
const Appointment = require('../models/Appointment');
const Reminder = require('../models/Reminder.js');
const User = require('../models/User');
const { sendEmail, generateReminderContent } = require('./notificationService');

// Check for pending reminders every hour
schedule.scheduleJob('0 * * * *', async () => {
  try {
    const now = new Date();
    const reminders = await Reminder.find({
      status: 'pending',
      sendAt: { $lte: now }
    }).populate({
      path: 'appointment',
      populate: [
        { path: 'clinic', select: 'name address' },
        { path: 'service', select: 'name' }
      ]
    });

    for (const reminder of reminders) {
      try {
        const user = await User.findById(reminder.user);
        if (!user) continue;

        const { email } = generateReminderContent(reminder.appointment);

        // Send email reminder
        await sendEmail(user.email, 'Appointment Reminder', email);

        reminder.status = 'sent';
        await reminder.save();

      } catch (err) {
        console.error(`Failed to send reminder ${reminder._id}:`, err);
        reminder.status = 'failed';
        await reminder.save();
      }
    }
  } catch (err) {
    console.error('Reminder scheduler error:', err);
  }
});

// Schedule appointment reminders
exports.scheduleAppointmentReminder = async (appointmentId, userId) => {
  try {
    const [appointment, user] = await Promise.all([
      Appointment.findById(appointmentId).select('date startTime'),
      User.findById(userId).select('notificationPreferences email')
    ]);

    if (!appointment || !user) return;
    if (user.notificationPreferences?.appointmentReminders?.channel === 'none') return;

    // Calculate reminder time based on user preference
    const reminderHours = user.notificationPreferences?.appointmentReminders?.advanceTime || 24;
    const appointmentDate = new Date(appointment.date);
    const [hours, minutes] = appointment.startTime.split(':');
    appointmentDate.setHours(hours, minutes, 0, 0);
    
    const reminderTime = new Date(appointmentDate);
    reminderTime.setHours(reminderTime.getHours() - reminderHours);

    // Create reminder for email only
    await Reminder.create({
      appointment: appointmentId,
      user: userId,
      sendAt: reminderTime,
      channel: 'email' // Only email channel now
    });

  } catch (err) {
    console.error('Error scheduling reminder:', err);
  }
};

// Check vaccination due dates
exports.checkVaccinationDueDates = async () => {
  const now = new Date();
  const upcomingDate = new Date(now.setDate(now.getDate() + 7)); // 1 week ahead

  const pets = await Pet.find({
    'vaccinationRecords.nextDueDate': {
      $lte: upcomingDate,
      $gte: now
    }
  }).populate('owner', 'email notificationPreferences');

  for (const pet of pets) {
    const dueVaccines = pet.vaccinationRecords.filter(v => 
      v.nextDueDate <= upcomingDate && v.nextDueDate >= now
    );

    if (dueVaccines.length > 0 && pet.owner.notificationPreferences.vaccinationReminders) {
      await sendVaccinationReminder(pet.owner, pet, dueVaccines);
    }
  }
};

async function sendVaccinationReminder(owner, pet, vaccines) {
  const message = `Reminder: ${pet.name} is due for ${vaccines.map(v => v.vaccineType).join(', ')}`;
  
  if (owner.notificationPreferences.vaccinationReminders.channel === 'email') {
    await sendEmail(owner.email, 'Vaccination Due', message);
  }
}