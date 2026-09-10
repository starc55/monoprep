import { randomUUID } from 'node:crypto';
import { generateFeedbackForAttempt, getFeedbackForAttempt } from '../services/ai.service.js';
import { createStructuredOpenAIResponse } from '../services/openai.service.js';
import { createPdfImportPreview } from '../services/pdfImport.service.js';
import { commitPdfImport } from '../services/pdfImportCommit.service.js';

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

export async function commitPdfImportDraft(req, res) {
  const result = await commitPdfImport(req.body);
  res.status(201).json(result);
}
