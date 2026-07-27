/**
 * ==========================================
 * TẦNG 2: ĐIỀU HƯỚNG & BẢO VỆ (Controller & Guardrails)
 * ==========================================
 * Nhiệm vụ: Xác thực người dùng, kiểm tra quyền hạn, điều hướng luồng dữ liệu (Stream/Sync) 
 * và gọi xuống tầng Service.
 */

const redisClient = require('../../config/redis');
const { findActiveSession } = require('../../db/queries/sessions.queries');
const { verifyAccessToken } = require('../../utils/token.util');
const assistantService = require('./assistant.service');
const { validateChatPayload, validateRatingPayload } = require('./assistant.validation');
const {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS_BY_CODE,
} = require('./assistant.constants');
// hàm bộ trợ đóng gói và trả phản hồi lỗi chuẩn cho json
const sendAssistantError = (res, code, message = ERROR_MESSAGES[code]) => {
  const status = HTTP_STATUS_BY_CODE[code] || 500;
  return res.status(status).json({
    success: false,
    answer: null,
    suggestedLinks: [],
    code,
    message,
    intent: code,
  });
};
// đóng gói là trả về kết quả thành công cho api chat(answer, suggestedlinks, conversationID, grouding)
const sendAssistantResult = (res, result) => {
  if (result.code) {
    return sendAssistantError(res, result.code, result.message);
  }

  return res.status(200).json({
    success: true,
    answer: result.answer,
    suggestedLinks: result.suggestedLinks || [],
    linkMeta: result.linkMeta || null,
    conversationId: result.conversationId || null,
    messageId: result.messageId || null,
    intent: result.intent || null,
    needsMoreContext: Boolean(result.needsMoreContext),
    grounding: result.grounding || null,
    safety: result.safety || null,
    code: null,
  });
};
// Ghi dữ liệu dạng SSE( event:...\ndata:...\n\n)
const writeSseEvent = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};
//trích xuất token xác thực từ cookies của http request( access_token)
const getTokenFromRequest = (req) => req.cookies?.accessToken || req.cookies?.access_token || null;
// xác thực danh tính người dùng gọi api
// luồng sẽ là lấy tooken từ cookies -> giải mã jwt-> kiểm tra season còn hiệu lực trong redis or database , kiemer tra yêu cầu đổi mật khẩu. nếu hợp lệ trả về đối tượng user
const resolveAuthenticatedUser = async (req) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return { user: null, code: ERROR_CODES.LOGIN_REQUIRED };
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    return { user: null, code: ERROR_CODES.LOGIN_REQUIRED };
  }

  if (!decoded?.sub || !decoded?.session_token) {
    return { user: null, code: ERROR_CODES.LOGIN_REQUIRED };
  }

  if (redisClient.status === 'ready') {
    const revokedVal = await redisClient.hget(`session:${decoded.session_token}`, 'revoked');
    if (revokedVal === 'true') {
      return { user: null, code: ERROR_CODES.LOGIN_REQUIRED };
    }
  }

  const session = await findActiveSession(decoded.session_token);
  if (!session) {
    return { user: null, code: ERROR_CODES.LOGIN_REQUIRED };
  }


  return {
    user: {
      id: decoded.sub,
      role: decoded.role,
      session_token: decoded.session_token,
    },
    code: null,
  };
};
// kiểm tra có phải vai trò học viên không 
const ensureStudent = (user) => {
  if (!user) {
    return ERROR_CODES.LOGIN_REQUIRED;
  }

  if (String(user.role || '').toLowerCase() !== 'student') {
    return ERROR_CODES.FORBIDDEN;
  }

  return null;
};
// xử lý request đồng bộ -> ai tạo toàn bộ -> nhận về 1 lần json
const chat = async (req, res) => {
  const validation = validateChatPayload(req.body);
  if (validation.error) {
    return sendAssistantError(res, validation.error.code, validation.error.message);
  }

  try {
    const auth = await resolveAuthenticatedUser(req);
    if (auth.code) {
      return sendAssistantError(res, auth.code);
    }

    const roleError = ensureStudent(auth.user);
    if (roleError) {
      return sendAssistantError(res, roleError);
    }

    const preflight = assistantService.preflightChatPayload(validation.value);
    if (preflight?.code) {
      return sendAssistantError(res, preflight.code, preflight.message);
    }

    const result = await assistantService.handleChat({
      user: auth.user,
      payload: validation.value,
    });

    return sendAssistantResult(res, result);
  } catch (error) {
    console.error('[AssistantController] chat failed:', error);
    if (error.code && ERROR_MESSAGES[error.code]) {
      return sendAssistantError(res, error.code, error.message);
    }
    return sendAssistantError(res, ERROR_CODES.INTERNAL_ERROR);
  }
};

