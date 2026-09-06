// Re-encodes a captured photo through a canvas before upload. This has two
// deliberate effects: it strips EXIF metadata (including GPS location, which
// we have no operational need to store — data minimisation), and it downsizes
// large camera photos so uploads stay fast on mobile data.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export async function processPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this device.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the photo."))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
