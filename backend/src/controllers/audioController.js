const AudioStorageService = require('../services/audioStorage.service');

class AudioController {
  /**
   * Upload audio file to Supabase Storage
   * POST /api/v1/audio/upload
   * Form-Data: { audio: File }
   */
  static async uploadAudio(req, res, next) {
    try {
      // Validation
      if (!req.file) {
        return res.status(400).json({
          success: false,
          data: null,
          meta: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No audio file uploaded'
          }
        });
      }

      const buffer = req.file.buffer;
      const filename = req.file.originalname;
      const mimeType = req.file.mimetype;

      // Upload to Supabase
      const result = await AudioStorageService.uploadAudio(buffer, filename, mimeType);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          data: null,
          meta: null,
          error: {
            code: 'UPLOAD_FAILED',
            message: result.error
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          url: result.url,
          path: result.path
        },
        meta: null,
        error: null
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete audio file from Supabase Storage
   * DELETE /api/v1/audio/:path
   */
  static async deleteAudio(req, res, next) {
    try {
      const { path: filePath } = req.params;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          data: null,
          meta: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File path is required'
          }
        });
      }

      const result = await AudioStorageService.deleteAudio(filePath);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          data: null,
          meta: null,
          error: {
            code: 'DELETE_FAILED',
            message: result.error
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: { message: 'Audio file deleted successfully' },
        meta: null,
        error: null
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AudioController;

