/**
 * @file backend/src/services/adminTutor.service.js
 * @description Service for managing tutor assignments per submission.
 */

const queries = require('../db/queries/tutorAssignment.queries');
const usersQueries = require('../db/queries/users.queries');
const AuditLogService = require('./audit.service');

const getAssignmentData = async () => {
  const [tutors, submissions] = await Promise.all([
    queries.getTutors(),
    queries.getPendingSubmissions()
  ]);

  const formattedSubmissions = submissions.map(s => ({
    ...s,
    target_band: s.target_band ? Number(s.target_band) : null
  }));

  return { tutors, assignments: formattedSubmissions };
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

  // Log action
  await AuditLogService.logAction(
    actorId,
    'user_updated', // Could be 'submission_updated' if added to log_action enum
    targetTable,
    submissionId,
    { assigned_tutor_id: submission.assigned_tutor_id },
    { assigned_tutor_id: updatedSubmission.assigned_tutor_id },
    null,
    true
  );

  return updatedSubmission;
};

module.exports = {
  getAssignmentData,
  assignSubmission,
};
