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

- [ ] Extend `discoverEntries()` in all three vite configs to recurse one level into namespace
      dirs (a dir without `index.ts`+`src/index.ts` whose children have them) → entry names like
      `charts/hierarchy/index`.
- [ ] Port `generateSubpathExports` to the React and Vue configs (fixes the latent bug: their
      built package.json has only `"."` — deep imports fail for npm consumers today; #383 fixed
      only the WC lib).
- [ ] CEM/analyzer globs: add `charts/*/src/**`.
- [ ] Verify: scratch `charts/_probe/` entry appears in built WC package.json `exports`, and the
      React/Vue exports maps materialize with all existing entries; remove the probe. Type-check.
- [ ] **Commit.**

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

- [ ] `types.ts`: `HierarchyNode`, `TrendSeries`/`TrendPoint`, all event detail interfaces.
- [ ] `hierarchy-layout.ts`: `buildIndex` (id index, parent map, leaf-sum rollup — internal
      `value` counts only when childless), `partitionLayout` (Observable re-root math, value-desc
      sort, min-angle/min-size cull, level/setsize/posinset), `squarifyLayout` (Bruls).
- [ ] `arc.ts`: 12-o'clock convention, full-circle two-π-arc split, root wedge,
      `padAngle = min(sweep/2, 0.005)`, per-radius pad conversion, `max(r0, r1−1)` outer clamp.
- [ ] `scale.ts`: `linearScale`, `niceTicks` (1-2-5), `timeTicks` (boundary choice +
      `Intl.DateTimeFormat`); `color.ts`: clamped long-way HSL two-stop.
- [ ] Vitest: exhaustive, incl. **table-driven tick specs across ranges (day→decade) and
      locales**, squarify vs published reference rects. No DOM anywhere.
- [ ] **Commit.**

## M2 — `mp-hierarchy-chart` static render, 3 layouts [PRD §5.3, D4, D9, D14, D16]

Files: `charts/hierarchy/src/components/mp-hierarchy-chart.ts`,
`src/styles/hierarchy-chart.styles.scss`, barrels.

- [ ] Element skeleton from treeview anatomy: guarded define, `HTMLElementTagNameMap`,
      static-getter `observedAttributes`, `data` setter precompute, `layout` attr.
- [ ] Sunburst projection: `svg` literal, keyed `repeat` of `<path>`, rotated labels
      (`label-min-area`), leaf opacity .6 / folder 1, visible labelled center control.
- [ ] Icicle + treemap projections: absolutely-positioned divs, `text-overflow: ellipsis`
      labels, root-cell / path-header zoom-out controls, `min-size` cull.
- [ ] SCSS: `--mp-hierarchy-chart-*` tokens with `--bs-*` fallbacks, `* { box-sizing }`,
      `width: 100%; aspect-ratio: 1` host, reduced-motion media query, focus-ring styles.
- [ ] Run codegen-wc. Verify: type-check + scratch render of all 3 layouts in the ng demo
      (light + dark, Firefox too).
- [ ] **Commit.**

## M3 — Hierarchy interaction [PRD §5.3, D6, D10]

- [ ] Delegated hover → shadow tooltip (aria-hidden) + `hierarchy-node-hover`.
- [ ] Click: re-root with tween (rAF for SVG / CSS transition for divs; `transition-duration`,
      reduced-motion → 0), zoom-out controls, leaf → `hierarchy-node-select`; `root-id`
      controlled + `hierarchy-zoom`; `zoomTo(id)`; state preserved across `layout` switches.
- [ ] Verify: manual pass in ng demo across all 3 layouts; type-check.
- [ ] **Commit.**

## M4 — Hierarchy ARIA + keyboard [PRD §6; shaped by S1 verdict]

- [ ] `role="tree"` + `input-label` on the container; per-node `treeitem` with
      level/setsize/posinset/expanded/busy; localized name template.
- [ ] Roving tabindex + keymap (identical across layouts: siblings wrap, Down/Up child/parent,
      Enter re-root, Escape/Backspace out, Home/End, type-ahead); drawn focus ring (SVG) /
      `:focus-visible` (divs); focus restore by id across re-root and layout switch.
