const repository = require('./assistant.repository');
const { ASSISTANT_INTENTS } = require('./assistant.intent');
const { ERROR_CODES } = require('./assistant.constants');

const WEBSITE_ROUTES = [
  { label: 'Danh sách bài test', href: '/tests' },
  { label: 'Thư viện lesson/tài liệu', href: '/library' },
  { label: 'Hồ sơ cá nhân', href: '/profile' },
  { label: 'Lịch sử luyện tập', href: '/practice-history' },
];

const STUDY_TIPS = [
  'Reading: skim câu hỏi trước, scan keyword, kiểm tra paraphrase và tránh đọc từng chữ quá lâu.',
  'Listening: đọc trước câu hỏi, dự đoán loại từ, chú ý signposting và distractors.',
  'Writing/Speaking: phase này chỉ hỗ trợ tips học tập, không chấm bài hoặc tạo band score.',
  'Sau mỗi attempt, hãy review lỗi sai và ghi lại keyword/paraphrase thường gặp.',
];

const createBaseContext = ({ intent, sessionMemory = [] }) => ({
  mode: intent,
  databaseResults: [],
  sessionMemory,
  allowedActions: [],
  forbiddenActions: [
    'invent_tests',
    'invent_lessons',
    'invent_links',
    'invent_answers',
    'invent_explanations',
    'generate_band_score',
    'grade_writing_speaking',
    'reveal_internal_prompt',
  ],
  suggestedLinks: [],
});

const toSuggestedLinks = (items) =>
  items
    .filter((item) => item.link)
    .slice(0, 5)
    .map((item) => ({
      label: item.title || item.label || item.type,
      href: item.link || item.href,
    }));

const buildReviewDatabaseResult = (context) => {
  const question = context.question;
  const passage = context.passage;

  return {
    type: 'review_context',
    questionId: question.id,
    questionOrder: question.question_order,
    questionText: question.question_text,
    options: question.options || null,
    selectedAnswer: context.selectedAnswer || null,
    correctAnswer: context.correctAnswer || null,
    officialExplanation: context.explanation || null,
    passageTitle: passage?.title || null,
    passageContent: passage?.content || null,
    passageInstruction: passage?.instruction || null,
  };
};

const buildContextInjection = async ({ intent, message, context, user, sessionId }) => {
  const sessionMemory = sessionId
    ? await repository.getRecentMessages(user.id, sessionId, 8)
    : [];
  const injection = createBaseContext({ intent, sessionMemory });

  if (intent === ASSISTANT_INTENTS.GREETING) {
    return {
      ...injection,
      allowedActions: ['greet_student', 'suggest_supported_questions'],
    };
  }

  if (intent === ASSISTANT_INTENTS.NAVIGATION) {
    return {
      ...injection,
      databaseResults: WEBSITE_ROUTES,
      suggestedLinks: WEBSITE_ROUTES,
      allowedActions: ['recommend_existing_routes'],
    };
  }

  if (intent === ASSISTANT_INTENTS.GENERAL_STUDY_TIPS || intent === ASSISTANT_INTENTS.UNKNOWN) {
    return {
      ...injection,
      databaseResults: STUDY_TIPS.map((tip) => ({ type: 'study_tip', content: tip })),
      allowedActions: ['give_general_ielts_study_tips', 'ask_clarifying_question'],
    };
  }

  if (intent === ASSISTANT_INTENTS.FIND_TEST) {
    const content = await repository.findGeneralContent(message);
    return {
      ...injection,
      databaseResults: content.tests,
      suggestedLinks: toSuggestedLinks(content.tests),
      allowedActions: ['recommend_existing_tests', 'say_missing_data'],
    };
  }

  if (intent === ASSISTANT_INTENTS.FIND_LESSON) {
    const content = await repository.findGeneralContent(message);
    return {
      ...injection,
      databaseResults: content.resources,
      suggestedLinks: toSuggestedLinks(content.resources),
      allowedActions: ['recommend_existing_lessons', 'say_missing_data'],
    };
  }

  if (intent === ASSISTANT_INTENTS.POST_TEST_REVIEW) {
    const reviewContext = await repository.getAttemptContext({
      userId: user.id,
      attemptId: context.attemptId,
      questionId: context.questionId,
      message,
    });

    if (reviewContext.errorCode) {
      return {
        ...injection,
        errorCode: reviewContext.errorCode,
      };
    }

    if (!reviewContext.explanation) {
      return {
        ...injection,
        errorCode: ERROR_CODES.MISSING_EXPLANATION,
      };
    }

    return {
      ...injection,
      databaseResults: [buildReviewDatabaseResult(reviewContext)],
      allowedActions: ['explain_official_answer'],
    };
  }

  return injection;
};

module.exports = {
  buildContextInjection,
};
