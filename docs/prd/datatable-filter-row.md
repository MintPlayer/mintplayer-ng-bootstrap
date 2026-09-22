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

1. ~~**Any filter semantics.** No predicate model, no operator vocabulary, no filter state, no `filter-change` event carrying a query. The panel's contents are the consumer's template.~~ **REVERSED in Revisions 2 and 3 — deliberately, and this is a permanent commitment.** The component now owns filter *UI* semantics: a distinct-value list, an operator vocabulary (`eq neq lt lte gt gte`), a per-column selection it holds across opens, and a `filter-change` event carrying that selection.

   The trade was made with open eyes and is worth restating, because the original non-goal was not silly: **React and Vue get the entire feature with no wrapper code**, which an Angular-template-only design could not deliver (§14.1). What the component still does **not** own is the *predicate* — it never filters `data`, never derives `filterActive` or `filterSummary`, and attaches no meaning to a selection. That line is the one this PR does not cross, and §3.2 below still holds.

   If a shared *expression* vocabulary is ever wanted it comes from `bs-query-builder`'s existing `Expression` / operator / per-type editor registry — this operator enum is panel UI, not a query language, and should not grow into one.
2. Server- or client-side filtering of `data` / `fetch`. **Still a non-goal, and the one that matters** — see 1 above.

   **3.1 A free-text filter.** `filterInputType` is `'number' | 'date'` and there is no `contains` operator. Comparing strings is either exact match — which the value list already does better, with a list — or a lexicographic `>`, which is almost never what anyone means by "filter this column". A substring filter is a **nest-your-own** case, driven from the same `FilterContext`.

   **3.2 Styling a consumer's nested panel.** A nested panel is the consumer's DOM: never stamped with this component's scope, and rendered into the document-root overlay rather than inside the table. **Every consumer who nests hits this**, so it is stated here rather than only in a demo comment. What works differs per framework and all three are demonstrated: Angular's component styles reach it (emulated encapsulation is attribute-based, and the nodes come from the component's own `<ng-template>`); React needs page-level CSS; **Vue needs a non-scoped `<style>` block**, because `scoped` stamps `data-v-*` onto template-rendered nodes and an imperatively built node never gets one. Bootstrap's `.form-control` helps in none of them — it is only styled inside `bs-*` components in this workspace.
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
| D12 | **Historical — superseded by D19/D20/D29 (§14).** Angular bridged via a sibling directive `[bsDatatableFilter]` matched by `name`; React and Vue needed no wrapper change. Revision 2 nests the override inside `*bsDatatableColumn`, adds a default panel in the WC, and adds `distincts` / `labels` / `filterChange` to all three wrappers | `filterable`/`filterRenderer` ride inside the `columns` objects, which both already forward as element properties |
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

### 5.7 Angular bridge — **historical, superseded by §14 (D19–D21)**

> The sibling `[bsDatatableFilter]` directive described below shipped in the first revision and is **deleted** in Revision 2. The claim that "overloading `[bsDatatableColumn]` is not possible" was correct only for a *second `TemplateRef` on the same directive*; nesting a second structural directive *inside* the column's template and having it `inject` the column directive works, and is measured in §14.9. Kept for the record.

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

> **As built, this section was only half right — corrected after review.** The two existing spec files named below were *not* modified; the filter cases went into new sibling files instead (`mp-datatable.filter-aria.spec.ts`, `mp-datatable.filter-row.spec.ts`, `mp-datatable.filter-default.spec.ts`), which is the better layout and is what shipped. More importantly, two claims here were **never pinned in jsdom at all** and had to become an e2e spec: the keyboard trap and focus-return came from `OverlayController`'s `modal: true` and were covered only generically, never *through* `mp-datatable`; and "a click in the filter row never sorts" was asserted structurally (no `button.header-sort` inside the row) rather than by firing a click. Both are now in `apps/ng-bootstrap-demo-e2e/e2e/datatable-filter.spec.ts` — see §10.1.

- ~~`mp-datatable.aria.spec.ts`~~ → `mp-datatable.filter-aria.spec.ts` — no second row when nothing is filterable; row present when something is; `aria-rowindex`/`aria-rowcount` **with and without** the filter row (the D5 regression); trigger role/name/`aria-expanded` in both states; `aria-controls` resolves; the three accessible-name forms.
- ~~`mp-datatable.keyboard.spec.ts`~~ → **e2e**, §10.1. Tab-trapping and focus restoration are real-browser properties; jsdom can assert the wiring exists but not that it works.
- New `mp-datatable.filter-row.spec.ts` — cell count equals `totalColumnCount` across all four tree×checkbox permutations; empty cells for non-filterable columns; `filterRenderer` invoked once per open, not per render; the measure selector resolves to row 1's `<th>` and not the filter cell (D7).
- New `overlay-portal.spec.ts` — acquire/release refcount; host removed with the last pane; computed style asserts no containing-block-forming property (§5.4).
- `overlay-controller.spec.ts` — `portal: true` open/close; **outside-click: a click inside a portalled panel must not close it** (§7).
- `_conformance/consumer-dom-boundary.spec.ts` — add `filterRenderer` to the renderers asserted unstamped.
- `_conformance/light-styles-scoping.spec.ts` — no change; it is file-driven.
- Angular `datatable.component.spec.ts` — the directive bridges; views destroyed; the accumulation fix holds across a column-set change. **Drive inputs from a `signal()`**, never a mutable field.
- Vue `_conformance/behaviour/BsDatatable.spec.ts` — `columns` carrying a `filterRenderer` round-trips.
- e2e: one Playwright test per demo app, open → keyboard → close, in virtual mode.

### 10.1 What only a browser can check

`apps/ng-bootstrap-demo-e2e/e2e/datatable-filter.spec.ts`. Every other test for this feature runs under jsdom, which has **no layout** — and that blind spot shipped two bugs already: the panel rendered at the viewport's top-left because `position: fixed` was missing (§13), and later rendered with no border because a portalled element inherits none of the component's custom properties (§13.1). Both passed a green unit suite; both were caught by a human looking at the page.

The spec asserts only what jsdom cannot, so it does not duplicate the unit suite:

1. **Anchored, not at the pane origin** — and direction-agnostically. The overlay legitimately flips *above* the trigger when the list is tall enough that opening downward would leave the viewport, which is what the demo does with 40 rows. An assertion of "below the trigger" fails against correct behaviour; the real property is adjacency on whichever side had room.
2. **Escapes the scroll container** on some edge while staying inside the viewport, **in virtual mode** — the configuration §9.3 measured as the worse one ("clipped on both axes"). The mode is asserted rather than assumed, so switching the demo to paged fails the spec instead of quietly weakening it.
3. **Painted above the sticky header.** Virtual mode makes `thead th` `position: sticky; z-index: 1`, so the panel has something to be painted *over* by, not merely cut off by — escaping `overflow: auto` is no use if the header then covers it. Hit-tested with `elementFromPoint`, because what matters is which element the browser puts on top, not what the z-index values suggest.

   **On engine coverage:** §9.3's original measurement was Chromium, Firefox **and** WebKit, via spike harnesses that were then deleted. The Playwright projects here are **Chromium and Firefox only**, so what is now under continuous test is two of those three. That is a real improvement over a claim in a document, but it is not the same claim — WebKit remains measured-once rather than guarded, and §9.3 should be read that way.
4. **Border resolvable across the portal** — the custom-property regression.
5. **Tab trapped and Escape returns focus to the trigger**, exercised *through* `mp-datatable` rather than through `OverlayController` alone.
6. **A filter-row click fires without sorting** — a real click, asserting `aria-sort` did not move.
7. **A partial `-` survives in the number operand** — only a browser keeps the text visible, since `input.value` reports `''` either way.

**Both e2e specs select their table by a named class** (`.filter-table`, `.tree-table`) rather than by position. `datatable-tree.spec.ts` previously took "the last `mp-datatable` on the page" and silently began reading the filter table when that section was added below it — every tree assertion passed against the wrong element until CI ran e2e for the first time.

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

### 13.1 As built — Revision 2

Implemented on the same branch, M11–M19. What the implementation changed relative to the design in §14, and why:

**The loaded list and the displayed list had to become separate fields.** §14 spoke of one `DistinctValues` per column. The first implementation re-bucketed and search-filtered it in place, which is wrong in a way no design review would catch: narrowing `loaded` destroys the full list, so clearing the search box cannot restore it without a round trip — and with a local (sourceless) column there is no round trip to make, so the values were simply gone. `ColumnFilterState` now holds `loaded` (raw, from the source or the local pass) and `view` (re-bucketed against the snapshot, narrowed by the term). `FilterContext.values()` returns `view`.

**`labels.filterValue` is invoked as a method, not a closure.** D29 gives `filterValue` and the four value labels (`filterNone`, `filterEmpty`, `filterTrue`, `filterFalse`) it renders. Written the obvious way — a default that closes over `DEFAULT_DATATABLE_LABELS` — a consumer who translated only those four keys would see no change, because the default `filterValue` is what reads them and it would read the untranslated originals. It now reads them off `this`, so `mergedLabels.filterValue(v)` resolves against the merged set. The interface declares the `this` parameter; a destructured call would break, and the JSDoc says so.

**`set fetch(null)` reset nothing, and that was load-bearing here** (R14). Beyond the obvious staleness, `isExternallyPaged()` stayed true forever once a fetch callback had been set, and that is the gate on computing distinct values locally — so a table switched from `[fetch]` to `[data]` could never produce a value list again. The setter now clears `_totalRecords`, both page caches, both child caches, the pending sets, and bumps `_fetchGeneration` so in-flight responses drop.

**The mount-once guard needed a direction.** R13 asked how the default panel coexists with the guard that fixed the Revision 1 focus bug. It is exempt in one direction only: the guard still decides the consumer-vs-default branch exactly once per open, but the default panel is lit-rendered into the panel body, so re-rendering it is a diff rather than a replacement and the focused input survives. A new `_consumerMountedFilter` flag records which branch was taken.

**The search term resets on close, the selection does not.** Unspecified in §14. A reopened panel showing the previous search would hide values the user never chose to hide; a reopened panel having forgotten the selection would be a data-loss bug. `onClose` clears `term` and re-buckets, and leaves `selection` alone.

**`syncFilterStates` re-seeds on reference change, not on every assignment.** The Angular wrapper rebuilds the whole column array on any input change, so treating a `columns` assignment as "new columns" would wipe the user's selection whenever an unrelated input moved. State is keyed by column name and survives re-assignment; a column whose `filterSelection` *reference* changed is re-seeded, which is how a consumer restores a filter.

**The Angular demo moved from `[fetch]` to `[data]`.** Under `[fetch]` the element holds one page and therefore declines to compute a value list at all — correct behaviour, and a poor demonstration of the list. The section now loads one large page into an unfiltered master copy and binds the filtered view.

**The portalled panel does not inherit the component's custom properties, and the browser is the only place that showed it.** `--mp-datatable-*` are declared on the element; the panel lives in `<mp-overlay-container>` at `document.body`, and custom properties inherit down the DOM tree. So `border: 1px solid var(--mp-datatable-border-color)` on the panel was invalid at computed-value time, which drops `border-style` to `none` — the panel shipped with **no border at all**, while its background looked right because that uses a `--bs-*` property declared on `:root`. Nothing throws and nothing warns. Every `--mp-datatable-*` reference in a portalled rule now carries the same fallback chain the `:host` declaration uses, and `mp-datatable.filter-panel-styles.spec.ts` fails the build on a bare one.

This generalises §5.4's trade: the portal buys freedom from clipping and costs inheritance. The light-tier **stylesheet** reaches the pane (it is document-level and anchors on `[data-mps=datatable]`, measured in S2) — but anything travelling through the *inherited* channel does not. Any future overlay content must be written against that.

**The sortable header's click target was the label, not the cell** — reported from the running demo, and pre-existing rather than introduced here. `button.header-sort` had `padding: 0` and inherited `display: inline-flex` from `.header-cell`, so it shrink-wrapped its text while the `<th>` held the padding *and* set `cursor: pointer` plus a hover background. The whole cell advertised itself as clickable and only the label was. The padding moved onto the button, which is now `display: flex; width: 100%; box-sizing: border-box` — total cell width unchanged, so the `auto`-phase measure pass is unaffected, and the resize handle's `z-index: 2` still wins over it. Verified in a browser: `elementFromPoint` 30px past the label returns the button, and a click at the cell's centre sorts.

**Not done, deliberately:** no Spark code (D30). `query_column_filter_PRD.md` §5.8 is amended to consume this, and nothing in `MintPlayer.Spark` is touched.
## 14. Revision 2 — a default panel, a nested override, and datatable-supplied values

Status: **Designed and adversarially verified 2026-09-22** (§14.9) — implementation follows the amended decisions below. Supersedes §5.5's "the panel's contents are the consumer's template, full stop" and §5.7's sibling directive. Everything in §§1–13 that is not contradicted here still stands.

### 14.1 What changed, and why

After the filter row shipped (§13), the user pointed at the Vidyano reference (`https://localhost:5001/fleet/cars/…`, surveyed in `C:\Repos\MintPlayer.Spark\docs\query_column_filter_PRD.md` §3) and at how Spark would consume this, and asked for three things the first revision did not have:

1. The override template nests **inside** the column directive — `*bsDatatableFilterPanel` inside `*bsDatatableColumn` — instead of a sibling matched by a `name` input.
2. The datatable **supplies the available values** for the column to that template (`let availableValues = $implicit`).
3. There is a **default panel** — search box, `≠` toggle, checkbox list, clear — so consumers get the Vidyano behaviour for free and override only when they want to. It must exist in React and Vue too.

A six-reader investigation plus a completeness critic (workflow `wf_a0e05a54-add`) mapped the repo against that sketch. Two findings change the sketch's *mechanism* without changing its *shape*; one corrects the reference behaviour; three surface constraints the sketch did not know about. They are recorded here because a future reader will otherwise re-propose the sketch as written.

### 14.2 Findings that reshape the sketch

**F1 — `*ngTemplateOutlet` cannot be the mechanism.** The wrapper's template is a single `<mp-datatable>` (`datatable.component.html:1-14`); the panel is rendered by the WC into a `document.body` overlay pane (`mp-datatable.ts` `renderFilterPanel`). An `*ngTemplateOutlet` renders in place in the wrapper's own DOM, which is the wrong tree. The pattern becomes `this.vcr.createEmbeddedView(dir.filterPanelTemplate, ctx).rootNodes`, which is the path the wrapper already uses for headers and rows (`datatable.component.ts:207, :224, :401`). **The consumer-facing syntax is unchanged.**

**F2 — the default panel belongs in the web component, not in an Angular `<ng-template>`.** Measured across the repo: every WC-backed default is rendered by the WC — `mp-tree-select.nodeRenderer` (`mp-tree-select.ts:673-718`) renders the default row and composes the consumer's optional template *inside* it; treeview icon+label (`mp-treeview.ts:362-369`); datatable `defaultCellContent` (`mp-datatable.ts:2092`); select `o.label` (`mp-select.ts:445-453`). React (`BsTreeSelect.tsx:15-27`, a bare `createComponent`) and Vue (`BsTreeSelect.vue:70-132`) inherit those defaults with zero wrapper code. The `<ng-template #default…> ?? ` pattern the sketch cites exists in exactly **one** full instance — `bs-file-upload` (`file-upload-template.directive.ts:9-13`, `file-upload.component.html:10,15`) — an Angular-only component with no WC behind it. An Angular default would give React and Vue nothing, contradicting the parity requirement. So the WC renders the default when `filterRenderer` is absent, and each framework's override sits on top. This is the one place the design departs from the sketch's *placement*; it follows the sketch's *requirements*.

**F3 — nested discovery works, with a structural precondition (measured by spike).** Three strategies were tested in a throwaway spec. (a) `contentChildren(Inner, {descendants:true})` on the component finds the nested directive only *after* the header view exists and cannot say which column it belongs to. (c) `contentChild` on the outer directive matched **0 at every checkpoint** — rejected. **(b) works:** the inner directive does `inject(BsDatatableColumnDirective)` and assigns its `TemplateRef` onto the outer in its constructor, which resolves correctly from inside the lazily-instantiated header template and lands synchronously inside `createEmbeddedView`. **But** with today's lazy `headerRenderer` that is *too late*: `filterable`/`filterRenderer` are fixed in `effectiveColumns` (`:203`) and pushed to the WC (`:275`) before the header view — the only place the nested directive is instantiated — is ever created. Header views must therefore be created **eagerly** when the column defs are built. And because that happens inside the `effectiveColumns` computed (already impure — it calls `destroyTemplateViews()` at `:193`), the registration **must be a plain field, not a signal**: a signal write in the nested directive's constructor would execute inside a reactive context. The file-upload precedent everyone cites does `.set()` on a signal in a constructor (`file-upload-template.directive.ts:13`) — that precedent and eager creation inside the computed are mutually exclusive, and eager creation wins.

**F4 — Vidyano does not round-trip on every keystroke.** Verified in `C:\Repos\Vidyano\src\WebComponents\QueryGrid\query-grid-column-filter.ts`: the loaded distincts are filtered **client-side** (`:269-280`, case-insensitive `contains`); a server refresh happens only inside `if (…distincts.hasMore)` (`:249`), debounced 250 ms (`:252, :265`). The "per keystroke" description in this conversation was loose; Spark's PRD (`:100-101`) says only that the search box "round-trips to the server instead" of paging. The design copies what Vidyano does, which also means `hasMore` is **required** in the response, not optional.

**F5 — zoneless change detection.** The demo app and the lib's tests provide `provideZonelessChangeDetection()` (`app.config.ts:29`, `test-setup.ts:28`). The WC invokes `filterRenderer` **once per open** (§13, the focus fix) and never again. A plain context object the WC mutates later is therefore never repainted — an `EmbeddedViewRef` in its container is *checked when CD runs*, but nothing makes CD run. `$implicit` has to be a **`Signal`**.

**F6 — `filterable` must be explicit.** Today `filterable: !!filterDir` (`:203`). Once a default panel exists, the presence of an *override* cannot mean opt-in — a column with no override still wants the default. `filterable` becomes a `*bsDatatableColumn` microsyntax input like `sortable` (`datatable-column.directive.ts:27`).

### 14.3 Decisions (D17–D30) — as amended by adversarial verification (§14.9)

| # | Decision | Consequence |
|---|---|---|
| D17 | **The default panel is rendered by `mp-datatable`** as the branch of `renderFilterPanel` taken when `filterRenderer` is absent **or returns `null`**, with inline `scopedHtml('datatable')`, not a new shadow-rooted element | React and Vue inherit it (F2); one a11y implementation; the light-tier sheet is proven to reach the pane (§9, S2); `initialFocus` and `aria-controls` stay in one tree. **Verified** (§14.9): four forced chrome re-renders kept the same pane, body, lit part, input node, typed text, checked state and `document.activeElement` |
| D18 | `filterable` is an explicit column flag; in Angular a `*bsDatatableColumn` input (`filterable: true`) beside `sortable`. `filterActive`, `filterSummary` and `filterSelection` are authored on the column directive too | Readable synchronously in `effectiveColumns`; presence of an override no longer implies opt-in (F6). **Verified**: the nested directive's own `input()`s are unreadable in its constructor (NG0950 for required, initial value otherwise), so nothing the column def needs may live on `*bsDatatableFilterPanel` |
| D19 | `*bsDatatableFilterPanel` **nests inside** `*bsDatatableColumn`; it `inject`s the column directive and assigns a **plain field** `filterPanelTemplate` in its constructor, clearing it in `DestroyRef.onDestroy` (only if the field still holds its own `TemplateRef`). It declares `static ngTemplateContextGuard` for `{ $implicit: Signal<DistinctValues \| null>; ctx: FilterContext }`. The sibling `[bsDatatableFilter]` is **deleted** | F3; `name` matching goes away. A plain field because nothing *reacts* to it: the wrapper reads it when the WC invokes `filterRenderer` at panel open (D20), never inside `effectiveColumns`. The guard is what makes `values()?.matching` type-check under `strictTemplates` — measured: guardless, `values().matching.bogusProperty.deeper` compiles with 0 diagnostics |
| D20 | **Header `EmbeddedView`s stay lazy** (created in `headerRenderer`, as today). The Angular wrapper **always** supplies `filterRenderer` for a filterable column; that closure reads `dir.filterPanelTemplate` **when the WC invokes it at panel open** and returns `null` when the field is empty. `FilterRenderer` becomes `(column, ctx) => Node \| null`, and `renderFilterPanel` treats `null` (or an absent renderer) as "render the default panel". No `createEmbeddedView` and no `detectChanges()` run inside `effectiveColumns`; the computed reads only column-directive inputs (D18). Nothing to skip under `isPlatformServer` | **Replaces the eager-creation design, which was refuted twice by measurement** (§14.9): `insertView → LQueries.insertView → dirtyQueriesWithMatches → _dirtyCounter.update()` is a signal write inside the computed → **NG0600 the moment the hosting component declares any `viewChild`**; and `detectChanges()` inside the computed leaks every header template's signal reads into `effectiveColumns`' dependencies. Sound because the header row and the filter row render in the same lit pass, so a column's header view — and the nested directive it instantiates — exists before its trigger can be clicked. React/Vue see "no `filterRenderer` → default", Angular "`filterRenderer` returns `null` → default", through one WC branch |
| D21 | Runtime `@if`-toggling of `*bsDatatableFilterPanel` **is observed at the next panel open**: the wrapper resolves `dir.filterPanelTemplate` each time the WC invokes `filterRenderer` (D20), so a column switches default↔override without touching `filterable`. A panel that is OPEN when the toggle happens keeps its mounted content until it closes (mount-once, R13). `filterable` toggles the trigger itself | Covers the timeline precedent (default↔custom renderer at runtime, `timeline.component.html:86-99`) and Spark's `@for`-generated columns with per-column conditional overrides (`spark-query-grid.component.html:42-47`). The previous "unsupported" wording is withdrawn |
| D22 | **Table-level** `distincts` source on the WC, mirroring `fetch` in every respect (property, `null` when absent, forwarded by all three wrappers): `(req: {column, search, signal}) => Promise<DistinctValues \| null>`, `DistinctValues = {matching: DistinctValue[]; remaining: DistinctValue[]; hasMore: boolean}`, `DistinctValue = {value: unknown; label: string}`. **A source that resolves `null` for a given `req.column` means "compute locally for this column"** (D23). Identity contract: the WC compares `value` by SameValueZero (`Set` semantics) — JSON primitives and `null` only; a source must supply `label` for every value (it is display text, never identity) | Spark's implementation is one closure adding its own identifiers and closing over its live column-filter model for §5.5's other-columns context, exactly as `makeFetch` closes over `this.search()`; one server-backed lookup column does not forfeit the free local list for the others (Spark's own grids mix `canListDistincts:false` and list columns); `req.column` dispatch is sound because `name` is the unique data key. Measured: `[new Date(0)].includes(new Date(0))` is `false` — hence primitives only |
| D23 | **Absent source (or source returned `null` for the column):** the WC computes distincts locally **iff `fetch == null && !isExternallyPaged() && _childCache.size === 0`**; otherwise the default panel renders `labels.filterNoValues`, never a partial list. To make that gate meaningful after a runtime clear, **`set fetch(null)` resets every fetch-derived field**: `_totalRecords = null`, `_pageCache` / `_pendingPageFetches` / `_childCache` / `_childTotals` / `_pendingFetches` cleared, `_fetchGeneration++`. Labels: `labels.filterValue(value)` (default: `null`/`undefined` → `filterNone`, `''` → `filterEmpty`, boolean → `filterTrue`/`filterFalse`, `Date` → `toLocaleDateString()`, else `String(value)`). Buckets: while the column's own selection is empty, `matching` = distinct over all of `_data`, `remaining` = `[]`, `hasMore: false`. When the selection becomes non-empty the WC **snapshots that column's list**; until Clear, the panel shows selected values first (D26), then snapshot values still present in `_data` as `matching`, the rest as `remaining`. The WC still never filters data (D27) — it only remembers what it showed. **`[data]` contract:** local distincts are complete only when `data` is the FULL row set; a consumer paging `[data]` itself is undetectable by the WC and must supply `distincts` — the Angular JSDoc at `datatable.component.ts:81` is rewritten from "already-paginated" to say so | Measured (§14.9): fetch 100 rows @ 20/page then `el.fetch = null` → `_data.length === 20`, `_totalRecords === 100`, local distinct covered 20/100 — the old `set fetch` reset nothing; a tree with a `_childCache` child rendered a value absent from the local distinct. The previous "sound because `_totalRecords` is written only from fetch" clause was true and insufficient. The snapshot is what lets a static-data consumer who rebinds the filtered subset (the prescribed D27 pattern) still see and un-check the other values |
| D24 | **Search = Vidyano's real semantics (F4), with one fix:** the source is queried on every panel open (no cross-open cache); typing filters the loaded lists client-side by case-insensitive substring on **`label`**; a debounced (250 ms), generation-guarded re-query of the source runs when the last response had `hasMore: true` **or the new term is not an extension (`startsWith`) of the term the loaded list was fetched for** — so widening or clearing a term after a narrowed `hasMore:false` response re-queries instead of showing Vidyano's stuck-narrowed list | `hasMore` is required; no over-querying; a per-open query keeps other columns' filters (Spark §5.5) fresh without an invalidation protocol. Vidyano confirmed line-for-line (`query-grid-column-filter.ts:249, :252/:265, :269-280`); the stuck-narrowed list is a Vidyano defect not copied |
| D25 | `filterRenderer(column, ctx)` gains a context: `ctx.values(): DistinctValues \| null` (live getter), `ctx.loading(): boolean`, `ctx.search(term)`, `ctx.apply(values: DistinctValue[], inverse)`, `ctx.clear()`, `ctx.onChange(cb): () => void`. Angular exposes `$implicit` as a **`Signal<DistinctValues \| null>`** fed from `onChange`, plus `ctx` as a named let | **Verified** (§14.9, zoneless TestBed, 6/6): a `signal.set()` from a bare `setTimeout` repainted an `@for` in a view whose nodes the WC had moved to a body-level pane, with no `detectChanges()` — template signal reads mark ancestors for traversal and notify the scheduler; a plain object stayed stale with `isStable() === true`. `let ctx = ctx` is valid microsyntax |
| D26 | **PRD non-goal 1 is amended:** the WC emits **UI state**, not semantics. Per-column state is `FilterSelection = {values: DistinctValue[]; inverse: boolean}` — it keeps each selected value's `label`, so a selected value that drops out of `matching`/`remaining` after a re-query stays visible, checked and correctly named. **One event:** `mp-datatable-filter-change` `{column; selected: DistinctValue[]; inverse}` fired on every check/uncheck/inverse toggle; **Clear fires the same event** with `selected: []`, `inverse: false`. There is no separate clear event. `DatatableColumnDef.filterSelection?: FilterSelection` is the consumer's seed/reset channel (set `{values: [], inverse: false}` to reset a column from outside). No `includes`/`excludes`, no predicate, no operator vocabulary | Vidyano's own model is `{selectedDistincts, selectedDistinctsInversed}` (`query-column.ts:175-176`) — the mapping is lossless for every UI-producible state (Spark → `includes = inverse ? [] : selected.map(v => v.value)`, `excludes` the converse); one write path for the WC's copy, so Spark's "clear all" can reset columns; a consumer handling only `filter-change` is complete |
| D27 | **Non-goal 2 stands:** the WC never filters `data`/`fetch`. "Applies immediately" means the event fires on every check; the consumer filters | The demos listen and filter **from an unfiltered master copy**, rebinding the subset — which is what Spark does in its `fetch` closure. D23's snapshot is what keeps the other values selectable after such a rebind |
| D28 | `DatatableColumnDef.filterSummary?: string` — consumer-authored collapsed text (`= Nee`, `≠ Apcoa, Cityparking`) rendered as visible text in the trigger. The trigger's accessible name is `labels.filterColumn(column)` when `filterActive` is false, `labels.filterColumnActive(column, summary)` when active with a summary, and `labels.filterColumnActive(column)` when active without one — **formatters, never `filterColumn(column) + summary`**. The summary is embedded verbatim (WCAG 2.5.3 label-in-name); the consumer either spells the operator in words or accepts screen-reader glyph voicing for `=`/`≠` | `labels.ts:5-9` already forbids prefix/suffix composition; the previous wording would have required the forbidden pattern. `filterActive` stays a separate boolean (precedent: `invalid` + `error-text`); active-without-summary is a real state (the React demo's range filter) |
| D29 | `labels` becomes an input on **all three wrappers** (none forwards it today — verified zero matches) and `DatatableLabels` gains `filterClear(column)`, `filterSearch`, `filterInvert`, `filterNone`, `filterEmpty`, `filterTrue`, `filterFalse`, `filterHasMore`, `filterNoValues`, `filterGroup(column)`, `filterColumnActive(column, summary?)`, `filterValue(value: unknown): string` (default per D23; overriding it is how a consumer localizes booleans/dates without a `distincts` source) and `announceFilter(column, count)` | A WC default cannot be localized otherwise; every checkbox name and the trigger's active name route through a formatter. `String(true)`, `String(undefined)` and `String('')` (an **empty** accessible name) are what the previous text would have rendered |
| D30 | **Out of this PR:** Vidyano's global clear-all gutter cell, the Enter-free-text term (`1\|@text`), a per-column *source* on the column def, and any Spark code. Spark's PRD §5.8 is **amended** to consume `distincts` + the default panel instead of building the popup itself | Scope stays bounded; successors named in §12. The heterogeneous-grid case is met by D22's per-column `null` fallback, so a per-column source is not needed |

### 14.4 Default panel — behaviour and accessibility (amended)

Layout follows Vidyano (`query-grid-column-filter.html:19-58`): a **Clear** item, a **search** `<input type="search">`, an **inverse** `<button>` in a left gutter, and a **checkbox list**.

- **Checkbox names** come from `labels.filterValue(value)` (D29) or the source's `label`; nothing renders `String(value)` directly, and an empty string yields `labels.filterEmpty`, never an empty accessible name.
- The list is a **native `<input type="checkbox">` + `<label>` group** inside `role="group"` named by `labels.filterGroup(column)`, rendered with **keyed `repeat()` on `value`** so a search or `hasMore` repaint keeps focus on the same option and never leaves an unbound `checked` bit on the wrong row. Order: **selected values first (always checked, regardless of bucket), then `matching`, then `remaining`.** Tab-per-item, no roving focus: buckets are capped at 100 + 100.
- `remaining` is de-emphasised with `color: var(--bs-secondary-color)` (4.69:1 on white) — never `#aaa` or opacity alone, which fail WCAG 1.4.3. `hasMore` is localized text (`labels.filterHasMore`), not an icon.
- **Clear** is a real `<button>`, disabled when the selection is empty. Activating it clears the selection, resets inverse, fires the change event **and moves focus to the search input in the same handler** — measured: a button that disables itself keeps focus (Chrome 153), parking a keyboard user on an inoperable control inside the trap.
- The chrome is `role="dialog"` **with `aria-modal="true"`**: it already traps Tab (`modal: true`), so it is modal for keyboard users and must say so to AT. No `inert` on siblings; outside-click dismissal stays as §5.4.
- **Initial focus is the callback form**, resolving the search input; for a consumer-rendered panel it falls back to the first tabbable. `'first'` would land on Clear the moment a filter is active.
- The inverse button writes `aria-pressed` for **both** values from render; its name is `labels.filterInvert`.
- **One announcement channel:** a polite `liveAnnouncer.announce(labels.announceFilter(column, count))` on each change. The consumer's resulting refetch may also announce `announceLoaded`; those are distinct events (R16).
- Escape / outside-click / focus-return are unchanged from §5.4.

### 14.5 Angular surface, as it will read

```html
<bs-datatable [data]="rows()" [distincts]="loadDistincts" [labels]="labels()"
              (filterChange)="onFilter($event)">

  <!-- default panel, nothing else to write -->
  <div *bsDatatableColumn="'country'; filterable: true">Country</div>

  <!-- override: values arrive as a Signal because CD is zoneless; ctx is the back-channel -->
  <div *bsDatatableColumn="'model'; filterable: true; filterActive: modelActive(); filterSummary: modelSummary()">
    Model
    @if (useCustomModelPanel()) {
      <div *bsDatatableFilterPanel="let values = $implicit; let ctx = ctx">
        <input (input)="ctx.search($any($event.target).value)" />
        @for (v of values()?.matching ?? []; track v.value) { … }
      </div>
    }
  </div>
</bs-datatable>
```

React and Vue: `filterable` / `filterActive` / `filterSummary` / `filterSelection` / `filterRenderer(column, ctx) => Node | null` inside `columns`; `distincts` and `labels` as element properties forwarded like `fetch`; `onFilterChange` / `@filterChange`. No wrapper carries a copy of the default.

### 14.6 Migration inside this PR

- Delete `datatable-filter.directive.ts`; rewrite `datatable-filter.spec.ts` for the nested directive per the amended S8 (host component **with** a `viewChild`).
- Rewrite the three demo pages: default panel on one column, an override on another, the show/hide checkbox drives `filterable`, and a `filterChange` handler that filters from an **unfiltered master copy** and rebinds the subset.
- Extend the WC specs for the default panel (mount-once, focus across `data` reassignment **and** across a search repaint, keyed identity across a matching↔remaining move, selected-first after a re-query drops the value, the snapshot, `set fetch(null)` resetting caches, the `null`-per-column fallback, the `hasMore || !startsWith` re-query rule).
- §5.7 and D12 above are historical; Spark's `query_column_filter_PRD.md` §5.8 is amended (docs only).

### 14.7 Risks specific to this revision (amended)

| # | Risk | Mitigation |
|---|---|---|
| R12 | The wrapper's `filterRenderer` is invoked before the column's header view exists | Impossible by construction: header and filter rows render in the same lit pass; S8 pins it. (The previous R12 — a signal write inside `effectiveColumns` — is gone with eager creation) |
| R13 | The default panel re-renders on every `updated()` and loses search text/focus; or its own list repaint moves a checked bit to the wrong row | Rendered once per open under `_mountedFilterColumn`; chrome re-render reuses the same lit template instance (**measured**); the list uses keyed `repeat()` on `value`; spec pins focus across `data` reassignment **and** across a search repaint |
| R14 | Local distinct computation covers only part of the row set | Gate `fetch == null && !isExternallyPaged() && _childCache.size === 0`; `set fetch(null)` resets fetch-derived state; the self-paging `[data]` case is undetectable and is a **documented contract** (D23), not a guarantee |
| R15 | `hasMore` optional → consumers omit it → search never re-queries | Required in the type |
| R16 | Two announcements per filter change (ours + the consumer's refetch) | Documented; they describe different events. If measured as double-speak in a real AT pass, drop ours |
| R17 | A wholesale dataset replacement while a selection is non-empty keeps stale snapshot values as `remaining` until Clear or a `filterSelection` reset | Documented; undetectable by the WC |

### 14.8 Spikes for this revision (gate) — amended

| # | Question | Pass criterion | Verdict |
|---|---|---|---|
| S8 | Nested directive resolved **lazily at panel open**, plain field, zoneless, **inside a host component that declares a `viewChild`** | The override renders on first open; an override under `@if (true)` renders on first open; a signal read in a header template does **not** recompute `effectiveColumns`; toggling `@if (flag())` off then reopening renders the default, on again renders the override; `onDestroy` clears the field; no NG0600 | — (pinned by the rewritten Angular spec, M17) |
| S9 | Default panel focus survives a table re-render while open, and search text is retained | typed text and `document.activeElement` unchanged across `data` reassignment and across a search repaint | **PASS by measurement in verification** (D17 refuter: 4 forced chrome renders, jsdom) — re-pinned by spec |
| S10 | `Signal`-valued `$implicit` repaints an override panel under zoneless CD when `ctx.onChange` fires | `@for` over `values()?.matching` updates with no `detectChanges()` call from the consumer | **PASS by measurement in verification** (D25 refuter: 6/6 zoneless TestBed) — re-pinned by spec |

### 14.9 Adversarial verification of this design — record

Workflow `wf_699b142e-239`, 2026-09-22: eight refuters (each told to refute; distinct lenses), one synthesizer. Six of eight refuted something; every refutation carried a measured or line-cited reason and a minimal amendment, all applied above.

| Decision | Verdict | What decided it |
|---|---|---|
| D17 (default in WC, lit render coexistence) | **Survives** | Measured: 4 forced chrome re-renders (incl. an aria-label diff) kept pane, body, lit part, input, text, checks and focus. Lit keys instances on `strings` identity and only `_update`s; `scopedHtml` caches rewritten statics per call site (WeakMap). Pane is fresh per open (`acquirePortal` creates a div; `release` removes it) |
| §14.4 a11y | **Refuted → amended** | `String(true/undefined/'')` as names (empty name violates CLAUDE.md); Clear self-disable keeps focus (measured Chrome 153); `#aaa` on white = 2.32:1; dialog modality unstated; unkeyed list repaint |
| D18 | **Survives** | Nested directive's `input()`s unreadable in its constructor (NG0950) — so column-level inputs are right |
| D19 | **Amended** | Plain field kept but for the right reason (nothing reacts to it); `ngTemplateContextGuard` required — measured 0 diagnostics for a bogus property path without it |
| D20 (eager creation in the computed) | **Refuted twice → replaced** | `insertView → dirtyQueriesWithMatches → _dirtyCounter.update()` is a signal write → NG0600 with any `viewChild` on the host (harness threw on first render); `detectChanges()` in the computed leaks template signal reads into its dependencies. Lazy resolution at panel open is sound because header and filter rows share one lit pass |
| D21 | **Amended** | Real conditional-inclusion usage exists and is spec-pinned; with lazy D20 it becomes supported, not forbidden |
| D22 | **Amended** | All-or-nothing source forced hand-rolled local distincts once any column was server-backed; per-column `null` fallback added. Identity: `Date` fails `includes` — primitives only |
| D23 | **Refuted → amended** | Measured: `set fetch(null)` reset nothing (20/100 rows, `_totalRecords` 100); tree `_childCache` values absent from local distinct; pre-paged `[data]` undetectable. Snapshot semantics added so the prescribed D27 rebind pattern keeps other values selectable |
| D24 | **Amended** | Vidyano confirmed line-for-line; three unstated points fixed: filter on `label`; the `hasMore` gate reads only the last response so a narrowed list never widens (a Vidyano defect, not copied); no open-vs-cache rule existed |
| D25 | **Survives** | Measured zoneless: `signal.set()` from `setTimeout` repainted moved nodes with no manual CD; plain object stayed stale |
| D26 | **Amended** | Selected values must keep their `label` (Vidyano renders selected-first from the encoded display text); Clear was unspecified for a consumer handling only the change event |
| D27 | **Survives** | Consistent with non-goal 2 and the shipped demo text |
| D28 | **Amended** | `labels.ts` forbids prefix/suffix composition; the previous wording required it. Boolean+string pair confirmed by precedent |
| D29 | **Amended** | Additional formatters forced by §14.4 and D28 |
| D30 | **Survives** | Heterogeneous grids met by D22's per-column fallback |

**Residual risks the verification left open** (carried into §14.7 and the plan): the lazy null-fallback (D20) is inferred from measured legs but not measured end-to-end — S8 pins it, and the measured fallback is `untracked(() => { view = vcr.createEmbeddedView(tpl); view.detectChanges(); })`, accepting sampled-once semantics; `aria-modal` without `inert` relies on modern AT; `filterValue`'s `Date` default uses the browser locale; all D17/D25 mechanism measurements were jsdom — a real-engine e2e of the default panel is M19; the datatable page has no no-JS e2e pin (unchanged from today).

## 15. Revision 3 — comparison mode, and who styles what

Status: **Implemented 2026-09-22.** Four review remarks after Revision 2 was verified in a browser. Two were defects in the demos; two asked for a capability the built-in panel did not have. Everything in §§1–14 still stands.

### 15.1 Two questions, not one

Revision 2's built-in panel asks exactly one question: *which of these values?* That is the wrong question for a quantity — ticking forty individual years is not how anyone says "after 1990" — and the reviewer could not choose an operator at all.

`DatatableColumnDef.filterMode` now selects between them:

| mode | panel | for |
|---|---|---|
| `'values'` (default) | search, include/exclude, checkbox list, clear | a set: names, statuses, genres |
| `'comparison'` | operator + one operand, clear | a quantity: numbers, dates |

`filterInputType` (`'text' \| 'number' \| 'date'`) types the operand box and decides how the operand is parsed back out. `filterOperators` narrows the six defaults (`eq neq lt lte gt gte`) when only some make sense — equality alone for an id.

**D31. The consumer picks the mode; the component never infers it.** Inference was considered and rejected: a numeric column is very often an enum (a year, in a five-row table) and a string column is very often ordinal, so a type-based guess is wrong about half the time — and wrong in a way the consumer cannot override without a second knob anyway.

**D32. The end user picks the operator.** Within `'comparison'` the operator is a `<select>`, not a column setting. That was the literal gap in the report ("the user also can't choose between ><=").

**D33. `FilterChangeDetail` is a discriminated union on `mode`.** One flat shape carrying `selected`, `inverse`, `operator` and `operand` — most of them unset most of the time — invites a consumer to read `selected` off a comparison event and get `undefined`. Switching on `mode` makes that a compile error. Clearing emits the shape of the column's *own* mode, so a consumer's `switch` cannot miss a clear.

**D34. A comparison column never calls `distincts`.** Its panel displays no list, so the round trip's answer would never be read. A consumer's own renderer still gets one, because `filterMode` stays at its `'values'` default unless the consumer changes it.

**D35. An empty or unparseable operand means no filter.** Not a comparison against `NaN`, which is false for every row and would silently empty the table on the keystroke that produced it.

### 15.2 The operand box cannot echo its parsed value

A `number` input's `value` is `''` for any content that is not a valid number — `-`, `1e` and `.` all read back empty, in every engine. So typing `-` over `1990` moves the component's state from `'1990'` to `''`; a plain lit binding sees a change and writes `value = ''`, **wiping the character the user just typed**.

The panel therefore keeps the raw text separately from the parsed operand, and binds it through lit's `live()`, which compares against what the element currently holds rather than against the last committed binding — both `''`, so nothing is written.

This is the same failure as the Revision 1 search-focus regression (§13), reached by a different route: *the component overwriting input the user is still in the middle of*. Any future field in this panel is subject to it.

### 15.3 Who styles the panel

Two reported defects, one root cause: **`.form-control` is not styled outside a `bs-*` component in this workspace**, and all three demos' override panels were using it.

**D36. A consumer's override panel is the consumer's to style.** The component cannot help: the node is never stamped with its scope, and the panel renders in the document-root overlay. What each framework needs differs, and all three are now demonstrated:

- **Angular** — ordinary component styles reach it. Emulated encapsulation is attribute-based and the nodes come from the component's own `<ng-template>`, so they carry its `_ngcontent` attribute wherever they end up in the document.
- **React** — a page-level stylesheet; plain class names on imperatively built nodes.
- **Vue** — a **non-scoped** `<style>` block. `scoped` stamps `data-v-*` onto nodes Vue renders from the template, and an imperatively built node never gets one, so a scoped rule matches nothing.

**D37. Every field in the built-in panel shares one rule.** `.filter-search`, `.filter-operand` and `.filter-operator` had been three near-copies, and had already drifted: `font: inherit` was missing from the search box, so it rendered in the UA's system font while its neighbours used the page's. A form control inherits neither font nor line-height, and the `font` shorthand resets `line-height`, so both are set explicitly.

A `type=number` operand additionally strips its spinner buttons (`appearance: textfield` plus zeroed `::-webkit-*-spin-button`), which otherwise make it a different size from a `type=text` one. Measured in Chromium: the same element as both types computes byte-for-byte identically.

The operator `<select>` still sat 1px short of the input beside it whatever font and padding they shared, because Chromium's UA sheet forces `line-height: normal` on a select. `.filter-comparison` uses `align-items: stretch` so the row decides, rather than fighting the UA.

### 15.4 Bugs this round surfaced

Recorded because none was found by reading the code:

- **`filterSelection` dropped `operator` and `operand` when seeding.** A restored comparison filter came back as an active-looking trigger over an empty panel. Found by the seeding spec.
- **The portalled panel inherits none of the component's custom properties** (§13.1) — found in a browser, invisible to three green suites.
- **The sortable header's click target was its label, not its cell** (§13.1) — reported from the running demo.
- **`≠` reached the React demo as the literal text `2260`.** Written through a `perl` one-liner inside a double-quoted shell string; the backslash survived neither bash nor perl's replacement parser. The Angular and Vue copies, written with the editing tools, were correct — which is why only one of three broke. **Rewriting source that contains escapes through a shell one-liner is not safe**, the same hazard as the repo's heredoc ban.

### 15.5 Guards added

- `mp-datatable.filter-panel-styles.spec.ts` — no bare `var(--mp-datatable-*)` in any portalled rule; the fields share one rule (a fourth field must join it or fail); spinners stripped and scope-anchored; the comparison row stretches.
- `mp-datatable.header-click-target.spec.ts` — the sort button fills its cell.
- `mp-datatable.filter-default.spec.ts` — nine comparison-mode cases, including the raw-text echo, the empty/unparseable operand, and clearing in the column's own mode.

Both style specs assert against the **generated** sheet by exact selector. jsdom has no layout, so this is the strongest available guard short of a browser — and a substring match on CSS text has already produced one false positive here (§13).
## 16. References

- Issue **#414**; driver [MintPlayer.Spark#431](https://github.com/MintPlayer/MintPlayer.Spark/issues/431)
- [overlay-controller-positioning.md](./overlay-controller-positioning.md) — the positioning half
- [shadow-adopted-content-styling.md](./shadow-adopted-content-styling.md), [consumer-styles-in-shadow.md](./consumer-styles-in-shadow.md) — the light tier
- [scheduler-view-mode-completeness.md](./scheduler-view-mode-completeness.md) §traps 1–4
- `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts`
- `libs/mintplayer-web-components/overlay/src/overlay-controller.ts`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
