# PRD: Scheduler Touch & Mouse Event Handling Fix

## Overview

The scheduler component needs to support consistent event creation and dragging behavior across desktop browsers (mouse events) and mobile browsers (touch events). This document outlines the requirements for implementing a unified interaction model.

## Goals

1. Unified interaction model for mouse and touch events
2. Reliable hit-testing during drag operations
3. Consistent behavior across desktop and mobile browsers
4. Maintain visual UX while enabling proper event detection

## Requirements

### 1. Event Binding Strategy

- **MouseUp/MouseMove events** should be bound to the `window` or shadow DOM root element (not individual elements)
- This ensures events are captured even when the pointer moves outside the original target element during drag operations
- For shadow DOM components, bind to the shadow root or use composed events appropriately

### 2. Mouse and Touch Event Parity

| Action | Mouse Events | Touch Events |
|--------|--------------|--------------|
| Start drag | `mousedown` | `touchstart` |
| During drag | `mousemove` | `touchmove` |
| End drag | `mouseup` | `touchend` |

- Both event types must produce identical behavior
- Touch events should extract coordinates from `event.touches[0]` or `event.changedTouches[0]`
- Prevent default touch behaviors (scrolling) when drag operation is active
- Touch hold duration for drag activation is **600ms**

### 2.1 Touch Pan Behavior

- A touch move that exceeds the movement threshold before hold activation should **pan the scheduler**
- Panning should scroll the scheduler content (not the page)

### 3. Hit-Testing with Transparent Overlay Timeslots

When hit-testing is required for determining which timeslot is being hovered during drag operations:

#### Implementation Approach

1. **On drag start:**
   - Create transparent timeslot overlay elements
   - Position them exactly matching the normally-visible timeslots
   - Place overlays **in front of** scheduler events (higher z-index)
   - Overlays must be fully transparent to maintain visual UX

2. **During drag:**
   - Use `document.elementFromPoint(x, y)` or `document.elementsFromPoint(x, y)` for hit-testing
   - The transparent overlays will be detected since they're on top
   - Determine which timeslot is being hovered based on overlay detection

3. **On drag end:**
   - Remove or hide the transparent overlay timeslots
   - Clean up event listeners

#### Overlay Requirements

- Overlays must have `pointer-events: auto` to be detectable by hit-testing
- Overlays must be transparent (`opacity: 0` or `background: transparent`)
- Overlays must be positioned identically to the real timeslots (same coordinates, same dimensions)
- Overlays must have a higher z-index than scheduler events

### 4. Supported Operations

#### 4.1 Creating Events by Dragging

- **Desktop:** Click and drag on empty timeslots to create a new event
- **Mobile:** Touch and drag on empty timeslots to create a new event
- Event duration determined by drag start and end positions
- Visual feedback during drag (preview of event being created)

#### 4.2 Moving Events by Dragging

- **Desktop:** Click and drag existing events to move them
- **Mobile:** Touch and drag existing events to move them
- Events snap to timeslot boundaries
- Visual feedback showing target position during drag

### 5. Mobile Scroll Prevention (CRITICAL)

**On Android and other mobile devices:** While an event is being dragged or created via touch gestures, scrolling must be **completely prevented** under any circumstances:

- **Calendar content scrolling**: The scheduler's internal scroll container must not scroll during active touch drag operations
- **Window/page scrolling**: The browser window or parent page must not scroll during active touch drag operations
- **Pull-to-refresh**: Native pull-to-refresh gestures must be suppressed during drag operations

#### Implementation Requirements

1. Call `e.preventDefault()` on `touchmove` events when a drag operation is active
2. Apply `touch-action: none` CSS to the scheduler container during drag mode
3. Set `overflow: hidden` on the scheduler content container during drag mode
4. Consider applying `overscroll-behavior: none` to prevent scroll chaining to parent elements

### 6. Technical Constraints

- Must work within shadow DOM (Web Components)
- Must handle both vertical and horizontal scheduler layouts if applicable
- Must not interfere with normal scrolling when not dragging
- Must handle edge cases (drag outside scheduler bounds, rapid interactions)

## Testing Requirements

### Playwright Test Scenarios

1. **Desktop - Create Event by Drag**
   - Click on a timeslot, drag to another timeslot, release
   - Verify event is created with correct start/end times

2. **Desktop - Move Event by Drag**
   - Click on existing event, drag to new position, release
   - Verify event moved to correct new position

3. **Mobile Simulation - Create Event by Touch Drag**
   - Simulate touch start, touch move, touch end
   - Verify event creation works identically to mouse

4. **Mobile Simulation - Move Event by Touch Drag**
   - Simulate touch drag on existing event
   - Verify event movement works identically to mouse

5. **Overlay Position Verification**
   - During drag operation, verify overlay timeslots align with actual timeslots
   - Compare bounding rectangles of overlay vs actual elements

6. **Edge Cases**
   - Drag outside scheduler bounds
   - Very short drags (should still create minimum-duration events or cancel)
   - Rapid successive drag operations

7. **Mobile Scroll Prevention**
   - Verify calendar content does not scroll during touch drag
   - Verify window/page does not scroll during touch drag
   - Verify pull-to-refresh is suppressed during touch drag
   - Verify normal scrolling resumes after drag ends

## Acceptance Criteria

- [ ] Mouse drag creates events on desktop browsers
- [ ] Touch drag creates events on mobile browsers
- [ ] Mouse drag moves events on desktop browsers
- [ ] Touch drag moves events on mobile browsers
- [ ] Overlay timeslots are perfectly aligned with actual timeslots
- [ ] Overlay timeslots do not affect visual appearance (fully transparent)
- [ ] **No scrolling occurs during touch drag on mobile devices (calendar or window)**
- [ ] Touch move beyond threshold pans the scheduler content (not the page)
- [ ] All Playwright tests pass
- [ ] No regressions in existing scheduler functionality

## Out of Scope

- Resize events by dragging edges (unless already implemented)
- Multi-touch gestures
- Keyboard accessibility (separate concern)
