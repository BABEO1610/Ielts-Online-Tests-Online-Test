const { transcribeSpeakingAudio } = require('./grading.service');

class StructuredTranscriberAdapter {
  async transcribe() { throw new Error('transcribe is not implemented'); }
}

class ExistingProviderTranscriberAdapter extends StructuredTranscriberAdapter {
  constructor({ transcript = transcribeSpeakingAudio } = {}) {
    super();
    this.transcribeAudio = transcript;
  }

  async transcribe({ audioBuffer, contentType, usageContext }) {
    const dataUrl = `data:${contentType};base64,${Buffer.from(audioBuffer).toString('base64')}`;
    const { transcript, provider, model } = await this.transcribeAudio(dataUrl, usageContext);
    return {
      asrTranscript: transcript,
      displayTranscript: transcript,
      words: null,
      segments: null,
      uncertainty: null,
      providerManifest: {
        provider,
        model,
        output: 'plain_transcript',
      },
    };
  }
}

class UnavailableTranscriberAdapter extends StructuredTranscriberAdapter {
  async transcribe() {
    const error = new Error('Structured transcription provider is not configured');
    error.code = 'TRANSCRIBER_UNAVAILABLE';
    error.retryable = false;
    throw error;
  }
}

module.exports = {
  StructuredTranscriberAdapter,
  ExistingProviderTranscriberAdapter,
  UnavailableTranscriberAdapter,
};
