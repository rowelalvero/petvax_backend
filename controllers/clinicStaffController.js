// controller/clinicStaffController.js
const AppointmentQueue = require('../models/AppointmentQueue');
const AppError = require('../utils/appError');

// Get live queue for a clinic
exports.getClinicQueue = async (req, res, next) => {
  try {
    const queue = await AppointmentQueue.findOne({ clinic: req.user.clinicId })
      .populate({
        path: 'appointments.appointment',
        populate: [
          { path: 'pet', select: 'name species' },
          { path: 'user', select: 'firstName lastName' }
        ]
      });

    if (!queue) throw new AppError('Queue not found', 404);

    res.status(200).json({
      status: 'success',
      data: { queue }
    });
  } catch (err) {
    next(err);
  }
};

// Update appointment status in queue
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { appointmentId, status, roomNumber } = req.body;
    const queue = await AppointmentQueue.findOne({ clinic: req.user.clinicId });

    if (!queue) throw new AppError('Queue not found', 404);

    const appointment = queue.appointments.find(
      item => item.appointment.toString() === appointmentId
    );

    if (!appointment) throw new AppError('Appointment not in queue', 404);

    appointment.status = status;
    if (status === 'in-progress') appointment.roomNumber = roomNumber;
    if (status === 'completed') appointment.completedAt = new Date();

    await queue.save();

    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

// Submit intake form (pet owner)
exports.submitIntakeForm = async (req, res, next) => {
    try {
      const { appointmentId, answers } = req.body;
  
      const form = await IntakeForm.create({
        appointment: appointmentId,
        answers
      });
  
      res.status(201).json({
        status: 'success',
        data: { form }
      });
    } catch (err) {
      next(err);
    }
  };
  
  // Get forms for an appointment
  exports.getIntakeForms = async (req, res, next) => {
    try {
      const forms = await IntakeForm.find({ 
        appointment: req.params.appointmentId 
      });
  
      res.status(200).json({
        status: 'success',
        data: { forms }
      });
    } catch (err) {
      next(err);
    }
  };

  // Create prescription
exports.createPrescription = async (req, res, next) => {
    try {
      const { appointmentId, medications, notes } = req.body;
      const appointment = await Appointment.findById(appointmentId);
  
      if (!appointment) throw new AppError('Appointment not found', 404);
  
      const prescription = await Prescription.create({
        appointment: appointmentId,
        pet: appointment.pet,
        veterinarian: req.user.id,
        medications,
        notes
      });
  
      res.status(201).json({
        status: 'success',
        data: { prescription }
      });
    } catch (err) {
      next(err);
    }
  };
  
  // Get prescription PDF
  exports.getPrescriptionPDF = async (req, res, next) => {
    try {
      const prescription = await Prescription.findById(req.params.id);
      const pdfPath = `./prescriptions/${prescription._id}.pdf`;
  
      res.download(pdfPath, `prescription-${prescription._id}.pdf`);
    } catch (err) {
      next(err);
    }
  };