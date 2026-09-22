# Plan — `mp-datatable` filter row, and a document-root overlay portal

PRD: [datatable-filter-row.md](./datatable-filter-row.md)
Status: **Implemented** (2026-09-22) — `feat/datatable-filter-row`, no PR yet. All milestones done; 4 libraries build, 3281 + 174 specs pass, and the feature was verified in a running browser (which is where the missing `position: fixed` on the panel turned up — see PRD §13).

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

PRD §14. Status: **Designed; adversarial verification running (`wf_699b142e-239`)** — 2026-09-22. Milestones below are the shape of the work; individual decisions may be amended by the verification synthesis before M11 starts, and the amendment is recorded in PRD §14.9 first.

| Milestone | State |
|---|---|
| S8–S10 — Revision 2 spikes (PRD §14.8) | ⬜ folded into the refuters' measurements where possible |
| M11 — WC: `distincts` source, local fallback, `DistinctValue` types, labels | ⬜ |
| M12 — WC: default panel (search / ≠ / checkbox list / clear), `ctx`, events | ⬜ |
| M13 — WC: `filterSummary` on the trigger; aria-label composition | ⬜ |
| M14 — Angular: `filterable`/`filterActive`/`filterSummary` inputs on `*bsDatatableColumn`; nested `*bsDatatableFilterPanel`; eager header views; delete the sibling directive | ⬜ |
| M15 — Wrappers: forward `distincts` + `labels` + filter events in ng / react / vue | ⬜ |
| M16 — Demos: default panel on one column, override on another, `filterable` toggled by the checkbox; a listener that filters the demo's own data | ⬜ |
| M17 — Specs: rewrite `datatable-filter.spec.ts`; default-panel focus/mount-once/a11y; `distincts` fallback across data modes; Signal `$implicit` under zoneless | ⬜ |
| M18 — Docs: PRD §5.7/D12 marked historical, §14.9 verification record, §13 as-built extended; Spark `query_column_filter_PRD.md` §5.8 amended (docs only, no Spark code) | ⬜ |
| M19 — Batched verification sweep; browser check of default panel + override in the React demo (the only demo servable without the API) | ⬜ |

## Ordering rationale (Revision 2)

The WC goes first (M11–M13) because every wrapper and demo consumes it and because the default panel's mount-once behaviour is the riskiest interaction with what already shipped (R13). Angular (M14) is next because it carries the one structural change — eager header views — and the directive deletion; React/Vue (M15) are plumbing. Demos before specs, as before. Spark stays docs-only (D30).

## Standing rules for Revision 2

- Everything in "Conventions (these still bite)" above.
- **No signal write in the nested directive's constructor or `onDestroy`** — it runs inside `effectiveColumns`, a `computed` (F3, R12).
- **The default panel is mounted once per open** under the same `_mountedFilterColumn` guard as consumer content; its state (search text, checked set, inverse) lives on the element, not in the template (R13).
- **`hasMore` is required** on the source response (R15).
- **Every string in the default panel routes through `labels`** (D29); a hard-coded literal is a translation bug.
- **The WC emits UI state only** — `{column, selected, inverse}` — never `includes`/`excludes` (D26).

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
