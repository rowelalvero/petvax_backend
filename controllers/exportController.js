// controllers/exportController.js
const PDFDocument = require('pdfkit');
const { createObjectCsvWriter } = require('csv-writer');
const ClinicAnalytics = require('../models/ClinicAnalytics');
const AppError = require('../utils/appError');

exports.exportAnalytics = async (req, res, next) => {
  try {
    const { clinicId, format, range } = req.body;
    
    if (!['pdf', 'csv'].includes(format)) {
      throw new AppError('Invalid export format', 400);
    }

    const data = await ClinicAnalytics.find({
      clinic: clinicId,
      date: getDateRange(range)
    }).sort('date');

    if (format === 'pdf') {
      return generatePDF(res, data);
    } else {
      return generateCSV(res, data);
    }

  } catch (err) {
    next(err);
  }
};

// Helper: Generate PDF Report
async function generatePDF(res, data) {
  const doc = new PDFDocument();
  
  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=clinic-report.pdf');
  
  doc.pipe(res);
  
  // PDF Content
  doc.fontSize(18).text('Clinic Analytics Report', { align: 'center' });
  doc.moveDown();
  
  data.forEach(day => {
    doc.fontSize(14).text(`Date: ${day.date.toLocaleDateString()}`);
    doc.fontSize(12).text(`Appointments: ${day.metrics.appointments.total}`);
    doc.text(`Revenue: ₱${day.metrics.revenue.total.toLocaleString()}`);
    doc.moveDown();
  });
  
  doc.end();
}

// Helper: Generate CSV Report
async function generateCSV(res, data) {
  const csvWriter = createObjectCsvWriter({
    path: 'temp-report.csv',
    header: [
      { id: 'date', title: 'DATE' },
      { id: 'appointments', title: 'APPOINTMENTS' },
      { id: 'revenue', title: 'REVENUE (PHP)' }
    ]
  });

  const records = data.map(day => ({
    date: day.date.toLocaleDateString(),
    appointments: day.metrics.appointments.total,
    revenue: day.metrics.revenue.total
  }));

  await csvWriter.writeRecords(records);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=clinic-report.csv');
  require('fs').createReadStream('temp-report.csv').pipe(res);
}

// Helper: Calculate date range
function getDateRange(range) {
  const now = new Date();
  switch (range) {
    case '7d': return { $gte: new Date(now.setDate(now.getDate() - 7)) };
    case '30d': return { $gte: new Date(now.setDate(now.getDate() - 30)) };
    default: return {};
  }
}