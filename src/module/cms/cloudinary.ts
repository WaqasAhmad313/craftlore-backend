import { v2 as cloudinary } from "cloudinary";

/** Minimal multer file shape (memory storage) */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export type MulterFilesMap = Record<string, MulterFile[]>;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    "Cloudinary env vars missing: CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET"
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

function uploadBuffer(file: MulterFile, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "auto",
        },
        (error, result) => {
          if (error || !result?.secure_url) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve(result.secure_url);
        }
      )
      .end(file.buffer);
  });
}

type UploadValue = string | string[];
type UploadTuple = [field: string, value: UploadValue];

function isUploadTuple(x: UploadTuple | null): x is UploadTuple {
  return x !== null;
}

/**
 * Uploads all received fields.
 * - If a field has 1 file -> returns a string URL
 * - If a field has multiple -> returns string[] URLs
 */
export async function uploadFiles(
  files: MulterFilesMap | undefined,
  folderBase: string
): Promise<Record<string, string | string[]>> {
  if (!files || Object.keys(files).length === 0) return {};

  const entries = Object.entries(files);

  const uploaded = await Promise.all(
    entries.map(async ([field, fileList]): Promise<UploadTuple | null> => {
      if (!fileList || fileList.length === 0) return null;

      const urls = await Promise.all(
        fileList.map((f) => uploadBuffer(f, `${folderBase}/${field}`))
      );

      if (urls.length === 0) return null;

      return [field, urls.length === 1 ? urls[0]! : urls];
    })
  );

  const result: Record<string, string | string[]> = {};
  for (const [field, value] of uploaded.filter(isUploadTuple)) {
    result[field] = value;
  }

  return result;
}

/**
 * Placeholder replacement in JSON:
 * - "@upload:FIELD"  -> string (first url)
 * - "@uploads:FIELD" -> string[] (all urls)
 */
export function applyUploads<T>(
  input: T,
  uploads: Record<string, string | string[]>
): T {
  const visit = (val: unknown): unknown => {
    if (typeof val === "string") {
      const singleMatch = val.match(/^@upload:([a-zA-Z0-9_:-]+)$/);
      if (singleMatch) {
        const key = singleMatch[1]!;
        const u = uploads[key];
        if (Array.isArray(u)) return u[0] ?? val;
        return u ?? val;
      }

      const multiMatch = val.match(/^@uploads:([a-zA-Z0-9_:-]+)$/);
      if (multiMatch) {
        const key = multiMatch[1]!;
        const u = uploads[key];
        if (Array.isArray(u)) return u;
        return u ? [u] : [];
      }

      return val;
    }

    if (Array.isArray(val)) return val.map(visit);

    if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) out[k] = visit(v);
      return out;
    }

    return val;
  };

  return visit(input) as T;
}