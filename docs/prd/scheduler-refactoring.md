# PRD: Scheduler Web Component Refactoring

## Overview

Refactor the `mp-scheduler` web component to improve code organization and make it more AI-interpretable. The current 1286-line monolithic component will be broken into smaller, focused modules with clear responsibilities.

## Problem Statement

The current scheduler implementation has several issues that make it difficult for AI assistants to understand and modify:

1. **Monolithic component**: `mp-scheduler.ts` is 1286 lines with mixed concerns
2. **Overlapping drag state systems**: Three separate state systems track drag operations:
   - `pendingDrag` (component instance state)
   - `dragState` (managed state via SchedulerStateManager)
   - `previewEvent` (duplicates `dragState.preview`)
3. **Code duplication**: Mouse handlers (~170 lines) and touch handlers (~315 lines) duplicate similar logic
4. **Implicit state transitions**: Drag state changes are scattered throughout handlers

## Goals

1. **Improve AI comprehension**: Each file should be 100-200 lines instead of 1286
2. **Single responsibility**: Each class/module does one thing
3. **Explicit state machine**: Make drag state transitions clear and testable
4. **Eliminate duplication**: Unify mouse and touch handling through abstraction
5. **Maintain public API**: No breaking changes to existing consumers

## Non-Goals

- Performance optimization (beyond what comes naturally from refactoring)
- Adding new features
- Changing the visual appearance
- Modifying the view layer implementation

## Technical Design

### New File Structure

```
libs/mp-scheduler-wc/src/
  components/
    mp-scheduler.ts          # ~300 lines - Thin orchestrator
  state/
    scheduler-state.ts       # Existing - minor changes to unify drag state
  input/
    input-handler.ts         # Unified mouse/touch abstraction
    pointer-event.ts         # Normalized pointer event types
  drag/
    drag-manager.ts          # Drag orchestration
    drag-state-machine.ts    # Explicit state machine
    drag-state-machine.spec.ts  # Unit tests
    drag-preview.ts          # Preview calculation
    drag-types.ts            # Drag-specific types
  events/
    scheduler-event-emitter.ts  # Event dispatching
    event-types.ts           # Custom event definitions
  views/
    ... (unchanged)
```

### Key Interfaces

#### NormalizedPointerEvent
Abstracts mouse and touch events into a common interface:

```typescript
export interface NormalizedPointerEvent {
  pointerId: number;
  pointerType: 'mouse' | 'touch';
  clientX: number;
  clientY: number;
  originalEvent: MouseEvent | TouchEvent;
  target: HTMLElement;
  isPrimary: boolean;
}
```

#### DragMachineState
Explicit state machine with discriminated union:

```typescript
export type DragPhase = 'idle' | 'pending' | 'active' | 'completing';

export type DragMachineState =
  | { phase: 'idle' }
  | { phase: 'pending'; operationType: DragOperationType; event: SchedulerEvent | null; startPosition: Position; startSlot: TimeSlot | null }
  | { phase: 'active'; operationType: DragOperationType; event: SchedulerEvent | null; startSlot: TimeSlot; currentSlot: TimeSlot; preview: PreviewEvent; originalEvent?: SchedulerEvent }
  | { phase: 'completing'; result: DragResult };
```

#### PointerTarget
Result of analyzing what element the pointer is over:

```typescript
export interface PointerTarget {
  type: 'event' | 'resize-handle' | 'slot' | 'none';
  event?: SchedulerEvent;
  slotElement?: HTMLElement;
  resizeHandle?: 'start' | 'end';
}
```

### Component Responsibilities

| Component | Responsibility | Lines |
|-----------|---------------|-------|
| `mp-scheduler.ts` | Lifecycle, public API, view management | ~300 |
| `DragStateMachine` | State transitions, phase management | ~150 |
| `DragManager` | Coordinate drag operations with state | ~100 |
| `DragPreviewCalculator` | Calculate preview positions | ~80 |
| `InputHandler` | Normalize mouse/touch, hold-to-drag | ~200 |
| `SchedulerEventEmitter` | Dispatch custom events | ~50 |

### State Unification

Before:
```
pendingDrag (instance)     dragState (managed)     previewEvent (managed)
├── type                   ├── type                start
├── event                  ├── event               end
├── startX, startY         ├── startSlot
└── slotEl                 ├── currentSlot
                           ├── preview ─────────────────> DUPLICATE
                           └── originalEvent
```

After:
```
DragStateMachine           SchedulerState
├── phase                  └── dragState?.preview (for views)
├── operationType
├── event
├── startPosition/startSlot
├── currentSlot
├── preview
└── originalEvent
```

## Testing Strategy

### Unit Tests

- `drag-state-machine.spec.ts`: Test all state transitions
  - idle → pending (on pointer down)
  - pending → idle (pointer up before threshold)
  - pending → active (movement exceeds threshold)
  - active → completing (pointer up)
  - any → idle (cancel/escape)

### Manual Testing

- Mouse drag to create event
- Mouse drag to move event
- Mouse drag to resize event (start and end handles)
- Touch hold-to-drag flow
- Touch cancel behavior
- Escape key cancellation
- Multi-touch rejection

## Success Metrics

1. `mp-scheduler.ts` reduced from 1286 lines to ~300 lines
2. All existing tests pass
3. Manual testing confirms identical behavior
4. No breaking changes to public API

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Touch behavior regression | Comprehensive touch testing on mobile devices |
| RAF scheduling broken | Keep RAF logic in DragManager, test production build |
| State synchronization issues | Clear ownership - DragStateMachine owns drag state |
| Performance regression | State machine uses pure transitions, no extra renders |

## Implementation Order

1. Create type definition files (no risk)
2. Extract event emitter (low risk)
3. Extract drag preview calculator (low risk)
4. Implement drag state machine with tests (medium risk)
5. Extract drag manager (medium risk)
6. Implement unified input handler (higher risk)
7. Final integration in mp-scheduler.ts
