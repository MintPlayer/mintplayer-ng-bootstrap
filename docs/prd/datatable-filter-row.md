# PRD — `mp-datatable` filter row, and a document-root overlay portal

Status: **Spikes complete, gate cleared** (2026-09-22) — branch `feat/datatable-filter-row`, no PR yet.
S1–S5 **PASS** in Chromium 151.0.7922.34 / Firefox 153.0 / WebKit 26.5 (Playwright 1.62.1). **S6 FAILED and `<colgroup>` is dropped** — see §5.2, which is kept as a rejection with evidence rather than deleted. S7 fell with it.
Plan: [datatable-filter-row-plan.md](./datatable-filter-row-plan.md)
Related: issue **#414** (open), driven by [MintPlayer.Spark#431](https://github.com/MintPlayer/MintPlayer.Spark/issues/431); builds on #408 / PR #410 (light tier) and [overlay-controller-positioning.md](./overlay-controller-positioning.md).

---

## 0. Summary for the impatient

1. The feature is a **second `<thead>` row**, hidden unless at least one column opts in, one cell per column, each holding a consumer-supplied trigger + filter panel. This component never decides what a filter *means*.
2. The panel is rendered into a **document-root overlay portal** — a new, reusable capability in the `overlay` lib, modelled on `@angular/cdk/overlay`'s container/portal split. **No portal exists today**: `OverlayController` is positioning-only and all eleven consumers render panels in place. Measured: an in-place panel **is** clipped in both paged and virtual mode; a portalled one is not (§9, S3).
3. **`<colgroup>` was designed in and then measured out.** Its headline justification turned out to be false — the filter row is *already* inert under `table-layout: fixed` — while it regressed the `auto` phase and would have silently resized every existing consumer's table by the header's horizontal padding. §5.2 records the numbers.
4. One correctness bug the issue does not mention: `aria-rowindex` / `aria-rowcount` are hard-coded to exactly one header row (§1.2). A second row ships an off-by-one on every row's announced position.
5. Three claims in the issue text are wrong and are corrected here: `datatable.styles.ts` is a **stale artifact** of a deleted source (§1.5), `has-overlay` is an **Angular-only CSS marker** (§1.6), and `*bsDatatableCell` / `*bsDatatableHeader` **do not exist** (§1.7).
6. The component is framework-agnostic and stays that way. Its contract is `filterRenderer: (column) => Node`; where that Node comes from is the wrapper's business, and S5 tests the three *shapes* a consumer Node can take rather than any one framework.

---

## 1. Problem

`mp-datatable` has no filter concept. `DatatableColumnDef` carries `name / label / sortable / width / cellRenderer / headerRenderer / cellClass` (`libs/mintplayer-web-components/datatable/src/types/column-def.ts:43-58`) and a repo-wide grep for `filter` across the four datatable libs returns only `Array.prototype.filter` calls.

Spark needs a Vidyano-style per-column value filter and cannot build it itself, because the `<thead>` belongs to this component.

### 1.1 Why it cannot go inside the existing `<th>` (confirmed)

`renderHeader` wraps header content in `<button type="button" class="header-cell header-sort">` whenever the column is sortable — `mp-datatable.ts:931-941`, and `sortable = col.sortable ?? true` (`:907`), i.e. **sortable is the default**. A filter trigger placed there would be an interactive element inside a `<button>`: invalid HTML, an accessibility failure, and `onHeaderClick` (`:1572`) would fire a sort on every filter click. The `<th>` already hosts a second interactive child — the `.resize-handle` `role="separator"` (`:945-957`) — and `onHeaderClick` only escapes it via an explicit `closest('.resize-handle')` test. Adding a third would extend that ad-hoc exclusion list.

So it has to be a real second row. The issue is right about this.

### 1.2 The ARIA row arithmetic assumes exactly one header row — **a live bug the feature would expose**

`<thead>` contains exactly one hard-coded `<tr role="row" aria-rowindex="1">` (`mp-datatable.ts:850-851`). Everything downstream is built on that literal:

- `aria-rowcount` is `<data rows> + 1` (`:835`)
- every body row's `aria-rowindex` is `rowIndex + 2` (`:974`)

Emitting a second `<tr>` in `<thead>` without touching these makes the first data row claim to be row 2 when it is row 3, and understates the count by one — for the whole grid, in both paged and virtual mode. Assistive technology reads those numbers verbatim. See D5.

### 1.3 Width ownership — measured, and less dangerous than it looked

Widths are applied **only as inline `style` on the first header row's `<th>`** (`renderHeader:910-917`, `styleMap` at `:929`); body `<td>`s get no width. The table is `table-layout: auto` (`datatable.light.scss:69-79`) until a one-shot measure pass flips it: `maybeMeasureInitialColumnWidths` (`:711-739`) waits for ≥1 column and ≥1 real body row, measures `Math.ceil(th[data-column=…].getBoundingClientRect().width)` (`:741-747`), writes `_columnWidths`, sets `_hasMeasuredInitial`, and re-renders into `table.measured { table-layout: fixed }` (`:81-83`).

