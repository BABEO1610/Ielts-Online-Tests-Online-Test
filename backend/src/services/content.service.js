/**
 * @file backend/src/services/content.service.js
 * @description Service layer for Content Review (Tests, Resources).
 */

const { pool } = require('../db/pool');
const contentQueries = require('../db/queries/content.queries');
const AuditLogService = require('./audit.service');
const AppError = require('../utils/AppError');

class ContentService {
  /**
   * Get pending tests for review
   * @returns {Promise<Array>} List of pending tests
   */
  static async getPendingTests() {
    const result = await pool.query(contentQueries.getPendingTests);
    return result.rows;
  }

  /**
   * Get pending resources for review
   * @returns {Promise<Array>} List of pending resources
   */
  static async getPendingResources() {
    const result = await pool.query(contentQueries.getPendingResources);
    return result.rows;
  }

  /**
   * Get publish schedule
   * @returns {Promise<Array>} List of items scheduled to publish
   */
  static async getPublishSchedule() {
    const result = await pool.query(contentQueries.getPublishSchedule);
    return result.rows;
  }

  /**
   * Get test details including passages and questions
   * @param {string} testId
   * @returns {Promise<Object>} Test detail object
   */
  static async getTestDetail(testId) {
    // We execute 3 queries concurrently to avoid complex JSON aggregation in SQL
    const [testRes, passagesRes, questionsRes] = await Promise.all([
      pool.query(contentQueries.getTestDetailBase, [testId]),
      pool.query(contentQueries.getTestPassages, [testId]),
      pool.query(contentQueries.getTestQuestions, [testId])
    ]);

    if (testRes.rows.length === 0) {
      throw new AppError('Test not found', 404);
    }

    const test = testRes.rows[0];
    const passages = passagesRes.rows;
    const questions = questionsRes.rows;

    // Group questions by passage_id if block_id mapping implies it, or we just map them generally.
    // If questions aren't linked directly to passages, we just return them in order.
    // In our schema, question_blocks has passage_id. So we need to map question -> block -> passage.
    // But our query doesn't fetch passage_id directly for the question. Let's fix that conceptually, 
    // or just return passages and questions and let frontend handle it. Actually, for simplicity, 
    // we'll return them as siblings and frontend can figure it out or just list them.
    test.passages = passages;
    test.questions = questions;

    return test;
  }

  /**
   * Get resource detail
   * @param {string} resourceId
   * @returns {Promise<Object>} Resource detail object
   */
  static async getResourceDetail(resourceId) {
    const result = await pool.query(contentQueries.getResourceDetail, [resourceId]);
    if (result.rows.length === 0) {
      throw new AppError('Resource not found', 404);
    }
    return result.rows[0];
  }

  /**
   * Review a test (approve/reject)
   * @param {string} testId
   * @param {'approve'|'reject'} action
   * @param {string} actorId - Admin user id
   * @param {string} ipAddress
   * @returns {Promise<Object>} Updated test info
   */
  static async reviewTest(testId, action, actorId, ipAddress) {
    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Invalid review action. Must be "approve" or "reject".', 400);
    }

    // Map frontend verb → DB enum value  ('approve' → 'approved', 'reject' → 'rejected')
    const reviewStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await pool.query(contentQueries.updateTestReviewStatus, [testId, reviewStatus]);

    if (result.rows.length === 0) {
      throw new AppError('Test not found', 404);
    }

    const updatedTest = result.rows[0];

    // Audit log is best-effort — must NOT block the main operation.
    // If log_action enum is missing 'test_reviewed' (e.g. migration not fully applied),
    // we log a warning instead of letting it crash the entire response.
    try {
      await AuditLogService.logAction(
        actorId,
        'test_reviewed',
        'mock_tests',
        testId,
        null,
        { review_status: reviewStatus },
        ipAddress
      );
    } catch (auditErr) {
      console.warn('[ContentService] Audit log failed for reviewTest (non-fatal):', auditErr.message);
    }

    return updatedTest;
  }

  /**
   * Review a resource (approve/reject)
   * @param {string} resourceId
   * @param {'approve'|'reject'} action
   * @param {string} actorId - Admin user id
   * @param {string} ipAddress
   * @returns {Promise<Object>} Updated resource info
   */
  static async reviewResource(resourceId, action, actorId, ipAddress) {
    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Invalid review action. Must be "approve" or "reject".', 400);
    }

    // Map frontend verb → DB enum value  ('approve' → 'approved', 'reject' → 'rejected')
    const reviewStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await pool.query(contentQueries.updateResourceReviewStatus, [resourceId, reviewStatus]);

    if (result.rows.length === 0) {
      throw new AppError('Resource not found', 404);
    }

    const updatedResource = result.rows[0];

    // Audit log is best-effort — must NOT block the main operation.
    try {
      await AuditLogService.logAction(
        actorId,
        'resource_reviewed',
        'library_resources',
        resourceId,
        null,
        { review_status: reviewStatus },
        ipAddress
      );
    } catch (auditErr) {
      console.warn('[ContentService] Audit log failed for reviewResource (non-fatal):', auditErr.message);
    }

    return updatedResource;
  }
}

module.exports = ContentService;
