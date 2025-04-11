// controllers/telemedicineController.js
const axios = require('axios');
const Appointment = require('../models/Appointment');
const Pet = require('../models/Pet');
const AppError = require('../utils/appError');

// Initialize video consultation
exports.initiateConsultation = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('veterinarian', 'firstName lastName')
      .populate('pet', 'name');

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // === Jitsi Meeting Creation (or Zoom/API) ===
    const meetingId = `petvax-${appointment._id}-${Date.now()}`;
    const joinUrl = `https://meet.jit.si/${meetingId}`;
    const startUrl = `${joinUrl}?config.startWithVideoMuted=true`;

    // Update appointment
    appointment.telemedicine = {
      type: 'scheduled',
      meetingId,
      joinUrl,
      startUrl
    };
    await appointment.save();

    // Send notifications
    await sendConsultationLinks(appointment);

    res.status(200).json({
      status: 'success',
      data: {
        meetingId,
        joinUrl,
        startUrl
      }
    });
  } catch (err) {
    next(err);
  }
};

// Complete consultation (vet only)
exports.completeConsultation = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const { diagnosis, prescription } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Update telemedicine status
    appointment.telemedicine.type = 'completed';
    appointment.telemedicine.prescription = {
      ...prescription,
      signedBy: req.user.id
    };
    await appointment.save();

    // Add to pet's medical records
    await Pet.findByIdAndUpdate(
      appointment.pet,
      {
        $push: {
          medicalHistory: {
            recordType: 'consultation',
            description: diagnosis,
            veterinarian: req.user.id,
            clinic: req.user.clinicId,
            details: {
              type: 'video',
              recordingUrl: appointment.telemedicine.recordingUrl,
              prescription: appointment.telemedicine.prescription
            }
          }
        }
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        appointment
      }
    });
  } catch (err) {
    next(err);
  }
};

// Helper: Send meeting links via SMS/Email
async function sendConsultationLinks(appointment) {
  const vet = appointment.veterinarian;
  const message = `
    Telemedicine Session Ready
    Pet: ${appointment.pet.name}
    Vet: ${vet.firstName} ${vet.lastName}
    Join: ${appointment.telemedicine.joinUrl}
  `;

  // Send to owner
  await sendSMS(appointment.user.phoneNumber, message);
  await sendEmail(appointment.user.email, 'Telemedicine Session', message);

  // Send vet-specific link (with moderator controls)
  await sendEmail(vet.email, 'Telemedicine Session', `
    Start your consultation: ${appointment.telemedicine.startUrl}
  `);
}