import { ApiError } from '../utils/apiError.js';

const MAX_PDF_PAGES = 250;
const OCR_TEXT_THRESHOLD = 40;
const MIN_USEFUL_WORDS = 6;
const REPEATED_LINE_THRESHOLD = 3;
let pdfJsPromise;

async function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      const canvas = await import('@napi-rs/canvas');
      globalThis.DOMMatrix ||= canvas.DOMMatrix;
      globalThis.ImageData ||= canvas.ImageData;
      globalThis.Path2D ||= canvas.Path2D;
      return import('pdfjs-dist/legacy/build/pdf.mjs');
    })();
  }

  return pdfJsPromise;
}

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

function isWatermarkToken(value) {
  const token = value.replace(/^[^\p{L}\p{N}@]+|[^\p{L}\p{N}._@:/-]+$/gu, '');
  if (!token) return true;
  return /^(?:https?:\/\/\S+|www\.\S+|@[\p{L}\p{N}_.-]+|[a-z]?\d?sat|sat|at)$/iu.test(token);
}

function isWatermarkOnlyLine(line) {
  const tokens = normalizeLine(line).split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every(isWatermarkToken);
}

export function hasUsablePdfTextLayer(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  if (!lines.length) return false;

  const frequencies = new Map();
  for (const line of lines) {
    const key = line.toLocaleLowerCase('en-US');
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  }

  const usefulText = lines
    .filter((line) => !isWatermarkOnlyLine(line))
    .filter((line) => frequencies.get(line.toLocaleLowerCase('en-US')) < REPEATED_LINE_THRESHOLD)
    .join(' ');
  const usefulCharacterCount = usefulText.replace(/\s/g, '').length;
  if (usefulCharacterCount < OCR_TEXT_THRESHOLD) return false;

  const words = usefulText.match(/[\p{L}\p{N}]+/gu) || [];
  const mathCharacters = usefulText.match(/[\d=+\-*/^<>%()[\]{}]/g) || [];
  return words.length >= MIN_USEFUL_WORDS || mathCharacters.length >= 12;
}

export async function extractPdfPages(buffer) {
  let document;
  try {
    const { getDocument } = await loadPdfJs();
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
        ocrNeeded: !hasUsablePdfTextLayer(text)
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
