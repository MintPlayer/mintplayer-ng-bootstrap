export * from './components';

// Re-export core types for convenience
export {
  ViewType,
  SchedulerEvent,
  SchedulerEventPart,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  TimeSlot,
  PreviewEvent,
  generateEventId,
  generateResourceId,
  generateGroupId,
} from '@mintplayer/scheduler-core';
