# Scheduler: improve panning
## Current behavior
At the moment, the user can pan the scheduler by tapping on the white background and immediately (within 0.6 s) triggering a touchmove or mousemove event (good).
But this behavior does not extend to events.
When the user wants to pan the scheduler, and first drags from the event, the scheduler doesn't pan.

## Solution
When a `touchstart` or `mousedown` event occurs on a scheduler event, if a subsequent `touchmove` or `mousemove` event is triggered within 600ms that exceeds a defined pixel movement threshold (e.g., 10px), the scheduler view should begin to pan (scroll).

## Other existing behavior
The current behavior for initiating an event drag must be preserved. If a user performs a `touchstart` or `mousedown` on an event and holds for 600ms without moving beyond the pixel threshold, the component should initiate an event-drag operation. The new panning logic must not interfere with this.

## Related files
- Demo: apps\ng-bootstrap-demo\src\app\pages\advanced\scheduler
- Angular library: libs\mintplayer-ng-bootstrap\scheduler
- Web component: libs\mp-scheduler-wc\src\components\mp-scheduler.ts
- Common functionality: libs\mp-scheduler-core\src