The original worry was that a second header row would be entangled with sizing. **Measurement says it is not** (§9, S6b/S6c):

- **After the measure pass (`fixed`), the filter row is completely inert.** Column widths are byte-identical with and without it, in all three engines. `table-layout: fixed` resolves widths from the first row; row 2 is never consulted.
- **Before the measure pass (`auto`), the filter row is inert too** — *provided the trigger is width-neutral*. With a `width: 100%; min-width: 0` trigger the delta is 0px on every column. With deliberately hostile unbreakable content it is catastrophic (one column went from 224px to 515px), so the width-neutral trigger is a load-bearing requirement, not styling polish (D6).

Two real items remain:

- **`measureColumnWidth` uses `querySelector('th[data-column="…"]')`**, which today returns row 1's cell only because it is first in document order. Measured and confirmed (S6c2: `unqualifiedIsRow1: true`). Once a second row exists that is an accident, not a contract, so the selector gets an explicit `thead tr:first-child` qualifier (D7).
- The measure pass must not pick up the filter row's height when it starts publishing the header height for the sticky offset (§5.3).

### 1.4 Sticky stacking in virtual mode

In virtual mode sticky is declared on the **individual `th`**, not on `<thead>` or `<tr>`: `thead th { position: sticky; top: 0; z-index: 1; background-color: var(--bs-body-bg,#fff) }`, scoped to `.datatable-scroll.datatable-virtual` (`datatable.light.scss:30-58`). A second row of sticky cells at the same hard-coded `top: 0` pins on top of the first — measured: they overlap by exactly the header height (§9, S4). Nothing measures that height and no custom property carries it. The `.resize-handle` sits at `z-index: 2` (`:187-196`), so `z-index: 1` is already not the top of the local stack.

The hover rule re-asserts an opaque background as a layered `background-image` so scrolled rows do not bleed through the sticky header (`:43-50`). A new sticky row needs the same treatment.

### 1.5 Correction — `datatable.styles.ts` is a stale artifact, not the stylesheet

The issue says filter-row styling goes in `datatable.styles.ts`. It does not.

