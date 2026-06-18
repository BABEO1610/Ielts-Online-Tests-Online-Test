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
   * Review a test (approve/reject)
   * @param {string} testId
   * @param {string} action - 'approve' or 'reject'
   * @param {string} actorId - Admin user id
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Updated test info
   */
  static async reviewTest(testId, action, actorId, ipAddress) {
    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Invalid review action', 400);
    }

    const result = await pool.query(contentQueries.updateTestReviewStatus, [testId, action]);
    
    if (result.rows.length === 0) {
      throw new AppError('Test not found', 404);
    }

    const updatedTest = result.rows[0];

    // Log action
    const logAction = action === 'approve' ? 'test_reviewed' : 'test_reviewed'; // Both can be test_reviewed, with new_value indicating approval/rejection
    await AuditLogService.logAction(
      actorId,
      logAction,
      'mock_tests',
      testId,
      null, // Ideally we query old state first, but we keep it simple here
      { review_status: action },
      ipAddress
    );

    return updatedTest;
  }

  /**
   * Review a resource (approve/reject)
   * @param {string} resourceId
   * @param {string} action - 'approve' or 'reject'
   * @param {string} actorId - Admin user id
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Updated resource info
   */
  static async reviewResource(resourceId, action, actorId, ipAddress) {
    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('Invalid review action', 400);
    }

    const result = await pool.query(contentQueries.updateResourceReviewStatus, [resourceId, action]);
    
    if (result.rows.length === 0) {
      throw new AppError('Resource not found', 404);
    }

    const updatedResource = result.rows[0];

    // Log action
    await AuditLogService.logAction(
      actorId,
      'resource_reviewed',
      'library_resources',
      resourceId,
      null,
      { review_status: action },
      ipAddress
    );

    return updatedResource;
  }
}

module.exports = ContentService;
