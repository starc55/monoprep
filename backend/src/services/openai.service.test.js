import assert from 'node:assert/strict';
import test from 'node:test';
import { createStructuredOpenAIResponse } from './openai.service.js';

const schema = {
  type: 'object',
  properties: {
    status: { type: 'string' }
  },
  required: ['status'],
  additionalProperties: false
};

test('creates and parses a structured OpenAI response', async () => {
  let receivedParams;
  let receivedOptions;
  const client = {
    responses: {
      async create(params, options) {
        receivedParams = params;
        receivedOptions = options;
        return {
          id: 'resp_test',
          model: 'test-model',
          output_text: '{"status":"ok"}',
          usage: {
            input_tokens: 5,
            output_tokens: 3,
            total_tokens: 8
          }
        };
      }
    }
  };

  const originalInfo = console.info;
  console.info = () => {};
  try {
    const result = await createStructuredOpenAIResponse({
      prompt: 'Test the connection.',
      schema,
      schemaName: 'connection_test',
      model: 'test-model',
      timeoutMs: 1_500,
      client
    });

    assert.deepEqual(result.data, { status: 'ok' });
    assert.deepEqual(result.usage, {
      inputTokens: 5,
      outputTokens: 3,
      totalTokens: 8
    });
    assert.equal(receivedParams.store, false);
    assert.equal(receivedParams.text.format.type, 'json_schema');
    assert.equal(receivedParams.text.format.strict, true);
    assert.equal(receivedOptions.timeout, 1_500);
  } finally {
    console.info = originalInfo;
  }
});

test('returns a safe timeout error', async () => {
  const client = {
    responses: {
      async create() {
        const error = new Error('Sensitive provider timeout detail');
        error.name = 'APIConnectionTimeoutError';
        throw error;
      }
    }
  };

  const originalError = console.error;
  console.error = () => {};
  try {
    await assert.rejects(
      createStructuredOpenAIResponse({
        prompt: 'Test the connection.',
        schema,
        schemaName: 'connection_test',
        client
      }),
      (error) => {
        assert.equal(error.statusCode, 504);
        assert.equal(error.message, 'AI service timed out. Please try again.');
        assert.equal(error.message.includes('Sensitive'), false);
        return true;
      }
    );
  } finally {
    console.error = originalError;
  }
});

test('accepts multimodal file input without requiring a text prompt', async () => {
  let receivedInput;
  const client = {
    responses: {
      async create(params) {
        receivedInput = params.input;
        return {
          output_text: '{"status":"ok"}',
          model: 'test-model'
        };
      }
    }
  };

  const input = [{
    role: 'user',
    content: [
      { type: 'input_text', text: 'Read this PDF.' },
      { type: 'input_file', filename: 'exam.pdf', file_data: 'data:application/pdf;base64,JVBERi0=' }
    ]
  }];
  const result = await createStructuredOpenAIResponse({
    input,
    schema,
    schemaName: 'file_test',
    client
  });

  assert.deepEqual(receivedInput, input);
  assert.deepEqual(result.data, { status: 'ok' });
});

test('rejects use when no API client is configured', async () => {
  await assert.rejects(
    createStructuredOpenAIResponse({
      prompt: 'Test the connection.',
      schema,
      schemaName: 'connection_test',
      client: null
    }),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.message, 'AI service is not configured.');
      return true;
    }
  );
});
