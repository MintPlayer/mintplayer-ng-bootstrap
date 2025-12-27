# Scheduler
## Problem statement
At the moment the scheduler isn't working as expected.
- Creating events by dragging on the scheduler
    - desktop: works
    - mobile: works
- Moving events by dragging them around
    - desktop: works fine
    - mobile: not working

An animated gif is available here: docs\scheduler-recording.mp4

The gif shows:
- [v] start dragging in a free slot: a new event is created
- [v] move the thumb: the event resizes, the scheduler-content pane doesn't scroll, the window doesn't scroll
- [v] release the thumb: the event remains on the board
- [v] start dragging an existing event: the event hightlights, a dashed outline appears
- [x] move the thumb: nothing happens, the outline remains where it was
- [ ] release the thumb: nothing happens
- [ ] touchstart in an empty slot => move: the event moves to the spot at your thumb
- [v] release the thumb: the event remains in place now

there are no console errors

## Tools
Use playwright to simulate these steps. When the browser opens:
- F12 (open devtools)
- ctrl+shift+M (enter mobile mode)
- reproduce the steps mentioned above

## Refactoring
The code for the scheduler component has been refactored on this branch (refactor-scheduler).
Here's the current layout:

  New File Structure

  libs/mp-scheduler-wc/src/
    drag/
      drag-types.ts              # Type definitions
      drag-preview.ts            # Preview calculation (~80 lines)
      drag-state-machine.ts      # Explicit state machine (~350 lines)
      drag-state-machine.spec.ts # 37 unit tests
      drag-manager.ts            # Drag orchestration (~170 lines)
      index.ts
    input/
      pointer-event.ts           # Normalized pointer types
      input-handler.ts           # Unified mouse/touch (~280 lines)
      index.ts
    events/
      event-types.ts             # Custom event types
      scheduler-event-emitter.ts # Event dispatching (~80 lines)
      index.ts
    components/
      mp-scheduler.ts            # Main component (722 lines, from 1286)

  Key Improvements for AI Comprehension

  1. Explicit State Machine: Drag phases are now clearly defined as idle → pending → active → completing
  2. Single Responsibility: Each file does one thing:
    - DragStateMachine: Manages state transitions
    - DragManager: Coordinates with scheduler state
    - InputHandler: Normalizes mouse/touch input
    - SchedulerEventEmitter: Dispatches custom events
  3. Testable: 37 unit tests cover all state transitions
  4. No Duplication: Mouse and touch share code through unified abstraction

  Documentation

  PRD created at: docs/prd/scheduler-refactoring.md

## Investigation Notes (Claude Session 2025-12-27)

### Key Files
- `libs/mp-scheduler-wc/src/input/input-handler.ts` - Touch event handling
- `libs/mp-scheduler-wc/src/styles/scheduler.styles.ts` - CSS styles
- `libs/mp-scheduler-wc/src/drag/drag-manager.ts` - Drag coordination
- `libs/mp-scheduler-wc/src/drag/drag-state-machine.ts` - State transitions

### What Works
- Touch hold activates correctly (500ms timer fires)
- `touch-hold-active` class is added to the event element
- `touch-drag-mode` class is added to the container
- touchmove events ARE reaching the shadow root (verified with logging)

### The Bug
When user touches and holds on an event, then drags:
- Console shows: `defaultPrevented: false` on touchmove events
- This means `e.preventDefault()` is NOT being called in the InputHandler
- Result: Browser handles touch for scrolling instead of our drag logic

### Console Output From Testing
```
[TRACE] touchstart {targetClass: 'event-time', isEvent: true, isSlot: false}
[TRACE] HOLD ACTIVATED on scheduler-event touch-hold-active
[TRACE] DRAG MODE ACTIVATED
[TRACE] touchmove #1 {cancelable: true, defaultPrevented: false}  <-- BUG: should be true!
[TRACE] touchmove #2 {cancelable: true, defaultPrevented: false}
```

### Root Cause Hypothesis
The `handleTouchMove` method in InputHandler checks `this.isTouchDragMode` before calling `preventDefault()`. Either:
1. The InputHandler's touchmove listener is not being called, OR
2. `this.isTouchDragMode` is false when it should be true

### Failed Fix Attempts
1. **Moving touchmove listener to document** - Made it worse, caused "cancelable=false" errors because browser commits to scroll before event reaches document
2. **Adding `touch-action: none` CSS** - Only works if set BEFORE touch starts. Adding to `.scheduler-event` broke create functionality

