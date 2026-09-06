// One-off placeholder icon generator (no external deps, no network). Produces
// a simple, valid, installable PWA icon set. Replace with real brand
// artwork before shipping — this exists so the manifest has real files
// rather than pointing at nothing.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const BG = [29, 78, 216]; // blue-700
const FG = [255, 255, 255];

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Draws a simple "parcel box" glyph: an outer square outline, a horizontal
// seam, and a vertical seam — reads as a delivery box at small sizes.
function pixelAt(x, y, size, padding) {
  const inner = size - padding * 2;
  const lx = x - padding;
  const ly = y - padding;
  if (lx < 0 || ly < 0 || lx >= inner || ly >= inner) return BG;

  const stroke = Math.max(2, Math.round(inner * 0.07));
  const onBorder =
    lx < stroke || lx >= inner - stroke || ly < stroke || ly >= inner - stroke;
  const onHSeam = Math.abs(ly - inner * 0.38) < stroke / 1.4;
  const onVSeam = Math.abs(lx - inner * 0.5) < stroke / 1.4 && ly > inner * 0.38;

  return onBorder || onHSeam || onVSeam ? FG : BG;
}

function generatePng(size, { maskablePadding = 0 } = {}) {
  const padding = maskablePadding || Math.round(size * 0.16);
  const raw = Buffer.alloc(size * (1 + size * 3));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y, size, padding);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });

writeFileSync("public/icons/icon-192.png", generatePng(192));
writeFileSync("public/icons/icon-512.png", generatePng(512));
writeFileSync("public/icons/icon-maskable-512.png", generatePng(512, { maskablePadding: Math.round(512 * 0.2) }));
writeFileSync("public/icons/apple-touch-icon.png", generatePng(180, { maskablePadding: Math.round(180 * 0.12) }));

console.log("Generated placeholder PWA icons in public/icons/");
