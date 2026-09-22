# Plan — `mp-datatable` filter row, `<colgroup>` width ownership, and a document-root overlay portal

PRD: [datatable-filter-row.md](./datatable-filter-row.md)
Status: **Proposed** (2026-09-22) — no branch, no PR. Nothing executed.

| Milestone | State |
|---|---|
| M0 — housekeeping + labels | ⬜ |
| S — Spikes (gate) | ⬜ S1–S7 |
| M1 — `<colgroup>` width ownership | ⬜ |
| M2 — overlay portal primitive | ⬜ |
| M3 — `OverlayController.portal` | ⬜ |
| M4 — column def + filter row markup | ⬜ |
| M5 — header-row-count ARIA fix | ⬜ |
| M6 — trigger, panel, keyboard | ⬜ |
| M7 — styles (light tier) | ⬜ |
| M8 — Angular bridge | ⬜ |
| M9 — demos (ng / react / vue) | ⬜ |
| M10 — specs | ⬜ |
| M11 — batched verification sweep | ⬜ |

---

## Conventions (these still bite)

- **After editing `datatable.light.scss`, re-run codegen or the change is invisible**: `npx nx run mintplayer-web-components:codegen-wc`. The element imports the generated `.ts`, never the `.scss`.
- Generated files (`*.styles.ts`, `*.element.template.ts`, `custom-elements.json`, `*.generated.ts`) are **gitignored build artifacts**. Never stage them. Check the head of any `.ts` before `git add` — an `AUTO-GENERATED` banner means stop.
- **No test suites until M11.** Verify intermediate milestones by reading and `tsc --noEmit`. Commit per milestone anyway — PRs squash, so an intermediate commit need not be green.
- **Commit freely, push once.** Every push bills a workflow run, and a push while a run is in flight cancels it.
- In wrapper specs, **drive inputs from a `signal()`**, never a mutable field.
- New `datatable.light.scss` selectors must pass `_conformance/light-styles-scoping.spec.ts`: anchor on `[data-mps=datatable]`, descendant/child combinators only from anchor to subject, no match against the decoy tree. `/*! @mps-global */` is the only exemption and ships **verbatim**, so it must be hand-authored already-anchored.
- `stampScope` recurses — call it **before** consumer content is appended, never after.
- Branch target is **`master`**.

## Ordering rationale

`<colgroup>` (M1) comes first among the code milestones and is deliberately **independent of the feature**. It is a self-contained refactor of width ownership that stands on its own merits, is separately revertable, and — most importantly — means the filter row lands into a table where widths are already structurally immune to it. Doing it afterwards would mean shipping the row under the fragile regime first and then changing the rules underneath it.

The portal (M2–M3) is next because it gates everything visual in the feature, and is the part most likely to fail — which is why S1/S5 run before a line of it is written.

M4 (markup) and M5 (ARIA arithmetic) depend on neither the portal nor `<colgroup>` and could proceed even if D7 is reopened. M5 is its own milestone rather than a line inside M4 because it changes behaviour for tables that have **no** filter row, and wants to be revertable alone.

Demos (M9) come before specs (M10) because demos are how this repo verifies web components — there is no standalone harness — and because S3 is re-verified against the real demo pages in M11, not the spike harness.

---

## M0 — Housekeeping and labels

Files: `libs/mintplayer-web-components/datatable/src/styles/datatable.styles.ts` (delete), `…/datatable/src/types/labels.ts`

- [ ] Delete the stale `datatable.styles.ts` — generated from a `.scss` deleted in `dbe4808b`, imported by nothing, untracked, will never regenerate (PRD §1.5).
- [ ] Add `filterColumn(column: string): string` to the labels type and the default English labels. A hard-coded English accessible name is a translation bug.
- [ ] `tsc --noEmit`. **Commit.**

## S — Spikes (gate; throwaway; Chromium + Firefox + WebKit; verdicts go into PRD §10)

Harness dir: `docs/prd/_spike-datatable-filter/` — deleted at the end of this milestone, except S3's or S6's page if either proves reusable as committed evidence.

