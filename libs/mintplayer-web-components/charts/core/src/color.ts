/**
 * Two-stop clamped HSL color scale (codecov's coverage ramp: a long-way hue
 * sweep red -> green with yellow in the middle, clamped outside the domain).
 * Accepts #rgb/#rrggbb and rgb(r, g, b) stops.
 */

interface Hsl { h: number; s: number; l: number }

function parseColor(input: string): [number, number, number] {
  const hex = input.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = input.trim().match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  throw new Error(`Unsupported color: "${input}" (use #rrggbb or rgb(r, g, b))`);
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
