// models/Inventory.js
const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['vaccine', 'medication', 'supply'], 
    required: true 
  },
  stock: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  threshold: { 
    type: Number, 
    default: 5 
  },
  lastRestocked: Date,
  expiryDate: Date,
  supplier: String,
  barcode: String
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  clinic: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Clinic', 
    required: true 
  },
  items: [inventoryItemSchema]
}, { timestamps: true });

// Generate alerts when stock is low
inventorySchema.post('save', async function(doc) {
  const Alert = require('./InventoryAlert');
  
  doc.items.forEach(async (item) => {
    if (item.stock < item.threshold) {
      await Alert.create({
        clinic: doc.clinic,
        itemName: item.name,
        message: `Low stock alert: ${item.name} (${item.stock} remaining)`,
        priority: item.type === 'vaccine' ? 'high' : 'medium'
      });
    }
  });
});

module.exports = mongoose.model('Inventory', inventorySchema);