| Spike | What | Pass criterion |
|---|---|---|
| S1 | Lit-rendered panel in a document-root pane; separate `render()` root vs node relocation | Renders, updates, survives 20 open/close cycles with no orphans; outside-click closes on page click, **not** on panel click |
| S2 | Light-tier sheet reaches a pane outside the host | `[data-mps=datatable]` rules apply identically portalled vs in-place, 3 engines; decoy tree still matches nothing |
| S3 | Clipping/occlusion, **paged and virtual** | Panel fully visible at last column and last visible row, both modes, 3 engines, scroller at each extreme; not occluded by sticky header |
| S4 | Second sticky row at a measured `top` | Pins directly below header, no overlap, no gap, every scroll offset, 3 engines; no row bleed-through |
| S5 | Angular `EmbeddedViewRef` with root nodes in `document.body` | Signal-driven binding repaints; view destroys cleanly; no NG0953 |
| S6 | `<colgroup>` under lit, both layout regimes | (a) `repeat()` of `<col>` inside `<colgroup>` parses and stamps in 3 engines, widths actually apply; (b) under `fixed`, widths identical with/without a filter row holding a full-width trigger; (c) under `auto`, delta zero or bounded by the trigger's declared size |
| S7 | Resize with widths on `<col>` | Pointer drag and keyboard ±10px give identical final widths to today, clamped at 40px, 3 engines; no layout thrash worse than the current full re-render |

- [ ] Run S1, S2, S5 (S1/S5 may use one engine + jsdom where the question is not a rendering question).
- [ ] Run S3, S4, S6, S7 in all three engines.
- [ ] Record verdicts, measured numbers, engine versions and Playwright version in **PRD §10**. Delete the harnesses.
- [ ] **Gate:** S1/S5 fail → stop, reopen D7 with the user (PRD §7). S4 fails → promote O3 (PRD §5.3). S6(a) fails → imperative `<colgroup>` in `updated()` + `stampScope`. S6(b)/(c) fail → explicit intrinsic-sizing exclusion for the filter row. S7 fails → keep resize on `_columnWidths` + full re-render; the direct-write optimisation is rejected. **Commit.**

## M1 — `<colgroup>` takes ownership of column widths [PRD §5.2, D4, D5, D14]

Files: `…/datatable/src/components/mp-datatable.ts`, `…/datatable/src/styles/datatable.light.scss`

Self-contained and independent of the filter feature. Revertable on its own.

- [ ] `renderColgroup()`: one `<col>` per rendered column, in the same order as the header — `[tree gutter?][checkbox?][...consumer columns]`. Emitted **after `<caption>` and before `<thead>`** (parser-mandated position; current caption is at `:849`).
- [ ] Per data column, `<col data-column=… style=${styleMap(width ? {width: `${width}px`} : {})}>`. Gutters get `<col class="tree-chevron-col">` / `<col class="checkbox-col">`.
- [ ] Move the gutter widths from the `<th>`/`<td>` class rules (`datatable.light.scss:253-267`) onto the `<col>` rules, so every column's width is declared in one place. Leave `padding` and `text-align` on the cells — **only `width`, `background`, `border` and `visibility` apply to `<col>`**; moving padding there silently does nothing.
- [ ] Remove `style['width']` / `style['minWidth']` from `renderHeader` (`:913-917`). The `<th>` keeps `data-column`, `data-sortable`, `aria-sort`.
- [ ] **Qualify the measure-pass selector to row 1**: `measureColumnWidth` (`:741-747`) currently does `querySelector('th[data-column="…"]')`, which is correct today only because document order puts row 1 first. Make it explicit (`thead tr:first-child th[data-column="…"]`) before a second header row exists to make it ambiguous (PRD §5.2.2).
- [ ] Measure pass (`:711-739`) unchanged in logic; it writes `_columnWidths`, which now renders into `<col>`.
- [ ] Resize (`:1799-1836`) unchanged in logic; keyboard ±10px and the 40px clamp are untouched. **The per-frame direct-write optimisation is optional and only if S7 passed** — do not conflate it with the correctness work; if in doubt, skip it.
- [ ] `tsc --noEmit`. **Commit.**

## M2 — Overlay portal primitive [PRD §5.4, D7, D15]

Files: `libs/mintplayer-web-components/overlay/src/overlay-portal.ts` (new), `…/overlay/src/index.ts`

- [ ] `<mp-overlay-container>` custom element, created lazily, appended as the **last child of `<body>`**, `position: fixed; inset: 0; pointer-events: none`, single `z-index` above the current 1050/1056/1080 ceiling.
- [ ] `acquirePortal(): PortalHandle` → `{ container, release() }`; panes are `<div class="mp-overlay-pane">` with `pointer-events: auto`; reference-counted, host self-removes when the last pane goes.
- [ ] Panes carry **no `z-index`** — they stack in DOM order. That is the win over eleven components each guessing a number.
- [ ] The host sets nothing that establishes a containing block (no `transform`, `filter`, `contain`, `will-change`, `container-type`). Enforced by a spec in M10, not by a comment.
- [ ] Export from the overlay barrel. `tsc --noEmit`. **Commit.**

