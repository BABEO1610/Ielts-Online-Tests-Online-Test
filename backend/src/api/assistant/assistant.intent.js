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
    .replace(/Đ/g, 'd')
    .replace(/Ä‘/g, 'd');

const hasAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const normalizeKeywordText = (value) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasAnyAlias = (text, aliases) => {
  const normalizedText = normalizeKeywordText(text);
  return aliases.some((alias) => normalizedText.includes(normalizeKeywordText(alias)));
};

const normalizeImmediateText = (value) => {
  const text = normalizeKeywordText(value)
    .replace(/\bbajn\b/g, 'ban')
    .replace(/\bbn\b/g, 'ban')
    .replace(/\bcan on\b/g, 'cam on')
    .replace(/\bcamon\b/g, 'cam on')
    .replace(/\bthank+s+\b/g, 'thanks')
    .replace(/\bhell+o\b/g, 'hello')
    .replace(/\bchao+\b/g, 'chao')
    .replace(/\s+/g, ' ')
    .trim();
  return text === 'cam on b' ? 'cam on ban' : text;
};

const IMMEDIATE_RESPONSE_ALIASES = [
  'hi',
  'hello',
  'hey',
  'chao',
  'xin chao',
  'alo',
  'cam on',
  'cam on ban',
  'cam on b',
  'camon',
  'thank',
  'thanks',
  'thank you',
  'tks',
  'thx',
  'bye',
  'goodbye',
  'tam biet',
  'hen gap lai',
];

const isShortImmediateMessage = (text) => {
  const tokens = text.split(/\s+/).filter(Boolean);
  return text.length <= 40 && tokens.length <= 6;
};

const isImmediateGreetingOrThanks = (message) => {
  const text = normalizeImmediateText(message);
  return isShortImmediateMessage(text) && IMMEDIATE_RESPONSE_ALIASES.some((alias) => (
    text === normalizeImmediateText(alias) || text.startsWith(`${normalizeImmediateText(alias)} `)
  ));
};

const SKILL_PATTERN = /\b(reading|listening|writing|speaking)\b/;

const hasKnowledgePurposeSignal = (text) => hasAny(text, [
  /\b(cach lam|lam sao|phuong phap|ap dung|meo|chien luoc|chien thuat|ky thuat|huong dan)\b/,
  /\b(giai thich|phan biet|khac gi|khac nhau|cai thien|tang band|xu ly|tranh sai|kinh nghiem)\b/,
  /\b(nen hoc.*the nao|hoc.*the nao)\b/,
  /\b(how to|method|strategy|technique|apply|improve|tips|explain|difference between|avoid mistakes)\b/,
]);

const hasLearningSubjectSignal = (text) => (
  hasAnyAlias(text, IELTS_KNOWLEDGE_ALIASES) ||
  hasAnyAlias(text, ENGLISH_LEARNING_ALIASES) ||
  hasAny(text, [
    /\bielts\b/,
    SKILL_PATTERN,
    /\b(skimming|scanning|skim|scan|tfng|keyword|keywords|paragraph|passage)\b/,
    /\b(bai doc|doan van|bai nghe|bai viet|bai noi)\b/,
    /\b(task\s*[12]|part\s*[123]|section\s*[1-4]|overview|essay|cue card)\b/,
  ])
);

const isKnowledgeStrategyQuery = (text) =>
  hasKnowledgePurposeSignal(text) && hasLearningSubjectSignal(text);

