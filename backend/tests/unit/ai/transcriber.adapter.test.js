jest.mock('../../../src/ai/grading.service', () => ({
  transcribeSpeakingAudio: jest.fn(),
}));

const { transcribeSpeakingAudio } = require('../../../src/ai/grading.service');
const {
  ExistingProviderTranscriberAdapter,
  UnavailableTranscriberAdapter,
} = require('../../../src/ai/transcriber.adapter');

describe('structured transcriber adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  test('routes provider access through grading.service and preserves its manifest', async () => {
    transcribeSpeakingAudio.mockResolvedValue({
      transcript: 'I spoke exactly this.',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    });
    const usageContext = { feature: 'speaking_grading' };
    const result = await new ExistingProviderTranscriberAdapter().transcribe({
      audioBuffer: Buffer.from('audio-bytes'),
      contentType: 'audio/mp4',
      usageContext,
    });

    expect(transcribeSpeakingAudio).toHaveBeenCalledWith(
      expect.stringMatching(/^data:audio\/mp4;base64,/),
      usageContext
    );
    expect(result).toMatchObject({
      asrTranscript: 'I spoke exactly this.',
      displayTranscript: 'I spoke exactly this.',
      providerManifest: { provider: 'gemini', model: 'gemini-2.5-flash' },
    });
  });

  test('fails closed when no structured transcriber is configured', async () => {
    await expect(new UnavailableTranscriberAdapter().transcribe())
      .rejects.toMatchObject({ code: 'TRANSCRIBER_UNAVAILABLE', retryable: false });
  });
});
