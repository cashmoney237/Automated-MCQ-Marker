const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

// Reference the stores from grading router
const gradingRouter = require('./grading');
const resultStore = gradingRouter.resultStore;
const examStore = gradingRouter.examStore;

// Generate JSON report
router.get('/json/:resultId', (req, res) => {
  const result = resultStore[req.params.resultId];
  if (!result) return res.status(404).json({ error: 'Result not found' });

  res.setHeader('Content-Disposition', `attachment; filename="report-${result.studentName.replace(/\s+/g, '_')}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(result);
});

// Generate PDF report
router.get('/pdf/:resultId', (req, res) => {
  const result = resultStore[req.params.resultId];
  if (!result) return res.status(404).json({ error: 'Result not found' });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Disposition', `attachment; filename="report-${result.studentName.replace(/\s+/g, '_')}.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  // Header
  doc.rect(0, 0, doc.page.width, 80).fill('#1a1a2e');
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
    .text('MCQ GRADING REPORT', 50, 25);
  doc.fontSize(10).font('Helvetica')
    .text(`Generated: ${new Date().toLocaleString()}`, 50, 55);

  // Grade badge
  const gradeColors = { 'A+': '#00b894', 'A': '#00cec9', 'B': '#0984e3', 'C': '#fdcb6e', 'D': '#e17055', 'F': '#d63031' };
  const gradeColor = gradeColors[result.grade] || '#636e72';
  doc.rect(doc.page.width - 120, 15, 70, 50).fill(gradeColor).stroke();
  doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold')
    .text(result.grade, doc.page.width - 110, 22);

  doc.moveDown(3);

  // Student info box
  doc.fillColor('#1a1a2e').fontSize(14).font('Helvetica-Bold').text('STUDENT INFORMATION', 50, 100);
  doc.moveTo(50, 116).lineTo(doc.page.width - 50, 116).stroke('#e0e0e0');

  doc.fontSize(11).font('Helvetica');
  const infoY = 124;
  doc.fillColor('#555').text('Student Name:', 50, infoY).fillColor('#111').font('Helvetica-Bold').text(result.studentName, 160, infoY);
  doc.fillColor('#555').font('Helvetica').text('Student ID:', 50, infoY + 18).fillColor('#111').font('Helvetica-Bold').text(result.studentId, 160, infoY + 18);
  doc.fillColor('#555').font('Helvetica').text('Exam:', 300, infoY).fillColor('#111').font('Helvetica-Bold').text(result.examTitle, 380, infoY);
  doc.fillColor('#555').font('Helvetica').text('Subject:', 300, infoY + 18).fillColor('#111').font('Helvetica-Bold').text(result.subject, 380, infoY + 18);

  // Score summary box
  doc.moveDown(1);
  const summaryY = 185;
  doc.rect(50, summaryY, doc.page.width - 100, 80).fill('#f8f9fa').stroke('#e0e0e0');

  doc.fillColor('#1a1a2e').fontSize(13).font('Helvetica-Bold').text('PERFORMANCE SUMMARY', 65, summaryY + 10);

  const metrics = [
    { label: 'Score', value: `${result.score}/${result.totalMarks}` },
    { label: 'Percentage', value: `${result.percentage}%` },
    { label: 'Correct', value: result.correct },
    { label: 'Incorrect', value: result.incorrect },
    { label: 'Unanswered', value: result.unanswered },
    { label: 'Status', value: result.passed ? 'PASSED' : 'FAILED' }
  ];

  metrics.forEach((m, i) => {
    const x = 65 + (i % 3) * 165;
    const y = summaryY + 30 + Math.floor(i / 3) * 22;
    doc.fontSize(10).font('Helvetica').fillColor('#777').text(m.label + ':', x, y);
    doc.font('Helvetica-Bold').fillColor(m.label === 'Status' ? (result.passed ? '#00b894' : '#d63031') : '#1a1a2e')
      .text(String(m.value), x + 75, y);
  });

  // Progress bar
  const barY = 280;
  doc.fontSize(10).font('Helvetica').fillColor('#555').text('Score Progress:', 50, barY);
  doc.rect(50, barY + 14, doc.page.width - 100, 12).fill('#e0e0e0');
  const barWidth = Math.max(0, Math.min(1, result.percentage / 100)) * (doc.page.width - 100);
  doc.rect(50, barY + 14, barWidth, 12).fill(result.passed ? '#00b894' : '#d63031');
  doc.fillColor('#333').text(`${result.percentage}%`, 50 + barWidth + 4, barY + 14);

  // Answer breakdown table
  doc.moveDown(2);
  const tableY = 320;
  doc.fillColor('#1a1a2e').fontSize(13).font('Helvetica-Bold').text('ANSWER BREAKDOWN', 50, tableY);
  doc.moveTo(50, tableY + 16).lineTo(doc.page.width - 50, tableY + 16).stroke('#e0e0e0');

  // Table header
  const cols = [50, 120, 210, 300, 390];
  const headers = ['Q#', 'Your Answer', 'Correct Answer', 'Status', 'Marks'];
  doc.rect(50, tableY + 20, doc.page.width - 100, 18).fill('#1a1a2e');
  headers.forEach((h, i) => {
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text(h, cols[i] + 3, tableY + 25);
  });

  let rowY = tableY + 40;
  result.breakdown.forEach((row, idx) => {
    if (rowY > doc.page.height - 80) {
      doc.addPage();
      rowY = 50;
    }
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
    doc.rect(50, rowY, doc.page.width - 100, 16).fill(bg);

    const statusColor = row.status === 'correct' ? '#00b894' : row.status === 'incorrect' ? '#d63031' : '#fdcb6e';
    doc.fillColor('#333').fontSize(9).font('Helvetica').text(String(row.question), cols[0] + 3, rowY + 4);
    doc.text(row.given, cols[1] + 3, rowY + 4);
    doc.text(row.expected, cols[2] + 3, rowY + 4);
    doc.fillColor(statusColor).font('Helvetica-Bold').text(row.status.toUpperCase(), cols[3] + 3, rowY + 4);
    doc.fillColor('#333').font('Helvetica').text(row.marks > 0 ? `+${row.marks.toFixed(1)}` : '0', cols[4] + 3, rowY + 4);

    rowY += 17;
  });

  // Footer
  const footerY = doc.page.height - 40;
  doc.moveTo(50, footerY - 10).lineTo(doc.page.width - 50, footerY - 10).stroke('#e0e0e0');
  doc.fillColor('#999').fontSize(9).font('Helvetica')
    .text('MCQ Grading System — Automated Assessment Report', 50, footerY, { align: 'center' });

  doc.end();
});

// Get all results summary
router.get('/all', (req, res) => {
  const results = Object.entries(resultStore).map(([id, r]) => ({
    resultId: id,
    studentName: r.studentName,
    studentId: r.studentId,
    examTitle: r.examTitle,
    score: r.score,
    totalMarks: r.totalMarks,
    percentage: r.percentage,
    grade: r.grade,
    passed: r.passed,
    gradedAt: r.gradedAt
  }));
  res.json({ results });
});

module.exports = router;