### Current Debug State
Added console.log to `handleTouchMove` in input-handler.ts:
```typescript
console.log('[InputHandler] handleTouchMove called', {
  touchCount: e.touches.length,
  isTouchDragMode: this.isTouchDragMode,
  touchHoldTimer: !!this.touchHoldTimer,
  touchStartPosition: !!this.touchStartPosition
});
```

### Next Steps
1. Test with new logging to see if `handleTouchMove` is even being called
2. If called, check if `isTouchDragMode` is true or false
3. The fix likely involves ensuring the touchmove listener on shadow root receives events properly when touch starts on an event element

### Key Code Sections

**Touch flow in InputHandler:**
1. `handleTouchStart` - Sets up hold timer, saves position
2. After 500ms → `activateTouchDragMode` - Sets `isTouchDragMode = true`, calls `onPointerDown`
3. `handleTouchMove` - Should check `isTouchDragMode` and call `preventDefault()` + `onPointerMove`

**The critical check in handleTouchMove (line ~295):**
```typescript
if (this.isTouchDragMode) {
  e.preventDefault();  // This prevents scrolling
  this.callbacks.onPointerMove(pointer);
}
```

### finding 1

```
> Thanks, the page doesn't scroll anymore (good) - But dragging an event still doesn't work immediately - did you forget to clear a timer 
variable somewhere in the code 

● Good progress! Let me check the activateTouchDragMode function - I think touchStartPosition isn't being cleared after the hold activates:
● I see it! In activateTouchDragMode, touchStartPosition is NOT cleared. This needs to be cleared so subsequent touchmove events don't get confused:
● Let me also check the drag-manager to see how it processes touch events - there might be another threshold or state issue there:
● I see the issue! Looking at the DragManager and DragStateMachine, there's a slot resolution problem. When dragging an EVENT, the touch is over the event element, and getSlotAtPosition might return null because the event is blocking the slot detection.
  Let me check how slots are resolved - I suspect the event element needs pointer-events: none during the drag:
● The slot resolution uses elementsFromPoint which should work even with elements on top. Let me check what onTouchDragActivated callback does - maybe there's something there:
● I think I see the issue now. After the 500ms hold, the DragStateMachine goes to 'pending' state and waits for 5px of movement before becoming 'active'. For touch events that already waited 500ms, this additional threshold feels like "not working immediately".
  Let me modify the flow so touch-initiated drags skip the pending threshold:
● Let me add an immediate flag to skip the pending state for touch-initiated drags:

=> This route didn't end in a solution. See finding 2
```

### finding 2
```
> No, the behavior is still the same as on the master branch. Did you bear in mind that after i touchend, and touchstart in a blank timeslot        
everything works as expected? 

● That's a very important clue! So after touching a blank slot once, event dragging works. This suggests that something isn't properly initialized or resolved when first touching an event.
● I see the issue. When slot is null (which happens when touching an event), the immediate path fails. For move operations, we should create a slot from the event's times. Let me fix this:
● Now when touching an event for a move operation, if the slot can't be resolved, we create one from the event's existing times. Please test again.
  If this still doesn't work, can you tell me: after touching a blank slot once, does dragging events then work correctly? I want to understand if this is an initialization issue or something else.
Yes, after touching a blank slot, i can move around and drop the initial event as expected.
```

### Finding 3
When I touchstart + wait .6s on an existing event i get this log:

```
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 298.8000183105469, clientY: 252.4000244140625, elementsFound: 17, elementClasses: Array(5), slotFound: true}
```

Touchmove shows no more logs.

Then I touchstart a blank timeslot, and get these logs:

```
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 108.4000015258789, clientY: 314, elementsFound: 16, elementClasses: Array(5), slotFound: true}
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 108.4000015258789, clientY: 322.79998779296875, elementsFound: 16, elementClasses: Array(5), slotFound: true}
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 108.4000015258789, clientY: 323.60003662109375, elementsFound: 16, elementClasses: Array(5), slotFound: true}
...
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 105.20001220703125, clientY: 315.60003662109375, elementsFound: 16, elementClasses: Array(5), slotFound: true}
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 105.20001220703125, clientY: 317.20001220703125, elementsFound: 16, elementClasses: Array(5), slotFound: true}
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 105.20001220703125, clientY: 318, elementsFound: 16, elementClasses: Array(5), slotFound: true}
```

### Finding 4

