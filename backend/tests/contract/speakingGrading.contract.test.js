const mockService = {
  createAudioUpload: jest.fn(),
  submitFullSpeaking: jest.fn(),
  getStatus: jest.fn(),
  retry: jest.fn(),
};
jest.mock('../../src/services/speakingSubmission.service', () => ({
  getSpeakingSubmissionService: () => mockService,
}));
jest.mock('../../src/services/speakingGradingRetry.service', () => ({
  getSpeakingGradingRetryService: () => mockService,
}));
jest.mock('../../src/controllers/submission.controller', () => ({
  submitFullSpeaking: jest.fn(),
}));

const controller = require('../../src/controllers/speakingGrading.controller');

const response = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.set = jest.fn(() => res);
  res.location = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('Speaking grading HTTP contract', () => {
  beforeEach(() => jest.clearAllMocks());

  test('signed upload returns 201 and no-store', async () => {
    mockService.createAudioUpload.mockResolvedValue({ upload_url: 'https://signed.invalid', upload_token: 'opaque' });
    const req = { user: { id: 'user-1' }, body: {} };
    const res = response();
    await controller.createAudioUpload(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, error: null, meta: {} }));
  });

  test('AI submission returns 202, Location and Retry-After', async () => {
    mockService.submitFullSpeaking.mockResolvedValue({
      speaking_group_id: 'group-1', job_id: 'job-1', status: 'queued',
      status_url: '/api/v1/submissions/speaking/group-1/grading-status', replayed: false,
    });
    const req = {
      user: { id: 'user-1', role: 'student' },
      body: { test_id: 'test-1', grader: 'ai', parts: [] },
      get: jest.fn(() => 'idempotency-key-1'),
    };
    const res = response();
    await controller.submitFull(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.location).toHaveBeenCalledWith('/api/v1/submissions/speaking/group-1/grading-status');
    expect(res.set).toHaveBeenCalledWith('Retry-After', '3');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  test('status response is private and delegates requester authorization', async () => {
    mockService.getStatus.mockResolvedValue({ status: 'needs_review', result: null });
    const req = { user: { id: 'user-1', role: 'student' }, params: { speakingGroupId: 'group-1' } };
    const res = response();
    await controller.getStatus(req, res, jest.fn());
    expect(mockService.getStatus).toHaveBeenCalledWith('group-1', req.user);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'needs_review', result: null } }));
  });
});
