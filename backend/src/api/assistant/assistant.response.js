/**
 * ==========================================
 * UTILS: XỬ LÝ PHẢN HỒI TỪ AI (AI Response Parser)
 * ==========================================
 * Nhiệm vụ: Hứng kết quả thô từ con AI trả về, dọn dẹp các ký tự thừa (như ```json), 
 * parse nó thành Object JSON chuẩn, và xử lý các trường hợp AI trả về lỗi (Fallback).
 */
const { ASSISTANT_INTENTS } = require('./assistant.intent');
const { ASSISTANT_CONTEXT_RESULT_LIMIT } = require('./assistant.constants');

const STRICT_MODES = new Set([
  ASSISTANT_INTENTS.FIND_TEST,
  ASSISTANT_INTENTS.FIND_LESSON,
  ASSISTANT_INTENTS.POST_TEST_REVIEW,
]);

const DEFAULT_SAFETY = {
  inventedContent: false,
  outOfScope: false,
  containsBandScore: false,
  containsWritingSpeakingGrading: false,
};

// Cắt bỏ chuỗi bọc mã (ví dụ: ```json ... ```) mà AI thường hay tự động chèn vào
const stripCodeFence = (value) =>
  String(value || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

// Kiểm tra nhanh xem chuỗi trả về có hình dáng giống JSON không (bắt đầu bằng { hoặc [)
const looksLikeJson = (value) => /^[\[{]/.test(value) || (value.includes('{') && value.includes('}'));

// Cố gắng parse chuỗi JSON. Nếu lỗi, thử dùng mẹo cắt lấy phần bên trong ngoặc {} đầu tiên
const tryParseJson = (cleaned) => {
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

// Chuẩn hóa danh sách các link gợi ý do AI trả về để đảm bảo không bị lỗi format
const normalizeSuggestedLinks = (links) => {
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => {
      const href = String(link.href || link.url || link.link || '').trim();
      return {
        label: String(link.label || link.title || href || '').trim(),
        href,
        url: href,
        type: String(link.type || 'route').trim(),
      };
    })
    .filter((link) => link.label && link.href)
    .slice(0, ASSISTANT_CONTEXT_RESULT_LIMIT);
};

// Hàm chính: Nhận câu trả lời thô của AI, làm sạch, bóc tách JSON và trả về kết quả chuẩn mực
const normalizeAssistantResponse = ({ rawText, mode, fallbackAnswer, fallbackLinks = [], allowPlainText = false }) => {
  const cleaned = stripCodeFence(rawText);
  const jsonLike = looksLikeJson(cleaned);
  const parsed = cleaned ? tryParseJson(cleaned) : null;

  const invalidResult = (format, reason, answer = '') => ({
    answer,
    suggestedLinks: [],
    usedDatabase: false,
    needsMoreContext: true,
    safety: { ...DEFAULT_SAFETY },
    aiResponseValid: false,
    aiResponseFormat: format,
    invalidReason: reason,
  });

  if (!cleaned) {
    if (mode === ASSISTANT_INTENTS.IELTS_KNOWLEDGE) {
      return invalidResult('empty', 'empty_response');
    }
    return {
      ...invalidResult('empty', 'empty_response', fallbackAnswer),
      suggestedLinks: fallbackLinks,
      usedDatabase: fallbackLinks.length > 0,
    };
  }

  if (!parsed) {
    if (STRICT_MODES.has(mode) && !allowPlainText) {
      return {
        answer: fallbackAnswer,
        suggestedLinks: fallbackLinks,
        usedDatabase: fallbackLinks.length > 0,
        needsMoreContext: true,
        safety: { ...DEFAULT_SAFETY },
        aiResponseValid: false,
        aiResponseFormat: jsonLike ? 'invalid_json' : 'plain_text',
        invalidReason: jsonLike ? 'invalid_json' : 'plain_text_not_allowed',
      };
    }

    return {
      answer: cleaned,
      suggestedLinks: fallbackLinks,
      usedDatabase: fallbackLinks.length > 0,
      needsMoreContext: false,
      safety: { ...DEFAULT_SAFETY },
      aiResponseValid: true,
      aiResponseFormat: jsonLike ? 'invalid_json' : 'plain_text',
      invalidReason: null,
    };
  }

  const answer = String(parsed.answer || '').trim();
  if (!answer && mode === ASSISTANT_INTENTS.IELTS_KNOWLEDGE) {
    return invalidResult('json', 'missing_answer');
  }

  return {
    answer: answer || String(fallbackAnswer || '').trim(),
    suggestedLinks: normalizeSuggestedLinks(parsed.suggestedLinks).length
      ? normalizeSuggestedLinks(parsed.suggestedLinks)
      : fallbackLinks,
    usedDatabase: Boolean(parsed.usedDatabase),
    needsMoreContext: Boolean(parsed.needsMoreContext),
    safety: {
      ...DEFAULT_SAFETY,
      ...(parsed.safety && typeof parsed.safety === 'object' ? parsed.safety : {}),
    },
    aiResponseValid: Boolean(answer || fallbackAnswer),
    aiResponseFormat: 'json',
    invalidReason: answer ? null : 'missing_answer',
  };
};

module.exports = {
  normalizeAssistantResponse,
};
