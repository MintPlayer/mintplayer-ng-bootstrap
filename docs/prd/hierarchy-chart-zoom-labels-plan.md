# Plan — `mp-hierarchy-chart` zoom gestures + label decluttering

PRD: [hierarchy-chart-zoom-labels.md](./hierarchy-chart-zoom-labels.md)
Status: **Not started** (2026-08-14).

## Conventions (these still bite — inherited from charts-wc-plan.md)

- After any `.styles.scss` edit: `npx nx run mintplayer-web-components:codegen-wc` or the change
  is invisible; generated `*.styles.ts` is gitignored — never stage it.
- SVG fragments in lit templates use the `svg` tagged literal, not `html`.
- jsdom has no SVG geometry APIs and no 2D canvas — the label engine is pure arithmetic (PRD L2);
  do not reintroduce `getBBox`/`getComputedTextLength`/`measureText` in a "small fix".
- jsdom has no ResizeObserver — the host-scale measurement guards on `typeof ResizeObserver` and
  falls back to a deterministic injectable scale so specs stay exact.
- No `container-type` on chart hosts (charts-wc D9); host scale comes from ResizeObserver.
- No `preventDefault()` on a touch `pointerdown` (kills the synthesized click that drives
  tap-to-re-root); `touch-action` is frozen at `touchstart`.
- Wheel listener: imperative `addEventListener('wheel', …, { passive: false })` (carousel /
  splitter precedent), `preventDefault()` only on consumed events (PRD Z5).
- e2e through Nx only (`npx nx e2e <app>-bootstrap-demo-e2e --grep=charts`), never raw
  `npx playwright test`. Nx on Windows: `NX_ISOLATE_PLUGINS=false NX_DAEMON=false`, vitest
  `--pool=threads`.
- Batch ALL suites into one final sweep (M8). Verify milestones by reading + `tsc --noEmit`.
  Commit per milestone; **push once** at the very end.
- No new branch or PR without explicit permission.

## Ordering rationale

S4 gates only M5 (pinch), so it runs early but blocks nothing else. M1 (core label engine) is
pure and everything visual sits on it. M2 (element label integration + constant-px sizing) fixes
the user-visible speckling and is independently shippable. M3 (tooltip) and M4 (wheel) touch the
same event handlers, so they land in that order (Escape ordering in M3 is a prerequisite for
M4's keyboard story staying coherent). M6 breadcrumb is independent UI. M7 wrappers/demos/e2e
needs the final API. M8 is the single sweep.

---

## S4 — Spike: two-finger pinch under `touch-action: pan-x pan-y` [PRD §9]

Throwaway harness (pattern: `docs/prd/_spike-*` in charts-wc, deleted after verdicts).

- [ ] Minimal page: an element with `touch-action: pan-x pan-y`, pointer listeners logging
      `pointerId`/type/`pointercancel`. Playwright touch emulation ×3 engines: two-finger
      sequences via CDP `Input.dispatchTouchEvent` (Chromium) / `page.touchscreen` where
      available; assert two concurrent un-cancelled `pointermove` streams AND one-finger swipe
      still scrolls the page natively.
- [ ] One real-device check (Android Chrome or iOS Safari — user hardware, note verdict).
- [ ] Record verdict in PRD §9. PASS → M5 in scope. FAIL → strike M5, PRD Z6 fallback stands
      (tap is the touch zoom); remove `'pinch'` from the `zoom-gestures` default and docs.
- [ ] S5 (manual, user hardware): real-Safari trackpad pinch arrives as `wheel {ctrlKey}` and
      steps the ladder. Record verdict; no code depends on it (Z2 handles it identically).

## M1 — `charts/core` label engine [PRD §6.3, L2, L3]

Files: `libs/mintplayer-web-components/charts/core/src/arc.ts` (+spec), `src/index.ts`.

- [ ] `fitArcLabel(name, sweepRad, r0Px, r1Px, fontPx)` → `{ visible, text }`: arc length at
      label radius `(r0+r1)/2 × sweep` vs `chars × 0.6 × fontPx` (+ padding), ring thickness
      `r1−r0 ≥ fontPx × 1.2`, ≥4-chars floor, ellipsis truncation to the placeable count.
- [ ] `fitCellLabel(name, wPx, hPx, fontPx)` → same shape (height `≥ fontPx × 1.4`, width ≥
      ~3 chars; truncation left to CSS ellipsis — return `visible` only).
- [ ] Contrast math (PRD L7, §6.4) in `color.ts`: `relativeLuminance(color)` (WCAG formula,
      parse the hex/rgb() forms `colorScale` already emits), `composite(fg, bg, alpha)`,
      `contrastText(surface, onLight, onDark)` picking the higher contrast ratio.
- [ ] Delete `arcLabelVisible` (breaking, PRD §7); keep `arcLabelTransform`.
- [ ] Table-driven specs incl. the measured regression geometry: 420 px host / 11 rings /
      default font ⇒ the old 197-label case collapses to only arcs that genuinely fit; contrast
      specs incl. the report's motivating cases (white page + light-green leaf at .6 opacity ⇒
      dark text; dark page + same leaf ⇒ white text; mid-tone red ⇒ whichever ratio wins).
