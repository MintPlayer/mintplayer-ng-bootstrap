# Plan — `mp-datatable` filter row, and a document-root overlay portal

PRD: [datatable-filter-row.md](./datatable-filter-row.md)
Status: **Implemented** (2026-09-22) — `feat/datatable-filter-row`. Three revisions: the filter row and the overlay portal (§§1–13), the built-in distinct-value panel with a nested override (§14), and comparison mode plus the styling round that came out of review (§15). 4 libraries build, 3328 + 768 specs pass, and every revision was verified in a running browser — which is where the missing `position: fixed`, the panel's missing border and the dead header click target each turned up, none of them visible to a green suite.

| Milestone | State |
|---|---|
| M0 — housekeeping + labels | ✅ |
| S — Spikes (gate) | ✅ S1–S5 **PASS**; S6 **FAIL** → `<colgroup>` dropped; S7 moot |
| M1 — overlay portal primitive | ✅ |
| M2 — `OverlayController.portal` | ✅ |
| M3 — column def + filter row markup | ✅ |
| M4 — header-row-count ARIA fix | ✅ |
| M5 — trigger, panel, keyboard | ✅ |
| M6 — styles (light tier) | ✅ |
| M7 — Angular bridge | ✅ |
| M8 — demos (ng / react / vue) | ✅ |
| M9 — specs | ✅ |
| M10 — batched verification sweep | ✅ 4 libs build; 3281 + 174 specs pass; verified in a real browser |

---

## Conventions (these still bite)

- **After editing `datatable.light.scss`, re-run codegen or the change is invisible**: `npx nx run mintplayer-web-components:codegen-wc`. The element imports the generated `.ts`, never the `.scss`.
- Generated files (`*.styles.ts`, `*.element.template.ts`, `custom-elements.json`, `*.generated.ts`) are **gitignored build artifacts**. Never stage them; an `AUTO-GENERATED` banner means stop.
- **No test suites until M10.** Verify intermediate milestones by reading and `tsc --noEmit`. Commit per milestone anyway — PRs squash.
- **Commit freely, push once.** Every push bills a workflow run, and a push while a run is in flight cancels it.
- In wrapper specs, **drive inputs from a `signal()`**, never a mutable field.
- New `datatable.light.scss` selectors must pass `_conformance/light-styles-scoping.spec.ts`: anchor on `[data-mps=datatable]`, descendant/child combinators only, no decoy match. `/*! @mps-global */` ships **verbatim**.
- `stampScope` recurses — call it **before** consumer content is appended.
- **The core is a framework-agnostic web component.** Its contract is `filterRenderer: (column) => Node`. Do not let any wrapper's mechanics leak into it; framework-specific verification belongs in that wrapper's specs and demo.
- Branch target is **`master`**.

## Ordering rationale

The portal (M1–M2) comes first because it gates everything visual, and its risk is now retired by S1/S2/S5 — what is left is careful implementation, not discovery.

M3 (markup) and M4 (ARIA arithmetic) depend on neither the portal nor each other. M4 is its own milestone and its own commit because it changes behaviour for tables that have **no** filter row, and wants to be revertable alone.

Demos (M8) come before specs (M9) because demos are how this repo verifies web components, and because S3 is re-verified against the real demo pages in M10.

---

## S — Spikes: **COMPLETE**. Verdicts in PRD §9

Chromium 151.0.7922.34 / Firefox 153.0 / WebKit 26.5, Playwright 1.62.1.

- [x] **S1 portal mechanics — PASS.** Separate lit render root in a pane renders and updates; 20 cycles, zero orphans. **Outside-click bug confirmed**: today's `composedPath().includes(host)` closes the panel on a click *inside* it; `includes(host) || includes(panel)` is correct for all three cases.
- [x] **S2 light-tier styles across the portal — PASS.** Portalled panel and descendants styled identically to in-place; unstamped decoy unstyled; container establishes no containing block, fixed child resolves to viewport (0,0).
- [x] **S3 clipping — PASS.** In-place panel clipped right (paged) and right+bottom (virtual); portalled panel reachable at all four corners in both modes; wins over the sticky header.
- [x] **S4 double sticky — PASS.** Zero gap, zero overlap, no bleed-through at every offset, both border models. Without the offset the rows overlap by the header height (−36px Chromium/Firefox, −33px WebKit — hence *measured*, not hard-coded).
- [x] **S5 consumer Nodes (framework-neutral) — PASS.** Fresh / cached / mutated-after-mount all survive re-render with identity, stay unstamped, usable after close.
- [x] **S6 `<colgroup>` — FAIL. Feature dropped** (PRD §5.2). The `<th>` control is already inert under `fixed`; `<col>` is worse under `auto`; `<col>` widths are literal while `<th>` widths carry +44px padding, so adoption would silently resize every consumer's table. Two by-products kept as **D6** (width-neutral trigger is load-bearing) and **D7** (qualify the measure selector).
- [x] S7 — moot, fell with S6.
- [x] Verdicts recorded in PRD §9; harnesses deleted. **Commit.**

