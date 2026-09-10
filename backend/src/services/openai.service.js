import { env } from '../config/env.js';
import { openai } from '../config/openai.js';
import { ApiError } from '../utils/apiError.js';

function normalizeUsage(usage) {
  if (!usage) return null;

  return {
    inputTokens: usage.input_tokens ?? null,
    outputTokens: usage.output_tokens ?? null,
    totalTokens: usage.total_tokens ?? null
  };
}

function logUsage(operation, model, usage) {
  if (!usage) return;

  console.info('[openai] token usage', {
    operation,
    model,
    ...usage
  });
}

function toSafeApiError(error) {
  if (error instanceof ApiError) return error;

  const status = Number(error?.status);
  const errorName = String(error?.name || '');
  const isTimeout =
    errorName === 'APIConnectionTimeoutError' ||
    errorName === 'AbortError' ||
    status === 408;

  if (isTimeout) {
    return new ApiError(504, 'AI service timed out. Please try again.');
  }

  if (status === 429) {
    return new ApiError(503, 'AI service is temporarily busy. Please try again shortly.');
  }

  return new ApiError(502, 'AI service is temporarily unavailable.');
}

export async function createStructuredOpenAIResponse({
  prompt,
  input,
  schema,
  schemaName,
  instructions = 'Return a response that matches the supplied JSON schema.',
  model = env.openAiModel,
  maxOutputTokens = 300,
  timeoutMs = env.openAiTimeoutMs,
  operation = 'structured_response',
  client = openai
}) {
  if (!client) {
    throw new ApiError(503, 'AI service is not configured.');
  }

  if ((!prompt && !input) || !schema || !schemaName) {
    throw new ApiError(500, 'AI service request is not configured correctly.');
  }

  try {
    const response = await client.responses.create(
      {
        model,
        instructions,
        input: input || prompt,
        max_output_tokens: maxOutputTokens,
        store: false,
        text: {
          format: {
            type: 'json_schema',
            name: schemaName,
            schema,
            strict: true
          }
        }
      },
      {
        timeout: timeoutMs,
        maxRetries: 1
      }
    );

    const outputText = response.output_text?.trim();
    if (!outputText) {
      throw new Error('OpenAI returned an empty structured response.');
    }

    let data;
    try {
      data = JSON.parse(outputText);
    } catch {
      throw new Error('OpenAI returned invalid structured JSON.');
    }

    const usage = normalizeUsage(response.usage);
    logUsage(operation, response.model || model, usage);

    return {
      data,
      responseId: response.id || null,
      model: response.model || model,
      usage
    };
  } catch (error) {
    const safeError = toSafeApiError(error);
    console.error('[openai] request failed', {
      operation,
      model,
      providerStatus: error?.status || null,
      providerCode: error?.code || null,
      errorName: error?.name || 'Error'
    });
    throw safeError;
  }
}
