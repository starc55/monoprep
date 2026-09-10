import { PDFDocument } from 'pdf-lib';
import { ApiError } from '../utils/apiError.js';

export const PDF_VISION_BATCH_PAGES = 12;

export async function buildPdfVisionChunks(buffer, pageNumbers) {
  if (!pageNumbers.length) return [];

  try {
    const source = await PDFDocument.load(buffer, { updateMetadata: false });
    const validPages = [...new Set(pageNumbers)]
      .filter((pageNumber) => Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= source.getPageCount())
      .sort((left, right) => left - right);
    const chunks = [];

    for (let offset = 0; offset < validPages.length; offset += PDF_VISION_BATCH_PAGES) {
      const chunkPageNumbers = validPages.slice(offset, offset + PDF_VISION_BATCH_PAGES);
      const document = await PDFDocument.create();
      const copiedPages = await document.copyPages(source, chunkPageNumbers.map((pageNumber) => pageNumber - 1));
      copiedPages.forEach((page) => document.addPage(page));
      const bytes = await document.save({ useObjectStreams: true });
      chunks.push({
        pageNumbers: chunkPageNumbers,
        fileData: `data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}`
      });
    }

    return chunks;
  } catch {
    throw new ApiError(400, 'Scanned PDF pages could not be prepared for visual reading.');
  }
}
