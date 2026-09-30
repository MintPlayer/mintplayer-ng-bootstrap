import { DragOperationType, PreviewEvent, SchedulerEvent, TimeSlot } from '@mintplayer/web-components/scheduler-core';
import {
  DragMachineState,
  DragMachineEvent,
  DragConfig,
  DEFAULT_DRAG_CONFIG,
  DragCompletionResult,
  Position,
  PointerTarget,
} from './drag-types';
import { DragPreviewCalculator } from './drag-preview';
import { getPointerDistance } from '../input/pointer-event';

type PendingState = Extract<DragMachineState, { phase: 'pending' }>;
type ActiveState = Extract<DragMachineState, { phase: 'active' }>;

/**
 * Explicit state machine for drag operations.
 *
 * States:
 * - idle: No drag operation in progress
 * - pending: Pointer is down, waiting for movement to exceed threshold
 * - active: Drag is in progress, preview is being updated
 * - completing: Drag just finished, result is available
 *
 * Transitions:
 * - idle + POINTER_DOWN (on valid target) → pending
 * - pending + POINTER_MOVE (threshold exceeded) → active
 * - pending + POINTER_UP → idle (treated as click)
 * - pending + CANCEL → idle
 * - active + POINTER_MOVE → active (update preview)
 * - active + POINTER_UP → completing
 * - active + CANCEL → idle
 * - completing → idle (after result is consumed)
 */
export class DragStateMachine {
  private state: DragMachineState = { phase: 'idle' };
  private readonly config: DragConfig;
  private readonly previewCalculator: DragPreviewCalculator;

  constructor(config: Partial<DragConfig> = {}) {
    this.config = { ...DEFAULT_DRAG_CONFIG, ...config };
    this.previewCalculator = new DragPreviewCalculator(this.config);
  }

  /**
   * Get current state (read-only).
   */
  getState(): Readonly<DragMachineState> {
    return this.state;
  }

  /**
   * Get the current phase.
   */
  getPhase(): DragMachineState['phase'] {
    return this.state.phase;
  }

  /**
   * Check if drag is currently active.
   */
  isActive(): boolean {
    return this.state.phase === 'active';
  }

  /**
   * Check if drag is pending (waiting for threshold).
   */
  isPending(): boolean {
    return this.state.phase === 'pending';
  }

  /**
   * Check if in any drag-related state (pending or active).
   */
  isDragging(): boolean {
    return this.state.phase === 'pending' || this.state.phase === 'active';
  }

  /**
   * Get the preview event if in active state.
   */
  getPreview(): PreviewEvent | null {
    return this.state.phase === 'active' ? this.state.preview : null;
  }

  /**
   * Get the completion result if in completing state.
   */
  getCompletionResult(): DragCompletionResult | null {
    return this.state.phase === 'completing' ? this.state.result : null;
  }

  /**
   * Process an event and transition to new state.
   * Returns true if state changed.
   */
  send(event: DragMachineEvent): boolean {
    const previousPhase = this.state.phase;
    this.state = this.transition(event);
    return this.state.phase !== previousPhase;
  }

  /**
   * Reset to idle state.
   */
  reset(): void {
    this.state = { phase: 'idle' };
  }

  /**
   * Consume the completion result and return to idle.
   * Call this after handling a completed drag.
   */
  consumeResult(): DragCompletionResult | null {
    if (this.state.phase === 'completing') {
      const result = this.state.result;
      this.state = { phase: 'idle' };
      return result;
    }
    return null;
  }

  /**
   * Pure transition function.
   * Given current state and event, returns new state.
   */
  private transition(event: DragMachineEvent): DragMachineState {
    const state = this.state;
    switch (state.phase) {
      case 'idle':
        return this.transitionFromIdle(event);
      case 'pending':
        return this.transitionFromPending(state, event);
      case 'active':
        return this.transitionFromActive(state, event);
      case 'completing':
        return this.transitionFromCompleting(event);
    }
  }

