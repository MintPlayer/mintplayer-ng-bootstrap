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
