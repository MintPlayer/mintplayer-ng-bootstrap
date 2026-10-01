export * from './components';

// Re-export core types for convenience
export type {
  ViewType,
  SchedulerEvent,
  SchedulerEventPart,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  TimeSlot,
  PreviewEvent,
} from '@mintplayer/web-components/scheduler-core';
export {
  generateEventId,
  generateResourceId,
  generateGroupId,
} from '@mintplayer/web-components/scheduler-core';