const isExplicitTestLookup = (text) => hasAny(text, [
  /\b(mock test|practice test|ielts test|bai thi|de thi)\b/,
  /\b(co|co .*khong|co .*nao|bao nhieu|danh sach|hien thi|liet ke)\b.*\b(de|de thi|bai thi|bai test|test|mock)\b/,
  /\b(tim|find|search|goi y|de xuat|show me|give me|cho toi|cho minh|cho em|lay)\b.*\b(de thi|bai thi|bai test|test|mock)\b/,
  /\b(tim|find|search|goi y|de xuat|cho toi|cho minh|cho em|lay)\b.*\bde\s+(reading|listening|writing|speaking|moi|cu|nao|so|\d{1,3})\b/,
  /\b(mo|vao|open|start|take)\b.*\b(de thi|bai thi|bai test|test|mock)\b/,
  /\b(mo|vao)\b.*\bde\s+(reading|listening|writing|speaking|moi|cu|nao|so|\d{1,3})\b/,
  /\b(mo|vao|open|start|take)\b.*\bbai\s*\d{1,3}\b.*\b(reading|listening|writing|speaking)\b/,
  /\b(de|de thi|bai thi|bai test|test|mock)\b.*\b(moi nhat|cu nhat|latest|newest|oldest|recent|so\s*\d{1,3}|\d{1,3})\b/,
  /\b(reading|listening|writing|speaking)\b.*\b(test|mock|de thi)\b.*\b(moi nhat|cu nhat|latest|newest|oldest|recent|so\s*\d{1,3}|\d{1,3})\b/,
  /\b(test|mock|de thi)\b.*\b(reading|listening|writing|speaking)\b/,
  /\b(de|test|mock)\b.*\btrong he thong\b/,
]);

const isTestLookup = (text) => isExplicitTestLookup(text);

const isLessonLookup = (text) => hasAny(text, [
  /\b(lesson|bai hoc|resource|tai lieu|video|article)\b/,
  /\b(thu vien|library)\b.*\b(lesson|bai hoc|resource|tai lieu|video|article|pdf|audio|gi|de|bai)\b/,
  /\b(co|thu vien|library)\b.*\b(pdf|audio|video|grammar|tai lieu)\b/,
  /\b(co|tim|find|search|goi y|de xuat)\b.*\b(bai hoc|lesson|resource|tai lieu)\b/,
]);

const isAmbiguousLibraryTestLookup = (text, context) => {
  if (context?.pageType === 'library') return false;
  if (isExplicitTestLookup(text)) return false;
  return false;
};

const isLibraryLookup = (text, context) => {
  if (context?.pageType !== 'library') return false;
  if (/\b(mock test|practice test|ielts test|bai thi|de thi|test|mock)\b/.test(text)) return false;
  return hasAny(text, [
    /\b(thu vien|library|tai lieu|pdf|audio|video|sach|resource|lesson)\b/,
    /\b(co|tim|find|search|danh sach|liet ke|hien thi)\b/,
  ]);
};

const isAmbiguousSkillRequest = (text) => hasAny(text, [
  /^(reading|listening|writing|speaking)(\s+(di|nhe|nhé|please))?$/,
  /^(cho toi|cho minh|cho em)\s+(reading|listening|writing|speaking)(\s+(di|nhe|nhé|please))?$/,
  /^(bai|de)\s+(reading|listening|writing|speaking)$/,
]);

const isContextDependentStrategyFollowUp = (text) => hasAny(text, [
  /\b(ap dung|apply)\b.*\b(phuong phap|method|strategy|technique|cach)\b.*\b(do|nay|this|that)\b/,
  /\b(phuong phap|method|strategy|technique|cach)\s+(do|nay|this|that)\b/,
]);

const isContextDependentPracticeFollowUp = (text) => hasAny(text, [
  /\b(de|bai|test)\s+khac\b/,
  /\b(another|other)\s+(test|one|practice)\b/,
  /\b(cho toi|cho minh|cho em|give me|show me)\b.*\b(bai|de|test|practice)\b.*\b(luyen|practice)\b.*\b(cach|phuong phap|method|strategy|technique)\s+(nay|do|this|that)\b/,
]);

