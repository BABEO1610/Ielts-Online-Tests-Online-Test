jest.mock('../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('../../src/ai/grading.service', () => ({
  gradeWriting: jest.fn(),
}));

jest.mock('../../src/services/audit.service', () => ({
  logAction: jest.fn(),
}));

const TutorService = require('../../src/services/tutor.service');
const { pool } = require('../../src/db/pool');
const AuditLogService = require('../../src/services/audit.service');

const rowsForColumns = (columns) => ({
  rows: columns.map(column_name => ({ column_name })),
});

describe('TutorService schema compatibility', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.connect.mockReset();
    AuditLogService.logAction.mockReset();
  });

  it('submits tutor writing grade without requiring tutor_feedback_reports.task_number', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValueOnce(client);
    AuditLogService.logAction.mockResolvedValueOnce({});

    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 'task-1',
          writing_group_id: 'group-1',
          status: 'pending',
          grader: 'tutor',
          user_id: 'student-1',
          student_name: 'Student One',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 'task-1', task_number: 1, status: 'pending', grader: 'tutor' },
          { id: 'task-2', task_number: 2, status: 'pending', grader: 'tutor' },
        ],
      })
      .mockResolvedValueOnce(rowsForColumns([
        'id',
        'tutor_id',
        'writing_submission_id',
        'band_score',
        'task_achievement_score',
        'coherence_score',
        'lexical_score',
        'grammar_score',
        'written_feedback',
        'created_at',
        'updated_at',
      ]))
      .mockResolvedValueOnce(rowsForColumns([
        'id',
        'writing_group_id',
        'status',
        'updated_at',
      ]))
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { task_number: 1, band_score: '6.5' },
          { task_number: 2, band_score: null },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({}); // COMMIT

    await TutorService.gradeSubmission('writing', 'group-1', 'tutor-1', {
      taskNumber: 1,
      bandScore: 6.5,
      taskAchievementScore: 6.5,
      coherenceScore: 6.5,
      lexicalScore: 6.5,
      grammarScore: 6.5,
      writtenFeedback: 'Good structure.',
    });

    const feedbackWrites = client.query.mock.calls
      .map(([query]) => query)
      .filter(query => query.includes('tutor_feedback_reports') && !query.includes('LEFT JOIN'));

    expect(feedbackWrites.join('\n')).not.toMatch(/\btask_number\b/);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'pending'::submission_status"),
      ['group-1']
    );
  });

  it('lists AI references without requiring writing_submissions.overall_ai_band', async () => {
    pool.query
      .mockResolvedValueOnce(rowsForColumns(['submission_id', 'submission_type', 'band_score']))
      .mockResolvedValueOnce(rowsForColumns(['id', 'writing_group_id', 'status']))
      .mockResolvedValueOnce({
        rows: [{
          submission_id: 'task-1',
          writing_group_id: 'group-1',
          student_id: 'student-1',
          student_name: 'Student One',
          test_title: 'Writing Test',
          task_number: 1,
          submitted_at: '2026-07-05T00:00:00.000Z',
          submission_status: 'ai_graded',
          overall_ai_band: null,
          ai_band: '6.5',
          ai_report_status: null,
          error_message: null,
          generated_at: '2026-07-05T00:01:00.000Z',
        }],
      });

    const result = await TutorService.getAiReferenceList();

    expect(pool.query.mock.calls[2][0]).toContain('NULL::numeric AS overall_ai_band');
    expect(pool.query.mock.calls[2][0]).not.toContain('ws.overall_ai_band');
    expect(result[0]).toEqual(expect.objectContaining({
      submissionId: 'group-1',
      taskLabel: 'Task 1',
    }));
  });
});
