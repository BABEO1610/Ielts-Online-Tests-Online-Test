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
]);

const isLessonLookup = (text) => hasAny(text, [
  /\b(lesson|bai hoc|resource|tai lieu|video|article)\b/,
  /\b(thu vien|library)\b.*\b(lesson|bai hoc|resource|tai lieu|video|article|pdf|audio|gi|de|bai)\b/,
  /\b(co|thu vien|library)\b.*\b(pdf|audio|video|grammar|tai lieu)\b/,
  /\b(co|tim|find|search|goi y|de xuat)\b.*\b(bai hoc|lesson|resource|tai lieu)\b/,
]);

const isExplicitTestLookup = (text) => hasAny(text, [
  /\b(mock test|practice test|ielts test|bai thi|de thi)\b/,
  /\b(reading|listening|writing|speaking)\b.*\b(test|mock|de thi)\b/,
  /\b(test|mock|de thi)\b.*\b(reading|listening|writing|speaking)\b/,
]);

const isAmbiguousLibraryTestLookup = (text, context) => {
  if (context?.pageType === 'library') return false;
  if (isExplicitTestLookup(text)) return false;
  return false;
};

const isLibraryLookup = (text, context) => {
  if (context?.pageType !== 'library') return false;
  if (isExplicitTestLookup(text)) return false;
  return hasAny(text, [
    /\b(thu vien|library|tai lieu|pdf|audio|video|sach|resource|lesson)\b/,
    /\b(co|tim|find|search|danh sach|liet ke|hien thi)\b/,
  ]);
};

const isIeltsKnowledge = (text) => {
  const hasIeltsOrEnglishSignal = hasAny(text, [
    /\bielts\b/,
    /\b(reading|listening|writing|speaking)\b/,
    /\b(cohesion|coherence|paraphrase|grammar|vocabulary|lexical|fluency|pronunciation)\b/,
    /\b(skimming|scanning|true false not given|matching headings|overview|essay|task\s*[12]|part\s*[123])\b/,
    /\b(english|tieng anh|tu vung|ngu phap|dich|nghia|la gi)\b/,
  ]);

  const isMeaningOrTranslation = hasAny(text, [
    /\b[a-z]+(?:\s+[a-z]+){1,8}\s+(la gi|nghia la gi|co nghia la gi)\b/,
    /\b(dich|translate|nghia|meaning)\b/,
  ]);

  if (!hasIeltsOrEnglishSignal && !isMeaningOrTranslation) {
    return false;
  }

  return hasAny(text, [
    /\b[a-z]+(?:\s+[a-z]+){1,8}\s+(la gi|nghia la gi|co nghia la gi)\b/,
    /\b(dich|translate|nghia|meaning)\b/,
    /\b(cohesion|coherence|task achievement|task response|lexical resource|grammatical range|fluency|pronunciation)\b/,
    /\b(paraphrase|viet lai|dien dat lai|rewrite|rephrase)\b/,
    /\b(band\s*[0-9]|criteria|tieu chi|can gi|yeu cau)\b/,
    /\b(word count|bao nhieu tu|so tu)\b/,
    /\b(strategy|chien luoc|tip|tips|cach hoc|hoc nhu the nao|improve|cai thien|luyen|lam sao|cach lam|meo)\b/,
    /\b(grammar|ngu phap|vocabulary|tu vung)\b/,
    /\b(task\s*1|task\s*2|overview|essay|outline|dan y|introduction|conclusion)\b/,
    /\b(speaking part\s*[123]|part\s*[123]|tra loi bao lau)\b/,
    /\b(skimming|scanning|matching headings|true false not given|section\s*[1-4]|keyword|keywords)\b/,
    /\b(meo hoc|cach hoc|hoc .*the nao|kinh nghiem|chien thuat)\b.*\b(reading|listening|writing|speaking)\b/,
    /\b(reading|listening|writing|speaking)\b.*\b(lam sao|the nao|meo|cach hoc|kinh nghiem|chien thuat)\b/,
    /\b(cach lam|lam sao|meo)\b.*\b(matching headings|true false not given|overview)\b/,
    /\b(cach viet)\b.*\boverview\b/,
  ]);
};

const isReviewRequest = (text) => hasAny(text, [
  /\b(vi sao|why|giai thich|explain)\b.*\b(cau|question|q)\s*\d+\b/,
  /\b(cau|question|q)\s*\d+\b.*\b(sai|dung|why|vi sao|giai thich)\b/,
  /\b(review|xem lai|sai phan nao|sai.*nhieu|bai vua roi|ket qua bai)\b/,
]);

const isNavigation = (text) => hasAny(text, [
  /\b(mo|vao|xem|di den|navigate|open)\b.*\b(trang listening|trang reading|trang writing|trang speaking|thu vien|library|profile|lich su|history)\b/,
  /\b(xem lich su lam bai|practice history|vao thu vien|xem profile)\b/,
]);

const detectIntent = ({ message, context = {} }) => {
  const text = normalizeText(message);

  if (isReviewRequest(text)) {
    return ASSISTANT_INTENTS.POST_TEST_REVIEW;
  }

  if (context.attemptId || context.pageType === 'review' || context.pageType === 'result') {
    if (hasAny(text, [/\b(cau|question|q)\s*\d+\b/, /\b(vi sao|why|giai thich|explain|dap an|answer|review|xem lai)\b/])) {
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

  if (isAmbiguousLibraryTestLookup(text, context)) {
    return ASSISTANT_INTENTS.CLARIFICATION;
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

  if (isNavigation(text)) {
    return ASSISTANT_INTENTS.NAVIGATION;
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
