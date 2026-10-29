/** Text colour on a pastel band. */
export const BAND_TEXT_DARK = '#262626';
/** Text colour on a saturated band. */
export const BAND_TEXT_LIGHT = '#FFFFFF';

/**
 * Expand a CSS hex colour (3, 4, 6 or 8 digits, leading `#` optional) to its
 * six RGB digits, or null when it is not one. The alpha digits of the 4- and
 * 8-digit forms are dropped: the band's contrast is judged on its hue.
 */
function toRgbHex(color: string): string | null {
  const hex = color.trim().replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  if (hex.length === 3 || hex.length === 4) {
    return [...hex.slice(0, 3)].map((digit) => digit + digit).join('');
  }
  if (hex.length === 6 || hex.length === 8) return hex.slice(0, 6);
  return null;
}

/**
 * Office-faithful contrast rule for a contextual tab set's band: dark text on
 * pastel bands, white text on saturated ones, by W3C relative luminance with a
 * 0.6 cutoff. A colour that is not hex falls back to dark (the safe default).
 */
export function bandTextColor(background: string): string {
  const rgb = toRgbHex(background);
  if (!rgb) return BAND_TEXT_DARK;
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(rgb.slice(offset, offset + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance >= 0.6 ? BAND_TEXT_DARK : BAND_TEXT_LIGHT;
}
