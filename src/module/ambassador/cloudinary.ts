import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.ts";

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Upload buffer to Cloudinary using stream (Method 1 - Recommended)
 * This is the same method used in your working uploader.ts
 */
async function uploadViaBuffer(
  buffer: Buffer,
  folder: "profiles" | "certificates" | "stories"
): Promise<CloudinaryUploadResult> {
  console.log("🔄 [CLOUDINARY] Attempting Method 1: Buffer Upload Stream");
  console.log(`📊 Buffer size: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ambassadors/${folder}`,
        resource_type: "auto",
        transformation: [
          { width: 1000, height: 1000, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          console.error("❌ Method 1 failed:", error);
          reject(error);
          return;
        }

        if (!result) {
          console.error("❌ Method 1 failed: No result from Cloudinary");
          reject(new Error("No result from Cloudinary upload"));
          return;
        }

        console.log("✅ Method 1 successful!");
        console.log(`📦 Uploaded to: ${result.secure_url}`);

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );

    // Important: End the stream with the buffer
    uploadStream.end(buffer);
  });
}

/**
 * Upload via base64 data URI (Method 2 - Fallback)
 */
async function uploadViaBase64(
  dataUri: string,
  folder: "profiles" | "certificates" | "stories"
): Promise<CloudinaryUploadResult> {
  console.log("🔄 [CLOUDINARY] Attempting Method 2: Base64 Upload");

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `ambassadors/${folder}`,
    resource_type: "image",
    timeout: 60000,
    chunk_size: 6000000,
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
  });

  console.log("✅ Method 2 successful!");
  console.log(`📦 Uploaded to: ${result.secure_url}`);

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

/**
 * Upload image to Cloudinary with automatic fallback
 * @param base64Image - Base64 encoded image string (with or without data URI prefix)
 * @param folder - Cloudinary folder path
 * @returns Cloudinary upload result with secure URL
 */
export async function uploadImage(
  base64Image: string,
  folder: "profiles" | "certificates" | "stories"
): Promise<CloudinaryUploadResult> {
  console.log("═════════════════════════════════════════════════");
  console.log("🚀 [CLOUDINARY] Starting upload process...");
  console.log(`📁 Folder: ambassadors/${folder}`);
  console.log(`📏 Base64 length: ${base64Image.length.toLocaleString()} chars`);
  console.log(`📸 Image prefix: ${base64Image.substring(0, 50)}...`);

  try {
    // Ensure data URI format
    let dataUri = base64Image;
    if (!dataUri.startsWith("data:")) {
      console.log("⚠️  Adding data URI prefix to raw base64");
      dataUri = `data:image/jpeg;base64,${dataUri}`;
    }

    console.log(`✅ Data URI format: ${dataUri.substring(0, 50)}...`);

    // Calculate size
    const sizeInBytes = (dataUri.length * 3) / 4;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    console.log(`📊 Approximate size: ${sizeInMB}MB`);

    // Check Cloudinary config
    const config = cloudinary.config();
    console.log("🔧 Cloudinary config:", {
      cloud_name: config.cloud_name || "❌ Missing",
      api_key: config.api_key ? "✅ Set" : "❌ Missing",
      api_secret: config.api_secret ? "✅ Set" : "❌ Missing",
    });

    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      throw new Error("Cloudinary credentials not configured properly");
    }

    // Convert base64 to buffer for Method 1
    console.log("🔄 Converting base64 to buffer...");
    let base64Data = dataUri;
    if (base64Data.includes(",")) {
      const parts = base64Data.split(",");
      base64Data = parts[1] || base64Data;
    }

    const buffer = Buffer.from(base64Data, "base64");
    console.log(`✅ Buffer created: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`);

    // Try Method 1: Buffer Upload (Same as your working uploader.ts)
    console.log("═════════════════════════════════════════════════");
    console.log("🎯 Trying Method 1: Buffer Upload Stream (Recommended)");
    console.log("⏱️  Starting upload...");
    const startTime = Date.now();

    try {
      const result = await uploadViaBuffer(buffer, folder);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log("═════════════════════════════════════════════════");
      console.log(`✅ SUCCESS! Upload completed in ${duration}s`);
      console.log("📦 Result:", {
        secure_url: result.secure_url.substring(0, 80) + "...",
        public_id: result.public_id,
        dimensions: `${result.width}x${result.height}`,
        format: result.format,
      });
      console.log("═════════════════════════════════════════════════");

      return result;
    } catch (bufferError: any) {
      console.error("❌ Method 1 (Buffer) failed:");
      console.error("   Error:", bufferError.message || bufferError);
      console.error("   Error code:", bufferError.http_code || bufferError.code);
      console.error("   Error name:", bufferError.name);

      // Try Method 2: Base64 Upload as fallback
      console.log("═════════════════════════════════════════════════");
      console.log("🔄 Falling back to Method 2: Base64 Upload");
      console.log("⏱️  Starting upload...");
      const fallbackStartTime = Date.now();

      try {
        const result = await uploadViaBase64(dataUri, folder);
        const duration = ((Date.now() - fallbackStartTime) / 1000).toFixed(2);
        
        console.log("═════════════════════════════════════════════════");
        console.log(`✅ SUCCESS! Fallback upload completed in ${duration}s`);
        console.log("📦 Result:", {
          secure_url: result.secure_url.substring(0, 80) + "...",
          public_id: result.public_id,
          dimensions: `${result.width}x${result.height}`,
          format: result.format,
        });
        console.log("═════════════════════════════════════════════════");

        return result;
      } catch (base64Error: any) {
        console.error("❌ Method 2 (Base64) also failed:");
        console.error("   Error:", base64Error.message || base64Error);
        console.error("   Error code:", base64Error.http_code || base64Error.code);
        console.error("   Error name:", base64Error.name);
        
        // Both methods failed
        throw base64Error;
      }
    }
  } catch (error: any) {
    console.error("═════════════════════════════════════════════════");
    console.error("💥 BOTH UPLOAD METHODS FAILED");
    console.error("═════════════════════════════════════════════════");
    console.error("🔍 Error details:");
    console.error("   Message:", error.message || "Unknown error");
    console.error("   Name:", error.name);
    console.error("   HTTP Code:", error.http_code || "N/A");
    console.error("   Error Code:", error.code || "N/A");
    console.error("   Folder:", folder);
    console.error("   Image size:", `${((base64Image.length * 3) / 4 / (1024 * 1024)).toFixed(2)}MB`);
    
    // Log full error object for deep debugging
    console.error("🔍 Full error object:");
    console.error(JSON.stringify(error, null, 2));
    
    console.error("═════════════════════════════════════════════════");

    // Provide helpful error message based on error type
    let errorMessage = "Failed to upload image to Cloudinary";
    
    if (error.message?.includes("Timeout") || error.http_code === 499) {
      errorMessage = "Upload timeout - image may be too large or network is slow";
    } else if (error.http_code === 401 || error.http_code === 403) {
      errorMessage = "Cloudinary authentication failed - check API credentials";
    } else if (error.http_code === 420) {
      errorMessage = "Cloudinary rate limit exceeded - please wait and try again";
    } else if (error.message) {
      errorMessage = `Cloudinary error: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    console.log(`🗑️  [CLOUDINARY] Deleting image: ${publicId}`);
    await cloudinary.uploader.destroy(publicId);
    console.log("✅ Image deleted successfully");
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
    // Don't throw - deletion failure shouldn't block other operations
  }
}

/**
 * Check if string is a Cloudinary URL (existing image)
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes("cloudinary.com") || url.includes("res.cloudinary");
}