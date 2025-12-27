# Scheduler Drag/Drop Fix - Product Requirements Document

## Problem Statement

The scheduler web component (`<mp-scheduler>`) has fundamental issues with drag-and-drop operations, particularly on touch devices. Events cannot be reliably moved or resized during drag operations due to flawed event handling and slot detection mechanisms.

---

## Root Cause Analysis

### Issue 1: Shadow DOM Event Boundary

The scheduler renders in Shadow DOM, which creates an encapsulation boundary. Touch events originating inside the shadow root may not propagate correctly to window-level listeners on some browsers/devices.

**Current Implementation:**
```typescript
// touchstart on shadow root
root.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
// touchmove/end on window
window.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false, capture: true });
```

**Problem:** While `capture: true` helps intercept events early, there are edge cases where:
- The touch target reference becomes stale
- Browser gesture recognition interferes before our handlers fire
- Shadow DOM re-targeting changes the touch target unexpectedly

### Issue 2: Hit-Testing Based Slot Detection

The current `getSlotAtPosition()` relies on `elementsFromPoint()` to find slots:

```typescript
private getSlotAtPosition(clientX: number, clientY: number): TimeSlot | null {
  // Temporarily hide dragged event
  if (draggedEventEl) {
    draggedEventEl.style.pointerEvents = 'none';
  }

  // Hit-test to find slot element
  const slotEl = this.shadow.elementsFromPoint(clientX, clientY)
    .find((el) => el.matches('.scheduler-time-slot, .scheduler-timeline-slot'));

  return slotEl ? this.getSlotFromElement(slotEl) : null;
}
```

**Problems:**
1. Other elements (preview event, tooltips, overlays) may block hit-testing
2. Touch coordinates may be slightly outside slot boundaries
3. Shadow DOM `elementsFromPoint` behavior varies across browsers
4. Setting `pointerEvents = 'none'` doesn't always work during active touch sequences
5. Returns `null` when no slot found, causing drag to "freeze" at lines 1326-1331:
   ```typescript
   if (!slot) {
     this.debugLog('no slot at position');
     return;  // Drag stops updating!
   }
   ```

### Issue 3: Event Listener Inconsistency

Mouse and touch events are handled differently:

| Event Type | Listener Target | Issues |
|------------|-----------------|--------|
| `mousedown` | shadow root | Correct |
| `mousemove` | `document` | Works but inconsistent with touch |
| `mouseup` | `document` | Works but inconsistent with touch |
| `touchstart` | shadow root | Correct |
| `touchmove` | `window` | May not receive events reliably |
| `touchend` | `window` | May not receive events reliably |

### Issue 4: No Fallback for Failed Slot Detection

When `getSlotAtPosition()` returns `null` during `handleTouchMove`, the handler simply returns without updating the drag position. This causes the event to appear "stuck" even though the user is actively dragging.

---

## Requirements

### FR1: Coordinate-Based Slot Detection

**FR1.1:** Implement slot detection using mathematical coordinate calculation instead of DOM hit-testing.

```typescript
private getSlotAtPosition(clientX: number, clientY: number): TimeSlot | null {
  // Get the grid container's bounding rect
  const gridRect = this.getGridBoundingRect();

  // Calculate relative position within grid
  const relativeX = clientX - gridRect.left + this.scrollLeft;
  const relativeY = clientY - gridRect.top + this.scrollTop;

  // Calculate which day column (for week/day views)
  const dayIndex = this.calculateDayIndex(relativeX, gridRect.width);

  // Calculate which time slot (for time-based views)
  const slotIndex = this.calculateSlotIndex(relativeY);

  // Convert indices to actual Date objects
  return this.indicesToTimeSlot(dayIndex, slotIndex);
}
```

**FR1.2:** Store grid geometry on render and update on resize:
- Column widths (for each day)
- Row heights (for each time slot)
- Scroll offsets
- Header heights

**FR1.3:** The coordinate calculation must work for all view types:
- Week view: 7 columns, N time rows
- Day view: 1 column, N time rows
- Timeline view: N resource rows, time on X-axis
- Month view: 7 columns, 6 week rows

### FR2: Unified Window-Level Event Handling

**FR2.1:** All drag-related events (mouse and touch) must be handled at the `window` level with `capture: true`:

