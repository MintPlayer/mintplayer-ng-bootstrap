# S5: animation across a count change

Date: 2026-10-23. The owner judged a live prototype in their own browser. It used the S1 dashboard
(6-column design, cap + pack), the S2 measuring wiring, and a board-width slider to drive count
changes.

## Variants shown
- **Move only:** FLIP translate from the old rect to the new one. Size snaps.
- **Move + resize:** FLIP translate plus scale. Text and the datatable stretch while it runs.
- **None:** the layout jumps.
- **Speeds:** 150, 250 and 600 ms.
- **Reduced motion:** a "reduce motion" toggle, plus the OS `prefers-reduced-motion` setting, which
  forces a jump.

## Implementation notes (carry into `ui-core/flip.ts`)
- **Order:** read every tile's rect (*first*), cancel running animations, commit the new grid
  positions, read again (*last*), then `el.animate([{ transform: translate(dx, dy) }, { transform: none }])`.
- **Read before cancelling:** this makes an interrupted animation continue from the tile's current
  on-screen position. Dragging fast across 4 → 2 → 1 → 3 showed no jumps.
- **Only count changes animate.** Within one count, tiles just stretch with the grid.

## Decides
- **Move only, 250 ms, `cubic-bezier(.2,.7,.3,1)`.** The owner found both animated variants fine.
  Move only was chosen because it never distorts content and keeps the helper simpler.
- **Reduced motion jumps.**
