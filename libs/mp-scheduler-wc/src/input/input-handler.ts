import { SchedulerEvent, TimeSlot } from '@mintplayer/scheduler-core';
import {
  NormalizedPointerEvent,
  normalizeMouseEvent,
  normalizeTouchEvent,
  getPointerDistance,
} from './pointer-event';
import { PointerTarget } from '../drag/drag-types';

/**
 * Callbacks for input handler events.
 */
export interface InputHandlerCallbacks {
  /** Called when pointer goes down on a valid target */
  onPointerDown: (pointer: NormalizedPointerEvent, target: PointerTarget, immediate?: boolean) => void;
  /** Called when pointer moves (during drag) */
  onPointerMove: (pointer: NormalizedPointerEvent) => void;
  /** Called when pointer is released */
  onPointerUp: (pointer: NormalizedPointerEvent) => void;
  /** Called for click events (not drag) */
  onClick: (pointer: NormalizedPointerEvent, target: PointerTarget) => void;
  /** Called for double-click events */
  onDoubleClick: (pointer: NormalizedPointerEvent, target: PointerTarget) => void;
  /** Called when touch drag mode is activated (after hold) */
  onTouchDragActivated?: () => void;
  /** Called when touch drag mode is deactivated */
  onTouchDragDeactivated?: () => void;
}

/**
 * Configuration for the input handler.
 */
export interface InputHandlerConfig {
  /** Shadow root to attach listeners to */
  shadowRoot: ShadowRoot;
  /** Function to get event by ID */
  getEventById: (id: string) => SchedulerEvent | null;
  /** Whether editing is enabled */
  isEditable: () => boolean;
  /** Whether selection is enabled */
  isSelectable: () => boolean;
  /** Touch hold duration in ms before drag activates (default: 500) */
  touchHoldDuration?: number;
  /** Movement threshold before touch hold is cancelled (default: 10) */
  touchMoveThreshold?: number;
}

const DEFAULT_TOUCH_HOLD_DURATION = 500;
const DEFAULT_TOUCH_MOVE_THRESHOLD = 10;

/**
 * Unified input handler for mouse and touch events.
 * Normalizes events and handles touch-specific behaviors (hold-to-drag).
 */
export class InputHandler {
  private readonly config: InputHandlerConfig;
  private readonly callbacks: InputHandlerCallbacks;

  // Touch-specific state
  private touchHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private touchStartPosition: { x: number; y: number } | null = null;
  private isTouchDragMode = false;
  private touchHoldTarget: HTMLElement | null = null;
  private touchHoldPointer: NormalizedPointerEvent | null = null;

  // Bound event handlers
  private readonly boundHandleMouseDown: (e: MouseEvent) => void;
  private readonly boundHandleMouseMove: (e: MouseEvent) => void;
  private readonly boundHandleMouseUp: (e: MouseEvent) => void;
  private readonly boundHandleClick: (e: MouseEvent) => void;
  private readonly boundHandleDblClick: (e: MouseEvent) => void;
  private readonly boundHandleTouchStart: (e: TouchEvent) => void;
  private readonly boundHandleTouchMove: (e: TouchEvent) => void;
  private readonly boundHandleTouchEnd: (e: TouchEvent) => void;
  private readonly boundHandleTouchCancel: (e: TouchEvent) => void;

  constructor(config: InputHandlerConfig, callbacks: InputHandlerCallbacks) {
    this.config = config;
    this.callbacks = callbacks;

    // Bind handlers
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleDblClick = this.handleDblClick.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundHandleTouchCancel = this.handleTouchCancel.bind(this);
  }