- [ ] `LiveAnnouncerController` (`omitRole: true`) announcing zoom in/out.
- [ ] `mp-hierarchy-chart.aria.spec.ts` — states both directions ×3 layouts, keymap, focus
      restore (treeview's `mount`/`flush`/`press` helpers).
- [ ] **Commit.**

## M5 — Hierarchy lazy children [PRD §5.3]

- [ ] `loadChildren` property; trigger on entering the rendered window; `aria-busy` +
      `data-loading`; `hierarchy-node-load-error`; specs for success/error/no-callback.
- [ ] **Commit.**

## M6 — `mp-trend-chart` render + axes [PRD §5.4]

Files: `charts/trend/src/components/mp-trend-chart.ts`, `src/styles/trend-chart.styles.scss`.

- [ ] SVG line/area generator over `series` (gaps at `y: null`), `stacked`, y domain
      (pinned or auto+nice), grid + axis ticks from core scales, goal line + label.
- [ ] SCSS tokens, `aspect-ratio: 16/9` host, reduced-motion. Codegen-wc. Verify in ng demo.
- [ ] **Commit.**

## M7 — Trend interaction [PRD §5.4]

- [ ] Delegated pointermove → nearest-point crosshair + tooltip (all series at that x) +
      `trend-point-hover`; click → `trend-point-select`.
- [ ] **Commit.**

## M8 — Trend ARIA + keyboard [PRD §6; S1-shaped]

- [ ] `role="group"` + name + `summary`/`summaryFormatter`; focusable point markers with
      per-point labels; roving tabindex (Left/Right point, Up/Down series, Home/End); drawn
      focus marker; legend buttons with `aria-pressed` (if built-in — PRD §12.2).
- [ ] `mp-trend-chart.aria.spec.ts`.
- [ ] **Commit.**

## M9 — `mp-sparkline` [PRD §5.5]

- [ ] Polyline + optional area + last dot; `role="img"` with generated
      first/last/min/max summary (locale-formatted) or `label` override; css tokens; no tab stop.
- [ ] `mp-sparkline.aria.spec.ts` (role + name only). Codegen-wc.
- [ ] **Commit.**

## M10 — Wrappers + demo pages [PRD §5.7, §8]

- [ ] Angular `libs/mintplayer-ng-bootstrap/charts/{hierarchy,trend,sparkline}/`: components with
      `bsForwardAria`, per-input `effect()`s writing element properties, `model('rootId')` on
      hierarchy, typed outputs, boilerplate `ng-package.json` per entry + barrels; wrapper specs
      (`setInput`, assert onto the `mp-*` element).
- [ ] React `libs/mintplayer-react-bootstrap/charts/*`: `createComponent` per element + event
      maps + barrels.
- [ ] Vue `libs/mintplayer-vue-bootstrap/charts/*`: SFCs, `inheritAttrs: false` +
      `v-bind="$attrs"`, `defineModel('rootId')`, onMounted/watch prop sync.
- [ ] Demo pages: ng under `pages/enterprise/charts/` (hierarchy with layout switcher +
      coverage-style dataset `color-min="60" color-max="80"` + paired `bs-treeview` as the
      SC 2.5.8 equivalent + keymap `<details>`; trend with goal line; sparklines inside a
      `bs-datatable`; live demos first, snippets last); React page + route; Vue view + route.
- [ ] Verify: all three demos by hand (keyboard pass included). **Commit.**

## M11 — Conformance registries + e2e [PRD §10]

- [ ] WC `_conformance/naming.spec.ts`: three new CASES entries.
- [ ] ng `aria-passthrough.spec.ts` WRAPPERS + count bump; React
      `attribute-passthrough.spec.tsx` + `.types.tsx` probes; Vue `attribute-passthrough.spec.ts`.
- [ ] Per-app e2e smoke (render, zoom, layout switch, keyboard zoom-out; trend hover) —
      `networkidle` after goto; `axe.spec.ts` registry entries ×3 apps (NOT `axe-nojs.spec.ts`).
- [ ] **Commit.**

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
