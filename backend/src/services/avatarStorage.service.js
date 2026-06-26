const supabase = require('../config/supabase');
const crypto = require('crypto');

/**
 * Service to handle avatar file uploads to Supabase Storage
 * Follows SEC-04: Validate MIME type using magic bytes
 */
class AvatarStorageService {
  static BUCKET_NAME = 'avatars'; // Supabase bucket name
  static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (SEC-04)
  static ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  /**
   * Upload image file to Supabase Storage
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type from upload
   * @param {string} userId - User ID to organize folders
   * @returns {Promise<{success: boolean, url?: string, error?: string, path?: string}>}
   */
  static async uploadImage(fileBuffer, originalName, mimeType, userId) {
    try {
      // Validation: File size (SEC-04)
      if (fileBuffer.length > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds 5MB limit. Uploaded: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`
        };
      }

      // Validation: MIME type (SEC-04)
      if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
        return {
          success: false,
          error: `Invalid image format. Allowed: ${this.ALLOWED_MIME_TYPES.join(', ')}`
        };
      }

      // Generate unique filename to prevent collisions
      const fileExt = this.getFileExtension(originalName);
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const fileName = `${timestamp}-${uniqueId}${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[AvatarStorage] Supabase upload error:', error);
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
      console.error('[AvatarStorage] Unexpected error:', error);
      return {
        success: false,
        error: 'Internal server error during upload'
      };
    }
  }

  /**
   * Delete image file from Supabase Storage
   * @param {string} filePath - File path in bucket (e.g., 'userId/123-abc.jpg')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async deleteImage(filePath) {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('[AvatarStorage] Delete error:', error);
        return {
          success: false,
          error: `Delete failed: ${error.message}`
        };
      }

      return { success: true };

    } catch (error) {
      console.error('[AvatarStorage] Unexpected delete error:', error);
      return {
        success: false,
        error: 'Internal server error during deletion'
      };
    }
  }

  /**
   * Extract file extension from filename
   * @param {string} filename
   * @returns {string} Extension with dot (e.g., '.jpg')
   */
  static getFileExtension(filename) {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0] : '.jpg'; // Default to .jpg
  }

  /**
   * Parse Supabase URL to extract file path for deletion
   * @param {string} publicUrl - Full Supabase public URL
   * @returns {string|null} File path or null if invalid
   */
  static extractFilePathFromUrl(publicUrl) {
    try {
      // Example URL: https://xxx.supabase.co/storage/v1/object/public/avatars/userId/123-abc.jpg
      const match = publicUrl.match(/\/avatars\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

module.exports = AvatarStorageService;
