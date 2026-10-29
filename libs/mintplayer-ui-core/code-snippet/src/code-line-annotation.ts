/**
 * A marker attached to one rendered line.
 *
 * Deliberately coverage-agnostic: `kind` is an opaque string the consumer
 * chooses, exposed as a CSS part (`annotation-<kind>`) so the consumer styles
 * it from their own stylesheet. The component ships no built-in kinds and no
 * colours for them.
 *
 * The array is sparse by design — most lines of a file carry no annotation, so
 * this is keyed by line number rather than being one entry per rendered row.
 * Lines may also point BEYOND the extent of `code`: a coverage report for a
 * file whose source could not be fetched still renders a full gutter.
 */
export interface CodeLineAnnotation {
  /** 1-based, and compared against the rendered number (so it honours `start-line`). */
  line: number;
  /** Opaque category. Exposed as the CSS part `annotation-<kind>`. */
  kind?: string;
  /** Primary gutter label, e.g. a hit count `5×`. Rendered when present — including `0`. */
  label?: string;
  /** Second gutter label, e.g. a branch ratio `3/4`. */
  secondaryLabel?: string;
  /**
   * Long form of what the labels mean, e.g. `Branches: 3/4`. Becomes the row's
   * tooltip AND the text a screen reader hears for the line, because a colour
   * and a bare `3/4` are not an accessible substitute for either.
   */
  description?: string;
}
