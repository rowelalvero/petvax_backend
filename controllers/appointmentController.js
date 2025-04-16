// controllers/appointmentController.js
const Appointment = require('../models/Appointment');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const AppError = require('../utils/appError');
const Service = require('../models/Service');
const SymptomAssessment = require('../models/SymptomAssessment');
const { scheduleAppointmentReminder } = require('../services/reminderScheduler');

// Book Appointment (Pet Owner)
exports.bookAppointment = async (req, res, next) => {
  try {
    // 1. Handle symptom assessment integration
    let assessmentData = null;
    if (req.body.symptomAssessment) {
      const { diagnosis, urgency, recommendedServices, symptoms } = req.body.symptomAssessment;
      
      // Validate assessment data
      if (!diagnosis || !urgency || !recommendedServices || !symptoms) {
        throw new AppError('Invalid symptom assessment data', 400);
      }

      assessmentData = {
        diagnosis,
        urgency,
        recommendedServices,
        assessmentData: symptoms // Store original symptom data
      };

      // Auto-select first recommended service if none specified
      if (!req.body.serviceId && recommendedServices.length > 0) {
        req.body.serviceId = recommendedServices[0];
      }

      // Add diagnosis to notes if not provided
      if (!req.body.notes) {
        req.body.notes = `Symptom assessment: ${diagnosis}`;
      }
    }

    // 2. Validate required fields
    const { petId, clinicId, serviceId, date, startTime } = req.body;
    if (!petId || !clinicId || !serviceId || !date || !startTime) {
      throw new AppError('Missing required appointment fields', 400);
    }

    // 3. Validate clinic operating hours (existing code)
    const clinic = await Clinic.findById(clinicId);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [openHour] = clinic.operatingHours.openingTime.split(':').map(Number);
    const [closeHour] = clinic.operatingHours.closingTime.split(':').map(Number);

    if (startHour < openHour || startHour >= closeHour) {
      throw new AppError('Clinic is closed at this time', 400);
    }

    // 4. Auto-assign vet if needed (existing code)
    let veterinarian;
    const service = await Service.findById(serviceId);
    if (service.category !== 'grooming') {
      veterinarian = await User.findOne({
        clinicId,
        role: 'veterinarian',
        accountStatus: 'active'
      });
      if (!veterinarian) throw new AppError('No available veterinarians', 400);
    }

    // 5. Calculate end time (existing code)
    const endTime = calculateEndTime(startTime, service.durationMinutes);

    // 6. Create appointment with assessment data
    const newAppointment = await Appointment.create({
      pet: petId,
      clinic: clinicId,
      service: serviceId,
      veterinarian,
      date,
      startTime,
      endTime,
      notes: req.body.notes,
      user: req.user.id,
      symptomAssessment: assessmentData
    });

    // 7. Schedule reminders (existing code)
    await scheduleAppointmentReminder(newAppointment._id, req.user.id);

    res.status(201).json({
      status: 'success',
      data: {
        appointment: newAppointment
      }
    });

  } catch (err) {
    next(err);
  }
};

exports.bookFromAssessment = async (req, res, next) => {
  try {
    const { assessmentId, timePreferences } = req.body;
    
    // Get assessment results
    const assessment = await SymptomAssessment.findById(assessmentId)
      .populate('recommendedServices');
    
    // Find best clinics with real-time availability
    const matchedClinics = await clinicMatcher.findBestClinics(
      {
        urgency: assessment.urgency,
        suggestedClinics: assessment.suggestedClinics,
        estimatedDuration: assessment.estimatedDuration
      },
      req.body.userLocation,
      timePreferences
    );

    if (matchedClinics.length === 0) {
      throw new AppError('No suitable clinics with available slots found', 404);
    }

    // Prepare response with availability information
    const response = {
      status: 'success',
      data: {
        clinics: matchedClinics.map(clinic => ({
          _id: clinic._id,
          name: clinic.name,
          address: clinic.address,
          distance: clinic.distance,
          score: clinic.score,
          nextAvailable: clinic.nextAvailable,
          availableSlots: clinic.availableSlots.slice(0, 3) // Show first 3 slots
        })),
        assessmentSummary: {
          diagnosis: assessment.diagnosis,
          urgency: assessment.urgency
        }
      }
    };

    // If auto-booking enabled, proceed with booking
    if (req.body.autoBook) {
      const selectedClinic = matchedClinics[0];
      const appointmentData = {
        petId: req.body.petId,
        clinicId: selectedClinic._id,
        serviceId: assessment.recommendedServices[0]._id,
        date: selectedClinic.nextAvailable.date,
        startTime: selectedClinic.nextAvailable.startTime,
        symptomAssessment: {
          diagnosis: assessment.diagnosis,
          urgency: assessment.urgency,
          recommendedServices: assessment.recommendedServices.map(s => s._id),
          assessmentData: assessment.symptoms
        }
      };

      // Use existing booking logic
      return this.bookAppointment({ ...req, body: appointmentData }, res, next);
    }

    // Otherwise return clinic options
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

// Helper to find available slots based on urgency
exports.findAvailableSlots = async ({ clinicId, urgency, preferredTime, duration }) => {
  const clinic = await Clinic.findById(clinicId);
  
  // Different slot finding logic based on urgency
  switch (urgency) {
    case 'emergency':
      return this.findEmergencySlots(clinic, duration);
    case 'urgent':
      return this.findUrgentSlots(clinic, duration, preferredTime);
    default:
      return this.findRoutineSlots(clinic, duration, preferredTime);
  }
};

// Helper: Calculate end time
function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}