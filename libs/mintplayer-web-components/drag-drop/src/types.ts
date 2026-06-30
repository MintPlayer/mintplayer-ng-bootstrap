/**
 * Reordering axis. `'both'` (the default) is reading-order aware — it handles a
 * wrapping flex layout (e.g. chips) where items flow horizontally and wrap onto
 * new rows. `'horizontal'` / `'vertical'` constrain the drop-index resolution to
 * a single dimension for strict single-row / single-column lists.
 */
export type SortAxis = 'horizontal' | 'vertical' | 'both';

/**
 * Result of a completed reorder. Indices are CDK-compatible: both are positions
 * in the *current* array, and `currentIndex` is the final resting index of the
 * moved item after removal+reinsertion (so `moveItemInArray(arr, previousIndex,
 * currentIndex)` reproduces the new order).
 */
export interface SortDropEvent {
  previousIndex: number;
  currentIndex: number;
}

/**
 * Configuration for {@link SortableController}. The controller never owns the
 * data: it reports a single `onDrop` and leaves the host to mutate its own model
 * (via {@link moveItemInArray}) and re-render.
 */
export interface SortableOptions<T> {
  /** Current item order, read fresh at drag start. Must match the DOM order of `[data-sortable-id]` elements. */
  items: () => readonly T[];
  /** Stable id for an item; matched against each draggable element's `data-sortable-id`. */
  itemId: (item: T) => string;
  /** Called once when a drag/keyboard move resolves to a new order. */
  onDrop: (event: SortDropEvent) => void;
  /** Reading-order model for drop-index resolution. Default `'both'`. */
  axis?: SortAxis;
  /**
   * CSS selector for a drag handle *within* an item. When set, a pointer drag
   * starts only if the pointerdown landed inside a matching element. Unset =
   * the whole item is the handle.
   */
  handleSelector?: string;
  /** Pointer movement (px) before a mouse/pen drag begins. Default 5. */
  dragThresholdPx?: number;
  /** Touch long-press (ms) before a touch drag arms. Default 600. */
  longPressMs?: number;
  /** Movement (px) during the touch long-press window that aborts the drag (treated as a scroll/scrub). Default 10. */
  touchSlopPx?: number;
  /** When it returns true, all gestures are ignored. */
  disabled?: () => boolean;
  /** Optional human label for an item, used in keyboard-reorder announcements. Falls back to the element's text. */
  label?: (item: T) => string;
  /** Optional sink for accessibility announcements (wire to a live-region announcer). */
  announce?: (message: string) => void;
}