```
● No logs at all means handleTouchMove isn't being called after the hold activates. This is likely because:

  1. When activateTouchDragMode calls onPointerDown, it triggers a state change
  2. The state change causes a re-render of the scheduler
  3. The event element (the original touch target) gets replaced with a new DOM element
  4. Touch events are always sent to the ORIGINAL target element, which no longer exists

● I see the issue! Mouse events use document for move/up, but touch events only use the shadow root. When the drag starts and the DOM re-renders, the original touch target element may be replaced, so events stop reaching the shadow root listener.

● Now test again. The key change is that when touch drag mode activates, we add document-level listeners for touchmove/touchend. This ensures we capture the events even if the DOM re-renders and replaces the original touch target element.

  You should now see [handleTouchMove] logs when moving your thumb after the hold activates.

=> There's no [handleTouchMove] logs while dragging existing events.
```

### Finding 5

Here's the logs for a new event

```
input-handler.ts:373 [activateTouchDragMode] Adding document listeners
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 261.20001220703125, clientY: 393.1999816894531, elementsFound: 16, elementClasses: Array(5), slotFound: true}
input-handler.ts:267 [handleTouchMove] {touchCount: 1, isTouchDragMode: true, hasTouchHoldTimer: false, hasTouchStartPosition: false}
drag-manager.ts:85 [DragManager.handlePointerMove] {isDragging: true, phase: 'active'}
input-handler.ts:375 [DOC touchmove raw] {touches: 1, cancelable: true}
input-handler.ts:267 [handleTouchMove] {touchCount: 1, isTouchDragMode: true, hasTouchHoldTimer: false, hasTouchStartPosition: false}
drag-manager.ts:85 [DragManager.handlePointerMove] {isDragging: true, phase: 'active'}
input-handler.ts:375 [DOC touchmove raw] {touches: 1, cancelable: true}
input-handler.ts:267 [handleTouchMove] {touchCount: 1, isTouchDragMode: true, hasTouchHoldTimer: false, hasTouchStartPosition: false}
drag-manager.ts:85 [DragManager.handlePointerMove] {isDragging: true, phase: 'active'}
input-handler.ts:375 [DOC touchmove raw] {touches: 1, cancelable: true}
input-handler.ts:267 [handleTouchMove] {touchCount: 1, isTouchDragMode: true, hasTouchHoldTimer: false, hasTouchStartPosition: false}
drag-manager.ts:85 [DragManager.handlePointerMove] {isDragging: true, phase: 'active'}
```

Here's the logs for dragging an existing event:

```
input-handler.ts:373 [activateTouchDragMode] Adding document listeners
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 274, clientY: 351.6000061035156, elementsFound: 17, elementClasses: Array(5), slotFound: true}

### After touchstart-ing an empty slot

input-handler.ts:267 [handleTouchMove] {touchCount: 1, isTouchDragMode: true, hasTouchHoldTimer: true, hasTouchStartPosition: true}
input-handler.ts:375 [DOC touchmove raw] {touches: 1, cancelable: true}
input-handler.ts:267 [handleTouchMove] {touchCount: 1, isTouchDragMode: true, hasTouchHoldTimer: true, hasTouchStartPosition: true}
input-handler.ts:375 [DOC touchmove raw] {touches: 1, cancelable: true}
input-handler.ts:267 [handleTouchMove] {touchCount: 1, isTouchDragMode: true, hasTouchHoldTimer: true, hasTouchStartPosition: true}
input-handler.ts:375 [DOC touchmove raw] {touches: 1, cancelable: true}
input-handler.ts:267 [handleTouchMove] {touchCount: 1, isTouchDragMode: true, hasTouchHoldTimer: true, hasTouchStartPosition: true}
input-handler.ts:375 [DOC touchmove raw] {touches: 1, cancelable: true}
```

### Finding 6
The event-div is removed/replaced after dragstart

```
originalElement = $0
<div class=​"scheduler-event" data-event-id=​"evt-mjolh9vo-6xs0e4y" style=​"top:​ 720px;​ height:​ 120px;​ left:​ 0%;​ width:​ calc(100% - 2px)​;​ background-color:​ rgb(55, 136, 216)​;​ color:​ rgb(255, 255, 255)​;​">​…​</div>​
mp-scheduler.ts:702 [getSlotAtPosition] {clientX: 191.60000610351562, clientY: 261.1999816894531, elementsFound: 17, elementClasses: Array(5), slotFound: true}
afterDragStart = $0
<div class=​"scheduler-event" data-event-id=​"evt-mjolh9vo-6xs0e4y" style=​"top:​ 720px;​ height:​ 120px;​ left:​ 0%;​ width:​ calc(100% - 2px)​;​ background-color:​ rgb(55, 136, 216)​;​ color:​ rgb(255, 255, 255)​;​">​…​</div>​
originalElement == afterDragStart
false
```