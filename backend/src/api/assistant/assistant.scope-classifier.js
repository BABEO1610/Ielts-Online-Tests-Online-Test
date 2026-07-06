const { ASSISTANT_INTENTS } = require('./assistant.intent');
const aiService = require('../../services/ai.service');

const classifyScope = async (message, options = {}) => {
  try {
    const rawJson = await aiService.generateScopeClassification({
      message,
      usageContext: options.usageContext,
    });
    const parsed = JSON.parse(rawJson);
    
    // Map internal classification back to our standard intents if necessary
    let intent = parsed.intent || ASSISTANT_INTENTS.UNKNOWN;
    
    if (parsed.allowed === false) {
      intent = ASSISTANT_INTENTS.OUT_OF_SCOPE;
    }

    return {
      intent,
      allowed: parsed.allowed !== false,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reason: parsed.reason || '',
      skill: parsed.skill || null,
      needsUserInput: parsed.needsUserInput === true,
    };
  } catch (error) {
    console.error('[ScopeClassifier] Failed to classify message:', error.message);
    // On failure, default to UNKNOWN to let existing logic handle it safely
    return {
      intent: ASSISTANT_INTENTS.CLARIFICATION,
      allowed: true,
      confidence: 0,
      reason: 'fallback due to classification error',
      skill: null,
      needsUserInput: true,
      error: error.message,
    };
  }
};

module.exports = {
  classifyScope,
};