- [ ] `tsc --noEmit`. **Commit.**

## M2 — Element label integration + constant-px sizing [PRD §6.3, L1, L4–L6]

Files: `charts/hierarchy/src/components/mp-hierarchy-chart.ts`, `src/styles/*.scss`.

- [ ] Host-scale measurement: ResizeObserver on the host → device px per viewBox unit;
      `typeof ResizeObserver` guard with deterministic fallback scale; re-render (and re-fit) on
      resize. `label-font-size` attr (default 12) → `.arc-label` font-size set in viewBox units
      = `fontPx / scale`; cell font uses the px value directly.
- [ ] Sunburst: replace `arcLabelFits` (the TAU-unit call site) with `fitArcLabel` fed device-px
      radii; render the returned (possibly truncated) text; `aria-hidden="true"` on every
      `<text class="arc-label">` (L6).
- [ ] Icicle/treemap: gate `renderCell`'s label span (and the icicle focus cell, treemap header
      excepted) on `fitCellLabel`.
- [ ] Contrast-aware label color (PRD L7, §6.4): backdrop resolution walk (host → parent, shadow
      roots via `.host`, first opaque computed `background-color`; jsdom fallback white; the
      `backdrop` attr short-circuits), re-resolved once per render cycle; per-node
      `fill` composited at rendered opacity → `contrastText` from the
      `--mp-hierarchy-chart-label-on-light`/`-on-dark` tokens; applied to arc labels AND cell
      labels; remove the `--mp-hierarchy-chart-label-color` token from SCSS + docs.
- [ ] Remove `label-min-area` attr/prop (+ from `observedAttributes`); update the ng demo
      snippet if it names it.
- [ ] SCSS: font-size custom property plumbing; **rerun codegen-wc**.
- [ ] Update existing aria/unit specs that mounted with `label-min-area`; add suppression
      specs ×3 layouts. Verify by reading + `tsc --noEmit`. **Commit.**

## M3 — Tooltip: focus channel + Escape ordering + clamping [PRD §6.4, T1–T2]

- [ ] `focusin`/`focusout` on the tree container → show/hide tooltip positioned from the focused
      segment's `getBoundingClientRect()` centre, clamped inside the host (also clamp the
      pointer path, currently unclamped); offset so it never sits under the pointer.
- [ ] Keydown ordering: Escape with visible tooltip → dismiss + stop propagation of the zoom-out
      branch; next Escape zooms out. Pointer re-entry / focus move re-shows.
- [ ] Specs: focus shows/hides, Escape ordering both presses, tooltip stays `aria-hidden`, no
      `aria-describedby` appears. **Commit.**

## M4 — Wheel ladder + hint overlay [PRD §6.1, Z1–Z5]

