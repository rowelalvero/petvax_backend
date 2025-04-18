// utils/staffUtils.js
const crypto = require('crypto');

exports.generateRandomPassword = () => {
  return crypto.randomBytes(8).toString('hex');
};

exports.sendWelcomeEmail = async (email, password) => {
  // Implement email sending logic using your email service
  const message = `Welcome to our clinic staff team!\n\nYour temporary password is: ${password}\nPlease change it after logging in.`;
  
  // Use your email service (like the one in services/emailService.js)
  await sendEmail({
    email,
    subject: 'Welcome to Clinic Staff',
    message
  });
};