- `src/styles/datatable.light.scss` (tracked, the real source) → `datatable.light.styles.ts` (generated) → exported by `src/styles/index.ts`, which exports **only** `datatableLightStyles`.
- `src/styles/datatable.styles.ts` announces `// Source: datatable.styles.scss` — but that `.scss` was **deleted in `dbe4808b`** (#410, the light-DOM conversion). The `.ts` is a leftover from the last build before that commit, is untracked (gitignored), is imported by nothing, and still contains dead shadow-tier `:host{}` CSS. It will never regenerate.

All CSS therefore goes in **`datatable.light.scss`**, which means every new selector must satisfy `_conformance/light-styles-scoping.spec.ts`: some compound must carry `[data-mps=datatable]` (or be the `mp-datatable` tag), **every combinator from that anchor to the subject must be descendant or child** — a `+` or `~` after the anchor fails the static check (`:82-93, 142-149`) — and no selector may match the decoy tree, which explicitly contains a bare `<table><thead><tr><th>` and a `.datatable-shell > .datatable-scroll` (`:154-165`). `ALLOWED_GLOBAL_SELECTORS` is empty (`:39-41`); the only exemption is `/*! @mps-global */`, which emits the rule **verbatim** and must be hand-authored already-anchored.

### 1.6 Correction — `has-overlay` is not a candidate

`BsHasOverlayComponent` (`libs/mintplayer-ng-bootstrap/has-overlay/src/has-overlay/has-overlay.component.ts:17-23`) is an **Angular** component with zero members, an empty template, and a three-line stylesheet whose entire body is `::ng-deep { @import 'node_modules/@angular/cdk/overlay-prebuilt'; }`. Its own JSDoc (`:3-16`) states it is a CSS-injection marker and explicitly declines any behavioural responsibility. It does not exist in `libs/mintplayer-web-components/` in any form.

### 1.7 Correction — the Angular directive surface is smaller than the issue assumes

`*bsDatatableCell` and `*bsDatatableHeader` do not exist. There are exactly two structural directives:

- `[bsDatatableColumn]` (`datatable-column.directive.ts:20-28`) — inputs `name` and `sortable`. **Its template content *is* the header template**; there is no separate header directive.
- `[bsRowTemplate]` (`row-template.directive.ts:26-47`) — whole-row, with a context class and `ngTemplateContextGuard`.

`cellRenderer` is never bridged by the Angular wrapper; it is reachable only through the programmatic `[columns]` input (`datatable.component.ts:78`). So the new filter directive is a **third** directive, mirroring the `headerRenderer` closure in `effectiveColumns` (`:181-204`).

### 1.8 The clipping problem — measured, not assumed

`.datatable-scroll { overflow: auto }` (`datatable.light.scss:25-28`), plus `max-height: var(--mp-datatable-virtual-max-height, 480px)` in virtual mode (`:30-34`).

S3 measured an in-place panel anchored to the **last** column's filter cell, by hit-testing all four corners:

- **Paged**: clipped horizontally — `topRight` and `bottomRight` unreachable in all three engines.
- **Virtual**: clipped horizontally *and* vertically — only `topLeft` and `center` reachable.
- **Portalled**: all four corners plus centre reachable, both modes, all three engines. It also wins the hit test when parked directly over the sticky header.

The house answer to clipping so far is `position: fixed` + a hand-picked `z-index`, per consumer. That works **only** while no ancestor establishes a fixed containing block — enforced nowhere except comments, six of them across the scheduler alone (`scheduler.styles.scss:595-598, 863-867, 1260-1265`; `mp-scheduler.ts:623, 2049`; `scheduler-compact-timeline-localization.md:223-238`). For a datatable that is a worse bet than usual, because the ancestor chain above `mp-datatable` belongs to the **consumer** — this is a light-DOM component deliberately open to page CSS (`mp-datatable.ts:104-114`). We cannot write a comment in someone else's app.

---

## 2. Goals

1. A second header row, rendered only when at least one column opts in, aligned with the header and body rows **by construction** rather than by CSS tuning.
2. A per-column filter template expressed as a framework-neutral WC contract, satisfiable identically by all three wrappers.
3. A filter panel that is **not clipped** by the scroll container and not occluded by the sticky header, in paged *and* virtual mode, in three engines.
4. The panel escapes clipping by a mechanism that does not depend on the consumer's ancestor CSS.
5. Full keyboard operability and a correct accessibility tree, including the row-index arithmetic fix.
6. The portal is a **reusable overlay capability**, not datatable-private code.

## 3. Non-goals

1. **Any filter semantics.** No predicate model, no operator vocabulary, no filter state, no `filter-change` event carrying a query. The panel's contents are the consumer's template. If a shared vocabulary is ever wanted it comes from `bs-query-builder`'s existing `Expression` / operator / per-type editor registry.
2. Server- or client-side filtering of `data` / `fetch`.
3. **Column hiding, reordering, or any `<colgroup>` adoption** (§5.2).
4. Converting any other component to the portal in this PR.
5. A no-JS tier for the filter row. A script-positioned dropdown has no meaningful inert rendering; `mp-datatable` ships no `ssr/` directory today.

---

## 4. Locked decisions

| # | Decision | Consequence |
|---|---|---|
| D1 | The filter row is a real second `<tr>` in `<thead>`, emitted only when `columns.some(c => c.filterable)` | No row, no cost, no ARIA change for the overwhelming majority of tables |
| D2 | Cells repeat the **same leading gutters** as row 1 — `[tree gutter?][checkbox?][...consumer columns]` (`:852-867`) | Alignment is structural |
| D3 | Column opt-in is `filterable?: boolean` (default **false**), content is `filterRenderer?: (column) => Node` | Mirrors `headerRenderer` exactly (`column-def.ts:11-13`); default-off is the opposite of `sortable`'s default-on, deliberately |
| D4 | **`<colgroup>` is not adopted.** Widths stay as inline style on row 1's `<th>` | Measured: it buys nothing the `fixed` layout does not already give, regresses the `auto` phase, and silently resizes existing tables (§5.2) |
| D5 | The row-index arithmetic is parameterised on the actual header-row count | Fixes §1.2 before it ships |
| D6 | The filter trigger is **width-neutral by CSS** (`width: 100%; min-width: 0`, no intrinsic minimum above the sort header's `padding-right: 2rem`) | Measured load-bearing: hostile content inflates a column by >2× under `auto` (§9, S6e) |
| D7 | `measureColumnWidth`'s selector is qualified to `thead tr:first-child` | It is correct today only by document-order accident (§9, S6c2) |
| D8 | The panel is rendered into a **document-root overlay portal**, a new capability in the `overlay` lib | Clipping and stacking stop being the consumer's problem (§5.4) |
| D9 | `OverlayController` grows the portal as an **option**, not a rewrite | Eleven working consumers stay untouched |
| D10 | The portal uses a **separate lit render root** whose container is the pane — not relocation of a template-rendered node | Both worked in S1, but relocation is unsupported by lit in general and only survived a narrow test (§9, S1c) |
| D11 | The trigger is a real `<button>` owned by **this component**; only the panel's *contents* are the consumer's | Role, name, `aria-expanded`, `aria-controls`, focus and keymap stay testable |
| D12 | Angular bridges via a third structural directive `[bsDatatableFilter]`; React and Vue need **no wrapper change** | `filterable`/`filterRenderer` ride inside the `columns` objects, which both already forward as element properties |
| D13 | Consumer filter DOM is **not** stamped with `data-mps=datatable` | Measured to hold across the portal (§9, S5); joins the three renderers already asserted in `_conformance/consumer-dom-boundary.spec.ts:151-189` |
| D14 | All CSS goes in `datatable.light.scss`, scope-anchored; the stale `datatable.styles.ts` is deleted | §1.5 |
| D15 | No third-party dependency. No `@angular/cdk` in a web component | Standing repo rule |
| D16 | Minor version bump; npm major stays pinned to the Angular major | Purely additive API |

---

## 5. Design

### 5.1 The filter row

`renderFilterRow()` beside `renderHeader()`, emitted inside `<thead>` after the existing `<tr>`:

```
<thead>
  <tr role="row" aria-rowindex="1"> … existing header cells … </tr>
  <tr role="row" aria-rowindex="2" class="filter-row">   ← only when any column is filterable
    [tree gutter th][checkbox th][ one th per consumer column ]
  </tr>
</thead>
```

Per data column, when `col.filterable`:

```html
<th class="filter-cell" data-column="…" scope="col">
  <button type="button" class="filter-trigger"
          aria-expanded="false" aria-controls="<panel id>"
          aria-label="<labels.filterColumn(col.label ?? col.name)>">
    <!-- icon, plus an "active" dot driven by the column's `filterActive` flag -->
  </button>
</th>
```

and when it is not, an empty `<th class="filter-cell">` — present, sized by the column, contributing nothing.

- **`scope="col"` on both rows.** Two `<th scope="col">` in one column is valid. The filter cell carries no text, so it adds nothing to the computed column header name.
- **The empty cells must not be `aria-hidden`** — they are in the table's structural grid and hiding them desynchronises column counts.
- **Gutter cells repeat** exactly as in row 1, both empty.
- The trigger is width-neutral (D6). This is the one CSS requirement that is load-bearing rather than cosmetic.

### 5.2 `<colgroup>` — designed in, measured out (rejection with evidence)

The first draft of this PRD moved column widths onto a `<colgroup>`, on the reasoning that widths living on row 1's `<th>` is the only thing entangling a second header row with sizing. S6 tested it against a `<th>` control arm. All three engines agreed on every value.

**Why it was dropped:**

1. **The premise was false.** Under `table-layout: fixed` the filter row is already inert with widths on `<th>` — `s6b_th_filterRowIsInert: true`, identical widths with and without the row. Fixed layout reads row 1 only. The property `<colgroup>` was supposed to buy already exists.
2. **It regressed the `auto` phase.** With the filter row present, `<col>` widths gave a 10px delta on a narrow declared column; `<th>` widths gave **0px**. Because `width: 60` on `<col>` means a 60px column, while on `<th>` it means 60px *plus* padding — a larger target the filter cell's min-content cannot exceed.
3. **It would silently resize every existing table.** The decisive measurement: `<col>` widths land literal `[120, 300, 400, 200]`; the `<th>` control lands `[164, 344, 444, 244]` — exactly **+44px** each, being 12px left padding plus the 32px `padding-right` that `th[data-sortable=true]` carries. So `width: 200` would change from a 244px column to a 200px one for every consumer, with no API change to signal it.

`<colgroup>` is mechanically fine under lit — `s6a` passed cleanly (a `repeat()` of `<col>` parses, stamps and applies), and `<th>` node identity stayed stable across `<col>` width writes, so the resize path would not have needed a re-render. It simply does not pay for itself here. Recorded so the idea is not re-proposed without these numbers; if column hiding or reordering is ever picked up, revisit it there, where the breaking width semantics can be weighed on their own merits (§13).

### 5.3 Sticky offset in virtual mode

The filter row needs `position: sticky` with `top: <height of header row 1>`.

- **O1 — CSS only.** Not available: `top` cannot reference a sibling's height.
- **O2 — measured custom property.** The existing one-shot measure pass (`:711-739`) already runs at the right moment. Extend it to write `--mp-datatable-header-height` from `thead tr:first-child`; the filter row uses `top: var(--mp-datatable-header-height, 0)`. Re-measured on the `ResizeObserver` already watching the scroller (`:651-664`).
- **O3 — sticky on `<thead>`.** Changes stacking and background behaviour of a shipped, tested header for a row most tables will not render.

**O2, confirmed by S4**: pinned with zero gap and zero overlap at every scroll offset, no row bleed-through, in all three engines, under both `border-collapse: collapse` and `separate`. And the measured header height differs per engine — **36px in Chromium and Firefox, 33px in WebKit** — which is exactly why it must be measured rather than hard-coded.

**A measurement trap worth writing down**: `position: sticky` here is on the `<th>`, not the `<tr>`. The row box stays in flow while the cells shift, so `headerRow.getBoundingClientRect()` reports an *unstuck* header and every conclusion drawn from it is wrong. Specs and any future harness must measure the **cells**.

### 5.4 The overlay portal

`OverlayController` is **positioning-only**: it writes `panel.style.left/top` and nothing else (`overlay-controller.ts:386-438`), never sets `position`, `z-index` or `transform`, and never moves a node. Its own PRD makes this a non-goal in writing (`overlay-controller-positioning.md:53`). There is no `document.body.appendChild` anywhere in the overlay path.

**New: `libs/mintplayer-web-components/overlay/src/overlay-portal.ts`**

- A single shared host, created lazily and appended to `document.body`: `<mp-overlay-container>`, one per document, reference-counted.
- `acquirePortal(): PortalHandle` → `{ container, release() }`; the container is a `<div class="mp-overlay-pane">`, removed on release; the host removes itself when the last pane goes (S1b: 20 open/close cycles, zero orphans).
- The host is the **last child of `<body>`** with a single `z-index` above the library's current ceiling (1080 file-manager, 1056 tree-select, 1050 everything else). Panes carry **no `z-index`** and stack in DOM order.
- `position: fixed; inset: 0; pointer-events: none` on the host, `pointer-events: auto` on panes.
- **The host must not establish a containing block.** S2b asserts `transform`, `filter`, `contain`, `will-change` and `perspective` are all `none`/`auto`, and that a `position: fixed` child resolves against the **viewport** (measured at exactly 0,0). A spec keeps it that way.

**`OverlayController` gains `portal?: boolean`** (default `false`). `open()` acquires a pane and renders the panel into it via a **separate lit render root** (D10); `close()`/`hostDisconnected()` release it. Positioning, `dismissStack`, `FocusTrap`, Escape and scroll/resize are unchanged. Two things are **not** automatic:

- **Outside-click.** `composedPath().includes(this.host)` (`:708-712`) — with a portalled panel, a click **inside the panel** has a composed path that does not include the host, so the current check closes it. **Measured, not predicted** (S1d: `currentCheckWouldClose_onPanelClick: true`). The check becomes `includes(host) || includes(panel)`, which S1d confirms is correct for all three cases: panel click (stay open), page click (close), trigger click (stay open).
- **Close ordering.** Focus must be restored *before* the pane is torn down; S1e confirms focus then stays on the trigger and never falls to `<body>`.

**What the portal costs** — three subtree dependencies, all measured:

1. **Lit.** A separate render root in the pane renders and updates correctly (S1a). Relocating a template-rendered node *also* worked (S1c) but is unsupported in general, and this harness independently tripped lit's own guard — *"This `ChildPart` has no `parentNode`… the element containing the part was manipulated in an unsupported way"* — when a container was cleared via `innerHTML`. D10 takes the safe option.
2. **Light-tier styles.** `installLightStyles('datatable', …)` (`:1863`) installs at **document** level (`install-light-styles.ts:62-99`), so it reaches a pane in `document.body`. S2 confirms: the portalled panel and its descendants are styled identically to in-place, the in-place table stays styled, and an **unstamped decoy in the same pane stays unstyled** — the no-leak property survives the portal.
3. **IDREFs.** `aria-controls` from a trigger in the table to a panel in `document.body` resolves: same document tree, no shadow boundary, because `mp-datatable` has no shadow root (`:112-114`). Had this been a shadow component the portal would have broken `aria-controls` outright.

### 5.5 Consumer content is framework-neutral

The contract is `filterRenderer: (column) => Node`. The component appends that Node into the panel and never asks where it came from. S5 tested the three *shapes* a consumer Node actually takes, rather than any one framework:

- **fresh node per call** (React / Vue render-prop style),
- **the same node re-returned** (Angular's `EmbeddedViewRef` cache; tree-select's 400-entry LRU),
- **a node mutated after mount** (any framework updating its own view).

All three survive a panel re-render with identity intact, stay unstamped, remain usable after close, and post-mount mutations are visible. Our own greedy `button[data-mps=datatable]` rule reaches our stamped button and **not** the consumer's.

Consumer DOM is appended **after** any `stampScope` call — `stampScope` recurses and would otherwise brand the consumer's nodes with our scope.

### 5.6 Scroll tracking — a trap that does *not* apply here

The scheduler records that `scroll` does not compose, so `OverlayController`'s document capture listener never sees a scroll of a container **inside a shadow root**, silently killing both `reposition` and `close` (`scheduler-view-mode-completeness.md:728-733`, worked around at `mp-scheduler.ts:1066-1076, 1219-1227`).

`.datatable-scroll` is in the **light DOM**, so the document capture listener (`:591-594`) receives its scroll events normally and `scrollStrategy: 'reposition'` works with no local listener. Stated so nobody copies the scheduler's workaround — and so that if `mp-datatable` ever regains a shadow root, the reason this worked is on record.

The anchor must still be resolved **lazily by stable key**, because every render rebuilds the header and a captured element detaches under an open panel (`scheduler-compact-timeline-localization.md:216-218`).

### 5.7 Angular bridge

A third directive, `[bsDatatableFilter]`, injecting `TemplateRef`, with a `name` input associating it with a column — a structural directive has exactly one `TemplateRef`, so overloading `[bsDatatableColumn]` is not possible.

In `effectiveColumns` (`:181-204`) a matching directive yields `filterable: true` plus a `filterRenderer` using the same lazy `EmbeddedViewRef` closure as `headerRenderer`, with the view pushed to a `filterViews` array registered in the existing `destroyRef.onDestroy` block (`:212-217`).

One pre-existing defect is inherited and fixed while here: `headerViews` **accumulates** — when `effectiveColumns` recomputes, new closures push fresh views and the old ones live until component destroy. With filter views that doubles. Fix: destroy and clear the previous generation at the top of the recompute, the discipline `rowViews` already applies (`:314-326`).

### 5.8 React and Vue

No wrapper change (D12). React's wrapper is a single `createComponent` call with no props interface of its own (`BsDatatable.tsx:30-46`) — `columns` is forwarded as a property, so a `filterRenderer` inside a column def arrives intact, exactly as `cellRenderer` does today (`DatatablePage.tsx:56-62`). Vue assigns `el.columns = props.columns ?? []` in `syncProps` (`BsDatatable.vue:68`).

Both demos gain a filter example, which is the deliverable for those two frameworks.

---

## 6. Accessibility contract

| Requirement | How |
|---|---|
| Filter row is not announced as a data row | It is in `<thead>`, `role="row"`, counted as a header row — D5 |
| `aria-rowindex` / `aria-rowcount` stay truthful | Filter row is `aria-rowindex="2"`; body rows `rowIndex + 1 + headerRowCount`; `aria-rowcount` `rows + headerRowCount` |
| Every trigger has a role and a non-empty name | Real `<button>`; name is a localized `labels.filterColumn(columnLabel)` in `types/labels.ts` |
| State on the role | `aria-expanded` on the trigger, written in the **same render** as the panel opens, derived from controller state |
| `aria-controls` | Trigger → panel id; valid across the portal because there is no shadow boundary (§5.4) |
| Keyboard | Trigger tab-reachable; Enter/Space opens; Escape closes and returns focus; Tab cycles within the open panel (`FocusTrap`, `modal: true`) |
| Focus restore | Restored to the trigger *before* the pane is released (S1e) |
| Focus ring | `:focus-visible` rule in `datatable.light.scss`; no `outline: none` without a replacement |
| Sort unreachable from the filter row | The filter row contains no `.header-sort` button and `onHeaderClick` is bound only in row 1 (`:932`) — structural |
| Reduced motion | Any panel transition honours `prefers-reduced-motion` |

---

## 7. #1 risk — read before implementing

**The portal is the risk; the row is routine.** That risk is now substantially retired by S1/S2/S5, which measured the three things that could have sunk it: lit's tolerance of a pane-rooted render, the light-tier sheet's reach across the portal, and consumer-node survival.

What remains is the **outside-click check** (§5.4). It is one boolean expression, it is wrong today for a portalled panel, and getting it wrong is invisible in a demo — the panel simply closes the instant you click anything in it, which reads as a flaky dropdown rather than a logic bug. It is spec'd in M9 and must not be refactored without re-reading S1d.

Second-order: the portal makes `z-index` a DOM-order question inside the container, but nothing stops a consumer's app chrome from outranking the container itself. That is exposed as a custom property rather than pretended away (R7).

---

## 8. Public API

**`libs/mintplayer-web-components/datatable/src/types/column-def.ts`**

```ts
export type FilterRenderer<T = unknown> = (column: DatatableColumnDef<T>) => Node;

export interface DatatableColumnDef<T = unknown> {
  // … existing: name, label, sortable, width, cellRenderer, headerRenderer, cellClass
  /** Opt this column into the filter row. Default false. */
  filterable?: boolean;
  /** Contents of this column's filter panel. Ignored unless `filterable`. */
  filterRenderer?: FilterRenderer<T>;
  /** Purely visual: marks the trigger as "has an active filter". The consumer owns the meaning. */
  filterActive?: boolean;
}
```

**Events** — two, carrying no semantics:

```ts
'mp-datatable-filter-open'   // detail: { column: string }
'mp-datatable-filter-close'  // detail: { column: string }
```

**`libs/mintplayer-web-components/overlay/src/overlay-portal.ts`**

```ts
export interface PortalHandle { readonly container: HTMLElement; release(): void; }
export function acquirePortal(): PortalHandle;
```

**`OverlayControllerOptions`** — `portal?: boolean` (default `false`).

**Angular** — `[bsDatatableFilter]` directive with a `name` input.

**Labels** — `filterColumn(column: string): string`.

**CSS custom properties** — `--mp-datatable-header-height` (written by the component), `--mp-overlay-container-z-index` (consumer escape hatch).

---

## 9. Spikes — verdicts

Chromium 151.0.7922.34, Firefox 153.0, WebKit 26.5, Playwright 1.62.1. Harnesses at `docs/prd/_spike-datatable-filter/`, deleted after this section was written.

| # | Question | Verdict |
|---|---|---|
| S1 | Lit-rendered panel in a document-root pane; outside-click semantics | **PASS** |
| S2 | Light-tier sheet reaches a pane outside the host; container establishes no containing block | **PASS** |
| S3 | Clipping/occlusion, paged and virtual | **PASS** |
| S4 | Second sticky row at a measured `top` | **PASS** |
| S5 | Consumer-supplied Nodes in a portalled panel (three shapes, framework-neutral) | **PASS** |
| S6 | `<colgroup>` under lit, both layout regimes, vs a `<th>` control | **FAIL — feature dropped** |
| S7 | Resize with widths on `<col>` | **Moot** — fell with S6 |

### 9.1 S1 — portal mechanics: **PASS**

A separate lit render root whose container is the pane renders and updates correctly (`s1a_updates: true`). 20 open/close cycles left zero orphaned containers, panes or panels, and threw nothing.

Relocating a template-rendered node into the pane (strategy B) *also* worked — no error, the update reached the moved node, no duplication. It is not adopted (D10): it is unsupported in general, and the same harness independently tripped lit's guard (*"This `ChildPart` has no `parentNode`"*) when a container was cleared with `innerHTML`, which is the same class of manipulation.

**The outside-click bug is confirmed rather than predicted.** With the panel portalled:

| click target | `composedPath()` includes host | includes panel | current check closes | proposed check closes |
|---|---|---|---|---|
| inside the panel | false | true | **yes (bug)** | no |
| on the page | false | false | yes | yes |
| on the trigger | true | — | no | no |

Focus restored to the trigger before pane teardown stays there and never falls to `<body>` (`s1e_focusStillOnTriggerAfterClose: true`).

### 9.2 S2 — light-tier styles across the portal: **PASS**

All three engines installed via `adoptedStyleSheets`. The portalled panel computed `rgb(1, 2, 3)` and its descendant `rgb(4, 5, 6)` — identical to in-place — while the in-place table kept its own rule. An **unstamped** decoy panel with the same class in the same pane computed the UA default, so the no-leak property holds across the portal.

Container: `transform`, `filter`, `contain`, `perspective` all `none`, `will-change: auto`, and a `position: fixed` child resolved to the viewport at exactly (0, 0).

### 9.3 S3 — clipping and occlusion: **PASS**

Corner hit-test of a panel anchored to the last column's filter cell:

| mode | panel | topLeft | topRight | bottomLeft | bottomRight | centre |
|---|---|---|---|---|---|---|
| paged | in-place | ✓ | ✗ | ✓ | ✗ | ✓ |
| paged | portalled | ✓ | ✓ | ✓ | ✓ | ✓ |
| virtual | in-place | ✓ | ✗ | ✗ | ✗ | ✓ |
| virtual | portalled | ✓ | ✓ | ✓ | ✓ | ✓ |

Identical in all three engines. The portalled panel also wins the hit test when parked over the sticky header, both modes.

### 9.4 S4 — the second sticky row: **PASS**

With `top: var(--mp-datatable-header-height)`, at scroll offsets 0 / 40 / 120 / 400 / 900: header stays pinned, filter row stays pinned, `gap: 0` and `overlap: false` at every offset, and the hit test at the filter row's centre returns the trigger `<button>` — no bleed-through. True under both `border-collapse: collapse` and `separate`.

Without the offset (both rows at `top: 0`) they overlap by exactly the header height: **−36px** Chromium/Firefox, **−33px** WebKit. That per-engine difference is the argument for O2 over any hard-coded value.

Trap recorded in §5.3: sticky is on the `<th>`; measuring the `<tr>` reports an unstuck header.

### 9.5 S5 — consumer Nodes, framework-neutral: **PASS**

Three shapes — fresh-per-call, cached-and-re-returned, mutated-after-mount — all: land in the pane and not in the host; stay unstamped (node and descendants); survive a panel re-render with identity intact; remain usable after close; and show post-mount mutations. Our greedy `button[data-mps=datatable]` rule styled our stamped button (`rgb(7, 8, 9)`) and did **not** reach the consumer's button.

### 9.6 S6 — `<colgroup>`: **FAIL**

Numbers and reasoning in §5.2. Summary: `s6a` (lit mechanics) passed; `s6b` showed the `<th>` control is *already* inert under `fixed`; `s6c` showed `<col>` is worse under `auto` (10px vs 0px); `s6f` showed `<col>` widths are literal while `<th>` widths carry +44px of padding, making adoption a silent breaking change. Dropped.

Two by-products are kept: **D7** (qualify the measure selector — `s6c2` confirmed it is correct only by document order) and **D6** (`s6e`: hostile filter content inflated a column from 224px to 515px under `auto`, so the width-neutral trigger is load-bearing).

---

## 10. Testing

- `mp-datatable.aria.spec.ts` — no second row when nothing is filterable; row present when something is; `aria-rowindex`/`aria-rowcount` **with and without** the filter row (the D5 regression); trigger role/name/`aria-expanded` in both states; `aria-controls` resolves.
- `mp-datatable.keyboard.spec.ts` — trigger tab-reachable; Enter/Space open; Escape closes and restores focus; Tab trapped; a click in the filter row never sorts.
- New `mp-datatable.filter-row.spec.ts` — cell count equals `totalColumnCount` across all four tree×checkbox permutations; empty cells for non-filterable columns; `filterRenderer` invoked once per open, not per render; the measure selector resolves to row 1's `<th>` and not the filter cell (D7).
- New `overlay-portal.spec.ts` — acquire/release refcount; host removed with the last pane; computed style asserts no containing-block-forming property (§5.4).
- `overlay-controller.spec.ts` — `portal: true` open/close; **outside-click: a click inside a portalled panel must not close it** (§7).
- `_conformance/consumer-dom-boundary.spec.ts` — add `filterRenderer` to the renderers asserted unstamped.
- `_conformance/light-styles-scoping.spec.ts` — no change; it is file-driven.
- Angular `datatable.component.spec.ts` — the directive bridges; views destroyed; the accumulation fix holds across a column-set change. **Drive inputs from a `signal()`**, never a mutable field.
- Vue `_conformance/behaviour/BsDatatable.spec.ts` — `columns` carrying a `filterRenderer` round-trips.
- e2e: one Playwright test per demo app, open → keyboard → close, in virtual mode.

All of it runs in **one sweep at the end**, not per milestone.

---

## 11. Versioning & dependencies

Minor bump across all four libraries. Purely additive: three optional fields on `DatatableColumnDef`, one on `OverlayControllerOptions`, two overlay exports, one Angular directive. No breaking change, no new dependency.

`mp-overlay-container` is a new custom element name, registered lazily and defined exactly once.

---

## 12. Successors, named rather than implied

- **Migrate the other overlay consumers to the portal.** Eleven components hard-code a `z-index` between 1050 and 1080 and depend on an unenforceable "no transform above me" rule. Mechanical once the portal ships.
- **Column hiding / reordering**, and with it a fresh look at `<colgroup>` — that is the context where its breaking width semantics can be weighed on their own merits (§5.2).
- **Generalise `OverlayController` to walk shadow scroll-ancestors** — requested in `scheduler-view-mode-completeness.md:728-733`; the datatable does not need it (§5.6).
- **A shared `aria-expanded` ↔ `OverlayController` helper.** Seven components wire this by hand, each slightly differently.

---

## 13. As built (deviations and discoveries)

Implemented on `feat/datatable-filter-row`, M0–M10. Deviations from the plan, and what the work turned up that the spikes did not:

**`CSS.escape` broke `close()`, and the specs caught it.** The first implementation resolved the focus-return trigger by id, via `#${CSS.escape(id)}`. `OverlayController.close()` sets `_open = false` and *then* calls `resolveReturnTarget()`, so when `CSS.escape` was unavailable (jsdom) it threw from inside `close()` and `onClose` never ran. One cause, three symptoms: a second click on the trigger did not close the panel, no `mp-datatable-filter-close` fired, and the panel was never torn down. The trigger *is* the anchor, so the id round-trip bought nothing; both now resolve through one helper and `CSS.escape` is gone. Worth recording because the failure was entirely invisible from the outside — it looked like the toggle logic was wrong.

**The panel needed `position: fixed`, and only the browser could say so.** `OverlayController` positions by writing `left`/`top` onto `options.panel()`. A statically-positioned element ignores both, so the panel rendered at the pane's origin — the top-left corner of the viewport, overlapping the page's sidebar, regardless of which trigger opened it. Every other consumer declares `position: fixed` on its own panel for this reason; this one did not. **No unit test could have caught it**: jsdom has no layout, so the specs passed while the feature was visibly broken. It was found by looking at a screenshot of the running demo, and the rule now carries a comment saying why it is required rather than cosmetic.

**A false positive of my own making.** The `overlay-portal` spec asserted the container declares no containing-block property by substring-matching its `style` attribute. That string contains `--mp-overlay-container-z-index`, which contains `contain`. It now reads declared properties instead. Recorded as a caution against substring assertions on CSS text.

**`headerRowCount` is computed in two places.** `render()` derives it locally and `renderRow` re-derives it from `hasFilterRow`. Slightly redundant; kept because threading it through the row renderer's signature would touch every call site for no behavioural gain.

**The demo pages carry a show/hide checkbox**, at the user's suggestion, and it earns its place beyond demonstration: toggling the filter templates forces repeated `effectiveColumns` recomputes, which is exactly the path where the Angular `EmbeddedViewRef` generations used to accumulate. The demo exercises the leak fix every time someone clicks it.

**A pre-existing leak was fixed in passing** (§5.7): `headerViews` grew by a full generation on every recompute and was only drained on destroy. Filters would have doubled the rate. Both arrays are now cleared at the top of the recompute.

**Not done, deliberately:** the plan's optional per-frame resize optimisation fell away with `<colgroup>` (§5.2) and was never in scope on its own.

## 14. References

- Issue **#414**; driver [MintPlayer.Spark#431](https://github.com/MintPlayer/MintPlayer.Spark/issues/431)
- [overlay-controller-positioning.md](./overlay-controller-positioning.md) — the positioning half
- [shadow-adopted-content-styling.md](./shadow-adopted-content-styling.md), [consumer-styles-in-shadow.md](./consumer-styles-in-shadow.md) — the light tier
- [scheduler-view-mode-completeness.md](./scheduler-view-mode-completeness.md) §traps 1–4
- `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts`
- `libs/mintplayer-web-components/overlay/src/overlay-controller.ts`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
