export { BsTimelineComponent } from './timeline/timeline.component';
export {
  BsTimelineMarkerDirective,
  BsTimelineTitleDirective,
  BsTimelineTimestampDirective,
  BsTimelineContentDirective,
  BsTimelineOppositeDirective,
  BsTimelineConnectorDirective,
  BsTimelineItemContext,
  BsTimelineConnectorContext,
} from './directives/timeline-template.directives';

// Re-export core types + helper for convenience.
export type {
  TimelineItem,
  TimelineOrientation,
  TimelineAlign,
  TimelineSide,
  TimelineSelectable,
  TimelineItemContext,
  TimelineConnectorContext,
  TimelineItemClickDetail,
  TimelineSelectionChangeDetail,
} from '@mintplayer/web-components/timeline-core';
export { resolveSides } from '@mintplayer/web-components/timeline-core';
