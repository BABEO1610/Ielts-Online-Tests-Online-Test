const { normalizeAiUsageMetadata } = require('../../../src/services/aiUsage.service');

describe('aiUsage.service', () => {
  describe('normalizeAiUsageMetadata', () => {
    it('maps missing Gemini usage fields to zero without NaN', () => {
      expect(normalizeAiUsageMetadata({})).toEqual({
        prompt_tokens: 0,
        completion_tokens: 0,
        thinking_tokens: 0,
        cached_tokens: 0,
        total_tokens: 0,
      });
    });

    it('prefers totalTokenCount when present', () => {
      expect(normalizeAiUsageMetadata({
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        thoughtsTokenCount: 5,
        cachedContentTokenCount: 2,
        totalTokenCount: 99,
      }).total_tokens).toBe(99);
    });

    it('falls back to the known token sum when totalTokenCount is missing', () => {
      expect(normalizeAiUsageMetadata({
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        thoughtsTokenCount: 5,
        cachedContentTokenCount: 2,
      }).total_tokens).toBe(37);
    });
  });
});
