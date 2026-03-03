import { cloudinary } from "../report/upload/client.ts";
import type { MulterFile } from "../report/types/types.ts";

interface GovernmentDocumentsResult {
  authorization_letter?: string | null;
  accreditation_certificates?: string[] | null;
  appointment_orders?: string[] | null;
  registration_documents?: string[] | null;
}

async function uploadSingleFile(file: MulterFile, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: "auto" },
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

async function uploadGroup(
  files: Record<string, MulterFile[]> | undefined,
  field: string,
  folder: string
): Promise<string[] | null> {
  const group = files?.[field];
  if (!group || group.length === 0) return null;
  const urls = await Promise.all(group.map((f) => uploadSingleFile(f, folder)));
  return urls.length > 0 ? urls : null;
}

export class GovernmentEntityUploader {
  static async upload(
    files?: Record<string, Express.Multer.File[]>
  ): Promise<GovernmentDocumentsResult | null> {
    if (!files || Object.keys(files).length === 0) return null;

    const result: GovernmentDocumentsResult = {};
    const base = "government_entities";

    // Single file
    const authLetter = files.authorization_letter?.[0];
    if (authLetter) {
      result.authorization_letter = await uploadSingleFile(
        authLetter,
        `${base}/authorization_letters`
      );
    }

    // Multi-file groups
    result.accreditation_certificates = await uploadGroup(
      files, "accreditation_certificates", `${base}/accreditation_certificates`
    );
    result.appointment_orders = await uploadGroup(
      files, "appointment_orders", `${base}/appointment_orders`
    );
    result.registration_documents = await uploadGroup(
      files, "registration_documents", `${base}/registration_documents`
    );

    // Strip null/undefined keys
    (Object.keys(result) as Array<keyof GovernmentDocumentsResult>).forEach(
      (key) => result[key] == null && delete result[key]
    );

    return Object.keys(result).length > 0 ? result : null;
  }
}