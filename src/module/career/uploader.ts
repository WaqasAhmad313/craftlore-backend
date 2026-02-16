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
          resource_type: "auto",
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

export class CareersFileUploader {
  /**
   * Upload resume file for job application
   */
  static async uploadApplicationResume(file: Express.Multer.File): Promise<string> {
    return uploadSingleFile(file, {
      folder: "careers/applications/resumes",
    });
  }

  /**
   * Upload resume file for talent pool
   */
  static async uploadTalentPoolResume(file: Express.Multer.File): Promise<string> {
    return uploadSingleFile(file, {
      folder: "careers/talent_pool/resumes",
    });
  }
}