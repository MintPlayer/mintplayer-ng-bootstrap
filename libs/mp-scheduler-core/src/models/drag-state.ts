import { SchedulerEvent, PreviewEvent } from './event';
import { Resource } from './resource';
import { TimeSlot } from './time-slot';
import { DragOperationType } from './types';

/**
 * State of a drag operation
 */
export interface DragState {
  /** Type of drag operation */
  type: DragOperationType;
  /** Event being dragged (null for create operations) */
  event: SchedulerEvent | null;
  /** Starting time slot */
  startSlot: TimeSlot;
  /** Current time slot (updated during drag) */
  currentSlot: TimeSlot;
  /** Preview event showing where the event will be placed */
  preview: PreviewEvent;
  /** Resource being dragged to (for resource views) */
  resource?: Resource;
  /** Original event data (for reverting on cancel) */
  originalEvent?: SchedulerEvent;
  /** Metadata for the drag operation */
  meta?: {
    /** For resize: which end is being resized */
    resizeHandle?: 'start' | 'end';
    /** Offset from event start when drag began */
    offsetMs?: number;
  };
}

/**
 * Result of a completed drag operation
 */
export interface DragResult {
  /** Type of operation that was completed */
  type: DragOperationType;
  /** The event that was created or modified */
  event: SchedulerEvent;
  /** The previous event state (for move/resize) */
  previousEvent?: SchedulerEvent;
  /** Whether the operation was cancelled */
  cancelled: boolean;
}
