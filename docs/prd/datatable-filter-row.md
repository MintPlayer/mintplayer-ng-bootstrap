# PRD — `mp-datatable` filter row, `<colgroup>` width ownership, and a document-root overlay portal

Status: **Proposed** (2026-09-22)
No branch, no PR. Written from a four-track investigation of the current `master` (`dbe4808b`). Every file:line below was read, not recalled — but nothing has been measured in a browser yet, which is what §10 is for.
Plan: [datatable-filter-row-plan.md](./datatable-filter-row-plan.md)
Related: issue **#414** (open), driven by [MintPlayer.Spark#431](https://github.com/MintPlayer/MintPlayer.Spark/issues/431); builds on #408 / PR #410 (light tier) and [overlay-controller-positioning.md](./overlay-controller-positioning.md).

---

## 0. Summary for the impatient

1. The feature is a **second `<thead>` row**, hidden unless at least one column opts in, one cell per column, each holding a consumer-supplied trigger + filter panel. This component never decides what a filter *means*.
2. Three supporting changes are not optional decoration — each fixes something the filter row would otherwise break or expose:
   - **`<colgroup>` takes ownership of column widths** (§5.2). Today widths are inline styles on the first header row's `<th>`s, which is the only reason a second header row is entangled with sizing at all.
   - **A document-root overlay portal** (§5.4), because the panel must escape `.datatable-scroll` and the sticky header, and the current house pattern (`position: fixed` + a guessed `z-index`) depends on consumer ancestors we cannot control. **No portal exists today.**
   - **The ARIA row arithmetic is parameterised on header-row count** (§1.2). It is hard-coded to exactly one header row; a second row ships an off-by-one on every row's announced position.
3. Three claims in the issue text are wrong and are corrected here: `datatable.styles.ts` is a **stale artifact** of a deleted source (§1.5), `has-overlay` is an **Angular-only CSS marker** with no WC equivalent (§1.6), and `*bsDatatableCell` / `*bsDatatableHeader` **do not exist** (§1.7).
4. Gate: **seven spikes** (§10), five in a real browser across three engines. The portal is the risky part. `<colgroup>` is low-risk but has one genuine unknown — lit rendering `<col>` elements through `repeat()` (S6).
5. Net effect on the component beyond the feature: width ownership becomes one node per column instead of an inline style on a header cell, and the resize/measure paths get simpler rather than more complex.

---

## 1. Problem

`mp-datatable` has no filter concept. `DatatableColumnDef` carries `name / label / sortable / width / cellRenderer / headerRenderer / cellClass` (`libs/mintplayer-web-components/datatable/src/types/column-def.ts:43-58`) and a repo-wide grep for `filter` across the four datatable libs returns only `Array.prototype.filter` calls.

Spark needs a Vidyano-style per-column value filter and cannot build it itself, because the `<thead>` belongs to this component.

### 1.1 Why it cannot go inside the existing `<th>` (confirmed)

`renderHeader` wraps header content in `<button type="button" class="header-cell header-sort">` whenever the column is sortable — `mp-datatable.ts:931-941`, and `sortable = col.sortable ?? true` (`:907`), i.e. **sortable is the default**. A filter trigger placed there would be an interactive element inside a `<button>`: invalid HTML, an accessibility failure, and `onHeaderClick` (`:1572`) would fire a sort on every filter click. The `<th>` also already hosts a second interactive child — the `.resize-handle` `role="separator"` (`:945-957`) — and `onHeaderClick` only escapes it by an explicit `closest('.resize-handle')` test. Adding a third would extend that ad-hoc exclusion list.

So it has to be a real second row. The issue is right about this.

### 1.2 The ARIA row arithmetic assumes exactly one header row — **a live bug the feature would expose**

`<thead>` contains exactly one hard-coded `<tr role="row" aria-rowindex="1">` (`mp-datatable.ts:850-851`). Everything downstream is built on that literal:

- `aria-rowcount` is `<data rows> + 1` (`:835`)
- every body row's `aria-rowindex` is `rowIndex + 2` (`:974`)

Emitting a second `<tr>` in `<thead>` without touching these makes the first data row claim to be row 2 when it is row 3, and understates the count by one — for the whole grid, in both paged and virtual mode. Assistive technology reads those numbers verbatim.

This is invisible in review because the offsets look like arbitrary constants. See D6.

### 1.3 Width ownership is the real structural problem

There is **no `<colgroup>` anywhere in the repository** (verified by grep across `libs` and `apps`). Column widths are applied **only as inline `style` on the first header row's `<th>`**:

```ts
const width = this._columnWidths.get(col.name) ?? col.width;   // mp-datatable.ts:910
const style: Record<string, string> = {};
if (typeof width === 'number') {
  style['width'] = `${width}px`;
  style['minWidth'] = `${width}px`;                            // :913-917
}
```

applied via `styleMap` at `:929`. Body `<td>`s get no width at all.

