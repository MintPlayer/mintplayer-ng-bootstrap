# PRD — `charts/` family: `mp-hierarchy-chart`, `mp-trend-chart`, `mp-sparkline` + wrappers

Status: **Implemented on `feat/charts-wc` — PR #401** (opened 2026-08-10, base `master`),
**CI green** (run 31383221321 — build, unit, API, e2e, axe gate, live-API e2e, dry-run publish).
All milestones complete; the only open item is the human keyboard/screen-reader pass (§13).
Supersedes `sunburst-wc.md` (2026-08-09, deleted before ever being committed) after the user
widened scope to the full chart roster on 2026-08-10.
Grounded in two 3-agent investigations: (1) codecov's open-source frontend
([codecov/gazebo](https://github.com/codecov/gazebo)) read at source level + repo precedent
survey + doc conventions; (2) packaging in-tree vs separate family, chart-library licensing, and
the chart inventory of codecov/Coveralls/SonarQube/Codacy/coverage.py/JaCoCo/Istanbul.
Plan: [charts-wc-plan.md](./charts-wc-plan.md)
Dependency work riding the same PR: [nx23-dependency-upgrade.md](./nx23-dependency-upgrade.md)

## 1. Problem

The workspace has no chart component of any kind — no data-driven SVG exists in any
`libs/mintplayer-web-components/*` element (the only SVG anywhere is hand-pasted static icon
constants, e.g. `libs/mintplayer-web-components/treeview/src/components/mp-treeview.ts:48`), and
no charting dependency exists in any package.json. A consumer building a codecov.io-style
coverage site has to leave the component system entirely.

The measured chart inventory of every real coverage product reduces to **three archetypes**:

1. **Hierarchy breakdown** — codecov's sunburst/icicle/grid (three views of the *same* flare
   tree), SonarQube's treemap. Coveralls does it as a tree table.
2. **Metric over time** — the one chart every SaaS product ships (codecov: three recharts area
   charts — its *entire* remaining chart surface; Codacy adds a goal line; SonarQube up to three
   series).
3. **Tiny inline trend** — codecov's sparkline in the flags/components/assets tables (theirs is
   literally a `<table>` with `clip-path` — no SVG, no library).

Everything else in those products is CSS: per-file coverage bars are divs with a percentage
width (`@mintplayer/ng-bootstrap/progress-bar` already covers this), line-level gutters are
colored backgrounds, KPI tiles are plain DOM, and PR comments carry no graphics at all.

The reference hierarchy implementation (codecov) is not copyable:

1. **Its arc sizing is wrong.** `SunburstChart/utils.js` passes `coverage` as the `sum()`
   accessor, so a folder's angle is the *sum of its descendants' coverage percentages*, not their
   line counts. A directory of 0%-covered files renders as a near-invisible sliver — the code most
   in need of attention is the least visible. Their own backend (`codecov-api/graphs/helpers/
   graphs.py`) sizes by `item["lines"]`, contradicting the frontend; no competitor sizes by
   percentage either.
2. **Its accessibility is a dead end.** No role, no name, no tabindex; one `<title>` per arc.
   They also abandoned testing it (`codecov.yml` ignores the component; a checked-in `note.txt`
   blames d3-in-jest).
3. Adopting a chart library instead was investigated and is rejected — see Non-goals.

## 2. Goals

1. A `charts/` namespace in all four packages with three Lit elements:
   - `mp-hierarchy-chart` (`@mintplayer/web-components/charts/hierarchy`) — one deep component,
     `layout="sunburst" | "icicle" | "treemap"`, sharing data model, color scale, zoom/re-root
     state, lazy loading, tooltip and ARIA-tree contract across all three projections.
   - `mp-trend-chart` (`charts/trend`) — line/area metric-over-time, multi-series, optional
     stacking and goal line, time + linear axes with locale-aware ticks.
   - `mp-sparkline` (`charts/sparkline`) — axis-less inline trend for table cells.
2. A shared `charts/core` entrypoint: pure-function geometry (partition, squarify, arc paths,
   scales/ticks, color interpolation) with **zero new dependencies**, fully unit-testable under
   jsdom, reusable by consumers building custom charts.
3. Full keyboard operation and WCAG 2.2 AA for all three elements.
4. Wrappers ×3 frameworks ×3 elements, aria-passthrough conformant, plus demo pages in the three
   demo apps.
5. Lazy child loading for the hierarchy (`loadChildren`) — codecov's v2 API (`report/tree`,
   `depth` default 1 + `path`) serves exactly this shape.

## 3. Non-goals

- **Not coverage components.** Data models are generic (weighted tree with a color metric;
  timestamped series); "coverage" is the demo scenario. No codecov API client.
- **No donut/gauge, bubble/scatter, heatmap.** Research-backed skip list (confirmed with the
  user, 2026-08-10): no coverage product needs them — codecov ships none, SonarQube's own new
  dashboard widget set drops the bubble, and a bar communicates one percentage better than a
  donut. Per-file coverage bars stay `bs-progress-bar`/CSS.
