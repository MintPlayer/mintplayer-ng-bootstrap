/**
 * Default colors for events
 */
export const DEFAULT_COLORS = [
  '#3788d8', // Blue
  '#28a745', // Green
  '#dc3545', // Red
  '#ffc107', // Yellow
  '#17a2b8', // Cyan
  '#6f42c1', // Purple
  '#fd7e14', // Orange
  '#20c997', // Teal
  '#e83e8c', // Pink
  '#6c757d', // Gray
];

/**
 * Get a color by index (cycles through default colors)
 */
export function getColorByIndex(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

/**
 * Calculate contrasting text color (black or white) for a background
 */
export function getContrastColor(backgroundColor: string): string {
  // Convert hex to RGB
  let hex = backgroundColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Parse `#rgb` / `#rrggbb` into channels, or `null` when it is anything else.
 *
 * Returning null rather than black matters: a caller handed `rgb(…)`, a named
 * colour or a CSS variable should fall back to its own neutral surface, not
 * render a chip that silently claims the colour is black.
 */
function parseHex(color: string): { r: number; g: number; b: number } | null {
  const raw = color.trim().replace('#', '');
  const hex = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/** WCAG 2.x relative luminance — sRGB channels linearized, then weighted. */
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two relative luminances, 1:1 to 21:1. */
function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Black or white — whichever actually scores the higher WCAG contrast ratio
 * against `background`. `null` when the colour cannot be parsed.
 *
 * Distinct from {@link getContrastColor}, which computes YIQ *perceived
 * brightness* against a 0.5 threshold. YIQ is a reasonable approximation for
 * decorative text and is what every event label in the scheduler already uses,
 * but it is not the WCAG formula and can pick the losing foreground on mid-tone
 * backgrounds. Use this one wherever the result carries meaning a user must be
 * able to read — an interactive control's glyph, say — and leave the existing
 * callers alone: switching them would recolour every event label in all five
 * views, which deserves its own visual review rather than a drive-by.
 */
export function getReadableTextColor(background: string): string | null {
  const rgb = parseHex(background);
  if (!rgb) return null;

  const luminance = relativeLuminance(rgb);
  const onWhite = contrastRatio(luminance, 1);
  const onBlack = contrastRatio(luminance, 0);
  return onBlack >= onWhite ? '#000000' : '#ffffff';
}

/**
 * The WCAG contrast ratio between a hex colour and black or white, so callers
 * (and tests) can assert a threshold rather than trust a branch.
 */
export function contrastRatioWith(background: string, foreground: string): number | null {
  const bg = parseHex(background);
  const fg = parseHex(foreground);
  if (!bg || !fg) return null;
  return contrastRatio(relativeLuminance(bg), relativeLuminance(fg));
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(color: string, percent: number): string {
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
  const newG = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
  const newB = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(color: string, percent: number): string {
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.max(0, Math.round(r * (1 - percent / 100)));
  const newG = Math.max(0, Math.round(g * (1 - percent / 100)));
  const newB = Math.max(0, Math.round(b * (1 - percent / 100)));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Add alpha (opacity) to a color
 */
export function addAlpha(color: string, alpha: number): string {
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Fallback event colour when neither the event nor its resource specifies one. */
export const DEFAULT_EVENT_COLOR = '#3788d8';

/**
 * Resolve an event's fill colour.
 *
 * Precedence — event → resource → component default — matches the universal
 * convention (FullCalendar, Bryntum, Syncfusion, DevExtreme, Mobiscroll, MUI X all
 * agree), and applying a resource's colour in NON-resource views is documented
 * practice rather than an invention.
 *
 * `Resource.eventColor` is the event fill and `Resource.color` the row-header tint
 * (mirroring `ResourceGroup.color`, whose contract is the group header), but we
 * fall back `eventColor ?? color` so a consumer who sets only one still gets
 * sensible behaviour. Both fields had existed in the model read by nothing.
 */
export function resolveEventColor(
  event: { color?: string; resourceId?: string },
  resourceById: Map<string, { color?: string; eventColor?: string }>,
  defaultColor: string = DEFAULT_EVENT_COLOR,
): string {
  if (event.color) return event.color;
  const resource = event.resourceId ? resourceById.get(event.resourceId) : undefined;
  return resource?.eventColor ?? resource?.color ?? defaultColor;
}
