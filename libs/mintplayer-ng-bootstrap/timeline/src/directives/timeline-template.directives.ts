import { Directive, inject, TemplateRef } from '@angular/core';
import type { TimelineItem, TimelineOrientation, TimelineSide } from '@mintplayer/web-components/timeline-core';

/**
 * Context for the per-item template directives. The `$implicit` is the item, so
 * `*bsTimelineContent="let item"` binds the item; named context vars expose the
 * resolved layout state.
 */
export interface BsTimelineItemContext {
  $implicit: TimelineItem;
  /** Position in the items array. */
  index: number;
  /** Position in the rendered order (differs from index under reverse). */
  visualIndex: number;
  isFirst: boolean;
  isLast: boolean;
  orientation: TimelineOrientation;
  side: TimelineSide;
}

/** Context for the connector template (the segment trailing this item). */
export interface BsTimelineConnectorContext {
  /** The item the connector trails. */
  $implicit: TimelineItem;
  /** The next item (undefined for the last). */
  toItem?: TimelineItem;
  index: number;
  orientation: TimelineOrientation;
}

/** Custom bullet / marker template. */
@Directive({ selector: '[bsTimelineMarker]' })
export class BsTimelineMarkerDirective {
  readonly templateRef = inject<TemplateRef<BsTimelineItemContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTimelineMarkerDirective,
    ctx: unknown,
  ): ctx is BsTimelineItemContext {
    return true;
  }
}

/** Custom title template. */
@Directive({ selector: '[bsTimelineTitle]' })
export class BsTimelineTitleDirective {
  readonly templateRef = inject<TemplateRef<BsTimelineItemContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTimelineTitleDirective,
    ctx: unknown,
  ): ctx is BsTimelineItemContext {
    return true;
  }
}

/** Custom timestamp template (rendered in the opposite region). */
@Directive({ selector: '[bsTimelineTimestamp]' })
export class BsTimelineTimestampDirective {
  readonly templateRef = inject<TemplateRef<BsTimelineItemContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTimelineTimestampDirective,
    ctx: unknown,
  ): ctx is BsTimelineItemContext {
    return true;
  }
}

/** Custom content / body template. */
@Directive({ selector: '[bsTimelineContent]' })
export class BsTimelineContentDirective {
  readonly templateRef = inject<TemplateRef<BsTimelineItemContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTimelineContentDirective,
    ctx: unknown,
  ): ctx is BsTimelineItemContext {
    return true;
  }
}

/** Custom opposite-region template. */
@Directive({ selector: '[bsTimelineOpposite]' })
export class BsTimelineOppositeDirective {
  readonly templateRef = inject<TemplateRef<BsTimelineItemContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTimelineOppositeDirective,
    ctx: unknown,
  ): ctx is BsTimelineItemContext {
    return true;
  }
}

/** Custom connector template. */
@Directive({ selector: '[bsTimelineConnector]' })
export class BsTimelineConnectorDirective {
  readonly templateRef = inject<TemplateRef<BsTimelineConnectorContext>>(TemplateRef);
  static ngTemplateContextGuard(
    _d: BsTimelineConnectorDirective,
    ctx: unknown,
  ): ctx is BsTimelineConnectorContext {
    return true;
  }
}
