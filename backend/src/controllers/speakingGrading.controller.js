const AppError = require('../utils/AppError');
const SubmissionController = require('./submission.controller');
const { getSpeakingSubmissionService } = require('../services/speakingSubmission.service');
const { getSpeakingGradingRetryService } = require('../services/speakingGradingRetry.service');
const { aiGradingConfig } = require('../config/aiGrading.config');

const envelope = (data, meta = {}) => ({ success: true, data, error: null, meta });

class SpeakingGradingController {
  static async createAudioUpload(req, res, next) {
    try {
      const data = await getSpeakingSubmissionService().createAudioUpload(req.user.id, req.body);
      res.status(201).set('Cache-Control', 'private, no-store').json(envelope(data));
    } catch (error) { next(error); }
  }

  static async submitFull(req, res, next) {
    if (req.body?.grader === 'tutor' && req.body?.parts?.every((part) => part.upload_token)) {
      try {
        if (req.user.role !== 'student') throw new AppError('Chỉ học viên được gửi bài.', 403, 'AUTH_PERM_001');
        const data = await getSpeakingSubmissionService().submitTutorSpeaking({
          userId: req.user.id,
          testId: req.body.test_id,
          parts: req.body.parts,
        });
        return res.status(201).set('Cache-Control', 'private, no-store').json(envelope(data));
      } catch (error) { return next(error); }
    }
    if (req.body?.grader === 'tutor') {
      if (aiGradingConfig.enabled) {
        return next(new AppError(
          'Bài Speaking gửi tutor phải dùng đủ ba signed upload token.',
          410,
          'LEGACY_SPEAKING_SUBMISSION_DISABLED'
        ));
      }
      return SubmissionController.submitFullSpeaking(req, res, next);
    }
    try {
      if (req.user.role !== 'student') throw new AppError('Chỉ học viên được gửi bài AI.', 403, 'AUTH_PERM_001');
      const data = await getSpeakingSubmissionService().submitFullSpeaking({
        userId: req.user.id,
        testId: req.body?.test_id,
        grader: req.body?.grader,
        parts: req.body?.parts,
        idempotencyKey: req.get('Idempotency-Key'),
      });
      res.status(202)
        .location(data.status_url)
        .set('Retry-After', '3')
        .set('Cache-Control', 'private, no-store')
        .json(envelope(data, { replayed: data.replayed }));
    } catch (error) { next(error); }
  }

  static async getStatus(req, res, next) {
    try {
      const data = await getSpeakingSubmissionService().getStatus(req.params.speakingGroupId, req.user);
      res.status(200).set('Cache-Control', 'private, no-store').json(envelope(data));
    } catch (error) { next(error); }
  }

  static async retry(req, res, next) {
    try {
      if (req.user.role !== 'student') throw new AppError('Chỉ học viên được retry bài của mình.', 403, 'AUTH_PERM_001');
      const data = await getSpeakingGradingRetryService().retry({
        groupId: req.params.speakingGroupId,
        userId: req.user.id,
        idempotencyKey: req.get('Idempotency-Key'),
      });
      res.status(202)
        .location(data.status_url)
        .set('Retry-After', '3')
        .set('Cache-Control', 'private, no-store')
        .json(envelope(data, { replayed: data.replayed }));
    } catch (error) { next(error); }
  }
}

module.exports = SpeakingGradingController;