## M0 — Housekeeping and labels

Files: `libs/mintplayer-web-components/datatable/src/styles/datatable.styles.ts` (delete), `…/datatable/src/types/labels.ts`

- [x] Delete the stale `datatable.styles.ts` — generated from a `.scss` deleted in `dbe4808b`, imported by nothing, untracked (PRD §1.5).
- [x] Add `filterColumn(column: string): string` to the labels type and default English labels.
- [x] `tsc --noEmit`. **Commit.**

## M1 — Overlay portal primitive [PRD §5.4, D8]

Files: `libs/mintplayer-web-components/overlay/src/overlay-portal.ts` (new), `…/overlay/src/index.ts`

- [x] `<mp-overlay-container>`, created lazily, appended as the **last child of `<body>`**, `position: fixed; inset: 0; pointer-events: none`, `z-index` above the current 1050/1056/1080 ceiling and overridable via `--mp-overlay-container-z-index`.
- [x] `acquirePortal(): PortalHandle` → `{ container, release() }`; panes are `<div class="mp-overlay-pane">` with `pointer-events: auto`; reference-counted; host self-removes with the last pane (S1b).
- [x] Panes carry **no `z-index`** — DOM order only.
- [x] Nothing on the host that establishes a containing block (no `transform`, `filter`, `contain`, `will-change`, `container-type`). Spec'd in M9.
- [x] Export from the overlay barrel. `tsc --noEmit`. **Commit.**

## M2 — `OverlayController.portal` [PRD §5.4, D9, D10]

Files: `libs/mintplayer-web-components/overlay/src/overlay-controller.ts`

- [x] Add `portal?: boolean` (default `false`). Existing consumers untouched.
- [x] `open()` acquires a pane and renders the panel into it via a **separate lit render root** (D10 — not node relocation, even though S1c showed relocation happens to work).
- [x] **Outside-click**: `includes(this.host)` → `includes(host) || includes(panel)` (`:708-712`). Measured-wrong today; see PRD §9.1's table before touching it.
- [x] **Close ordering**: restore focus *before* the pane is released (S1e).
- [x] Positioning, `dismissStack`, `FocusTrap`, Escape, scroll/resize: unchanged.
- [x] `tsc --noEmit`. **Commit.**

## M3 — Column def and filter row markup [PRD §5.1, D1–D3, D13]

Files: `…/datatable/src/types/column-def.ts`, `…/datatable/src/components/mp-datatable.ts`

- [x] `FilterRenderer<T>`; `filterable?`, `filterRenderer?`, `filterActive?` on `DatatableColumnDef`.
- [x] `renderFilterRow()` beside `renderHeader()`; emitted only when `columns.some(c => c.filterable)`.
- [x] Cells repeat the leading gutters in row-1 order (`:852-867`) so `totalColumnCount` matches by construction.
- [x] Non-filterable columns get an empty `<th class="filter-cell">`; **not** `aria-hidden`.
- [x] No `width` / `min-width` in the row.
- [x] Consumer `filterRenderer` output is **not** stamped; any `stampScope` runs before it is appended.
- [x] `tsc --noEmit`. **Commit.**

## M4 — Header-row-count ARIA fix [PRD §1.2, §6, D5]

Files: `…/datatable/src/components/mp-datatable.ts`

- [x] `headerRowCount` (1, or 2 with a filter row).
- [x] `aria-rowcount` = `rows + headerRowCount` (was `rows + 1`, `:835`).
- [x] Body `aria-rowindex` = `rowIndex + 1 + headerRowCount` (was `rowIndex + 2`, `:974`).
- [x] Filter row `aria-rowindex="2"`.
- [x] **Commit separately** — changes behaviour for tables with no filter row.

## M5 — Trigger, panel, keyboard [PRD §5.1, §5.5, §5.6, §6, D11]

Files: `…/datatable/src/components/mp-datatable.ts`

- [x] `<button class="filter-trigger">` per filterable column: `aria-expanded`, `aria-controls`, localized `aria-label`.
- [x] One `OverlayController` for the panel: `portal: true`, `modal: true`, `scrollStrategy: 'reposition'`.
- [x] **Anchor resolved lazily by stable key** — every render rebuilds the header.
- [x] No local scroll listener: `.datatable-scroll` is light DOM (PRD §5.6). Comment it, or someone will copy the scheduler's workaround.
- [x] `aria-expanded` derived in `render()` from controller state, not from an event handler.
- [x] Consumer Node appended **after** stamping; treat it as opaque (PRD §5.5).
- [x] `mp-datatable-filter-open` / `-close`, detail `{ column }`. No filter semantics.
- [x] `tsc --noEmit`. **Commit.**

## M6 — Styles and the measured header height [PRD §5.3, D6, D7, D14, O2]