const IELTS_KNOWLEDGE_ALIASES = [
  'matching heading',
  'matching headings',
  'chon tieu de',
  'chọn tiêu đề',
  'noi tieu de',
  'nối tiêu đề',
  'noi heading',
  'nối heading',
  'dang noi tieu de',
  'dạng nối tiêu đề',
  'dang noi heading',
  'dạng nối heading',
  'dang chon tieu de',
  'dạng chọn tiêu đề',
  'y chinh paragraph',
  'ý chính paragraph',
  'main idea',
  'true false not given',
  'tfng',
  'false vs not given',
  'dung sai khong co thong tin',
  'đúng sai không có thông tin',
  'task 1 overview',
  'overview task 1',
  'viet overview',
  'viết overview',
  'task 2 essay types',
  'dang bai task 2',
  'dạng bài task 2',
  'listening section 3',
  'section 3 listening',
  'speaking part 2',
  'cue card',
  'tieu chi speaking',
  'tiêu chí speaking',
  'tieu chi writing',
  'tiêu chí writing',
];

const ENGLISH_LEARNING_ALIASES = [
  'english learning',
  'learn english',
  'hoc tieng anh',
  'học tiếng anh',
  'grammar',
  'ngu phap',
  'ngữ pháp',
  'vocabulary',
  'tu vung',
  'từ vựng',
  'pronunciation',
  'phat am',
  'phát âm',
  'how to pronounce',
  'pronounce difficult english words',
  'speak english',
  'speaking english',
  'noi tieng anh',
  'nói tiếng anh',
  'speak fluently',
  'write better',
  'writing better',
  'cach viet tieng anh',
  'cách viết tiếng anh',
  'complex sentence',
  'paraphrase',
  'rewrite sentence',
  'collocation',
  'synonym',
  'difference between',
  'phan biet',
  'phân biệt',
  'although',
  'despite',
  'however',
  'therefore',
  'because',
  'even though',
  'in spite of',
  'affect effect',
];

const isIeltsKnowledge = (text) => {
  if (hasAnyAlias(text, IELTS_KNOWLEDGE_ALIASES) || hasAnyAlias(text, ENGLISH_LEARNING_ALIASES)) {
    return true;
  }

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
    /\b(politics|chinh tri)\b/,
    /\b(news|tin tuc)\b.*\b(today|hom nay|latest|moi nhat)\b/,
    /\b(thoi tiet|gia vang|gia do la|gia bitcoin|ca cuoc)\b/,
    /\b(tu van mua|nen mua|mua)\b.*\b(dien thoai|iphone|android|laptop|may tinh|san pham|product)\b/,
    /\b(dien thoai|iphone|android|laptop|may tinh)\b.*\b(nao|mua|nen chon|tu van)\b/,
    /\b(hack|cheat|bypass|crack)\b/,
    /\b(medical advice|legal advice|financial advice|investment advice)\b/,
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

  if (isImmediateGreetingOrThanks(message) || hasAny(text, [
    /^(hi|hello|hey|chao|xin chao|alo|cam on|thank)(\s|!|\.|$)/,
    /\b(chao ban|xin chao|hello assistant|cam on ban)\b/,
  ])) {
    return ASSISTANT_INTENTS.GREETING;
  }

  if (isContextDependentPracticeFollowUp(text)) {
    if (isExplicitTestLookup(text)) {
      return ASSISTANT_INTENTS.FIND_TEST;
    }
    if ([ASSISTANT_INTENTS.FIND_TEST, ASSISTANT_INTENTS.IELTS_KNOWLEDGE].includes(context.previousIntent)) {
      return ASSISTANT_INTENTS.FIND_TEST;
    }
    return ASSISTANT_INTENTS.CLARIFICATION;
  }

  if (isContextDependentStrategyFollowUp(text)) {
    if (isExplicitTestLookup(text)) {
      return ASSISTANT_INTENTS.FIND_TEST;
    }
    if (context.previousIntent === ASSISTANT_INTENTS.IELTS_KNOWLEDGE) {
      return ASSISTANT_INTENTS.IELTS_KNOWLEDGE;
    }
    return ASSISTANT_INTENTS.CLARIFICATION;
  }

  if (isAmbiguousSkillRequest(text)) {
    return ASSISTANT_INTENTS.CLARIFICATION;
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

  if (isKnowledgeStrategyQuery(text)) {
    return ASSISTANT_INTENTS.IELTS_KNOWLEDGE;
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