- [ ] `zoom-gestures` attr (`'wheel pinch'` default) parsed to a set; imperative non-passive
      `wheel` listener on `.chart` (connected/disconnected lifecycle).
- [ ] Normalizer: `deltaMode` multipliers (pixel 1 / line 16 / page = host height), clamp,
      accumulate; step at ~100 px; reset on direction flip + idle timeout. Consumed events
      (modifier held AND a step taken or accumulating) `preventDefault()`; everything else
      passes through untouched.
- [ ] Step-in: hovered node → `pathTo` → focus's direct child on that path → `zoomTo`; centre/
      whitespace no-op. Step-out: `zoomOut()`. Mid-tween retarget allowed (existing behavior).
- [ ] Hint overlay: plain wheel over the chart → transient `aria-hidden` overlay with
      `zoom-hint-label` (⌘ text via `navigator.platform`-ish check), auto-fade, reduced-motion
      → no fade animation; never shown when `zoom-gestures` excludes wheel.
- [ ] Specs (jsdom `WheelEvent`): in/out stepping, accumulation across small deltas, line-mode
      normalization, no capture without modifier, `'none'` disables, hint appears/fades,
      `hierarchy-zoom` fires with the right node. **Commit.**

## M5 — Pinch ladder [PRD §6.2, Z6 — only if S4 PASSED]

- [ ] `touch-action: pan-x pan-y` on `.chart` (SCSS + codegen); two-pointer `Map` bookkeeping
      (pointerdown/move/up/cancel), no `preventDefault` on pointerdown; distance-ratio ladder
      with hysteresis (×1.3 in / ×0.77 out, re-based per step), midpoint → descent target.
- [ ] Pure ladder math unit-tested (ratios → steps); pointer plumbing exercised in e2e touch
      emulation (S4 harness graduates into `charts-suites.ts`).
- [ ] Tap-to-re-root regression spec (synthesized click still works). **Commit.**

## M6 — Breadcrumb [PRD §6.5, B1]

- [ ] `show-breadcrumb` attr; `<nav aria-label=${breadcrumbLabel}>` above the chart, outside the
      `role="tree"` container: `<button>` per ancestor (≥24×24) → `zoomTo`; last item static
      text; root name falls back to `input-label`; names via `labelFormatter`/node names.
- [ ] Specs: roles/names, outside-the-tree assertion (`closest('[role="tree"]') === null`),
      re-root wiring, hidden when attr absent. **Commit.**

## M7 — Wrappers, demos, registries, e2e [PRD §7, §10]

- [ ] Angular: `input()`s + `effect()`s for `zoomGestures`, `labelFontSize`, `showBreadcrumb`,
      `zoomHintLabel`, `breadcrumbLabel` (string labels guarded `!== undefined`); wrapper spec
      additions (signal-driven host, never a mutated field).
- [ ] React/Vue: scalar props flow automatically — verify with one passthrough assertion each;
      no new events.
- [ ] Demos ×3 apps: the ng demo already has the real fixture (added 2026-08-14: the workspace's
      own coverage tree, 1,603 nodes / 803 leaves / depth 11, captured from
      coverage.mintplayer.com into `apps/ng-bootstrap-demo/src/assets/coverage-tree.json`, lazily
      fetched behind a "Dataset" switcher on the charts page) — port the same JSON + switcher to
      the React and Vue charts pages; document the wheel/pinch gestures and Escape ordering in
      the keymap `<details>`; breadcrumb shown in the ng demo.
- [ ] Conformance registries: counts re-verified (no new elements); naming spec CASES untouched.
- [ ] `tools/e2e-shared/charts-suites.ts`: ctrl+wheel re-root on the icicle (donut-hole
      bbox trap — never click sunburst arcs by default point), plain-wheel page-scroll + hint,
      focus tooltip, breadcrumb re-root, large-dataset label-count sanity (`text.arc-label`
      count « leaf count). Axe interact hook: breadcrumb state. **Commit.**

## M8 — Batched verification sweep (only now; one pass)

