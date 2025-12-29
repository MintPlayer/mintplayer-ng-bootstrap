# Scheduler: improve panning
## Current behavior
At the moment, the user can pan the scheduler by tapping on the white background and immediately (within 0.6 s) triggering a touchmove or mousemove event (good).
But this behavior does not extend to events.
When the user wants to pan the scheduler, and first drags from the event, the scheduler doesn't pan.

## Solution
When touchstart/mousedown on an event, and triggering a touchmove/mousemove within 0.6s that exceeds the threshold, the scheduler should pan too.

## Other existing behavior
At the moment the user can already touchstart/mousedown events. And if the pointer doesn't exceed the threshold (px) within 0.6s, the scheduler already starts a event-drag-operation. The new code must not interfere with this behavior.

## Related files
- Demo: apps\ng-bootstrap-demo\src\app\pages\advanced\scheduler
- Angular library: libs\mintplayer-ng-bootstrap\scheduler
- Web component: libs\mp-scheduler-wc\src\components\mp-scheduler.ts
- Common functionality: libs\mp-scheduler-core\src