  /**
   * Attach all event listeners.
   */
  attach(): void {
    const root = this.config.shadowRoot as unknown as HTMLElement;

    root.addEventListener('mousedown', this.boundHandleMouseDown as EventListener);
    document.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('mouseup', this.boundHandleMouseUp);
    root.addEventListener('click', this.boundHandleClick as EventListener);
    root.addEventListener('dblclick', this.boundHandleDblClick as EventListener);

    root.addEventListener('touchstart', this.boundHandleTouchStart as EventListener, {
      passive: false,
    });
    root.addEventListener('touchmove', this.boundHandleTouchMove as EventListener, {
      passive: false,
    });
    root.addEventListener('touchend', this.boundHandleTouchEnd as EventListener);
    root.addEventListener('touchcancel', this.boundHandleTouchCancel as EventListener);
  }

  /**
   * Detach all event listeners.
   */
  detach(): void {
    const root = this.config.shadowRoot as unknown as HTMLElement;

    root.removeEventListener('mousedown', this.boundHandleMouseDown as EventListener);
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);
    root.removeEventListener('click', this.boundHandleClick as EventListener);
    root.removeEventListener('dblclick', this.boundHandleDblClick as EventListener);

    root.removeEventListener('touchstart', this.boundHandleTouchStart as EventListener);
    root.removeEventListener('touchmove', this.boundHandleTouchMove as EventListener);
    root.removeEventListener('touchend', this.boundHandleTouchEnd as EventListener);
    root.removeEventListener('touchcancel', this.boundHandleTouchCancel as EventListener);

