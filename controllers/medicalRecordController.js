// controllers/medicalRecordController.js
const Pet = require('../models/Pet');
const AppError = require('../utils/appError');

// Add a new medical record
exports.addMedicalRecord = async (req, res, next) => {
  try {
    const { petId } = req.params;
    const { recordType, description, dateAdministered, details } = req.body;

    // Validate required fields
    if (!recordType || !description) {
      throw new AppError('Record type and description are required', 400);
    }

    const pet = await Pet.findByIdAndUpdate(
      petId,
      {
        $push: {
          medicalHistory: {
            recordType,
            description,
            dateAdministered: dateAdministered || Date.now(),
            veterinarian: req.user.id,  // Logged-in vet
            clinic: req.user.clinicId,  // Vet's clinic
            details
          }
        }
      },
      { new: true, runValidators: true }
    );

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    res.status(201).json({
      status: 'success',
      data: {
        pet
      }
    });
  } catch (err) {
    next(err);
  }
};

// Add vaccination record
exports.addVaccination = async (req, res, next) => {
  try {
    const { petId } = req.params;
    const { vaccineType, nextDueDate, lotNumber, notes } = req.body;

    if (!vaccineType) {
      throw new AppError('Vaccine type is required', 400);
    }

    const pet = await Pet.findByIdAndUpdate(
      petId,
      {
        $push: {
          vaccinationRecords: {
            vaccineType,
            dateAdministered: Date.now(),
            nextDueDate,
            administeredBy: req.user.id,
            clinic: req.user.clinicId,
            lotNumber,
            notes
          }
        }
      },
      { new: true, runValidators: true }
    );

    res.status(201).json({
      status: 'success',
      data: {
        pet
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get full medical history
exports.getMedicalHistory = async (req, res, next) => {
  try {
    const { petId } = req.params;

    const pet = await Pet.findById(petId)
      .populate('medicalHistory.veterinarian', 'firstName lastName')
      .populate('vaccinationRecords.administeredBy', 'firstName lastName');

    if (!pet) {
      throw new AppError('Pet not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        medicalHistory: pet.medicalHistory,
        vaccinationRecords: pet.vaccinationRecords
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get upcoming vaccinations
exports.getUpcomingVaccinations = async (req, res, next) => {
  try {
    const { userId } = req.params;  // Pet owner's ID

    const pets = await Pet.find({ owner: userId })
      .select('name vaccinationRecords');

    const upcomingVaccines = pets.flatMap(pet => 
      pet.vaccinationRecords
        .filter(vaccine => vaccine.nextDueDate >= new Date())
        .map(vaccine => ({
          petName: pet.name,
          ...vaccine.toObject()
        }))
    );

    res.status(200).json({
      status: 'success',
      data: {
        upcomingVaccines
      }
    });
  } catch (err) {
    next(err);
  }
};