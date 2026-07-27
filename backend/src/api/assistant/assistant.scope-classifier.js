/**
 * ==========================================
 * UTILS: PHÂN LOẠI NHANH (Scope Classifier)
 * ==========================================
 * Nhiệm vụ: Gửi một prompt nhỏ cho AI để nhờ nó phân loại nhanh ý định của người dùng 
 * (ví dụ: đây là câu hỏi IELTS, hay là câu hỏi hỏi đường/tìm quán ăn).
 */
const { ASSISTANT_INTENTS } = require('./assistant.intent');
const aiService = require('../../services/ai.service');

// Gọi API Gemini/OpenAI cực nhanh để lấy nhãn phân loại (intent, allowed, confidence)
const classifyScope = async (message, options = {}) => {
  try {
    const rawJson = await aiService.generateScopeClassification({
      message,
      recentMessages: options.recentMessages || [],
      routingHints: options.routingHints || {},
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
