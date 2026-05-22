import { HslColor } from './interfaces/hsl-color';
import { HsvColor } from './interfaces/hsv-color';
import { RgbColor } from './interfaces/rgb-color';
/**
 * Single source of truth for color-space conversions used by the picker.
 *
 * Conventions across this module:
 *   - hue is in degrees [0, 360)
 *   - saturation, lightness, value, alpha are in [0, 1]
 *   - r, g, b are in [0, 255] (integer on the way out, real-valued internally)
 *   - hex is "#RRGGBB" — three-digit "#RGB" is accepted on parse only
 */

const TWO_PI = Math.PI * 2;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

const HEX6_RE = /^[0-9a-fA-F]{6}$/;
const BLACK: RgbColor = { r: 0, g: 0, b: 0 };

export function hex2rgb(hex: string): RgbColor {
    const stripped = hex.startsWith('#') ? hex.slice(1) : hex;
    const expanded = stripped.length === 3
        ? stripped.split('').map(c => c + c).join('')
        : stripped;
    if (!HEX6_RE.test(expanded)) return { ...BLACK };
    return {
        r: parseInt(expanded.slice(0, 2), 16),
        g: parseInt(expanded.slice(2, 4), 16),
        b: parseInt(expanded.slice(4, 6), 16),
    };
}

export function rgb2hex(rgb: RgbColor): string {
    const r = clamp255(rgb.r);
    const g = clamp255(rgb.g);
    const b = clamp255(rgb.b);
    return '#' + ((r << 16) + (g << 8) + b).toString(16).padStart(6, '0');
}

export function rgb2hsv(rgb: RgbColor): HsvColor {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    const value = max;
    const saturation = max === 0 ? 0 : d / max;
    const hue = d === 0 ? 0 : hueFromRgb(r, g, b, max, d);

    return { hue, saturation, value };
}

export function hsv2rgb(hsv: HsvColor): RgbColor {
    const s = clamp01(hsv.saturation);
    const v = clamp01(hsv.value);
    const h = ((hsv.hue % 360) + 360) % 360;

    const c = v * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    const m = v - c;

    let r1 = 0, g1 = 0, b1 = 0;
    if (hp < 1) { r1 = c; g1 = x; }
    else if (hp < 2) { r1 = x; g1 = c; }
    else if (hp < 3) { g1 = c; b1 = x; }
    else if (hp < 4) { g1 = x; b1 = c; }
    else if (hp < 5) { r1 = x; b1 = c; }
    else { r1 = c; b1 = x; }

    return {
        r: (r1 + m) * 255,
        g: (g1 + m) * 255,
        b: (b1 + m) * 255,
    };
}

export function rgb2hsl(rgb: RgbColor): HslColor {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    const luminosity = (max + min) / 2;
    const saturation = d === 0
        ? 0
        : d / (1 - Math.abs(2 * luminosity - 1));
    const hue = d === 0 ? 0 : hueFromRgb(r, g, b, max, d);

    return { hue, saturation, luminosity };
}

export function hsl2rgb(hsl: HslColor): RgbColor {
    return hsv2rgb(hsl2hsv(hsl));
}

export function hsv2hsl(hsv: HsvColor): HslColor {
    const v = clamp01(hsv.value);
    const s = clamp01(hsv.saturation);
    const luminosity = v * (1 - s / 2);
    const denom = Math.min(luminosity, 1 - luminosity);
    const saturation = denom === 0 ? 0 : (v - luminosity) / denom;
    return { hue: hsv.hue, saturation, luminosity };
}

export function hsl2hsv(hsl: HslColor): HsvColor {
    const l = clamp01(hsl.luminosity);
    const s = clamp01(hsl.saturation);
    const value = l + s * Math.min(l, 1 - l);
    const saturation = value === 0 ? 0 : 2 * (1 - l / value);
    return { hue: hsl.hue, saturation, value };
}

export function hex2hsv(hex: string): HsvColor {
    return rgb2hsv(hex2rgb(hex));
}

export function hsv2hex(hsv: HsvColor): string {
    return rgb2hex(hsv2rgb(hsv));
}

/** Polar position (cx, cy) on a disc of radius R → HSV (hue, saturation). */
export function polar2hs(dx: number, dy: number, radius: number): { hue: number; saturation: number } {
    const r = Math.sqrt(dx * dx + dy * dy);
    const saturation = clamp01(r / radius);
    let hue = (Math.atan2(dy, dx) * 360) / TWO_PI;
    if (hue < 0) hue += 360;
    return { hue, saturation };
}

/** Inverse of polar2hs. Hue in degrees, saturation in [0, 1] → (dx, dy) on a disc of given radius. */
export function hs2polar(hue: number, saturation: number, radius: number): { dx: number; dy: number } {
    const theta = (hue * TWO_PI) / 360;
    const r = clamp01(saturation) * radius;
    return { dx: r * Math.cos(theta), dy: r * Math.sin(theta) };
}

function hueFromRgb(r: number, g: number, b: number, max: number, d: number): number {
    let h: number;
    switch (max) {
        case r: h = ((g - b) / d) % 6; break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
    return h;
}
