const { normalizeText } = require('./assistant.intent');
const { loadKnowledgeBase } = require('./assistant.knowledge-base');

const MAX_CHUNKS = 5;
const MAX_CHUNK_CONTENT_CHARS = 800;
const MAX_TOTAL_CONTENT_CHARS = 3000;
const MIN_SCORE = 5;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'be', 'by', 'can', 'do', 'does', 'for', 'from', 'how',
  'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'the', 'this', 'to', 'what', 'with',
  'ielts', 'lam', 'sao', 'the', 'nao', 'cach', 'cho', 'toi', 'em', 'minh', 'ban',
  'khong', 'co', 'gi', 'de', 'hoc', 'hay', 'nen', 'viet', 'noi', 'cau', 'nay',
]);

const QUERY_ALIASES = {
  matching_headings: [
    'matching heading',
    'matching headings',
    'heading',
    'headings',
    'chon tieu de',
    'chọn tiêu đề',
    'noi tieu de',
    'nối tiêu đề',
    'dang noi tieu de',
    'dạng nối tiêu đề',
    'cach lam dang noi tieu de',
    'cách làm dạng nối tiêu đề',
    'tim tieu de',
    'tìm tiêu đề',
    'y chinh',
    'ý chính',
    'main idea',
  ],

  true_false_not_given: [
    'true false not given',
    'tfng',
    'not given',
    'false vs not given',
    'phan biet false not given',
    'phân biệt false not given',
    'dung sai khong co thong tin',
    'đúng sai không có thông tin',
  ],

  task1_overview: [
    'task 1 overview',
    'overview task 1',
    'viet overview',
    'viết overview',
    'viet tong quan',
    'viết tổng quan',
    'tong quan task 1',
    'tổng quan task 1',
  ],

  task2_essay_types: [
    'task 2 essay types',
    'dang bai task 2',
    'dạng bài task 2',
    'agree disagree',
    'discuss both views',
    'advantages disadvantages',
    'problem solution',
    'two part question',
    'two-part question',
  ],

  listening_section_3: [
    'listening section 3',
    'section 3 listening',
    'nghe section 3',
    'section 3',
    'academic discussion',
    'distractor',
    'bay dap an',
    'bẫy đáp án',
  ],

  speaking_part_2: [
    'speaking part 2',
    'part 2 speaking',
    'cue card',
    'noi 2 phut',
    'nói 2 phút',
    'tra loi bao lau',
    'trả lời bao lâu',
  ],

  writing_band_descriptors: [
    'writing criteria',
    'writing band descriptor',
    'tieu chi writing',
    'tiêu chí writing',
    'tieu chi cham writing',
    'tiêu chí chấm writing',
    'task response',
    'task achievement',
    'coherence cohesion',
    'lexical resource',
    'grammar range',
  ],

  speaking_band_descriptors: [
    'speaking criteria',
    'speaking band descriptor',
    'tieu chi speaking',
    'tiêu chí speaking',
    'tieu chi cham speaking',
    'tiêu chí chấm speaking',
    'fluency coherence',
    'lexical resource',
    'pronunciation',
  ],

  english_grammar: [
    'grammar',
    'ngu phap',
    'ngữ pháp',
    'cau truc cau',
    'cấu trúc câu',
    'sentence structure',
    'tense',
    'tenses',
    'relative clause',
    'conditional sentence',
    'although',
    'despite',
    'however',
    'therefore',
    'because',
    'even though',
    'in spite of',
  ],

  english_vocabulary: [
    'vocabulary',
    'tu vung',
    'từ vựng',
    'word choice',
    'collocation',
    'synonym',
    'paraphrase',
    'academic words',
    'ielts vocabulary',
    'affect effect',
    'difference between',
    'phân biệt',
    'phan biet',
  ],

  english_pronunciation: [
    'pronunciation',
    'phat am',
    'phát âm',
    'stress',
    'intonation',
    'rhythm',
    'pronounce',
    'how to pronounce',
    'how do i pronounce',
    'pronounce difficult english words',
    'noi sao cho tu nhien',
    'nói sao cho tự nhiên',
  ],

  english_writing_general: [
    'write better',
    'writing better',
    'cach viet tieng anh',
    'cách viết tiếng anh',
    'complex sentence',
    'topic sentence',
    'cohesion',
    'coherence',
    'paraphrase sentence',
    'rewrite sentence',
  ],

  english_speaking_general: [
    'speak english',
    'speaking english',
    'noi tieng anh',
    'nói tiếng anh',
    'fluency',
    'speak fluently',
    'how to answer',
    'mo rong cau tra loi',
    'mở rộng câu trả lời',
  ],
};

