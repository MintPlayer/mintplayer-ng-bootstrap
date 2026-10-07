/** Narrowest width, in px, a column can be resized to — by pointer or by keyboard. */
export const MIN_COLUMN_WIDTH = 40;

/** Width change, in px, of one ArrowLeft/ArrowRight press on a resize handle. */
export const KEYBOARD_RESIZE_STEP = 10;

/**
 * The width a column takes after being resized by `delta` px from
 * `startWidth`, clamped to the shared floor. One function for both input
 * paths, so a pointer drag and a keyboard press can never disagree about the
 * floor.
 */
export function resizedColumnWidth(startWidth: number, delta: number): number {
  return Math.max(MIN_COLUMN_WIDTH, startWidth + delta);
}

/**
 * Movement, in px, below which a press on a resize handle is a TAP: it opens
 * the resize options instead of resizing. Without it a finger, which never
 * lands perfectly still, would nudge the column on every tap.
 */
export const RESIZE_TAP_SLOP = 4;

/**
 * The width that shows the widest of `contentWidths` (each already including
 * its cell's padding) without an ellipsis. Rounded UP, unlike the initial
 * measurement: here a sub-pixel short would clip the very content the user
 * asked to see, and the column was explicitly sized, so overflowing the
 * scroller is the requested outcome rather than a phantom scrollbar.
 */
export function fittedColumnWidth(contentWidths: readonly number[]): number | null {
  const widest = Math.max(0, ...contentWidths.filter((w) => Number.isFinite(w)));
  return widest > 0 ? Math.max(MIN_COLUMN_WIDTH, Math.ceil(widest)) : null;
}