The table is `table-layout: auto` (`datatable.light.scss:69-79`) until a **one-shot measure pass** flips it. `maybeMeasureInitialColumnWidths` (`:711-739`) waits for ≥1 column and ≥1 real body row, then for each column either pins `col.width` verbatim or measures `Math.ceil(th[data-column=…].getBoundingClientRect().width)` (`measureColumnWidth`, `:741-747`), writes `_columnWidths`, sets `_hasMeasuredInitial`, and re-renders into `table.measured { table-layout: fixed }` (`:81-83`). Resize then mutates the same map — pointer drag clamped to ≥40px (`onColumnResizeMove:1816-1823`), keyboard ±10px (`:1790-1796`) — and re-renders.

Three consequences follow, and all three are why the filter row is more than markup:

1. **Widths live on row 1 only.** Under `table-layout: fixed` the column-width algorithm consults the first row's cells, so row 1's `<th>` inline styles *are* the column contract. A second header row has no width channel and must be trusted to stay neutral — a discipline, not a mechanism.
2. **While `auto`, a wide filter cell widens the column, and that inflated width is then measured and pinned forever.** The measure pass reads the `<th>` after full-table layout, so anything in the second row that increases the column's intrinsic width silently becomes permanent.
3. **Resize measures a `<th>` and writes a map that re-renders a `<th>`.** Correct, but it means width state round-trips through a header cell that also contains a button, a sort index and a resize handle.

`<colgroup>` fixes all three at the source. See §5.2.

### 1.4 Sticky stacking in virtual mode

In virtual mode, sticky is declared on the **individual `th`**, not on `<thead>` or `<tr>`: `thead th { position: sticky; top: 0; z-index: 1; background-color: var(--bs-body-bg,#fff) }`, scoped to `.datatable-scroll.datatable-virtual` (`datatable.light.scss:30-58`). A second row of sticky cells at the same hard-coded `top: 0` pins on top of the first. Nothing measures the header row's height and no custom property carries it. The `.resize-handle` sits at `z-index: 2` (`:187-196`), so `z-index: 1` is already not the top of the local stack.

The hover rule re-asserts an opaque background as a layered `background-image` precisely so scrolled rows do not bleed through the sticky header (`:43-50`). A new sticky row needs the same treatment.

### 1.5 Correction — `datatable.styles.ts` is a stale artifact, not the stylesheet

The issue says filter-row styling goes in `datatable.styles.ts`. It does not.

