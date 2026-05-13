# PRD: `mp-scheduler` — pan is touch-only; mouse on event tile always drags

**Status:** Implemented (input-handler change landed on `issues/#326`). Manual browser verification of §5 scenarios still pending.
**Author:** Pieterjan
**Date:** 2026-05-13
**Library:** `@mintplayer/ng-bootstrap/web-components/scheduler` (Lit WC) — `libs/mintplayer-ng-bootstrap/web-components/scheduler`

---

## 1. Current behavior

The scheduler today treats mouse and touch gestures the same way for pan-vs-drag arbitration. That works on touch but breaks on mouse:

| Pointer | Target | User gesture | What happens today | What should happen |
|---------|--------|--------------|--------------------|--------------------|
| Touch | empty slot | move within 600 ms | native scroll / pan | pan (✓) |
| Touch | empty slot | hold 600 ms + move | create + extend event | create + extend event (✓) |
| Touch | event tile | move within 600 ms | pan | pan (✓) |
| Touch | event tile | hold 600 ms + move | drag the event | drag the event (✓) |
| **Mouse** | empty slot | mousedown + drag | create + extend event | create + extend event (✓) |
| **Mouse** | event tile | mousedown + drag | **pans the scheduler** (✗) | **drag the event** |

The mouse-on-event-tile path is the bug. The user can never drag an event with a mouse because any movement greater than `touchMoveThreshold` (10 px) within `DEFAULT_MOUSE_PAN_TIMEOUT` (600 ms) hijacks the gesture into pan mode.

## 2. Design intent

**Panning is a touch-only affordance.** Mouse users navigate via scrollbars, the wheel, and the existing previous/next controls — they don't need a press-and-drag pan, and giving them one steals the natural "press and drag to move" gesture from event tiles.

Per-pointer rules:

- **Touch on event tile** — short move → pan. Hold 600 ms then move → drag the event. (Unchanged.)
- **Touch on empty slot** — short move → pan / native scroll. Hold 600 ms then move → create + extend event. (Unchanged.)
- **Mouse on event tile** — any drag → drag the event immediately. **Never pans.**
- **Mouse on empty slot** — any drag → create + extend event. (Unchanged.)

## 3. Root cause (from code investigation)

All decisions live in `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/input/input-handler.ts`.

The mouse path mirrors the touch pan-candidate logic instead of going straight to drag:

- `handleMouseDown` (`:206–234`) — when target is `event` or `resize-handle`, sets `isMousePanCandidate = true`, records `mouseStartPosition`, and arms `mousePanTimer` for 600 ms. It then still calls `callbacks.onPointerDown(pointer, target)`, so the drag state machine enters the *pending* state.
- `handleMouseMove` (`:236–271`) — if `isMousePanCandidate` is set and the cursor has moved more than `touchMoveThreshold` px, it calls `enterPanMode(...)` and **returns before** `callbacks.onPointerMove(pointer)` is reached. The drag state machine never receives the threshold-crossing move, so it never transitions from pending to active. The pending drag is effectively cancelled and the view scrolls instead.
- Slot targets never set `isMousePanCandidate`, which is why mouse-on-empty-slot drag-to-create still works.

`drag-state-machine.ts` and `drag-manager.ts` are pointer-type-agnostic and don't need to change — the fix is purely in the input layer.

## 4. Scope

**In scope:**

- Remove all mouse-pan candidate state and branches from `InputHandler`:
  - State fields: `mousePanTimer`, `mouseStartPosition`, `isMousePanCandidate` (`:76–78`).
  - Constant: `DEFAULT_MOUSE_PAN_TIMEOUT` (`:52`).
  - `handleMouseDown` pan-candidate block (`:220–231`) — keep the `callbacks.onPointerDown(...)` call.
  - `handleMouseMove` pan-entry branch (`:246–268`) — keep `isPanMode` exit handling and the unconditional `callbacks.onPointerMove(pointer)` at the end.
  - `cleanupMousePanState()` (`:289–296`) and its call sites in `handleMouseUp` (`:279`, `:284`).