## M3 — `OverlayController.portal` [PRD §5.4, D8]

Files: `libs/mintplayer-web-components/overlay/src/overlay-controller.ts`

- [ ] Add `portal?: boolean` to `OverlayControllerOptions` (default `false`). Existing consumers untouched.
- [ ] `open()` acquires a pane and installs the panel per the S1 verdict; `close()` and `hostDisconnected()` release it.
- [ ] **Outside-click**: `composedPath().includes(this.host)` (`:708-712`) becomes `includes(host) || includes(panel)`. Without this, a click inside a portalled panel reads as outside and closes it. Highest-risk line in the change.
- [ ] **Close ordering**: resolve the return-focus target and restore focus *before* the panel moves back — the move blurs focus exactly as the existing `display: none` does, which is what the `:263-265` comment is about.
- [ ] Positioning, `dismissStack`, `FocusTrap`, Escape, scroll/resize: unchanged.
- [ ] `tsc --noEmit`. **Commit.**

## M4 — Column def and filter row markup [PRD §5.1, D1–D3, D13]

Files: `…/datatable/src/types/column-def.ts`, `…/datatable/src/components/mp-datatable.ts`

- [ ] `FilterRenderer<T>`; `filterable?`, `filterRenderer?`, `filterActive?` on `DatatableColumnDef`.
- [ ] `renderFilterRow()` beside `renderHeader()`; emitted in `<thead>` only when `columns.some(c => c.filterable)`.
- [ ] Cells repeat the leading gutters in the same order as row 1 (`:852-867`), so `totalColumnCount` matches by construction.
- [ ] Non-filterable columns get an empty `<th class="filter-cell">`; **not** `aria-hidden` (they are structural).
- [ ] No `width` / `min-width` anywhere in the row — widths belong to `<col>` now (M1).
- [ ] Consumer `filterRenderer` output is **not** stamped; any `stampScope` runs before it is appended.
- [ ] `tsc --noEmit`. **Commit.**

## M5 — Header-row-count ARIA fix [PRD §1.2, §6, D6]

Files: `…/datatable/src/components/mp-datatable.ts`

- [ ] Introduce `headerRowCount` (1, or 2 with a filter row).
- [ ] `aria-rowcount` = `rows + headerRowCount` (was `rows + 1`, `:835`).
- [ ] Body `aria-rowindex` = `rowIndex + 1 + headerRowCount` (was `rowIndex + 2`, `:974`).
- [ ] Filter row gets `aria-rowindex="2"`; header row keeps `1`.
- [ ] Verify by reading that no other site assumes the literal. **Commit separately** — this changes behaviour for tables with no filter row and wants to be revertable alone.

## M6 — Trigger, panel, keyboard [PRD §5.1, §5.5, §6, D9]

Files: `…/datatable/src/components/mp-datatable.ts`

- [ ] `<button class="filter-trigger">` per filterable column: `aria-expanded`, `aria-controls`, localized `aria-label` from `labels.filterColumn`.
- [ ] One `OverlayController` for the filter panel: `portal: true`, `modal: true` (focus trap), `scrollStrategy: 'reposition'`.
- [ ] **Anchor resolved lazily by stable key** — `() => renderRoot.querySelector('thead tr.filter-row th[data-column="…"] .filter-trigger')`. Every render rebuilds the header; a captured element detaches under the open panel.
- [ ] No local scroll listener: `.datatable-scroll` is in the light DOM, so the document capture listener sees its scrolls (PRD §5.5). Add a comment saying so, or someone will copy the scheduler's workaround.
- [ ] `aria-expanded` derived in `render()` from controller state — not written from an event handler.
- [ ] `mp-datatable-filter-open` / `-close` events, detail `{ column }`. No filter semantics (PRD §3.1).
- [ ] `tsc --noEmit`. **Commit.**

## M7 — Styles [PRD §5.3, D12, O2]

Files: `…/datatable/src/styles/datatable.light.scss`

