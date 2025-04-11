// services/prescriptionService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');

exports.generatePrescriptionPDF = async (prescription) => {
  const doc = new PDFDocument();
  const path = `./prescriptions/${prescription._id}.pdf`;
  const stream = fs.createWriteStream(path);

  doc.pipe(stream);

  // Header
  doc.fontSize(18).text('PETVAX CLINIC', { align: 'center' });
  doc.fontSize(14).text('OFFICIAL PRESCRIPTION', { align: 'center' });
  doc.moveDown();

  // Medications
  doc.fontSize(12).text('Medications:', { underline: true });
  prescription.medications.forEach(med => {
    doc.text(`${med.name} - ${med.dosage}`);
    doc.text(`Frequency: ${med.frequency}`);
    doc.text(`Duration: ${med.duration}`);
    doc.text(`Instructions: ${med.instructions}`);
    doc.moveDown();
  });

  // Footer
  doc.text(`Prescribed by: Dr. ${prescription.veterinarian.lastName}`);
  doc.text(`Date: ${prescription.issuedAt.toDateString()}`);

  doc.end();
};