Files: `…/datatable/src/styles/datatable.light.scss`, `…/datatable/src/components/mp-datatable.ts`

- [x] `.filter-row`, `.filter-cell`, `.filter-trigger`, active dot, panel chrome — all anchored on `[data-mps=datatable]`.
- [x] **Trigger is width-neutral** — `width: 100%; box-sizing: border-box; min-width: 0`, no intrinsic minimum above the sort header's `padding-right: 2rem`. Load-bearing (D6): hostile content measured a 224px→515px column blow-up under `auto`.
- [x] Measure pass publishes `--mp-datatable-header-height` from `thead tr:first-child`; re-measured on the existing `ResizeObserver` (`:651-664`). Filter row uses `top: var(--mp-datatable-header-height, 0)` with an opaque background matching the header's treatment (`:43-50`).
- [x] **Qualify `measureColumnWidth`'s selector to `thead tr:first-child`** (D7) — correct today only by document order.
- [x] `:focus-visible` ring; `prefers-reduced-motion` on any transition.
- [x] **Re-run `npx nx run mintplayer-web-components:codegen-wc`.** Do not stage the generated `.ts`.
- [x] **Commit** (the `.scss` + the element change).

## M7 — Angular bridge [PRD §5.7, D12]

Files: `libs/mintplayer-ng-bootstrap/datatable/src/datatable-filter/datatable-filter.directive.ts` (new), `…/src/datatable/datatable.component.ts`, `…/src/index.ts`

- [x] `[bsDatatableFilter]` directive injecting `TemplateRef`, `name` input. A sibling of `[bsDatatableColumn]`.
- [x] `contentChildren(...)`; in `effectiveColumns` (`:181-204`) set `filterable: true` + a lazy `EmbeddedViewRef` closure mirroring `headerRenderer`.
- [x] `filterViews` destroyed in the existing `destroyRef.onDestroy` block (`:212-217`).
- [x] **Fix the inherited leak**: destroy and clear the previous generation of `headerViews` / `filterViews` at the top of the `effectiveColumns` recompute.
- [x] `[columns]` still wins over content children (`:184`).
- [x] Export from the barrel. `tsc --noEmit`. **Commit.**

## M8 — Demos [PRD §5.8, D12]

Files: `apps/ng-bootstrap-demo/src/app/pages/enterprise/datatables/*`, `apps/react-bootstrap-demo/src/app/pages/DatatablePage.tsx`, `apps/vue-bootstrap-demo/src/views/DatatableView.vue`

- [x] Angular: a "Column filters" section — live `<bs-datatable>` with `*bsDatatableFilter`, **demo before snippet**, `<bs-code-snippet>` from a `dedent` field.
- [x] React and Vue: same section, `filterable` + `filterRenderer` inside the existing `columns` consts (no wrapper change).
- [x] At least one demo in **virtual** mode — where clipping and sticky both bite.
- [x] Document the `.form-control`-only-inside-`<bs-form>` caveat in the existing `<details>` light-DOM blurb.
- [x] Document the keymap on the demo page.
- [x] **Commit.**

## M9 — Specs [PRD §10]

Files: `…/datatable/src/components/mp-datatable.{aria,keyboard,filter-row}.spec.ts`, `…/overlay/src/{overlay-portal,overlay-controller}.spec.ts`, `_conformance/consumer-dom-boundary.spec.ts`, Angular + Vue wrapper specs

- [x] ARIA: no row when nothing filterable; row when something is; `aria-rowindex`/`aria-rowcount` **with and without** the filter row (the M4 regression); trigger role/name/`aria-expanded`; `aria-controls` resolves.
- [x] Keyboard: tab-reachable; Enter/Space open; Escape closes + restores focus; Tab trapped; a click in the filter row never sorts.
- [x] `filter-row.spec.ts`: cell count equals `totalColumnCount` across all four tree×checkbox permutations; empty cells for non-filterable columns; `filterRenderer` invoked once per open; **measure selector resolves to row 1's `<th>`, not the filter cell** (D7).
- [x] `overlay-portal.spec.ts`: acquire/release refcount; host removed with the last pane; computed style asserts no containing-block property.
- [x] `overlay-controller.spec.ts`: **a click inside a portalled panel must not close it** (PRD §7/§9.1) — the single most important new assertion.
- [x] `consumer-dom-boundary.spec.ts`: add `filterRenderer` to the unstamped renderers.
- [x] Angular: directive bridges; views destroyed; accumulation fix holds across a column-set change; inputs driven by `signal()`. Vue: `columns` with a `filterRenderer` round-trips.
- [x] e2e per demo app: open → keyboard → close, virtual mode.
- [x] **Commit.**

## M10 — Batched verification sweep (only now; one pass)

```bash
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components
npx nx test mintplayer-ng-bootstrap
```

