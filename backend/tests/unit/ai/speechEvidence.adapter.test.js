const {
  GeminiSpeechEvidenceAdapter,
} = require('../../../src/ai/speechEvidence.adapter');

describe('GeminiSpeechEvidenceAdapter', () => {
  test('analyzes real audio bytes and returns sufficient fluency/pronunciation evidence', async () => {
    const analyzeWithGemini = jest.fn().mockResolvedValue({
      rawText: JSON.stringify({
        fluency_sufficient: true,
        pronunciation_sufficient: true,
        fluency_metrics: {
          speech_rate: 'appropriate',
          hesitation: 'occasional',
          pause_control: 'mostly_natural',
          repetition_and_repair: 'limited',
          delivery_summary: 'Nhịp nói nhìn chung ổn định.',
        },
        pronunciation_evidence: {
          intelligibility: 'clear',
          segmental_accuracy: 'mostly_accurate',
          word_stress: 'generally_controlled',
          rhythm: 'generally_natural',
          intonation: 'some_range',
          connected_speech: 'developing',
          evidence_summary: 'Phần lớn lời nói dễ hiểu.',
        },
      }),
      modelName: 'gemini-3.6-flash',
    });
    const adapter = new GeminiSpeechEvidenceAdapter({ analyzeWithGemini });

    const result = await adapter.analyze({
      audioBuffer: Buffer.from('audio-bytes'),
      contentType: 'audio/wav',
      asrTranscript: 'I enjoy living in my hometown.',
      languageCode: 'en',
      usageContext: { entityId: 'part-1' },
    });

    expect(result.status).toBe('sufficient');
    expect(result.componentStatus).toEqual({
      fluency: { status: 'sufficient' },
      pronunciation: { status: 'sufficient' },
    });
    expect(result.providerManifest).toMatchObject({
      provider: 'gemini',
      model: 'gemini-3.6-flash',
      input: 'audio_and_asr_transcript',
    });
    expect(analyzeWithGemini).toHaveBeenCalledWith(expect.objectContaining({
      audioBuffer: expect.any(Buffer),
      contentType: 'audio/wav',
      asrTranscript: 'I enjoy living in my hometown.',
    }));
  });

  test('keeps the artifact partial when either audio criterion is insufficient', async () => {
    const adapter = new GeminiSpeechEvidenceAdapter({
      analyzeWithGemini: jest.fn().mockResolvedValue({
        rawText: JSON.stringify({
          fluency_sufficient: true,
          pronunciation_sufficient: false,
          fluency_metrics: { delivery_summary: 'Đủ bằng chứng.' },
          pronunciation_evidence: { evidence_summary: 'Âm thanh quá nhiễu.' },
        }),
        modelName: 'gemini-3.6-flash',
      }),
    });

    const result = await adapter.analyze({
      audioBuffer: Buffer.from('audio-bytes'),
      contentType: 'audio/wav',
      asrTranscript: 'Transcript',
    });

    expect(result.status).toBe('insufficient');
    expect(result.componentStatus.pronunciation).toEqual({
      status: 'insufficient',
      reason: 'AUDIO_EVIDENCE_INSUFFICIENT',
    });
  });
});
