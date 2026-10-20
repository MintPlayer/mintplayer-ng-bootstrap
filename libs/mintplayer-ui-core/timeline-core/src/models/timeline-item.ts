/** Axis of the timeline line. */
export type TimelineOrientation = 'vertical' | 'horizontal';

/**
 * Which side of the line an item's content sits on.
 *  - `start` — left (vertical) / top (horizontal)
 *  - `end`   — the opposite physical side
 *  - `alternate` / `alternate-reverse` — zig-zag, the second starting from the
 *    other side.
 * Resolved per orientation and RTL-aware (physical mapping is a CSS concern;
 * the logical `start`/`end` names are dir-agnostic).
 */
export type TimelineAlign = 'start' | 'end' | 'alternate' | 'alternate-reverse';

/** Resolved logical side of a single item (after align + alternate + reverse). */
export type TimelineSide = 'start' | 'end';

/** Opt-in selection mode. `none` keeps the timeline presentational. */
export type TimelineSelectable = 'none' | 'single' | 'multiple';

/**
 * One event on the timeline. Typed but open — unknown extra fields pass
 * through untouched to custom templates via the item object.
 */
export interface TimelineItem {
  /**
   * Stable identity for selection + trackBy + event payloads. Falls back to
   * the source index. STRONGLY RECOMMENDED whenever the timeline is selectable
   * or reorderable.
   */
  id?: string | number;
  /** Default title text (used by the built-in row layout). */
  title?: string;
  /** Default body text / description. */
  description?: string;
  /** Timestamp; rendered in the opposite region by default. */
  time?: string | Date;
  /** Icon class for the default marker (e.g. a Bootstrap-icons class). */
  icon?: string;
  /** Accent color for the default marker + the trailing connector. */
  color?: string;
  /** Dims the item and skips selection/click. */
  disabled?: boolean;
  /** Extra class on the rendered row. */
  cssClass?: string;
  /** Free-form passthrough for custom templates. */
  [key: string]: unknown;
}