const IELTS_QUESTION_TYPE_KEYS = [
  'true_false_not_given',
  'matching_headings',
  'listening_section_3',
  'task1_overview',
  'task2_essay_types',
  'speaking_part_2',
  'writing_band_descriptors',
  'speaking_band_descriptors',
];

const ENGLISH_LEARNING_TOPIC_KEYS = [
  'english_grammar',
  'english_vocabulary',
  'english_pronunciation',
  'english_writing_general',
  'english_speaking_general',
];

const GENERAL_ENGLISH_NO_RETRIEVAL_TOPICS = new Set([
  'english_grammar',
  'english_vocabulary',
  'english_pronunciation',
  'english_speaking_general',
]);

const QUESTION_TYPE_SKILL_MAP = {
  true_false_not_given: 'reading',
  matching_headings: 'reading',
  listening_section_3: 'listening',
  task1_overview: 'writing',
  task2_essay_types: 'writing',
  speaking_part_2: 'speaking',
  writing_band_descriptors: 'writing',
  speaking_band_descriptors: 'speaking',
};

const normalize = (value) =>
  normalizeText(value)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokenize = (value) =>
  normalize(value)
    .split(/\s+/)
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term));

const unique = (items) => [...new Set(items.filter(Boolean))];

const includesPhrase = (normalizedText, phrase) => {
  const normalizedPhrase = normalize(phrase);
  return normalizedPhrase.length > 0 && normalizedText.includes(normalizedPhrase);
};

const detectAliasKey = (message, keys) => {
  const text = normalize(message);
  return keys.find((key) => (QUERY_ALIASES[key] || []).some((alias) => includesPhrase(text, alias))) || null;
};

const hasIeltsBandDescriptorContext = (text) =>
  /\b(ielts|band|criteria|criterion|descriptor|descriptors|tieu chi|cham|speaking|writing)\b/.test(text);

const detectEnglishLearningTopic = (message) => {
  const questionType = detectAliasKey(message, IELTS_QUESTION_TYPE_KEYS);
  if (questionType) {
    const text = normalize(message);
    if (questionType !== 'speaking_band_descriptors' || hasIeltsBandDescriptorContext(text)) {
      return null;
    }
  }
  return detectAliasKey(message, ENGLISH_LEARNING_TOPIC_KEYS);
};

const detectSkill = (message) => {
  const text = normalize(message);
  const aliasQuestionType = detectQuestionType(message);
  if (aliasQuestionType && QUESTION_TYPE_SKILL_MAP[aliasQuestionType]) {
    return QUESTION_TYPE_SKILL_MAP[aliasQuestionType];
  }
  if (/\breading\b/.test(text) || /\b(tfng|heading|headings|skim|scan|passage)\b/.test(text)) return 'reading';
  if (/\blistening\b/.test(text) || /\b(section [1-4]|distractor|nghe)\b/.test(text)) return 'listening';
  if (/\bwriting\b/.test(text) || /\b(task 1|task 2|overview|essay|agree disagree|discuss both views)\b/.test(text)) return 'writing';
  if (/\bspeaking\b/.test(text) || /\b(cue card|part [123]|fluency|pronunciation)\b/.test(text)) return 'speaking';
  return null;
};

