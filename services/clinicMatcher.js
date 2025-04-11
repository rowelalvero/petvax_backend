// services/clinicMatcher.js
const Appointment = require('../models/Appointment');
const { calculateEndTime } = require('../utils/timeUtils');
const Clinic = require('../models/Clinic');

exports.findBestClinics = async (assessmentResult, userLocation, timePreferences) => {
  const { urgency, suggestedClinics, estimatedDuration } = assessmentResult;
  
  // Base query
  const query = {
    isActive: true,
    ...(suggestedClinics && { specialties: { $in: suggestedClinics } })
  };

  // Add urgency-specific filters
  if (urgency === 'emergency') {
    query.emergencySupport = true;
    query['operatingHours.is24Hours'] = true;
  }

  // Find matching clinics
  let clinics = await Clinic.find(query).lean();
  
  // Check availability for each clinic
  const clinicsWithAvailability = await Promise.all(
    clinics.map(async clinic => {
      const availableSlots = await this.checkClinicAvailability(
        clinic._id,
        estimatedDuration,
        urgency,
        timePreferences
      );
      
      return {
        ...clinic,
        availableSlots,
        nextAvailable: availableSlots[0] || null
      };
    })
  );

  // Filter out clinics with no availability
  const availableClinics = clinicsWithAvailability.filter(
    clinic => clinic.availableSlots.length > 0
  );

  // Score and sort clinics
  return availableClinics.map(clinic => ({
    ...clinic,
    score: calculateClinicScore(clinic, assessmentResult, userLocation)
  })).sort((a, b) => b.score - a.score);
};

exports.checkClinicAvailability = async (clinicId, durationMinutes, urgency, timePreferences = {}) => {
  const clinic = await Clinic.findById(clinicId);
  const now = new Date();
  
  // Determine time window based on urgency
  let startDate, endDate;
  if (urgency === 'emergency') {
    // Emergency - look for slots in next 2 hours
    startDate = new Date(now);
    endDate = new Date(now.setHours(now.getHours() + 2));
  } else if (urgency === 'urgent') {
    // Urgent - today or tomorrow
    startDate = new Date(now);
    endDate = new Date(now.setDate(now.getDate() + 1));
  } else {
    // Routine - next 7 days
    startDate = new Date(now);
    endDate = new Date(now.setDate(now.getDate() + 7));
  }

  // Get existing appointments
  const appointments = await Appointment.find({
    clinic: clinicId,
    date: { $gte: startDate, $lte: endDate },
    status: { $in: ['confirmed', 'pending'] }
  }).sort('date startTime');

  // Generate available slots
  const slots = [];
  const slotDuration = durationMinutes || 30; // Default 30 minutes if not specified
  
  // Convert operating hours to minutes for easier calculation
  const [openHour, openMinute] = clinic.operatingHours.openingTime.split(':').map(Number);
  const [closeHour, closeMinute] = clinic.operatingHours.closingTime.split(':').map(Number);
  const openTimeMinutes = openHour * 60 + openMinute;
  const closeTimeMinutes = closeHour * 60 + closeMinute;
  
  // Check each day in the range
  for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
    // Skip if clinic is closed (you might have weekly schedule in clinic model)
    if (!isClinicOpen(clinic, day)) continue;
    
    const dayAppointments = appointments.filter(a => 
      a.date.toDateString() === day.toDateString()
    );
    
    // Generate time slots for this day
    let currentTime = openTimeMinutes;
    while (currentTime + slotDuration <= closeTimeMinutes) {
      const slotStart = new Date(day);
      slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotStart.getMinutes() + slotDuration);
      
      // Check if slot is available
      const isAvailable = !dayAppointments.some(appt => {
        const apptStart = new Date(appt.date);
        const [apptHour, apptMinute] = appt.startTime.split(':').map(Number);
        apptStart.setHours(apptHour, apptMinute, 0, 0);
        
        const apptEnd = new Date(apptStart);
        apptEnd.setMinutes(apptStart.getMinutes() + appt.durationMinutes);
        
        return (
          (slotStart >= apptStart && slotStart < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (slotStart <= apptStart && slotEnd >= apptEnd)
        );
      });
      
      if (isAvailable) {
        slots.push({
          date: new Date(day), // Clone to avoid reference issues
          startTime: `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`,
          endTime: calculateEndTime(
            `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}`,
            slotDuration
          )
        });
        
        // For emergency cases, return first available slot immediately
        if (urgency === 'emergency') {
          return slots;
        }
      }
      
      currentTime += 15; // Check every 15 minutes
    }
  }
  
  return slots;
};

function isClinicOpen(clinic, date) {
  // Implement logic based on clinic's operating schedule
  // This could check weekly schedule, holidays, etc.
  return true; // Simplified for example
}

function calculateClinicScore(clinic, assessment, userLocation) {
  let score = 0;
  
  // Specialty match (50% of score)
  if (assessment.suggestedClinics) {
    const specialtyMatch = clinic.specialties.some(s => 
      assessment.suggestedClinics.includes(s)
    );
    score += specialtyMatch ? 50 : 0;
  }
  
  // Emergency support (20% if emergency)
  if (assessment.urgency === 'emergency' && clinic.emergencySupport) {
    score += 20;
  }
  
  // Proximity (30% if location known)
  if (userLocation && clinic.location) {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      clinic.location.coordinates[1],
      clinic.location.coordinates[0]
    );
    score += Math.max(0, 30 - (distance / 1000)); // Decrease by 1 point per km
  }
  
  return score;
}

// Helper: Calculate distance in meters using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}