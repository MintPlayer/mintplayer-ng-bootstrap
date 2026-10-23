# S3: gesture split

Date: 2026-10-23. A prototype `TileManagerMachine` in `libs/mintplayer-ui-core/tile-manager` drove two
fronts on one scratch page (`/enterprise/tile-manager-s3`, not committed): a Lit element with a
shadow root and named slots, and an OnPush Angular component rendering its own template with
`machineSignal()` + `[mpProps]`. Both fronts are pure wiring; every decision is the machine's.
Checked with the `playwright_node` MCP in Chromium, at desktop width and at 390 px.

## The contract that came out of it
- **The machine is DOM-free.** It takes grid-local coordinates (`gridPointer(e, grid)`), cell
  metrics read once at pointerdown (`readCellMetrics(grid, n)`), `pointerType`, `button` and time.
  Long-press uses injected timers (600 ms arm, 150 ms press feedback, 10 px slop), so it is
  fake-timer testable.
- **`pointerDown`/`pointerMove` return a verdict:** `'ignore' | 'track' | 'capture'`. The front calls
  `setPointerCapture` and `preventDefault` only on `'capture'`. Mouse capture is lazy, at the 5 px
  threshold, so a click on header content still works.
- **No window listeners.** move/up/cancel/`lostpointercapture` are bound on the tile; capture
  routes them there. A same-`pointerId` guard in the machine absorbs the bubbled header/grip
  pointerdown.
- **FLIP stays a front-side DOM helper** (`TileFlip`): `first()` in the store subscription when the
  `rendered` layout changes identity, `play()` after the framework has rendered.
- **Style is a separate channel.** Angular's `[mpProps]` refuses `style`, so `connect()` returns a
  `StyleBag` per tile and for the grid, bound with each framework's own style binding.

## What broke, and the rule each break produced
- **DOM order must be the `tiles` input order, never the preview order.** Angular's `@for` moved the
  dragged node when the preview reordered, which detached it: pointer capture and focus were lost,
  so the drag stuck and Escape went nowhere. `connect()` now emits tiles in input order; position
  comes only from the style. Lit's `repeat` would have done the same.
- **Fronts forward only the inputs that changed.** Lit re-pushed the stale controlled `layout` on
  the update the machine itself requested, reverting every commit. `willUpdate` now forwards
  `changed` keys only; Angular's per-input effect already behaves this way.
- **Angular renders a frame later than Lit** (zoneless, OnPush; Lit renders in a microtask). Focus
  and FLIP `play()` must run after the render (`afterNextRender`), and tests must wait a rAF plus a
  macrotask before reading the DOM.
- **Interacting before hydration replays events.** The first Angular run pressed keys before
  hydration finished: `withEventReplay` replayed the keydown, the handler's `preventDefault()` raised
  "`preventDefault` called during event replay", and focus lagged one keypress. After waiting for
  hydration the walkthrough is identical to Lit's, with no console errors. M5 must not rely on
  `preventDefault` for a replayed keydown, and its E2E must wait for hydration.

## Results (both fronts)
- **Mouse:** a click does not drag, a drag commits once, Escape mid-drag reverts, focus stays on
  the dragged tile, and resizing into a locked tile emits `gestureblocked`.
- **Touch** (CDP `Input.dispatchTouchEvent`): press feedback at 250 ms, armed by 700 ms, the drag
  commits; a swipe scrolls and does not drag; a long-press on the body in `header` mode does not arm.
- **Keyboard at 390 px:** roving tabindex, M sets `aria-pressed`, "Move blocked." on an occupied
  target, Shift+Arrow resizes with an announcement, Escape reverts, Enter on an unchanged layout
  emits no `layoutchange`, blur commits.
- **Seen in passing, for M3:** "1 columns by 1 rows" needs plural forms in `messages.ts`; Tab out of
  a tile lands on the tile's scrollable `.tile-content`, which Chromium makes focusable. That is
  correct for keyboard scrolling, and the E2E should expect it.
- **The owner's 2-column jump** on the current WC (drag a right-hand tile after switching to 2
  columns) is the stored-vs-rendered mismatch. It is not reproducible on the prototype, because
  every gesture computes from the rendered position. It is a regression spec in plan M2.

## Decides
**A DOM-free machine; no `GestureController`.** The split did not leak. What each front needs is
about 40 lines of wiring: forward pointer events through `gridPointer`, capture on the verdict,
FLIP around render, focus on `focusRequest`, and forward changed inputs only. The prototype
(`ui-core/tile-manager`) is the seed for M1–M3.