const detectQuestionType = (message) => {
  const text = normalize(message);
  const aliasQuestionType = detectAliasKey(message, IELTS_QUESTION_TYPE_KEYS);
  if (aliasQuestionType) {
    if (aliasQuestionType !== 'speaking_band_descriptors' || hasIeltsBandDescriptorContext(text)) {
      return aliasQuestionType;
    }
  }
  if (/\b(true false not given|tfng|not given|false vs not given|dung sai khong co thong tin)\b/.test(text)) {
    return 'true_false_not_given';
  }
  if (/\b(matching headings|heading|headings|chon tieu de|noi tieu de|main idea)\b/.test(text)) {
    return 'matching_headings';
  }
  if (/\b(section 3|academic discussion)\b/.test(text)) return 'listening_section_3';
  if (/\b(section 4|lecture)\b/.test(text)) return 'listening_section_4';
  if (/\blistening section\b/.test(text)) return 'listening_sections';
  if (/\b(task 1 overview|overview task 1|writing task 1|viet overview|overview)\b/.test(text)) {
    return 'task1_overview';
  }
  if (/\bagree disagree\b/.test(text) && /\bdiscuss both views\b/.test(text)) {
    return 'task2_essay_types';
  }
  if (/\bagree disagree\b/.test(text)) return 'agree_disagree';
  if (/\bdiscuss both views\b/.test(text)) return 'discuss_both_views';
  if (/\b(task 2|essay types|advantages disadvantages|problem solution|dang bai|writing part 2)\b/.test(text)) {
    return 'task2_essay_types';
  }
  if (/\b(part 1|speaking part 1)\b/.test(text)) return 'speaking_part_1';
  if (/\b(part 2|speaking part 2|cue card)\b/.test(text)) return 'speaking_part_2';
  if (/\b(part 3|speaking part 3)\b/.test(text)) return 'speaking_part_3';
  if (/\b(task response|task achievement|coherence cohesion|lexical resource|grammar range|tieu chi writing)\b/.test(text)) {
    return 'writing_band_descriptors';
  }
  if (/\b(fluency coherence|tieu chi speaking)\b/.test(text) || (/\bpronunciation\b/.test(text) && hasIeltsBandDescriptorContext(text))) {
    return 'speaking_band_descriptors';
  }
  if (/\b(common mistake|loi sai|hay sai|tranh sai)\b/.test(text)) return 'common_mistakes';
  return null;
};

const buildChunkSearchText = (chunk) => [
  chunk.id,
  chunk.title,
  chunk.skill,
  chunk.questionType,
  chunk.category,
  ...(chunk.tags || []),
  ...(chunk.matchHints || []),
  chunk.content,
].join(' ');

const countTokenOverlap = (queryTokens, chunkTokens) => {
  const chunkTokenSet = new Set(chunkTokens);
  return queryTokens.filter((token) => chunkTokenSet.has(token)).length;
};

const scoreChunk = ({ chunk, queryText, queryTokens, detectedSkill, detectedQuestionType }) => {
  let score = 0;
  const chunkTokens = tokenize(buildChunkSearchText(chunk));

  if (detectedSkill && (chunk.skill === detectedSkill || chunk.registrySkill === detectedSkill)) score += 5;
  else if (detectedSkill && chunk.skill && chunk.skill !== detectedSkill) score -= 3;

  const questionTypes = [chunk.questionType, ...(chunk.registryQuestionTypes || [])];
  if (detectedQuestionType && questionTypes.includes(detectedQuestionType)) score += 8;
  else if (detectedQuestionType && chunk.questionType !== 'common_mistakes') score -= 2;

  (chunk.matchHints || []).forEach((hint) => {
    if (includesPhrase(queryText, hint)) score += 4;
  });

  (chunk.tags || []).forEach((tag) => {
    if (includesPhrase(queryText, tag)) score += 2;
  });

  score += Math.min(countTokenOverlap(queryTokens, chunkTokens), 8);

  return {
    id: chunk.id,
    score,
  };
};

