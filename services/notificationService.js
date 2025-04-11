const nodemailer = require('nodemailer');

// Configure Nodemailer (Email)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send Email
exports.sendEmail = async (to, subject, html) => {
  try {
    return await transporter.sendMail({
      from: `PetVax <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
  } catch (err) {
    console.error('Email sending failed:', err);
    throw err;
  }
};

// Appointment Reminder Content Generator
exports.generateReminderContent = (appointment) => {
  const email = `
    <h1>Upcoming Appointment Reminder</h1>
    <p><strong>Service:</strong> ${appointment.service.name}</p>
    <p><strong>Clinic:</strong> ${appointment.clinic.name}</p>
    <p><strong>Date:</strong> ${appointment.date.toDateString()}</p>
    <p><strong>Time:</strong> ${appointment.startTime}</p>
    <p><strong>Address:</strong> ${appointment.clinic.address}</p>
    <p>Please arrive 10 minutes early.</p>
  `;

  return { email };
};