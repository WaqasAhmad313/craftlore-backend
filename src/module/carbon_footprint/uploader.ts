import { cloudinary } from "../report/upload/client.ts";
import type { MulterFile } from "../report/types/types.ts";

export async function uploadProductImage(file: MulterFile): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "clee/products",
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
          transformation: [
            { quality: "auto", fetch_format: "auto" },
          ],
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