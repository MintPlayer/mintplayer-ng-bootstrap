import type { TimelineItem, TimelineOrientation, TimelineSide } from './timeline-item';

/** Context passed to per-item renderers / template outlets. */
export interface TimelineItemContext {
  /** Source index (position in the `items` array / document order). */
  index: number;
  /** Render order after `reverse` is applied. */
  visualIndex: number;
  /** First in render order. */
  isFirst: boolean;
  /** Last in render order — draws no trailing connector. */
  isLast: boolean;
  orientation: TimelineOrientation;
  /** Resolved side; may be provisional when `dir` is inherited at runtime. */
  side: TimelineSide;
}

/** Context passed to a connector renderer (the segment trailing item[index]). */
export interface TimelineConnectorContext {
  /** The connector trails item[index] toward item[index + 1]. */
  index: number;
  fromItem: TimelineItem;
  toItem: TimelineItem;
  orientation: TimelineOrientation;
}



/** `detail` of the `item-click` CustomEvent. */
export interface TimelineItemClickDetail {
  item: TimelineItem;
  index: number;
  originalEvent: Event;
}

/** `detail` of the `selection-change` CustomEvent. */
export interface TimelineSelectionChangeDetail {
  selected: TimelineItem[];
  added: TimelineItem[];
  removed: TimelineItem[];
}
