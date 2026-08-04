// Minimal PNG reader for Playwright screenshots (8-bit, non-interlaced, RGB/RGBA).
// Needed because the only honest answer to "does the overlay line up / is the
// focus ring visible" is pixels.
import { inflateSync } from 'node:zlib';

export function decodePng(buf) {
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported png: depth=${bitDepth} colorType=${colorType}`);
  }
  const ch = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { width, height, channels: ch, data: out };
}

const lum = (img, x, y) => {
  const i = (y * img.width + x) * img.channels;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
};

/** First x (left→right) in the band where any pixel is darker than `threshold`. */
export function firstDarkColumn(img, { y0 = 0, y1 = img.height, threshold = 140, x0 = 0 } = {}) {
  for (let x = x0; x < img.width; x++) {
    for (let y = y0; y < y1; y++) if (lum(img, x, y) < threshold) return x;
  }
  return -1;
}

/** Count columns containing any non-white pixel — a crude "is anything drawn" probe. */
export function nonWhiteColumns(img, { y0 = 0, y1 = img.height, tol = 8 } = {}) {
  let n = 0;
  for (let x = 0; x < img.width; x++) {
    for (let y = y0; y < y1; y++) {
      const i = (y * img.width + x) * img.channels;
      const d = img.data;
      if (255 - d[i] > tol || 255 - d[i + 1] > tol || 255 - d[i + 2] > tol) { n++; break; }
    }
  }
  return n;
}

/** Distinct-ish colour count in a region — flags are multi-coloured, text is not. */
export function colourCount(img, { x0 = 0, y0 = 0, x1 = img.width, y1 = img.height } = {}) {
  const set = new Set();
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * img.channels;
      const d = img.data;
      // quantise to 5 bits/channel so antialiasing doesn't inflate the count
      set.add(((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3));
    }
  }
  return set.size;
}

/** True if any pixel in the region is a saturated colour (not grey/black/white). */
export function hasSaturatedColour(img, { x0 = 0, y0 = 0, x1 = img.width, y1 = img.height, minSat = 60 } = {}) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * img.channels;
      const d = img.data;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]);
      const mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mx - mn >= minSat) return true;
    }
  }
  return false;
}
