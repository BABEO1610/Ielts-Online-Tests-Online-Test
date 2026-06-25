const { ERROR_CODES, PAGE_TYPES } = require('./assistant.constants');

const MAX_MESSAGE_LENGTH = 2000;

const normalizeNullableString = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return value;
  return value.trim() || null;
};

const normalizeVisibleItems = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .slice(0, 20)
    .map((item) => ({
      id: normalizeNullableString(item.id),
      title: normalizeNullableString(item.title),
      type: normalizeNullableString(item.type),
      route: normalizeNullableString(item.route),
    }))
    .filter((item) => item.id || item.title);
};

const validateChatPayload = (body) => {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Payload must be a valid object.' },
      value: null,
    };
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) errors.push('message is required.');
  if (message.length > MAX_MESSAGE_LENGTH) {
    errors.push(`message must not exceed ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const rawContext = body.context;
  if (!rawContext || typeof rawContext !== 'object' || Array.isArray(rawContext)) {
    errors.push('context is required.');
  }

  const pageType = rawContext?.pageType;
  if (!PAGE_TYPES.has(pageType)) errors.push('context.pageType is invalid.');

  const attemptId = normalizeNullableString(rawContext?.attemptId);
  const questionId = normalizeNullableString(rawContext?.questionId);
  const route = normalizeNullableString(rawContext?.route);
  const visibleItems = normalizeVisibleItems(rawContext?.visibleItems);

  if (attemptId !== null && typeof attemptId !== 'string') {
    errors.push('context.attemptId must be string or null.');
  }
  if (questionId !== null && typeof questionId !== 'string') {
    errors.push('context.questionId must be string or null.');
  }
  if (route !== null && typeof route !== 'string') {
    errors.push('context.route must be string or null.');
  }

  if (errors.length > 0) {
    return {
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: errors.join(' ') },
      value: null,
    };
  }

  return {
    error: null,
    value: {
      message,
      context: { pageType, attemptId, questionId, route, visibleItems },
    },
  };
};

const validateRatingPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Payload must be a valid object.' },
      value: null,
    };
  }

  const rating = typeof body.rating === 'string' ? body.rating.trim().toLowerCase() : '';
  if (!['up', 'down'].includes(rating)) {
    return {
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'rating must be up or down.' },
      value: null,
    };
  }

  const reason = normalizeNullableString(body.reason);
  if (reason !== null && typeof reason !== 'string') {
    return {
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'reason must be string or null.' },
      value: null,
    };
  }

  return { error: null, value: { rating, reason } };
};

module.exports = {
  validateChatPayload,
  validateRatingPayload,
};
