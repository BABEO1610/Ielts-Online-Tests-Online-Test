/**
 * @file backend/src/services/adminTutor.service.js
 * @description Service for managing tutor assignments per submission.
 */

const queries = require('../db/queries/tutorAssignment.queries');
const usersQueries = require('../db/queries/users.queries');
const AuditLogService = require('./audit.service');

const getAssignmentData = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const [tutors, submissions, total] = await Promise.all([
    queries.getTutors(),
    queries.getPendingSubmissions(limit, offset),
    queries.getPendingSubmissionsCount()
  ]);

  const formattedSubmissions = submissions.map(s => ({
    ...s,
    target_band: s.target_band ? Number(s.target_band) : null
  }));

  return {
    tutors,
    assignments: formattedSubmissions,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const assignSubmission = async (actorId, submissionId, type, tutorId) => {
  if (!['writing', 'speaking'].includes(type)) {
    const error = new Error('Invalid submission type');
    error.statusCode = 400;
    throw error;
  }

  const submission = await queries.getSubmissionByIdAndType(submissionId, type);
  if (!submission) {
    const error = new Error('Submission not found');
    error.statusCode = 404;
    throw error;
  }

  if (tutorId) {
    const tutor = await usersQueries.findUserById(tutorId);
    if (!tutor || tutor.role !== 'tutor') {
      const error = new Error('Tutor not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const updatedSubmission = await queries.assignTutorToSubmission(submissionId, type, tutorId || null);
  const targetTable = type === 'writing' ? 'writing_submissions' : 'speaking_submissions';

  // Dùng 'tutor_assigned' để phân biệt rõ hành động phân công giảng viên
  // khỏi 'user_updated' (dành cho cập nhật profile user). Lưu tên người thay
  // vì UUID thô để audit log hiển thị có nghĩa với người xem.
  await AuditLogService.logAction(
    actorId,
    'tutor_assigned',
    targetTable,
    submissionId,
    {
      tutor_id:        submission.assigned_tutor_id || null,
      tutor_name:      submission.tutor_name        || null,
      tutor_email:     submission.tutor_email       || null,
      student_name:    submission.student_name      || null,
      submission_type: type,
    },
    {
      tutor_id:        updatedSubmission.assigned_tutor_id || null,
      tutor_name:      updatedSubmission.tutor_name        || null,
      tutor_email:     updatedSubmission.tutor_email       || null,
      student_name:    updatedSubmission.student_name      || null,
      submission_type: type,
    },
    null,
    true
  );

  return updatedSubmission;
};

module.exports = {
  getAssignmentData,
  assignSubmission,
};
