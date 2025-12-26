// Main component
export { MpScheduler } from './components/mp-scheduler';

// State management
export { SchedulerStateManager, SchedulerState, createInitialState } from './state/scheduler-state';

// Views
export * from './views';

// Styles
export { schedulerStyles } from './styles/scheduler.styles';

// Re-export core types for convenience
export type {
  ViewType,
  DisplayMode,
  SchedulerEvent,
  SchedulerEventPart,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  TimeSlot,
  PreviewEvent,
  DragState,
} from '@mintplayer/scheduler-core';