```typescript
private attachEventListeners(): void {
  // Only mousedown/touchstart on the component itself
  this.addEventListener('mousedown', this.boundHandlePointerDown);
  this.addEventListener('touchstart', this.boundHandlePointerDown, { passive: false });

  // All move/up/end events on window with capture
  window.addEventListener('mousemove', this.boundHandlePointerMove, { capture: true });
  window.addEventListener('mouseup', this.boundHandlePointerUp, { capture: true });
  window.addEventListener('touchmove', this.boundHandlePointerMove, { passive: false, capture: true });
  window.addEventListener('touchend', this.boundHandlePointerUp, { capture: true });
  window.addEventListener('touchcancel', this.boundHandlePointerCancel, { capture: true });
}
```

**FR2.2:** Unify mouse and touch handling into a single "pointer" abstraction:

```typescript
interface PointerInfo {
  clientX: number;
  clientY: number;
  pointerId: number;  // touch.identifier or 0 for mouse
  type: 'mouse' | 'touch';
}

private extractPointer(e: MouseEvent | TouchEvent): PointerInfo | null {
  if (e instanceof MouseEvent) {
    return { clientX: e.clientX, clientY: e.clientY, pointerId: 0, type: 'mouse' };
  }
  if (e instanceof TouchEvent && e.touches.length === 1) {
    const touch = e.touches[0];
    return { clientX: touch.clientX, clientY: touch.clientY, pointerId: touch.identifier, type: 'touch' };
  }
  return null;
}
```

### FR3: Robust Drag State Management

**FR3.1:** Never silently fail during drag operations. If slot detection fails, use fallback strategies:

```typescript
private handlePointerMove(e: MouseEvent | TouchEvent): void {
  if (!this.dragState) return;

  const pointer = this.extractPointer(e);
  if (!pointer) return;

  // Primary: coordinate-based calculation
  let slot = this.getSlotFromCoordinates(pointer.clientX, pointer.clientY);

  // Fallback 1: Calculate from drag delta
  if (!slot) {
    slot = this.calculateSlotFromDelta(pointer, this.dragState);
  }

  // Fallback 2: Use last known good slot
  if (!slot) {
    slot = this.dragState.lastValidSlot;
  }

  // Only update if we have a valid slot
  if (slot) {
    this.dragState.lastValidSlot = slot;
    this.updateDragPreview(slot);
  }

  // Always prevent default during active drag
  e.preventDefault();
}
```

**FR3.2:** Track the last valid slot position and use it as fallback when detection fails.

**FR3.3:** Calculate slot from movement delta when direct detection fails:

```typescript
private calculateSlotFromDelta(pointer: PointerInfo, dragState: DragState): TimeSlot | null {
  const deltaX = pointer.clientX - dragState.startPointer.clientX;
  const deltaY = pointer.clientY - dragState.startPointer.clientY;

  // Convert pixel delta to time delta based on grid geometry
  const timeDeltaMs = this.pixelsToMilliseconds(deltaY);
  const dayDelta = this.pixelsToDays(deltaX);

  // Apply delta to original event position
  const newStart = new Date(dragState.originalEvent.start.getTime() + timeDeltaMs + dayDelta * 86400000);
  const newEnd = new Date(dragState.originalEvent.end.getTime() + timeDeltaMs + dayDelta * 86400000);

  // Snap to slot boundaries
  return this.snapToSlotBoundaries({ start: newStart, end: newEnd });
}
```

### FR4: Grid Geometry Caching

**FR4.1:** Cache grid geometry to avoid layout thrashing during drag:

```typescript
interface GridGeometry {
  containerRect: DOMRect;
  columnWidth: number;
  rowHeight: number;
  headerHeight: number;
  timeGutterWidth: number;
  scrollLeft: number;
  scrollTop: number;
  slotDurationMs: number;
  dayStartMs: number;  // milliseconds from midnight
  visibleDays: Date[];
}

private gridGeometry: GridGeometry | null = null;

private cacheGridGeometry(): void {
  const container = this.shadow.querySelector('.scheduler-grid');
  const firstSlot = this.shadow.querySelector('.scheduler-time-slot');

  this.gridGeometry = {
    containerRect: container.getBoundingClientRect(),
    columnWidth: this.calculateColumnWidth(),
    rowHeight: firstSlot?.getBoundingClientRect().height ?? 40,
    // ... etc
  };
}
```

**FR4.2:** Invalidate geometry cache on:
- Window resize
- View change
- Scroll (update scroll offsets only)
- Container resize (ResizeObserver)