const chunkMatchesQuestionType = (chunk, detectedQuestionType) => {
  if (!detectedQuestionType) return false;
  return [chunk.questionType, ...(chunk.registryQuestionTypes || [])].includes(detectedQuestionType);
};

const toKnowledgeResult = (chunk, remainingChars) => {
  const maxContentLength = Math.min(MAX_CHUNK_CONTENT_CHARS, remainingChars);
  const content = chunk.content.length > maxContentLength
    ? `${chunk.content.slice(0, Math.max(0, maxContentLength - 3)).trim()}...`
    : chunk.content;
  return {
    id: chunk.id,
    title: chunk.title,
    skill: chunk.skill,
    questionType: chunk.questionType,
    category: chunk.category,
    sourceName: chunk.sourceName,
    content,
  };
};

const retrieveKnowledge = ({ message, limit = MAX_CHUNKS } = {}) => {
  const corpus = loadKnowledgeBase();
  const queryText = normalize(message);
  const queryTokens = unique(tokenize(message));
  const detectedSkill = detectSkill(message);
  const detectedQuestionType = detectQuestionType(message);
  const detectedTopic = detectEnglishLearningTopic(message);
  const effectiveLimit = Math.max(1, Math.min(Number(limit) || MAX_CHUNKS, MAX_CHUNKS));

  if (!detectedQuestionType && GENERAL_ENGLISH_NO_RETRIEVAL_TOPICS.has(detectedTopic)) {
    return {
      knowledgeResults: [],
      knowledgeDebug: {
        strategy: 'static_keyword_metadata',
        detectedSkill,
        detectedQuestionType,
        detectedTopic,
        selectedKnowledgeChunkIds: [],
        retrievalScores: [],
        usedKnowledgeBase: false,
        noMatch: true,
        totalInjectedKnowledgeChars: 0,
      },
    };
  }

  const scoredCandidates = corpus.chunks
    .map((chunk) => ({
      chunk,
      ...scoreChunk({ chunk, queryText, queryTokens, detectedSkill, detectedQuestionType }),
    }))
    .filter((item) => item.score >= MIN_SCORE);
  const exactQuestionTypeMatches = detectedQuestionType
    ? scoredCandidates.filter((item) => chunkMatchesQuestionType(item.chunk, detectedQuestionType))
    : [];
  const scored = (exactQuestionTypeMatches.length ? exactQuestionTypeMatches : scoredCandidates)
    .sort((a, b) => b.score - a.score || a.chunk.title.localeCompare(b.chunk.title));

  const selected = [];
  let totalInjectedKnowledgeChars = 0;

  for (const item of scored) {
    if (selected.length >= effectiveLimit) break;
    const remainingChars = MAX_TOTAL_CONTENT_CHARS - totalInjectedKnowledgeChars;
    if (remainingChars <= 0) break;
    const result = toKnowledgeResult(item.chunk, remainingChars);
    if (!result.content) break;
    selected.push(result);
    totalInjectedKnowledgeChars += result.content.length;
  }

  const retrievalScores = scored.slice(0, 10).map(({ id, score }) => ({ id, score }));
  const selectedKnowledgeChunkIds = selected.map((chunk) => chunk.id);
  const usedKnowledgeBase = selected.length > 0;

  return {
    knowledgeResults: selected,
    knowledgeDebug: {
      strategy: 'static_keyword_metadata',
      detectedSkill,
      detectedQuestionType,
      detectedTopic,
      selectedKnowledgeChunkIds,
      retrievalScores,
      usedKnowledgeBase,
      noMatch: !usedKnowledgeBase,
      totalInjectedKnowledgeChars,
    },
  };
};

module.exports = {
  retrieveKnowledge,
  detectSkill,
  detectQuestionType,
  detectEnglishLearningTopic,
};
