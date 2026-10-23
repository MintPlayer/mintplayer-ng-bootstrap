# S2: measuring (ResizeObserver half)

Date: 2026-10-23. Chromium measured (Playwright MCP). The units half was settled in S4: `calc()` with `rem`
inside `@container` is exact in Chromium and Firefox.

**Not measured:**
- **Firefox:** the MCP's Firefox window produces no rendering frames, so a 258-step drag delivered
  only 2 observer callbacks. The same cause made `browser_resize` hang.
- **WebKit:** not available in the MCP.

Both move to M9 e2e. Playwright's own runner renders normally there.

## Setup
- **Page:** a scroll wrapper 600 px tall with `overflow-y: auto` holds board → `.tile-container`
  (`container-type: inline-size`) → `.tile-grid` with 6 tiles.
- **Count rule:** `fit(w) = clamp(floor((w + 16) / (256 + 16)), 1, 4)`.
- **Commit:** on a count change, write `grid-template-columns: repeat(n, minmax(0, 1fr))` inline.
  At 1 column the tiles overflow 600 px, so a page scrollbar appears; at 4 columns they fit.
- **Drag:** a simulated window drag, one width per frame, 1200 → 300 → 1200 px in 7 px steps
  (258 frames).

## Results (Chromium)

| Variant | Loop errors | Callbacks | Commits |
|---|---|---|---|
| Observe the grid, commit inside the callback | **5** | 259 | 7 |
| … plus `scrollbar-gutter: stable` | **5** | 259 | 7 |
| Observe the grid, commit in the next rAF | 0 | 259 | 7 |
| Observe a zero-height sentinel, commit inside the callback | **3** | 259 | 7 |
| … plus `scrollbar-gutter: stable` | 0 | 258 | 7 |

In every variant, state changed exactly once per count change: 4@1185, 3@1067, 2@794, 1@521,
then 2@530, 3@804 and 4@1077 on the way back. There was no oscillation at a threshold.

## Decides
- **The PRD's premise was wrong.** It assumed that because a count change cannot change the grid's
  width, there is no loop. But `ResizeObserver` reports block size too, and a count change changes
  the grid's **height**, so observing the grid loops on every crossing.
- **There is a second, independent cause.** Even with a zero-height sentinel, a synchronous commit
  loops when the new grid height toggles a page scrollbar. The component cannot prevent this:
  `scrollbar-gutter` belongs to the page.
- **Filtering does not help.** Every variant already skipped unchanged counts, which is the
  equivalent of `distinctUntilChanged()`. The browser raises the error because the observed box
  changed during the callback's frame, whatever the callback does with the notification.
- **The wiring (PRD §5.3, updated):** observe the grid itself, read only the inline size, and call
  `machine.measure` in the next animation frame. The deferral alone gave 0 errors. The height change
  then arrives as an ordinary notification, which the width check ignores. The sentinel was rejected:
  it fixes only the first cause, and it would add a node to four fronts and to the SSR markup. The
  cost of deferring is that inline positions trail a crossing by one frame, plus one ignored
  callback per crossing.
- **Risk kept for M9:** a scrollbar toggle at a threshold could flip the count back and forth, one
  change per frame. This did not happen here, because the scrollbar costs 15 px and the drag passed
  through the threshold. If e2e shows it, add hysteresis: require `fit(w)` to hold for a width that
  includes the scrollbar.
- **The units question is closed by S4:** the server keeps `calc()` with `rem`, and nothing resolves
  to px.