- [ ] `.filter-row`, `.filter-cell`, `.filter-trigger`, active dot, panel chrome — all anchored on `[data-mps=datatable]`.
- [ ] Trigger is `width: 100%` of its cell with no intrinsic minimum above the sort header's existing `padding-right: 2rem` (`:101-114`), so it never becomes the widest thing in the column during the `auto` phase.
- [ ] Virtual mode: `--mp-datatable-header-height` written by the measure pass (`:711-739`) from `thead tr:first-child`, re-measured on the `ResizeObserver` already watching the scroller (`:651-664`); filter row uses `top: var(--mp-datatable-header-height, 0)` with an opaque background matching the header's treatment (`:43-50`), or rows bleed through.
- [ ] `:focus-visible` ring for the trigger — no `outline: none` without a replacement in the same sheet.
- [ ] `prefers-reduced-motion` on any panel transition.
- [ ] **Re-run `npx nx run mintplayer-web-components:codegen-wc`.** Do not stage the generated `.ts`.
- [ ] **Commit** (the `.scss` only).

## M8 — Angular bridge [PRD §5.6, D10]

Files: `libs/mintplayer-ng-bootstrap/datatable/src/datatable-filter/datatable-filter.directive.ts` (new), `…/src/datatable/datatable.component.ts`, `…/src/index.ts`

- [ ] `[bsDatatableFilter]` directive injecting `TemplateRef`, with a `name` input binding it to a column. A sibling of `[bsDatatableColumn]`, not an extension — a structural directive has exactly one `TemplateRef`.
- [ ] `contentChildren(BsDatatableFilterDirective)`; in `effectiveColumns` (`:181-204`) set `filterable: true` + a lazy `EmbeddedViewRef` closure mirroring `headerRenderer` exactly.
- [ ] `filterViews` destroyed in the existing `destroyRef.onDestroy` block (`:212-217`).
- [ ] **Fix the inherited leak while here**: destroy and clear the previous generation of `headerViews` (and now `filterViews`) at the top of the `effectiveColumns` recompute. Today they accumulate until component destroy; with filter views that doubles.
- [ ] `[columns]` still wins over content children (`:184`), so the programmatic path gets the new fields free.
- [ ] Export from the barrel. `tsc --noEmit`. **Commit.**

## M9 — Demos [PRD §5.7, §9, D11]

Files: `apps/ng-bootstrap-demo/src/app/pages/enterprise/datatables/*`, `apps/react-bootstrap-demo/src/app/pages/DatatablePage.tsx`, `apps/vue-bootstrap-demo/src/views/DatatableView.vue`

- [ ] Angular: a "Column filters" section — live `<bs-datatable>` with `*bsDatatableFilter` templates, **demo before snippet**, `<bs-code-snippet>` fed from a `dedent` field.
- [ ] React and Vue: same section, `filterable` + `filterRenderer` inside the existing `columns` consts (no wrapper change — D11), `*_SOURCE` template-literal snippets.
- [ ] At least one demo shows it in **virtual** mode, since that is where clipping and sticky both bite.
- [ ] Document the `.form-control`-only-inside-`<bs-form>` caveat in the `<details>` light-DOM blurb each demo page already carries (PRD §9).
- [ ] Document the keymap on the demo page (repo rule for any widget).
- [ ] **Commit.**

## M10 — Specs [PRD §11]

Files: `…/datatable/src/components/mp-datatable.{aria,keyboard,filter-row,colgroup}.spec.ts`, `…/overlay/src/{overlay-portal,overlay-controller}.spec.ts`, `_conformance/consumer-dom-boundary.spec.ts`, `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.spec.ts`, `libs/mintplayer-vue-bootstrap/_conformance/behaviour/BsDatatable.spec.ts`

- [ ] ARIA: no row when nothing filterable; row when something is; `aria-rowindex`/`aria-rowcount` **with and without** the filter row (the M5 regression); trigger role/name/`aria-expanded` in both states; `aria-controls` resolves.
- [ ] Keyboard: tab-reachable; Enter/Space open; Escape closes + restores focus; Tab trapped while open; a click in the filter row never sorts.
- [ ] New `filter-row.spec.ts`: cell count equals `totalColumnCount` across all four tree×checkbox permutations; empty cells for non-filterable columns; `filterRenderer` invoked once per open, not per render.
- [ ] New `colgroup.spec.ts`: one `<col>` per rendered column including gutters, in order; `col.width` pins; measure pass writes `<col>`; resize updates the `<col>`; **the measure selector matches row 1's `<th>`, not the filter cell**.
- [ ] New `overlay-portal.spec.ts`: acquire/release refcount; host removed with the last pane; computed style asserts no containing-block-forming property.
- [ ] `overlay-controller.spec.ts`: `portal: true` move/restore; outside-click with the panel outside the host.
- [ ] `consumer-dom-boundary.spec.ts`: add `filterRenderer` to the renderers asserted unstamped (`:151-189`).
- [ ] Angular spec drives inputs from a `signal()`; covers the view-accumulation fix across a column-set change. Vue conformance: `columns` with a `filterRenderer` round-trips.
- [ ] e2e per demo app: open → keyboard → close, in virtual mode.
- [ ] **Commit.**