- [x] Redirect each to a log file and read the log — never pipe the only copy into `grep`/`tail`.
- [x] e2e sweep across the three demo apps.
- [x] Re-verify S3 against the **real demo pages**, three engines, paged and virtual. Remember: measure the `<th>`, not the `<tr>` (PRD §5.3).
- [x] Manual keyboard pass.
- [x] Record results and deviations in PRD `## As built`. **Commit, then push once.**

---

---

# Revision 2 — default panel, nested override, datatable-supplied values

PRD §14. Status: **Implemented** — 2026-09-22. All milestones complete. The sweep and the real-browser check found four bugs the design review did not: a stale local value list, NG0600 on view DISPOSAL inside the computed, a header click target that covered only the label, and a portalled panel inheriting none of the component's custom properties. As-built deviations are recorded in PRD §13.1. Six of eight refuters amended something; the amendments are in PRD §14.3/§14.4/§14.7/§14.8 and the record is §14.9. The load-bearing change: header views stay **lazy**; the wrapper's `filterRenderer` resolves the nested template **at panel open** and returns `null` for "default" (D20). Eager creation inside the `computed` was measured to throw NG0600 with any `viewChild` on the host and is gone.

| Milestone | State |
|---|---|
| S8–S10 — Revision 2 spikes (PRD §14.8) | ✅ S9, S10 **PASS** by measurement inside verification (jsdom); S8 rewritten for lazy D20 and pinned by the M17 Angular spec |
| M11 — WC: `distincts` source, local fallback, `DistinctValue` types, labels | ✅ |
| M12 — WC: default panel (search / ≠ / checkbox list / clear), `ctx`, events | ✅ |
| M13 — WC: `filterSummary` on the trigger; aria-label composition | ✅ |
| M14 — Angular: `filterable`/`filterActive`/`filterSummary`/`filterSelection` inputs on `*bsDatatableColumn`; nested `*bsDatatableFilterPanel`; header views stay **lazy**; delete the sibling directive | ✅ |
| M15 — Wrappers: forward `distincts` + `labels` + filter events in ng / react / vue | ✅ |
| M16 — Demos: default panel on one column, override on another, `filterable` toggled by the checkbox; a listener that filters the demo's own data | ✅ |
| M17 — Specs: rewrite `datatable-filter.spec.ts`; default-panel focus/mount-once/a11y; `distincts` fallback across data modes; Signal `$implicit` under zoneless | ✅ |
| M18 — Docs: PRD §5.7/D12 marked historical, §14.9 verification record, §13 as-built extended; Spark `query_column_filter_PRD.md` §5.8 amended (docs only, no Spark code) | ✅ |
| M19 — Batched verification sweep; browser check of default panel + override in the React demo (the only demo servable without the API) | ✅ 3316 WC + 768 ng tests pass; 4 libs build; verified in Chromium |

## Ordering rationale (Revision 2)

The WC goes first (M11–M13) because every wrapper and demo consumes it and because the default panel's mount-once behaviour is the riskiest interaction with what already shipped (R13). Angular (M14) is next because it carries the directive deletion and the new nested directive; React/Vue (M15) are plumbing. Demos before specs, as before. Spark stays docs-only (D30).

Within M11–M13 the six WC steps are strictly serial — each depends on the names the previous one introduced. M14–M16 can run per-framework in parallel once the WC core lands, each wrapper followed by its own demo.

## Standing rules for Revision 2

- Everything in "Conventions (these still bite)" above.
- **Nothing is created or change-detected inside `effectiveColumns`.** Header views stay lazy; `filterRenderer` resolves `dir.filterPanelTemplate` when the WC invokes it at panel open and returns `null` for "default" (D20). Measured: `createEmbeddedView` inside the computed throws NG0600 as soon as the host declares a `viewChild`.
- **The default panel is mounted once per open** under the same `_mountedFilterColumn` guard as consumer content; its state (search text, selection, inverse) lives on the element; the checkbox list is a **keyed `repeat()` on `value`** (R13).
- **`hasMore` is required** on the source response; a source resolving **`null` for a column means compute locally** for that column (D22, R15).
- **Local distincts are gated** on `fetch == null && !isExternallyPaged() && _childCache.size === 0`, and `set fetch(null)` must reset every fetch-derived field (D23, R14).
- **Every string in the default panel routes through `labels`**, including checkbox names via `labels.filterValue(value)` and the active trigger name via `labels.filterColumnActive(column, summary?)` — never string concatenation (D28, D29).
- **The WC emits UI state only** — one event, `{column, selected: DistinctValue[], inverse}`; Clear fires it with `selected: []` (D26).
- **The nested directive's inputs are unreadable in its constructor**; anything the column def needs is an input on `*bsDatatableColumn` (D18).

## M11–M13 — WC core (serial; every step depends on the last)

