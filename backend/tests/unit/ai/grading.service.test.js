jest.mock('../../../src/services/ai.service', () => ({
  generateGeminiJsonAnswer: jest.fn(),
  getAiConfig: jest.fn(),
  normalizeGeminiModel: jest.fn((model) => model),
}));

jest.mock('../../../src/ai/grading.validator', () => ({
  validateGradingResponse: jest.fn(() => ({
    success: true,
    data: { overallBand: 6.5, criteria: {}, feedback: {} },
  })),
}));

const aiService = require('../../../src/services/ai.service');
const { gradeWriting } = require('../../../src/ai/grading.service');

const originalGradingModel = process.env.AI_GRADING_MODEL;

describe('AI grading provider configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AI_GRADING_MODEL;
    aiService.getAiConfig.mockReturnValue({
      geminiApiKey: 'test-key',
      geminiModel: 'gemini-grading-model',
    });
    aiService.generateGeminiJsonAnswer.mockResolvedValue({
      answer: '{}',
      modelName: 'gemini-grading-model',
    });
  });

  afterAll(() => {
    if (originalGradingModel === undefined) delete process.env.AI_GRADING_MODEL;
    else process.env.AI_GRADING_MODEL = originalGradingModel;
  });

  it('uses the provider-specific Gemini model instead of the active chat model', async () => {
    await gradeWriting({
      response_text: 'A short test response.',
      prompt_text: 'Discuss both views.',
    }, 'task2');

    expect(aiService.generateGeminiJsonAnswer).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-grading-model',
      apiKey: 'test-key',
    }));
  });

  it('preserves retry metadata while projecting a provider 5xx into the grading error contract', async () => {
    aiService.generateGeminiJsonAnswer.mockRejectedValueOnce(Object.assign(
      new Error('provider temporarily unavailable'),
      { statusCode: 500, providerStatus: 503, retryable: true, retryAfterSeconds: 40 }
    ));

    await expect(gradeWriting({
      response_text: 'A short test response.',
      prompt_text: 'Discuss both views.',
    }, 'task2')).rejects.toMatchObject({
      errorCode: 'AIGRADE_003',
      providerStatus: 503,
      retryable: true,
      retryAfterSeconds: 40,
    });
  });
});
