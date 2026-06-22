const TestService = require('../services/test.service');

class TestController {
  static async createTest(req, res, next) {
    try {
      // In a real app, user ID comes from auth middleware.
      // We will use a fallback logic if req.user is not set (for sprint 1 dev purpose).
      const userId = req.user ? req.user.id : null; 
      
      const testId = await TestService.createReadingTest(req.body, userId);
      
      res.status(201).json({
        success: true,
        data: testId,
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTests(req, res, next) {
    try {
      const tests = await TestService.getTests(req.query);
      
      res.status(200).json({
        success: true,
        data: tests,
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getWritingTests(req, res, next) {
    try {
      const tests = await TestService.getWritingTests();
      
      res.status(200).json({
        success: true,
        data: tests,
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTestById(req, res, next) {
    try {
      const test = await TestService.getTestById(req.params.id);
      
      if (!test) {
        return res.status(404).json({
          success: false,
          data: null,
          meta: null,
          error: { message: 'Test not found' }
        });
      }

      res.status(200).json({
        success: true,
        data: test,
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTestForStudent(req, res, next) {
    try {
      const test = await TestService.getTestForStudent(req.params.id);
      
      if (!test) {
        return res.status(404).json({
          success: false,
          data: null,
          meta: null,
          error: { message: 'Test not found' }
        });
      }

      res.status(200).json({
        success: true,
        data: test,
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTest(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const testId = req.params.id;
      
      await TestService.updateReadingTest(testId, req.body, userId);
      
      res.status(200).json({
        success: true,
        data: { id: testId },
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTest(req, res, next) {
    try {
      const testId = req.params.id;
      // You might want to pass userId to check permissions, but skipping for Sprint 1 demo
      await TestService.deleteTest(testId);
      
      res.status(200).json({
        success: true,
        data: { id: testId },
        meta: null,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TestController;
