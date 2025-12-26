export * from './components';
export * from './scheduler.module';

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
