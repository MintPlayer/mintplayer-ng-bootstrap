# Plan — `charts/` family (`mp-hierarchy-chart`, `mp-trend-chart`, `mp-sparkline`) + wrappers

PRD: [charts-wc.md](./charts-wc.md)
Status: **Not started**. Supersedes `sunburst-wc-plan.md` (never committed).

## Conventions (these still bite)

- After any `.styles.scss` edit: `npx nx run mintplayer-web-components:codegen-wc` or the change
  is invisible. Generated `*.styles.ts` is gitignored — never stage it.
- SVG *fragments* in lit templates need the `svg` tagged literal, not `html` (wrong namespace
  otherwise). First usage in the repo — no in-tree example to copy.
- `static get observedAttributes()` spreads `super.observedAttributes`; a static array breaks Lit.
- jsdom has no SVG geometry APIs (`getBBox`, `getComputedTextLength`) — the design avoids them
  (PRD D8); do not reintroduce one in a "small fix".
- No `container-type` on any chart host (PRD D9) — zero intrinsic inline size collapses the
  chart to 0px in shrink-to-fit contexts.
- Nx on Windows: `NX_ISOLATE_PLUGINS=false NX_DAEMON=false`, vitest `--pool=threads`.
- Batch the suites: one sweep at the end (M12). Verify intermediate milestones by reading +
  type-checking. Commit per milestone; **push once** at the very end.
- No new branch or PR without explicit permission.

## Ordering rationale

M0 (namespace plumbing) goes first so every later milestone creates files in their final
`charts/*` homes. S gates the SVG a11y architecture (sunburst arcs + trend point markers) and
must land before M4/M8 write the keyboard layers. M1 (pure core) is independent of S — its API
is identical under either S1 outcome — and everything else imports it. The hierarchy element
builds in layers (M2 static ×3 layouts → M3 interaction → M4 ARIA → M5 lazy); trend (M6–M8
internally layered the same way) only shares core, so it can start any time after M1, but is
sequenced after the hierarchy to keep one WIP element at a time. Sparkline (M9) is trivial and
absorbs any wait. Wrappers + demos (M10) need the final event surfaces; registries/e2e (M11)
need the demos; the sweep (M12) is last, once.

---

## M0 — `charts/` namespace plumbing [PRD §5.8, D11–D12]

Files: `libs/mintplayer-web-components/vite.config.mts`,
`libs/mintplayer-react-bootstrap/vite.config.mts`, `libs/mintplayer-vue-bootstrap/vite.config.mts`,
CEM config.

- [x] Extracted discovery + exports into shared `tools/vite/multi-entry.mts` (barrel mode for
      WC); all three configs import it; namespace dirs scanned one level deep.
- [x] `generateSubpathExports` now runs in React and Vue too — their dist package.json went
      from 1 export key (`.`) to 37 each; WC 45.
- [x] CEM glob + tsconfig.lib includes widened with `*/*/src/**` variants.
- [x] Verified with a throwaway `charts/probe/` in all three libs: `./charts/probe` export key
      with correct nested types/import paths in every dist; probe removed. **Committed.**

## S — Spikes (gate; throwaway; Chromium + Firefox + WebKit; verdicts go into PRD §9)

- [x] S1 — **PASS 3 engines + jsdom** (17/18 spike assertions green; the 1 failure was
      S3-webkit, below): roles/names/state via role queries + full aria snapshot, Tab +
      programmatic + arrow focus on `<path>`/`<circle>`; jsdom `SVGElement.focus()` works and
      `shadowRoot.activeElement` tracks it. **Gate cleared — §7 fallback RETIRED.**
- [x] S2 — **PASS**: focus AND element identity survive re-root; layout switch restored by
      node id via `updateComplete` (the M4 mechanism) in all 3 engines.
- [x] S3 — **PASS (criterion engines)**: Chromium avg 16.7 ms / 0 frames >50 ms; Firefox avg
      19.1 ms / 0 >50 ms. Headless WebKit-on-Windows datum recorded in PRD §9.3 (software
      rendering, not a criterion engine).
- [x] Verdicts recorded in PRD §9; spike files deleted. **Commit.**

