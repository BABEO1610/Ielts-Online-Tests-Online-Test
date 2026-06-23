const { ERROR_CODES, PAGE_TYPES } = require('./assistant.constants');

const MAX_MESSAGE_LENGTH = 2000;

const normalizeNullableString = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value.trim() || null;
};

const validateChatPayload = (body) => {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Payload phải là object hợp lệ.',
      },
      value: null,
    };
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    errors.push('message không được để trống.');
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    errors.push(`message không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự.`);
  }

  const rawContext = body.context;
  if (!rawContext || typeof rawContext !== 'object' || Array.isArray(rawContext)) {
    errors.push('context là bắt buộc.');
  }

  const pageType = rawContext?.pageType;
  if (!PAGE_TYPES.has(pageType)) {
    errors.push('context.pageType không hợp lệ.');
  }

  const attemptId = normalizeNullableString(rawContext?.attemptId);
  const questionId = normalizeNullableString(rawContext?.questionId);

  if (attemptId !== null && typeof attemptId !== 'string') {
    errors.push('context.attemptId phải là string hoặc null.');
  }
  if (questionId !== null && typeof questionId !== 'string') {
    errors.push('context.questionId phải là string hoặc null.');
  }

  if (errors.length > 0) {
    return {
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: errors.join(' '),
      },
      value: null,
    };
  }

  return {
    error: null,
    value: {
      message,
      context: {
        pageType,
        attemptId,
        questionId,
      },
    },
  };
};

const validateRatingPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Payload phải là object hợp lệ.',
      },
      value: null,
    };
  }

  const rating = typeof body.rating === 'string' ? body.rating.trim().toLowerCase() : '';
  if (!['up', 'down'].includes(rating)) {
    return {
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'rating chỉ được là up hoặc down.',
      },
      value: null,
    };
  }

  const reason = normalizeNullableString(body.reason);
  if (reason !== null && typeof reason !== 'string') {
    return {
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'reason phải là string hoặc null.',
      },
      value: null,
    };
  }

  return {
    error: null,
    value: {
      rating,
      reason,
    },
  };
};

module.exports = {
  validateChatPayload,
  validateRatingPayload,
};