**FR4.3:** Refresh geometry at the start of each drag operation.

### FR5: Prevent Default Handling

**FR5.1:** During an active drag operation, always call `preventDefault()` on touch events to prevent:
- Browser scroll
- Pull-to-refresh
- Browser back/forward gestures
- Text selection

**FR5.2:** Use `touch-action: none` CSS on draggable elements during drag:

```typescript
private startDrag(): void {
  document.body.style.touchAction = 'none';
  this.style.touchAction = 'none';
}

private endDrag(): void {
  document.body.style.touchAction = '';
  this.style.touchAction = '';
}
```

### FR6: Debug Mode Improvements

**FR6.1:** Add comprehensive debug logging that shows:
- Coordinate values (clientX/Y, relative positions)
- Calculated slot indices
- Grid geometry values
- Fallback strategy used
- Event type and phase

**FR6.2:** Debug panel should show real-time coordinate-to-slot mapping.

---

## Technical Design

### TD1: Coordinate System

```
┌─────────────────────────────────────────────────────────────┐
│ Scheduler Container (position: relative)                     │
├─────────────┬───────────────────────────────────────────────┤
│             │        Day Columns                             │
│  Time       ├─────────┬─────────┬─────────┬─────────┬──...  │
│  Gutter     │  Mon    │  Tue    │  Wed    │  Thu    │       │
│  (60px)     │ (col 0) │ (col 1) │ (col 2) │ (col 3) │       │
├─────────────┼─────────┼─────────┼─────────┼─────────┼──...  │
│  8:00       │  slot   │  slot   │  slot   │  slot   │       │
│  (row 0)    │ [0,0]   │ [1,0]   │ [2,0]   │ [3,0]   │       │
├─────────────┼─────────┼─────────┼─────────┼─────────┼──...  │
│  8:30       │  slot   │  slot   │  slot   │  slot   │       │
│  (row 1)    │ [0,1]   │ [1,1]   │ [2,1]   │ [3,1]   │       │
├─────────────┼─────────┼─────────┼─────────┼─────────┼──...  │
│  9:00       │  slot   │  slot   │  slot   │  slot   │       │
│  (row 2)    │ [0,2]   │ [1,2]   │ [2,2]   │ [3,2]   │       │
└─────────────┴─────────┴─────────┴─────────┴─────────┴───────┘

Coordinate Calculation:
- clientX/Y from event
- Subtract container's bounding rect (left, top)
- Add scroll offset (scrollLeft, scrollTop)
- Divide by column width / row height
- Result: [colIndex, rowIndex]
- Map to Date: visibleDays[colIndex] + (rowIndex * slotDurationMs)
```

### TD2: View-Specific Geometry

#### Week/Day View
```typescript
getSlotFromCoordinates(clientX: number, clientY: number): TimeSlot {
  const { containerRect, columnWidth, rowHeight, timeGutterWidth,
          scrollTop, slotDurationMs, dayStartMs, visibleDays } = this.gridGeometry;

  // Relative position within scrollable content
  const relX = clientX - containerRect.left - timeGutterWidth;
  const relY = clientY - containerRect.top + scrollTop;

  // Calculate indices
  const colIndex = Math.floor(relX / columnWidth);
  const rowIndex = Math.floor(relY / rowHeight);

  // Clamp to valid range
  const clampedCol = Math.max(0, Math.min(colIndex, visibleDays.length - 1));
  const clampedRow = Math.max(0, rowIndex);

  // Convert to Date
  const day = visibleDays[clampedCol];
  const startMs = dayStartMs + (clampedRow * slotDurationMs);
  const start = new Date(day.getTime() + startMs);
  const end = new Date(start.getTime() + slotDurationMs);

  return { start, end };
}
```

#### Timeline View
```typescript
getSlotFromCoordinates(clientX: number, clientY: number): TimeSlot {
  const { containerRect, rowHeight, resourceHeaderWidth,
          scrollLeft, scrollTop, timeScale, resources } = this.gridGeometry;

  // Relative position
  const relX = clientX - containerRect.left - resourceHeaderWidth + scrollLeft;
  const relY = clientY - containerRect.top + scrollTop;

  // Calculate resource index (row)
  const resourceIndex = Math.floor(relY / rowHeight);
  const resource = resources[Math.min(resourceIndex, resources.length - 1)];

  // Calculate time from X position
  const timeMs = this.xPositionToTime(relX, timeScale);
  const snappedTime = this.snapToSlot(timeMs);

  return {
    start: new Date(snappedTime),
    end: new Date(snappedTime + this.slotDurationMs),
    resourceId: resource?.id
  };
}
```

