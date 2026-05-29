// Components (side-effect-register the custom elements on import)
export { MpTimeline } from './components';
export { MpTimelineItem } from './components';

// Styles (for custom styling extensions)
export { timelineStyles, timelineItemStyles } from './styles';

// Re-export core types + the side helper for convenience.
export type {
  TimelineItem,
  TimelineOrientation,
  TimelineAlign,
  TimelineSide,
  TimelineSelectable,
  TimelineItemContext,
  TimelineConnectorContext,
  ItemRenderer,
  ConnectorRenderer,
  TimelineItemClickDetail,
  TimelineSelectionChangeDetail,
} from '@mintplayer/web-components/timeline-core';
export { resolveSides } from '@mintplayer/web-components/timeline-core';