## M11 — Batched verification sweep (only now; one pass)

```bash
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components
npx nx test mintplayer-ng-bootstrap
```

- [ ] Redirect each to a log file and read the log — never pipe the only copy into `grep`/`tail` (the pipeline's exit code is `grep`'s, so a failed build reads as success).
- [ ] e2e sweep across the three demo apps.
- [ ] Re-verify S3 and S6 against the **real demo pages**, not the spike harness, in all three engines — paged and virtual.
- [ ] Manual keyboard pass: tab through it, Escape closes, focus returns, no trap outside the panel.
- [ ] Record results and any deviation in the PRD (`## As built`). **Commit, then push once.**

---

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Lit will not tolerate a panel outside its render root | S1 gates it; fallback is a separate `render()` root, then reopening D7 |
| R2 | Portalled `EmbeddedViewRef` looks fine in the demo, stale in a real app (OnPush island) | S5 measures it with a signal-driven binding, not a static template |
| R3 | Outside-click closes the panel on a click inside it | Explicit `includes(panel)` in M3; spec'd in M10 |
| R4 | `<col>` widths don't apply through a lit `repeat()` | S6(a) before any of M1; imperative `<colgroup>` is the named fallback |
| R5 | Padding/alignment silently moved to `<col>` where it does nothing | M1 explicitly leaves non-width properties on the cells; only four properties apply to `<col>` |
| R6 | Measure pass matches the filter cell instead of row 1's `<th>` | M1 qualifies the selector *before* a second row exists to make it ambiguous |
| R7 | Filter row inflates a column during the `auto` phase and the value is pinned forever | S6(c); trigger is width-neutral by CSS (M7) |
| R8 | Double-sticky misbehaves in one engine | S4 in 3 engines; O3 (sticky `<thead>`) is the named fallback |
| R9 | M5's arithmetic change regresses tables with no filter row | Own milestone, own commit, spec'd both ways |
| R10 | Portal `z-index` still loses to consumer app chrome | Exposed as a custom property so a consumer can raise it; a portal cannot win against arbitrary page CSS and should not pretend to |
| R11 | Scope creep into filter semantics | PRD §3.1 is explicit; the only events carry a column name |

## Explicitly rejected (do not resurrect casually)

- **Filter controls inside the existing `<th>`.** Interactive-inside-`<button>`, and every filter click sorts (PRD §1.1).
- **Keeping widths as inline styles on row 1's `<th>`.** It is the sole reason a second header row is entangled with sizing; `<colgroup>` makes the filter row structurally incapable of affecting geometry under `fixed` layout (PRD §5.2).
- **`visibility: collapse` on `<col>` for column hiding.** Historically inconsistent across engines, and hiding is out of scope. Re-measure it if column hiding is ever picked up (PRD §13).
- **Moving padding/alignment onto `<col>`.** Only `width`, `background`, `border` and `visibility` apply. It would silently do nothing.
- **`position: fixed` + a hand-picked `z-index`, the current house pattern.** Depends on no ancestor establishing a fixed containing block — unenforceable when the ancestors belong to the consumer's app (PRD §1.8, §5.4).
- **`has-overlay`.** An Angular component with an empty template whose only content is a CDK CSS import. Not reachable from a web component (PRD §1.6).
- **`@angular/cdk/overlay` itself.** No third-party dependency, and nothing Angular inside `web-components/**`.
- **Migrating the other ten overlay consumers to the portal in this PR.** Named as the immediate successor (PRD §13); the portal is built reusable so that migration is mechanical.
- **A no-JS tier for the filter row.** A script-positioned dropdown has no meaningful inert rendering.
- **Sticky on `<thead>` instead of per-`th` (O3).** Cleaner, but it risks a shipped, tested header to serve a row most tables will not render. Held as the S4 fallback.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
