# Scheduler
## About
The scheduler component should allow us to display events on a calendar view.

## Calendar modes
The scheduler can be rendered in the following modes:
- Day: single column. Hours vertically. Events shown vertically in a pipelined style
- Week: 7 columns, one for each day of the week. Events shown vertically in a pipelined style
- Month: Each week (monday -> sunday) in a grid
- Year: Grid of 4x3 months. Each month shown just like the month view
- Timeline: Span of a week, horizontal timeline with intervals defined by the settings. ERP style "Resources" shown on the vertical axis. Events shown in a pipelined style, per resource

All of the above is already working as expected.

## Cross-platform behavior
The scheduler should be functional on both desktop browsers (mouse-events) + mobile browsers (touch-events).

This means that

    touchstart => no movement (threshold 10px) for 0.6 seconds

must have the same functionality as clicking and dragging on a desktop browser

## Required features
### Create event by dragging on empty slots
On desktop, mouseclick + drag in empty slots should create a new event

On mobile, touchstart + moving => should pan around the scheduler. This lets the user easily scroll around the scheduler.

On mobile, touchstart + nearly no movement (threshold 10px) for 0.6 seconds + drag in empty slots should create a new event.

On mobile, while dragging, it is absolutely imperative that no scrolling occurs. Not the scheduler scrolling NOR the window scrolling.

## ShadowDOM
Keep in mind that the scheduler elements are rendered in the ShadowDOM.
Some user-events received by the scheduler and its child nodes may not filter up into the document, but must be handled by the shadow-DOM root element.

## Mousemove/mouseup handling
Keep in mind that mousemove/mouseup events only occur when no other elements are in front of the event-target.
Prefer using window:mousemove and window:mouseup events if possible.

# Note
Each specification in this document MUST be fulfilled.
If necessary:
- use Playwright
- open devtools (F12)
- enable mobile mode (ctrl + shift + M)
- verify the behavior satisfies this document

---

# Debugging Progress (December 2025)

## Current Status
- **Creating events on empty slots**: WORKS (but uses mouse events, not touch - no vibration occurs)
- **Moving existing events**: BROKEN - hold completes (vibration + "DRAG!" shown) but touchmove events stop firing

## Key Files
- `libs/mp-scheduler-wc/src/components/mp-scheduler.ts` - Main web component (current version: v12)
- `libs/mp-scheduler-wc/src/styles/scheduler.styles.ts` - CSS styles

## Architecture
- Touch handlers registered at two levels:
  1. Shadow-root level: `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`
  2. Document level: `handleDocumentTouchMove`, `handleDocumentTouchEnd` (registered at startup)
- 600ms hold timer via `setTimeout` triggers `activateTouchDragMode()`
- `isTouchDragMode` flag controls whether drag operations are processed

## Critical Finding: Touch Events Stop After setTimeout
When user touches an existing `.scheduler-event` element:
1. `touchstart` fires, `touchHoldTimer` is set for 600ms
2. During hold period, `touchmove` fires - debug shows "S:X hold" (working)
3. After 600ms, `setTimeout` callback `activateTouchDragMode()` runs:
   - Sets `touchHoldTimer = null`
   - Triggers haptic vibration
   - Sets `isTouchDragMode = true`
   - Shows "DRAG!" in debug label
4. **PROBLEM**: After this point, `touchmove` events STOP being delivered entirely
   - Neither shadow-root handler nor document-level handler receives events
   - Debug label stays at "DRAG!" - no "S:" or "M:" counter updates

## What Works vs What Doesn't
| Scenario | Works? | Why |
|----------|--------|-----|
| Create event on empty slot | YES | Browser generates synthetic mouse events (no `touch-action: none` on slots), bypasses touch hold entirely |
| Move existing event | NO | Touch events stop after setTimeout callback runs |
| Scrolling scheduler | YES | Normal touch behavior, no hold involved |

## Versions Tested
- **v8**: Added `touch-action: none` to `.scheduler-event` CSS - no effect
- **v9**: Added `pointer-events: none` on event during drag - MADE IT WORSE (broke touch delivery)
- **v10-v11**: Added debug counters (M: for document, S: for shadow-root) - confirmed events stop
- **v12**: Removed `pointer-events: none` - still broken, touch events still stop after DRAG!
- **v13**: Replaced setTimeout with requestAnimationFrame loop - PARTIAL SUCCESS: window doesn't scroll anymore, but touchmove still stops after DRAG!
- **v14**: Added window-level touch handlers + touch identifier tracking - touchmove stops at ALL levels (shadow-root, document, AND window)
- **v15**: Added elapsed time check in touchmove to activate drag mode from within touch handler - still broken (RAF was still winning the race)
- **v16**: **Completely removed RAF loop** - activation ONLY from touchmove handler - STILL BROKEN

