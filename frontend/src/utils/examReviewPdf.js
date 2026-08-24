function sanitizePdfText(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value = "") {
  return sanitizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfText(x, y, text, size = 10, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET\n`;
}

function pdfRect(x, y, width, height, mode = "S") {
  return `${x} ${y} ${width} ${height} re ${mode}\n`;
}

function pdfLine(x1, y1, x2, y2) {
  return `${x1} ${y1} m ${x2} ${y2} l S\n`;
}

function wrapText(value, maxCharacters) {
  const words = sanitizePdfText(value).split(" ").filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word.slice(0, maxCharacters);
    }
  });
  if (line) lines.push(line);
  return lines;
}

function pdfWrappedText(x, y, value, maxCharacters, lineHeight = 13, size = 9, font = "F1", maxLines = 4) {
  return wrapText(value, maxCharacters)
    .slice(0, maxLines)
    .map((line, index) => pdfText(x, y - index * lineHeight, line, size, font))
    .join("");
}

function createPdfDocument(pageStreams) {
  const objects = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pageStreams.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pageStreams.length} >>`
  );

  pageStreams.forEach((stream, index) => {
    const streamObjectId = 4 + index * 2;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${streamObjectId} 0 R >>`
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function addWatermark() {
  const placements = [
    [124, 215],
    [124, 472],
  ];
  let content = "q 0.94 0.96 0.99 rg\n";
  placements.forEach(([x, y]) => {
    content += `BT /F2 48 Tf 0.707 0.707 -0.707 0.707 ${x} ${y} Tm (MONO PREP) Tj ET\n`;
  });
  content += "Q\n";
  return content;
}

function addBrandHeader(report, pageNumber, pageCount) {
  let content = addWatermark();
  content += "0.03 0.08 0.18 rg\n";
  content += pdfText(48, 746, "MONO", 19, "F2");
  content += "0.15 0.39 0.92 rg\n";
  content += pdfText(48, 727, "Prep", 19, "F2");
  content += "0.03 0.08 0.18 rg\n";
  content += pdfText(144, 744, report.studentName, 10.5, "F2");
  content += pdfText(144, 728, report.examTitle, 9);
  content += pdfText(144, 714, `Submitted: ${report.submittedDate}`, 8.5);
  content += "0.15 0.39 0.92 RG 1.2 w\n";
  content += pdfLine(48, 694, 564, 694);
  content += "0.39 0.45 0.56 rg\n";
  content += pdfText(488, 728, `Page ${pageNumber} of ${pageCount}`, 8.5);
  return content;
}

function addSegmentBar(x, y, width, value, tone = "blue") {
  const colors = {
    blue: "0.15 0.39 0.92",
    green: "0.05 0.62 0.42",
    red: "0.88 0.18 0.25",
  };
  const filled = Math.min(8, Math.max(0, Math.ceil((Number(value) || 0) / 12.5)));
  const gap = 3;
  const segmentWidth = (width - gap * 7) / 8;
  let content = "";
  Array.from({ length: 8 }).forEach((_, index) => {
    if (index < filled) {
      content += `${colors[tone]} rg\n`;
      content += pdfRect(x + index * (segmentWidth + gap), y, segmentWidth, 8, "f");
    } else {
      content += "0.88 0.91 0.95 rg\n";
      content += pdfRect(x + index * (segmentWidth + gap), y, segmentWidth, 8, "f");
    }
  });
  return content;
}

function buildSummaryPage(report, pageCount) {
  let page = addBrandHeader(report, 1, pageCount);
  page += "0.03 0.08 0.18 rg\n";
  page += pdfText(48, 660, "Your MonoPrep SAT Report", 24, "F2");
  page += pdfText(48, 642, "Score summary and question-level performance from this attempt.", 9.5);

  page += "0.03 0.08 0.18 rg\n";
  page += pdfRect(48, 500, 200, 116, "f");
  page += "1 1 1 rg\n";
  page += pdfText(66, 592, "TOTAL SCORE", 9, "F2");
  page += pdfText(66, 542, String(report.totalScore), 40, "F2");
  page += "0.71 0.79 0.93 rg\n";
  page += pdfText(164, 544, "/1600", 13, "F2");
  page += pdfText(66, 516, `Time spent: ${report.timeSpent}`, 9);

  const sectionCards = [
    { x: 264, title: "Reading and Writing", score: report.readingScore, value: report.readingProgress },
    { x: 414, title: "Math", score: report.mathScore, value: report.mathProgress },
  ];
  sectionCards.forEach((card) => {
    page += "0.84 0.88 0.94 RG 1 w 1 1 1 rg\n";
    page += pdfRect(card.x, 500, 134, 116, "B");
    page += "0.03 0.08 0.18 rg\n";
    page += pdfText(card.x + 12, 590, card.title, 8.5, "F2");
    page += pdfText(card.x + 12, 548, String(card.score), 27, "F2");
    page += pdfText(card.x + 78, 550, "/800", 10);
    page += addSegmentBar(card.x + 12, 520, 110, card.value);
  });

  page += "0.03 0.08 0.18 rg\n";
  page += pdfText(48, 462, "Performance Summary", 16, "F2");
  const metrics = [
    ["Questions", report.totalQuestions, "blue"],
    ["Correct", report.correct, "green"],
    ["Incorrect", report.incorrect, "red"],
    ["Unanswered", report.unanswered, "blue"],
    ["Accuracy", `${report.accuracy}%`, "green"],
  ];
  metrics.forEach(([label, value], index) => {
    const x = 48 + index * 103;
    page += "0.85 0.89 0.94 RG 1 w 1 1 1 rg\n";
    page += pdfRect(x, 389, 93, 54, "B");
    page += "0.39 0.45 0.56 rg\n";
    page += pdfText(x + 9, 424, label, 8);
    page += "0.03 0.08 0.18 rg\n";
    page += pdfText(x + 9, 401, String(value), 16, "F2");
  });

  page += pdfText(48, 352, "Module Performance", 16, "F2");
  report.sections.slice(0, 4).forEach((section, index) => {
    const y = 306 - index * 48;
    page += "0.86 0.89 0.94 RG 1 w 1 1 1 rg\n";
    page += pdfRect(48, y, 516, 38, "B");
    page += "0.03 0.08 0.18 rg\n";
    page += pdfText(60, y + 23, section.title, 9, "F2");
    page += "0.39 0.45 0.56 rg\n";
    page += pdfText(344, y + 23, `${section.correct}/${section.total} correct`, 8.5);
    page += addSegmentBar(444, y + 15, 104, section.accuracy, section.accuracy >= 70 ? "green" : "blue");
  });

  if (report.feedback) {
    page += "0.03 0.08 0.18 rg\n";
    page += pdfText(48, 100, "MonoPrep Insight", 12, "F2");
    page += "0.22 0.28 0.38 rg\n";
    page += pdfWrappedText(48, 84, report.feedback, 94, 12, 8.5, "F1", 3);
  }
  page += "0.39 0.45 0.56 rg\n";
  page += pdfText(48, 36, "MonoPrep - Learn. Practice. Improve.", 8.5);
  return page;
}

function buildQuestionPages(report, pageCount) {
  const rowsPerPage = 18;
  const chunks = [];
  for (let index = 0; index < report.questions.length; index += rowsPerPage) {
    chunks.push(report.questions.slice(index, index + rowsPerPage));
  }
  if (!chunks.length) chunks.push([]);

  return chunks.map((questions, chunkIndex) => {
    const pageNumber = chunkIndex + 2;
    let page = addBrandHeader(report, pageNumber, pageCount);
    page += "0.03 0.08 0.18 rg\n";
    page += pdfText(48, 660, "Question Review", 22, "F2");
    page += pdfText(48, 642, "Submitted and correct answers for every question in this attempt.", 9);

    page += "0.03 0.08 0.18 rg\n";
    page += pdfRect(48, 604, 516, 24, "f");
    page += "1 1 1 rg\n";
    page += pdfText(58, 613, "#", 8, "F2");
    page += pdfText(82, 613, "SECTION / SKILL", 8, "F2");
    page += pdfText(310, 613, "YOUR ANSWER", 8, "F2");
    page += pdfText(410, 613, "CORRECT", 8, "F2");
    page += pdfText(506, 613, "STATUS", 8, "F2");

    questions.forEach((question, index) => {
      const y = 575 - index * 29;
      if (index % 2 === 0) {
        page += "0.97 0.98 1 rg\n";
        page += pdfRect(48, y - 7, 516, 28, "f");
      }
      page += "0.03 0.08 0.18 rg\n";
      page += pdfText(58, y + 3, String(question.number), 8.5, "F2");
      page += pdfText(82, y + 3, `${question.section} - ${question.skill}`.slice(0, 42), 8);
      page += pdfText(310, y + 3, question.studentAnswer.slice(0, 16), 8);
      page += pdfText(410, y + 3, question.correctAnswer.slice(0, 16), 8);
      page += question.status === "CORRECT" ? "0.05 0.55 0.35 rg\n" : question.status === "INCORRECT" ? "0.82 0.16 0.23 rg\n" : "0.64 0.42 0.05 rg\n";
      page += pdfText(506, y + 3, question.status, 7.5, "F2");
    });

    if (!questions.length) {
      page += "0.39 0.45 0.56 rg\n";
      page += pdfText(48, 570, "No question-level answers were available for this attempt.", 10);
    }
    page += "0.39 0.45 0.56 rg\n";
    page += pdfText(48, 36, "MonoPrep SAT Question Review", 8.5);
    return page;
  });
}

function downloadPdf(filename, content) {
  const blob = new Blob([content], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function buildExamReviewPdf(report) {
  const questionPageCount = Math.max(1, Math.ceil(report.questions.length / 18));
  const pageCount = 1 + questionPageCount;
  const pages = [buildSummaryPage(report, pageCount), ...buildQuestionPages(report, pageCount)];
  return createPdfDocument(pages);
}

export function downloadExamReviewPdf(report) {
  const filename = `${sanitizePdfText(report.examTitle).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "SAT-Exam"}-MonoPrep-Report.pdf`;
  downloadPdf(filename, buildExamReviewPdf(report));
}
