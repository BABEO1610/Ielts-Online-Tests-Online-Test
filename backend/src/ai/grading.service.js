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
  getAiConfig,
  normalizeGeminiModel,
} = require('../services/ai.service');
const { buildSystemPrompt, buildUserPrompt } = require('./grading.prompt');
const { validateGradingResponse } = require('./grading.validator');
const {
  buildSpeakingSystemPrompt,
  buildSpeakingUserPrompt,
  buildSpeakingSessionUserPrompt,
} = require('./speakingGrading.prompt');
const { validateSpeakingGradingResponse } = require('./speakingGrading.validator');
const { AI_GRADE_ERRORS, PROMPT_VERSION } = require('./aiGrading.constants');
const AppError = require('../utils/AppError');

const AI_TIMEOUT_MS = 30000;
const AI_NOT_CONFIGURED_MESSAGE =
  'AI grading is not configured. Please add GEMINI_API_KEY, GOOGLE_AI_API_KEY, or GOOGLE_API_KEY.';

/**
 * Call Gemini API for grading with timeout.
 * @returns {string} Raw response text
 */
const callGeminiGrading = async (systemPrompt, userPrompt, usageContext = {}) => {
  const { geminiApiKey, model } = getAiConfig();
  if (!geminiApiKey) {
    throw new AppError(
      AI_NOT_CONFIGURED_MESSAGE,
      503, 'AIGRADE_003'
    );
  }

  const geminiModel = normalizeGeminiModel(
    process.env.AI_GRADING_MODEL || model
  );

  try {
    const { answer, modelName } = await generateGeminiJsonAnswer({
      model: geminiModel,
      apiKey: geminiApiKey,
      systemPrompt,
      userPrompt,
      timeoutMs: AI_TIMEOUT_MS,
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
      error: err.message,
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

/**
 * Count words in a text string.
 */
const countWords = (text) => {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
};

module.exports = { gradeWriting, gradeSpeakingPart, gradeSpeakingSession, countWords };
