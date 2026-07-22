const mockPool = { connect: jest.fn(), query: jest.fn() };
jest.mock('../../../src/db/pool', () => ({ pool: mockPool }));

const TutorService = require('../../../src/services/tutor.service');

const GROUP_ID = '11111111-1111-4111-8111-111111111111';
const TUTOR_A = '22222222-2222-4222-8222-222222222222';
const TUTOR_B = '33333333-3333-4333-8333-333333333333';

const makeClient = (state) => ({
  release: jest.fn(),
  query: jest.fn(async (sql, params) => {
    const text = String(sql);
    if (text.includes('SELECT id, assigned_tutor_id') && text.includes('FOR UPDATE')) {
      return {
        rows: [1, 2, 3].map((part_number) => ({
          id: `part-${part_number}`,
          part_number,
          assigned_tutor_id: state.assignedTutor,
          assigned_tutor_at: state.assignedTutor ? '2026-07-22T00:00:00Z' : null,
          status: 'pending',
          grader: 'tutor',
        })),
      };
    }
    if (text.includes('UPDATE speaking_submissions')) {
      state.assignedTutor = params[1];
      return { rows: [1, 2, 3].map(() => ({ assigned_tutor_at: '2026-07-22T00:00:00Z' })) };
    }
    return { rows: [] };
  }),
});

describe('Speaking tutor claim and IDOR boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  test('serializes group claim and rejects the next tutor', async () => {
    const state = { assignedTutor: null };
    const first = makeClient(state);
    const second = makeClient(state);
    mockPool.connect.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    await expect(TutorService.claimSpeakingGroup(GROUP_ID, TUTOR_A))
      .resolves.toMatchObject({ assigned_tutor_id: TUTOR_A, assignment_status: 'claimed' });
    await expect(TutorService.claimSpeakingGroup(GROUP_ID, TUTOR_B))
      .rejects.toMatchObject({ statusCode: 409, errorCode: 'SPEAKING_GROUP_ALREADY_CLAIMED' });
    expect(first.query.mock.calls.some(([sql]) => String(sql).includes('FOR UPDATE'))).toBe(true);
    expect(second.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('rejects an invalid group id before opening a transaction', async () => {
    await expect(TutorService.claimSpeakingGroup('not-a-uuid', TUTOR_A))
      .rejects.toMatchObject({ statusCode: 400, errorCode: 'INVALID_FIELD' });
    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  test('blocks detail/grade scope when all three Parts are not assigned to requester', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ part_count: 3, assigned: false }] });
    await expect(TutorService.assertSpeakingAssignment(GROUP_ID, { id: TUTOR_B, role: 'tutor' }))
      .rejects.toMatchObject({ statusCode: 403, errorCode: 'SPEAKING_GROUP_NOT_ASSIGNED' });
  });

  test('allows admin oversight without changing the tutor assignment', async () => {
    await expect(TutorService.assertSpeakingAssignment(GROUP_ID, { id: 'admin', role: 'admin' }))
      .resolves.toBeUndefined();
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});
