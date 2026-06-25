/**
 * @file backend/src/controllers/adminTutor.controller.js
 * @description Controller for Admin operations on Tutor Assignments per submission.
 */

const adminTutorService = require('../services/adminTutor.service');

const adminTutorController = {
  /**
   * GET /api/v1/admin/tutor-assignments
   */
  getTutorAssignments: async (req, res, next) => {
    try {
      const data = await adminTutorService.getAssignmentData();
      res.status(200).json({
        success: true,
        data,
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/admin/tutor-assignments/:submissionId
   * Body: { tutor_id, type }
   */
  assignTutor: async (req, res, next) => {
    try {
      const actorId = req.user.id;
      const submissionId = req.params.submissionId;
      const { tutor_id, type } = req.body;

      if (!type) {
        return res.status(400).json({
          success: false,
          error: { message: 'Missing submission type' }
        });
      }

      const updated = await adminTutorService.assignSubmission(actorId, submissionId, type, tutor_id);

      res.status(200).json({
        success: true,
        data: updated,
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = adminTutorController;
