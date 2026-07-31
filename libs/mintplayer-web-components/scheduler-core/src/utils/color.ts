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