**M11.1 — types.** `datatable/src/types/column-def.ts`: `FilterRenderer<T> = (column: DatatableColumnDef<T>, ctx: FilterContext) => Node | null`; add `filterSummary?: string`, `filterSelection?: FilterSelection`. New `datatable/src/types/filter.ts`: `DistinctValue {value: unknown; label: string}`, `DistinctValues {matching: DistinctValue[]; remaining: DistinctValue[]; hasMore: boolean}`, `DistinctsRequest {column: string; search: string; signal: AbortSignal}`, `DatatableDistincts = (req) => Promise<DistinctValues | null>`, `FilterSelection {values: DistinctValue[]; inverse: boolean}`, `FilterContext {values(); loading(); search(term); apply(values, inverse); clear(); onChange(cb): () => void}`, `FilterChangeDetail {column; selected: DistinctValue[]; inverse}`. Export from `types/index.ts` **and** `src/index.ts`.

**M11.2 — labels.** `types/labels.ts`: `filterClear(column)`, `filterSearch`, `filterInvert`, `filterNone`, `filterEmpty`, `filterTrue`, `filterFalse`, `filterHasMore`, `filterNoValues`, `filterGroup(column)`, `filterColumnActive(column, summary?)`, `filterValue(value: unknown): string`, `announceFilter(column, count)`. `filterValue` default: `null`/`undefined` → `filterNone`, `''` → `filterEmpty`, boolean → `filterTrue`/`filterFalse`, `Date` → `toLocaleDateString()`, else `String(value)`. Document that a consumer overriding `filterNone` should also override `filterValue`, or the two disagree.

**M11.3 — element state.** `components/mp-datatable.ts`: (a) `set fetch(null)` resets `_totalRecords = null` and clears `_pageCache`, `_pendingPageFetches`, `_childCache`, `_childTotals`, `_pendingFetches`, `_fetchGeneration++` — measured today to reset nothing (R14); (b) `distincts` getter/setter mirroring `fetch` (property only, no attribute); (c) per-column `Map<string, {selection; snapshot; loaded; loadedTerm; term; loading; generation; listeners; ctx}>`, seeded/reset from `col.filterSelection` in the `columns` setter; SameValueZero helpers keyed on `value`.

**M11.4 — distincts loading.** `loadDistincts(column, term)`: called on every panel open (no cross-open cache) and on re-query. Source path first (`AbortController` per column); a `null` resolution falls through to local. Local gated on `fetch == null && !isExternallyPaged() && _childCache.size === 0`, else `loaded = null` → `filterNoValues`. Buckets: selection empty → `matching` = distinct over all `_data`, `remaining` = `[]`; on first non-empty selection **snapshot** the list, then `matching` = snapshot ∩ `_data`, `remaining` = snapshot − `_data` − selected. Search: client filter on `label` (case-insensitive substring); 250 ms debounced, generation-guarded re-query when `loaded.hasMore || !term.startsWith(loadedTerm)`. Notify `listeners` on every change. **Never filters `_data`.**

**M12 — default panel + M13 trigger.** `renderFilterPanel`: `aria-modal="true"` on `.filter-panel`; `initialFocus` → callback resolving `.filter-search`, falling back to first tabbable; `const node = col.filterRenderer?.(col, state.ctx) ?? null`; node → mount consumer DOM once (as today); `null` → lit-render the default into `.filter-panel-body` under the same `_mountedFilterColumn` guard, using the module-level scoped `html`. Order: Clear `<button class="filter-clear" ?disabled>` (clears selection, resets inverse, fires change, **then focuses search**) → `<input type="search" class="filter-search">` → `<button class="filter-invert" aria-pressed>` → `<div role="group" class="filter-options">` with a **keyed `repeat()` on `value`** over [selected (checked) → `matching` → `remaining` (`.filter-remaining`)] → `.filter-has-more` → `.filter-no-values`. One event `mp-datatable-filter-change` `{column, selected: DistinctValue[], inverse}` on every check/uncheck/inverse **and on Clear** (`selected: []`, `inverse: false`). Announce via the existing `liveAnnouncer` with `labels.announceFilter`. Trigger: `span.filter-summary` visible text from `col.filterSummary`; `aria-label` = `filterColumn` / `filterColumnActive(col, summary)` / `filterColumnActive(col)`.

**M13.2 — styles.** `styles/datatable.light.scss`, extending the `.filter-panel` block: `.filter-clear`, `.filter-search`, `.filter-invert[aria-pressed=true]`, `.filter-options`, `.filter-remaining { color: var(--bs-secondary-color); }`, `.filter-has-more`, `.filter-no-values`, `.filter-trigger .filter-summary`; `:focus-visible` on every control; `prefers-reduced-motion`. Then `npx nx run mintplayer-web-components:codegen-wc` and grep the generated sheet for `filter-` to confirm every compound is scope-anchored.

## M14–M16 — wrappers and demos (per framework, parallel after M13)