- `src/styles/datatable.light.scss` (tracked, the real source) → `datatable.light.styles.ts` (generated) → exported by `src/styles/index.ts`, which exports **only** `datatableLightStyles`.
- `src/styles/datatable.styles.ts` announces `// Source: datatable.styles.scss` — but that `.scss` was **deleted in `dbe4808b`** (#410, the light-DOM conversion). The `.ts` is a leftover from the last build before that commit, is untracked (gitignored), is imported by nothing, and still contains dead shadow-tier `:host{}` CSS. It will never regenerate.

All CSS therefore goes in **`datatable.light.scss`**, which means every new selector must satisfy `_conformance/light-styles-scoping.spec.ts`: some compound must carry `[data-mps=datatable]` (or be the `mp-datatable` tag), **every combinator from that anchor to the subject must be descendant or child** — a `+` or `~` after the anchor fails the static check (`:82-93, 142-149`) — and no selector may match the decoy tree, which explicitly contains a bare `<table><thead><tr><th>` and a `.datatable-shell > .datatable-scroll` (`:154-165`). `ALLOWED_GLOBAL_SELECTORS` is empty (`:39-41`); the only exemption is `/*! @mps-global */`, which emits the rule **verbatim** and so must be hand-authored already-anchored.

Housekeeping: delete the stale file (M0). It is a trap for the next reader.

### 1.6 Correction — `has-overlay` is not a candidate

The issue suggests checking "whether the existing `has-overlay` primitive is sufficient". It is not a primitive and not reachable from a web component. `BsHasOverlayComponent` (`libs/mintplayer-ng-bootstrap/has-overlay/src/has-overlay/has-overlay.component.ts:17-23`) is an **Angular** component with zero members, an empty template, and a three-line stylesheet whose entire body is `::ng-deep { @import 'node_modules/@angular/cdk/overlay-prebuilt'; }`. Its own JSDoc (`:3-16`) states it is a CSS-injection marker and explicitly declines any behavioural responsibility. It does not exist in `libs/mintplayer-web-components/` in any form.

### 1.7 Correction — the Angular directive surface is smaller than the issue assumes

`*bsDatatableCell` and `*bsDatatableHeader` do not exist. There are exactly two structural directives:

- `[bsDatatableColumn]` (`datatable-column.directive.ts:20-28`) — inputs `name` (alias `bsDatatableColumn`) and `sortable`. **Its template content *is* the header template**; there is no separate header directive.
- `[bsRowTemplate]` (`row-template.directive.ts:26-47`) — whole-row, with a context class and `ngTemplateContextGuard`.

`cellRenderer` is never bridged by the Angular wrapper at all; it is reachable only through the programmatic `[columns]` input (`datatable.component.ts:78`). So the new filter directive is a **third** directive, and the pattern it must mirror is the `headerRenderer` closure in `effectiveColumns` (`datatable.component.ts:181-204`) — not a cell directive, which does not exist.

### 1.8 The clipping problem, stated precisely

`.datatable-scroll { overflow: auto }` (`datatable.light.scss:25-28`), plus `max-height: var(--mp-datatable-virtual-max-height, 480px)` in virtual mode (`:30-34`). An in-flow panel opened from a header cell is clipped by that scroller on both axes, and in virtual mode is in the same stacking neighbourhood as `z-index: 1` sticky cells.

The house answer to clipping so far is `position: fixed` + a hand-picked `z-index`, applied by each consumer's own CSS (§5.4). That works **only** while no ancestor establishes a fixed containing block — a rule enforced nowhere except comments: six of them across the scheduler alone (`scheduler.styles.scss:595-598, 863-867, 1260-1265`; `mp-scheduler.ts:623, 2049`; `scheduler-compact-timeline-localization.md:223-238`). One `transform`, `filter`, `contain`, `will-change` or `container-type` on any ancestor and every panel silently lands in the wrong place.

For a datatable that is a worse bet than usual, because the ancestor chain above `mp-datatable` belongs to the **consumer** — this is a light-DOM component deliberately open to page CSS (`mp-datatable.ts:104-114`). We cannot write a comment in someone else's app.

---

## 2. Goals

1. A second header row, rendered only when at least one column opts in, aligned with the header and body rows **by construction** rather than by CSS tuning.
2. Column widths owned by a mechanism that is independent of which rows exist, so the filter row cannot perturb geometry.
3. A per-column filter template bridged from all three frameworks, following each framework's existing precedent.
4. A filter panel that is **not clipped** by the scroll container and not occluded by the sticky header, in paged *and* virtual mode, verified in three engines.
5. The panel escapes clipping by a mechanism that does not depend on the consumer's ancestor CSS — a document-root portal, not `position: fixed` and hope.
6. Full keyboard operability and a correct accessibility tree, including the row-index arithmetic fix.
7. The portal is a **reusable overlay capability**, not datatable-private code.

## 3. Non-goals

1. **Any filter semantics.** No predicate model, no operator vocabulary, no filter state, no `filter-change` event carrying a query. The panel's contents are the consumer's template. If a shared vocabulary is ever wanted it comes from `bs-query-builder`'s existing `Expression` / operator / per-type editor registry, not a second incompatible shape invented here.
2. Server- or client-side filtering of `data` / `fetch`. The component does not re-query anything.
3. **Column hiding / reordering**, even though `<colgroup>` makes both newly cheap. Named as a successor (§13).
4. Converting any other component to the portal in this PR. The portal is built reusable and used by exactly one caller; migrating the other ten is a successor, not this PR.
5. A no-JS tier for the filter row. A dropdown trigger whose panel is positioned by script has no meaningful inert rendering; the row is simply not emitted in SSR chrome. (`mp-datatable` ships no `ssr/` directory today.)

---

## 4. Locked decisions

| # | Decision | Consequence |
|---|---|---|
| D1 | The filter row is a real second `<tr>` in `<thead>`, emitted only when `columns.some(c => c.filterable)` | No row, no cost, no ARIA change for the overwhelming majority of tables |
| D2 | Cells repeat the **same leading gutters** as row 1 — `[tree gutter?][checkbox?][...consumer columns]` (`mp-datatable.ts:852-867`) | Alignment is structural |
| D3 | Column opt-in is `filterable?: boolean` (default **false**), content is `filterRenderer?: (column) => Node` | Mirrors `headerRenderer`'s signature exactly (`column-def.ts:11-13`); default-off is the opposite of `sortable`'s default-on, deliberately — a filter row is a visual change |
| D4 | **`<colgroup>` owns column widths.** One `<col>` per rendered column including gutters; `width` moves off the `<th>` inline style | The filter row cannot affect widths under `fixed` layout — mechanism, not discipline (§5.2) |
| D5 | The measure pass and the resize handler both write **`<col>` widths**; `_columnWidths` remains the single source of truth | One node per column; header cells stop carrying geometry |
| D6 | The row-index arithmetic is parameterised on the actual header-row count | Fixes §1.2 before it ships |
| D7 | The panel is rendered into a **document-root overlay portal**, a new capability in the `overlay` lib | Clipping and stacking stop being the consumer's problem (§5.4) |
| D8 | `OverlayController` grows the portal as an **option**, not a rewrite. Existing consumers untouched | Eleven working components stay working |
| D9 | The trigger is a real `<button>` owned by **this component**; only the panel's *contents* are the consumer's template | Role, name, `aria-expanded`, `aria-controls`, focus and keymap stay testable |
| D10 | Angular bridges via a third structural directive `[bsDatatableFilter]`, mirroring the `headerRenderer` closure (`datatable.component.ts:181-204`) | Consistent with the only two directives that exist (§1.7) |
| D11 | React and Vue need **no wrapper change** — `filterable` / `filterRenderer` ride inside the `columns` objects, which both already forward as element properties | React is a pure `createComponent` passthrough (`BsDatatable.tsx:30-46`); Vue assigns `el.columns` in `syncProps` (`BsDatatable.vue:68`) |
| D12 | All CSS goes in `datatable.light.scss`, scope-anchored; the stale `datatable.styles.ts` is deleted | §1.5 |
| D13 | Consumer filter-template DOM is **not** stamped with `data-mps=datatable` | `_conformance/consumer-dom-boundary.spec.ts:151-189` already asserts this for the other three renderers; the filter template joins that list |
| D14 | **`visibility: collapse` on `<col>` is not used.** Engine behaviour for collapse has been inconsistent historically and column hiding is out of scope | The `<colgroup>` is a width channel only (§5.2.3) |
| D15 | No third-party dependency. No `@angular/cdk` in a web component | Standing repo rule; the portal is ~150 lines of DOM ownership |
| D16 | Minor version bump; npm major stays pinned to the Angular major | Purely additive API |

---

## 5. Design

### 5.1 The filter row

`renderFilterRow()` beside `renderHeader()`, emitted inside `<thead>` after the existing `<tr>`:

```
<table>
  [<caption>]
  <colgroup> … one <col> per column, gutters included …  </colgroup>   ← new (§5.2)
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

and when it is not, an empty `<th class="filter-cell">` — present, sized by its `<col>`, contributing nothing. That is what keeps the row aligned when only some columns filter.

Points that are not free:

- **`scope="col"` on both rows.** Two `<th scope="col">` in one column is valid and is what the spec's own multi-row-header examples do. The filter cell carries no text, so it adds nothing to the computed column header name.
- **The empty cells must not be `aria-hidden`** — they are in the table's structural grid and hiding them desynchronises column counts.
- **Gutter cells repeat** exactly as in row 1: `<th class="tree-chevron-cell">` and `<th class="checkbox-cell">`, both empty.
- **`<colgroup>` placement is fixed by the HTML parser**: after `<caption>`, before `<thead>`. The current render already emits an optional `<caption>` at `:849`, so the insertion point is between `:849` and `:850`.

### 5.2 `<colgroup>` — moving width ownership off the header row

#### 5.2.1 What it buys

`<colgroup>`/`<col>` is HTML 4. Support is universal and has been for two decades; there is no compatibility question to answer and no feature detection to write.

The column-width algorithm for `table-layout: fixed` resolves each column's width from, in order: the `<col>` element's width, then the first row's cell width, then equal division. So once widths live on `<col>`:

- **The filter row cannot perturb geometry under `fixed` layout.** Not "must be careful not to" — cannot. `<col>` wins before any row is consulted. This converts D-something-discipline into a mechanism, which is the main reason to do it.
- **Width state stops round-tripping through a header cell** that also contains a sort button, a sort index badge and a resize handle.
- **Gutter widths join the same system.** The tree-chevron (`width: 2rem`) and checkbox (`width: 2.5rem`) columns are currently CSS-only rules on `<th>`/`<td>` class selectors (`datatable.light.scss:253-267`). They become `<col class="tree-chevron-col">` / `<col class="checkbox-col">`, so every column's width is declared in one place.
- **Resize gets simpler**: `onColumnResizeMove` currently rebuilds a `Map` and requests a full re-render on every pointer move (`:1816-1823`). With `<col>` it *may* write `col.style.width` directly for the duration of the drag and commit to the map on pointerup — a per-frame DOM write on one node instead of a full lit re-render of the table. That is an optimisation, not a requirement; it is listed in the plan as optional and must not be conflated with the correctness work.

#### 5.2.2 What it does not buy

Under `table-layout: auto` — which is the state before the one-shot measure pass — a `<col>` width is a **suggestion**. Content can still widen a column. So §1.3's trap 2 shrinks but does not vanish: during the auto phase a wide filter cell can still inflate the column, and that inflated value is what gets measured and pinned.

Two mitigations, both cheap:

- The filter trigger is `width: 100%` of its cell with no intrinsic minimum above the sort header's existing `padding-right: 2rem` (`:101-114`), so it has no reason to be the widest thing in the column.
- The measure pass can exclude the filter row by measuring the **first** header row's `<th>` specifically — it already selects `th[data-column="…"]`, which after this change must be qualified to row 1 or it may match the filter cell. **This is a live bug the change would introduce if missed**: `querySelector` returns the first match in document order, which is row 1's `<th>`, so it happens to be correct today — but relying on document order for that is exactly the kind of accident that breaks when someone reorders the template. The selector gets an explicit row qualifier.

S6 measures whether the mitigations are sufficient or whether the filter row needs to be excluded from intrinsic sizing outright.

#### 5.2.3 What is deliberately not used

`visibility: collapse` on a `<col>` is the native column-hide primitive. Engine behaviour for it has been inconsistent enough historically that it is not worth adopting speculatively, and column hiding is out of scope (D14, §3.3). The `<colgroup>` here is a width and (potentially) background channel only. Recorded so that a future reader knows it was considered rather than overlooked.

Likewise `background` on `<col>` — one of the four properties that *does* apply — would make column highlighting trivial. Also a successor (§13), also not this PR.

#### 5.2.4 The one real unknown

Lit renders templates by parsing them into `<template>` elements and stamping parts as comment markers. Table-internal content is historically where HTML parsing surprises live, and a `repeat()` over `<col>` elements inside `<colgroup>` means a comment-node marker as a `<colgroup>` child.

The expectation is that this is fine — `<template>` content is parsed in "in template" insertion mode, which does not apply the table-fragment restrictions that bite `innerHTML` on a live `<table>` — but "expected to be fine" is not a measurement, and a silent failure here would be a table with no widths at all. **S6 tests it before any of §5.2 is written.** If it fails, the fallback is to build the `<colgroup>` imperatively in `updated()` (which then needs `stampScope`, per the standing rule) rather than through the lit template.

### 5.3 Sticky offset in virtual mode

The filter row needs `position: sticky` with `top: <height of header row 1>`, and nothing computes that today (§1.4). Options, in preference order:

- **O1 — CSS only.** Not available: `top` cannot reference a sibling's height, and the header height varies with content, padding and font.
- **O2 — measured custom property.** The existing one-shot measure pass (`:711-739`) already runs at the right moment and already writes state that flips a class. Extend it to write `--mp-datatable-header-height` on the shell from `thead tr:first-child` `getBoundingClientRect().height`; the filter row uses `top: var(--mp-datatable-header-height, 0)`. Re-measured on the `ResizeObserver` already watching the scroller (`:651-664`).
- **O3 — `position: sticky` on `<thead>`.** Cleaner in principle, but it changes the stacking and background behaviour of the existing header (which relies on per-`th` opaque backgrounds and a hover `background-image` layer, `:43-50`), risking a shipped, tested behaviour for a row most tables will not render.

**O2 is the design**, gated by S4. O3 is the recorded successor if S4 shows per-`th` double-sticky misbehaving anywhere.

### 5.4 The overlay portal — the part that does not exist yet

Today `OverlayController` is **positioning-only**: it writes `panel.style.left/top` in px and nothing else (`overlay-controller.ts:386-438`), never sets `position`, `z-index` or `transform`, and never moves a node. Its own PRD makes this a non-goal in writing: *"the new primitive is positioning-only — it does not create stacking-context layers, manage backdrops, or own DOM ownership beyond positioning"* (`overlay-controller-positioning.md:53`). There is no `document.body.appendChild` anywhere in the overlay path; the only two in the whole WC library are a hidden file input and a drag ghost.

This PRD adds the missing half, mirroring CDK's split: CDK has an `OverlayContainer` (one `<div class="cdk-overlay-container">` at the document root), a `Portal`/`PortalOutlet` pair that relocates content into it, and a separate positioning strategy. We already have the positioning strategy.

**New: `libs/mintplayer-web-components/overlay/src/overlay-portal.ts`**

- A single shared host, created lazily and appended to `document.body`: `<mp-overlay-container>` — a real custom element so it is inspectable, greppable and stylable by tag without a class contract. One per document, reference-counted.
- `acquirePortal(): PortalHandle` → `{ container, release() }`. The container is an empty `<div class="mp-overlay-pane">`, removed on release; the host removes itself when the last pane goes.
- Stacking: the host is the **last child of `<body>`** with a single `z-index` above the library's current ceiling (in use today: `1080` file-manager, `1056` tree-select, `1050` everything else). Panes inside it carry **no `z-index`** and stack in DOM order — which is the actual win over eleven components each hard-coding a number in isolation.
- `position: fixed; inset: 0; pointer-events: none` on the host, `pointer-events: auto` on panes, so it never swallows page clicks.
- **The host must not establish a containing block** — no `transform`, `filter`, `contain`, `will-change`, `container-type`. It is the one ancestor we control and the entire point is that nothing above a pane breaks `position: fixed` coordinates. A spec asserts the computed style so a future edit cannot quietly reintroduce §1.8's trap.

**`OverlayController` gains `portal?: boolean`** (default `false`). `open()` acquires a pane and installs the panel there; `close()`/`hostDisconnected()` release it. Positioning, `dismissStack`, `FocusTrap`, Escape, outside-click and scroll/resize are unchanged and already correct for a portalled panel, because they work in viewport coordinates and composed paths rather than DOM containment. Two things are **not** automatic:

- **Outside-click** uses `event.composedPath().includes(this.host)` (`:708-712`). A portalled panel is no longer inside the host, so a click **in the panel** reads as outside and closes it. The check must become `includes(host) || includes(panel)`. Highest-risk line in the change; S1 covers it.
- **`close()` resolves the return-focus target before removing `data-menu-open`** (`:258-283`, rationale `:263-265`) because the consumer's `display: none` applies synchronously and would blur to `<body>`. With a portal the panel is also about to be *moved*, which blurs focus just as effectively. The move-back must happen after focus is restored.

**Why a portal rather than the house pattern.** In order of weight: (a) the ancestor chain above a light-DOM `mp-datatable` belongs to the consumer's app, so "no transform above me" is unenforceable here in a way it is not inside a shadow root; (b) the sticky header's `z-index: 1` lives in the scroller's stacking context, and a panel that must clear it *and* arbitrary page chrome has no correct hard-coded number; (c) eleven components currently guess a `z-index` in isolation. (b) alone would be solvable; (a) is not.

**What the portal costs.** The panel leaves the datatable's subtree. Three things depend on that subtree:

1. **Lit.** Moving a lit-managed node out from under its `ChildPart` is not supported. The design is therefore not to move a template-rendered node: the controller renders the panel into the acquired pane with a **separate `render()` root**, so lit owns a tree whose container happens to live in `document.body`. S1 decides between this and node relocation; if both fail, the fallback is a pane that is a positioned *wrapper* while the panel stays put — which loses (a) and reopens D7.
2. **Light-tier styles.** The one place the light tier helps instead of hurting. `installLightStyles('datatable', …)` (`mp-datatable.ts:1863`) installs the rescoped sheet at **document** level (`install-light-styles.ts:62-99`), so it reaches a pane in `document.body` exactly as it reaches the table, and every rule anchors on `[data-mps=datatable]`, which `scopedHtml('datatable')` (`:17`) stamps automatically. `mp-tree-select` already records this property — *"attribute scoping also survives the overlay being positioned outside the host, which tag-scoping would not"* (`mp-tree-select.ts:6-13`) — though it never actually moves its panel, so the claim is untested. S2 tests it.
3. **IDREFs.** `aria-controls` from a trigger in the table to a panel in `document.body` resolves: same document tree, no shadow boundary anywhere on the path, because `mp-datatable` has no shadow root (`:112-114`). Had this been a shadow component the portal would have broken `aria-controls` outright. Stated because the standing rule is "IDREFs never cross a shadow boundary" and this is the case where it is satisfied for an unusual reason.

Consumer DOM (Angular `EmbeddedViewRef` root nodes) is appended into the panel **after** any `stampScope` call — `stampScope` recurses and would otherwise brand the consumer's nodes with our scope.

### 5.5 Scroll tracking — a trap that does *not* apply here

The scheduler records that `scroll` does not compose, so `OverlayController`'s document capture listener never sees a scroll of a container **inside a shadow root**, silently killing both `reposition` and `close` (`scheduler-view-mode-completeness.md:728-733`, worked around at `mp-scheduler.ts:1066-1076, 1219-1227`).

`.datatable-scroll` is in the **light DOM**. The capture listener on `document` (`:591-594`) receives its scroll events normally, so `scrollStrategy: 'reposition'` works with no local listener. Stated explicitly so nobody copies the scheduler's workaround here — and so that if `mp-datatable` ever regains a shadow root, the reason this worked is on record.

The anchor must still be resolved **lazily by stable key** (`() => renderRoot.querySelector('thead tr.filter-row th[data-column="…"] .filter-trigger')`), because every render rebuilds the header and a captured element detaches under an open panel — `scheduler-compact-timeline-localization.md:216-218`.

### 5.6 Angular bridge

A third directive, `[bsDatatableFilter]`, injecting `TemplateRef`, with a `name` input associating it with a column — the filter template is a *sibling* concern to `[bsDatatableColumn]`'s header template, and a structural directive has exactly one `TemplateRef`, so overloading the existing one is not possible.

In `effectiveColumns` (`:181-204`) each column gains, when a matching filter directive exists, `filterable: true` and a `filterRenderer` using the same lazy `EmbeddedViewRef` closure as `headerRenderer`, with the view pushed to a `filterViews` array registered in the existing `destroyRef.onDestroy` block (`:212-217`).

One pre-existing defect is inherited and should be fixed while here: `headerViews` **accumulates**. When `effectiveColumns` recomputes because content children changed, new closures push fresh views and the old ones live until component destroy. With filter views that doubles. Fix: destroy and clear the previous generation at the top of the recompute — the discipline `rowViews` already applies when the row template disappears (`:314-326`).

`[columns]` continues to win over content children (`:184`), so the programmatic path gets the new fields free.

### 5.7 React and Vue

Nothing to write (D11). React's wrapper is a single `createComponent` call with no props interface of its own (`BsDatatable.tsx:30-46`) — `columns` is forwarded as a property, so a `filterRenderer` inside a column def arrives intact, exactly as `cellRenderer` does in the React demo today (`DatatablePage.tsx:56-62`). Vue assigns `el.columns = props.columns ?? []` in `syncProps` (`BsDatatable.vue:68`), same result.

Both demos gain a filter example, which is the real deliverable for those two frameworks.

---

## 6. Accessibility contract

| Requirement | How |
|---|---|
| Filter row is not announced as a data row | It is in `<thead>`, `role="row"`, counted as a header row — D6 |
| `aria-rowindex` / `aria-rowcount` stay truthful | Parameterised on header-row count: filter row is `aria-rowindex="2"`, body rows `rowIndex + 1 + headerRowCount`, `aria-rowcount` `rows + headerRowCount` |
| Every trigger has a role and a non-empty name | Real `<button>`; name is a localized `labels.filterColumn(columnLabel)` in `types/labels.ts` — never a hard-coded English literal |
| State on the role | `aria-expanded` on the trigger, written in the **same render** as the panel opens, derived from controller state rather than an event handler |
| `aria-controls` | Trigger → panel id; valid across the portal because there is no shadow boundary (§5.4) |
| Keyboard | Trigger tab-reachable; Enter/Space opens; Escape closes and returns focus (`dismissStack` + `isTopOfStack`, already implemented); Tab cycles within the open panel (`FocusTrap`, `modal: true`) |
| Focus restore | `resolveReturnTarget` (`:296-300`) returns to the trigger; must survive the panel being moved back out of the pane (§5.4) |
| Focus ring | `:focus-visible` rule in `datatable.light.scss`; no `outline: none` without a replacement |
| Sort unreachable from the filter row | The filter row contains no `.header-sort` button and `onHeaderClick` is bound only in row 1 (`:932`) — structural, not a guard |
| Reduced motion | Any panel transition honours `prefers-reduced-motion` in the component's own SCSS |

---

## 7. #1 risk — read before implementing

**The portal is the risk; the row and the `<colgroup>` are routine.**

Moving a panel out of the element that rendered it touches, simultaneously: lit's node ownership, the outside-click composed-path test, focus restoration across a DOM move, the light-tier style scope, and — for Angular — an `EmbeddedViewRef` whose root nodes now live in `document.body` while its change detection still belongs to the datatable component's `ViewContainerRef`.

That last one is least obvious and most likely to look fine in a demo and fail in an app: the view stays attached to its container, so `detectChanges()` keeps working and bindings keep updating even though the DOM is elsewhere (exactly how CDK portals behave) — but it is an `OnPush` island driven by explicit `detectChanges()` calls in our closure, so a consumer's async update inside a filter panel will not repaint unless the closure is re-invoked. S5 measures this rather than assuming it.

If S1 or S5 fails, the fallback is **not** "ship it anyway with `position: fixed`". It is to reopen D7 and accept the in-place panel with the consumer-ancestor caveat documented, which materially weakens Goal 5. That is the user's decision, not the implementation's.

The `<colgroup>` work has exactly one unknown (S6, §5.2.4) and a named imperative fallback.

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

`width` keeps its meaning (an initial pinned px width) — only the DOM node it lands on changes (D4), which is not observable through the public API.

**Events** — two, carrying no semantics:

```ts
'mp-datatable-filter-open'   // detail: { column: string }
'mp-datatable-filter-close'  // detail: { column: string }
```

They exist so a consumer can lazily populate a panel; they are not a filter model (§3.1).

**`libs/mintplayer-web-components/overlay/src/overlay-portal.ts`** — new exports from the overlay barrel:

```ts
export interface PortalHandle { readonly container: HTMLElement; release(): void; }
export function acquirePortal(): PortalHandle;
```

**`OverlayControllerOptions`** — one new field:

```ts
/** Render the panel into a document-root overlay pane instead of leaving it in place. Default false. */
portal?: boolean;
```

**Angular** — `[bsDatatableFilter]` directive with a `name` input, exported from the datatable barrel.

**Labels** — `filterColumn(column: string): string` added to the labels type and default (`types/labels.ts`).

**CSS custom properties** — `--mp-datatable-header-height` (written by the component, readable by consumers) and the existing `--mp-datatable-virtual-max-height`.

---

## 9. Migration and documentation

Nothing breaks. `<colgroup>` is invisible to consumers: `DatatableColumnDef.width` behaves identically and the rendered table gains an element that carries no content.

Two things to document on the demo pages:

- `.form-control` is only styled inside `<bs-form>`, so a consumer putting a form control in a filter panel needs to know whether to wrap the grid or just the panel. The issue asks for this either way it lands; each demo page already has a `<details>` light-DOM blurb to extend.
- The filter row's keymap, per the repo rule that any widget's demo documents its keyboard contract.

---

## 10. Spikes (gate — throwaway except where noted; verdicts recorded here)

| # | Question | Pass criterion | Verdict |
|---|---|---|---|
| S1 | Can a lit-rendered panel live in a document-root pane? Separate `render()` root vs relocating the node | Renders, updates on state change, survives 20 open/close cycles with no orphans; outside-click closes on a page click and does **not** close on a panel click | — |
| S2 | Does the light-tier sheet reach a pane outside the host? | Every `[data-mps=datatable]` rule applies to the portalled panel identically to in-place, 3 engines; the scoping decoy tree still matches nothing | — |
| S3 | Is the panel clipped or occluded, in **paged and virtual** mode? | Panel fully visible at the last column and last visible row in both modes, 3 engines, scroller at each extreme; not occluded by the sticky header | — |
| S4 | Does a second sticky row at a measured `top` behave in all engines? | Pins directly below the header with no overlap and no gap at every scroll offset, 3 engines; no row bleed-through | — |
| S5 | Does an Angular `EmbeddedViewRef` keep updating with its root nodes in `document.body`? | A signal-driven binding inside a filter template repaints on change; view destroys cleanly; no NG0953 | — |
| S6 | **`<colgroup>` under lit, and in both layout regimes** | (a) A `repeat()` of `<col>` inside `<colgroup>` parses and stamps correctly in 3 engines — widths actually apply; (b) under `table-layout: fixed`, measured column widths are identical with and without a filter row containing a full-width trigger; (c) under `auto`, the delta is zero or bounded by the trigger's declared size | — |
| S7 | Does resize still behave when widths live on `<col>`? | Pointer drag and keyboard ±10px produce identical final widths to today, clamped at 40px, 3 engines; no per-frame layout thrash worse than the current full re-render | — |

Engines: Chromium, Firefox, WebKit via Playwright. S1/S5 may run in one engine plus jsdom where the question is not a rendering question. Harnesses are throwaway and deleted once verdicts are written here; if S3's or S6's page proves reusable it goes to `docs/prd/spikes/datatable-filter-row/` as committed evidence.

**A failed gate stops the plan.** S1 or S5 → reopen D7 (§7). S4 → promote O3 (§5.3). S6(a) → build the `<colgroup>` imperatively in `updated()` with `stampScope` (§5.2.4). S6(b)/(c) → the filter row needs explicit exclusion from intrinsic sizing. S7 → keep the resize path writing through `_columnWidths` + full re-render, and treat the direct-write optimisation as rejected.

---

## 11. Testing

- `mp-datatable.aria.spec.ts` — extend: no second row when nothing is filterable; row present when something is; `aria-rowindex` on the filter row and on body rows **with and without** the filter row (the D6 regression); `aria-rowcount` in both cases; trigger role/name/`aria-expanded` in both states; `aria-controls` resolves.
- `mp-datatable.keyboard.spec.ts` — extend: trigger tab-reachable; Enter and Space open; Escape closes and restores focus to the trigger; Tab trapped in the open panel; a click in the filter row never sorts.
- New `mp-datatable.filter-row.spec.ts` — cell count equals `totalColumnCount` across all four tree×checkbox permutations; empty cells for non-filterable columns; `filterRenderer` invoked once per open, not per render.
- New `mp-datatable.colgroup.spec.ts` — one `<col>` per rendered column including gutters, in order; `col.width` pins; the measure pass writes `<col>` not `<th>`; resize updates the `<col>`; **the measure-pass selector matches row 1's `<th>`, not the filter cell** (§5.2.2).
- New `overlay-portal.spec.ts` — acquire/release reference counting; container removed with the last pane; computed style asserts no containing-block-forming property (the §5.4 guard).
- `overlay-controller.spec.ts` — extend: `portal: true` open/close moves and restores the panel; outside-click semantics with the panel outside the host.
- `_conformance/consumer-dom-boundary.spec.ts` — add `filterRenderer` to the three renderers already asserted unstamped (`:151-189`).
- `_conformance/light-styles-scoping.spec.ts` — no change needed; it is file-driven and picks up new selectors automatically. That is the point of it.
- Angular `datatable.component.spec.ts` — the directive bridges; views are destroyed; the accumulation fix holds across a column-set change. **Drive inputs from a `signal()`, never a mutable field** — a plain-field write notifies nothing and the spec fails looking like a component bug.
- Vue `_conformance/behaviour/BsDatatable.spec.ts` — `columns` carrying a `filterRenderer` round-trips.
- e2e: one Playwright test per demo app exercising open → keyboard → close, in virtual mode.

Per the repo rule, all of this runs in **one sweep at the end**, not per milestone.

---

## 12. Versioning & dependencies

Minor bump across all four libraries. Purely additive: `DatatableColumnDef` gains three optional fields, `OverlayControllerOptions` gains one, the overlay barrel gains two exports, the Angular datatable barrel gains one directive. No breaking change, no new dependency (D15).

`mp-overlay-container` is a new custom element name, registered lazily and defined exactly once.

---

## 13. Successors, named rather than implied

- **Migrate the other overlay consumers to the portal.** Eleven components hard-code a `z-index` between 1050 and 1080 and depend on an unenforceable "no transform above me" rule. Once the portal is proven this is mechanical and high-value — and it is what turns D7 from a datatable fix into a library fix.
- **Column hiding and reordering.** `<colgroup>` makes both substantially cheaper: reordering becomes a `<col>` permutation plus cell order, and hiding has a native (if historically inconsistent) `visibility: collapse` path worth re-measuring on current engines (D14).
- **Column highlighting via `background` on `<col>`** — one of the four properties that applies, and the cheapest possible hover/active column affordance.
- **Generalise `OverlayController` to walk shadow scroll-ancestors** — already requested in `scheduler-view-mode-completeness.md:728-733`; the datatable does not need it (§5.5).
- **A shared `aria-expanded` ↔ `OverlayController` helper.** Seven components wire this by hand today, each slightly differently, one imperatively with a comment explaining why it must not drift (`mp-scheduler.ts:652-662`).

---

## 14. References

- Issue **#414**; driver [MintPlayer.Spark#431](https://github.com/MintPlayer/MintPlayer.Spark/issues/431)
- [overlay-controller-positioning.md](./overlay-controller-positioning.md) — the positioning half, incl. FR-14…FR-19 never shipped
- [shadow-adopted-content-styling.md](./shadow-adopted-content-styling.md), [consumer-styles-in-shadow.md](./consumer-styles-in-shadow.md) — the light tier and why `mp-datatable` has no shadow root
- [scheduler-view-mode-completeness.md](./scheduler-view-mode-completeness.md) §traps 1–4 — composed-scroll and fixed-containing-block
- [scheduler-compact-timeline-localization.md](./scheduler-compact-timeline-localization.md) §D3, §836-850 — sticky anchors and fixed panels
- `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts`
- `libs/mintplayer-web-components/overlay/src/overlay-controller.ts`
- `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
