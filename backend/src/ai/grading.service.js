/**
 * @file backend/src/ai/grading.service.js
 * Orchestrator for AI Writing grading.
 * Reuses project Gemini provider config from ai.service.js.
 *
 * Uses the project's existing Gemini keys and provider wrapper.
 */

const logger = require('../utils/logger');
const {
  generateGeminiJsonAnswer,
  generateTranscript,
  getAiConfig,
  normalizeGeminiModel,
} = require('../services/ai.service');
const { buildSystemPrompt, buildUserPrompt } = require('./grading.prompt');
const { validateGradingResponse } = require('./grading.validator');
const { extractJson } = require('./grading.validator');
const {
  buildSpeakingSystemPrompt,
  buildSpeakingUserPrompt,
  buildSpeakingSessionUserPrompt,
  buildSpeakingEvidenceSystemPrompt,
  buildSpeakingEvidenceSessionUserPrompt,
  buildAudioEvidenceSystemPrompt,
  buildAudioEvidenceUserPrompt,
  audioEvidenceResponseSchema,
} = require('./speakingGrading.prompt');
const { validateSpeakingGradingResponse } = require('./speakingGrading.validator');
const { AI_GRADE_ERRORS, PROMPT_VERSION } = require('./aiGrading.constants');
const AppError = require('../utils/AppError');
const { sanitizeDiagnostic } = require('../services/aiUsage.service');

const AI_TIMEOUT_MS = 30000;
const AI_NOT_CONFIGURED_MESSAGE =
  'Chấm AI chưa được cấu hình. Hãy khai báo GEMINI_API_KEY, GOOGLE_AI_API_KEY hoặc GOOGLE_API_KEY.';

const transcribeSpeakingAudio = async (audioInput, usageContext = {}) => {
  const transcript = await generateTranscript(audioInput, usageContext);
  const config = getAiConfig();
  const provider = config.openaiApiKey ? 'openai' : 'gemini';
  const configuredModel = process.env.AI_TRANSCRIPTION_MODEL;
  const model = provider === 'openai'
    ? (configuredModel?.startsWith('whisper') ? configuredModel : 'whisper-1')
    : normalizeGeminiModel(configuredModel?.startsWith('gemini')
      ? configuredModel
      : (process.env.AI_GRADING_MODEL || config.geminiModel));
  return { transcript: String(transcript || '').trim(), provider, model };
};

/**
 * Call Gemini API for grading with timeout.
 * @returns {string} Raw response text
 */
const callGeminiGrading = async (systemPrompt, userPrompt, usageContext = {}, options = {}) => {
  const { geminiApiKey, geminiModel: configuredGeminiModel } = getAiConfig();
  if (!geminiApiKey) {
    throw new AppError(
      AI_NOT_CONFIGURED_MESSAGE,
      503, 'AIGRADE_003'
    );
  }

  const geminiModel = normalizeGeminiModel(
    process.env.AI_GRADING_MODEL || configuredGeminiModel
  );

  try {
    const { answer, modelName } = await generateGeminiJsonAnswer({
      model: geminiModel,
      apiKey: geminiApiKey,
      systemPrompt,
      userPrompt,
      contentParts: options.contentParts,
      responseSchema: options.responseSchema,
      maxOutputTokens: options.maxOutputTokens,
      timeoutMs: options.timeoutMs || AI_TIMEOUT_MS,
      usageContext,
    });
    return { rawText: answer, modelName };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError(
        AI_GRADE_ERRORS.AIGRADE_003.message,
        AI_GRADE_ERRORS.AIGRADE_003.status,
        'AIGRADE_003'
      );
    }
    logger.error('Gemini grading API error', {
      model: geminiModel,
      error: sanitizeDiagnostic(err.message, 300),
    });
    if (err.errorCode === 'AI_QUOTA_EXCEEDED'
      || err.code === 'AI_QUOTA_EXCEEDED') {
      throw new AppError(
        AI_GRADE_ERRORS.AIGRADE_008.message,
        AI_GRADE_ERRORS.AIGRADE_008.status,
        'AIGRADE_008'
      );
    }
    if (err.code === 'AI_NOT_CONFIGURED' || err.statusCode) {
      throw new AppError(
        err.code === 'AI_NOT_CONFIGURED'
          ? AI_NOT_CONFIGURED_MESSAGE
          : err.message,
        err.statusCode || AI_GRADE_ERRORS.AIGRADE_003.status,
        'AIGRADE_003'
      );
    }
    throw err;
  }
};

