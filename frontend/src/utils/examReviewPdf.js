import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

function safeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function drawSegmentBar(doc, x, y, width, percentage) {
  const segments = 7;
  const gap = 2;
  const segmentWidth = (width - gap * (segments - 1)) / segments;
  const filled = Math.max(0, Math.min(segments, Math.round(((Number(percentage) || 0) / 100) * segments)));

  for (let index = 0; index < segments; index += 1) {
    doc.setFillColor(index < filled ? 18 : 255, index < filled ? 24 : 255, index < filled ? 38 : 255);
    doc.setDrawColor(18, 24, 38);
    doc.rect(x + index * (segmentWidth + gap), y, segmentWidth, 4.5, 'FD');
  }
}

function drawDomainColumn(doc, x, y, width, title, domains = []) {
  doc.setTextColor(12, 22, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, x, y);

  domains.slice(0, 4).forEach((domain, index) => {
    const rowY = y + 12 + index * 27;
    doc.setFontSize(8.5);
    doc.text(safeText(domain.name), x, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    doc.text(`${domain.correct}/${domain.total} correct`, x, rowY + 5);
    drawSegmentBar(doc, x, rowY + 8, width, domain.accuracy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(12, 22, 38);
  });
}

function drawScoreColumn(doc, x, title, score) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(12, 22, 38);
  doc.text(title, x, 73);
  doc.setFontSize(28);
  doc.text(String(score), x, 91);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('/800', x + 27, 91);
}

export async function buildExamReviewPdf(report) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const platformUrl = report.platformUrl || window.location.origin;
  const readingDomains = (report.domains || []).filter((domain) => domain.subject === 'Reading & Writing');
  const mathDomains = (report.domains || []).filter((domain) => domain.subject === 'Math');

  doc.setTextColor(225, 231, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.text('MONOPREP', 52, 168, { angle: 35 });

  doc.setTextColor(10, 24, 47);
  doc.setFontSize(18);
  doc.text('MONO', 14, 18);
  doc.setTextColor(36, 94, 234);
  doc.text('Prep', 14, 25);

  doc.setTextColor(12, 22, 38);
  doc.setFontSize(10);
  doc.text(safeText(report.studentName), 49, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(safeText(report.examTitle), 49, 23);
  doc.text(`Submitted: ${safeText(report.submittedDate)}`, 49, 28);
  doc.text(`Testing time: ${safeText(report.timeSpent)}`, pageWidth - 14, 18, { align: 'right' });

  doc.setDrawColor(36, 94, 234);
  doc.setLineWidth(0.7);
  doc.line(14, 34, pageWidth - 14, 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(12, 22, 38);
  doc.text('Your MonoPrep SAT Report', 14, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Official-style score summary and knowledge profile for this attempt.', 14, 52);

  doc.setDrawColor(196, 203, 214);
  doc.roundedRect(14, 59, pageWidth - 28, 54, 2, 2, 'S');
  doc.line(58, 59, 58, 113);
  doc.line(130, 59, 130, 113);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(12, 22, 38);
  doc.text('TOTAL SCORE', 19, 70);
  doc.setFontSize(31);
  doc.text(String(report.totalScore), 19, 91);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('/1600', 44, 91);
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Score range: 400-1600', 19, 103);

  drawScoreColumn(doc, 66, 'Reading and Writing', report.readingScore);
  drawSegmentBar(doc, 66, 100, 52, report.readingProgress);
  drawScoreColumn(doc, 138, 'Math', report.mathScore);
  drawSegmentBar(doc, 138, 100, 52, report.mathProgress);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(12, 22, 38);
  doc.text('Knowledge and Skills', 14, 127);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('Performance across the eight SAT content domains.', 14, 133);

  drawDomainColumn(doc, 14, 145, 78, 'Reading and Writing', readingDomains);
  drawDomainColumn(doc, 111, 145, 78, 'Math', mathDomains);

  doc.setDrawColor(205, 211, 221);
  doc.roundedRect(14, 257, pageWidth - 28, 26, 2, 2, 'S');
  doc.setTextColor(12, 22, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Keep practicing with MonoPrep', 20, 267);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Scan to open the platform, practice questions, and MonoPrep resources.', 20, 273);
  doc.setTextColor(36, 94, 234);
  doc.text(safeText(platformUrl), 20, 278);

  const qrDataUrl = await QRCode.toDataURL(platformUrl, {
    margin: 0,
    width: 240,
    color: { dark: '#0c1626', light: '#ffffff' }
  });
  doc.addImage(qrDataUrl, 'PNG', pageWidth - 38, 260, 20, 20);
  return doc;
}

export async function downloadExamReviewPdf(report) {
  const doc = await buildExamReviewPdf(report);
  const filename = `${safeText(report.examTitle).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'SAT-Exam'}-MonoPrep-Report.pdf`;
  doc.save(filename);
}
