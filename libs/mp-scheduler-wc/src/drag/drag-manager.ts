import {
  SchedulerEvent,
  TimeSlot,
  generateEventId,
} from '@mintplayer/scheduler-core';
import { SchedulerStateManager } from '../state/scheduler-state';
import { DragStateMachine } from './drag-state-machine';
import {
  DragConfig,
  DEFAULT_DRAG_CONFIG,
  DragCompletionResult,
  PointerTarget,
  Position,
} from './drag-types';
import { NormalizedPointerEvent } from '../input/pointer-event';

/**
 * Callback for when a drag operation completes.
 */
export interface DragCompleteCallback {
  (result: DragCompletionResult, originalEvent: Event): void;
}

/**
 * Coordinates drag operations between the state machine and scheduler state.
 * Handles RAF scheduling for smooth drag updates.
 */
export class DragManager {
  private readonly stateMachine: DragStateMachine;
  private readonly stateManager: SchedulerStateManager;
  private readonly config: DragConfig;

  // RAF scheduling for smooth updates
  private pendingUpdate: number | null = null;
  private latestPointer: NormalizedPointerEvent | null = null;
  private getSlotAtPosition: ((x: number, y: number) => TimeSlot | null) | null = null;

  constructor(
    stateManager: SchedulerStateManager,
    config: Partial<DragConfig> = {}
  ) {
    this.stateManager = stateManager;
    this.config = { ...DEFAULT_DRAG_CONFIG, ...config };
    this.stateMachine = new DragStateMachine(this.config);
  }

  /**
   * Set the function used to get a slot at a position.
   * This must be set before handling pointer events.
   */
  setSlotResolver(resolver: (x: number, y: number) => TimeSlot | null): void {
    this.getSlotAtPosition = resolver;
  }

  /**
   * Handle pointer down - may start pending drag.
   * @param immediate If true, skip pending state (for touch-initiated drags)
   */
  handlePointerDown(
    pointer: NormalizedPointerEvent,
    target: PointerTarget,
    immediate = false
  ): void {
    const slot = this.getSlotAtPosition?.(pointer.clientX, pointer.clientY) ?? null;

    this.stateMachine.send({
      type: 'POINTER_DOWN',
      target,
      position: { x: pointer.clientX, y: pointer.clientY },
      slot,
      slotElement: target.slotElement,
      immediate,
    });

    // If we started a drag, update state manager
    if (this.stateMachine.isActive()) {
      this.syncToStateManager();
    }
  }

  /**
   * Handle pointer move - may activate drag or update preview.
   */
  handlePointerMove(pointer: NormalizedPointerEvent): void {
    console.log('[DragManager.handlePointerMove]', {
      isDragging: this.stateMachine.isDragging(),
      phase: this.stateMachine.getPhase(),
    });

    if (!this.stateMachine.isDragging()) {
      return;
    }

    // Store latest pointer for RAF callback
    this.latestPointer = pointer;

    // Schedule update if not already pending
    if (this.pendingUpdate === null) {
      this.pendingUpdate = requestAnimationFrame(() => {
        this.processPendingMove();
      });
    }
  }

  /**
   * Handle pointer up - finalize or cancel drag.
   * Returns the completion result if a drag was completed.
   */
  handlePointerUp(pointer: NormalizedPointerEvent): DragCompletionResult | null {
    // Cancel any pending RAF
    this.cancelPendingUpdate();

    this.stateMachine.send({
      type: 'POINTER_UP',
      position: { x: pointer.clientX, y: pointer.clientY },
    });

    // Get and consume the result
    const result = this.stateMachine.consumeResult();

    // Clear state manager drag state
    this.stateManager.endDrag();

    return result;
  }

  /**
   * Cancel any in-progress drag operation.
   */
  cancel(): void {
    this.cancelPendingUpdate();
    this.stateMachine.send({ type: 'CANCEL' });
    this.stateManager.endDrag();
  }

  /**
   * Check if a drag operation is in progress.
   */
  isActive(): boolean {
    return this.stateMachine.isActive();
  }

  /**
   * Check if waiting for drag threshold.
   */
  isPending(): boolean {
    return this.stateMachine.isPending();
  }

  /**
   * Check if in any drag-related state.
   */
  isDragging(): boolean {
    return this.stateMachine.isDragging();
  }

  /**
   * Get the current drag phase.
   */
  getPhase(): string {
    return this.stateMachine.getPhase();
  }

  /**
   * Reset the drag manager state.
   */
  reset(): void {
    this.cancelPendingUpdate();
    this.stateMachine.reset();
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.cancelPendingUpdate();
    this.latestPointer = null;
    this.getSlotAtPosition = null;
  }

  /**
   * Create a new event from a completed create drag.
   */
  createEventFromResult(result: DragCompletionResult): SchedulerEvent {
    return {
      id: generateEventId(),
      title: 'New Event',
      start: result.preview.start,
      end: result.preview.end,
      color: '#3788d8',
    };
  }

  /**
   * Update an event from a completed move/resize drag.
   */
  updateEventFromResult(
    result: DragCompletionResult,
    event: SchedulerEvent
  ): SchedulerEvent {
    return {
      ...event,
      start: result.preview.start,
      end: result.preview.end,
    };
  }

  /**
   * Process pending pointer move using RAF.
   */
  private processPendingMove(): void {
    this.pendingUpdate = null;

    const pointer = this.latestPointer;
    this.latestPointer = null;

    if (!pointer || !this.stateMachine.isDragging()) {
      return;
    }

    const slot = this.getSlotAtPosition?.(pointer.clientX, pointer.clientY) ?? null;

    const stateChanged = this.stateMachine.send({
      type: 'POINTER_MOVE',
      position: { x: pointer.clientX, y: pointer.clientY },
      slot,
    });

    // Sync to state manager if state changed
    if (stateChanged || this.stateMachine.isActive()) {
      this.syncToStateManager();
    }
  }

  /**
   * Sync state machine state to scheduler state manager.
   */
  private syncToStateManager(): void {
    const machineState = this.stateMachine.getState();

    if (machineState.phase === 'active') {
      // Update or start drag in state manager
      const currentState = this.stateManager.getState();

      if (currentState.dragState) {
        // Update existing drag
        this.stateManager.updateDrag(machineState.currentSlot, machineState.preview);
      } else {
        // Start new drag
        this.stateManager.startDrag({
          type: machineState.operationType,
          event: machineState.event,
          startSlot: machineState.startSlot,
          currentSlot: machineState.currentSlot,
          preview: machineState.preview,
          originalEvent: machineState.originalEvent,
        });
      }
    }
  }

  /**
   * Cancel any pending RAF update.
   */
  private cancelPendingUpdate(): void {
    if (this.pendingUpdate !== null) {
      cancelAnimationFrame(this.pendingUpdate);
      this.pendingUpdate = null;
    }
    this.latestPointer = null;
  }
}
