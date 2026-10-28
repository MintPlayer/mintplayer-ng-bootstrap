import type { TimelineAlign, TimelineSide } from './models/timeline-item';

/**
 * Resolve the logical side (`start` / `end`) of every item, indexed by SOURCE
 * order. The single source of truth consumed by both `<mp-timeline>` and the
 * framework wrappers so they never disagree under `reverse` + `alternate`.
 *
 * `reverse` only changes each item's *visual* index (and therefore its
 * alternate parity); it never reorders the source list. The returned sides are
 * logical and dir-agnostic — mapping `start`/`end` to physical left/right is a
 * CSS concern handled per `dir`.
 */
export function resolveSides(
  count: number,
  align: TimelineAlign,
  reverse: boolean,
): TimelineSide[] {
  return Array.from({ length: Math.max(0, count) }, (_unused, sourceIndex) => {
    const visualIndex = reverse ? count - 1 - sourceIndex : sourceIndex;
    return sideFor(align, visualIndex);
  });
}

function sideFor(align: TimelineAlign, visualIndex: number): TimelineSide {
  switch (align) {
    case 'start':
      return 'start';
    case 'end':
      return 'end';
    case 'alternate':
      return visualIndex % 2 === 0 ? 'start' : 'end';
    case 'alternate-reverse':
      return visualIndex % 2 === 0 ? 'end' : 'start';
    default:
      // Defensive fallback for an unsanitized align reaching the core helper
      // directly (the WC sanitizes via VALID_ALIGN, but resolveSides is also
      // exported and called by the framework wrappers with raw input).
      return 'start';
  }
}
