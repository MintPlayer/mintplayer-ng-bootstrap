/**
 * Normalized pointer event that abstracts mouse vs touch.
 * Provides a single interface for all pointer-based interactions.
 */
export interface NormalizedPointerEvent {
  /** Unique identifier for this pointer (0 for mouse, touch.identifier for touch) */
  pointerId: number;
  /** Type of pointer: 'mouse' or 'touch' */
  pointerType: 'mouse' | 'touch';
  /** Client X coordinate */
  clientX: number;
  /** Client Y coordinate */
  clientY: number;
  /** The original DOM event */
  originalEvent: MouseEvent | TouchEvent;
  /** Target element at pointer position */
  target: HTMLElement;
  /** Whether this is the primary pointer */
  isPrimary: boolean;
}

/**
 * Create a normalized pointer event from a mouse event.
 */
export function normalizeMouseEvent(event: MouseEvent): NormalizedPointerEvent {
  return {
    pointerId: 0,
    pointerType: 'mouse',
    clientX: event.clientX,
    clientY: event.clientY,
    originalEvent: event,
    target: event.target as HTMLElement,
    isPrimary: true,
  };
}

/**
 * Create a normalized pointer event from a touch event.
 * Returns the first touch, or null if no touches.
 */
export function normalizeTouchEvent(event: TouchEvent): NormalizedPointerEvent | null {
  const touch = event.touches[0] || event.changedTouches[0];
  if (!touch) return null;

  return {
    pointerId: touch.identifier,
    pointerType: 'touch',
    clientX: touch.clientX,
    clientY: touch.clientY,
    originalEvent: event,
    target: touch.target as HTMLElement,
    isPrimary: touch.identifier === 0,
  };
}

/**
 * Calculate distance between two positions.
 */
export function getPointerDistance(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number }
): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
