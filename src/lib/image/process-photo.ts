// Re-encodes a captured photo through a canvas before upload. This has two
// deliberate effects: it strips EXIF metadata (including GPS location, which
// we have no operational need to store — data minimisation), and it downsizes
// large camera photos so uploads stay fast on mobile data.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

// iPhones default to shooting HEIC, and depending on iOS version/settings a
// driver picking an existing library photo (rather than shooting fresh
// through the camera capture prompt) can hand the app a HEIC file. Chromium
// (and most non-Safari browsers) have no built-in HEIC decoder at all, so
// createImageBitmap() rejects it outright — confirmed by hand: an unmodified
// HEIC file fails here with no useful error, which would otherwise read to a
// driver as "photo upload broken" and block them starting their shift.
const HEIC_FTYP_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

async function looksLikeHeic(file: File): Promise<boolean> {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  if (type) return false; // A confidently-reported non-HEIC type (jpeg/png/webp/...) is trustworthy.
  if (/\.(heic|heif)$/i.test(file.name)) return true;

  // Some pickers hand over a HEIC file with no MIME type and a generic or
  // missing extension. Rather than trust metadata alone, sniff the ISO base
  // media file "ftyp" box directly — same trick browsers themselves use.
  if (file.size < 12) return false;
  const header = new Uint8Array(await file.slice(4, 12).arrayBuffer());
  if (header.length < 8) return false;
  const box = new TextDecoder("ascii").decode(header.slice(0, 4));
  const brand = new TextDecoder("ascii").decode(header.slice(4, 8));
  return box === "ftyp" && HEIC_FTYP_BRANDS.has(brand);
}

export async function processPhoto(file: File): Promise<Blob> {
  let source: Blob = file;

  if (await looksLikeHeic(file)) {
    // Loaded on demand (it bundles a ~2.5MB WASM HEIF decoder) so the common
    // case — a JPEG straight from the camera — never pays for it.
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
    source = Array.isArray(converted) ? converted[0] : converted;
  }

  const bitmap = await createImageBitmap(source);
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