- **No d3 / charting dependency.** All math is local (`charts/core`); this also sidesteps
  jsdom's total lack of SVG geometry APIs. Reaffirmed against `d3-hierarchy`+`d3-shape` (ISC,
  ~11 KB gz — legitimate but ~250 lines of trig/ticks is not domain knowledge worth a
  dependency). Full library adoption is rejected outright: Highcharts' OEM clause requires every
  embedding product to be expressly approved by Highsoft (impossible for an MIT npm library with
  anonymous consumers), amCharts forces its branding onto downstream charts, and the
  license-clean survivors either lack a sunburst, are React-only (Nivo), break in shadow DOM
  (vasturiano injects CSS into `document.head`), or cost a measured ~163 KB gz tree-shaken with
  keyboard a11y closed as "not planned" (ECharts #18585).
- **No no-JS interactive tier and no DSD SSR chrome.** Proportional charts are meaningless
  without JS to compute geometry; no chart-like precedent ships one. Demo pages register in
  `axe.spec.ts` only, **not** `axe-nojs.spec.ts`.
- **No canvas renderer.** Depth-capped SVG/DOM stays far below the ~2k-animated-nodes ceiling.

## 4. Locked decisions

| # | Decision | Consequence |
|---|---|---|
| 1 | Size hierarchy nodes by summed **leaf `value`** (e.g. line count), never by the color metric | Avoids codecov's inverted-salience bug (§1.1); folders with many uncovered lines stay big and red |
| 2 | Color is a separate per-node/series `colorValue` through a clamped two-stop scale | Continuous gradient like codecov (red→green over a configurable domain), plus explicit `color` override |
| 3 | No new runtime dependency; local `charts/core` | Pure functions, vitest-friendly; no `rollupOptions.external` changes |
| 4 | Depth-capped hierarchy rendering: `max-depth` levels from the focused node (default 2), or `'auto'` for the full loaded depth | Default matches codecov and keeps the DOM small; the cap is a consumer choice, not a ceiling. `aria-level`/`-setsize`/`-posinset` are required either way, since a capped window never holds the full set |
| 5 | ARIA tree on the rendered nodes themselves; parallel-DOM fallback only if spike S1 fails | One source of truth for state; spike-gated (§7, §9) — S1 gates only the sunburst's SVG path nodes; icicle/treemap render HTML (D14) |
| 6 | Tooltips are self-positioned in the shadow root, **not** OverlayController and **not** `<title>` | OverlayController is built for dismissible focus-managing popups — wrong tool for a cursor-follower; `<title>` doubles node count and double-announces against `aria-label` |
| 7 | Sunburst labels are rotated `<text>`, not `<textPath>` | No hidden-path/ID plumbing, no `href="#id"`-across-shadow-root risk |
| 8 | No `getBBox()` / `getComputedTextLength()` anywhere | Culling by computed logical size; cartesian labels use CSS `text-overflow` — keeps every code path jsdom-testable |
| 9 | Hosts sized by `width: 100%` + `aspect-ratio` (hierarchy 1/1; trend 16/9 default) — **no `container-type`** | A `container-type` host contributes zero intrinsic inline size and collapses to 0px in shrink-to-fit contexts (CLAUDE.md, shipped bug in input-group) |
| 10 | Hierarchy re-root is controlled state: `root-id` attr/prop + `hierarchy-zoom` event | Clean two-way binding (`model()` in Angular, `v-model` in Vue); consumer can drive zoom from a breadcrumb |
| 11 | Ships **in-tree** in the four existing packages, not a separate charts family (confirmed with the user, 2026-08-10) | Empty root barrels mean unimported components cost consumers zero bytes; a split = ~40 config files + 4 versions for nothing; phone-input (#399) set the precedent even *with* deps |
| 12 | Nested **`charts/` namespace** entrypoints (confirmed with the user, 2026-08-10) | Angular: plain `ng-package.json` per entry (nested APF entrypoints are standard — `@angular/common/http/testing`); WC/React/Vue need the §5.8 discovery tweak |
| 13 | Geometry stays **zero-dependency** (confirmed with the user, 2026-08-10, over `d3-hierarchy`+`d3-shape`) | ~250 lines of local trig + a nice-ticks algorithm in `charts/core`, exhaustively unit-tested |
| 14 | **One `mp-hierarchy-chart`** with a `layout` attribute, not three elements (confirmed with the user, 2026-08-10) | One ARIA contract, one wrapper per framework, runtime view switching over the same data (codecov offers exactly these three views); icicle/treemap are projections, not components |
| 15 | Roster = hierarchy + trend + sparkline (confirmed with the user, 2026-08-10) | Donut/gauge explicitly declined; ships together per the one-release rule |
| 16 | Sunburst layout renders SVG paths; **icicle and treemap layouts render absolutely-positioned HTML divs** | Cartesian rects need no SVG: real HTML gives free `text-overflow: ellipsis` labels, known-good focus/roles (no S1 exposure), and CSS transitions for the zoom tween |

## 5. Core architecture

### 5.1 Element inventory

```
libs/mintplayer-web-components/charts/
  core/                                → @mintplayer/web-components/charts/core
    index.ts, src/index.ts
    src/types.ts                       → HierarchyNode, TrendSeries, TrendPoint, event details
    src/hierarchy-layout.ts            → rollup + partition + re-root + squarify (pure)
    src/arc.ts                         → arcPath + pad math (pure)
    src/scale.ts                       → linear scale + nice-ticks + time ticks (pure)
    src/color.ts                       → clamped long-way HSL two-stop scale (pure)
    src/*.spec.ts
  hierarchy/                           → @mintplayer/web-components/charts/hierarchy
    index.ts, src/index.ts
    src/components/mp-hierarchy-chart.ts (+ .aria.spec.ts)
    src/styles/hierarchy-chart.styles.scss
  trend/                               → @mintplayer/web-components/charts/trend
    index.ts, src/index.ts
    src/components/mp-trend-chart.ts (+ .aria.spec.ts)
    src/styles/trend-chart.styles.scss
  sparkline/                           → @mintplayer/web-components/charts/sparkline
    index.ts, src/index.ts
    src/components/mp-sparkline.ts (+ .aria.spec.ts)
    src/styles/sparkline.styles.scss
```

`charts/core` is a real published entrypoint (types + pure math, no element) — consumers get the
same primitives for custom charts. Elements import it as normal cross-entrypoint source.

### 5.2 `charts/core` — pure, no DOM

- `buildIndex(root)`: id→node index, parent map, **leaf-sum rollup** (an internal node's own
  `value` counts only when it has no children — D1), value-desc sibling sort.
- `partitionLayout(root, focusId, maxDepth)`: flat visible-node list with normalized
  `{ x0, x1, y0, y1, level, setsize, posinset }`. Re-root math is Observable's:
  `x' = clamp01((x − p.x0) / (p.x1 − p.x0))`, `y' = max(0, y − p.depth)`. Consumed by sunburst
  (x→angle, y→ring) *and* icicle (x→height, y→column) — same output, two projections.
- `squarifyLayout(root, focusId, maxDepth)`: squarified treemap rects for the focused node's
  subtree (Bruls et al. — ~60 lines).
- `arcPath(cx, cy, r0, r1, a0, a1)`: annular sector `d` string. Angle 0 = 12 o'clock, outer
  sweep=1 / inner sweep=0, `large-arc-flag = sweep > π`. **Full-circle case** (sweep ≥ 2π − ε):
  split into two π arcs — SVG silently drops an arc whose endpoint equals its start (SVG 2
  §9.5.1). Root wedge (`r0 === 0`): collapse inner arc to `L cx cy`.
  Padding: `padAngle = min(sweep/2, 0.005)` (codecov's clamp), converted per-radius via
  `asin(padRadius · sin(padAngle/2) / r)` with `padRadius = √(r0² + r1²)`;
  `outerRadius = max(r0·R, r1·R − 1)` so a sub-1px ring can't invert.
- `linearScale` + `niceTicks(min, max, count)` (the standard 1-2-5 algorithm) +
  `timeTicks(from, to, count, locale)` choosing year/month/week/day boundaries and formatting
  via `Intl.DateTimeFormat` — the fiddly part of the trend chart, isolated and spec'd hard.
- `colorScale(min, max, from, to)`: clamped long-way HSL interpolation (codecov: `#fe0000` →
  `#21b577`, domain 60..80 from their yml; our default domain 0..100).
- Sunburst label transform `rotate(mid−90) translate(rMid,0) rotate(mid<180 ? 0 : 180)`;
  visibility = normalized area `(y1−y0)·(x1−x0) > label-min-area` (default 0.03, Observable's
  threshold). Min-angle cull (default 0.2°) drops sub-visible arcs from the DOM entirely.

### 5.3 `mp-hierarchy-chart`

**Shared across layouts** (this is why it's one element — D14): `data` setter precomputing the
§5.2 index once per write; `root-id` controlled re-root + `hierarchy-zoom`; depth cap; color
scale; tooltip + `hierarchy-node-hover`; `hierarchy-node-select` on leaves (the WC imposes no
navigation — consumer decides); lazy `loadChildren` with `aria-busy`/`data-loading` and
`hierarchy-node-load-error` (mirrors `mp-treeview`); the full ARIA-tree contract (§6); the zoom
tween (rAF for SVG, CSS transitions for divs) at `transition-duration` (default 300 ms, forced 0
under `prefers-reduced-motion`); focus restore by node id across re-root.

**Per-layout projection:**

- `layout="sunburst"` (default): lit `svg` fragments (first repo usage — fragments interpolated
  with `html` get the wrong namespace), keyed `repeat` of `<path>` per node, rotated `<text>`
  labels, leaf opacity .6 / folder 1 (codecov), a **visible labelled center control** (≥24×24)
  zooming out one level.
- `layout="icicle"`: partition output projected to columns (depth → x, share → y/height),
  absolutely-positioned divs, horizontal labels with `text-overflow: ellipsis`, the root column
  cell doubles as the zoom-out control.
- `layout="treemap"`: squarify output as divs; a header bar showing the focused node's path acts
  as the zoom-out control and breadcrumb.

Switching `layout` at runtime preserves `root-id`, selection and focus (same node ids, same
state — only projection changes). Host: `width: 100%; aspect-ratio: 1` (icicle/treemap accept
any aspect via the normal CSS `aspect-ratio` property on the host).

### 5.4 `mp-trend-chart`

- Data: `series: TrendSeries[]` — `{ id, label, color?, points: { x: number | Date, y: number
  | null }[] }`, property-only. `y: null` renders a gap (forward-filling is the consumer's
  choice, codecov does it client-side before the chart).
- `stacked` attr for stacked areas (codecov's bundle chart); `y-min`/`y-max` to pin the domain
  (0–100 for coverage; auto+nice otherwise); `goal` + `goal-label` render Codacy's horizontal
  goal line; `area` toggles line vs area fill.
- Axes from `charts/core` scales: linear Y with `niceTicks`, time X with `timeTicks` +
  `Intl.DateTimeFormat(locale)`; grid lines from the same tick arrays.
- Interaction: delegated pointermove → nearest-point crosshair + shadow tooltip (all series at
  that x, like recharts) + `trend-point-hover`; click/Enter → `trend-point-select`.
- Keyboard: one tab stop; Left/Right walk points, Up/Down switch series, Home/End first/last;
  focused point gets a drawn marker ring and its `aria-label` announces
  `"{series}, {date}, {value}"`. Rendering is SVG (`<path>` from a local line/area generator);
  the focusable point markers are `<circle>` elements — covered by the same S1 spike.
- Host: `width: 100%; aspect-ratio: 16/9` default.

### 5.5 `mp-sparkline`

- Data: `points: (number | null)[]` (+ optional `x` labels array for the accessible summary),
  property-only. `<svg viewBox>` polyline + optional area fill + last-value dot; stroke/fill from
  css custom props; no axes, no interaction, no tab stop.
- **Not keyboard-interactive by design**: it is a non-interactive graphic — `role="img"` with an
  accessible name from `label`/`summaryFormatter` (default: "first, last, min, max" formatted
  with the element locale). Consumers needing exploration put the real numbers in the table cell
  next to it (which is where sparklines live anyway).

### 5.6 i18n

All announced strings route through attributes with English defaults (`zoom-out-label`,
`loading-label`, unit labels, keymap announcements). Number/date formatting via
`Intl.NumberFormat`/`Intl.DateTimeFormat` with a `locale` attribute; when unset, resolve from the
element's inherited `lang` (never hard-code `en-US` as a silent default — the scheduler locale
bug).

### 5.7 Wrappers

- **Angular** (`bs-hierarchy-chart`, `bs-trend-chart`, `bs-sparkline` under
  `libs/mintplayer-ng-bootstrap/charts/*`): `CUSTOM_ELEMENTS_SCHEMA`, side-effect WC import,
  `bsForwardAria`, one `effect()` per input writing element **properties** (never attribute
  bindings), `model('rootId')` on the hierarchy, typed outputs re-emitting the details. No CVA —
  none is a form control.
- **React**: `@lit/react` `createComponent` per element with the event maps; object/function
  props flow as element properties automatically.
- **Vue**: SFCs with `inheritAttrs: false` + `v-bind="$attrs"`, `defineModel('rootId')` on the
  hierarchy, object props synced `onMounted` + per-prop `watch`.

Formatter callbacks return **strings**, not DOM. If arbitrary markup is ever needed, upgrade to
the treeview renderer signature (return `undefined` → fallback) — not now.

### 5.8 Build plumbing for the nested `charts/` entrypoints [D12]

- **Angular**: boilerplate `ng-package.json` per entry under
  `libs/mintplayer-ng-bootstrap/charts/<name>/` — ng-packagr discovers them recursively; the
  intermediate `charts/` dir needs no config. Dev-time resolution already works
  (`@mintplayer/ng-bootstrap/*` in `tsconfig.base.json:32` is a wildcard; TS wildcards match
  multi-segment paths).
- **WC / React / Vue**: `discoverEntries()` scans one level only
  (`libs/mintplayer-web-components/vite.config.mts:27` and the mirrored copies) — extend to
  recurse into namespace dirs. The WC lib's `generateSubpathExports` derives from the same scan,
  so `./charts/*` exports appear automatically.
- **Fold in the latent exports bug**: the React and Vue vite configs never write subpath
  `exports` at all — built package.json has only `"."`, so deep imports fail for real npm
  consumers today (in-monorepo works only via tsconfig wildcards; #383 fixed the WC lib and
  missed these two). Port `generateSubpathExports` to both while touching the discovery code.
- CEM config and per-lib globs pick up `charts/*/src/**`.

## 6. ARIA contract (hard requirement)

**`mp-hierarchy-chart`** — no APG pattern exists for these charts; the contract synthesizes the
APG **tree** pattern (the research consensus for hierarchy, incl. Chart Reader CHI 2023 and Visa
Chart Components' recursive navigation), identical across all three layouts:

- `role="tree"` on the chart container (svg or div), accessible name from
  `input-label`/`aria-label` (forwarded by wrappers; in the naming conformance registry).
- Each visible node is `role="treeitem"` with `aria-level`, `aria-setsize`, `aria-posinset`
  (**required** — the full set is never in the DOM, D4), `aria-expanded` on nodes with children,
  `aria-busy` while lazy-loading. Accessible name template: `"{path}, {metric}, {value}"` →
  `"src/components, 82% coverage, 1,234 lines"`, locale-formatted.
- Roving tabindex, one tab stop. Keymap (identical in all layouts — sibling/child/parent are
  data relations, not geometry): Left/Right = prev/next sibling (wrap), Down = first child,
  Up = parent, Enter = re-root, Escape/Backspace = zoom out, Home/End = first/last sibling,
  type-ahead by name prefix. (APG's `*` is dropped — "expand all siblings" is meaningless here.)
- Focus indicator: **drawn/styled ring, never bare `outline` on SVG** (unreliable historically;
  S1 measures current engines). Icicle/treemap divs use a normal `:focus-visible` ring.
  `:focus { outline: none }` always pairs with its replacement in the same stylesheet.
- Focus survives re-root and layout switches (restored by node id; if the node left the rendered
  window, focus moves to the new root and the live announcer says so).
- Zoom actions announce via `LiveAnnouncerController` (`omitRole: true` — strict-children role on
  the container). Tooltip stays `aria-hidden` (one message, one channel). No IDREFs cross any
  boundary.
- **WCAG 2.2 SC 2.5.8 Target Size:** thin arcs/slivers cannot meet 24×24. Conformance rides the
  *Equivalent* exception — demo pages pair the chart with an `mp-treeview` bound to the same data
  (plus a breadcrumb driven by the hover/zoom events) and the docs state this pairing as the
  recipe. Every built-in zoom-out control meets 24×24.

**`mp-trend-chart`**: chart container `role="group"` with accessible name; focusable point
markers with per-point `aria-label` (`"{series}, {date}, {value}"`), roving tabindex, keymap in
§5.4; crosshair/tooltip `aria-hidden`; series toggle (if a legend is rendered) is a real
`<button aria-pressed>`. A `summary` attr (or `summaryFormatter`) supplies a whole-chart
description ("coverage rose from 72% to 85% between Jan and Aug").

**`mp-sparkline`**: `role="img"` + generated summary name; no tab stop; nothing else.

## 7. #1 risk — read before implementing

**Focusable, role-bearing SVG child elements inside a shadow root** — the sunburst layout's
`<path role="treeitem" tabindex>` arcs and the trend chart's `<circle>` point markers. The
keyboard/AT contract sits on these working across engines, on jsdom reporting them, and on
Playwright's accname snapshot seeing them. Historical engine gaps are documented (ally.js) but
unverified for 2026 engines. D16 already moves icicle/treemap out of the blast radius (HTML
divs).

**Pre-agreed fallback:** a parallel visually-hidden HTML tree/list drives all keyboard/AT
interaction, with the SVG `aria-hidden="true"` as pure presentation and focus mirrored onto the
drawn ring — the pattern Visa Chart Components ships in production (their "accessibility
controller"). **RETIRED 2026-08-10 — S1 passed in all 3 engines + jsdom (§9.1); ARIA lives
directly on the SVG nodes.**

| Risk | Mitigation |
|---|---|
| ~~SVG `[tabindex][role]` not exposed/focusable in some engine or jsdom~~ | **RETIRED** — S1 passed 3 engines + jsdom (§9.1) |
| Zoom tween janks with many nodes | Depth cap (D4) + min-angle/min-size cull; reduced-motion instant; S3 measured 500-node tween green in Chromium/Firefox (§9.3) |
| Keyed repeat loses focus across re-root / layout switch | S2 proved re-root survival + restore-by-id across layout switch (§9.2) |
| Time-axis tick logic is subtly wrong across locales/ranges | Isolated in `charts/core/scale.ts` pure functions, table-driven specs across ranges (day→decade) and locales |
| Squarify produces degenerate slivers on skewed data | Min-size cull + `data-overflow` aggregation is honest about it; treeview pairing (§6) is the complete-data path |
| One-element hierarchy grows too many branches per layout | Projections are pure functions in core; the element holds one state machine + three small render fns — if a layout ever needs divergent *behavior* (not projection), that's the signal to split |

## 8. Public API

### `@mintplayer/web-components/charts/core`

| Surface | Name | Notes |
|---|---|---|
| type | `HierarchyNode { id, name, value?, colorValue?, color?, hasChildren?, children? }` | Shared tree model |
| type | `TrendSeries { id, label, color?, points: TrendPoint[] }`, `TrendPoint { x, y }` | `y: number \| null` (gap) |
| fn | `buildIndex`, `partitionLayout`, `squarifyLayout`, `arcPath`, `linearScale`, `niceTicks`, `timeTicks`, `colorScale` | Pure; also the consumer escape hatch for custom charts |

### `@mintplayer/web-components/charts/hierarchy` — `mp-hierarchy-chart`

| Surface | Name | Notes |
|---|---|---|
| attr,prop | `layout` | `sunburst \| icicle \| treemap`; default `sunburst`; runtime-switchable, state preserved |
| prop | `data: HierarchyNode` | Property-only; setter precomputes index/rollups |
| attr,prop | `root-id` / `rootId` | Controlled focus node; undefined = tree root |
| attr,prop | `max-depth`: `number \| 'auto'` (default `2`) | Levels outward from the focus; `'auto'` renders every loaded level and, with `loadChildren`, walks the whole tree one level per render |
| attr,prop | `min-angle` (deg, `0.2`), `min-size` (logical px for cartesian culling), `show-labels` (`true`), `label-min-area` (`0.03`) | Rendering knobs |
| attr,prop | `color-min`/`color-max` (defaults `0`/`100`), `color-start`/`color-end` (`#fe0000`/`#21b577`) | Color scale |
| attr,prop | `transition-duration` (ms, `300`) | Forced 0 under reduced motion |
| attr,prop | `locale` | Defaults to inherited `lang` |
| attr | `input-label`, `zoom-out-label`, `loading-label`, `value-unit-label`, `metric-unit-label` | Localizable strings |
| prop | `loadChildren?: (node) => Promise<HierarchyNode[]>` | Lazy loading |
| prop | `labelFormatter?`, `tooltipFormatter?: (node, ctx) => string \| undefined` | `undefined` → built-in |
| methods | `zoomTo(id)`, `focusNode(id)` | |
| events | `hierarchy-zoom` `{ node, path }`, `hierarchy-node-select` `{ node, path }`, `hierarchy-node-hover` `{ node, path } \| { node: null }`, `hierarchy-node-load-error` `{ node, error }` | All bubbling + composed, typed details |
| css | `--mp-hierarchy-chart-focus-ring-color`, `-label-color`, `-center-color`, `-tooltip-bg`, `-tooltip-color`, `-gap` | Defaulting through `--bs-*` with hard fallback |

### `@mintplayer/web-components/charts/trend` — `mp-trend-chart`

| Surface | Name | Notes |
|---|---|---|
| prop | `series: TrendSeries[]` | Property-only |
| attr,prop | `area` (`true`), `stacked` (`false`), `y-min`/`y-max` (auto+nice when unset), `goal`, `goal-label`, `locale` | No `transition-duration`: nothing animates (§13) |
| attr | `input-label`, `summary` | `summary` = whole-chart description |
| prop | `tooltipFormatter?`, `summaryFormatter?` | Strings |
| events | `trend-point-hover` `{ seriesId, point } \| { point: null }`, `trend-point-select` `{ seriesId, point }` | |
| css | `--mp-trend-chart-grid-color`, `-axis-color`, `-goal-color`, `-tooltip-bg`, `-tooltip-color`, `-focus-ring-color` | |

### `@mintplayer/web-components/charts/sparkline` — `mp-sparkline`

| Surface | Name | Notes |
|---|---|---|
| prop | `points: (number \| null)[]` | Property-only; `null` = gap |
| attr,prop | `area` (`false`), `show-last-dot` (`true`), `y-min`/`y-max`, `locale` | |
| attr | `input-label` | Overrides the generated summary name; a host `aria-label` wins over it |
| prop | `summaryFormatter?: (points) => string` | |
| css | `--mp-sparkline-stroke`, `-fill`, `-dot-color` | |

### Wrappers

`BsHierarchyChartComponent`/`BsTrendChartComponent`/`BsSparklineComponent` (Angular),
`BsHierarchyChart`/`BsTrendChart`/`BsSparkline` (React, Vue). Consumer
`aria-*`/`role`/`id`/`tabindex` land on the `mp-*` element in all three (conformance-registry
enforced). Angular exposes `rootId` as a `model()`; Vue as `v-model:root-id`.

## 9. Spikes (gate — throwaway, Chromium + Firefox + WebKit, verdicts recorded here)

| # | Question | Pass criterion | Verdict |
|---|---|---|---|
| S1 | Do `role`/`tabindex`/`aria-*` on shadow-root SVG `<path>`/`<circle>` expose correctly (engine AT tree, Playwright accname) and does jsdom report them? | Role, name, level/setsize/posinset and focusability green in 3 engines + jsdom | **PASS** |
| S2 | Does keyed `repeat` preserve the focused element across a re-root re-render and a `layout` switch? | Deep `activeElement` unchanged in 3 engines | **PASS** |
| S3 | Does a 500-node zoom tween hold ~60fps, reduced-motion honoured? | No frame > 50 ms in Chromium/Firefox; instant path verified | **PASS** |

Measured 2026-08-10, Playwright 1.60.0 (chromium-1223 / firefox-1522 / webkit-2287), throwaway
harness `docs/prd/_spike-charts-a11y/` (deleted after these verdicts) + a jsdom probe spec.

### 9.1 S1 — SVG a11y exposure: **PASS**, ARIA-on-SVG is the architecture

All three engines: `role="tree"` on the shadow `<svg>` and `role="treeitem"` + `aria-level/
posinset/setsize/expanded/label` on `<path>` resolve through Playwright's role queries and match
a full aria snapshot; `tabindex` roving works via Tab entry, ArrowLeft/Right handling and
programmatic `.focus()` on a `tabindex="-1"` path; a `<circle role="button">` is a normal tab
stop. jsdom: `SVGElement.focus()` is a function, `shadowRoot.activeElement` tracks it (host is
`document.activeElement`), and composed `KeyboardEvent` dispatch on SVG targets reaches shadow
listeners — so `*.aria.spec.ts` can assert the full keyboard contract under vitest.

### 9.2 S2 — keyed `repeat` focus survival: **PASS**

Re-root (same ids, new order/geometry): focus *and element identity* survive — the held element
reference `===` the post-render node in all 3 engines. Layout switch (`<path>` ↔ `<div>`, element
type changes so survival is impossible by construction): the manual restore-by-node-id in
`updateComplete` lands focus on the new element in all 3 engines — this is the M4 mechanism.

### 9.3 S3 — 500-arc rAF tween @300 ms: **PASS** (criterion engines)

Chromium 19 frames, avg 16.7 ms, max 16.8 ms, 0 over 50 ms; Firefox 16 frames, avg 19.1 ms, max
32.9 ms, 0 over 50 ms. `page.emulateMedia({ reducedMotion })` observable from JS in all engines.
Datum: headless WebKit-on-Windows ran 4 frames avg 72.3 ms (software rendering; WebKit's real
platforms are macOS/iOS and it is not a criterion engine) — if Safari-hardware reports arrive,
the mitigation is harder culling during the tween, not dropping it.

## 10. Testing

- Pure-logic vitest in `charts/core`: arcPath (full-circle split, root wedge, pad clamp, sub-1px
  ring), partition re-root math, rollup semantics, squarify against published reference rects,
  color clamping, **table-driven `niceTicks`/`timeTicks` specs across ranges and locales**.
- Per-element `*.aria.spec.ts`: hierarchy (roles/state both directions ×3 layouts, keymap, focus
  restore across re-root *and* layout switch, announcements, `aria-busy`), trend (point roving +
  labels), sparkline (`role="img"` + generated name). Treeview's `mount`/`flush`/`press` helpers.
- Conformance registries: WC `_conformance/naming.spec.ts` (three new CASES), ng
  `aria-passthrough.spec.ts` + count bump, React `attribute-passthrough.spec.tsx` + types probes,
  Vue `attribute-passthrough.spec.ts`.
- Angular wrapper specs via `fixture.componentRef.setInput` (or a signal-driven host — never a
  mutated plain field).
- Demo pages ×3 apps (Angular under `pages/enterprise/charts/`: hierarchy with a layout
  switcher, trend with goal line, sparklines in a datatable; live demo before snippets; keymap
  `<details>`; paired treeview as the 2.5.8 equivalent) + axe registry entries in all three
  `axe.spec.ts` (not `axe-nojs.spec.ts`).
- M0 exports verification: built WC package.json gains `./charts/*` keys; React/Vue exports maps
  materialize with all existing entries.

## 11. Versioning & dependencies

Breaking changes: none expected — purely additive (the React/Vue subpath-exports fix is additive:
deep imports start working, `"."` untouched).

Minor bumps: `@mintplayer/web-components` 2.10.0 → 2.11.0, `@mintplayer/ng-bootstrap`
22.13.0 → 22.14.0, `@mintplayer/react-bootstrap` 19.14.0 → 19.15.0, `@mintplayer/vue-bootstrap`
3.15.0 → 3.16.0. New dependencies: **none** (D13).

## 12. Open questions (resolved during implementation)

1. ~~Zoom-out control: `treeitem` for the parent, or a labelled `role="button"` outside the
   tree?~~ **RESOLVED — button, outside the tree.** A `role="tree"` may only own
   `treeitem`/`group` children, so a control inside it is invalid however it is labelled. All
   three layouts now expose a real HTML `<button>` outside the tree container (sunburst: the
   centre overlay; treemap: the breadcrumb header), `disabled` at the root. The icicle's focus
   column stays a `tabindex="-1"` treeitem, which is the honest description of what it is.
2. ~~Trend legend built-in or page-side?~~ **RESOLVED — page-side for now.** Nothing in the
   demos needed series toggling, and a built-in legend would add a second focus model to a
   component whose keyboard story is already the point. Revisit on request; the `series[].label`
   and `color` are already public, so a page-side legend needs no new API.
3. ~~Export the sunburst label-transform helper from `charts/core`?~~ **RESOLVED — yes**
   (`arcLabelTransform` / `arcLabelVisible`), for the same reason the rest of `charts/core` is
   public: a consumer hand-rolling a radial chart needs exactly these two.

## 13. As built (deviations and discoveries)

- **`mp-trend-chart` has no `transition-duration`.** Nothing in it animates: codecov's trend
  charts don't either, and a moving line under a crosshair is harder to read, not easier. The
  hierarchy keeps its tween (rAF for the sunburst, CSS transitions for the div layouts).
- **`mp-sparkline` names itself with `input-label`, not `label`** — forced by the naming
  conformance registry (§10), and correctly so: one contract, every component. Precedence is
  host `aria-label` > `input-label` > `summaryFormatter` > the generated summary.
- **Unbounded depth (`max-depth="auto"`) was added after first use.** The cap was always a
  number the consumer could raise, but nothing let them say "draw all of it" without knowing
  the tree's depth first. `subtreeDepth()` in `charts/core` resolves it against loaded data.
  Two bugs surfaced while wiring it, both pre-existing in the lazy path and both now fixed:
  the deepest rendered level was never a load candidate (so unbounded + lazy deadlocked at
  level 1), and **a folder whose loader resolved EMPTY was re-requested on every render
  forever** — `hasChildren: true` with `children: []` is indistinguishable from "not loaded"
  without a loaded-marker set.
- **`charts/core` grew two things the design did not anticipate**, both because the first render
  needed them: a `colorValues` rollup (a branch with no `colorValue` of its own inherits the
  value-weighted mean of its children, so a coverage tree colours its folders without the
  consumer precomputing folder metrics — codecov's visual result, honestly derived), and
  `squarifyLayout`'s `childPadding`/`childHeaderSpace` insets, which are what make a treemap
  branch readable as a labelled frame rather than an unlabelled pile of children.
- **The M0 tsconfig glob was too broad and broke CI (caught only on a clean checkout).**
  `*/*/index.ts`, added to reach `charts/<entry>/index.ts`, also matched the five SSR barrels
  (`accordion/ssr/index.ts` and friends), pulling their `*-chrome.generated` imports into the
  lib type-check for the first time. Those files are produced by `codegen-*-chrome`, which
  `dependsOn` the WC build and therefore cannot exist during it — so the build failed with 8
  TS2307s on a fresh checkout while passing locally, where stale generated files (or an Nx
  cache hit) hid it. Now scoped to `charts/*`. Verified by diffing `tsc --listFilesOnly`
  against master's config: **0 files lost, +25 gained, all under `charts/`**; SSR appears in
  neither set, which is the pre-existing intent.
  The final form keeps the generic `*/*/…` globs (so a second namespace needs no tsconfig
  edit) and adds `"*/ssr/**"` to `exclude`, which states the actual invariant: SSR barrels
  import build outputs and are therefore never part of the lib type-check. Both spellings
  were measured to resolve a byte-identical 598-file set.
- **Two registry gaps this work exposed and fixed**, neither about charts: the Vue conformance
  sweep globbed only `../*/src/*.vue`, so an entire namespace directory could have opted out of
  the `inheritAttrs`/`$attrs` invariant unseen; and the React and Vue vite configs never wrote
  subpath `exports` at all, so deep imports (`@mintplayer/react-bootstrap/accordion`) were
  broken for published consumers and worked in-monorepo only through tsconfig wildcards (#383
  fixed the WC lib and missed these two).
- **The squarify worst-aspect number in the literature is layout-dependent.** Bruls et al.
  report 2.5 for their example data; in a unit *square* the same data lands at 4.17 because the
  final leftover cell fills the remainder exactly. Hand-verified before relaxing the spec bound.
- **Trend hover compared x only, so the bottom line captured every hover.** Among the points
  sharing a column the winner was whichever series was placed first. The column is still chosen
  on x — the crosshair and tooltip describe one moment across all series — but the highlighted
  point within it is now chosen on y. Deliberately *not* a Euclidean nearest-point search: that
  would let purely vertical mouse movement land in a neighbouring column, changing the
  crosshair's date while the pointer never moved sideways. Time is the independent axis, so x
  owns the column and y only breaks the tie inside it.
- **Three defects that only a real browser could have caught**, all found in the M12 e2e run and
  none reachable from jsdom:
  1. The trend chart's focus-restore selector was built from a key containing a **NUL byte**,
     which CSS attribute selectors cannot match — the roving tabindex moved but DOM focus never
     followed. Found because the spec asserts `tabindex`, while the browser asserts focus.
     Now resolved by comparing `dataset` values instead of querying by selector.
  2. The sunburst's centre button **swallowed clicks while disabled** — a disabled button still
     takes pointer events, making the donut hole a dead zone. Now `pointer-events: none` when
     disabled.
  3. The **production tsconfig is stricter than the lib one** (`noPropertyAccessFromIndexSignature`),
     so `tsc -p tsconfig.lib.json --noEmit` can pass while `nx build --configuration=production`
     fails. Worth remembering: the lib type-check is not the gate CI runs.
- **A ring arc's bounding box is centred on the donut hole**, so Playwright's default click point
  lands on the `<svg>`, not the arc. This is a harness artifact rather than a user-facing bug
  (a person clicks visible ink), but it broke both the e2e suite and the axe interact hook until
  both were rewritten to drive re-rooting from the icicle layout, whose cells have no such gap
  between box and ink.
- **`role="none"` on the sunburst's centring `<g>`.** An unroled node between `role="tree"` and
  its `treeitem`s is an `aria-required-parent` risk; the group only translates geometry, so
  removing it from the accessibility tree is both the fix and the truth.

## 14. References

[gazebo SunburstChart.jsx](https://github.com/codecov/gazebo/blob/main/src/ui/SunburstChart/SunburstChart.jsx) ·
[gazebo utils.js](https://github.com/codecov/gazebo/blob/main/src/ui/SunburstChart/utils.js) ·
[gazebo Sparkline (table + clip-path)](https://github.com/codecov/gazebo/blob/main/src/ui/Sparkline/Sparkline.tsx) ·
[codecov-api graphs.py (server sizes by lines)](https://github.com/codecov/codecov-api/blob/main/graphs/helpers/graphs.py) ·
[Codecov report/tree API v2](https://docs.codecov.com/reference/repos_report_tree_retrieve) ·
[Observable zoomable sunburst](https://observablehq.com/@d3/zoomable-sunburst) ·
[Observable zoomable icicle](https://observablehq.com/@d3/zoomable-icicle) ·
[Squarified treemaps (Bruls et al.)](https://www.win.tue.nl/~vanwijk/stm.pdf) ·
[d3-hierarchy](https://d3js.org/d3-hierarchy/hierarchy) ·
[vasturiano/sunburst-chart](https://github.com/vasturiano/sunburst-chart) ·
[Highcharts sunburst](https://www.highcharts.com/docs/chart-and-series-types/sunburst-series) ·
[Highcharts license](https://shop.highcharts.com/license) ·
[ECharts keyboard a11y closed as not planned](https://github.com/apache/echarts/issues/18585) ·
[amCharts 5 accessibility](https://www.amcharts.com/docs/v5/concepts/accessibility/) ·
[Visa Chart Components a11y controller](https://github.com/visa/visa-chart-components/blob/main/packages/utils/README.md) ·
[WAI-ARIA Graphics Module](https://www.w3.org/TR/graphics-aria-1.0/) ·
[APG tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) ·
[WCAG 2.2 SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) ·
[SVG 2 paths (arc omission rule §9.5.1)](https://www.w3.org/TR/SVG/paths.html) ·
[ally.js focusing in SVG](https://allyjs.io/tutorials/focusing-in-svg.html) ·
[Chart Reader, CHI 2023](https://dl.acm.org/doi/fullHtml/10.1145/3544548.3581186)