  /**
   * Transitions from idle state.
   */
  private transitionFromIdle(event: DragMachineEvent): DragMachineState {
    if (event.type !== 'POINTER_DOWN') {
      return this.state;
    }

    const { target, position, slot, slotElement, immediate } = event;

    // Determine operation type from target
    const operationType = this.getOperationType(target);
    if (!operationType) {
      return this.state;
    }

    // Get the event being dragged (if any)
    const schedulerEvent = target.event ?? null;

    // Check if this event is draggable
    if (schedulerEvent && schedulerEvent.draggable === false) {
      return this.state;
    }

    // For touch-initiated drags, skip pending and go directly to active
    if (immediate) {
      // Without a slot under the pointer, synthesize one from the event's own
      // times. Valid for move AND both resize edges: the resize preview
      // clamps against the original event, so a whole-event slot yields an
      // unchanged initial preview, and startSlot only feeds the move-offset
      // math afterwards. (Create has no event, so it still needs a real slot.)
      let startSlot = slot;
      if (!startSlot && schedulerEvent) {
        startSlot = {
          start: schedulerEvent.start,
          end: schedulerEvent.end,
        };
      }

      if (startSlot) {
        const preview = this.previewCalculator.calculatePreview(
          operationType,
          startSlot,
          startSlot,
          schedulerEvent
        );

        if (preview) {
          return {
            phase: 'active',
            operationType,
            event: schedulerEvent,
            startSlot,
            currentSlot: startSlot,
            preview,
            originalEvent: schedulerEvent ?? undefined,
          };
        }
      }
    }

    return {
      phase: 'pending',
      operationType,
      event: schedulerEvent,
      startPosition: position,
      startSlot: slot,
      slotElement,
    };
  }

  /**
   * Transitions from pending state.
   */
  private transitionFromPending(state: PendingState, event: DragMachineEvent): DragMachineState {
    switch (event.type) {
      case 'POINTER_MOVE': {
        const distance = getPointerDistance(state.startPosition, event.position);

        if (distance < this.config.dragThreshold) {
          // Not enough movement, stay in pending
          return state;
        }

        // Threshold exceeded - activate drag
        return this.activateDrag(state, event.slot);
      }

      case 'POINTER_UP': {
        // Released before threshold - treat as click
        return {
          phase: 'completing',
          result: {
            type: state.operationType,
            preview: this.getInitialPreview(state),
            event: state.event,
            originalEvent: state.event ?? undefined,
            wasClick: true,
          },
        };
      }

      case 'CANCEL':
        return { phase: 'idle' };

      default:
        return state;
    }
  }

  /**
   * Transitions from active state.
   */
  private transitionFromActive(state: ActiveState, event: DragMachineEvent): DragMachineState {
    switch (event.type) {
      case 'POINTER_MOVE': {
        if (!event.slot) {
          // No valid slot under pointer, keep current state
          return state;
        }

        // Calculate new preview
        const preview = this.previewCalculator.calculatePreview(
          state.operationType,
          state.startSlot,
          event.slot,
          state.originalEvent ?? null
        );

        if (!preview) {
          return state;
        }

        return {
          ...state,
          currentSlot: event.slot,
          preview,
        };
      }

      case 'POINTER_UP': {
        return {
          phase: 'completing',
          result: {
            type: state.operationType,
            preview: state.preview,
            event: state.event,
            originalEvent: state.originalEvent,
            wasClick: false,
          },
        };
      }

      case 'CANCEL':
        return { phase: 'idle' };

      default:
        return state;
    }
  }

  /**
   * Transitions from completing state.
   */
  private transitionFromCompleting(event: DragMachineEvent): DragMachineState {
    // Any event from completing goes to idle
    // (The result should be consumed via consumeResult first)
    if (event.type === 'CANCEL' || event.type === 'POINTER_DOWN') {
      return { phase: 'idle' };
    }
    return this.state;
  }

  /**
   * Activate drag from pending state.
   */
  private activateDrag(state: PendingState, currentSlot: TimeSlot | null): DragMachineState {
    const startSlot = state.startSlot ?? currentSlot;
    if (!startSlot) {
      return { phase: 'idle' };
    }

    const slot = currentSlot ?? startSlot;

    // Calculate initial preview
    const preview = this.previewCalculator.calculatePreview(
      state.operationType,
      startSlot,
      slot,
      state.event
    );

    if (!preview) {
      return { phase: 'idle' };
    }

    return {
      phase: 'active',
      operationType: state.operationType,
      event: state.event,
      startSlot,
      currentSlot: slot,
      preview,
      originalEvent: state.event ?? undefined,
    };
  }

  /**
   * Get operation type from pointer target.
   */
  private getOperationType(target: PointerTarget): DragOperationType | null {
    switch (target.type) {
      case 'resize-handle':
        return target.resizeHandle === 'start' ? 'resize-start' : 'resize-end';
      case 'event':
        return 'move';
      case 'slot':
        return 'create';
      default:
        return null;
    }
  }

  /**
   * Get initial preview for a pending drag (used for click detection).
   */
  private getInitialPreview(state: PendingState): PreviewEvent {
    if (state.event) {
      return {
        start: state.event.start,
        end: state.event.end,
      };
    }

    if (state.startSlot) {
      return {
        start: state.startSlot.start,
        end: state.startSlot.end,
      };
    }

    return { start: new Date(), end: new Date() };
  }
}
