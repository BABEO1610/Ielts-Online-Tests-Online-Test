jest.mock('../../../src/config/redis', () => ({
  status: 'end',
  hget: jest.fn(),
}));

jest.mock('../../../src/db/queries/sessions.queries', () => ({
  findActiveSession: jest.fn(),
}));

jest.mock('../../../src/utils/token.util', () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock('../../../src/api/assistant/assistant.service', () => ({
  handleChat: jest.fn(),
  handleChatStream: jest.fn(),
  preflightChatPayload: jest.fn(),
}));

const assistantController = require('../../../src/api/assistant/assistant.controller');
const assistantService = require('../../../src/api/assistant/assistant.service');
const { findActiveSession } = require('../../../src/db/queries/sessions.queries');
const { verifyAccessToken } = require('../../../src/utils/token.util');
const { ERROR_CODES } = require('../../../src/api/assistant/assistant.constants');

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  setHeader: jest.fn(),
  flushHeaders: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
});

const validPayload = (overrides = {}) => ({
  message: overrides.message || 'Có đề Reading không?',
  context: {
    pageType: overrides.pageType || 'home',
    route: overrides.route || '/',
    attemptId: null,
    questionId: null,
  },
});

const authenticateAs = ({ role = 'student' } = {}) => {
  verifyAccessToken.mockReturnValue({
    sub: 'user-1',
    session_token: 'session-token-1',
    role,
  });
  findActiveSession.mockResolvedValue({ id: 'session-row-1' });
};

describe('Assistant controller auth and preflight guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assistantService.preflightChatPayload.mockReturnValue(null);
  });

  it('returns LOGIN_REQUIRED for no-token chat before service, DB session, or AI pipeline', async () => {
    const req = { cookies: {}, body: validPayload() };
    const res = createResponse();

    await assistantController.chat(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: false,
      code: ERROR_CODES.LOGIN_REQUIRED,
    });
    expect(findActiveSession).not.toHaveBeenCalled();
    expect(assistantService.preflightChatPayload).not.toHaveBeenCalled();
    expect(assistantService.handleChat).not.toHaveBeenCalled();
  });

  it('returns FORBIDDEN for non-student roles before preflight or pipeline', async () => {
    authenticateAs({ role: 'tutor' });
    const req = { cookies: { accessToken: 'token' }, body: validPayload() };
    const res = createResponse();

    await assistantController.chat(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: false,
      code: ERROR_CODES.FORBIDDEN,
    });
    expect(assistantService.preflightChatPayload).not.toHaveBeenCalled();
    expect(assistantService.handleChat).not.toHaveBeenCalled();
  });

  it('blocks active-test chat before service session or pipeline', async () => {
    authenticateAs();
    assistantService.preflightChatPayload.mockReturnValue({
      code: ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST,
      message: 'Trợ lý IELTS không khả dụng trong lúc làm bài.',
    });
    const req = { cookies: { accessToken: 'token' }, body: validPayload({ pageType: 'active-test', route: '/tests/t1/reading' }) };
    const res = createResponse();

    await assistantController.chat(req, res);

    expect(assistantService.preflightChatPayload).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Có đề Reading không?',
      context: expect.objectContaining({ pageType: 'active-test' }),
    }));
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: false,
      code: ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST,
    });
    expect(assistantService.handleChat).not.toHaveBeenCalled();
  });

  it('does not open SSE when stream request is blocked by preflight', async () => {
    authenticateAs();
    assistantService.preflightChatPayload.mockReturnValue({
      code: ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST,
      message: 'Trợ lý IELTS không khả dụng trong lúc làm bài.',
    });
    const req = { cookies: { accessToken: 'token' }, body: validPayload({ pageType: 'active-test', route: '/tests/t1/reading' }) };
    const res = createResponse();

    await assistantController.chatStream(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: false,
      code: ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST,
    });
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.write).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
    expect(assistantService.handleChatStream).not.toHaveBeenCalled();
  });
});
