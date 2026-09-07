"use client";

const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.82;

/**
 * Read an image file and return a compressed JPEG data URI.
 *
 * Exhibits go into the case record and are sent to the judge as vision input, so
 * downscaling in the browser keeps requests small and uploads instant. Falls back
 * to the untouched file if the browser cannot decode it.
 */
export async function fileToDataUri(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");

    // JPEG has no alpha; paint a white ground so transparent PNGs don't go black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return readAsDataUri(file);
  }
}

function readAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