/**
 * Main grading function.
 * @param {object} submission - { response_text, prompt_text, task_number }
 * @param {string} taskType - 'task1' or 'task2'
 * @param {object} opts - { testTitle }
 * @returns {object} Validated and normalized grading result
 */
const gradeWriting = async (submission, taskType, opts = {}) => {
  const systemPrompt = buildSystemPrompt(taskType);
  const wordCount = countWords(submission.response_text);

  const ieltsMinWords = taskType === 'task1' ? 150 : 250;

  const userPrompt = buildUserPrompt({
    taskType,
    questionPrompt: submission.prompt_text,
    studentAnswer: submission.response_text,
    wordCount,
    ieltsMinWords,
    testTitle: opts.testTitle || null,
  });

  const { rawText, modelName } = await callGeminiGrading(
    systemPrompt, userPrompt, opts.usageContext
  );

  const result = validateGradingResponse(rawText);
  if (!result.success) {
    logger.error('AI grading validation failed', {
      errors: result.errors,
    });
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_004.message,
      AI_GRADE_ERRORS.AIGRADE_004.status,
      'AIGRADE_004'
    );
  }

  return {
    ...result.data,
    rawResponse: rawText,
    modelName,
    promptVersion: PROMPT_VERSION,
    wordCount,
  };
};

const gradeSpeakingPart = async (part, opts = {}) => {
  const systemPrompt = buildSpeakingSystemPrompt();
  const userPrompt = buildSpeakingUserPrompt({
    partNumber: part.part_number,
    promptText: part.prompt_text,
    transcript: part.transcript,
    testTitle: opts.testTitle || null,
  });

  const { rawText, modelName } = await callGeminiGrading(systemPrompt, userPrompt, opts.usageContext);
  const result = validateSpeakingGradingResponse(rawText);
  if (!result.success) {
    logger.error('AI Speaking grading validation failed', {
      errors: result.errors,
    });
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_004.message,
      AI_GRADE_ERRORS.AIGRADE_004.status,
      'AIGRADE_004'
    );
  }

  return {
    ...result.data,
    rawResponse: rawText,
    modelName,
    promptVersion: PROMPT_VERSION,
    transcriptWordCount: countWords(part.transcript),
  };
};

const gradeSpeakingSession = async (parts, opts = {}) => {
  const systemPrompt = buildSpeakingSystemPrompt();
  const userPrompt = buildSpeakingSessionUserPrompt({
    parts: parts.map(part => ({
      partNumber: part.part_number,
      promptText: part.prompt_text,
      transcript: part.transcript,
    })),
    testTitle: opts.testTitle || null,
  });

  const { rawText, modelName } = await callGeminiGrading(systemPrompt, userPrompt, opts.usageContext);
  const result = validateSpeakingGradingResponse(rawText);
  if (!result.success) {
    logger.error('AI Speaking session grading validation failed', {
      errors: result.errors,
    });
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_004.message,
      AI_GRADE_ERRORS.AIGRADE_004.status,
      'AIGRADE_004'
    );
  }

  return {
    ...result.data,
    rawResponse: rawText,
    modelName,
    promptVersion: PROMPT_VERSION,
    transcriptWordCount: parts.reduce((sum, part) => sum + countWords(part.transcript), 0),
  };
};

const gradeSpeakingSessionFromEvidence = async (parts, opts = {}) => {
  const systemPrompt = buildSpeakingEvidenceSystemPrompt();
  const userPrompt = buildSpeakingEvidenceSessionUserPrompt({
    parts,
    testTitle: opts.testTitle || null,
  });
  const { rawText, modelName } = await callGeminiGrading(
    systemPrompt,
    userPrompt,
    opts.usageContext,
    { maxOutputTokens: 4096, timeoutMs: opts.timeoutMs || 60000 }
  );
  const result = validateSpeakingGradingResponse(rawText);
  if (!result.success) {
    logger.error('AI Speaking audio-evidence grading validation failed', { errors: result.errors });
    throw new AppError(
      AI_GRADE_ERRORS.AIGRADE_004.message,
      AI_GRADE_ERRORS.AIGRADE_004.status,
      'AIGRADE_004'
    );
  }
  return {
    ...result.data,
    modelName,
    promptVersion: 'speaking-audio-evidence-v1',
    transcriptWordCount: parts.reduce(
      (sum, part) => sum + countWords(part.asr_transcript),
      0
    ),
  };
};

