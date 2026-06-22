const ASSISTANT_INTENTS = {
  GREETING: 'GREETING',
  NAVIGATION: 'NAVIGATION',
  GENERAL_STUDY_TIPS: 'GENERAL_STUDY_TIPS',
  FIND_TEST: 'FIND_TEST',
  FIND_LESSON: 'FIND_LESSON',
  POST_TEST_REVIEW: 'POST_TEST_REVIEW',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  UNKNOWN: 'UNKNOWN',
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const hasAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

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
  ])) {
    return ASSISTANT_INTENTS.OUT_OF_SCOPE;
  }

  if (hasAny(text, [
    /^(hi|hello|hey|chao|xin chao|alo|cam on|thank)(\s|!|\.|$)/,
    /\b(chao ban|xin chao|hello assistant|cam on ban)\b/,
  ])) {
    return ASSISTANT_INTENTS.GREETING;
  }

  if (hasAny(text, [
    /\b(o dau|vao dau|di dau|mo trang|trang nao|navigation|navigate|route|link)\b/,
    /\b(profile|lich su|history|library|thu vien|ket qua|result|review|lesson page|test page)\b/,
  ])) {
    return ASSISTANT_INTENTS.NAVIGATION;
  }

  if (hasAny(text, [
    /\b(lesson|bai hoc|resource|tai lieu|video|article|library|thu vien)\b/,
    /\b(co|tim|find|search|goi y|de xuat)\b.*\b(bai hoc|lesson|resource|tai lieu)\b/,
  ])) {
    return ASSISTANT_INTENTS.FIND_LESSON;
  }

  if (hasAny(text, [
    /\b(mock test|practice test|ielts test|test|de thi|de reading|de listening|de writing|de speaking)\b/,
    /\b(co|tim|find|search|goi y|de xuat)\b.*\b(de|test|mock|reading|listening|writing|speaking|topic)\b/,
  ])) {
    return ASSISTANT_INTENTS.FIND_TEST;
  }

  if (hasAny(text, [
    /\b(tip|tips|cach hoc|hoc nhu the nao|on tap|chien luoc|strategy|improve|cai thien|luyen)\b/,
    /\b(reading|listening|writing|speaking)\b.*\b(tot hon|improve|cai thien|practice|luyen)\b/,
  ])) {
    return ASSISTANT_INTENTS.GENERAL_STUDY_TIPS;
  }

  if (hasAny(text, [/\bielts\b/, /\b(reading|listening|writing|speaking)\b/])) {
    return ASSISTANT_INTENTS.GENERAL_STUDY_TIPS;
  }

  return ASSISTANT_INTENTS.UNKNOWN;
};

module.exports = {
  ASSISTANT_INTENTS,
  detectIntent,
  normalizeText,
};