```bash
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run mintplayer-web-components:codegen-wc
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-web-components
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-react-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-vue-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-web-components -- --pool=threads
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-react-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-vue-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build ng-bootstrap-demo
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx e2e ng-bootstrap-demo-e2e --grep=charts
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx e2e react-bootstrap-demo-e2e --grep=charts
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx e2e vue-bootstrap-demo-e2e --grep=charts
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run-many -t e2e-a11y --parallel=1
```

- [ ] Version bumps (breaking: `label-min-area` + `arcLabelVisible` removed — decide
      major-vs-documented-minor at release per #402 precedent).
- [ ] **HUMAN:** S5 Safari pinch check; real-device pinch (if M5 shipped); keyboard-only pass of
      tooltip Escape ordering; verify the coverage site's chart with the new package.
- [ ] Push once → PR (with permission).

## Risks

| Risk | Mitigation |
|---|---|
| S4 fails → no raw pinch on touch | Pre-agreed fallback (PRD Z6): tap IS the touch zoom; wheel + breadcrumb unaffected |
| ctrl+wheel capture annoys page-zoom users over the chart | Scoped to the hovered chart only; hint overlay explains; `zoom-gestures="none"` opts out; recorded WCAG 1.4.4 reasoning in PRD §8 |
| Char-count heuristic mis-thresholds proportional-font edge cases | Failure mode is a slightly-early suppressed/truncated label, never overflow; constants tunable via `label-font-size`; upgrade path to measured text documented as rejected-for-now (jsdom) |
| ResizeObserver loop / re-fit churn on resize | Debounce to rAF; scale change below epsilon skips re-render |
| Removing `label-min-area` breaks a consumer call site | Breaking-changes-OK house rule; release notes + demo snippets updated in M7 |
| Backdrop auto-detect misses images/gradients or goes stale across a live theme flip | `backdrop` attr override; re-resolve per render (self-corrects on next interaction); worst case is one render of legible-but-suboptimal contrast |
| Escape ordering conflicts with future overlay stacking | Ordering lives in one keydown branch with a spec asserting both presses |

## Explicitly rejected (do not resurrect casually)

- **Geometric scale/pan zoom (viewBox or transform)** — PRD §2/§4: requires pan + 2.5.7 visible
  pan controls, `touch-action: none` (steals page scroll), unconditional ctrl+wheel capture
  (1.4.4), compositing blur risk, per-frame label re-fit; semantic re-root delivers the actual
  goal (labels appear as you zoom) at none of that cost, and matches every surveyed product.
- **Plain-wheel zoom capture** — FoamTree's documented mistake; page scroll must survive.
- **Safari GestureEvent path** — redundant since Safari 15 (WebKit r277772).
- **`+`/`−` zoom buttons** — no numeric zoom level exists; tap/click is already the
  single-pointer equivalent (2.5.1); breadcrumb covers "out".
- **Canvas `measureText` fitting** — jsdom has no 2D context; char-count heuristic is the
  vasturiano-proven default and keeps D8's every-path-jsdom-testable property.
- **`textLength`/`lengthAdjust` squeezing, `<textPath>` curved labels** — broken-glyph rendering
  / doubled node count; re-affirmed from charts-wc.
- **`aria-describedby` → tooltip** — double-speech against the treeitem's `aria-label`
  (one message, one channel); tooltip stays `aria-hidden`.
- **`role="slider"` zoom announcements** — no numeric zoom value; state is the breadcrumb +
  the existing live announcement.
- **Text halo (`paint-order: stroke`) instead of computed contrast color** — with fitted labels
  (L2) the text sits on its own known fill, so per-surface contrast suffices; halos at 12px read
  as clutter. Revisit only if a label may again straddle surfaces.
- **Theme-token label color (`--mp-hierarchy-chart-label-color`)** — the wrong axis: label
  contrast depends on the data-colored fill under the text (plus the backdrop through leaf
  opacity), not on the page theme; white-on-light-page speckling measured 2026-08-14.