**M14 Angular directives.** `datatable-column.directive.ts`: inputs `filterable` (alias `bsDatatableColumnFilterable`), `filterActive`, `filterSummary`, `filterSelection`; **plain field** `filterPanelTemplate?: TemplateRef<BsDatatableFilterPanelContext>`. New `datatable-filter-panel/datatable-filter-panel.directive.ts` (`[bsDatatableFilterPanel]`): constructor `inject(BsDatatableColumnDirective)` + `inject(TemplateRef)` → assign; `inject(DestroyRef).onDestroy(() => { if (col.filterPanelTemplate === tpl) col.filterPanelTemplate = undefined })`; `BsDatatableFilterPanelContext {$implicit: Signal<DistinctValues|null>; ctx: FilterContext}` + `static ngTemplateContextGuard` (**required** — without it `values().anything.deeper` type-checks). **Delete `datatable-filter/`** and its barrel export.

**M14.2 Angular component.** `datatable.component.ts`: drop `filterDirectives` and the `filters.find(...)` lookup; `effectiveColumns` maps the four new inputs; **header view stays lazy**; always set `filterRenderer: (col, ctx) => { const tpl = dir.filterPanelTemplate; if (!tpl) return null; if (!filterView) { const values = signal(ctx.values()); filterView = this.vcr.createEmbeddedView(tpl, {$implicit: values, ctx}); this.filterViews.push(filterView); this.filterUnsubs.push(ctx.onChange(() => values.set(ctx.values()))); } filterView.detectChanges(); … rootNodes }`; `destroyTemplateViews` also runs every unsubscribe. Add `distincts` + `labels` inputs (own effects, `isPlatformServer`-guarded like `fetch`) and `filterChange` output bound from `(mp-datatable-filter-change)`. Rewrite the `data` JSDoc: the **complete** row set; a consumer paging `[data]` itself must supply `[distincts]`.

**M15 React/Vue.** React `BsDatatable.tsx`: `onFilterChange` in the `events` map; verify `distincts`/`labels` forward as properties. Vue `BsDatatable.vue`: `distincts`/`labels` props assigned in `syncProps` + `watch`; `filterChange` emit from the listener; note `filterRenderer` may return `null`.

**M16 demos (all three).** Checkbox drives `filterable` (not an `@if` around the directive); one column uses the **default** panel, another an **override**; the page keeps an **unfiltered master copy** and filters from it in a `filterChange` handler, setting `filterActive`/`filterSummary` itself; React/Vue overrides must return a **stable node** and repaint it inside `ctx.onChange`. Prose documents the default, the override, that the component holds no filter state, and the keymap including Clear → search focus.

## M17 — specs

**WC** (`filter-row` / `filter-aria` + new `filter-default.spec.ts`): default renders when `filterRenderer` is absent **and** when it returns `null`; mount-once (text + `document.activeElement` survive a `data` reassignment **and** a search repaint); Clear disabled/enabled, emits `selected: []`, moves focus to search; `aria-pressed` both values; `aria-modal`; keyed identity across a repaint and a `matching`↔`remaining` move; selected-first after a re-query that drops the value; local distincts cover **all** rows with pagination smaller than the row count; `filterValue` for `null`/`''`/`true`; snapshot keeps other values listed after rebinding `data` to the subset; `fetch = null` resets `totalRecords` and the local list; source `null` → local for that column; the `hasMore || !startsWith` re-query rule with debounce; trigger summary text + the three `aria-label` forms.

**Angular** (rewrite `datatable-filter.spec.ts`, per S8): harness **must declare a `viewChild`** (that is what exposed NG0600) and drive inputs from `signal()`; default panel with no nested template; override on first open; override under `@if (true)` on first open; a signal read in a header template does **not** recompute `effectiveColumns`; `@if (flag())` off → reopen → default, on → reopen → override; destroy clears the field; `filterChange` shape; `$implicit` Signal repaints with **no** `detectChanges()`.

## M18–M19 — docs and sweep

M18: PRD §5.7/D12 marked historical (commit `6e11a256`); §13.1 records the Revision 2 as-built. **The Spark doc amendment is written but NOT applied** — a PreToolUse hook blocks edits to the `MintPlayer.Spark` repo from this session and directs them through the `handoff` skill. The full replacement text for §5.8 (plus striking O2, which the three-engine clipping measurement answers) must be landed in the same unit of work — one PR, both repos. Amend Spark `query_column_filter_PRD.md` §5.8 to consume `distincts` + the default panel and map `selected.map(v => v.value)` to `includes`/`excludes` by `inverse` (**docs only, no Spark code** — D30).