## M1 — `charts/core` [PRD §5.2, D1–D3, D8, D13]

Files: `libs/mintplayer-web-components/charts/core/src/*.ts` + specs.

- [x] `types.ts`, `hierarchy-layout.ts` (buildIndex leaf-sum rollup, partitionLayout with
      subtree re-root — equivalent to Observable's clamp/remap for descendants — value-desc
      sort, minFraction cull, level/setsize/posinset, pathTo/levelOf; squarifyLayout per Bruls),
      `arc.ts` (full-circle two-π-arc split, root wedge, pad clamp + per-radius conversion,
      ring-gap clamp that yields '' for a zero-height ring, arcLabelTransform/Visible),
      `scale.ts` (linearScale, 1-2-5 niceTicks/niceDomain, calendar-boundary timeTicks with
      Intl labels), `color.ts` (clamped long-way HSL, hex + rgb() stops).
- [x] **42/42 vitest green** (arc 9, layout 12, scale 16, color 5) incl. table-driven ticks
      across day→decade ranges + en/nl locales; `tsc --noEmit` clean. Notable: squarify worst
      aspect in a unit square is 4.17 for Bruls' data (2.5 was for 6×4 — hand-verified).
- [x] **Committed.**

## M2 — `mp-hierarchy-chart` static render, 3 layouts [PRD §5.3, D4, D9, D14, D16]

Files: `charts/hierarchy/src/components/mp-hierarchy-chart.ts`,
`src/styles/hierarchy-chart.styles.scss`, barrels.

- [x] Element skeleton from treeview anatomy (guarded define, tag map, static-getter
      `observedAttributes`, accessor-per-property with `requestUpdate`, `data` setter rebuilds
      the core index once per write); `layout` runtime-switchable.
- [x] Sunburst: `svg` literals, keyed `repeat` of `<path role=treeitem>` with level/setsize/
      posinset/expanded, rotated labels behind the area threshold, leaf opacity .6, center
      circle + focus label. Icicle: focus cell column 0 + positioned div cells. Treemap:
      squarify with `childPadding`/`childHeaderSpace` insets (new core options) — branch tiles
      render as framed groups with a header strip.