## Key Discovery (v13)
When using RAF instead of setTimeout:
- Window no longer scrolls during drag (positive!)
- But touchmove events still stop being delivered after activation

This suggests `touch-action: none` IS working to prevent scrolling, but something else is stopping touch events.

## Key Discovery (v14)
Added window-level touchmove handler in addition to document and shadow-root levels.
Result: **NO touchmove events at ANY level** after DRAG! appears.
- Not shadow-root (S: counter doesn't increment)
- Not document (M: counter doesn't increment)
- Not window (W: counter doesn't increment)

This rules out Shadow DOM event bubbling issues - the browser simply stops delivering touchmove events entirely.

## Key Discovery (v16)
Removed RAF loop completely. Activation now happens purely from within touchmove handler when `performance.now() - touchStartTime >= 600`.

Flow:
1. touchstart sets `touchStartTime`
2. touchmove checks elapsed time, shows "hold" if < 600ms
3. When >= 600ms, activates drag mode directly in touchmove handler
4. Falls through to handle drag immediately
5. **Subsequent touchmove events should continue...** but they don't

Result: Still broken. Even when activating from WITHIN a touchmove handler, subsequent touchmove events stop.

## Theories Remaining
1. **Browser touch timeout**: Some mobile browsers may have an internal timeout that "expires" a touch sequence after ~600ms of minimal movement
2. **Touch target removal/modification**: Something in `activateTouchDragMode` may be invalidating the touch target
3. **CSS class changes breaking touch**: Adding `.touch-hold-active` or `.touch-drag-mode` classes might affect touch delivery
4. **vibrate() API side effect**: The haptic feedback call might be interfering with touch events

## Debug Infrastructure in Place
- Version label in top-right corner of scheduler (currently "v16")
- `debugMoveCount` - tracks document-level touchmove events (shown as "M:X")
- `debugShadowMoveCount` - tracks shadow-root touchmove events (shown as "S:X")
- `debugWindowMoveCount` - tracks window-level touchmove events (shown as "W:X")
- `activeTouchId` - tracks the specific touch identifier
- Debug states: "hold", "ACT!", "DRAG!", "!state", "!slot", "OK", "!prev", "!touch"

## Code State Summary (v16)
- `TOUCH_HOLD_DURATION = 600` (ms)
- `TOUCH_MOVE_THRESHOLD = 10` (px)
- `.scheduler-event` has `touch-action: none` in CSS
- Touch listeners registered at THREE levels: shadow-root, document, window
- NO RAF loop - activation purely from touchmove elapsed time check
- No `pointer-events` modifications during drag
- Touch identifier tracking via `activeTouchId`

## Next Things to Try
1. **Remove vibrate() call** - test if haptic feedback breaks touch
2. **Remove CSS class changes** - test if DOM modifications break touch
3. **Simplify activateTouchDragMode** - strip down to bare minimum to isolate cause
4. **Test on different Android browsers** - Chrome vs Firefox vs Samsung Internet
5. **Check if issue is specific to .scheduler-event elements** - maybe something about absolute positioning

# Solution Proposal (AI Analysis)

## Diagnosis: Touch Target Disconnection
The symptoms described (events stopping immediately after state change, even at window level) strongly suggest that **the DOM element being touched is being destroyed and recreated**.

If `isTouchDragMode` is a reactive property (e.g., `@state` in Lit), setting it to `true` triggers `render()`. If the render logic rebuilds the list of events (destroying the old DOM nodes and creating new ones), the browser cancels the touch sequence because the original target node is detached from the document.

## Fix Strategy
1. **Stop using reactive properties for transient drag state**: Change `isTouchDragMode` from a reactive `@state`/`@property` to a regular class field.
2. **Manual DOM manipulation**: Instead of relying on the template to apply classes based on state, manually apply the dragging class to the target element in `activateTouchDragMode`:
   ```typescript
   // In activateTouchDragMode
   this.isTouchDragMode = true; // Regular field, no render
   const target = this.activeTouchTarget as HTMLElement;
   target.classList.add('touch-drag-mode');
   // Do NOT trigger this.requestUpdate()
   ```
3. **Cleanup**: Remove the class manually in `handleTouchEnd`.