M19: one batched sweep — `codegen-wc`, build + test `mintplayer-web-components`, build + test `mintplayer-ng-bootstrap`, build react/vue, then the three demo e2e projects; each redirected to a log with `echo "EXIT: $?"`. Then a **real-browser** check of the default panel and an override in the React demo (the only demo servable without the API — `nx serve react-bootstrap-demo --exclude-task-dependencies`, which binds **:4000**, ignoring `--port`).

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Outside-click check closes the panel on a click inside it | Measured-wrong today (PRD §9.1); explicit `includes(panel)` in M2; the headline assertion in M9 |
| R2 | Filter row inflates a column during the `auto` phase | Width-neutral trigger (D6), measured; hostile content is the failure mode |
| R3 | Measure pass picks the filter cell instead of row 1's `<th>` | D7 qualifies the selector; spec'd in M9 |
| R4 | M4's arithmetic change regresses tables with no filter row | Own milestone, own commit, spec'd both ways |
| R5 | Sticky offset drifts when the header wraps or the font changes | Re-measured on the existing `ResizeObserver`; per-engine height difference already observed (36 vs 33px) |
| R6 | A future edit adds `transform`/`contain` to the overlay container | Computed-style assertion in `overlay-portal.spec.ts`, not a comment |
| R7 | Container `z-index` loses to consumer app chrome | Exposed as `--mp-overlay-container-z-index`; a portal cannot win against arbitrary page CSS and should not pretend to |
| R8 | Scope creep into filter semantics | PRD §3.1; the only events carry a column name |

## Explicitly rejected (do not resurrect casually)

- **`<colgroup>` width ownership.** Measured out — see PRD §5.2 and §9.6 for the numbers. Revisit only alongside column hiding/reordering, where its breaking width semantics can be judged on their own merits.
- **Filter controls inside the existing `<th>`.** Interactive-inside-`<button>`, and every filter click sorts (PRD §1.1).
- **Relocating a lit-rendered node into the pane.** It worked in S1c, but it is unsupported in general and the same harness tripped lit's own guard on an adjacent manipulation. D10 takes the separate render root.
- **`position: fixed` + a hand-picked `z-index`** (the current house pattern). Depends on no ancestor establishing a fixed containing block — unenforceable when the ancestors belong to the consumer's app.
- **`has-overlay`.** An Angular component with an empty template whose only content is a CDK CSS import (PRD §1.6).
- **`@angular/cdk/overlay` itself.** No third-party dependency, nothing Angular inside `web-components/**`.
- **Migrating the other ten overlay consumers in this PR.** The immediate successor (PRD §12).
- **A no-JS tier for the filter row.**
- **Sticky on `<thead>` instead of per-`th` (O3).** S4 passed with the per-`th` approach, so there is no reason to disturb a shipped header.

