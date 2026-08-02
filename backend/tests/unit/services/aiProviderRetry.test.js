jest.mock('../../../src/services/aiUsage.service', () => ({
  normalizeOpenAiUsageMetadata: jest.fn((value) => value || {}),
  recordAiUsageLog: jest.fn().mockResolvedValue(undefined),
}));

const { generateGeminiJsonAnswer } = require('../../../src/services/ai.service');

describe('Gemini retry metadata', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('preserves provider 5xx and Retry-After as retryable metadata', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: jest.fn((name) => name.toLowerCase() === 'retry-after' ? '45' : null) },
      text: jest.fn().mockResolvedValue('temporarily unavailable'),
    });

    await expect(generateGeminiJsonAnswer({
      model: 'gemini-test', apiKey: 'test-key', systemPrompt: 'system', userPrompt: 'user',
    })).rejects.toMatchObject({
      providerStatus: 503,
      retryable: true,
      retryAfterSeconds: 45,
    });
  });

  test('marks a transport failure retryable without exposing the request URL', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'));

    await expect(generateGeminiJsonAnswer({
      model: 'gemini-test', apiKey: 'test-key', systemPrompt: 'system', userPrompt: 'user',
    })).rejects.toMatchObject({
      errorCode: 'AI_PROVIDER_NETWORK_ERROR',
      statusCode: 503,
      retryable: true,
    });
  });
});
