import { cloudinary } from "../report/upload/client.ts";

interface UploadOptions {
  folder: string;
}

async function uploadSingleFile(
  file: Express.Multer.File,
  options: UploadOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: options.folder,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve(result.secure_url);
        }
      )
      .end(file.buffer);
  });
}

export class MembershipUploader {
  /**
   * Upload a member profile photo or organization logo
   */
  static async uploadMemberPhoto(file: Express.Multer.File): Promise<string> {
    return uploadSingleFile(file, {
      folder: "memberships/photos",
    });
  }
}