    this.cancelTouchHold();
  }

  /**
   * Check if in touch drag mode.
   */
  isInTouchDragMode(): boolean {
    return this.isTouchDragMode;
  }

  /**
   * Analyze pointer target to determine what was clicked.
   */
  analyzeTarget(element: HTMLElement): PointerTarget {
    // Check for resize handle first
    const resizeHandle = element.closest('.resize-handle') as HTMLElement;
    if (resizeHandle) {
      const eventEl = resizeHandle.closest('.scheduler-event') as HTMLElement;
      const eventId = eventEl?.dataset['eventId'];
      const event = eventId ? this.config.getEventById(eventId) : null;

      if (event) {
        return {
          type: 'resize-handle',
          event,
          resizeHandle: resizeHandle.dataset['handle'] as 'start' | 'end',
        };
      }
    }

    // Check for event
    const eventEl = element.closest('.scheduler-event:not(.preview)') as HTMLElement;
    if (eventEl) {
      const eventId = eventEl.dataset['eventId'];
      const event = eventId ? this.config.getEventById(eventId) : null;

      if (event) {
        return { type: 'event', event };
      }
    }

    // Check for slot
    const slotEl = element.closest(
      '.scheduler-time-slot, .scheduler-timeline-slot'
    ) as HTMLElement;
    if (slotEl) {
      return { type: 'slot', slotElement: slotEl };
    }

    return { type: 'none' };
  }

  // Mouse event handlers

  private handleMouseDown(e: MouseEvent): void {
    if (!this.config.isEditable()) return;

    const pointer = normalizeMouseEvent(e);
    const target = this.analyzeTarget(pointer.target);

    // Only handle drag-initiating targets
    if (target.type === 'none') return;

    // Check if selectable for slots
    if (target.type === 'slot' && !this.config.isSelectable()) return;

    e.preventDefault();
    this.callbacks.onPointerDown(pointer, target);
  }

  private handleMouseMove(e: MouseEvent): void {
    const pointer = normalizeMouseEvent(e);
    this.callbacks.onPointerMove(pointer);
  }

  private handleMouseUp(e: MouseEvent): void {
    const pointer = normalizeMouseEvent(e);
    this.callbacks.onPointerUp(pointer);
  }

  private handleClick(e: MouseEvent): void {
    const pointer = normalizeMouseEvent(e);
    const target = this.analyzeTarget(pointer.target);

    // Skip event clicks - handled by drag manager
    if (target.type === 'event' || target.type === 'resize-handle') {
      return;
    }

    this.callbacks.onClick(pointer, target);
  }

  private handleDblClick(e: MouseEvent): void {
    const pointer = normalizeMouseEvent(e);
    const target = this.analyzeTarget(pointer.target);
    this.callbacks.onDoubleClick(pointer, target);
  }

  // Touch event handlers

  private handleTouchStart(e: TouchEvent): void {
    if (!this.config.isEditable()) return;

    // Only handle single touch
    if (e.touches.length !== 1) {
      this.cancelTouchHold();
      return;
    }

    const pointer = normalizeTouchEvent(e);
    if (!pointer) return;

    const target = this.analyzeTarget(pointer.target);

    // Only handle drag-initiating targets
    if (target.type === 'none') return;
    if (target.type === 'slot' && !this.config.isSelectable()) return;

    this.touchStartPosition = { x: pointer.clientX, y: pointer.clientY };
    this.touchHoldTarget = pointer.target;
    this.touchHoldPointer = pointer;

    // Add element-level listener IMMEDIATELY for event touches
    // CRITICAL: Use e.target (the actual touched element) not pointer.target
    // In shadow DOM, touch.target and e.target can differ due to event retargeting.
    // Only the listener on e.target will continue to receive events after DOM replacement
    // (e.g., when Lit re-renders and replaces the element).
    if (target.type === 'event' || target.type === 'resize-handle') {
      const self = this;
      const touchedElement = e.target as HTMLElement;

      // Add listener directly to the touched element - this is the ONLY listener
      // that will work after the element is replaced during re-render
      touchedElement.addEventListener('touchmove', function(evt: TouchEvent) {
        self.handleTouchMove(evt);
      }, { passive: false });

      touchedElement.addEventListener('touchend', function(evt: TouchEvent) {
        self.handleTouchEnd(evt);
      });

      touchedElement.addEventListener('touchcancel', function(evt: TouchEvent) {
        self.handleTouchCancel(evt);
      });
    }

    // Add visual feedback
    this.addTouchFeedback(pointer.target, 'pending');

    // Start hold timer
    const holdDuration =
      this.config.touchHoldDuration ?? DEFAULT_TOUCH_HOLD_DURATION;

    this.touchHoldTimer = setTimeout(() => {
      this.activateTouchDragMode(pointer, target);
    }, holdDuration);
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1) {
      this.cancelTouchHold();
      return;
    }

    const pointer = normalizeTouchEvent(e);
    if (!pointer) return;

    // If we have a pending touch hold, check if user moved too much
    if (this.touchHoldTimer && this.touchStartPosition) {
      const threshold =
        this.config.touchMoveThreshold ?? DEFAULT_TOUCH_MOVE_THRESHOLD;
      const distance = getPointerDistance(this.touchStartPosition, {
        x: pointer.clientX,
        y: pointer.clientY,
      });

      if (distance > threshold) {
        // User moved too much, cancel hold and allow scroll
        this.cancelTouchHold();
        return;
      }

      // Still waiting for hold - prevent scroll while waiting
      // This is critical: we must prevent the browser from starting scroll
      // intervention during the hold period, otherwise it will take over
      // and subsequent touchmove events become non-cancelable
      e.preventDefault();
      return;
    }

    // If in touch drag mode, handle the drag
    if (this.isTouchDragMode) {
      e.preventDefault();
      this.callbacks.onPointerMove(pointer);
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    const pointer = normalizeTouchEvent(e);

    // If we had a pending hold that never activated, treat as tap
    if (this.touchHoldTimer) {
      this.cancelTouchHold();

      if (pointer && this.touchHoldTarget) {
        const target = this.analyzeTarget(this.touchHoldTarget);
        this.callbacks.onClick(pointer, target);
      }

      this.touchHoldTarget = null;
      this.touchHoldPointer = null;
      return;
    }

    // If in touch drag mode, finalize
    if (this.isTouchDragMode && pointer) {
      this.callbacks.onPointerUp(pointer);
      this.exitTouchDragMode();
    }
  }

  private handleTouchCancel(_e: TouchEvent): void {
    this.cancelTouchHold();

    if (this.isTouchDragMode) {
      // Notify pointer up to cancel the drag
      if (this.touchStartPosition) {
        this.callbacks.onPointerUp({
          pointerId: 0,
          pointerType: 'touch',
          clientX: this.touchStartPosition.x,
          clientY: this.touchStartPosition.y,
          originalEvent: _e,
          target: this.touchHoldTarget ?? document.body,
          isPrimary: true,
        });
      }
      this.exitTouchDragMode();
    }
  }

  // Touch helpers

  private activateTouchDragMode(
    pointer: NormalizedPointerEvent,
    target: PointerTarget
  ): void {
    this.touchHoldTimer = null;
    this.touchStartPosition = null; // Clear so touchmove doesn't think we're still pending

    // Trigger haptic feedback
    this.triggerHapticFeedback();

    // Enter touch drag mode
    this.isTouchDragMode = true;

    // Document listeners were already added in handleTouchStart for event touches
    // For slot touches, add them now
    if (!this.touchHoldTarget?.closest('.scheduler-event')) {
      document.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
      document.addEventListener('touchend', this.boundHandleTouchEnd);
      document.addEventListener('touchcancel', this.boundHandleTouchCancel);
    }

    // Update visual feedback
    if (this.touchHoldTarget) {
      this.removeTouchFeedback(this.touchHoldTarget, 'pending');
      this.addTouchFeedback(this.touchHoldTarget, 'active');
    }

    // Add container class
    const container = this.config.shadowRoot.querySelector('.scheduler-container');
    container?.classList.add('touch-drag-mode');

    // Notify callback
    this.callbacks.onTouchDragActivated?.();

    // Start the drag immediately (skip pending threshold for touch)
    this.callbacks.onPointerDown(pointer, target, true);
  }

  private cancelTouchHold(): void {
    if (this.touchHoldTimer) {
      clearTimeout(this.touchHoldTimer);
      this.touchHoldTimer = null;
    }

    // Remove document listeners that were added in handleTouchStart
    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('touchend', this.boundHandleTouchEnd);
    document.removeEventListener('touchcancel', this.boundHandleTouchCancel);

    // Remove pending visual feedback
    if (this.touchHoldTarget) {
      this.removeTouchFeedback(this.touchHoldTarget, 'pending');
      this.removeTouchFeedback(this.touchHoldTarget, 'active');
    }

    this.touchStartPosition = null;
  }

  private exitTouchDragMode(): void {
    this.isTouchDragMode = false;
    this.touchStartPosition = null;
    this.touchHoldTarget = null;
    this.touchHoldPointer = null;

    // Remove document-level listeners added during drag mode
    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('touchend', this.boundHandleTouchEnd);
    document.removeEventListener('touchcancel', this.boundHandleTouchCancel);

    // Remove container class
    const container = this.config.shadowRoot.querySelector('.scheduler-container');
    container?.classList.remove('touch-drag-mode');

    // Remove all feedback classes
    this.config.shadowRoot
      .querySelectorAll('.touch-hold-active, .touch-hold-pending')
      .forEach((el) => {
        el.classList.remove('touch-hold-active', 'touch-hold-pending');
      });

    // Notify callback
    this.callbacks.onTouchDragDeactivated?.();
  }

  private addTouchFeedback(
    element: HTMLElement,
    type: 'pending' | 'active'
  ): void {
    const targetEl = element.closest(
      '.scheduler-event, .scheduler-time-slot, .scheduler-timeline-slot'
    );
    targetEl?.classList.add(`touch-hold-${type}`);
  }

  private removeTouchFeedback(
    element: HTMLElement,
    type: 'pending' | 'active'
  ): void {
    const targetEl = element.closest(
      '.scheduler-event, .scheduler-time-slot, .scheduler-timeline-slot'
    );
    targetEl?.classList.remove(`touch-hold-${type}`);
  }

  private triggerHapticFeedback(): void {
    // Vibration API removed - can cause issues on some devices
  }
}
