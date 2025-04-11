// controller/reportController.js
const Report = require('../models/Report');
const AppError = require('../utils/appError');
const { generatePDF, generateCSV } = require('../services/reportGenerator');

// Generate new report
exports.generateReport = async (req, res, next) => {
  try {
    const { type, filters, format } = req.body;
    
    // 1. Validate template exists
    const template = await ReportTemplate.findOne({ name: type });
    if (!template) throw new AppError('Invalid report type', 400);

    // 2. Apply default filters if missing
    const finalFilters = { ...template.defaultFilters, ...filters };
    
    // 3. Fetch data based on type
    const data = await this.fetchReportData(type, finalFilters, req.user.clinicId);

    // 4. Generate file
    let filePath;
    if (format === 'pdf') {
      filePath = await generatePDF(type, data);
    } else {
      filePath = await generateCSV(type, data);
    }

    // 5. Save report record
    const report = await Report.create({
      clinic: req.user.clinicId,
      type,
      filters: finalFilters,
      generatedBy: req.user.id,
      format,
      downloadUrl: `/reports/download/${filePath}`
    });

    res.status(201).json({
      status: 'success',
      data: { report }
    });
  } catch (err) {
    next(err);
  }
};

// Helper: Fetch data based on report type
exports.fetchReportData = async (type, filters, clinicId) => {
  switch (type) {
    case 'appointments':
      return Appointment.find({ clinic: clinicId, ...filters })
        .populate('pet veterinarian');
      
    case 'revenue':
      return Payment.aggregate([
        { $match: { clinic: clinicId, ...filters } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' } } }
      ]);
      
    case 'inventory':
      return Inventory.findOne({ clinic: clinicId })
        .then(inv => inv.items.filter(item => 
          item.stock < (filters?.threshold || item.threshold)
        ));
      
    default:
      throw new AppError('Unsupported report type', 400);
  }
};