🤖 Generated with [Claude Code](https://claude.com/claude-code)


# Revision 3 — comparison mode, and who styles what

PRD §15. Status: **Implemented** — 2026-09-22. Four review remarks after Revision 2 was verified in a browser: two defects in the demos, two asking for a capability the built-in panel did not have.

| Milestone | State |
|---|---|
| M20 — WC: `filterMode` / `filterInputType` / `filterOperators`; comparison panel; `FilterChangeDetail` becomes a union on `mode` | ✅ |
| M21 — WC: one shared rule for every panel field; number-input spinners stripped; the comparison row stretches | ✅ |
| M22 — Wrappers: the three new column inputs on `*bsDatatableColumn`; new types exported from every barrel | ✅ |
| M23 — Demos: comparison mode on the year/founded column; the override moves to a column that needs one, styled by the page in each framework's own way | ✅ |
| M24 — Specs: nine comparison-mode cases; three style guards | ✅ |
| M25 — Docs: PRD §15 (D31–D37), this block | ✅ |
| M26 — Version bump + sweep + browser check | ✅ 3328 WC + 768 ng tests; 4 libs build; measured in Chromium |

## What the review round cost, and why it was worth it

Four remarks produced five defects, **none of which reading the code had found**:

1. `filterSelection` dropped `operator` and `operand` when seeding — a restored comparison filter came back as an active-looking trigger over an empty panel. Caught by its own spec.
2. The operand box clobbered partial input, because a `number` input reads back `''` for `-` or `1e`. Caught by a spec that was itself wrong first.
3. The portalled panel inherited none of the component's custom properties, so it had no border at all. **Only a browser could see this** — three green suites could not.
4. The sortable header's click target was its label, not its cell. Reported from the running demo.
5. `≠` reached the React demo as the literal text `2260`, because it was written through a `perl` one-liner inside a double-quoted shell string.

**Two process rules follow, and both generalise beyond this feature:**

- **Rewriting source containing escapes through a shell one-liner is unsafe** — the same hazard as the repo's heredoc ban, and it broke exactly one of three otherwise identical files. Use the editing tools.
- **Verifying logic in a scratch script does not verify the spec.** The style assertions were checked against the generated sheet by a standalone Node script, which defined its own copies of the helpers; the real spec then failed three cases with `ReferenceError` because those helpers lived in a different file.

## Versioning

Breaking — the sibling `[bsDatatableFilter]` directive is gone, `FilterRenderer` gained a parameter and may return `null`, and `FilterChangeDetail` is now a union — but the bump is **minor**, following commit `dbe4808b` (`feat!`, shadow → light DOM, `::part()` removed), which took a minor across all four packages.

The majors are pinned to the framework each package wraps (`@angular/core ^22`, `react ^19`, `vue ^3.5`), so a major bump would falsely advertise Angular 23 / React 20 / Vue 4. Breaking changes therefore land in the minor, and the PR description carries the migration notes.
## Appendix — the pending MintPlayer.Spark doc change (M18)

Not applied: a PreToolUse hook gates that repo from this session. It belongs in this unit of
work, so the full text lives here rather than in a scratchpad that does not survive the session.
`docs/query_column_filter_PRD.md` §5.8 is replaced wholesale by the following, and O2 in the
open-questions list is struck through as answered.

---

### 5.8 The filter row — **built, in ng-bootstrap** (resolved)

> **Status 2026-09-22: no longer a blocker.** The filter row, the document-root overlay and a
> Vidyano-style distinct-value panel shipped in MintPlayer/mintplayer-ng-bootstrap#414
> (`docs/prd/datatable-filter-row.md`, Revisions 1 and 2). Spark consumes it; nothing below needs
> building here. The original analysis is kept because its two constraints turned out to be real and
> both are answered by measurement rather than assertion.

**The original problem.** The `<thead>` was rendered by `mp-datatable` as one `<th>` per column, with
no second row and no filter slot, and a sortable column's header content sits *inside*
`<button class="header-sort">` — so a filter control placed there would be an interactive element
nested in a button: invalid HTML, an a11y failure, and every filter click would also toggle the sort.

**How it was resolved.** A second `<tr class="filter-row">` in `<thead>`, one cell per column
(gutters included, so alignment stays structural), with a width-neutral trigger button. The panel is
rendered into a `<mp-overlay-container>` at the document root, modelled on `@angular/cdk/overlay`'s
container/portal split.

**SP2/O2 is answered: yes, the popup escapes both.** An in-flow panel *is* clipped — measured in
Chromium, Firefox and WebKit: on the right edge in paged mode, on both axes in virtual mode. A
portalled one is not, in all three. The light-tier stylesheet still reaches it, because it is
installed at document level and anchors on `[data-mps=datatable]`, which survives the move; an
unstamped decoy stays unstyled, so the no-leak property holds across the portal.

#### What Spark consumes

A column opts in with `filterable`. With no `filterRenderer`, it gets the **built-in panel** —
search box, include/exclude toggle, checkbox list of distinct values, clear button — which is exactly
the Vidyano shape this PRD asks for, and which React and Vue get identically because it lives in the
web component rather than in an Angular template.

The value lists come from `[distincts]`:

```ts
// DatatableDistincts
(request: { column: string; search: string; signal: AbortSignal })
  => Promise<{ matching: DistinctValue[]; remaining: DistinctValue[]; hasMore: boolean } | null>
```

This maps onto §5.1's `canListDistincts` endpoint directly. Three things to honour:

- **`hasMore` is required.** It is what drives the re-query as the user types. The component filters
  the loaded list client-side and only goes back to the source when `hasMore` is set or the term is
  *widened* (not a refinement of the loaded one), debounced 250 ms — the same behaviour as Vidyano,
  which filters in memory and re-queries only when the list was truncated.
- **Resolve `null` for a column you cannot answer for**, and that one column falls back to the
  component's local pass. That is how a grid mixes server-backed columns with columns whose values
  the client already holds — a column whose `canListDistincts` flag is false resolves `null`.
- **`remaining`** holds values that were present when the filter was applied but are not any more.
  They stay listed (dimmed) so a selection can be widened without clearing it first. A server-backed
  source should return them; the component snapshots locally when it can.

Selections arrive as one event, `(filterChange)` → `{ column, selected: DistinctValue[], inverse }`,
emitted on every toggle **and on clear** (`selected: []`). Spark maps it to the query filter:

```ts
onFilterChange({ column, selected, inverse }: FilterChangeDetail) {
  const values = selected.map((v) => v.value);
  this.setColumnFilter(column, inverse ? { excludes: values } : { includes: values });
}
```

**The component holds no filter state and applies no predicate.** It does not filter `[data]`, and it
never derives `filterActive` or `filterSummary` — Spark sets both back on the column from its own
filter model, because only Spark knows whether the filter became a new server query. This is what
makes the same panel usable for a client-side grid and a server-paged one.

**One trap that is easy to hit.** The value lists are computed from the rows the element holds, so a
server-paged grid (`[fetch]`, external paging, or lazily loaded tree children) gets **no local list at
all** — the component reports "no values" rather than guessing from the page it happens to have.
`spark-query-grid` is server-paged, so `[distincts]` is not optional there; it is the only source.

**Unchanged from the original analysis:** `bs-query-builder` already owns an `Expression` / operator /
per-type editor vocabulary. This feature must not invent a second, incompatible filter expression
shape; where the two meet, reuse its vocabulary. And Bootstrap CSS reaches controls in the header only
because `mp-datatable` renders into the light DOM — that remains true for the portalled panel.
