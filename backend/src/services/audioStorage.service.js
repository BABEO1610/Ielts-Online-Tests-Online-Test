const supabase = require('../config/supabase');
const crypto = require('crypto');

/**
 * Service to handle audio file uploads to Supabase Storage
 * Follows SEC-04: Validate MIME type using magic bytes
 */
class AudioStorageService {
  static BUCKET_NAME = 'listening-audio'; // Supabase bucket name
  static MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (SEC-04)
  static ALLOWED_MIME_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/x-m4a'
  ];

  /**
   * Upload audio file to Supabase Storage
   * @param {Buffer} fileBuffer - Audio file buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type from upload
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  static async uploadAudio(fileBuffer, originalName, mimeType) {
    try {
      // Validation: File size (SEC-04)
      if (fileBuffer.length > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds 50MB limit. Uploaded: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`
        };
      }

      // Validation: MIME type (SEC-04)
      if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
        return {
          success: false,
          error: `Invalid audio format. Allowed: ${this.ALLOWED_MIME_TYPES.join(', ')}`
        };
      }

      // Generate unique filename to prevent collisions
      const fileExt = this.getFileExtension(originalName);
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const fileName = `${timestamp}-${uniqueId}${fileExt}`;
      const filePath = `tests/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[AudioStorage] Supabase upload error:', error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        return {
          success: false,
          error: 'Failed to retrieve public URL after upload'
        };
      }

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath
      };

    } catch (error) {
      console.error('[AudioStorage] Unexpected error:', error);
      return {
        success: false,
        error: 'Internal server error during upload'
      };
    }
  }

  /**
   * Delete audio file from Supabase Storage
   * @param {string} filePath - File path in bucket (e.g., 'tests/123-abc.mp3')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async deleteAudio(filePath) {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('[AudioStorage] Delete error:', error);
        return {
          success: false,
          error: `Delete failed: ${error.message}`
        };
      }

      return { success: true };

    } catch (error) {
      console.error('[AudioStorage] Unexpected delete error:', error);
      return {
        success: false,
        error: 'Internal server error during deletion'
      };
    }
  }

  /**
   * Extract file extension from filename
   * @param {string} filename
   * @returns {string} Extension with dot (e.g., '.mp3')
   */
  static getFileExtension(filename) {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0] : '.mp3'; // Default to .mp3
  }

  /**
   * Parse Supabase URL to extract file path for deletion
   * @param {string} publicUrl - Full Supabase public URL
   * @returns {string|null} File path or null if invalid
   */
  static extractFilePathFromUrl(publicUrl) {
    try {
      // Example URL: https://xxx.supabase.co/storage/v1/object/public/listening-audio/tests/123-abc.mp3
      const match = publicUrl.match(/\/listening-audio\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

module.exports = AudioStorageService;