const chatStream = async (req, res) => {
  const validation = validateChatPayload(req.body);
  if (validation.error) {
    return sendAssistantError(res, validation.error.code, validation.error.message);
  }

  try {
    const auth = await resolveAuthenticatedUser(req);
    if (auth.code) {
      return sendAssistantError(res, auth.code);
    }

    const roleError = ensureStudent(auth.user);
    if (roleError) {
      return sendAssistantError(res, roleError);
    }

    const preflight = assistantService.preflightChatPayload(validation.value);
    if (preflight?.code) {
      return sendAssistantError(res, preflight.code, preflight.message);
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    await assistantService.handleChatStream({
      user: auth.user,
      payload: validation.value,
      onEvent: (event, data) => writeSseEvent(res, event, data),
    });

    res.end();
  } catch (error) {
    console.error('[AssistantController] chat stream failed:', error);
    if (!res.headersSent) {
      return sendAssistantError(res, error.code || ERROR_CODES.INTERNAL_ERROR, error.message);
    }
    writeSseEvent(res, 'assistant.error', {
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      message: error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR],
    });
    res.end();
  }
};

const history = async (req, res) => {
  try {
    const auth = await resolveAuthenticatedUser(req);
    if (auth.code) {
      return sendAssistantError(res, auth.code);
    }

    const roleError = ensureStudent(auth.user);
    if (roleError) {
      return sendAssistantError(res, roleError);
    }

    const result = await assistantService.getHistory(
      auth.user.id,
      typeof req.query.conversationId === 'string' ? req.query.conversationId : null
    );
    const normalized = Array.isArray(result)
      ? { history: result, conversationId: null }
      : result;
    return res.status(200).json({
      history: normalized.history || [],
      conversationId: normalized.conversationId || null,
      code: null,
    });
  } catch (error) {
    console.error('[AssistantController] history failed:', error);
    return sendAssistantError(res, ERROR_CODES.INTERNAL_ERROR);
  }
};

const status = async (req, res) => {
  try {
    const auth = await resolveAuthenticatedUser(req);
    if (auth.code) {
      return sendAssistantError(res, auth.code);
    }

    const roleError = ensureStudent(auth.user);
    if (roleError) {
      return sendAssistantError(res, roleError);
    }

    return res.status(200).json({
      code: null,
      status: 'ok',
    });
  } catch (error) {
    console.error('[AssistantController] status failed:', error);
    return sendAssistantError(res, ERROR_CODES.INTERNAL_ERROR);
  }
};

const rateMessage = async (req, res) => {
  const validation = validateRatingPayload(req.body);
  if (validation.error) {
    return sendAssistantError(res, validation.error.code, validation.error.message);
  }

  try {
    const auth = await resolveAuthenticatedUser(req);
    if (auth.code) {
      return sendAssistantError(res, auth.code);
    }

    const roleError = ensureStudent(auth.user);
    if (roleError) {
      return sendAssistantError(res, roleError);
    }

    const messageId = req.params.messageId;
    if (!messageId) {
      return sendAssistantError(res, ERROR_CODES.VALIDATION_ERROR, 'messageId là bắt buộc.');
    }

    const result = await assistantService.rateMessage({
      userId: auth.user.id,
      messageId,
      rating: validation.value.rating,
      reason: validation.value.reason,
    });

    if (result.code) {
      return sendAssistantError(res, result.code, result.message);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[AssistantController] rating failed:', error);
    return sendAssistantError(res, ERROR_CODES.INTERNAL_ERROR);
  }
};

module.exports = {
  chat,
  chatStream,
  history,
  status,
  rateMessage,
  sendAssistantError,
};
