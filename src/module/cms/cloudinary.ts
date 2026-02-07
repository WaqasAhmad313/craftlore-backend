import { v2 as cloudinary } from 'cloudinary';
import type { MulterFile } from './types.ts';

// =====================================================
// CONFIGURATION
// =====================================================

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error('Cloudinary environment variables are not fully defined');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

// =====================================================
// UPLOAD OPTIONS INTERFACE
// =====================================================

interface UploadOptions {
  folder: string;
}

// =====================================================
// SINGLE FILE UPLOAD FUNCTION
// =====================================================

async function uploadSingleFile(
  file: MulterFile,
  options: UploadOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: options.folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          if (!result) {
            reject(new Error('Cloudinary upload failed'));
            return;
          }
          resolve(result.secure_url);
        }
      )
      .end(file.buffer);
  });
}

// =====================================================
// CMS IMAGE UPLOADER CLASS
// =====================================================

export class CMSImageUploader {
  /**
   * Upload team member profile image
   */
  static async uploadProfileImage(file: MulterFile): Promise<string> {
    return uploadSingleFile(file, {
      folder: 'cms/team_profiles',
    });
  }

  /**
   * Upload content section image
   */
  static async uploadContentImage(
    file: MulterFile,
    pageSlug: string,
    sectionKey: string
  ): Promise<string> {
    return uploadSingleFile(file, {
      folder: `cms/content/${pageSlug}/${sectionKey}`,
    });
  }

  /**
   * Upload page meta OG/Twitter image
   */
  static async uploadMetaImage(file: MulterFile, pageSlug: string): Promise<string> {
    return uploadSingleFile(file, {
      folder: `cms/meta/${pageSlug}`,
    });
  }

  /**
   * Delete image from Cloudinary
   */
  static async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Extract public_id from URL
      const urlParts = imageUrl.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      
      if (uploadIndex === -1) {
        return false;
      }

      const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
      const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');

      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }
}

export { cloudinary };