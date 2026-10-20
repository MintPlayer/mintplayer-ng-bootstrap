/**
 * Two-stop clamped HSL color scale (codecov's coverage ramp: a long-way hue
 * sweep red -> green with yellow in the middle, clamped outside the domain),
 * plus the WCAG contrast math the hierarchy chart's label coloring rides on.
 * Accepts #rgb/#rrggbb, rgb(r, g, b) and hsl(h, s%, l%) colors — the forms
 * this module itself emits, plus what browsers report as computed values.
 */

interface Hsl { h: number; s: number; l: number }

type Rgb = [number, number, number];

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const sector = Math.floor(hue / 60);
  const [r, g, b] =
    sector === 0 ? [c, x, 0]
    : sector === 1 ? [x, c, 0]
    : sector === 2 ? [0, c, x]
    : sector === 3 ? [0, x, c]
    : sector === 4 ? [x, 0, c]
    : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function parseColor(input: string): Rgb {
  const hex = input.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
  }
  const rgb = input.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hsl = input.trim().match(/^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i);
  if (hsl) return hslToRgb(Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100);
  throw new Error(`Unsupported color: "${input}" (use #rrggbb, rgb(r, g, b) or hsl(h, s%, l%))`);
}

function tryParseColor(input: string): Rgb | undefined {
  try {
    return parseColor(input);
  } catch {
    return undefined;
  }
}

function rgbToHsl([r, g, b]: [number, number, number]): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0))
    : max === gn ? (bn - rn) / d + 2
    : (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

/**
 * Returns v -> "hsl(...)" mapping [min, max] onto [from, to], clamped outside.
 * Hue interpolates linearly WITHOUT shortest-path wrapping (d3's
 * interpolateHslLong behaviour, which is what produces red->yellow->green).
 */
export function colorScale(
  min: number,
  max: number,
  from: string,
  to: string,
): (value: number) => string {
  const a = rgbToHsl(parseColor(from));
  const b = rgbToHsl(parseColor(to));
  const span = max - min;
  return (value) => {
    const t = span === 0 ? 0 : Math.min(1, Math.max(0, (value - min) / span));
    const h = a.h + (b.h - a.h) * t;
    const s = a.s + (b.s - a.s) * t;
    const l = a.l + (b.l - a.l) * t;
    return `hsl(${round(h)}, ${round(s * 100)}%, ${round(l * 100)}%)`;
  };
}

const round = (v: number): number => Math.round(v * 10) / 10;

/**
 * WCAG 2.x relative luminance (0 = black, 1 = white).
 * Returns undefined for colors the parser does not understand (named colors,
 * var() references, gradients) — callers fall back to a backdrop-based pick.
 */
export function relativeLuminance(color: string): number | undefined {
  const rgb = tryParseColor(color);
  if (!rgb) return undefined;
  const [r, g, b] = rgb.map((c) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Source-over compositing of a translucent fill onto an opaque backdrop —
 * the effective surface a .6-opacity leaf arc actually presents under a label.
 */
export function composite(fg: string, bg: string, alpha: number): string | undefined {
  const f = tryParseColor(fg);
  const b = tryParseColor(bg);
  if (!f || !b) return undefined;
  const a = Math.min(1, Math.max(0, alpha));
  const mix = f.map((c, i) => Math.round(c * a + b[i] * (1 - a)));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

/**
 * Which text tone contrasts better with the given surface: 'dark' text (for
 * light surfaces) or 'light' text (for dark surfaces), by comparing WCAG
 * contrast ratios against black and white. undefined when unparseable.
 */
export function contrastText(surface: string): 'dark' | 'light' | undefined {
  const lum = relativeLuminance(surface);
  if (lum === undefined) return undefined;
  const darkRatio = (lum + 0.05) / 0.05;
  const lightRatio = 1.05 / (lum + 0.05);
  return darkRatio >= lightRatio ? 'dark' : 'light';
}
