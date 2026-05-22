/**
 * Represents a scheduler event
 */
export interface SchedulerEvent {
  /** Unique identifier for the event */
  id: string;
  /** Event title displayed in the calendar */
  title: string;
  /** Start date and time */
  start: Date;
  /** End date and time */
  end: Date;
  /** Whether this is an all-day event */
  allDay?: boolean;
  /** Background color of the event */
  color?: string;
  /** Text color of the event */
  textColor?: string;
  /** ID of the resource this event belongs to */
  resourceId?: string;
  /** Whether the event can be edited */
  editable?: boolean;
  /** Whether the event can be dragged */
  draggable?: boolean;
  /** Whether the event can be resized */
  resizable?: boolean | { start: boolean; end: boolean };
  /** Additional CSS class names */
  classNames?: string[];
  /** Custom properties for extending event data */
  extendedProps?: Record<string, unknown>;
}

/**
 * Represents a part of an event that spans multiple days
 */
export interface SchedulerEventPart {
  /** Unique identifier for this part */
  id: string;
  /** Reference to the parent event */
  event: SchedulerEvent;
  /** Start of this part (may differ from event.start for multi-day events) */
  start: Date;
  /** End of this part (may be midnight for multi-day events) */
  end: Date;
  /** Whether this is the first day of the event */
  isStart: boolean;
  /** Whether this is the last day of the event */
  isEnd: boolean;
  /** Which day in the sequence (0-based) */
  dayIndex: number;
  /** Total number of days this event spans */
  totalDays: number;
}

/**
 * An event with its daily parts
 */
export interface SchedulerEventWithParts {
  /** The original event */
  event: SchedulerEvent;
  /** Array of daily parts */
  parts: SchedulerEventPart[];
}

/**
 * A preview event shown during drag operations
 */
export interface PreviewEvent {
  /** Start of the preview */
  start: Date;
  /** End of the preview */
  end: Date;
  /** Optional resource ID for resource-based views */
  resourceId?: string;
}

/**
 * A track/rail containing non-overlapping events
 */
export interface TimelineTrack {
  /** Track index (0 = first/leftmost track) */
  index: number;
  /** Events in this track (guaranteed non-overlapping) */
  events: SchedulerEvent[];
}

/**
 * Position information for rendering an event
 */
export interface EventPosition {
  /** Top position in pixels or percentage */
  top: number;
  /** Left position in pixels or percentage */
  left: number;
  /** Width in pixels or percentage */
  width: number;
  /** Height in pixels or percentage */
  height: number;
  /** Z-index for stacking */
  zIndex: number;
}

/**
 * Layout information for an event within its overlap group
 * Used for colspan-based positioning algorithm
 */
export interface EventLayoutInfo {
  /** Column index within the overlap group (0-based) */
  col: number;
  /** Number of columns this event can span */
  colspan: number;
  /** Total number of columns in the overlap group */
  columnCount: number;
}