const analyzeSpeakingAudioEvidence = async ({
  audioBuffer,
  contentType,
  asrTranscript,
  languageCode = 'en',
  usageContext,
  timeoutMs = 60000,
}) => {
  const systemPrompt = buildAudioEvidenceSystemPrompt();
  const userPrompt = buildAudioEvidenceUserPrompt({ asrTranscript, languageCode });
  const contentParts = [
    { text: userPrompt },
    {
      inlineData: {
        mimeType: contentType,
        data: Buffer.from(audioBuffer).toString('base64'),
      },
    },
  ];
  const { rawText, modelName } = await callGeminiGrading(
    systemPrompt,
    userPrompt,
    usageContext,
    {
      contentParts,
      responseSchema: audioEvidenceResponseSchema,
      maxOutputTokens: 2048,
      timeoutMs,
    }
  );
  return { rawText, modelName, promptVersion: 'speaking-audio-analysis-v1' };
};

const text = (value, max = 4000) => String(value || '')
  .replace(/<[^>]*>/g, '')
  .replace(/\p{Cc}/gu, ' ')
  .trim()
  .slice(0, max);

const list = (value, maxItems = 8) => (Array.isArray(value) ? value : [])
  .slice(0, maxItems)
  .map((item) => text(item, 500))
  .filter(Boolean);

/**
 * Evidence-limited feedback. This path intentionally does not request or accept
 * IELTS bands, fluency or pronunciation judgements from a transcript.
 */
const gradeSpeakingTextFeedback = async (parts, opts = {}) => {
  const systemPrompt = `You provide evidence-limited IELTS Speaking study feedback from an ASR transcript.
Never assign a band score. Never assess pronunciation, pace, pauses, fluency, or audio quality.
Treat every transcript as uncertain ASR output: do not silently repair it and do not claim an error was definitely spoken.
Return only JSON with keys summary, lexical_observations, grammar_observations, coherence_observations, uncertainty_note, part_feedback.`;
  const userPrompt = JSON.stringify({
    notice: 'The transcript may contain recognition errors. Comment only on visible text patterns.',
    parts: parts.map((part) => ({
      part_number: part.part_number,
      prompt: part.prompt_text,
      asr_transcript: part.asr_transcript,
    })),
  });
  const { rawText, modelName } = await callGeminiGrading(systemPrompt, userPrompt, opts.usageContext);
  const parsed = extractJson(rawText);
  if (!parsed || Object.keys(parsed).some((key) => /band|pronunciation|fluency/i.test(key))) {
    throw new AppError('AI text feedback response không hợp lệ.', 502, 'SPEAKING_TEXT_FEEDBACK_INVALID');
  }
  return {
    summary: text(parsed.summary),
    lexical_observations: list(parsed.lexical_observations),
    grammar_observations: list(parsed.grammar_observations),
    coherence_observations: list(parsed.coherence_observations),
    uncertainty_note: text(parsed.uncertainty_note)
      || 'Bản chép lời có thể chứa lỗi nhận dạng; cần nghe audio để xác nhận.',
    part_feedback: (Array.isArray(parsed.part_feedback) ? parsed.part_feedback : [])
      .map((item) => ({ part_number: Number(item.part_number), feedback: text(item.feedback) }))
      .filter((item) => [1, 2, 3].includes(item.part_number)),
    modelName,
    promptVersion: 'speaking-text-feedback-v1',
  };
};

/**
 * Count words in a text string.
 */
const countWords = (text) => {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
};

module.exports = {
  gradeWriting,
  gradeSpeakingPart,
  gradeSpeakingSession,
  gradeSpeakingSessionFromEvidence,
  analyzeSpeakingAudioEvidence,
  gradeSpeakingTextFeedback,
  transcribeSpeakingAudio,
  countWords,
};
