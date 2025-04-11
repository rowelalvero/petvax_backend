// controller/serviceController.js
const Service = require('../models/Service');
const Clinic = require('../models/Clinic');
const AppError = require('../utils/appError');

// 1. Create Service (Admin/Clinic Owner)
exports.createService = async (req, res, next) => {
  try {
    const { name, description, basePrice, durationMinutes, category } = req.body;

    const newService = await Service.create({
      name,
      description,
      basePrice,
      durationMinutes,
      category
    });

    res.status(201).json({
      status: 'success',
      data: {
        service: newService
      }
    });
  } catch (err) {
    next(err);
  }
};

// 2. Add Service to Clinic (Clinic Owner/Admin)
exports.addServiceToClinic = async (req, res, next) => {
  try {
    const { clinicId, serviceId, variantName, variantPrice } = req.body;

    // Validate clinic ownership
    if (req.user.role === 'clinic_owner' && req.user.clinicId.toString() !== clinicId) {
      throw new AppError('You do not own this clinic', 403);
    }

    const clinic = await Clinic.findByIdAndUpdate(
      clinicId,
      {
        $addToSet: { 
          services: {
            service: serviceId,
            variants: [{ name: variantName, price: variantPrice }]
          }
        }
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        clinic
      }
    });
  } catch (err) {
    next(err);
  }
};