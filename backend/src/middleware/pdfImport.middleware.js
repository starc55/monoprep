import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

export const PDF_IMPORT_MAX_BYTES = 20 * 1024 * 1024;

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PDF_IMPORT_MAX_BYTES,
    files: 1,
    fields: 0,
    parts: 2,
    fieldNameSize: 50
  },
  fileFilter(_req, file, callback) {
    if (file.mimetype !== 'application/pdf') {
      callback(new ApiError(400, 'Only PDF files can be uploaded.'));
      return;
    }
    callback(null, true);
  }
});

export function sanitizePdfFileName(value = 'document.pdf') {
  const baseName = path.basename(String(value))
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  const stem = baseName.replace(/\.pdf$/i, '').slice(0, 160).trim() || 'document';
  return `${stem}.pdf`;
}

export async function validatePdfUploadFile(file) {
  if (!file) {
    throw new ApiError(400, 'Choose a PDF file to upload.');
  }
  if (file.size > PDF_IMPORT_MAX_BYTES) {
    throw new ApiError(400, 'PDF file must be 20 MB or smaller.');
  }
  if (file.mimetype !== 'application/pdf') {
    throw new ApiError(400, 'Only PDF files can be uploaded.');
  }
  if (path.extname(file.originalname || '').toLowerCase() !== '.pdf') {
    throw new ApiError(400, 'The uploaded file must have a .pdf extension.');
  }

  const detectedType = await fileTypeFromBuffer(file.buffer);
  if (detectedType?.mime !== 'application/pdf') {
    throw new ApiError(400, 'The uploaded file content is not a valid PDF.');
  }

  return sanitizePdfFileName(file.originalname);
}

function toUploadError(error) {
  if (error instanceof ApiError) return error;
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return new ApiError(400, 'PDF file must be 20 MB or smaller.');
  }
  if (error?.code?.startsWith('LIMIT_')) {
    return new ApiError(400, 'Upload exactly one PDF using the "file" field.');
  }
  return new ApiError(400, 'The PDF upload could not be processed.');
}

export function receivePdfImport(req, res, next) {
  pdfUpload.single('file')(req, res, async (uploadError) => {
    if (uploadError) {
      next(toUploadError(uploadError));
      return;
    }

    try {
      req.pdfFileName = await validatePdfUploadFile(req.file);
      next();
    } catch (error) {
      next(toUploadError(error));
    }
  });
}
