# PRD: `<bs-datatable>` — unified spec

Tracks: [issue #306](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/306).

This document consolidates the three previously-separate datatable PRDs
into one canonical spec:

* `datatable-virtual-merge-and-selection.md` (folded `<bs-virtual-datatable>`
  into `<bs-datatable>`, added the unified `[fetch]` contract + selection +
  measure-once resizable columns) — shipped in master.
* `datatable-tree-mode.md` (nested expandable rows, lazy children,
  cascading selection, the `apps/api` backend) — shipped in PR #367.
* `future-virtual-datatable-column-fill.md` (CSS + spacer-cell narrow-
  container fill behaviour) — shipped against the **old** virtual-datatable
  package, which was deleted in the merge; see § Column fill (deferred).

All three are superseded by this document.

## Status

Every feature below is implemented and on master EXCEPT items called out
explicitly as **deferred** or **planned**.

## Overview

One `<bs-datatable>` component that scales from a flat in-memory grid to
a multi-thousand-row virtual-scrolled lazy-tree, under a single API:

1. **One component, four modes.** `<bs-datatable>` covers paginated,
   virtual-scrolled, paginated tree, and virtual + lazy tree — driven by
   two switches (`[virtualScroll]`, `[tree]`). The old separate
   `@mintplayer/ng-bootstrap/virtual-datatable` package is gone.
2. **One `[fetch]` contract.** A single async callback returns
   `PaginationResponse<T>`. The component owns *when* it's called
   (settings change in flat mode, viewport advance in virtual flat,
   row-expand in tree, viewport-revealed placeholder in virtual tree).
3. **Weighted virtual scroll.** Every row contributes `itemSize` to the
   scroll height whether it's a real row or a placeholder for a not-yet-
   loaded subtree. This lets the existing fixed-`itemSize` virtual
   scroll math handle tree expansion without variable-row-height
   complexity.
4. **Vidyano-style deselect-all.** No "select all" header checkbox. The
   header cell is empty when nothing is selected; renders a checked
   checkbox that clears the selection when ≥ 1 row is selected.
5. **Measure-once resizable columns.** After the first batch of rows
   lands, column widths are measured and *frozen*. Sort changes, page
   loads, and virtual-scroll row swaps don't re-measure. Users can drag
   the column-resize handle to override; double-click re-measures on
   demand.
6. **Framework-agnostic core.** Lit web component `<mp-datatable>` with
   hand-written Angular, React (via `@lit/react`), and Vue wrappers.

The previous broken state, captured here for posterity:

> *The user's report (this conversation):* "When later data-slices have
> items that require wider columns, the values are just capped using
> the ellipsis. Then users can still resize the columns themselves if
> necessary. … For some reason this doesn't seem to be the case
> anymore. The text is being wrapped now."

That regression was traced to commit `0f5c6fd4` — when `bs-datatable`
was refactored into a thin wrapper around the new Lit `<mp-datatable>`,
the Angular-side `runInitialAutoSize` / `measureWidths` /
`applyColumnWidth` / dblclick + keyboard handlers were deleted from the
wrapper and **never ported to the WC**. The WC's `_columnWidths` map
was write-only (only the resize-drag handler wrote; nothing populated
it from measurement), and the CSS had no `overflow: hidden` /
`text-overflow: ellipsis` on body cells. Fixed in commit `dc5d093d` by
porting the measure-once pass into the WC's `updated()` hook and
adding the ellipsis CSS — see § Resizable columns.

## Tech stack & constraints

* **Web component:** Lit 3, framework-agnostic. Lives at
  `libs/mintplayer-web-components/datatable/`. Per
  `feedback_wc_no_angular_imports`, no Angular imports inside this
  package.
* **Angular wrapper:** standalone, signal-based, zoneless-compatible.
  No RxJS for new state. Lives at
  `libs/mintplayer-ng-bootstrap/datatable/`.
* **React wrapper:** `@lit/react` `createComponent` + an `events` map.
  Lives at `libs/mintplayer-react-bootstrap/datatable/`. Hand-written
  per `feedback_hand_written_framework_wrappers`.
* **Vue wrapper:** SFC with `<script setup>` syncing JS-property props
  + bridging WC `CustomEvent`s to Vue `emit`. Lives at
  `libs/mintplayer-vue-bootstrap/datatable/`.
* **Bootstrap 5** + `--bs-*` CSS variables.
* **Backend** for demos: ASP.NET Core 10 minimal API at `apps/api/`,
  EF Core + SQLite, deterministic seed (see § Demo backend).

## Component API

### Inputs (scalars)

| Input | Type | Default | Purpose |
|---|---|---|---|
| `fetch` | `BsDatatableFetch<TData>` | required | Single data contract — branches on `parentId` for tree mode |
| `data` | `TData[] \| null` | `null` | Static in-memory data (mutually exclusive with `fetch`) |
| `virtualScroll` | `boolean` | `false` | Switch from paginated layout to a scroll-position-driven viewport |
| `itemSize` | `number` | `40` | Row height in px (required for virtual mode) |
| `virtualBuffer` | `number` | `10` | Off-screen row buffer per side in virtual mode |
| `pagination` | `boolean` | `true` | Show the pagination footer (auto-suppressed in tree mode) |
| `selectionMode` | `'none' \| 'single' \| 'multiple'` | `'none'` | Selection mode |
| `compareWith` | `(a, b) => boolean` | `Object.is` | Cross-fetch identity for selection |
| `rowKey` | `(row, index) => string` | `id`-based | Stable row identity for the selection set + virtualization |
| `resizableColumns` | `boolean` | `true` | Show the resize handle + run the auto-size pass |
| `isResponsive` | `boolean` | `false` | Forwarded responsive flag on the inner table |
| **Tree-mode inputs** | | | |
| `tree` | `boolean` | `false` | Enable tree mode (chevron column, nested expansion, lazy children) |
| `idKey` | `TreeIdKey<TData>` | `null` (req. when `tree`) | Property name or function for stable row identity |
| `childCountKey` | `string` | `null` (req. when `tree`) | Row property holding the direct-child count |
| `treeIndent` | `number` | `1.25` | Indent in rem per depth level on the chevron cell |
| `selectionStrategy` | `'flat' \| 'cascading'` | `'flat'` | Cascade parent selection to loaded descendants when in tree mode |

### Two-way models

* `selection: TData[]` — empty array means nothing selected.
* `settings: DatatableSettings` — page / perPage / sortColumns.
* `expandedIds: Set<unknown>` — keys of currently-expanded rows (tree mode).

### Outputs (CustomEvents on `<mp-datatable>`, surfaced as framework events)

| Event | Detail | When |
|---|---|---|
| `rowClick` / `rowDblClick` / `rowContextMenu` | `{ row, rowIndex, rowKey, originalEvent }` | Per-row gestures |
| `sortChange` | `{ sortColumns }` | Header click toggles sort |
| `selectionChange` | `{ selectedIds }` | Selection set mutated |
| `pageChange` / `perPageChange` | `{ page \| perPage }` | Pagination footer interaction |
| `rowExpand` / `rowCollapse` | `{ row, depth, parentId }` | Tree chevron toggled |
| `expandedIdsChange` | `{ expandedIds: Set }` | Two-way binding channel for `expandedIds` |
| `fetchRequest` | `{ parentId, page, perPage, sortColumns }` | WC needs data for a parent (tree, lazy children) |

### Row template (Angular)

```html
<ng-container *bsRowTemplate="let row; let depth = depth; let isPlaceholder = isPlaceholder">
  @if (isPlaceholder) {
    <td colspan="3">Loading…</td>
  } @else {
    <td>{{ row.name }}</td>
    <td>{{ row.code }}</td>
    <td>{{ row.headcount }}</td>
  }
</ng-container>
```

Context: `{ $implicit, index, depth, isExpanded, isPlaceholder }`. Flat
rows have `depth: 0`, `isExpanded: false`, `isPlaceholder: false`.

## Unified `[fetch]` contract

```typescript
// libs/mintplayer-ng-bootstrap/datatable/src/datatable-fetch.ts
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';

export interface BsDatatableFetchRequest extends PaginationRequest {
  /** undefined/null = root level; otherwise children of the row with that idKey. */
  parentId?: unknown;
}

export type BsDatatableFetch<T> =
  (req: BsDatatableFetchRequest) => Promise<PaginationResponse<T>>;
```

Existing consumer functions typed against the narrower `PaginationRequest`
keep working — function parameter contravariance accepts the wider input.

### Mode dispatch

The web component **owns the entire server-fetch loop** behind a single
`fetch` callback (`el.fetch = (req) => Promise<{ data, totalRecords }>`). It
calls the callback itself — for page 1, each window, and each tree child —
derives `totalRecords` from the response, and re-renders. There is no event /
`setFetchResponse` bridge and no consumer-set `totalRecords`. Framework wrappers
just forward `el.fetch`; a vanilla/Rollup consumer sets it directly.

| Mode | Trigger | Behaviour |
|---|---|---|
| **Paginated** | default | WC calls `fetch({ parentId: null, page, perPage, sortColumns })` per page; the footer drives page changes. |
| **Virtual flat** | `[virtualScroll]="true"` | WC fetches page 1, then each root page on demand as its placeholder rows enter the viewport (`_pageCache`); scroll region sized from `totalRecords`. |
| **Paginated tree** | `[tree]="true"` | Root page fetch; one child fetch per parent on expand. |
| **Virtual tree + lazy** | `[tree]` + `[virtualScroll]` | Root windowing (as flat) **and** child fetch on expand / when a child placeholder enters the viewport. |

`parentId === null` is a root window (flat rows or the tree top level); a
non-null `parentId` is a node's children — the WC branches on it internally.
A generation token drops responses that resolve after an invalidation, and
sort/perPage/page changes are coalesced so two-way-binding echoes don't
double-fetch.

## Virtual scroll — weighted-rows model

Every row contributes the same `itemSize` to virtual height, whether
real or placeholder. `getFlatList()` walks the loaded forest once per
render and produces `FlatVisibleRow[]` driven by `_data`, `_expandedIds`,
and `_childCache`. When a parent is expanded but its children aren't
loaded, the flatten emits `childCount` placeholder rows so the scrollbar
reflects the expected expanded height immediately — no jump on load.

`refreshVirtualRange()`:

```
start = max(0, floor(scrollTop / itemSize) - buffer)
end   = min(total, start + ceil(viewport / itemSize) + 2*buffer)
visible = flatList.slice(start, end)
```

Total = `flatList.length` in both modes (flat or tree); the only change
when `tree=true` is the source of the flat list.

**Post-render refresh** (commit `911575f3`). `refreshVirtualRange` was
only firing on `scroll` events and from the ResizeObserver. Setting
`data` after first render — the typical case for any fetch-driven mode
— left the range at the initial `{ startIndex: 0, endIndex: 0 }` and
`computeVisibleRows` produced `flatList.slice(0, 0) === []`. Flat virtual
mode worked by accident because the demo toggles into it via a select
(firing layout events ResizeObserver catches). Tree mode mounted with
`virtualScroll=true` and exposed the bug as "empty body, tall scrollbar."

Fix: a Lit `updated()` hook calls `refreshVirtualRange()` after every
render. `refreshVirtualRange` already guards on whether
`startIndex/endIndex` actually changed before calling `requestUpdate`, so
the post-render call can't loop.

## Tree mode

### Rendering

* Chevron column hard-coded leftmost when `tree=true`. Plain `<button
  class="tree-chevron">` so it's keyboard-focusable with proper
  `aria-expanded` / `aria-controls`.
* Depth-based padding on the chevron cell *only* — user columns stay
  aligned across depths. Indent = `depth * treeIndent` rem.
* Placeholder rows: `data-placeholder="true"`, render `<td colspan>
  Loading…` by default; the consumer's `*bsRowTemplate` sees
  `isPlaceholder: true` and can opt into a custom placeholder.
* `role="treegrid"` on the inner `<table>` when `tree=true`. Rows get
  `aria-level`, `aria-expanded`, `aria-busy` (on placeholders).

### Keyboard

| Key | Effect |
|---|---|
| `ArrowRight` | Expand a collapsed row with children |
| `ArrowLeft` | Collapse an expanded row |
| `Enter` / `Space` | Toggle |

### Lazy children — wire protocol

1. User clicks a chevron OR a child placeholder enters the viewport.
2. WC calls its `fetch` callback directly with `{ parentId, page: 1,
   perPage, sortColumns }` (a non-null `parentId`).
3. WC populates `_childCache[parentId]` + `_childTotals[parentId]` and
   re-renders. Placeholders replaced with real rows.

Cache invalidation: a sort/perPage change bumps the WC's fetch-generation
token and clears the caches (roots + children), then reloads page 1.
Server-side sort applies within siblings only. (There is no consumer-side
bridge: the WC owns the call and the cache.)

### Demo backend

`apps/api/` ASP.NET Core 10 minimal API + EF Core + SQLite. Two GET
endpoints used by tree mode:

```
GET /api/treeItems?page=&perPage=&sort=name:asc       → roots
GET /api/treeItems/{parentId}/children?page=&perPage= → direct children
```

Response envelope is `PagedResult<T> { items, totalCount, page,
pageSize }`. The Angular/React/Vue services map to the
`PaginationResponse<T>` shape (`data / totalRecords / totalPages /
page / perPage`) at the client boundary.

Seed (`apps/api/Data/DemoSeed.cs::SeedTreeItemsAsync`): deterministic
`Random(99)`, 4 levels, ~30 k rows. 50 roots, 10-25 departments per
root, 3-10 teams per department, 0-8 members per team. The `0-8` lets
some L2 nodes be leaves, giving the demo a realistic mix.

## Selection — Vidyano deselect-all + cascading

### Visual contract

| State | Per-row cell | Header cell |
|---|---|---|
| `selection().length === 0` | unchecked | **empty** — no checkbox rendered |
| `selection().length >= 1` | reflects per-row state | **checked** checkbox; toggling clears selection |

There is no "select all" affordance. The WC can't know about rows
outside the current virtual window / pagination slice, so a true
select-all would be misleading. The deselect-all is the only one-click
shortcut offered.

### Cascading (tree mode)

When `selectionStrategy="cascading"`:

* Checking a parent → adds parent + all currently-loaded descendants to
  the selection set.
* Unchecking a parent → removes parent + all currently-loaded
  descendants.
* Loaded-only semantics — not-yet-fetched subtrees are out of scope;
  loading them later doesn't auto-select. Documented as the deliberate
  choice in the demo.
* Indeterminate state — computed from the loaded subtree. Some-but-
  not-all selected descendants → tri-state parent checkbox.

### Identity across pages / fetches

The same record refetched as a different object would lose its selection
via reference equality. We use the consumer-supplied `compareWith`:

```ts
isSelected(row) = selection().some(s => compareWith(s, row))
```

Required when `selectable !== 'none'`. The component does not infer an
id key — that's an explicit contract.

## Resizable columns — measure-once

### Lifecycle

| State | Entered when | Width source |
|---|---|---|
| **Pristine** | Component mounted, no rows yet | Natural — `table-layout: auto` |
| **Auto-sized** | First non-placeholder row in DOM | `max(header content, every visible td content)` via the header's `getBoundingClientRect().width` while the table is still in auto layout |
| **User-locked** | User drags the resize handle | Pixel value from the drag |

Transitions are one-way. **Once Auto-sized or User-locked, content-
driven re-measurement never runs again.** Sort changes, page loads,
and virtual-scroll row swaps don't shift widths. Wider content in
later rows clips with ellipsis.

### Implementation (commit `dc5d093d`)

* `_columnWidths: Map<string, number>` — keyed by column name. `has(name)`
  is the lock test.
* `_hasMeasuredInitial: boolean` — flag, flips after the first successful
  measurement pass.
* `maybeMeasureInitialColumnWidths()` runs from Lit's `updated()`
  lifecycle. Idempotent (gated on `_hasMeasuredInitial`). Skips columns
  with explicit `col.width` (pins to that value) or an existing entry
  in `_columnWidths` (preserves user-drag-set widths).
* Measurement waits for at least one non-placeholder body row to land —
  placeholders are short-text and would yield artificially narrow
  columns.
* CSS: `tbody td { white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; }` applies in both flat and tree modes.
  `table.measured { table-layout: fixed; }` flips on after the first
  pass.

### Drag — pointer events with capture

`pointerdown` on the handle stops propagation so the `<th>`'s sort
handler doesn't fire. Pointer move updates `_columnWidths`; pointer up
releases capture.

**No adjacent-column compensation.** Resizing column X grows or shrinks
the total table width; neighbours stay at their own widths. One column,
one delta.

### Keyboard / dblclick (deferred)

The handle is focusable (`tabindex="0"`). The original PRD specified:

* `ArrowLeft` / `ArrowRight` → ±10 px; `Shift` → ±1 px
* `Home` → re-fit to content
* `dblclick` → re-fit to content

These handlers existed in the Angular wrapper before the WC merge and
were lost. They are **not currently in the WC**. Restoring them is a
follow-up — they're nice-to-have on top of the now-working
measure-once + drag.

## Column fill (deferred)

The narrow-container fill behaviour from the original
`future-virtual-datatable-column-fill.md` (CSS + trailing
`.bs-datatable-spacer` cell under `table-layout: fixed`) was shipped on
the **old** `<bs-virtual-datatable>` component and was lost when that
package was deleted in the merge. The current `<mp-datatable>` has no
spacer cell and no `min-width: 100%` rule, so a table whose measured
columns sum to less than the container leaves trailing whitespace.

This is an intentionally-acknowledged regression of the older
behaviour. Restoring it cleanly under the new measure-once model
(adding a `<td class="bs-datatable-spacer" aria-hidden="true">` per
row + `table.measured { width: max-content; min-width: 100%; }`) is a
follow-up. It has no impact on the measure-once + ellipsis behaviour
shipped in `dc5d093d`.

## Framework wrappers

### Angular (`bs-datatable`)

Signal-based, OnPush. Bridges between `*bsRowTemplate` directive content
and the WC's `rowRenderer` callback via `EmbeddedViewRef` recycling per
`rowKey`. Effects sync inputs to WC properties; event handlers re-emit
WC `CustomEvent`s as Angular outputs.

Tree-mode-specific:

* `effect` for the fetch callback — branches on `tree()` to do a
  single root fetch in tree mode (instead of the drain-all-pages path
  used by virtual flat mode).
* `setsEqual()` guard in the `expandedIds` two-way binding to prevent
  echo loops when the WC emits an `expanded-ids-change` event.
* `BsRowTemplateContext` extended with `depth`, `isExpanded`,
  `isPlaceholder`. `buildRowRenderer` propagates the context to the
  `EmbeddedView` and uses a synthetic key for placeholder slots so
  the same view is reused across child-pagination.

### React (`BsDatatable`)

`@lit/react` `createComponent` with an `events` map mapping each
`mp-datatable-*` CustomEvent to an `on*` prop. Tree-mode props
(`tree`, `idKey`, `childCountKey`, `treeIndent`, `expandedIds`,
`selectionStrategy`) round-trip automatically via the
`createComponent` property-forwarding path — no explicit
declarations needed.

Consumer pattern — one `fetch` callback drives everything (roots, windows,
children); branch on `req.parentId`:

```tsx
const fetchData = useCallback(
  async (req: DatatableFetchRequest): Promise<DatatableFetchResponse<Row>> => {
    const r = await api.list(req.parentId, req.page, req.perPage, req.sortColumns);
    return { data: r.items, totalRecords: r.totalCount };
  }, []);
// <BsDatatable fetch={fetchData} ... />  — selected rows arrive on onSelectionChange's detail.selectedRows
```

### Vue (`BsDatatable.vue`)

`<script setup>` syncing JS-property props (arrays, Sets, functions —
including `fetch` — can't ride attributes). Adds `addEventListener` per
CustomEvent → `emit('camelCase', detail)`. Exposes only `el` via
`defineExpose` (the WC owns the fetch loop, so there are no imperative
fetch methods to expose).

`v-model:expandedIds` and `v-model:selectedIds` are supported via the
matching `update:` emits.

## Implementation file map

```
libs/mintplayer-web-components/datatable/
├── src/
│   ├── components/mp-datatable.ts        # the WC (flat + tree)
│   ├── styles/datatable.styles.scss      # source styles
│   ├── styles/datatable.styles.ts        # auto-generated by codegen-wc (gitignored)
│   ├── types/
│   │   ├── column-def.ts                 # column / row-renderer types
│   │   ├── tree.ts                       # tree-mode event detail types
│   │   └── index.ts                      # public type re-exports
│   ├── sort/                             # pure sort helpers + unit tests
│   └── index.ts                          # public WC barrel

libs/mintplayer-ng-bootstrap/datatable/
├── src/
│   ├── datatable/datatable.component.{ts,html,scss}
│   ├── datatable-fetch.ts                # BsDatatableFetchRequest with parentId
│   ├── datatable-settings.ts             # internal settings model
│   ├── datatable-column/datatable-column.directive.ts
│   └── row-template/row-template.directive.ts  # BsRowTemplateContext + tree fields

libs/mintplayer-react-bootstrap/datatable/src/BsDatatable.tsx
libs/mintplayer-vue-bootstrap/datatable/src/BsDatatable.vue

apps/api/
├── Models/TreeItem.cs
├── Controllers/TreeItemsController.cs
├── Data/DemoDbContext.cs                 # + TreeItems DbSet + self-ref FK
└── Data/DemoSeed.cs                      # + SeedTreeItemsAsync

apps/ng-bootstrap-demo/src/app/
├── entities/tree-item.ts
├── services/tree-item/tree-item.service.ts
└── pages/enterprise/datatables/          # Tree-mode demo section

apps/react-bootstrap-demo/src/app/pages/DatatablePage.tsx
apps/vue-bootstrap-demo/src/views/DatatableView.vue

apps/ng-bootstrap-demo-e2e/e2e/
├── datatable-virtual.spec.ts             # flat virtual scroll E2E
└── datatable-tree.spec.ts                # tree-mode E2E
```

## Testing

Coverage today:

* **WC unit (Lit / vitest)**: pure sort helpers (`compute-next-sort.spec.ts`).
* **Playwright E2E (Angular demo)**:
  * `datatable-virtual.spec.ts` — virtual mode preloads pages, paginates,
    toggles modes.
  * `datatable-tree.spec.ts` — root rendering, single expand, deep
    expand, collapse, cache-hit on re-expand, `role="treegrid"`.

Not yet covered (follow-ups):

* WC unit tests for `getFlatList` (placeholder math, idempotent
  expand-collapse) — currently exercised end-to-end by the E2E spec.
* WC unit tests for cascading selection (parent toggle, indeterminate
  computed).
* Playwright spec for the measure-once + ellipsis behaviour (assert
  `table.measured` + `text-overflow: ellipsis` apply on first batch;
  assert a wider row scrolled into view does NOT shift column width).

## Out of scope / future

* **Column fill** in narrow-container mode — see § Column fill (deferred).
* **Resize-handle keyboard + dblclick re-fit** — see § Resizable columns,
  Keyboard / dblclick (deferred).
* **Drag-to-reorder rows or columns.**
* **Multi-column tree (TreeTable layout)** — PrimeNG's `<p-treeTable>`-
  style "tree of columns" layout. Not our row-tree.
* **Sort across the whole tree** (vs sort within siblings). Siblings-
  only is the simpler, more useful model for org / category trees.
* **Logical (subtree) selection** — when a parent's not-yet-loaded
  subtree should count as selected, with descendants materialized as
  needed. Significantly more complex; left for a future iteration.
* **Variable-height rows.** The weighted-rows model removes the need
  for this; not planned.
* **Server-driven expansion state** (server pre-marks rows expanded).
  Consumer can seed `expandedIds` on init; auto-expansion via DTO is
  not in scope.
* **Filter / search inputs on `BsDatatableFetchRequest`.** Add when a
  real consumer needs them.

## Verification notes

* PrimeNG was surveyed during the tree-mode design phase. Their
  documented `<p-table>` has multiple open issues for row expansion +
  virtual scroll (`primefaces/primeng#16438`, `#9008`, `#9799`,
  `#16631`); they never solved variable-height virtual scroll, which
  is the constraint our weighted-rows model sidesteps. The locally-
  cloned `C:\Repos\prime\{primeng,primereact,primevue,primeuix}`
  repos are available for source-level checks if specific behaviours
  need confirmation during follow-up work.
* The primeuix layer is theming-only — no shared virtual-scroller or
  tree-state primitive exists upstream — so there's nothing to inherit
  there architecturally.
