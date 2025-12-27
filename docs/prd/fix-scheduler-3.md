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

# Note
Each specification in this document MUST be fulfilled.
If necessary:
- use Playwright
- open devtools (F12)
- enable mobile mode (ctrl + shift + M)
- verify the behavior satisfies this document