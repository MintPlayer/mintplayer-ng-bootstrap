# PRD — `mp-hierarchy-chart` zoom gestures + label decluttering

Status: **Proposed** (2026-08-14). Follow-up to [charts-wc.md](./charts-wc.md) (PR #401, shipped).
Plan: [hierarchy-chart-zoom-labels-plan.md](./hierarchy-chart-zoom-labels-plan.md)
Grounded in a 3-agent investigation (2026-08-14): (1) source-level terrain map of the shipped
element; (2) zoom/label survey of codecov (gazebo source), Coveralls, D3, ECharts, Highcharts,
Plotly, Nivo, AG Charts, amCharts, vasturiano, FoamTree/webpack-bundle-analyzer, webtreemap;
(3) platform mechanics + WCAG 2.2 analysis of wheel/pinch interception, SVG zoom, and label
fitting — plus a live reproduction on coverage.mintplayer.com (below).

## 1. Problem

Two defects reported from real use (the coverage site at coverage.mintplayer.com renders the
workspace's own coverage with `bs-hierarchy-chart`):

1. **No continuous zoom input.** The only zoom is click/tap/Enter re-rooting. The user wants
   pinch on touch and a modifier+wheel gesture on desktop.
2. **Label speckling.** On a deep coverage tree the chart is "all white with almost no areas" —
   every folder/file name is painted onto sections far too small to hold it.

**Measured reproduction** (coverage.mintplayer.com, commit page for `79bc2849`, 2026-08-14):
420×420 px host, tree depth 11, `max-depth="auto"` → **656 rendered arcs, 197 rendered labels**.
Each ring is ~17.5 device px thick; the label font (26 viewBox units on a 1000-unit viewBox) is
~10.9 device px — labels are taller than half a ring and routinely wider than several arcs, so
text paints across neighbours everywhere. No current demo page reproduces this (the ng demo's
hand-built tree is small); the demo gap is itself a deliverable (§10).

### Root causes in the shipped code

- **A unit bug makes the label threshold ~6× more permissive than designed.**
  `arcLabelFits` (`mp-hierarchy-chart.ts:811`) passes `n.x0 * TAU` (radians) into
  `arcLabelVisible`, whose contract and unit tests (`charts/core/src/arc.spec.ts:90-95`) use
  *normalized* spans. The live test is therefore `sweep_rad > 0.03` — every arc wider than
  ~1.72° (0.48% of the circle) gets a `<text>`, instead of the intended 3% of sweep.
- **The radial-thickness term is hard-coded out.** The element passes `rings = 1`, so the test
  never notices that 11 rings make each ring wafer-thin. `arcLabelVisible` already takes the
  parameter and `arc.spec.ts:93` already asserts "thick span rescues a thin angle" — it is simply
  never fed a real value.
- **The fit test never consults the text.** A long name in a wide-but-thin arc always overflows;
  there is no truncation (SVG has no `text-overflow`) and no length estimate.
- **Labels are sized in viewBox units, not device px.** `.arc-label { font-size: 26px }` in
  1000-unit viewBox coordinates means the *rendered* size scales with the host — ~7.8 px on a
  300 px chart (illegible), and on a large chart the labels grow with it instead of yielding
  space to geometry.
- **Icicle/treemap label unconditionally**: `renderCell` (`mp-hierarchy-chart.ts:906`) emits a
  `<span class="cell-label">` for every cell with no threshold of any kind — a 2 px-tall cell
  still gets one, relying on CSS ellipsis alone.
- **The arc `<text>` nodes are not `aria-hidden`** — unroled children inside `role="tree"`
  (ARIA structure violation) that also duplicate each treeitem's `aria-label`.
- **The tooltip is pointer-only.** Keyboard focus shows nothing; Escape does not dismiss it
  (1.4.13 fails on all three legs for the sighted-keyboard case).

## 2. Research verdicts (what the industry does)

**Zoom.** Every surveyed sunburst — codecov (gazebo `SunburstChart.jsx`), D3's zoomable sunburst,
ECharts (`nodeClick: 'rootToNode'`), Highcharts (`allowTraversingTree`), Plotly (`level`),
amCharts, vasturiano — zooms by **semantic re-rooting**: click a node to make it the root
(reallocating the full 2π to its subtree), click the centre to go up, animate ~750 ms.
**Geometric wheel/pinch zoom on a sunburst does not exist in the surveyed set.** The only
geometric zooms found are on *treemaps* (FoamTree wheel-zoom; ECharts treemap `roam`) — and
ECharts pointedly ships `roam` on its treemap while withholding it from its sunburst. FoamTree's
plain-wheel capture (swallowing page scroll by default) is documented as the anti-pattern.
Codecov specifically: click slices to zoom in, click centre to zoom out, no labels on arcs at
all — every name lives in the `<title>` tooltip and a sibling path readout.

Semantic re-rooting is also the only model where zooming *causes labels to appear* (the subtree
gains real angular extent, so the fit test passes for more nodes), and it satisfies the
constant-label-size requirement natively — nothing is ever scaled.

**Why not geometric scale-zoom** (recorded so it isn't re-litigated): it magnifies the rings you
already see and pushes the rest off-canvas, so it requires pan; drag-pan requires visible
clickable pan controls under WCAG 2.5.7 (keyboard equivalence explicitly does not satisfy it);
pinch requires `touch-action: none`, which steals one-finger page scroll on a full-width mobile
chart (the dock already proved `pan-x` alone doesn't deliver, `mint-dock-manager.element.ts:2181`);
intercepting ctrl+wheel unconditionally hijacks browser page-zoom (a WCAG 1.4.4 text-resize
mechanism) — and a trackpad pinch is *indistinguishable* from real ctrl+wheel because all four
engines synthesize `wheel {ctrlKey: true}` from pinch (WebKit since Safari 15, changeset 277772);
and a scaled SVG group under `will-change: transform` skips re-rasterization and blurs. Semantic
re-rooting has none of these costs.

**Labels.** Consensus: **suppress the label, never the arc** (no surveyed product hides geometry
to declutter; padding shrinks with the arc instead). Mechanisms found, best-of-breed:
pixel *arc length* thresholds beat pure angle tests (Highcharts' official demo:
`innerArcLength > 16` px — scales with radius, so outer rings keep labels an angle test would
kill); char-count fit heuristics (vasturiano: `name.length × CHAR_SPACE < r × Δangle`) are the
standard cheap fit test; orientation-as-fitting (vasturiano `labelOrientation: 'auto'`, Highcharts
`rotationMode`) rescues a band of labels; and the fit test **re-runs after every re-root**, which
is what makes suppressed labels acceptable — zooming is the reveal mechanism. Plotly's
`uniformtext {minsize, mode: 'hide'}` is the same idea as our constant-px requirement: one font
size, hide what can't fit. Measuring: `getComputedTextLength`/`getBBox` force sync reflow per
label and are banned anyway (D8); a char-count estimate's worst failure is a slightly-misplaced
threshold, never a layout break.

## 3. Goals

1. **Wheel and pinch drive the existing semantic zoom** ("the semantic ladder"): modifier+wheel
   and two-finger pinch step the re-root state toward/away from the pointer — continuous-feeling
   zoom with zero geometric-zoom debt. Tap/click stepping already works and remains the
   single-pointer path (2.5.1).
2. **Labels render only where they fit** — a real fit test (arc length AND ring thickness AND
   text length) at a **constant device-px font size** across all three layouts, with ellipsis
   truncation where partial fit is useful. The coverage tree above should render ~a dozen
   readable directory labels, not 197 overlapping ones.
3. **The tooltip becomes the accessible name channel it was meant to be**: shown on keyboard
   focus as well as hover, Escape-dismissable, persistent, still `aria-hidden` (the treeitem's
   `aria-label` already speaks the same content — one message, one channel).
4. **An optional built-in breadcrumb** exposing the zoom path as real buttons — single-pointer
   way back up, keyboard-operable, and the visible statement of zoom state.
5. Wrapper + demo + registry updates in all three frameworks, including a demo dataset large
   enough to reproduce the speckling class of problem.

## 4. Non-goals

- **No geometric scale/pan zoom** (§2). If a future consumer genuinely needs magnification of a
  fixed projection, that is a new PRD; nothing here precludes it.
- **No Safari `gesturestart`/`gesturechange` path** — redundant since Safari 15 synthesizes
  ctrl+wheel from pinch.
- **No canvas `measureText`** — the fit heuristic stays pure char-count arithmetic so every code
  path runs under jsdom (D8's spirit); jsdom has no 2D context without native canvas.
- **No `<textPath>` / curved labels** (re-affirms D7) and no `textLength`/`lengthAdjust`
  squeezing (overlapping or stretched glyphs; not CSS-settable).
- **No per-node `<title>`** (re-affirms the charts-wc rejection).
- **Not fixing `data-overflow` aggregation** (promised in charts-wc.md §7's risk table, never
  implemented) — out of scope here; recorded so the gap stays visible.

## 5. Locked decisions

> **AMENDED 2026-08-14 (user decision, after seeing the semantic ladder live):** ctrl/⌘+wheel and
> pinch are **geometric magnification** — the chart zooms like a map while labels hold their
> device-px size, which is precisely what makes small segments' captions readable in place.
> Z1/Z4/Z6/Z7 below are superseded as recorded in Z1'–Z7'; the §2 industry survey stands as
> context, not as the decision. Semantic re-root remains on click/Enter/tap/breadcrumb.

| # | Decision | Consequence |
|---|---|---|
| Z1' | Ctrl/⌘+wheel and pinch drive a **geometric view window** (zoom factor + pan origin over normalized content coords): the sunburst maps it to its `viewBox`, the div layouts map their percentage geometry through it — **never a CSS transform** | Text stays crisp (no re-rasterization risk) and never scales; the label fit test re-runs against `hostScale × zoom`, so magnifying IS the label-reveal mechanism |
| Z2' | Zoom anchors at the pointer / pinch midpoint; keyboard `+`/`-` anchor on the focused node, `0` resets; clamp 1×–32×; the view resets on re-root, layout switch and data writes | Anchor-at-cursor is itself a single-pointer navigation path; a stale magnification across a re-root would disorient |
| Z3' | Pan: mouse/pen **drag** while zoomed (release after >3px never counts as a click) and **two-finger drag** on touch (the pinch tracker's midpoint); one-finger touch stays native page scroll | WCAG 2.5.7: the non-drag alternatives are anchor-at-cursor zoom, `+`/`-`/`0`, the breadcrumb, and Escape-to-reset — all click/keyboard operable |
| Z4' | Escape ordering grows a third rung: tooltip dismiss → **geometric view reset** → semantic zoom-out | One key, innermost state first |
| Z5' | Semantic re-root is **unchanged** (click/tap/Enter/breadcrumb/center) and still the only writer of `root-id`/`hierarchy-zoom`; geometric state is element-local (`zoomLevel` getter, `setZoomLevel()`/`resetZoom()` methods), no event | Two zooms, two meanings: re-root changes *what* is shown, magnification changes *how big* |
| Z6' | The DOM cull thresholds (`min-angle`/`min-size`) divide by the zoom factor | A sliver you zoomed into is no longer a sliver on screen — it materializes (and can be labeled) as you magnify |
| Z7' | Superseded-but-kept from the original set: **Z2** (Ctrl/⌘ gating — plain wheel never captured), **Z3** (plain-wheel hint overlay), **Z5** (non-passive host listener consuming only modifier-held events), and the S4-verified `touch-action: pan-x pan-y` applied only while pinch is enabled | The capture rules and page-scroll guarantees carry over unchanged |
| ~~Z1~~ | ~~Wheel/pinch step the semantic re-root ladder; no scale transform ever~~ | Superseded by Z1' — the user explicitly wants magnification; the ladder shipped briefly and read as "clicking through", not zoom |
| Z2 | Wheel zoom requires **Ctrl/⌘** (`ctrlKey \|\| metaKey`); plain wheel is never captured | Page scroll always survives (FoamTree's documented mistake avoided); trackpad pinch arrives as ctrl+wheel for free in all 4 engines |
| Z3 | Plain wheel over the chart shows a transient **hint overlay** ("Use Ctrl + scroll to zoom", localizable, ⌘ on Apple platforms), `aria-hidden` | The embedded-Google-Maps convention; solves discoverability without capture |
| Z4 | Wheel-in re-roots **one level toward the node under the pointer** (the focus child on its path); wheel-out = `zoomOut()`; deltas normalized per `deltaMode` and accumulated to discrete steps | Repeated notches walk down the path under the cursor — semantic zoom-at-cursor; mid-tween retargets already restart cleanly (charts-wc plan M3) |
| Z5 | The wheel listener is element-level, added imperatively with `{ passive: false }`; `preventDefault()` **only** on events the chart consumes (modifier held, step taken) | Element-level wheel is non-passive by default but the option documents intent (carousel/splitter precedent); un-consumed events keep native behavior, so page zoom off-chart and page scroll everywhere are untouched |
| Z6 | Touch pinch steps the same ladder, **gated on spike S4**: two-pointer distance ratio with hysteresis, midpoint picks the descent target, under `touch-action: pan-x pan-y` | One-finger page scroll must stay native (repo rule: no `preventDefault` on touch pointerdown; `touch-action` frozen at touchstart). If S4 fails, pinch is dropped and tap remains the touch zoom — already a complete single-pointer path (2.5.1) |
| Z7 | No +/- zoom buttons | 2.5.1 needs a *single-pointer* alternative to multipoint gestures: tap/click-to-re-root and the centre/breadcrumb already are one; a "+" with no target is ambiguous in a semantic model |
| L1 | Labels render at a **constant device-px font** (`label-font-size`, default 12), converted to viewBox units via a ResizeObserver-measured host scale | Fixes both directions of the viewBox-font bug (illegible small, land-grabbing large); satisfies "text doesn't zoom along"; no `container-type` (D9 stands); jsdom fallback = deterministic scale |
| L2 | Label visibility = **three-part fit test in device px**: arc length at label radius ≥ estimated text advance, AND ring thickness ≥ `fontPx × 1.2`, AND ≥ 4 chars placeable; estimate = `chars × 0.6 × fontPx` (char-count heuristic, vasturiano precedent) | Replaces the broken area threshold; pure arithmetic, jsdom-testable (D8), unit-tested in core; re-runs on every re-root and resize, so zooming reveals labels |
| L3 | Names that don't fully fit but pass the fit floor are **ellipsis-truncated** (`abc…`) to the placeable char count | SVG has no `text-overflow`; the accessible name is untouched (`accessibleName()` is independent of the visual label) |
| L4 | `label-min-area` is **removed** (breaking, documented); `show-labels` stays as the master switch | The knob's unit semantics were broken in the shipped element and its intent is subsumed by L2; BC is not a default constraint (house rule) |
| L5 | Icicle/treemap cells suppress the label span below fit (cell height < `fontPx × 1.4` or width < ~3 chars); CSS ellipsis keeps handling partial width overflow above it | Ends unconditional labelling; same constant-px font model |
| L6 | Sunburst `<text>` labels (and the hint overlay) carry `aria-hidden="true"` | Fixes the ARIA structure violation inside `role="tree"` and the duplicate-speech risk |
| L7 | **Per-node label color computed from the effective surface under the text**: the node's own fill (the component already computes it) composited over the resolved chart backdrop when the node is translucent (leaf opacity .6), then black-or-white by WCAG relative luminance; the backdrop is auto-detected by walking up from the host to the first opaque computed `background-color` (crossing shadow roots via `.host`), overridable via a `backdrop` attribute | Ends the theme-token-on-data-colored-fill mismatch (white labels speckling a light page, user report 2026-08-14); the static `--mp-hierarchy-chart-label-color` token is replaced by an on-light/on-dark pair (breaking, documented); pure luminance/composite math lives in `charts/core`, jsdom-testable |
| T1 | Tooltip shows on **focusin** (positioned from the focused segment's rect, clamped to the host) as well as pointer hover; persistent; **Escape dismisses the tooltip first, zooms out on the next press**; stays `aria-hidden`, no `aria-describedby` | 1.4.13's three legs for sighted users; screen-reader users already get the identical content from the treeitem name — wiring describedby would double-speak (one message, one channel) |
| T2 | Tooltip keeps `pointer-events: none`, offset so it never sits between pointer and arc | "Hoverable" satisfied by pass-through (the arc stays hovered); a hide-timer tooltip is the complex alternative, rejected |
| B1 | Optional `show-breadcrumb` (default off): the focus path as real `<button>`s **outside** the `role="tree"` container, ≥24×24, localized root label; treemap's existing header remains | Single-pointer + keyboard way up, zoom state as visible content; off by default so existing consumers' layouts don't shift |

## 6. Design

### 6.1 Wheel ladder

State: an accumulated, `deltaMode`-normalized delta (pixel ≈ ×1, line ≈ ×16, page ≈ viewport
height; magnitudes clamped — engines report anything from ±1-line to ±100-px per notch). One
semantic step per ~100 accumulated px, accumulator reset on direction change and after an idle
timeout. Step-in target: `pathTo(hoveredNode)` gives the chain from the current focus; re-root
into its first element (the focus's direct child on the pointer's path). Pointer over the centre
or whitespace: step-in is a no-op. Step-out: existing `zoomOut()`. Both paths reuse
`zoomTo`/`hierarchy-zoom`/the tween — no new events, no new state machine. All layouts get the
gesture (cells resolve the hovered node the same way via `data-id`).

### 6.2 Pinch (spike-gated)

`pointerdown` bookkeeping in a `Map<pointerId, point>` (no `preventDefault` on touch —
synthesized click must survive for tap-to-re-root). With two live pointers: scale = current
distance / gesture-start distance, with hysteresis (step-in above ~1.3, step-out below ~0.77,
re-based after each step); the midpoint picks the descent target. `pointerup`/`pointercancel`
ends the gesture. **S4 must prove** (3 engines, touch emulation + one real Android/iOS check)
that under `touch-action: pan-x pan-y` two simultaneous pointer streams actually arrive instead
of a `pointercancel` (a 2016 W3C thread documents Chrome consuming the second finger as pan;
never re-measured). Fail → ship without pinch; tap already covers touch zoom.

### 6.3 Label engine

`charts/core` gains a pure `fitArcLabel(name, sweepRad, r0Px, r1Px, fontPx)` →
`{ visible: boolean, text: string }` (truncation included) and a cartesian sibling
`fitCellLabel(name, wPx, hPx, fontPx)`; both spec'd table-driven. The element measures the host
once per resize (ResizeObserver; jsdom fallback: a fixed injectable scale) and feeds device-px
geometry. The broken `arcLabelVisible` call site is deleted; the core function is removed or
reworked into `fitArcLabel` (breaking at the `charts/core` surface, documented). Labels stay
hidden during the tween (current behavior, kept: constant-px text swinging through a re-root
reads worse than a fade-in; webpack-bundle-analyzer's contrary datum noted for a future polish
pass). Orientation stays radial-with-flip (D7); `auto` radial/tangential orientation is noted as
a possible follow-up, not scope.

### 6.4 Contrast-aware label color

`charts/core` gains pure `relativeLuminance(color)`, `composite(fg, bg, alpha)` and
`contrastText(surface, onLight, onDark)` (WCAG relative-luminance formula; picks whichever of the
two candidates has the higher contrast ratio against the surface). The element resolves its
backdrop once per render cycle: walk `host → parentElement → … (ShadowRoot ⇒ .host)` reading
computed `background-color` until alpha = 1 (jsdom: computed styles are empty → deterministic
white fallback, so specs stay exact); a `backdrop` attribute short-circuits the walk for
consumers who know better (or whose backdrop is an image/gradient the walk can't see). Per node:
surface = `fillOf(node)`, composited over the backdrop at the node's rendered opacity (leaves
.6), then `contrastText` picks from `--mp-hierarchy-chart-label-on-light` (default near-black)
/ `--mp-hierarchy-chart-label-on-dark` (default white). Applies to all three layouts (cells get
the same computation with their own opacity). The old single `--mp-hierarchy-chart-label-color`
token is removed. Theme changes re-resolve on the next render; a stale backdrop across a live
theme flip corrects itself on any interaction — accepted, since the failure is one render of
suboptimal-but-legible contrast, not the permanent mismatch this fixes. A text halo
(`paint-order: stroke`) was considered and rejected for now: with L2 labels no longer
overflowing their arcs, per-surface contrast is sufficient and halos read as clutter at 12px.

### 6.5 Focus tooltip + Escape ordering

`focusin` on the tree container → position the tooltip from the focused segment's
`getBoundingClientRect()` centre (host-clamped), `focusout` hides. The keydown handler orders
Escape: visible tooltip → dismiss and stop; else existing zoom-out. Pointer path unchanged plus
host-bounds clamping (today the tooltip can escape the host).

### 6.6 Breadcrumb

A flex row above the chart (all layouts; treemap keeps its header as the in-chart affordance):
one `<button>` per ancestor from tree root to focus, `aria-current="true"`… the last item is
static text (current focus, not clickable). Buttons re-root via `zoomTo`. Localized via existing
`labelFormatter`/node names; root falls back to `input-label`. Outside the `role="tree"`
container (aria spec `:66-81` enforces this).

## 7. API changes

### `mp-hierarchy-chart`

| Surface | Name | Notes |
|---|---|---|
| attr,prop | `zoom-gestures` | `'wheel pinch'` (default) \| `'wheel'` \| `'pinch'` \| `'none'` |
| prop | `zoomLevel` (get), `setZoomLevel(z, anchorX?, anchorY?)`, `resetZoom()` | Geometric view state, element-local (Z5'); clamped 1–32 |
| attr,prop | `label-font-size` | Device px, default `12` |
| attr,prop | `show-breadcrumb` | Default `false` |
| attr | `zoom-hint-label` | Default `"Use Ctrl + scroll to zoom"` / ⌘ variant on Apple platforms; localizable |
| attr | `breadcrumb-label` | Accessible name of the breadcrumb `<nav>`; localizable |
| attr,prop | `backdrop` | Optional CSS color overriding backdrop auto-detection (L7) |
| css | `--mp-hierarchy-chart-label-on-light` / `--mp-hierarchy-chart-label-on-dark` | The contrast pair L7 picks from |
| **removed** | `label-min-area` | Breaking (L4); release notes + demo snippets updated |
| **removed** | `--mp-hierarchy-chart-label-color` css token | Breaking (L7); superseded by the on-light/on-dark pair |

No new events (`hierarchy-zoom` already reports every re-root, gesture-driven or not).

### `charts/core`

`fitArcLabel` / `fitCellLabel` / `relativeLuminance` / `composite` / `contrastText` added;
`arcLabelVisible` removed (breaking, documented). `arcLabelTransform` unchanged.

### Wrappers

Angular: new `input()`s + `effect()`s for the four new inputs (string labels guarded
`!== undefined`); nothing new to the `model('rootId')` loop. React: nothing (scalar props flow
via `createComponent`; no new events). Vue: nothing (kebab attrs flow via `v-bind="$attrs"`).
Conformance registries: no new elements, but the naming spec's CASES stay valid — verify counts.

## 8. WCAG mapping (what reviewers will ask)

- **2.1.1** — wheel/pinch add nothing keyboard-less: Enter/Escape already step the same ladder.
- **2.5.1** — pinch (multipoint) has tap (single-pointer) as its equivalent; wheel has click.
- **2.5.7** — no dragging is introduced (steps, not pans).
- **2.5.8** — unchanged: dense targets ride the Essential/Equivalent route (treeview pairing +
  breadcrumb + keyboard tree); breadcrumb buttons meet 24×24.
- **1.4.4 / 1.4.10** — plain scroll and off-chart ctrl+wheel page zoom are never captured (Z2/Z5);
  on-chart capture is scoped and buttonless-recoverable (move pointer off the chart).
- **1.4.13** — tooltip becomes dismissable (Escape), hoverable (pass-through + offset),
  persistent (no timer); shown on focus.
- **4.1.2** — zoom state is content (breadcrumb) and an event (`hierarchy-zoom` → announcer),
  not an ARIA value; no `role="slider"` because there is no numeric zoom level.
- Reduced motion — unchanged (tween already collapses to instant).

## 9. Spikes (gate — throwaway, verdicts recorded here)

| # | Question | Pass criterion | Verdict |
|---|---|---|---|
| S4 | Under `touch-action: pan-x pan-y`, do two touch pointers deliver un-cancelled move streams (Chromium/Firefox/WebKit touch emulation + one real device) — or does the browser consume the second finger as pan (`pointercancel`)? | Two concurrent `pointermove` streams with stable `pointerId`s while one-finger scroll stays native | **PASS (Chromium)** |
| S5 | Manual: real-Safari (macOS) trackpad pinch arrives as `wheel {ctrlKey: true}` (verified in WebKit source r277772; absent from release notes) | Pinch over the chart steps the ladder in Safari ≥15 | — (manual, user hardware) |

**S4 measured 2026-08-14** (Playwright Chromium, CDP `Input.dispatchTouchEvent`, throwaway
harness `docs/prd/_spike-pinch/`, deleted after): under `pan-x pan-y` a two-finger spread
delivered 2 pointerdowns + 20 moves across both ids with **zero `pointercancel`**, while a
one-finger swipe was consumed by the browser (1 move → `pointercancel`, page scrolled 247 px) —
exactly the desired split; the `touch-action: none` control confirmed the harness detects the
difference (all swipe moves delivered, no scroll). The 2016 W3C-thread fear (Chrome consuming
the second finger as one-finger pan) does not hold on current Chromium. Firefox/WebKit expose no
multi-touch synthesis in Playwright — deferred to the M8 real-device check; the M5
implementation treats any mid-gesture `pointercancel` as gesture-abandon, so a divergent engine
degrades to tap (never breaks).

## 10. Testing

- Core: table-driven `fitArcLabel`/`fitCellLabel` specs (fit/truncate/suppress boundaries, the
  measured coverage geometry as a regression case: 420 px host, 11 rings → label count collapses
  from 197 to the readable set).
- Element (`.aria.spec.ts` + a new gestures spec, jsdom): wheel steps with synthetic
  `WheelEvent{ctrlKey, deltaMode variants}` (in/out, accumulate, no-capture without modifier,
  `zoom-gestures="none"`); tooltip on focusin + Escape ordering (dismiss then zoom-out);
  `aria-hidden` on labels and hint; breadcrumb roles/names/24px and outside-the-tree assertion;
  label suppression across all three layouts.
- Pinch: unit-test the ladder math (distance→steps with hysteresis) pure; pointer plumbing in
  e2e touch emulation (S4's harness graduates into the suite if S4 passes).
- e2e (`tools/e2e-shared/charts-suites.ts`): ctrl+wheel over the icicle (bbox-safe layout per
  the donut-hole trap) re-roots and fires `hierarchy-zoom`; plain wheel scrolls the page and
  shows the hint; focus tooltip visible; **the real 1,603-node workspace coverage tree as a demo
  dataset in all three demo pages** (in the ng demo since 2026-08-14:
  `apps/ng-bootstrap-demo/src/assets/coverage-tree.json` behind a "Dataset" switcher —
  reproduces the speckling exactly; doubles as the perf canary).
- Axe registry: re-run existing entries; breadcrumb state added to the interact hook.
- The usual: batch every suite into one final sweep; verify milestones by reading +
  `tsc --noEmit`.

## 11. Versioning

Breaking: `label-min-area` attribute removed; `arcLabelVisible` removed from `charts/core`;
`--mp-hierarchy-chart-label-color` css token removed (L7).
Major bumps per house policy or documented-breaking minor per the release notes convention used
for #402 — decide at release. New dependencies: **none**.

## 12. References

Investigation reports (2026-08-14, this repo's agent team) ·
[gazebo SunburstChart.jsx](https://github.com/codecov/gazebo/blob/main/src/ui/SunburstChart/SunburstChart.jsx) ·
[codecov graphs docs](https://docs.codecov.com/docs/graphs) ·
[Observable zoomable sunburst](https://observablehq.com/@d3/zoomable-sunburst) ·
[ECharts sunburst `nodeClick`/`label.minAngle` & treemap `roam`/`visibleMin`](https://echarts.apache.org/en/option.html) ·
[Highcharts sunburst `dataLabels.filter` arc-length demo](https://www.highcharts.com/demo/ios/sunburst) ·
[vasturiano sunburst-chart (`labelOrientation: 'auto'`, char-fit)](https://github.com/vasturiano/sunburst-chart) ·
[FoamTree API (wheel zoom, label reveal)](https://get.carrotsearch.com/foamtree/latest/api/) ·
[webtreemap thresholds](https://github.com/evmar/webtreemap) ·
[WebKit changeset 277772 (pinch → ctrl+wheel)](https://trac.webkit.org/changeset/277772/webkit) ·
[Dan Burzo, "Pinch me, I'm zooming"](https://danburzo.ro/dom-gestures/) ·
[MDN wheel event / addEventListener passive semantics](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event) ·
[W3C pointer-events two-finger pan divergence](https://lists.w3.org/Archives/Public/public-pointer-events/2016OctDec/0126.html) ·
[WCAG 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html) ·
[WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) ·
[WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) ·
[Chrome re-rastering composited layers](https://developer.chrome.com/blog/re-rastering-composite) ·
[ACT rule 307n5z (no name/role on focusable descendants of role=img)](https://act-rules.github.io/rules/307n5z/)
