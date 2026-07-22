jest.mock('../../src/ai/grading.service', () => ({
  gradeWriting: jest.fn(),
  countWords: jest.fn(text => String(text || '').trim().split(/\s+/).filter(Boolean).length)
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'writing-group-1')
}));

jest.mock('../../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

const SubmissionService = require('../../src/services/submission.service');
const { pool } = require('../../src/db/pool');
const { gradeWriting } = require('../../src/ai/grading.service');

jest.mock('../../src/config/supabase', () => ({
  storage: {
    from: jest.fn(() => ({
      getPublicUrl: jest.fn((path) => ({
        data: { publicUrl: `https://supabase.test/storage/v1/object/public/speaking-audio/${path}` }
      }))
    }))
  }
}));

describe('SubmissionService', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.connect.mockReset();
    gradeWriting.mockReset();
  });

  describe('submitFullWriting', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    const writingColumns = [
      'id',
      'user_id',
      'test_id',
      'task_number',
      'prompt_text',
      'response_text',
      'word_count',
      'grader',
      'status',
      'writing_group_id',
      'ai_status',
      'tutor_status',
      'submitted_at',
      'created_at',
      'updated_at',
      'overall_ai_band'
    ].map(column_name => ({ column_name }));

    beforeEach(() => {
      pool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockReset();
    });

    it('saves both Writing tasks for tutor grading without running AI', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: writingColumns }) // information_schema
        .mockResolvedValueOnce({ rows: [{ id: 'task-1' }] }) // INSERT task 1
        .mockResolvedValueOnce({ rows: [{ id: 'task-2' }] }) // INSERT task 2
        .mockResolvedValueOnce({}); // COMMIT

      pool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 'task-1', task_number: 1, test_title: 'Writing mock' },
            { id: 'task-2', task_number: 2, test_title: 'Writing mock' }
          ]
        }) // persisted tasks
        .mockResolvedValueOnce({ rows: writingColumns }) // information_schema for update
        .mockResolvedValueOnce({}) // final status update
        .mockResolvedValueOnce({
          rows: [
            { id: 'task-1', task_number: 1 },
            { id: 'task-2', task_number: 2 }
          ]
        }); // final tasks

      const result = await SubmissionService.submitFullWriting('student-1', null, 'tutor', [
        { task_number: 1, prompt_text: 'Task 1 prompt', response_text: 'Task one response' },
        { task_number: 2, prompt_text: 'Task 2 prompt', response_text: 'Task two response' }
      ]);

      expect(gradeWriting).not.toHaveBeenCalled();
      expect(result.aiStatus).toBe('pending');
      expect(result.tutorStatus).toBe('pending');
      expect(result.tasks).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO writing_submissions'),
        expect.arrayContaining(['student-1', 1, 'Task 1 prompt', 'Task one response', 'tutor'])
      );
    });
  });

  describe('getHistory', () => {
    it('returns grouped Writing submissions for student practice history', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            'id',
            'user_id',
            'test_id',
            'task_number',
            'submitted_at',
            'status',
            'grader',
            'writing_group_id',
            'ai_status',
            'tutor_status',
            'overall_ai_band',
            'overall_tutor_band'
          ].map(column_name => ({ column_name }))
        })
        .mockResolvedValueOnce({
          rows: ['submission_id', 'submission_type', 'band_score'].map(column_name => ({ column_name }))
        })
        .mockResolvedValueOnce({
          rows: ['writing_submission_id', 'speaking_submission_id', 'band_score'].map(column_name => ({ column_name }))
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'group-1',
            type: 'writing',
            task_number: null,
            part_number: null,
            submitted_at: '2026-07-05T08:00:00.000Z',
            submission_status: 'ai_graded',
            ai_status: 'completed',
            tutor_status: 'pending',
            grader: 'ai',
            band_score: '6.5',
            tutor_band_score: null,
            ai_band_score: '6.5',
            test_title: 'Writing Mock Test',
            ai_grading_submission_id: 'task-1',
            ai_grading_tasks: [
              { submissionId: 'task-1', taskNumber: 1 },
              { submissionId: 'task-2', taskNumber: 2 }
            ]
          }]
        });

      const history = await SubmissionService.getHistory('student-1');

      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('GROUP BY COALESCE(ws.writing_group_id::text, ws.id::text)'),
        ['student-1']
      );
      expect(history).toEqual([expect.objectContaining({
        id: 'group-1',
        type: 'writing',
        status: 'ai_graded',
        aiStatus: 'completed',
        tutorStatus: 'pending',
        band_score: 6.5,
        ai_band_score: 6.5,
        testTitle: 'Writing Mock Test'
      })]);
    });
  });

  describe('getWritingFeedbackDetail', () => {
    it('maps Task 2 AI detail from raw response when report columns are empty', async () => {
      const rawTask2 = {
        overallBand: 6.5,
        computedBand: 6.5,
        criteria: {
          taskAchievementOrResponse: { band: 6.0, feedback: 'Task response detail' },
          coherenceCohesion: { band: 6.5, feedback: 'Coherence detail' },
          lexicalResource: { band: 6.5, feedback: 'Lexical detail' },
          grammarRangeAccuracy: { band: 6.0, feedback: 'Grammar detail' },
        },
        feedback: {
          summary: 'Task 2 summary',
          strengths: ['Clear position'],
          actionPlan: ['Develop examples'],
        },
      };

      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'task-1',
            user_id: 'student-1',
            writing_group_id: 'group-1',
          }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'task-1',
              task_number: 1,
              user_id: 'student-1',
              writing_group_id: 'group-1',
              prompt_text: 'Task 1 prompt',
              response_text: 'Task 1 response',
              word_count: 120,
              grader: 'ai',
              ai_status: 'completed',
              tutor_status: 'pending',
              test_title: 'Writing Mock',
            },
            {
              id: 'task-2',
              task_number: 2,
              user_id: 'student-1',
              writing_group_id: 'group-1',
              prompt_text: 'Task 2 prompt',
              response_text: 'Task 2 response',
              word_count: 255,
              grader: 'ai',
              ai_status: 'completed',
              tutor_status: 'pending',
              test_title: 'Writing Mock',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'ai-1',
              submission_id: 'task-1',
              task_number: 1,
              status: 'completed',
              band_score: '6.0',
              computed_band: '6.0',
              task_achievement_score: '6.0',
              coherence_score: '6.0',
              lexical_score: '6.0',
              grammar_score: '6.0',
              feedback_json: JSON.stringify({ summary: 'Task 1 summary' }),
              criteria_json: null,
              raw_ai_response: null,
            },
            {
              id: 'ai-2',
              submission_id: 'task-2',
              task_number: 2,
              status: null,
              band_score: null,
              computed_band: null,
              task_achievement_score: null,
              coherence_score: null,
              lexical_score: null,
              grammar_score: null,
              feedback_json: null,
              criteria_json: null,
              raw_ai_response: JSON.stringify(rawTask2),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const detail = await SubmissionService.getWritingFeedbackDetail('group-1', 'student-1');
      const task2 = detail.tasks.find(task => task.taskNumber === 2);

      expect(detail.aiStatus).toBe('completed');
      expect(detail.overallAiBand).toBe(6.5);
      expect(task2.aiFeedback).toEqual(expect.objectContaining({
        status: 'completed',
        overallBand: 6.5,
        computedBand: 6.5,
        summary: 'Task 2 summary',
      }));
      expect(task2.aiFeedback.criterionScores.taskAchievementOrResponse).toEqual({
        band: 6.0,
        feedback: 'Task response detail',
      });
    });
  });

  describe('getSpeakingAudioUrl', () => {
    const submissionId = '11111111-1111-4111-8111-111111111111';

    it('should return the legacy URL only to the assigned tutor while the feature is disabled', async () => {
      const url = 'https://supabase.test/storage/v1/object/public/speaking-audio/speaking/user-1/uuid.webm';
      pool.query.mockResolvedValueOnce({
        rows: [{ id: submissionId, user_id: 'user-1', assigned_tutor_scope: true, audio_url: url }]
      });

      const result = await SubmissionService.getSpeakingAudioUrl(submissionId, {
        id: 'tutor-1',
        role: 'tutor'
      });

      expect(result).toEqual({ url, expires_at: null, legacy_public_url: true });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('BOOL_AND(group_part.assigned_tutor_id = $2::uuid)'),
        [submissionId, 'tutor-1']
      );
    });

    it('should scope student audio lookup to the current student', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: submissionId, user_id: 'user-1', audio_url: 'speaking/user-1/uuid.webm' }]
      });

      const result = await SubmissionService.getSpeakingAudioUrl(submissionId, {
        id: 'user-1',
        role: 'student'
      });

      expect(result).toEqual({
        url: 'https://supabase.test/storage/v1/object/public/speaking-audio/speaking/user-1/uuid.webm',
        expires_at: null,
        legacy_public_url: true
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE part.id = $1 AND part.deleted_at IS NULL'),
        [submissionId, null]
      );
    });

    it('rejects a tutor when assignment is not consistent across all three Parts', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: submissionId, user_id: 'user-1', assigned_tutor_scope: false, audio_url: 'private' }]
      });
      await expect(SubmissionService.getSpeakingAudioUrl(submissionId, {
        id: 'tutor-1',
        role: 'tutor'
      })).rejects.toMatchObject({ statusCode: 403, errorCode: 'AUTH_PERM_001' });
    });

    it('rejects an invalid submission UUID before querying the database', async () => {
      await expect(SubmissionService.getSpeakingAudioUrl('not-a-uuid', {
        id: 'user-1',
        role: 'student',
      })).rejects.toMatchObject({ statusCode: 400, errorCode: 'INVALID_FIELD' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should reject unsupported roles', async () => {
      await expect(SubmissionService.getSpeakingAudioUrl('sub-1', {
        id: 'user-1',
        role: 'guest'
      })).rejects.toMatchObject({
        statusCode: 403,
        errorCode: 'AUTH_PERM_001'
      });

      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
