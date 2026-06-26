jest.mock('../../../src/services/ai.service', () => ({
  generateAssistantAnswer: jest.fn(),
  streamAssistantAnswer: jest.fn(),
}));

jest.mock('../../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../../../src/api/assistant/assistant.repository', () => ({
  createOrGetSession: jest.fn(),
  saveUserMessage: jest.fn(),
  saveAssistantMessage: jest.fn(),
  getRecentMessages: jest.fn(),
  getHistory: jest.fn(),
  rateAssistantMessage: jest.fn(),
}));

const aiService = require('../../../src/services/ai.service');
const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');
const { runAssistantPipeline } = require('../../../src/api/assistant/assistant.service');

describe('Assistant service pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls AI for IELTS_KNOWLEDGE without requiring database rows', async () => {
    aiService.generateAssistantAnswer.mockResolvedValue(JSON.stringify({
      answer: 'Cohesion là cách liên kết câu và ý trong bài viết.',
      suggestedLinks: [],
      usedDatabase: false,
      needsMoreContext: false,
      safety: {
        inventedContent: false,
        outOfScope: false,
        containsBandScore: false,
        containsWritingSpeakingGrading: false,
      },
    }));

    const result = await runAssistantPipeline({
      user: { id: 'user-1' },
      payload: {
        message: 'Cohesion và coherence khác nhau thế nào?',
        context: { pageType: 'lesson' },
      },
    });

    expect(result.intent).toBe(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);
    expect(result.answer).toContain('Cohesion');
    expect(result.code).toBeNull();
    expect(aiService.generateAssistantAnswer).toHaveBeenCalledTimes(1);
    expect(aiService.generateAssistantAnswer.mock.calls[0][0].systemPrompt).toContain('IELTS Expert Assistant');
  });
});
