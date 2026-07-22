class SpeechEvidenceAdapter {
  async analyze() { throw new Error('analyze is not implemented'); }
}

const { extractJson } = require('./grading.validator');

const FLUENCY_FIELDS = [
  'speech_rate',
  'hesitation',
  'pause_control',
  'repetition_and_repair',
  'delivery_summary',
];
const PRONUNCIATION_FIELDS = [
  'intelligibility',
  'segmental_accuracy',
  'word_stress',
  'rhythm',
  'intonation',
  'connected_speech',
  'evidence_summary',
];

const pickText = (input, fields) => Object.fromEntries(fields.map((field) => [
  field,
  String(input?.[field] || '').replace(/\p{Cc}/gu, ' ').trim().slice(0, 1000),
]));

const component = (sufficient) => sufficient
  ? { status: 'sufficient' }
  : { status: 'insufficient', reason: 'AUDIO_EVIDENCE_INSUFFICIENT' };

class GeminiSpeechEvidenceAdapter extends SpeechEvidenceAdapter {
  constructor({ analyzeWithGemini } = {}) {
    super();
    this.analyzeWithGemini = analyzeWithGemini || ((input) => {
      const { analyzeSpeakingAudioEvidence } = require('./grading.service');
      return analyzeSpeakingAudioEvidence(input);
    });
  }

  async analyze(input) {
    const response = await this.analyzeWithGemini(input);
    const parsed = extractJson(response.rawText);
    if (!parsed || typeof parsed.fluency_sufficient !== 'boolean'
      || typeof parsed.pronunciation_sufficient !== 'boolean') {
      const error = new Error('Gemini trả audio evidence không hợp lệ');
      error.code = 'SPEAKING_AUDIO_EVIDENCE_INVALID';
      error.retryable = true;
      throw error;
    }
    const fluency = parsed.fluency_sufficient;
    const pronunciation = parsed.pronunciation_sufficient;
    return {
      status: fluency && pronunciation ? 'sufficient' : 'insufficient',
      componentStatus: {
        fluency: component(fluency),
        pronunciation: component(pronunciation),
      },
      fluencyMetrics: pickText(parsed.fluency_metrics, FLUENCY_FIELDS),
      pronunciationEvidence: pickText(parsed.pronunciation_evidence, PRONUNCIATION_FIELDS),
      providerManifest: {
        provider: 'gemini',
        model: response.modelName,
        config_version: response.promptVersion || 'speaking-audio-analysis-v1',
        input: 'audio_and_asr_transcript',
      },
    };
  }
}

class UnavailableSpeechEvidenceAdapter extends SpeechEvidenceAdapter {
  async analyze() {
    return {
      status: 'unavailable',
      componentStatus: {
        fluency: { status: 'unavailable', reason: 'SPEECH_EVIDENCE_PROVIDER_UNCONFIGURED' },
        pronunciation: { status: 'unavailable', reason: 'SPEECH_EVIDENCE_PROVIDER_UNCONFIGURED' },
      },
      fluencyMetrics: null,
      pronunciationEvidence: null,
      providerManifest: { provider: 'unconfigured', model: null },
    };
  }
}

const createSpeechEvidenceAdapter = (provider) => {
  if (String(provider || '').toLowerCase() === 'gemini') {
    return new GeminiSpeechEvidenceAdapter();
  }
  return new UnavailableSpeechEvidenceAdapter();
};

module.exports = {
  SpeechEvidenceAdapter,
  GeminiSpeechEvidenceAdapter,
  UnavailableSpeechEvidenceAdapter,
  createSpeechEvidenceAdapter,
};
