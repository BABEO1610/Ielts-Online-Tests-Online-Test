const { ASSISTANT_INTENTS } = require('./assistant.intent');

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

const stripCodeFence = (value) =>
  String(value || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const tryParseJson = (rawText) => {
  const cleaned = stripCodeFence(rawText);
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

const normalizeSuggestedLinks = (links) => {
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => ({
      label: String(link.label || link.title || link.href || '').trim(),
      href: String(link.href || link.link || '').trim(),
    }))
    .filter((link) => link.label && link.href)
    .slice(0, 5);
};

const normalizeAssistantResponse = ({ rawText, mode, fallbackAnswer, fallbackLinks = [], allowPlainText = false }) => {
  const parsed = tryParseJson(rawText);

  if (!parsed) {
    if (STRICT_MODES.has(mode) && !allowPlainText) {
      return {
        answer: fallbackAnswer,
        suggestedLinks: fallbackLinks,
        usedDatabase: fallbackLinks.length > 0,
        needsMoreContext: true,
        safety: { ...DEFAULT_SAFETY },
      };
    }

    return {
      answer: stripCodeFence(rawText) || fallbackAnswer,
      suggestedLinks: fallbackLinks,
      usedDatabase: fallbackLinks.length > 0,
      needsMoreContext: false,
      safety: { ...DEFAULT_SAFETY },
    };
  }

  return {
    answer: String(parsed.answer || fallbackAnswer || '').trim(),
    suggestedLinks: normalizeSuggestedLinks(parsed.suggestedLinks).length
      ? normalizeSuggestedLinks(parsed.suggestedLinks)
      : fallbackLinks,
    usedDatabase: Boolean(parsed.usedDatabase),
    needsMoreContext: Boolean(parsed.needsMoreContext),
    safety: {
      ...DEFAULT_SAFETY,
      ...(parsed.safety && typeof parsed.safety === 'object' ? parsed.safety : {}),
    },
  };
};

module.exports = {
  normalizeAssistantResponse,
};
