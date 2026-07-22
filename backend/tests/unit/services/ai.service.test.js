jest.mock('../../../src/services/aiUsage.service', () => ({
  normalizeOpenAiUsageMetadata: jest.fn(() => null),
  recordAiUsageLog: jest.fn().mockResolvedValue(null),
}));

const aiService = require('../../../src/services/ai.service');

const ENV_KEYS = [
  'AI_PROVIDER',
  'AI_MODEL',
  'GEMINI_MODEL',
  'OPENAI_MODEL',
  'GEMINI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'GOOGLE_API_KEY',
  'OPENAI_API_KEY',
  'AI_TRANSCRIPTION_TIMEOUT_MS',
];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = global.fetch;

const clearAiEnv = () => ENV_KEYS.forEach((key) => delete process.env[key]);

describe('AI provider configuration', () => {
  beforeEach(() => {
    clearAiEnv();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    ENV_KEYS.forEach((key) => {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    });
    global.fetch = originalFetch;
  });

  it('selects Gemini and a Gemini model when only GEMINI_API_KEY is configured', () => {
    process.env.GEMINI_API_KEY = 'test-key';

    expect(aiService.getAiConfig()).toMatchObject({
      provider: 'gemini',
      model: 'gemini-flash-lite-latest',
      geminiModel: 'gemini-flash-lite-latest',
      openaiModel: 'gpt-4o-mini',
    });
  });

  it('does not pass the OpenAI default model to an explicitly selected Gemini provider', () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';

    expect(aiService.getAiConfig().model).toBe('gemini-flash-lite-latest');
  });

  it('keeps Gemini as the assistant default when both provider keys exist', () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    expect(aiService.getAiConfig()).toMatchObject({
      provider: 'gemini',
      model: 'gemini-flash-lite-latest',
    });
  });

  it('recognizes the GOOGLE_AI_API_KEY alias used by the project environment', () => {
    process.env.GOOGLE_AI_API_KEY = 'test-google-ai-key';

    expect(aiService.getAiConfig()).toMatchObject({
      provider: 'gemini',
      geminiApiKey: 'test-google-ai-key',
    });
  });

  it('does not pass a bare Gemini model name to an explicitly selected OpenAI provider', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gemini';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    expect(aiService.getAiConfig().model).toBe('gpt-4o-mini');
  });

  it('keeps provider-specific models isolated for shared grading callers', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gpt-custom';
    process.env.GEMINI_MODEL = 'gemini-custom';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    expect(aiService.getAiConfig()).toMatchObject({
      provider: 'openai',
      model: 'gpt-custom',
      openaiModel: 'gpt-custom',
      geminiModel: 'gemini-custom',
    });
  });

  it('allows plain-text knowledge retries without forcing Gemini JSON mode', async () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: 'A plain answer' }] } }],
      }),
    });

    await aiService.generateAssistantAnswer({
      mode: 'IELTS_KNOWLEDGE',
      message: 'Explain cohesion',
      jsonMode: false,
    });

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    const [requestUrl, requestOptions] = global.fetch.mock.calls[0];
    expect(requestUrl).toContain('/gemini-flash-lite-latest:generateContent');
    expect(requestUrl).not.toContain('test-key');
    expect(requestOptions.headers['x-goog-api-key']).toBe('test-key');
    expect(requestBody.generationConfig).not.toHaveProperty('responseMimeType');
  });

  it('gives the scope classifier recent conversation for reference resolution', async () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: '{"intent":"IELTS_KNOWLEDGE","allowed":true}' }] } }],
      }),
    });

    await aiService.generateScopeClassification({
      message: 'kết hợp 2 cái này như thế nào?',
      recentMessages: [
        { role: 'user', content: 'skimming là gì' },
        { role: 'assistant', content: 'Skimming là đọc lướt để nắm ý chính.' },
        { role: 'user', content: 'scanning là gì' },
        { role: 'assistant', content: 'Scanning là đọc quét để tìm chi tiết.' },
      ],
      routingHints: {
        previousIntent: 'IELTS_KNOWLEDGE',
        previousSkill: 'reading',
        recentTopics: ['skimming', 'scanning'],
      },
    });

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    const classifierInput = requestBody.contents[0].parts[0].text;
    expect(classifierInput).toContain('skimming là gì');
    expect(classifierInput).toContain('scanning là gì');
    expect(classifierInput).toContain('kết hợp 2 cái này');
    expect(classifierInput).toContain('"previousSkill":"reading"');
  });

  it('aborts a hanging Gemini transcription within the configured timeout', async () => {
    jest.useFakeTimers();
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.AI_TRANSCRIPTION_TIMEOUT_MS = '5000';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('audio')),
        headers: { get: jest.fn(() => 'audio/wav') },
      })
      // Simulate a provider/socket that ignores AbortSignal entirely.
      .mockImplementationOnce(() => new Promise(() => {}));

    const transcription = expect(
      aiService.generateTranscript('data:audio/wav;base64,YXVkaW8=')
    ).rejects.toMatchObject({
      code: 'TRANSCRIPTION_TIMEOUT',
      retryable: true,
    });
    await jest.advanceTimersByTimeAsync(5000);
    await transcription;
    jest.useRealTimers();
  });

  it('hard-times-out JSON grading even when provider fetch ignores abort', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));
    const grading = expect(aiService.generateGeminiJsonAnswer({
      model: 'gemini-3.6-flash',
      apiKey: 'test-key',
      systemPrompt: 'Return JSON.',
      userPrompt: 'Return {"ok":true}.',
      timeoutMs: 5000,
    })).rejects.toMatchObject({ name: 'AbortError', code: 'AI_REQUEST_TIMEOUT' });

    await jest.advanceTimersByTimeAsync(5000);
    await grading;
    jest.useRealTimers();
  });

  it('sends inline audio and a response schema for multimodal JSON analysis', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
      }),
    });
    const responseSchema = {
      type: 'object',
      required: ['ok'],
      properties: { ok: { type: 'boolean' } },
    };

    await aiService.generateGeminiJsonAnswer({
      model: 'gemini-3.6-flash',
      apiKey: 'test-key',
      systemPrompt: 'Analyze audio.',
      userPrompt: 'Fallback text.',
      contentParts: [
        { text: 'Analyze this clip.' },
        { inlineData: { mimeType: 'audio/wav', data: 'YXVkaW8=' } },
      ],
      responseSchema,
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.contents[0].parts[1]).toEqual({
      inlineData: { mimeType: 'audio/wav', data: 'YXVkaW8=' },
    });
    expect(body.generationConfig).toMatchObject({
      responseMimeType: 'application/json',
      responseSchema,
    });
  });
});