### TD3: Drag State Structure

```typescript
interface DragState {
  type: 'move' | 'resize-start' | 'resize-end' | 'create';
  event: SchedulerEvent | null;
  originalEvent: SchedulerEvent | null;  // Immutable copy

  // Pointer tracking
  startPointer: PointerInfo;
  currentPointer: PointerInfo;
  pointerId: number;

  // Slot tracking
  startSlot: TimeSlot;
  currentSlot: TimeSlot;
  lastValidSlot: TimeSlot;

  // Preview
  preview: PreviewEvent;

  // Touch-specific
  isTouchDrag: boolean;
  holdActivated: boolean;  // For touch hold-to-drag
}
```

---

## Implementation Phases

### Phase 1: Geometry System
1. Create `GridGeometry` interface and caching mechanism
2. Implement coordinate-to-slot calculation for week view
3. Add ResizeObserver for geometry invalidation
4. Unit tests for coordinate calculations

### Phase 2: Unified Pointer Handling
1. Create `PointerInfo` abstraction
2. Unify mouse and touch handlers into single code path
3. Move all move/up/end listeners to window with capture
4. Add pointer ID tracking for multi-touch rejection

### Phase 3: Robust Slot Detection
1. Replace `elementsFromPoint` with coordinate calculation
2. Implement delta-based fallback calculation
3. Add last-valid-slot tracking
4. Remove early returns on null slot detection

### Phase 4: View-Specific Implementations
1. Day view coordinate calculation
2. Timeline view coordinate calculation
3. Month view coordinate calculation
4. Handle view transitions during drag (cancel drag)

### Phase 5: Testing & Polish
1. Test on real iOS devices (Safari)
2. Test on real Android devices (Chrome)
3. Test with browser DevTools touch simulation
4. Performance profiling during drag operations
5. Debug panel improvements

---

## Testing Requirements

### Device Testing Matrix

| Device | Browser | Priority |
|--------|---------|----------|
| iPhone (Safari) | iOS Safari | High |
| iPhone (Chrome) | iOS Chrome | High |
| iPad (Safari) | iPadOS Safari | High |
| Android Phone | Chrome | High |
| Android Tablet | Chrome | Medium |
| Desktop | Chrome | High |
| Desktop | Firefox | Medium |
| Desktop | Safari | Medium |

### Test Cases

1. **Basic drag move**: Touch-hold event, drag to new time slot, release
2. **Cross-day drag**: Drag event from Monday to Wednesday
3. **Resize start**: Touch-hold top handle, drag up/down
4. **Resize end**: Touch-hold bottom handle, drag up/down
5. **Create event**: Touch-hold empty slot, drag to create range
6. **Scroll during drag**: Start drag, scroll view, continue drag
7. **Edge boundaries**: Drag to edges of visible area
8. **Cancel drag**: Start drag, lift finger without moving
9. **Multi-touch rejection**: Start drag, add second finger
10. **Rapid interactions**: Quick successive drags

### Performance Benchmarks

- Drag start latency: < 100ms after hold threshold
- Drag update latency: < 16ms (60fps)
- Memory during drag: No significant increase
- No dropped frames during drag operations

---

## Success Criteria

1. Events can be reliably dragged on touch devices
2. No "stuck" events during drag operations
3. Consistent behavior between mouse and touch
4. Works in Shadow DOM environment
5. No regression in desktop mouse functionality
6. Debug mode provides useful diagnostic information

---

## Appendix: Current Code Locations

Files requiring modification:

| File | Changes Needed |
|------|----------------|
| `libs/mp-scheduler-wc/src/components/mp-scheduler.ts` | Main drag handling refactor |
| `libs/mp-scheduler-wc/src/state/scheduler-state.ts` | Add `lastValidSlot` to drag state |

Key methods to refactor:
- `attachEventListeners()` - Unify event binding
- `getSlotAtPosition()` - Replace with coordinate calculation
- `handleTouchMove()` - Merge with mouse handling
- `handleMouseMove()` - Merge with touch handling
- `startDragFromTouch()` - Merge with mouse drag start
- `startDrag()` - Merge with touch drag start
