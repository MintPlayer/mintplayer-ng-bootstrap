/**
 * Label fitting for chart nodes — pure arithmetic, no text measurement (jsdom
 * has neither SVG geometry APIs nor a 2D canvas context). Char advance is
 * estimated at 0.6 x font-size; extreme strings ("iiii" vs "WWWW") misjudge by
 * a few characters at worst, and the failure mode is a slightly early
 * truncation or suppression — never overflow into a neighbouring node.
 *
 * All geometry is in device px: the caller converts from layout units using
 * its rendered size, so the same font-size threshold holds at every host size.
 */

export type ArcLabelOrientation = 'radial' | 'tangential';

export interface ArcLabelFit {
  visible: boolean;
  /** The (possibly ellipsis-truncated) text to render; '' when not visible. */
  text: string;
  /** The orientation that fits more characters (tangential wins ties). */
  orientation: ArcLabelOrientation;
}

const CHAR_WIDTH = 0.6; // advance estimate per character, in font-size units
const LINE_HEIGHT = 1.2; // cross-axis room one line of text needs
const PADDING = 8; // px kept free along the text axis, both ends combined
const MIN_CHARS = 4; // below this even a truncated label is noise
const ELLIPSIS = '…';

const HIDDEN: ArcLabelFit = { visible: false, text: '', orientation: 'tangential' };

const fitText = (name: string, maxChars: number, orientation: ArcLabelOrientation): ArcLabelFit => {
  if (!name.length || maxChars < MIN_CHARS) return HIDDEN;
  if (maxChars >= name.length) return { visible: true, text: name, orientation };
  return { visible: true, text: name.slice(0, maxChars - 1) + ELLIPSIS, orientation };
};

/**
 * Fit a label into an annular sector. Radial text runs along the radius
 * (advance limited by ring thickness, line height by the arc length at the
 * label radius); tangential text runs along the chord (advance limited by
 * chord and arc length, line height by ring thickness). Returns whichever
 * orientation places more characters.
 */
export function fitArcLabel(
  name: string,
  sweepRad: number,
  r0Px: number,
  r1Px: number,
  fontPx: number,
): ArcLabelFit {
  const ring = r1Px - r0Px;
  const rMid = (r0Px + r1Px) / 2;
  if (ring <= 0 || sweepRad <= 0 || fontPx <= 0) return HIDDEN;
  const arcLen = rMid * sweepRad;
  const charW = CHAR_WIDTH * fontPx;
  const lineH = LINE_HEIGHT * fontPx;
  const radialChars = arcLen >= lineH ? Math.floor((ring - PADDING) / charW) : 0;
  const chord = 2 * rMid * Math.sin(Math.min(sweepRad, Math.PI) / 2);
  const tangentialChars = ring >= lineH ? Math.floor((Math.min(arcLen, chord) - PADDING) / charW) : 0;
  return tangentialChars >= radialChars
    ? fitText(name, tangentialChars, 'tangential')
    : fitText(name, radialChars, 'radial');
}

/**
 * Fit gate for a cartesian cell (icicle/treemap). Truncation is left to the
 * cell's CSS ellipsis; this only decides whether a label is worth rendering.
 */
export function fitCellLabel(widthPx: number, heightPx: number, fontPx: number): boolean {
  return heightPx >= 1.4 * fontPx && widthPx - PADDING >= 3 * CHAR_WIDTH * fontPx;
}
