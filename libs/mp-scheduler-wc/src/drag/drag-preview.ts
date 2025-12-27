import {
  DragOperationType,
  PreviewEvent,
  SchedulerEvent,
  TimeSlot,
} from '@mintplayer/scheduler-core';
import { DragConfig, DEFAULT_DRAG_CONFIG } from './drag-types';

/**
 * Calculates preview positions for drag operations.
 * Handles create, move, and resize operations.
 */
export class DragPreviewCalculator {
  private readonly config: DragConfig;

  constructor(config: Partial<DragConfig> = {}) {
    this.config = { ...DEFAULT_DRAG_CONFIG, ...config };
  }

  /**
   * Calculate the preview event position based on drag state.
   *
   * @param type - The type of drag operation
   * @param startSlot - The slot where the drag started
   * @param currentSlot - The current slot under the pointer
   * @param originalEvent - The original event being moved/resized (null for create)
   * @returns The preview event with new start/end, or null if invalid
   */
  calculatePreview(
    type: DragOperationType,
    startSlot: TimeSlot,
    currentSlot: TimeSlot,
    originalEvent: SchedulerEvent | null
  ): PreviewEvent | null {
    switch (type) {
      case 'create':
        return this.calculateCreatePreview(startSlot, currentSlot);
      case 'move':
        return originalEvent
          ? this.calculateMovePreview(startSlot, currentSlot, originalEvent)
          : null;
      case 'resize-start':
        return originalEvent
          ? this.calculateResizeStartPreview(currentSlot, originalEvent)
          : null;
      case 'resize-end':
        return originalEvent
          ? this.calculateResizeEndPreview(currentSlot, originalEvent)
          : null;
      default:
        return null;
    }
  }

  /**
   * Calculate preview for creating a new event.
   * Extends selection from start slot to current slot.
   */
  private calculateCreatePreview(
    startSlot: TimeSlot,
    currentSlot: TimeSlot
  ): PreviewEvent {
    const start = new Date(
      Math.min(startSlot.start.getTime(), currentSlot.start.getTime())
    );
    const end = new Date(
      Math.max(startSlot.end.getTime(), currentSlot.end.getTime())
    );
    return { start, end };
  }

  /**
   * Calculate preview for moving an existing event.
   * Preserves event duration, applies offset from drag start.
   */
  private calculateMovePreview(
    startSlot: TimeSlot,
    currentSlot: TimeSlot,
    originalEvent: SchedulerEvent
  ): PreviewEvent {
    // Calculate how much the pointer has moved in time
    const offsetMs = currentSlot.start.getTime() - startSlot.start.getTime();

    // Preserve the original event duration
    const duration = originalEvent.end.getTime() - originalEvent.start.getTime();

    // Apply offset to original event position
    const newStart = new Date(originalEvent.start.getTime() + offsetMs);
    const newEnd = new Date(newStart.getTime() + duration);

    return { start: newStart, end: newEnd };
  }

  /**
   * Calculate preview for resizing event start.
   * Moves start time while keeping end fixed.
   * Enforces minimum duration.
   */
  private calculateResizeStartPreview(
    currentSlot: TimeSlot,
    originalEvent: SchedulerEvent
  ): PreviewEvent {
    // Calculate maximum allowed start time (end - min duration)
    const maxStart = originalEvent.end.getTime() - this.config.minDurationMs;

    // New start is the earlier of: current slot start, or max allowed start
    const newStart = new Date(
      Math.min(currentSlot.start.getTime(), maxStart)
    );

    return { start: newStart, end: originalEvent.end };
  }

  /**
   * Calculate preview for resizing event end.
   * Moves end time while keeping start fixed.
   * Enforces minimum duration.
   */
  private calculateResizeEndPreview(
    currentSlot: TimeSlot,
    originalEvent: SchedulerEvent
  ): PreviewEvent {
    // Calculate minimum allowed end time (start + min duration)
    const minEnd = originalEvent.start.getTime() + this.config.minDurationMs;

    // New end is the later of: current slot end, or min allowed end
    const newEnd = new Date(
      Math.max(currentSlot.end.getTime(), minEnd)
    );

    return { start: originalEvent.start, end: newEnd };
  }
}
