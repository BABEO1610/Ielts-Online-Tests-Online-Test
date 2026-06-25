const ASSISTANT_INTENTS = {
  GREETING: 'GREETING',
  NAVIGATION: 'NAVIGATION',
  GENERAL_STUDY_TIPS: 'GENERAL_STUDY_TIPS',
  IELTS_KNOWLEDGE: 'IELTS_KNOWLEDGE',
  FIND_TEST: 'FIND_TEST',
  FIND_LESSON: 'FIND_LESSON',
  POST_TEST_REVIEW: 'POST_TEST_REVIEW',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  CLARIFICATION: 'CLARIFICATION',
  GRADING_REQUEST_SAFE_FEEDBACK: 'GRADING_REQUEST_SAFE_FEEDBACK',
  WEBSITE_HELP: 'WEBSITE_HELP',
  UNKNOWN: 'UNKNOWN',
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Ä‘/g, 'd');

const hasAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const isTestLookup = (text) => hasAny(text, [
  /\b(mock test|practice test|ielts test|test|bai test|bai thi|de thi|de bai|de reading|de listening|de writing|de speaking)\b/,
  /\b(co|co may|bao nhieu|danh sach|hien thi|liet ke|tim|find|search|goi y|de xuat)\b.*\b(de|bai thi|test|mock)\b/,
  /\b(reading|listening|writing|speaking)\b.*\b(de|bai|test|mock)\b/,
  /\b(de|bai|test|mock)\b.*\b(reading|listening|writing|speaking)\b/,
  /\b(thu vien|library)\b.*\b(de|bai thi|test|mock)\b/,
]);

const isLessonLookup = (text) => hasAny(text, [
  /\b(lesson|bai hoc|resource|tai lieu|video|article)\b/,
  /\b(thu vien|library)\b.*\b(lesson|bai hoc|resource|tai lieu|video|article|pdf|audio)\b/,
  /\b(co|tim|find|search|goi y|de xuat)\b.*\b(bai hoc|lesson|resource|tai lieu)\b/,
]);

const isExplicitTestLookup = (text) => hasAny(text, [
  /\b(mock test|practice test|ielts test|bai thi|de thi)\b/,
  /\b(reading|listening|writing|speaking)\b.*\b(test|mock|de thi)\b/,
  /\b(test|mock|de thi)\b.*\b(reading|listening|writing|speaking)\b/,
]);

const isLibraryLookup = (text, context) => {
  if (context?.pageType !== 'library') return false;
  if (isExplicitTestLookup(text)) return false;
  return hasAny(text, [
    /\b(thu vien|library|tai lieu|pdf|audio|video|sach|resource|lesson)\b/,
    /\b(co|tim|find|search|danh sach|liet ke|hien thi)\b/,
  ]);
};

const isIeltsKnowledge = (text) => {
  if (!hasAny(text, [/\bielts\b/, /\b(reading|listening|writing|speaking)\b/, /\b(cohesion|coherence|paraphrase|grammar|vocabulary|lexical|fluency|pronunciation)\b/])) {
    return false;
  }

  return hasAny(text, [
    /\b(cohesion|coherence|task achievement|task response|lexical resource|grammatical range|fluency|pronunciation)\b/,
    /\b(paraphrase|viet lai|dien dat lai|rewrite|rephrase)\b/,
    /\b(band\s*[0-9]|criteria|tieu chi|can gi|yeu cau)\b/,
    /\b(word count|bao nhieu tu|so tu)\b/,
    /\b(strategy|chien luoc|tip|tips|cach hoc|hoc nhu the nao|improve|cai thien|luyen)\b/,
    /\b(grammar|ngu phap|vocabulary|tu vung)\b/,
  ]);
};

const detectIntent = ({ message, context = {} }) => {
  const text = normalizeText(message);

  if (context.attemptId || context.pageType === 'review' || context.pageType === 'result') {
    if (hasAny(text, [/\b(cau|question|q)\s*\d+\b/, /\b(vi sao|why|giai thich|explain|dap an|answer)\b/])) {
      return ASSISTANT_INTENTS.POST_TEST_REVIEW;
    }
  }

  if (hasAny(text, [
    /\b(bitcoin|crypto|blockchain|stock|forex|weather|forecast|casino|game|gaming)\b/,
    /\b(thoi tiet|gia vang|gia do la|gia bitcoin|ca cuoc)\b/,
    /\b(code|react|javascript|python|java|html|css|lập trình|lap trinh)\b/,
  ])) {
    return ASSISTANT_INTENTS.OUT_OF_SCOPE;
  }

  if (hasAny(text, [
    /\b(cham|grade|score|danh gia)\b.*\b(band|writing|speaking|essay|bai)\b/,
    /\bband\b.*\b(may|score|diem|du doan|predict)\b/,
  ])) {
    return ASSISTANT_INTENTS.GRADING_REQUEST_SAFE_FEEDBACK;
  }

  if (hasAny(text, [
    /^(hi|hello|hey|chao|xin chao|alo|cam on|thank)(\s|!|\.|$)/,
    /\b(chao ban|xin chao|hello assistant|cam on ban)\b/,
  ])) {
    return ASSISTANT_INTENTS.GREETING;
  }

  if (isLibraryLookup(text, context)) {
    return ASSISTANT_INTENTS.FIND_LESSON;
  }

  if (isTestLookup(text)) {
    return ASSISTANT_INTENTS.FIND_TEST;
  }

  if (isLessonLookup(text)) {
    return ASSISTANT_INTENTS.FIND_LESSON;
  }

  if (isIeltsKnowledge(text)) {
    return ASSISTANT_INTENTS.IELTS_KNOWLEDGE;
  }

  return ASSISTANT_INTENTS.UNKNOWN;
};

module.exports = {
  ASSISTANT_INTENTS,
  detectIntent,
  normalizeText,
};