- Verify `isPanMode` can no longer be `true` from a mouse code path. After the change, `isPanMode` is only set by `enterPanMode()` called from `handleTouchMove` (`:409`). Leave the `isPanMode` guard at the top of `handleMouseMove` as defensive only-if-active code, or remove it once we're confident no mouse path reaches `enterPanMode`. (Recommendation: remove — `isPanMode` is mutually exclusive with mouse activity now.)
- Update `enterPanMode` / `performPan` / `exitPanMode` doc-comments to say "touch only" so the next reader doesn't reintroduce the bug.

**Out of scope:**

- Any change to drag state machine or drag manager.
- Touch hold duration / threshold tuning.
- Adding a config flag to opt mouse pan back in. The user's design intent is that mouse never pans; no toggle.
- Pointer Events API migration (the file uses split MouseEvent / TouchEvent handlers — leaving that as-is).

## 5. Acceptance criteria

1. **Mouse on event tile** — mousedown on an event, move 50 px in any direction within 200 ms: the event drags. The scheduler does not scroll.
2. **Mouse on event tile, slow drag** — mousedown, hold still 700 ms, then move 50 px: the event still drags. (Confirms there's no residual time-gated branch.)
3. **Mouse on resize handle** — mousedown on an event's resize handle, drag: the event resizes. The scheduler does not scroll.
4. **Mouse on empty slot** — mousedown, drag: a new event is created and extended. (Regression check, unchanged.)
5. **Touch on event tile, quick move** — touchstart on an event, move >10 px within 600 ms: the scheduler pans. (Regression check, unchanged.)
6. **Touch on event tile, hold + drag** — touchstart on an event, hold 600 ms, then move: the event drags. (Regression check, unchanged.)
7. **Touch on empty slot** — touchstart, move within 600 ms: native scroll / pan works. Touchstart, hold 600 ms, drag: new event created. (Regression check, unchanged.)

## 6. Verification plan

- Manual: exercise all 7 acceptance scenarios in the demo at `apps/ng-bootstrap-demo/src/app/pages/advanced/scheduler`, in both Chromium and Firefox per [[feedback_firefox_flex_shrink]] hygiene.
- Specs: check `mp-scheduler.keyboard.spec.ts` and `mp-scheduler.aria.spec.ts` still pass — neither targets pan, but the input handler refactor shouldn't disturb them. If a new pan-related spec is warranted, add it under `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/input/` covering scenarios 1 and 5.
- No new Playwright e2e is required for the bugfix itself, but if one is added it must respect [[project_e2e_destructive_bootstrap]] (use `waitForLoadState('networkidle')`, no client hydration).

## 7. Implementation checklist

- [x] Remove `mousePanTimer`, `mouseStartPosition`, `isMousePanCandidate` fields from `InputHandler`.
- [x] Remove `DEFAULT_MOUSE_PAN_TIMEOUT` constant.
- [x] Simplify `handleMouseDown` to: validate target, `e.preventDefault()`, call `callbacks.onPointerDown(...)`.
- [x] Simplify `handleMouseMove` to forward directly to `callbacks.onPointerMove(...)` (dropped the `isPanMode` defensive branch — pan mode is now unreachable from mouse handlers).
- [x] Simplify `handleMouseUp` to forward directly to `callbacks.onPointerUp(...)`.
- [x] Delete `cleanupMousePanState()` and remove its call in `detach()`.
- [x] Update section-header comment on `// Pan helpers` to advertise touch-only (renamed `enterPanMode`/`performPan` JSDoc-comment block target to the section header since neither method had per-method JSDoc).
- [x] Workspace `tsc --noEmit` clean; `nx test mintplayer-ng-bootstrap` 770/770 passing (incl. drag-state-machine, ARIA, keyboard specs).
- [ ] Manual run-through of the 7 acceptance scenarios in Chromium + Firefox.

## 8. Related files

- Web component (input layer): `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/input/input-handler.ts`
- Web component (root): `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/components/mp-scheduler.ts`
- Drag state machine (no change): `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/drag/drag-state-machine.ts`
- Drag manager (no change): `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/drag/drag-manager.ts`
- Angular wrapper: `libs/mintplayer-ng-bootstrap/scheduler`
- Demo: `apps/ng-bootstrap-demo/src/app/pages/advanced/scheduler`