- [x] Added to core while here: `colorValues` rollup — a branch without its own `colorValue`
      gets the value-weighted average of its children's, so coverage trees color folders like
      codecov without consumer precomputation (spec'd; core now 44/44).
- [x] SCSS tokens with `--bs-*` fallbacks, box-sizing, `aspect-ratio: 1` host, reduced-motion,
      cell/arc/center styles. Codegen + `tsc --noEmit` clean.
- [x] Verified via scratch vite page + playwright: all 3 layouts + re-rooted sunburst render
      correctly in Chromium AND Firefox (screenshots reviewed; folder rollup colors, treemap
      frames, icicle columns all correct). Dark mode rides `--bs-*` inheritance — verified for
      real in the demo app milestone. **Committed.**

## M3 — Hierarchy interaction [PRD §5.3, D6, D10]

- [x] Delegated click/pointermove/pointerleave on `.chart`; tooltip (aria-hidden, cursor-
      following, Intl-formatted "name — metric% — value" or `tooltipFormatter`) +
      `hierarchy-node-hover`; `labelFormatter` wired into arc/cell/center/breadcrumb labels.
- [x] Folder click → `zoomTo` (root-id reflected with loop guard) + `hierarchy-zoom`; leaf →
      `hierarchy-node-select`; zoom-out via center circle / icicle focus cell / treemap
      breadcrumb header (shows the focus path). Sunburst tween: rAF ease-out interpolating
      spans keyed by id (`_prevSpans` = drawn state, so mid-tween retargets restart cleanly);
      div layouts tween via CSS transitions on geometry (`--mp-hierarchy-chart-transition-
      duration`); reduced-motion → instant in both paths. `transition-duration` + `locale`
      attrs added.
- [x] Verified live via playwright MCP: all five paths (zoom in/out ×3 layouts, select,
      hover incl. weighted-metric tooltip 63.4% hand-checked); tsc clean. **Committed.**

## M4 — Hierarchy ARIA + keyboard [PRD §6; shaped by S1 verdict]

- [x] `role="tree"` on the in-shadow container (never the host), named via `input-label` with
      host `aria-label` winning; per-node `treeitem` with level/setsize/posinset/expanded and
      localized names ("src, 60%, 1,000 lines" — `metric-unit-label`/`value-unit-label` attrs,
      Intl via `locale`/inherited lang). **Zoom-out controls became real HTML `<button>`s
      OUTSIDE the tree container** (a role=tree may only own treeitems/groups — resolves PRD
      §12.1 as "button"): sunburst center overlay (disabled at root), treemap breadcrumb
      header; icicle keeps its focus cell as a tabindex=-1 treeitem.
- [x] Roving tabindex (one stop) + full keymap: sibling wrap, Down/Up rings, Enter (re-root /
      leaf select), Escape/Backspace (bubbles at root instead of swallowing), Home/End,
      500 ms type-ahead across rendered nodes. Focus ring: stroke on `.ring:focus-visible`
      (drawn indicator, not outline), inset outline on cells/buttons. Focus restored by node
      id across re-root AND layout switch; window-leaving focus falls to the first rendered
      node (rides the zoom announcement).
- [x] `LiveAnnouncerController` (`omitRole: true`) announces the new focus label on zoom;
      tooltip stays `aria-hidden` (one message, one channel).
- [x] `mp-hierarchy-chart.aria.spec.ts`: 16 specs ×3 layouts (structure, expanded both
      directions, keymap, focus survival, controls, announcement). **charts total 60/60
      green**; tsc clean. **Committed.**

## M5 — Hierarchy lazy children [PRD §5.3]

- [x] `loadChildren` property (typed `HierarchyChildrenLoader`); candidates = lazy nodes whose
      child ring is inside the rendered window (or the focus itself), kicked from `updated()`;
      `aria-busy` + `data-loading` pulse while in flight (reduced-motion kills the pulse);
      resolve merges children + re-rolls the index; reject → `hierarchy-node-load-error` once
      (failed set stops re-request loops), activation retries; without a loader a
      `hasChildren` node behaves as a leaf (never a dead zoom). Focus-node loads announce via
      `loading-label`.
- [x] 3 new specs (busy/resolve, reject-once/retry, no-loader-leaf); charts suite **63/63**;
      tsc clean. **Committed.**

## M6–M8 — `mp-trend-chart` (render + interaction + ARIA, one pass — single new file set)

Files: `charts/trend/src/components/mp-trend-chart.ts` (+aria.spec), `src/styles/*.scss`.

- [x] M6: line/area paths over `series` with gaps split by pointIndex continuity (nulls are
      dropped before placement), `stacked` running-sum plotting (aligned-x assumption
      documented), y domain pinned (`y-min`/`y-max`) or auto+nice incl. goal, grid + Intl y
      ticks + calendar x ticks from core scales, dashed goal line + label, default 8-color
      palette with per-series override. SCSS tokens, 16:9 host. NOTE: `transition-duration`
      dropped from the trend API (codecov ships no trend animation; record in PRD as-built).
- [x] M7: delegated pointermove → nearest-x crosshair + tooltip listing ALL series at that x
      (`tooltipFormatter` override) + `trend-point-hover`; click/Enter/Space →
      `trend-point-select`.
- [x] M8: svg `role="group"` named via `input-label` (host aria-label wins) +
      `summary`/`summaryFormatter` via same-tree `aria-describedby`; every decorative layer
      aria-hidden; points are focusable `role="button"` circles ("Coverage, Jan 8, 2026, 72")
      behind one roving tab stop — Left/Right walk the series, Up/Down jump to the nearest-x
      point of the prev/next series, Home/End; drawn focus dot (fill + stroke, no outline);
      roving stop survives data refresh by key. Built-in legend NOT shipped (PRD §12.2 →
      demo-side; revisit on demand). **8/8 aria specs green; verified visually (gap, goal
      line, two series, ticks) in the preview page. Committed.**

## M9 — `mp-sparkline` [PRD §5.5]

- [x] Polyline + optional area + last-value dot; null → gap (run split); `role="img"` with
      generated locale-formatted "first, last, lowest, highest" name, `label`/
      `summaryFormatter` overrides; no tab stop ever; `vector-effect: non-scaling-stroke` so
      the stretched viewBox keeps a crisp line; flat-series and empty-series safe.
- [x] 5 specs (role/name, overrides, gap+dot, area/empty, flat-no-NaN). Charts suite now
      **76/76**; tsc clean. **Committed.**

## M10 — Wrappers + demo pages [PRD §5.7, §8]

- [x] Angular `libs/mintplayer-ng-bootstrap/charts/{hierarchy,trend,sparkline}/`: components with
      `bsForwardAria`, one `effect()` per input writing element **properties**,
      `model('rootId')` on hierarchy re-synced from `hierarchy-zoom`, typed outputs,
      depth-adjusted boilerplate `ng-package.json` per entry + barrels; 3 wrapper specs
      (`setInput`, assert onto the `mp-*` element, incl. zoom → model round-trip and function
      props).
- [x] React `libs/mintplayer-react-bootstrap/charts/*`: `createComponent` per element with the
      event maps (`onHierarchyZoom`, `onTrendPointSelect`, …) + barrels.
- [x] Vue `libs/mintplayer-vue-bootstrap/charts/*`: SFCs, `inheritAttrs: false` +
      `v-bind="$attrs"`, `defineModel('rootId')` fed by `hierarchy-zoom`, per-prop
      onMounted/watch sync for objects and functions.
- [x] Demo pages: ng `pages/enterprise/charts/` (layout switcher, coverage dataset with
      `colorMin=60`/`colorMax=80`, paired `bs-treeview` as the SC 2.5.8 equivalent control that
      re-roots the chart, two keymap `<details>` blocks, trend with goal line, sparklines in a
      flags table, demos before snippets) + route + navbar item; React `ChartsPage` + lazy route
      + AppShell nav; Vue `ChartsView` + route + nav.
- [x] `tsc --noEmit` clean for ng + react libs (charts wrappers included). Visual/keyboard pass
      deferred to the M12 sweep with the demo apps running. **Commit.**

## M11 — Conformance registries + e2e [PRD §10]

- [x] WC `_conformance/naming.spec.ts`: 3 CASES entries + a new `setup` hook, because a chart has
      no role-bearing node until it has data. Two follow-ons this forced, both right:
      **`mp-sparkline`'s `label` became `input-label`** (host `aria-label` > `input-label` >
      `summaryFormatter` > generated summary) so it obeys the one house naming contract, and its
      data-derived default is registerable as a literal by using single-digit values
      (locale-invariant).
