/**
 * @file backend/src/controllers/adminContent.controller.js
 * @description Controller for Admin operations on Content (Tests, Resources).
 */

const contentService = require('../services/content.service');
const AppError = require('../utils/AppError');

const adminContentController = {
  /**
   * Handler for listing pending tests
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  getPendingTests: async (req, res, next) => {
    try {
      const tests = await contentService.getPendingTests();
      res.status(200).json({
        success: true,
        data: tests,
        error: null,
        meta: { total: tests.length }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handler for listing pending resources
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  getPendingResources: async (req, res, next) => {
    try {
      const resources = await contentService.getPendingResources();
      res.status(200).json({
        success: true,
        data: resources,
        error: null,
        meta: { total: resources.length }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handler for listing publish schedule
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  getPublishSchedule: async (req, res, next) => {
    try {
      const schedule = await contentService.getPublishSchedule();
      res.status(200).json({
        success: true,
        data: schedule,
        error: null,
        meta: { total: schedule.length }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handler for reviewing a test
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  reviewTest: async (req, res, next) => {
    try {
      const testId = req.params.id;
      const { action } = req.body;
      const actorId = req.user.id;
      const ipAddress = req.ip;

      const result = await contentService.reviewTest(testId, action, actorId, ipAddress);
      
      res.status(200).json({
        success: true,
        data: result,
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Handler for reviewing a resource
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  reviewResource: async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const { action } = req.body;
      const actorId = req.user.id;
      const ipAddress = req.ip;

      const result = await contentService.reviewResource(resourceId, action, actorId, ipAddress);
      
      res.status(200).json({
        success: true,
        data: result,
        error: null,
        meta: null
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = adminContentController;
