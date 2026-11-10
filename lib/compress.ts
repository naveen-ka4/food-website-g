import imageCompression from "browser-image-compression";

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  fileType?: string;
  useWebWorker?: boolean;
}

/**
 * Compresses an image file in the browser before uploading to Supabase Storage.
 * Default target: < 100 KB, max 1280px dimension, webp format.
 */
export async function compressImageToWebP(
  file: File,
  customOptions?: CompressionOptions
): Promise<File> {
  const options = {
    maxSizeMB: customOptions?.maxSizeMB ?? 0.1, // 100 KB target
    maxWidthOrHeight: customOptions?.maxWidthOrHeight ?? 1280,
    useWebWorker: customOptions?.useWebWorker ?? true,
    fileType: customOptions?.fileType ?? "image/webp",
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([compressedBlob], newFileName, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Client image compression fallback:", error);
    // Return original file if compression fails
    return file;
  }
}
