jest.mock('../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('../../src/ai/grading.service', () => ({
  gradeWriting: jest.fn(),
  gradeSpeakingSession: jest.fn(),
}));

jest.mock('../../src/services/audit.service', () => ({
  logAction: jest.fn(),
}));

jest.mock('../../src/services/speakingSubmission.service', () => ({
  getSpeakingSubmissionService: jest.fn(),
}));

jest.mock('../../src/db/queries/grading.queries', () => ({
  ...jest.requireActual('../../src/db/queries/grading.queries'),
  getSpeakingAssignmentScope: jest.fn(),
}));

const TutorService = require('../../src/services/tutor.service');
const { pool } = require('../../src/db/pool');
const { gradeSpeakingSession } = require('../../src/ai/grading.service');
const AuditLogService = require('../../src/services/audit.service');
const { getSpeakingSubmissionService } = require('../../src/services/speakingSubmission.service');
const gradingQueries = require('../../src/db/queries/grading.queries');

const rowsForColumns = (columns) => ({
  rows: columns.map(column_name => ({ column_name })),
});

describe('TutorService schema compatibility', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.connect.mockReset();
    gradeSpeakingSession.mockReset();
    AuditLogService.logAction.mockReset();
    getSpeakingSubmissionService.mockReset();
    gradingQueries.getSpeakingAssignmentScope.mockReset();
    gradingQueries.getSpeakingAssignmentScope.mockResolvedValue({
      part_count: 3,
      assigned: true,
    });
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

  it('submits tutor speaking grade without locking the nullable joined user row', async () => {
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
          id: 'part-1',
          speaking_group_id: 'group-1',
          status: 'pending',
          grader: 'tutor',
          user_id: 'student-1',
          student_name: 'Student One',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 'part-1', status: 'pending', grader: 'tutor', assigned_tutor_id: 'tutor-1' },
          { id: 'part-2', status: 'pending', grader: 'tutor', assigned_tutor_id: 'tutor-1' },
          { id: 'part-3', status: 'pending', grader: 'tutor', assigned_tutor_id: 'tutor-1' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'part-1' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({}); // COMMIT

    const result = await TutorService.gradeSubmission('speaking', 'group-1', 'tutor-1', {
      bandScore: 6,
      fluencyScore: 6,
      lexicalScore: 6,
      grammarScore: 6,
      pronunciationScore: 6,
      writtenFeedback: 'Overall speaking feedback.',
    });

    expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE OF ss');
    expect(client.query.mock.calls[1][0]).toContain('ss.speaking_group_id::text = $1');
    expect(result).toEqual(expect.objectContaining({
      success: true,
      studentId: 'student-1',
      tutorStatus: 'graded',
      overallTutorBand: 6,
    }));
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

  it('calculates AI reference list band from completed task reports', async () => {
    pool.query
      .mockResolvedValueOnce(rowsForColumns(['submission_id', 'submission_type', 'band_score', 'computed_band', 'status']))
      .mockResolvedValueOnce(rowsForColumns(['id', 'writing_group_id', 'status', 'overall_ai_band']))
      .mockResolvedValueOnce({
        rows: [
          {
            submission_id: 'task-1',
            writing_group_id: 'group-1',
            student_id: 'student-1',
            student_name: 'Student One',
            test_title: 'Writing Test',
            task_number: 1,
            submitted_at: '2026-07-05T00:00:00.000Z',
            submission_status: 'ai_graded',
            overall_ai_band: null,
            ai_band: '6.0',
            ai_report_status: 'completed',
            error_message: null,
            generated_at: '2026-07-05T00:01:00.000Z',
          },
          {
            submission_id: 'task-2',
            writing_group_id: 'group-1',
            student_id: 'student-1',
            student_name: 'Student One',
            test_title: 'Writing Test',
            task_number: 2,
            submitted_at: '2026-07-05T00:00:00.000Z',
            submission_status: 'ai_graded',
            overall_ai_band: null,
            ai_band: '7.0',
            ai_report_status: 'completed',
            error_message: null,
            generated_at: '2026-07-05T00:02:00.000Z',
          },
        ],
      });

    const result = await TutorService.getAiReferenceList();

    expect(pool.query.mock.calls[2][0]).toContain('COALESCE(agr.band_score, agr.computed_band) AS ai_band');
    expect(result[0]).toEqual(expect.objectContaining({
      submissionId: 'group-1',
      aiBand: 6.5,
      reportStatus: 'completed',
      taskLabel: 'Task 1 + Task 2',
    }));
  });

  it('reuses a completed async Speaking estimate as the tutor draft', async () => {
    const getStatus = jest.fn().mockResolvedValueOnce({
      speaking_group_id: '11111111-1111-4111-8111-111111111111',
      status: 'completed',
      result: {
        evidence_mode: 'full_audio',
        overall_band: 6.5,
        criteria: {
          fluency_coherence: { band: 6.5, feedback: 'Ổn.' },
          lexical_resource: { band: 6.5, feedback: 'Khá.' },
          grammatical_range_accuracy: { band: 6, feedback: 'Cần sửa.' },
          pronunciation: { band: 6.5, feedback: 'Dễ hiểu.' },
        },
      },
    });
    getSpeakingSubmissionService.mockReturnValueOnce({ getStatus });

    const result = await TutorService.runAiPrelimCheck(
      'speaking',
      '22222222-2222-4222-8222-222222222222',
      { usageContext: { userId: 'tutor-1', requesterRole: 'tutor' } }
    );

    expect(getStatus).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      { id: 'tutor-1', role: 'tutor' }
    );
    expect(gradeSpeakingSession).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      suggestedOverallBand: 6.5,
      suggestedCriteria: expect.objectContaining({
        fluencyScore: 6.5,
        grammarScore: 6,
        pronunciationScore: 6.5,
      }),
    }));
  });
});
