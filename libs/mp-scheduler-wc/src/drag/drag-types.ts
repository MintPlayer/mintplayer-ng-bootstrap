import {
  DragOperationType,
  PreviewEvent,
  SchedulerEvent,
  TimeSlot,
} from '@mintplayer/scheduler-core';

/**
 * Simple position with x/y coordinates.
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Result of analyzing what element the pointer is over.
 */
export interface PointerTarget {
  /** Type of target element */
  type: 'event' | 'resize-handle' | 'slot' | 'none';
  /** The scheduler event if pointer is over an event */
  event?: SchedulerEvent;
  /** The slot element if pointer is over a slot */
  slotElement?: HTMLElement;
  /** The resize handle type if pointer is over a resize handle */
  resizeHandle?: 'start' | 'end';
}

/**
 * Drag operation phases - explicit state machine states.
 *
 * - idle: No drag operation in progress
 * - pending: Pointer down, waiting for movement to exceed threshold
 * - active: Drag in progress, preview is being updated
 * - completing: Pointer up, finalizing the operation
 */
export type DragPhase = 'idle' | 'pending' | 'active' | 'completing';

/**
 * State machine state with discriminated union.
 * The `phase` field determines which other fields are valid.
 */
export type DragMachineState =
  | { phase: 'idle' }
  | {
      phase: 'pending';
      operationType: DragOperationType;
      event: SchedulerEvent | null;
      startPosition: Position;
      startSlot: TimeSlot | null;
      slotElement?: HTMLElement;
    }
  | {
      phase: 'active';
      operationType: DragOperationType;
      event: SchedulerEvent | null;
      startSlot: TimeSlot;
      currentSlot: TimeSlot;
      preview: PreviewEvent;
      originalEvent?: SchedulerEvent;
    }
  | {
      phase: 'completing';
      result: DragCompletionResult;
    };

/**
 * Result of a completed drag operation.
 */
export interface DragCompletionResult {
  /** Type of operation that was completed */
  type: DragOperationType;
  /** The final preview (new event position) */
  preview: PreviewEvent;
  /** The event that was moved/resized (null for create) */
  event: SchedulerEvent | null;
  /** Original event before modification */
  originalEvent?: SchedulerEvent;
  /** Whether this was a click (no actual drag occurred) */
  wasClick: boolean;
}

/**
 * Events that can trigger state transitions in the drag state machine.
 */
export type DragMachineEvent =
  | {
      type: 'POINTER_DOWN';
      target: PointerTarget;
      position: Position;
      slot: TimeSlot | null;
      slotElement?: HTMLElement;
    }
  | {
      type: 'POINTER_MOVE';
      position: Position;
      slot: TimeSlot | null;
    }
  | {
      type: 'POINTER_UP';
      position: Position;
    }
  | {
      type: 'CANCEL';
    };

/**
 * Configuration for the drag state machine.
 */
export interface DragConfig {
  /** Pixels of movement before drag activates (default: 5) */
  dragThreshold: number;
  /** Minimum event duration in milliseconds (default: 30 minutes) */
  minDurationMs: number;
}

/**
 * Default drag configuration.
 */
export const DEFAULT_DRAG_CONFIG: DragConfig = {
  dragThreshold: 5,
  minDurationMs: 30 * 60 * 1000, // 30 minutes
};
