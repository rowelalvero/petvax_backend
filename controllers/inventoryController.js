// controller/intakeFormController.js
const Inventory = require('../models/Inventory');
const AppError = require('../utils/appError');

// Get clinic inventory
exports.getInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.findOne({ clinic: req.user.clinicId });
    res.status(200).json({
      status: 'success',
      data: { inventory }
    });
  } catch (err) {
    next(err);
  }
};

// Update stock levels
exports.updateStock = async (req, res, next) => {
  try {
    const { itemName, adjustment, expiryDate } = req.body;
    
    const inventory = await Inventory.findOne({ clinic: req.user.clinicId });
    const item = inventory.items.find(i => i.name === itemName);
    
    if (!item) throw new AppError('Item not found', 404);
    
    item.stock += adjustment;
    if (expiryDate) item.expiryDate = expiryDate;
    item.lastRestocked = new Date();
    
    await inventory.save();
    
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

// Get active alerts
exports.getAlerts = async (req, res, next) => {
  try {
    const alerts = await InventoryAlert.find({
      clinic: req.user.clinicId,
      resolved: false
    }).sort('-createdAt');
    
    res.status(200).json({
      status: 'success',
      data: { alerts }
    });
  } catch (err) {
    next(err);
  }
};