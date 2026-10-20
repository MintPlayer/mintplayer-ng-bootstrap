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
} from '@mintplayer/ui-core/scheduler-core';
export {
  generateEventId,
  generateResourceId,
  generateGroupId,
} from '@mintplayer/ui-core/scheduler-core';
