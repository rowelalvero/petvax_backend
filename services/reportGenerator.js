// services/reportGenerator.js
const PDFDocument = require('pdfkit');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');

// PDF Generator
exports.generatePDF = async (type, data) => {
  const doc = new PDFDocument();
  const fileName = `report-${type}-${Date.now()}.pdf`;
  const path = `./reports/${fileName}`;
  
  doc.pipe(fs.createWriteStream(path));
  
  // Header
  doc.fontSize(18).text(`${type.toUpperCase()} REPORT`, { align: 'center' });
  doc.moveDown();
  
  // Dynamic content based on type
  switch (type) {
    case 'appointments':
      data.forEach(appt => {
        doc.text(`Pet: ${appt.pet.name}`);
        doc.text(`Vet: ${appt.veterinarian.name}`);
        doc.text(`Date: ${appt.date.toDateString()}`);
        doc.moveDown();
      });
      break;
      
    case 'revenue':
      data.forEach(item => {
        doc.text(`${item._id}: ₱${item.total.toFixed(2)}`);
      });
      break;
  }
  
  doc.end();
  return fileName;
};

// CSV Generator
exports.generateCSV = async (type, data) => {
  const fileName = `report-${type}-${Date.now()}.csv`;
  const path = `./reports/${fileName}`;
  
  let headers = [];
  let records = [];
  
  switch (type) {
    case 'appointments':
      headers = [
        { id: 'pet', title: 'PET' },
        { id: 'vet', title: 'VETERINARIAN' },
        { id: 'date', title: 'DATE' }
      ];
      records = data.map(appt => ({
        pet: appt.pet.name,
        vet: appt.veterinarian.name,
        date: appt.date.toISOString()
      }));
      break;
      
    case 'revenue':
      headers = [
        { id: 'method', title: 'PAYMENT METHOD' },
        { id: 'total', title: 'TOTAL (PHP)' }
      ];
      records = data.map(item => ({
        method: item._id,
        total: item.total
      }));
      break;
  }
  
  const csvWriter = createObjectCsvWriter({ path, headers });
  await csvWriter.writeRecords(records);
  return fileName;
};