- [x] ng `aria-passthrough.spec.ts` +3 WRAPPERS (22 → 25); React
      `attribute-passthrough.spec.tsx` +3 CASES (12 → 15) and 3 `.types.tsx` bare-name probes;
      Vue registry +1 runtime representative — and its **static sweep glob was one level deep, so
      the whole `charts/` namespace would have opted out of the `inheritAttrs`/`$attrs` invariant
      invisibly**; now globs both depths.
- [x] Shared `tools/e2e-shared/charts-suites.ts` (accordion/carousel precedent) + 3 thin per-app
      specs: re-root by click, keyboard into the shadow SVG arc with Enter/Escape zoom (the S1
      risk, in a real browser), layout switch swapping SVG for HTML cells, trend point walking,
      sparkline named image. Waits on the rendered `[role="tree"]` rather than `networkidle`,
      since data arrives by property.
- [x] `axe.spec.ts` entries in all three apps (NOT `axe-nojs.spec.ts` — no no-JS tier), each
      walking all three layouts + the zoomed-in state. Pre-emptive fix while writing them: the
      sunburst's centring `<g>` now carries `role="none"`, so no unroled node sits between
      `role="tree"` and its treeitems.
- [x] **Commit.**

## M12 — Batched verification sweep (only now; one pass)

```bash
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx run mintplayer-web-components:codegen-wc
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-web-components
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-react-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build mintplayer-vue-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-web-components -- --pool=threads
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx test mintplayer-ng-bootstrap
NX_ISOLATE_PLUGINS=false NX_DAEMON=false npx nx build ng-bootstrap-demo
```

