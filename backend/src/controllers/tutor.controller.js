const TutorService = require('../services/tutor.service');

class TutorController {
  /**
   * GET /api/v1/tutors/queue
   * Fetch pending grading queue for tutors
   */
  static async getTutorQueue(req, res, next) {
    try {
      const { submission_type, search } = req.query;

      const filters = {
        submission_type: submission_type?.toLowerCase(),
        search: search?.trim()
      };

      const queueData = await TutorService.getQueue(filters);

      res.status(200).json({
        success: true,
        data: queueData,
        error: null,
        meta: {
          total: queueData.length,
          filters: {
            submission_type: filters.submission_type || null,
            search: filters.search || null
          }
        }
      });
    } catch (err) {
      next(err); // Centralized error handler
    }
  }
}

module.exports = TutorController;
