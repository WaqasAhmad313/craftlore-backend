import { cloudinary } from "./client.ts";
import type { MulterFile, EvidenceFilesResult } from "../types/types.ts";

interface UploadOptions {
  folder: string;
}

async function uploadSingleFile(
  file: MulterFile,
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

export class EvidenceUploader {
  static async upload(
    files?: Record<string, MulterFile[]>
  ): Promise<EvidenceFilesResult | null> {
    if (!files || Object.keys(files).length === 0) {
      return null;
    }

    const result: EvidenceFilesResult = {};

    const uploadGroup = async (field: string) => {
      const groupFiles = files[field];
      if (!groupFiles || groupFiles.length === 0) return null;

      const uploads = await Promise.all(
        groupFiles.map((file) =>
          uploadSingleFile(file, {
            folder: `counterfeit_reports/${field}`,
          })
        )
      );

      return uploads.length > 0 ? uploads : null;
    };

    // Single file field
    if (files.receipt && files.receipt.length > 0) {
      const [receiptFile] = files.receipt;

      if (receiptFile) {
        result.receipt = await uploadSingleFile(receiptFile, {
          folder: "counterfeit_reports/receipt",
        });
      }
    }

    // Multi-file fields
    result.product_photos = await uploadGroup("product_photos");
    result.gi_QRcode_closeups = await uploadGroup("gi_QRcode_closeups");
    result.packaging_photos = await uploadGroup("packaging_photos");
    result.certificates = await uploadGroup("certificates");
    result.listing_screenshots = await uploadGroup("listing_screenshots");
    result.gi_tag_photos = await uploadGroup("gi_tag_photos");
    result.gi_code_closeups = await uploadGroup("gi_code_closeups");

    // Remove undefined keys (important for DB upsert)
    Object.keys(result).forEach(
      (key) =>
        result[key as keyof EvidenceFilesResult] === undefined &&
        delete result[key as keyof EvidenceFilesResult]
    );

    return Object.keys(result).length > 0 ? result : null;
  }
}