- [ ] All builds + suites green (record real counts here).
- [ ] Built package.json `exports` re-verified for all three libs (M0 regression check).
- [ ] e2e a11y configs for the three demo apps.
- [ ] **HUMAN:** keyboard-only pass (all 3 elements), Firefox smoke (flex shrink!), RTL smoke,
      NVDA/VoiceOver spot check of node names + zoom announcements.
- [ ] Version bumps: web-components 2.10.0 → 2.11.0, ng-bootstrap 22.13.0 → 22.14.0,
      react-bootstrap 19.14.0 → 19.15.0, vue-bootstrap 3.15.0 → 3.16.0.
- [ ] Push **once**, then read the single CI run.

## Risks

| Risk | Mitigation |
|---|---|
| S1 fails → SVG a11y architecture flips (sunburst + trend) | Fallback pre-designed (PRD §7, VCC-proven); icicle/treemap unaffected (D16); M1/M2 unaffected |
| Tween jank | Depth cap + culls; S3 measures both tween variants before M3 commits |
| Focus loss on re-root / layout switch | S2 proves keyed repeat, else manual restore by id |
| Time-axis ticks subtly wrong across locales/ranges | Pure `scale.ts` + table-driven specs (M1) before any element consumes them |
| First SVG-rendering WCs in repo — no precedent | Core is pure + unit-tested; treeview anatomy for everything non-SVG |
| Scope: three elements in one PR | Strict milestone layering; hierarchy fully lands (M2–M5) before trend starts; sparkline is deliberately last-and-smallest |

## Explicitly rejected (with reasons — do not resurrect casually)

- **A separate `@mintplayer/charts` package family (×4)** — investigated 2026-08-10: empty root
  barrels mean in-tree costs consumers zero bytes; a split costs ~40 config files, 4 version
  numbers and cross-package peer ranges for no identified consumer benefit; no UI component in
  this workspace has ever had its own package (phone-input #399 went in-tree even with runtime
  deps). The "charts identity" is the `charts/` namespace instead.
- **Adopting a chart library (Highcharts/ECharts/Plotly/Nivo/vasturiano/amCharts)** — Highcharts'
  OEM clause requires per-product approval by Highsoft (structurally impossible for an MIT npm
  library); amCharts forces branding onto consumers; Nivo is React-only; vasturiano injects CSS
  into `document.head` (dead in shadow DOM) with zero a11y code; ECharts is ~163 KB gz
  tree-shaken (46× the d3-micro route) with keyboard a11y closed as "not planned" — the WCAG
  layer would be hand-written in every scenario, against a scene graph we don't own.
- **d3 micro-packages (d3-hierarchy/-shape/-scale)** — user-confirmed 2026-08-10 (PRD D13): the
  math is ~250 lines of local pure functions and not domain knowledge worth a dependency.
- **Three separate hierarchy elements (mp-sunburst/mp-icicle/mp-treemap)** — user-confirmed
  2026-08-10 (PRD D14): one deep element with a `layout` attribute shares the data model, zoom
  state, ARIA contract and wrappers; three elements would triple the wrapper/spec surface for
  zero consumer benefit and forbid runtime view switching.
- **Donut/gauge, bubble/scatter, heatmap** — user-confirmed 2026-08-10 (PRD D15): no coverage
  product needs them; a bar communicates one percentage better; per-file bars are
  `bs-progress-bar`/CSS.
- **Codecov's coverage-sum arc sizing** — provably inverted salience (PRD §1.1), contradicted by
  their own backend; size by leaf `value`, color by metric.
- **OverlayController for chart tooltips** — built for dismissible focus-managing popups (Escape
  stack, focus return, document mousedown); a cursor-follower fights all of it.
- **`<title>` per node** — doubles node count and double-announces against `aria-label`.
- **`<textPath>` labels** — hidden-path + `href="#id"` plumbing across a shadow root; rotated
  `<text>` (sunburst) and CSS-ellipsis divs (cartesian) do the job.
- **`container-type` responsive behavior on chart hosts** — zero intrinsic inline size collapses
  the host (measured, shipped bug in input-group); viewBox/aspect-ratio scaling instead.
- **Canvas renderer** — depth-capped SVG/DOM stays far below the animated-SVG ceiling; canvas
  would cost the entire per-node ARIA story.
