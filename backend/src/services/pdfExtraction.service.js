import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ApiError } from '../utils/apiError.js';

const MAX_PDF_PAGES = 250;
const OCR_TEXT_THRESHOLD = 40;

function normalizeLine(value) {
  return value.replace(/[ \t]+/g, ' ').trim();
}

function extractPageLines(items) {
  const lines = [];
  let currentLine = '';
  let previousY = null;
  let previousEndX = null;

  function finishLine() {
    const normalized = normalizeLine(currentLine);
    if (normalized) lines.push(normalized);
    currentLine = '';
    previousEndX = null;
  }

  for (const item of items) {
    if (typeof item?.str !== 'string') continue;
    const text = item.str.trim();
    const x = Number(item.transform?.[4] || 0);
    const y = Number(item.transform?.[5] || 0);
    const height = Math.max(1, Number(item.height || 0));
    const movedToNewLine = previousY !== null && Math.abs(y - previousY) > Math.max(2, height * 0.55);

    if (movedToNewLine) finishLine();
    if (text) {
      const needsSpace = currentLine && previousEndX !== null && x - previousEndX > 1;
      currentLine += `${needsSpace ? ' ' : ''}${text}`;
      previousEndX = x + Number(item.width || 0);
    }
    previousY = y;
    if (item.hasEOL) finishLine();
  }

  finishLine();
  return lines.join('\n');
}

export async function extractPdfPages(buffer) {
  let document;
  try {
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true,
      isEvalSupported: false
    });
    document = await loadingTask.promise;

    if (document.numPages > MAX_PDF_PAGES) {
      throw new ApiError(400, `PDF must contain ${MAX_PDF_PAGES} pages or fewer.`);
    }

    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent({ includeMarkedContent: false });
      const text = extractPageLines(content.items);
      const characterCount = text.replace(/\s/g, '').length;
      pages.push({
        pageNumber,
        text,
        characterCount,
        ocrNeeded: characterCount < OCR_TEXT_THRESHOLD
      });
      page.cleanup();
    }

    return {
      pageCount: document.numPages,
      pages,
      extractedCharacterCount: pages.reduce((total, page) => total + page.text.length, 0),
      ocrNeededPages: pages.filter((page) => page.ocrNeeded).map((page) => page.pageNumber)
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'Text could not be extracted from this PDF. Check that the file is valid and not encrypted.');
  } finally {
    if (document) {
      await document.destroy().catch(() => undefined);
    }
  }
}
