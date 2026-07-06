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

const TutorService = require('../../src/services/tutor.service');
const { pool } = require('../../src/db/pool');
const { gradeSpeakingSession } = require('../../src/ai/grading.service');
const AuditLogService = require('../../src/services/audit.service');

const rowsForColumns = (columns) => ({
  rows: columns.map(column_name => ({ column_name })),
});

describe('TutorService schema compatibility', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.connect.mockReset();
    gradeSpeakingSession.mockReset();
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

  it('runs Speaking AI prelim from a single part id by loading all group parts', async () => {
    const reportColumns = [
      'submission_id',
      'submission_type',
      'band_score',
      'computed_band',
      'fluency_score',
      'lexical_score',
      'grammar_score',
      'pronunciation_score',
      'criteria_json',
      'feedback_json',
      'raw_ai_response',
      'status',
      'error_message',
    ];

    gradeSpeakingSession.mockResolvedValueOnce({
      partNumber: null,
      overallBand: 6.5,
      computedBand: 6.5,
      criteria: {
        fluencyCoherence: { band: 6.5, feedback: 'Good flow.' },
        lexicalResource: { band: 6.5, feedback: 'Enough range.' },
        grammaticalRangeAccuracy: { band: 6, feedback: 'Some errors.' },
        pronunciation: { band: 6.5, feedback: 'Generally clear.' },
      },
      summary: 'Tutor reference summary.',
      strengths: ['Clear answers'],
      weaknesses: ['Some grammar slips'],
      majorErrors: [],
      detailedFeedback: {},
      actionPlan: ['Review grammar'],
      nextStudyAdvice: 'Practice linking ideas.',
      transcriptNotes: 'Transcript-based pronunciation estimate.',
      partFeedback: [],
      disclaimer: 'Tutor should verify audio.',
      rawResponse: '{}',
      modelName: 'test-model',
      promptVersion: 'test-prompt',
      bandValidationWarning: null,
    });

    pool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 'part-1', speaking_group_id: 'group-1', part_number: 1, transcript: 'Part one answer.', test_title: 'Speaking Test' },
          { id: 'part-2', speaking_group_id: 'group-1', part_number: 2, transcript: 'Part two answer.', test_title: 'Speaking Test' },
          { id: 'part-3', speaking_group_id: 'group-1', part_number: 3, transcript: 'Part three answer.', test_title: 'Speaking Test' },
        ],
      })
      .mockResolvedValueOnce(rowsForColumns(reportColumns))
      .mockResolvedValueOnce({
        rows: [{
          id: 'report-1',
          submission_id: 'part-1',
          submission_type: 'speaking',
          part_number: null,
          band_score: '6.5',
          computed_band: '6.5',
          fluency_score: '6.5',
          lexical_score: '6.5',
          grammar_score: '6.0',
          pronunciation_score: '6.5',
          criteria_json: JSON.stringify({
            fluencyCoherence: { band: 6.5, feedback: 'Good flow.' },
            lexicalResource: { band: 6.5, feedback: 'Enough range.' },
            grammaticalRangeAccuracy: { band: 6, feedback: 'Some errors.' },
            pronunciation: { band: 6.5, feedback: 'Generally clear.' },
          }),
          feedback_json: JSON.stringify({
            summary: 'Tutor reference summary.',
            weaknesses: ['Some grammar slips'],
            actionPlan: ['Review grammar'],
          }),
          raw_ai_response: '{}',
          status: 'completed',
          error_message: null,
        }],
      });

    const result = await TutorService.runAiPrelimCheck('speaking', 'part-1', { partNumber: 1 });

    expect(pool.query.mock.calls[0][0]).toContain('COALESCE(speaking_group_id, id) AS group_id');
    expect(gradeSpeakingSession).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ part_number: 1, transcript: 'Part one answer.' }),
        expect.objectContaining({ part_number: 2, transcript: 'Part two answer.' }),
        expect.objectContaining({ part_number: 3, transcript: 'Part three answer.' }),
      ]),
      { testTitle: 'Speaking Test' }
    );
    expect(result.suggestedOverallBand).toBe(6.5);
    expect(result.suggestedCriteria).toEqual(expect.objectContaining({
      fluencyScore: 6.5,
      lexicalScore: 6.5,
      grammarScore: 6,
      pronunciationScore: 6.5,
    }));
  });
});
