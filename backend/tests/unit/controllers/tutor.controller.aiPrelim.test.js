const mockTutorService = {
  claimSpeakingGroup: jest.fn(),
  runAiPrelimCheck: jest.fn(),
};

jest.mock('../../../src/services/tutor.service', () => mockTutorService);
jest.mock('../../../src/services/audit.service', () => ({}));

const TutorController = require('../../../src/controllers/tutor.controller');

const response = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.set = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('TutorController Speaking claim and AI prelim', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns a non-cacheable AI prelim draft with authenticated requester context', async () => {
    const draft = { suggestedOverallBand: 6.5, suggestedCriteria: {} };
    mockTutorService.runAiPrelimCheck.mockResolvedValue(draft);
    const req = {
      params: { type: 'speaking', submissionId: 'group-1' },
      body: {},
      user: { id: 'tutor-1', role: 'tutor' },
    };
    const res = response();
    await TutorController.runAiPrelimCheck(req, res, jest.fn());

    expect(mockTutorService.runAiPrelimCheck).toHaveBeenCalledWith(
      'speaking',
      'group-1',
      expect.objectContaining({
        usageContext: expect.objectContaining({
          userId: 'tutor-1',
          requesterRole: 'tutor',
        }),
      })
    );
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(res.json).toHaveBeenCalledWith({
      success: true, data: draft, error: null, meta: {},
    });
  });

  test('passes AI prelim service failures to centralized error handling', async () => {
    const error = new Error('provider failed');
    mockTutorService.runAiPrelimCheck.mockRejectedValue(error);
    const req = {
      params: { type: 'speaking', submissionId: 'group-1' },
      body: {},
      user: { id: 'tutor-1', role: 'tutor' },
    };
    const next = jest.fn();
    await TutorController.runAiPrelimCheck(req, response(), next);
    expect(next).toHaveBeenCalledWith(error);
  });

  test('claims a Speaking group through the authenticated tutor identity', async () => {
    const claim = { speaking_group_id: 'group-1', assigned_tutor_id: 'tutor-1' };
    mockTutorService.claimSpeakingGroup.mockResolvedValue(claim);
    const req = {
      params: { speakingGroupId: 'group-1' },
      user: { id: 'tutor-1', role: 'tutor' },
    };
    const res = response();
    await TutorController.claimSpeakingGroup(req, res, jest.fn());

    expect(mockTutorService.claimSpeakingGroup).toHaveBeenCalledWith('group-1', 'tutor-1');
    expect(res.json).toHaveBeenCalledWith({
      success: true, data: claim, error: null, meta: {},
    });
  });

  test('passes claim conflicts to centralized error handling', async () => {
    const error = new Error('claim conflict');
    mockTutorService.claimSpeakingGroup.mockRejectedValue(error);
    const next = jest.fn();
    await TutorController.claimSpeakingGroup({
      params: { speakingGroupId: 'group-1' },
      user: { id: 'tutor-1', role: 'tutor' },
    }, response(), next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
