# PRD — Tile manager: headless core, responsive breakpoints, per-column-count layouts (#440)

- **Status:** Proposed. Grilled 2026-10-23 (§13); not started.
- **Issue:** [#440](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/440)
- **Packages:**
  - `@mintplayer/ui-core/tile-manager` (new)
  - the four fronts: `@mintplayer/web-components/tile-manager`, `@mintplayer/ng-bootstrap/tile-manager`, `@mintplayer/react-bootstrap/tile-manager` and `@mintplayer/vue-bootstrap/tile-manager`
- **Related:**
  - [tile-manager.md](./tile-manager.md) (the original PRD)
  - [typeahead-wc-436.md](./typeahead-wc-436.md), the reference for the headless core + four fronts
  - MintPlayer.Spark#530 (the consumer, its milestone M1)
- **Plan:** [tile-manager-responsive-440-plan.md](./tile-manager-responsive-440-plan.md)
- **One PR**, breaking changes allowed and documented (§11).

## 0. Summary

Three changes ship together:

1. The tile-manager logic moves into a plain TypeScript machine in `ui-core`. Four fronts (Lit,
   Angular, React and Vue) consume it and each renders its own template. Angular SSR then emits real
   markup instead of an empty `<mp-tile-manager>`.
2. The column count is resolved from the **host width** through a breakpoint map. The consumer can
   give the map explicitly, or it is generated from `minColumnWidth`. On wide screens the columns
   get wider, never more numerous. On narrow screens tiles are re-laid out, never collapsed.
3. Positions live in **`layouts`, keyed by column count**. Each one is derived when missing, edited
   in place, and emitted per count. This lets a host such as Spark store one layout per count per
   user, while the component never rewrites anything on its own.

## 1. Problem (verified against `master` @ `4113c756`)

- **The grid template** is `repeat(auto-fit, minmax(minColumnWidth, 1fr))`, and tiles are placed
  unclamped at `colStart / span colSpan`.
  - Narrow screens: tiles beyond the real track count create zero-width implicit columns, and the
    tiles become 2–10 px slivers (measured at 700 and 390 px in the issue).
  - Wide screens: auto-fit adds tracks, so a 6-column layout fills half of a 2560 px screen.
- **`effectiveColumnCount` is a plain field**, not reactive (`mint-tile-manager.element.ts:124`).
  In auto-fit mode it is the token count of the computed `gridTemplateColumns`, and it is not
  refreshed before keyboard steps or `beginResize`.
- **`pack.ts` has two gaps.** The "stay in place" branch never range-checks against `columnCount`,
  and a `colSpan > columnCount` blocks the whole layout.
- **The board ignores its own editing modes.** `dragMode` and `resizeMode` are not respected by the
  keyboard path: the M key checks only the per-tile `disableMove && disableResize` (L863). The
  instructions string (L173) is static and always advertises move and resize.
- **The events are chatty.** `tilelayoutchange` fires on every keyboard step and again on Escape.
  `tilepositionchange` duplicates it.
- **Angular SSR renders nothing.** domino has no `customElements`, so the server emits an empty
  element.

## 2. Goals

- **G1:** No tile is ever narrower than `minColumnWidth` (or the full width at 1 column), and no
  zero-width tracks exist at any width, before or after hydration.
- **G2:** Wide screens keep the widest applicable column count, with wider columns.
- **G3:** Rendering never mutates. A derived layout is computed, not stored. Narrow → wide restores
  exactly what was there.
- **G4:** The consumer decides where wrapping happens, with an explicit `breakpoints` map. The
  default is generated from `minColumnWidth`.
- **G5:** Users edit at any column count. Each commit reports its count, and the host stores
  `layouts[count]`.
- **G6:** `dragMode` and `resizeMode` govern **every** input path: pointer, touch, keyboard M mode
  and Shift+arrow resize. ARIA reflects the actual capability per tile.
- **G7:** Full assistive-technology support in every mode (§6).
- **G8:** Real server-rendered markup in Angular, with the correct layout painted before hydration
  and with JS off.

## 3. Non-goals

- Storing layouts; the host does that.
- A panel picker or visibility UI. The host owns the visible set (D9).
- Viewport-based or named (`sm`/`md`) breakpoints. Breakpoints are host-width px.

## 4. Locked decisions (grilled 2026-10-23, §13)

| # | Decision |
|---|---|
| D1 | `breakpoints: { minWidth, columns }[]` (px of the host content box). The entry with the largest `minWidth ≤ width` applies. A shorthand `stackBelow: number` is sugar for `[{0,1},{N,max}]` |
| D2 | `effective = min(breakpointColumns(width), fit(width))`, where `fit = max(1, floor((w + gap) / (minColumnWidth + gap)))`. Breakpoints can wrap *earlier* than `minColumnWidth`, never later (G1 is a floor) |
| D3 | With no `breakpoints`, the map is **generated**: one entry per `n = 1…max`, with `minWidth = n·minColumnWidth + (n−1)·gap`. `max` is the largest count in `layouts`, or `maxColumns` (default **6**) when `layouts` is empty |
| D4 | **Positions live in `layouts: Record<columnCount, TileLayoutSnapshot>`.** `tiles` carries identity and options only. No layout is special. There is no `designColumnCount`, and no `position` on a tile |
| D5 | **Derivation** for count `n`: (1) `layouts[n]` if present; else (2) **project down** from the nearest larger stored layout; else (3) **edge-scale up** from the nearest smaller one; else (4) place every tile from `defaultSize` in `tiles` order. It is pure, never emitted and never stored. **The derivation cascades by design:** once `layouts[3]` is stored, columns 2 and 1 derive from it, not from 6, so a user's tablet arrangement carries down to the phone. A unit test pins this |
| D6 | **Project down:** sort by reading order (`rowStart`, `colStart`, then index), apply the **plain cap**, then `pack()`. The cap is `colSpan' = min(colSpan, n)`, `colStart' = min(colStart, n − colSpan' + 1)`, with `rowSpan` unchanged. `pack()` then places the tiles in reading order (in place if they fit, otherwise first fit) and slides them up. In effect, tiles keep their width and wrap. The owner chose this over edge-scaling after S1 (`docs/prd/spikes/issue-440/S1-span-rule.md`): edge-scaling squeezed a datatable to half width at 768 px. The cost is 1-column holes near the design width until the user stores that count. `rowSpan` is never capped, because a row's height doesn't change with the width |
| D7 | **Scale up maps column *edges*:** `e → round(e × n / m)`. Touching tiles stay touching, the board fills the width, and spans stay ≥ 1 because `n > m`. Edge mapping is used **only upward**; downward uses the cap (D6). It is lossless because the result is never stored |
| D8 | A tile in `tiles` but missing from the rendered layout is placed **below the last occupied row**, in `tiles` order, at `defaultSize` (default 1×1, capped to `n`). This is not emitted |
| D9 | **The host owns visibility:** `tiles` *is* the visible set. Layout entries for ids not in `tiles` take no space and are not rendered, but they are **passed through unchanged** in every emitted layout, so a re-shown panel returns to its spot. Pruning is the host's job |
| D10 | Editing is allowed at **every** count. There is no lock input: `dragMode` / `resizeMode` (`'off'`) and the per-tile `disableMove` / `disableResize` govern every path. The most restrictive one wins |
| D11 | **Events.** `layoutchange` `{ columnCount, layout, layouts, staleCounts }` fires on **commit** only: pointer-up, Enter, or focus leaving M mode, which counts as a commit. **A commit whose layout equals the layout on entry emits nothing**, for example entering M mode and blurring without moving; a machine test covers this. `layoutpreview` (same payload) fires on every intermediate step, and once more with the original layout on Escape. `columncountchange` `{ columnCount, previous }` fires on each resolved change, including the first. `tilelayoutchange`, `tilepositionchange` and the Escape re-emit are **removed** |
| D12 | **Optimistic two-way binding.** A commit is applied to an internal copy of `layouts`, rendered, then emitted. Any host assignment of a **new** `layouts` object replaces the copy. Angular `[(layouts)]` (`model()`), Vue `v-model:layouts`, React `layouts`/`defaultLayouts` + `onLayoutChange` |
| D13 | **Headless in this PR.** `ui-core/tile-manager` holds the machine, and Lit, Angular, React and Vue are fronts that render their own templates |
| D14 | **SSR paints the right layout without JS.** The tree is three layers: the board, then a `.tile-container` with `container-type: inline-size`, then `.tile-grid`. An `@container` rule can only style elements *inside* the container, so the grid's own `grid-template-columns` and every tile's position are both set by container rules. The board has a CSS `min-inline-size` floor of one column, kept off the contained element. Each tile has `min-inline-size: minColumnWidth` (full width at 1 column) and `min-block-size: minRowHeight`. **The server writes no inline position or track template.** Inline values would beat every `@container` rule and freeze one count. Inline positions start only after the first `measure()` on the client |
| D15 | **Stale narrower layouts are surfaced, never auto-fixed.** If a user edits at 3 columns and later rearranges or adds tiles at 6, `layouts[3]` does not follow; react-grid-layout has the same property. The component gives the host what it needs: `layouts` in the commit payload is the full next record, and `staleCounts` lists the stored counts below `columnCount` that this edit does not reach. There is a `resetLayout(count)` command, available on every front, which drops `layouts[count]` and commits so that count derives again, and a pure helper `withoutNarrowerLayouts(layouts, count)`. The documented recipes are "after a wide edit, offer *also apply to smaller screens?*" and a per-width "Reset this width" action. Nothing is dropped automatically |

## 5. Design

### 5.1 `@mintplayer/ui-core/tile-manager`

```
libs/mintplayer-ui-core/tile-manager/
  index.ts
  src/
    types.ts               MintTile, TilePosition, TileLayoutSnapshot, TileBreakpoint, TileLayouts, events
    columns.ts             resolveColumnCount(width, opts), generateBreakpoints(opts)          (pure)
    derive.ts              deriveLayout(layouts, tiles, n, opts) → { layout, source }           (pure, D5–D9)
    scale.ts               scaleEdges(layout, from, to)                                          (pure, D7)
    pack.ts                moved from web-components, with the range fix                         (pure)
    grid-geometry.ts       moved: pointerToGridRect, resizeSpans, cellOrigin                    (pure)
    tile-manager-machine.ts  TileManagerMachine extends Machine<TileManagerState>
    connect.ts             connect(snapshot, rootId) → attribute bags (the only ARIA writer)
    messages.ts            default English strings + a TileManagerMessages type (localizable)
    ssr-css.ts             breakpointCss(layouts, tiles, breakpoints, scope) → string (D14)
    styles/tile-manager.scoped.scss → GENERATED tile-manager.scoped.styles.ts
    *.spec.ts
```

**Machine state:**
- the inputs (`tiles`, `layouts`, `breakpoints`, `stackBelow`, `minColumnWidthPx`, `gapPx`,
  `maxColumns`, `dragMode`, `resizeMode`);
- the measured `width`, the resolved `columnCount` and the derived `rendered` layout;
- `gesture` (idle, arming-touch, drag, resize, plus a pinned rect and `blocked`);
- `keyboard` (idle, or move with its entry layout);
- `focusedTileId`;
- `announcement`.

**Commands:**
- `setInputs(partial)` and `measure(width, cellMetrics)`;
- `pointerDown(tileId, part, point, cellMetrics)` and `pointerMove/Up/Cancel(point)`, where `point`
  is grid-local `{x, y, pointerId, pointerType, button, time}` and the metrics are read once at
  pointerdown. Down and move return a verdict, `'ignore' | 'track' | 'capture'`; the front calls
  `setPointerCapture` and `preventDefault` only on `'capture'` (mouse captures lazily at 5 px);
- `keydown(tileId, key, mods) → consumed`;
- `focus(tileId)` and `blur()`;
- a `focusRequest {tileId, seq}` in the snapshot, which the front applies after it renders.

S3 settled this contract (`docs/prd/spikes/issue-440/S3-gesture-split.md`).

Long-press arming uses an injected timer, so it is testable with fake timers. The machine emits
`layoutchange`, `layoutpreview` and `columncountchange` through `subscribe`-style callbacks, and the
fronts re-dispatch them as their own idiom.

**The count freezes during a gesture or M mode.** A resize that crosses a breakpoint mid-drag
re-resolves on commit or cancel, not before, so the coordinate system never changes under the
pointer.

**`connect()`** returns bags for the board, each tile, each tile's resize grip and drag handle,
the instructions node and the live region. That includes `role`, `aria-*`, `tabindex`, `data-*`
and `data-mps="tile-manager"`. Ids are deterministic from the front-supplied root id. Inline style
(`grid-column`/`grid-row`, the drag transform, the grid's track template) travels as a separate
`StyleBag`, because `[mpProps]` refuses `style` and every framework has its own style binding.
**Tiles are listed in `tiles` input order, never preview order** (S3): a framework that reorders
nodes mid-gesture detaches the dragged tile and loses its pointer capture and focus.

### 5.2 Rendered tree (identical across the four fronts)

```html
<div class="mp-tile-manager" data-mps="tile-manager" …board bag (role=region, aria-label, aria-describedby)…>   <!-- min-inline-size floor -->
  <style data-mps-ssr>…D14 container rules, server only…</style>
  <div class="tile-container" data-mps="tile-manager">     <!-- container-type: inline-size -->
  <div class="tile-grid" data-mps="tile-manager">          <!-- grid-template-columns: @container on server, inline after measure() -->
    <div class="tile" data-mps="tile-manager" …tile(id) bag (role=button, aria-roledescription, aria-pressed, aria-describedby, tabindex; style only after measure())…>
      <div class="tile-header" …header bag (id; names the tile when there is no label)…><!-- front: header template --></div>
      <div class="tile-content" …content bag…><!-- front: content template --></div>
      <span class="tile-grip" …grip bag (data-part=side|bottom|corner, aria-hidden)…></span>   <!-- ×3; absent when resize is not allowed -->
    </div>
  </div>
  </div>
  <div class="tile-sr-only" id="<root>-description">6 columns, read-only.</div>
  <div class="tile-sr-only" id="<root>-instructions-<both|move|resize|none>">…one per capability set in use…</div>
  <span class="tile-sr-only" role="status" aria-live="polite">…announcement…</span>
</div>
```

`connect(machine, rootId)` (M3) takes the machine, not only the snapshot, because positions,
the tab stop, the drag offset and the capabilities are machine getters over the snapshot; it is
still pure in the snapshot. The hidden nodes come back as one keyed `descriptions` list. The
sheet ships its own `tile-sr-only` rule: the Lit front's shadow root sees no Bootstrap utility.
Before the first `measure()` tiles are `role="group"` with no tab stop, grips or instructions
(the Tier 2 render below). The board's inline style carries `--mp-tile-min-column`,
`--mp-tile-gap` and `--mp-tile-row-height`, which are floors, not positions, so they are safe on
the server. `minRowHeight` and `label` are machine inputs, so every front forwards them the same way.

The board element has `display: block; inline-size: 100%` and a `min-inline-size` floor of one
column. Containment sits on `.tile-container`, never on the board and never on `.tile-grid`:
- An element cannot be its own container, so the grid must sit *inside* the container for
  `@container` rules to reach its `grid-template-columns`.
- The floor must stay off the contained element, because without it a shrink-to-fit parent would
  collapse the board to 0 px (CLAUDE.md, containment gotcha).

**`connect()` writes no position before the first `measure()`.** The bags carry the
`grid-column`/`grid-row` style, and the grid's `grid-template-columns`, only once the machine has a
measured width. Before that, in SSR and before hydration measures, positions come from the D14
rules alone. Writing them inline any earlier would beat every container rule and freeze one count.

### 5.3 Fronts

| Front | Tile content | Binding | Notes |
|---|---|---|---|
| Lit `mp-tile-manager` | named slots `${id}-header` / `${id}-content` | properties and events | Keeps its **shadow root**, because content only arrives through slots (light-tier admission rule). Adopts the scoped sheet into its shadow root via `adoptLightStyles`. `MachineController` and `props()` directive |
| Angular `bs-tile-manager` | `*bsTile="let tile of tiles()"` wrapping `*bsTileHeader` / `*bsTileContent` (the tile is in scope for both) (`bs-tile` is replaced; see §7) | `tiles`, `[(layouts)]`, `breakpoints`, `stackBelow`, …; outputs `layoutPreview`, `columnCountChange` | `machineSignal()` + `[mpProps]`, OnPush. SSR renders the full tree plus the D14 `<style>`. `withEventReplay` |
| React `BsTileManager` | `renderHeader(tile)` / `renderContent(tile)` | `layouts` / `defaultLayouts` + `onLayoutChange`, `onLayoutPreview`, `onColumnCountChange` | `useMachine` + `reactProps()`. Props extend `HTMLAttributes<HTMLDivElement>` and are spread onto the board |
| Vue `BsTileManager` | `#header="{ tile }"` / `#content="{ tile }"` scoped slots | `v-model:layouts`, events | `useMachine` composable, `inheritAttrs:false` + `v-bind="$attrs"` on the board |

Each front measures with one `ResizeObserver` on the inner grid, reading only
`contentBoxSize[0].inlineSize`. Only the width matters. It hands the reading to `machine.measure` in
the **next animation frame, never inside the observer callback**. The machine changes state only when
the **resolved count** changes; a plain comparison does this, with no reactivity library. Cell
metrics for pointer math are read at gesture start, not observed.

Gesture wiring, the same in every front (S3): pointer move/up/cancel/`lostpointercapture` are bound
on the tile, never on `window`, and capture routes them there. Each front forwards **only the inputs
that changed**: re-pushing a stale controlled `layouts` on an update the machine itself requested
reverts the commit. FLIP `first()` runs in the store subscription and `play()` after the framework
renders, as does applying `focusRequest`. Angular renders a frame after the notification, so it uses
`afterNextRender`. With `withEventReplay`, a keydown before hydration is replayed, so the Angular
front must not depend on `preventDefault` for it.

S2 measured why the deferral is required (`docs/prd/spikes/issue-440/S2-measuring.md`). A count
change changes the grid's **height**, and it can also toggle a page scrollbar. When that size change
happens inside the callback, the browser raises `ResizeObserver loop` no matter what our code does
with the notification. A deferred write lands in the next frame, where the browser delivers it as an
ordinary notification and the width check ignores it. FLIP reflow animation is a small shared DOM helper in `ui-core`
(`flip.ts`), used by all four fronts and gated by `prefers-reduced-motion`. S5 decided its shape
(`docs/prd/spikes/issue-440/S5-reflow-animation.md`):
- A count change animates the **whole reflow**, **position only**: a translate from the old rect to
  the new one, 250 ms, `cubic-bezier(.2,.7,.3,1)`, through the Web Animations API.
- Size snaps instead of animating. A scale transform would distort text and tables while it runs.
- The "first" rects are read before running animations are cancelled, so a fast drag across several
  counts continues smoothly from where each tile is on screen.
- Reduced motion jumps.

### 5.4 SSR and no-JS (D14)

- `breakpointCss()` emits, per breakpoint, one rule for the grid's track template and one rule per
  tile. The tile rules take the form
  `@container (min-width: Wpx) { .tile[data-mps=tile-manager][data-tile-id="x"] { grid-column: …; grid-row: … } }`.
  Both kinds target descendants of `.tile-container`. The rules are computed from the same pure
  derivation, so server and client agree.
- The server renders no inline `style` on `.tile-grid` or any `.tile` (D14). S4 asserts this
  explicitly: it checks the SSR HTML for the absence of inline `grid-column` and
  `grid-template-columns`, and checks that the JS-off layout differs at two widths.
- Hydration measures, resolves the same count and renders identical inline positions. The `<style>`
  is then redundant but harmless; the client removes it after the first measure.
- **No-JS tier:** the board is visible and correctly laid out, and it is inert, because editing
  needs JS. That makes it **Tier 2** in CLAUDE.md terms: no editing affordance is rendered as
  enabled on the server. Grips and M-mode instructions are emitted only once hydrated (the
  `data-js` branch).
- `minColumnWidth` and `gap` as `rem` in `@container` conditions: S2 checks `calc()` support. If it
  is unsupported, the server resolves to px at a 16 px root, and that is documented.

## 6. Accessibility contract

- **The board** has `role="region"`, an `aria-label` (from `label`, localized default), and a
  description of the mode, "6 columns" or "6 columns, read-only".
- **Each tile** is a `role="button"` with `aria-roledescription="tile"` (localized) and an
  accessible name (`label` or header text).
  - `aria-pressed` reflects M or R mode.
  - **R enters resize mode** (owner, 2026-10-23): plain arrows resize, Enter commits, Escape
    cancels, just like M for moving. Shift+arrow in M mode keeps working. Pressing M in R mode, or
    R in M mode, switches mode but keeps the entry layout, so Escape still reverts both. R is
    offered only when resize is allowed (`resizeMode` and `disableResize`), and M only when move is.
  - `aria-describedby` points to **per-capability** instructions: move only, resize only, both, or
    none. With none, M is not offered and the instructions say so.
  - Roving `tabindex` puts one stop on the board. Focus is restored **by tile id** across every
    re-layout, count change and visibility change.
- **The live region** announces:
  - entering M mode, with the keymap for what is allowed;
  - each step, as a position in **rendered** coordinates, "column 2 of 4, row 3";
  - commit, cancel and blocked moves;
  - a column-count change, but only while M mode is active, so resizing the window is not noisy.

  Every announcement uses one channel only.
- All strings go through `TileManagerMessages`, which the fronts accept as an input for
  localization.
- `dragMode`/`resizeMode` `'off'` removes the affordance from both trees: no grip and no handle
  cursor, and the M key does nothing.
- Hidden tiles (not in `tiles`) are not rendered at all, so they are absent from both trees.
- Focus ring: a `:focus-visible` outline lives in the scoped sheet.
- `prefers-reduced-motion` disables FLIP and the resize transition.
- `*.aria.spec.ts` exists per front and in the core `connect.spec.ts`. It covers states, not only
  the initial render: modes off, a locked tile, M mode, each count, and a hidden then re-shown tile.

## 7. Public API delta (breaking; CHANGELOG `### Breaking`)

| Before | After |
|---|---|
| `MintTile.position` | removed. Positions come from `layouts[n]`. `defaultSize?: {colSpan, rowSpan}` is added |
| `columnCount` | removed. Use `breakpoints` / `stackBelow`, or the generated map with `maxColumns` |
| `tilelayoutchange`, `tilepositionchange` | `layoutchange` (commit, `{columnCount, layout, layouts, staleCounts}`), `layoutpreview` (steps) |
| — | `layouts` (two-way), `breakpoints`, `stackBelow`, `maxColumns`, `messages`, `columncountchange`, `resetLayout(count)`, `withoutNarrowerLayouts()` |
| Angular `bs-tile [position]` + `layoutChange` emitting an array | `*bsTile` + `*bsTileHeader` / `*bsTileContent` on `tiles`, `[(layouts)]`, `layoutPreview`, `columnCountChange` |
| React and Vue thin `@lit/react` / `$attrs` wrappers around `mp-tile-manager` | native fronts (§5.3) |
| `captureLayout()` | kept on every front; it returns `{ columnCount, layout }` of what is rendered |

`minColumnWidth`, `minRowHeight`, `gap`, `dragMode`, `resizeMode`, `animateReflow`, `label` and
`tilegestureblocked` (renamed `gestureblocked`) are kept.

## 8. The #1 risk

Pointer gestures are the hardest part to make framework-neutral: long-press touch arming, pointer
capture, the FLIP transforms during a drag, and the resize transition. The machine owns the
decisions and the fronts own only `setPointerCapture` and the rAF/FLIP helper, but four fronts
still means four places to wire it.

**Resolved by S3** (`docs/prd/spikes/issue-440/S3-gesture-split.md`): the split holds on the Lit and
Angular fronts, for mouse, touch long-press, Escape, blocked moves, FLIP and the keyboard walkthrough
at 390 px. The machine stays DOM-free and there is **no `GestureController`**. The wiring per front
is about 40 lines, and the four rules it must follow are in §5.1 and §5.3: stable DOM order, the
capture verdict, changed-only inputs, and post-render focus and FLIP.

## 9. Spikes

| # | Question | Decides |
|---|---|---|
| S1 | Span rule when projecting down: edge-scaling (D7, applied downward) vs a plain cap `min(colSpan, n)`. Should `rowSpan` be capped at 1 column? Screenshots at 390, 768, 1280 and 2560 px with a datatable, a KPI and a chart tile | D6 span rule |
| S2 | Measuring: the observer on the inner grid, `contentBoxSize`, no `ResizeObserver loop` warning in Chromium, Firefox and WebKit during a window drag. `calc()`/`rem` inside `@container` conditions | §5.3 measurement, §5.4 units |
| S3 | Gesture split: is the machine DOM-free, with the fronts forwarding pointer coordinates? Proven on the Lit and Angular fronts, plus the keyboard walkthrough at 390 px | §8 fallback or not |
| S4 | SSR: render the issue's 4-tile layout through Angular SSR at 3 breakpoints, view with JS disabled, then hydrate. No reflow, and no hydration mismatch (NG0500) | D14 as specified |
| S5 | Animation across a count change: FLIP the whole reflow, or jump? Reduced motion respected | §5.3 FLIP policy |

## 10. Testing

- **ui-core unit tests** (vitest, pure):
  - `columns`: fit with gap, min 1, the breakpoint cap never exceeding fit, the generated map, the
    `stackBelow` sugar.
  - `derive`: exact match, project down from the *nearest* larger (the cascade: with
    `layouts[3]` stored, 2 and 1 derive from it, not from 6), edge-scale up, project down with the
    cap (a 3-wide tile at 2 columns becomes 2-wide, `colStart` is pulled in, `rowSpan` is
    unchanged) and then packed, `staleCounts` and `resetLayout`, the
    `defaultSize`-only case, missing tiles appended below, unknown ids passed through and not
    rendered, input deep-equal before and after.
  - `scale`: edges preserved, no gaps or overlaps, a 6 → 8 → 6 round trip.
  - `pack`: the range fix.
  - `machine`:
    - commit vs preview;
    - a no-op commit emits nothing;
    - Escape emits a preview but no commit;
    - blur commits;
    - the count is frozen during a gesture;
    - every mode-off path blocks pointer, touch, the M key and Shift+arrow;
    - optimistic apply, and a new `layouts` object wins.
  - `connect`: per-capability instructions, `aria-pressed`, roving tabindex.
  - `ssr-css`: rules per breakpoint.
- **Front specs:**
  - Lit element and ARIA specs, ported from the existing ones.
  - The Angular component spec, with signal-driven inputs (CLAUDE.md).
  - React and Vue behaviour specs.
  - A conformance test rendering one state in all four fronts and diffing the DOM minus framework
    attributes.
  - Attribute passthrough rows.
- **E2E** (ng, react and vue demos):
  - The issue's reproduction at 390, 700, 1280 and 2560 px: every tile ≥ `minColumnWidth` or full
    width, `scrollWidth === clientWidth`, and the widest layout spanning the full width at 2560.
  - Explicit `breakpoints`: wrapped just below a threshold, not wrapped just above it.
  - Narrow → wide restores the layouts byte-identically.
  - An edit at 1 column emits `columnCount: 1` and leaves `layouts[6]` untouched.
  - Hiding a tile and re-showing it returns it to its spot.
  - The keyboard walkthrough at 390 px.
  - axe in a projected mode and in a read-only mode.
  - ng with JS disabled: the correct layout at 2 widths.

## 11. Versioning

- **The framework packages bump minor.** `@mintplayer/ng-bootstrap` (22.x tracks Angular),
  `@mintplayer/react-bootstrap` (19.x tracks React) and `@mintplayer/vue-bootstrap` (3.x tracks Vue)
  take breaking changes in minors by repo policy, listed under `### Breaking`.
- **`@mintplayer/ui-core` bumps minor.** The `tile-manager` entry is additive.
- **`@mintplayer/web-components` is OPEN, for the owner to decide before M9.**
  - Its 2.x major is tied to no platform. It went 1.6.0 → 2.0.0 for one breaking change (the
    datatable windowed fetch, #387).
  - Since then, breaking changes have shipped in minors: the card helpers removed in 2.20.0, the
    typeahead in 2.21.0, and query-builder `part=` removal. Each of those broke `^2.x` consumers
    silently.
  - Removing `MintTile.position` and `column-count` and renaming the events does the same.
  - **Recommendation: 3.0.0**, with the fronts' peer ranges moved to `^3.0.0`, and the policy written
    down in CHANGELOG's header ("web-components follows semver") so the next breaking WC change
    doesn't repeat the question.
  - The alternative is to declare in the CHANGELOG header that web-components versions in lockstep
    with the framework packages' minors. That is honest, but it makes `^2` meaningless.

Spark consumes the published versions afterwards.

## 12. Consumer follow-through: MintPlayer.Spark (after publish)

- **Sequencing:** only Spark's *client* tile milestone waits for this publish. Its server work
  (storage, merge, endpoints, default dashboards) can proceed in parallel against the §7 types.
- This is a hint, not Spark's schema. The client-visible shape is
  `{ visibleTileIds, layouts: Record<count, TileLayoutSnapshot> }`. Spark stores more: defaults
  already seen, removal tombstones, and tiles the user may not see.
- **Denied tiles never reach the client, so D9's pass-through cannot preserve them.** Spark's server
  must merge on save:
  - keep the stored entries for ids absent from the payload;
  - refuse ids the user cannot access;
  - then write.
- `bs-tile-manager [tiles]="visible()" [(layouts)]="layouts"`, with persistence on `layoutChange`
  only.
- The edit/view toggle binds `dragMode` and `resizeMode` to `'off'`.
- The panel picker is Spark's own, a query or persistent-object lookup. A re-shown panel returns to
  its stored spot (D9).
- An app's default dashboard ships as a seed `layouts`, typically one entry at its widest count.

## 13. Resolved questions (grilled 2026-10-23)

| Q | Question | Answer |
|---|---|---|
| Q1 | Responsive model | Full breakpoint map (owner: serve all downstream consumers, not just Spark); `stackBelow` sugar |
| Q2 | Source of a missing layout | The nearest larger stored layout |
| Q3 | Edit at non-widest counts | Yes, everywhere |
| Q4 | Growing past every stored layout | Edge-based proportional scale-up. The owner rejected "squeezed into the left half"; it is lossless because it is not stored |
| Q5 | Board lock input | None. Make `dragMode`/`resizeMode` consistent on every path, with full ARIA |
| Q6 | Where positions live | `layouts` keyed by count; `tiles` without positions (breaking) |
| Q7 | Unplaced tiles | `defaultSize`, appended below the last row, not emitted |
| Q8 | Panel visibility | The host owns it, with no built-in picker; hidden positions are passed through |
| Q9 | Event timing | `layoutchange` on commit, plus a new `layoutpreview` for steps |
| Q10 | Who holds the layout | Optimistic internal copy; a host assignment wins; two-way binding |
| Q11 | Architecture | Fully headless in this PR: a `ui-core` machine plus four fronts |
| Q12 | SSR column count | Container-query rules for every breakpoint, plus CSS min-width and min-height floors |
| Q13 | No `breakpoints` given | A generated fit map, capped at the widest stored layout, else `maxColumns = 6` |

**Review round (2026-10-23):** these points were folded in.
- The three-layer container tree, and no inline position before `measure()` (D14).
- The downward span-0 clamp (D6).
- Stale narrower layouts, through D15.
- The derivation cascade stated in D5.
- The no-op commit (D11).
- The web-components major (§11, open).
- Spark's server-side merge and its parallel sequencing (§12).

This PRD supersedes #440's D1 (design column count), D5 (logic only in the WC) and D6 (backward
compatible); a comment on #440 records this.
