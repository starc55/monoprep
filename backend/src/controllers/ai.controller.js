import { randomUUID } from 'node:crypto';
import { requireSupabaseAdminClient } from '../config/supabase.js';
import { generateFeedbackForAttempt, getFeedbackForAttempt } from '../services/ai.service.js';
import { createStructuredOpenAIResponse } from '../services/openai.service.js';
import { createPdfImportPreview } from '../services/pdfImport.service.js';
import { commitPdfImport } from '../services/pdfImportCommit.service.js';
import { ApiError } from '../utils/apiError.js';
import {
  PDF_IMPORT_MAX_BYTES,
  sanitizePdfFileName,
  validatePdfUploadFile
} from '../middleware/pdfImport.middleware.js';

const PDF_IMPORT_BUCKET = 'exam-assets';

const openAiTestSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok'] },
    message: { type: 'string' }
  },
  required: ['status', 'message'],
  additionalProperties: false
};

export async function generateFeedback(req, res) {
  const feedback = await generateFeedbackForAttempt(req.params.attemptId, req.user);
  res.json({ feedback });
}

export async function getFeedback(req, res) {
  const feedback = await getFeedbackForAttempt(req.params.attemptId, req.user);
  res.json({ feedback });
}

export async function testOpenAI(req, res) {
  const result = await createStructuredOpenAIResponse({
    operation: 'protected_test_endpoint',
    schemaName: 'monoprep_openai_test',
    schema: openAiTestSchema,
    instructions: 'You are testing the MonoPrep backend OpenAI connection. Keep the message concise.',
    prompt: 'Confirm that the OpenAI API connection is working. Return status "ok" and a short message.'
  });

  res.json({
    result: result.data,
    meta: {
      model: result.model,
      responseId: result.responseId,
      usage: result.usage
    }
  });
}

export async function previewPdfImport(req, res) {
  const requestId = randomUUID();
  const preview = await createPdfImportPreview({
    buffer: req.file.buffer,
    fileName: req.pdfFileName,
    requestId
  });
  res.set('x-request-id', requestId);
  res.json(preview);
}

export async function createPdfImportUploadUrl(req, res) {
  const fileName = sanitizePdfFileName(req.body.fileName);
  const objectPath = `${req.authUser.id}/pdf-imports/${Date.now()}-${randomUUID()}.pdf`;
  const supabase = requireSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(PDF_IMPORT_BUCKET)
    .createSignedUploadUrl(objectPath);

  if (error || !data?.token) {
    throw new ApiError(502, 'PDF upload could not be prepared.');
  }

  res.json({
    bucket: PDF_IMPORT_BUCKET,
    objectPath,
    token: data.token,
    fileName,
    maxBytes: PDF_IMPORT_MAX_BYTES
  });
}

export async function previewStoredPdfImport(req, res) {
  const expectedPrefix = `${req.authUser.id}/pdf-imports/`;
  if (!req.body.objectPath.startsWith(expectedPrefix) || !req.body.objectPath.endsWith('.pdf')) {
    throw new ApiError(400, 'The PDF upload reference is invalid.');
  }

  const supabase = requireSupabaseAdminClient();
  const requestId = randomUUID();
  try {
    const { data, error } = await supabase.storage
      .from(PDF_IMPORT_BUCKET)
      .download(req.body.objectPath);
    if (error || !data) {
      throw new ApiError(502, 'The uploaded PDF could not be read.');
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const fileName = await validatePdfUploadFile({
      buffer,
      size: buffer.length,
      mimetype: 'application/pdf',
      originalname: req.body.fileName
    });
    const preview = await createPdfImportPreview({ buffer, fileName, requestId });
    res.set('x-request-id', requestId);
    res.json(preview);
  } finally {
    try {
      await supabase.storage.from(PDF_IMPORT_BUCKET).remove([req.body.objectPath]);
    } catch (_cleanupError) {
      // Temporary import cleanup must not replace the original request result.
    }
  }
}

export async function commitPdfImportDraft(req, res) {
  const result = await commitPdfImport(req.body);
  res.status(201).json(result);
}
