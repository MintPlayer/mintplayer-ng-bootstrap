# PRD: Unified `<bs-datatable>` — virtualScroll + selection

Tracks: [issue #306](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/306).
Supersedes the broader draft on PR #314 — tree mode and the new ASP.NET Core demo backend are deferred to a follow-up PRD; the checkbox-selection model is kept and the unified `[fetch]` contract simplifies to the non-tree shape.

## Overview

One `<bs-datatable>` component with a `[virtualScroll]` switch, one data-source contract (`[fetch]`), one selection model, columns the user can resize.

1. **Merge `<bs-virtual-datatable>` into `<bs-datatable>`** and delete the `@mintplayer/ng-bootstrap/virtual-datatable` package. The two share ~80% of their code today (column directive, sort base, settings model, sort UI). Folding them is the single biggest code reduction in this PRD.
2. **One `[fetch]` contract** replaces both `[(data)]` and `[dataSource]`. `fetch` is an **input** — the consumer provides a callback; the component owns *when* to call it (page change, sort change, viewport advance in virtual mode).
3. **Deselect-all-only checkbox selection**. No "select all" header checkbox; instead, the header cell shows a single checkbox **only when ≥1 row is selected**, rendered already-checked, and clicking it **deselects everything**.
4. **Selection survives pagination and virtual-scroll churn**. Selected items are stored as objects (not just ids), compared by a consumer-supplied `[compareWith]` function so cross-page-fetch object identity isn't required.
5. **Measure-once resizable columns**. After the first batch of rows lands, every column gets a width measured from its visible content. Those widths *freeze*: pagination, sort changes, and virtual-scroll row swaps no longer touch them. The user drags a 6px handle at the right edge of any column header to override; the user-set width replaces the auto-measured one and survives the rest of the component's lifetime.

Backwards compatibility is not a requirement. `[(data)]` and `[dataSource]` are removed in favor of `[fetch]`. Document the migration; do not carry shims.

## Tech stack & constraints

- Angular standalone, signal-based, zoneless-compatible. No RxJS for new state.
- `@angular/cdk/scrolling` for virtual viewport.
- Bootstrap 5 + `--bs-*` CSS variables.

## Out of scope (deferred)

- **Tree mode** (chevron column, lazy children, `childCount`-driven virtual height reservation) — separate PRD.
- **`apps/api/` ASP.NET Core demo backend** — separate PRD/effort. Existing demo services (`ArtistService` → `mintplayer.com`) continue unchanged.
- Filter/search inputs on `BsDatatableFetchRequest` — add when needed.
- Drag-to-reorder rows.

## Unified `[fetch]` contract

```typescript
interface BsDatatableFetchRequest {
  page: number;
  perPage: number;
  sortColumns: SortColumn[];
}

interface BsDatatableFetchResponse<T> {
  data: T[];
  totalRecords: number;
  totalPages: number;
}

type BsDatatableFetch<T> =
  (req: BsDatatableFetchRequest) => Promise<BsDatatableFetchResponse<T>>;
```

Single input replaces both prior data inputs:

```typescript
fetch = input.required<BsDatatableFetch<TData>>();
```

Mode dispatch:

| Mode | Trigger | Behavior |
|---|---|---|
| Paginated | default | One fetch per settings change (page/perPage/sort). |
| Virtual flat | `[virtualScroll]="true"` | Page cache + viewport-driven fetch. Pages are fetched lazily as the viewport advances; the cache survives sort changes only by invalidation. |

The component owns request batching, sort/page-change debouncing, and the viewport→page mapping in virtual mode.

## Component API

| Input | Type | Default | Purpose |
|---|---|---|---|
| `fetch` | `BsDatatableFetch<TData>` | required | Single data contract |
| `virtualScroll` | `boolean` | `false` | Switch from paginated layout to a CDK virtual viewport |
| `itemSize` | `number` | `48` | Row height in px (required for virtual mode) |
| `selectable` | `'none' \| 'single' \| 'multiple'` | `'none'` | Selection mode. `'none'` hides checkboxes entirely. |
| `compareWith` | `(a: TData, b: TData) => boolean` | `Object.is` | Cross-fetch identity for selection. Required when `selectable !== 'none'`. |
| `resizableColumns` | `boolean` | `true` | Render the per-column resize handle. Set false to opt out (also disables the auto-size-once flow described below). |
| `minColumnWidth` | `number` | `40` | px floor for the drag clamp and the keyboard-resize floor. |
| `isResponsive` | `boolean` | `false` | Forwarded to `<bs-table>` |

Two-way model:
- `selection: TData[]` — empty array means nothing selected.

Outputs:
- `selectionChange: TData[]` (via `model()`).

Row template:
- `*bsRowTemplate` with context `{ $implicit: TData | undefined }`. The `$implicit` is `undefined` for placeholder rows in virtual mode (rows whose page isn't loaded yet). The `bsVirtualRowTemplate` directive is removed.

## Selection — deselect-all-only header

### Visual contract

Per-row and header cells render `<bs-toggle-button type="checkbox">` (not bare `<input type="checkbox">`) so the control inherits the project's Bootstrap-themed check style.

| State | Per-row cell | Header cell |
|---|---|---|
| `selection().length === 0` | unchecked toggle | **empty** — no toggle rendered |
| `selection().length >= 1` | toggle reflects per-row state | **checked** toggle; toggling it off sets `selection([])` |

There is **no** "select all" affordance. The header toggle's only function is "clear the entire selection in one click." It is always rendered in the checked state when visible, regardless of how many rows are selected; toggling it off (or any change event) routes through the deselect-all handler.

### Identity across pages

Switching pages (or scrolling in virtual mode) refetches rows. Even when the same record is returned, it may be a *different object reference* with potentially updated property values. Reference equality fails; we use the consumer-supplied `compareWith`:

```typescript
isSelected(row) = selection().some(s => compareWith(s, row))
```

When a row is checked, the row object as currently fetched is appended to `selection()` (replacing any prior copy under the same identity). When unchecked, any entry where `compareWith(entry, row)` is true is removed. The consumer reads `selection()` to get the most-recently-seen object per identity.

`compareWith` is **required** when `selectable !== 'none'`. The component does not provide a default that infers an id key — that's an implicit contract the consumer should make explicit.

### Mode interaction

- `selectable='single'`: per-row checkboxes are rendered as radios; checking one row replaces `selection()` with `[row]`; the deselect-all header is still functional (it sets `selection([])`). One could argue the deselect-all UI is unnecessary in single mode, but the contract is uniform.
- `selectable='multiple'`: per-row checkboxes; deselect-all header on `≥1` selected. This is the canonical case.
- `selectable='none'`: no checkbox column. `selection` is ignored.

## Resizable columns — measure-once

This replaces the current `setupColumnWidthSync` "only grows, never shrinks" maxWidths accumulator. The new model has three explicit states per column.

### Lifecycle

| State | Entered when | Width source |
|---|---|---|
| **Pristine** | Component mounted, no rows yet | Natural — browser's `table-layout: auto` |
| **Auto-sized** | First non-empty batch renders | Measured: `max(header content, every visible row's content for that column)` |
| **User-locked** | User drags a resize handle | Pixel value from the last drag |

Transitions are one-way: `Pristine → Auto-sized → User-locked`. **Once a column is Auto-sized or User-locked, content-driven re-measurement never runs again** — subsequent page loads, sort changes, and virtual-scroll row swaps don't change the column's width. That's the core promise.

The existing `maxWidths[]` accumulator and the MutationObserver-driven re-measure loop in `setupColumnWidthSync` are removed. Replaced with a single measure-once + apply pass on the first row-mount mutation (in virtual mode) or the first response render (in paginated mode).

### Storage

```ts
// Source of truth. Empty until the first batch measures.
private columnWidths = signal<Map<string, number>>(new Map());
```

Key is `BsDatatableColumnDirective.name()`, not column position. Position is fragile against column reorder; name is stable. `columnWidths().has(name)` is the lock test — any column in the map is locked.

### Initial auto-sizing

On the first row-mount mutation (virtual mode) or the first `response()` write (paginated mode):

1. For each column not already in `columnWidths()`, measure `max(headerCell.offsetWidth, ...all visible td.offsetWidth)` using the existing `width: max-content !important` trick to bypass Bootstrap's `width: 100%`.
2. Write each measured pixel value into `columnWidths.set(name, w)`.
3. Apply by writing `style.minWidth` on the matching `<th>` and every visible body `<td>` for that column.
4. Disconnect the MutationObserver (or short-circuit its callback once every column has a width in the map). New rows in later batches inherit the established widths from `table-layout: auto` without further DOM writes.

### Resize handle markup

A 6px-wide vertical handle absolutely positioned at the right edge of each `<th>`:

```html
<th class="text-nowrap" ...>
  <ng-container *ngTemplateOutlet="column.templateRef"></ng-container>
  @if (resizableColumns()) {
    <div class="bs-datatable-resize-handle"
         role="separator"
         aria-orientation="vertical"
         [attr.aria-label]="'Resize column ' + column.name()"
         [attr.aria-valuenow]="columnWidths().get(column.name())"
         [attr.aria-valuemin]="minColumnWidth()"
         tabindex="0"
         (pointerdown)="onResizeHandlePointerDown($event, column)"
         (dblclick)="onResizeHandleDoubleClick($event, column)"
         (keydown)="onResizeHandleKeydown($event, column)"></div>
  }
</th>
```

SCSS:

```scss
.bs-datatable-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  user-select: none;
  touch-action: none; // immutable from touchstart on; must be static, not dynamic
  &:hover, &:focus-visible { background: var(--bs-primary-bg-subtle); }
}
```

### Drag gesture

Pointer events, with capture. `pointerdown` stops propagation so the underlying `<th>`'s `(click)` sort handler doesn't fire:

```ts
onResizeHandlePointerDown(event: PointerEvent, column: BsDatatableColumnDirective) {
  event.stopPropagation();
  // Do NOT preventDefault on touch pointerdown — see feedback_pointerdown_preventdefault.
  const handle = event.target as HTMLElement;
  handle.setPointerCapture(event.pointerId);
  const startX = event.clientX;
  const name = column.name();
  const startWidth = this.columnWidths().get(name)
    ?? this.measureColumnWidth(name);

  const onMove = (e: PointerEvent) => {
    const w = Math.max(this.minColumnWidth(), startWidth + (e.clientX - startX));
    this.setColumnWidth(name, w);
  };
  const onEnd = () => {
    handle.releasePointerCapture(event.pointerId);
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onEnd);
    handle.removeEventListener('pointercancel', onEnd);
  };
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onEnd);
  handle.addEventListener('pointercancel', onEnd);
}
```

`setColumnWidth(name, w)` writes the new width into the signal and rAF-schedules an apply that updates the inline `minWidth` on that column's `<th>` and every visible body `<td>`. Only one column is touched per drag frame.

**No adjacent-column compensation.** Resizing column X grows or shrinks the total table width; neighbours stay at their own widths. Keeps the math trivial — one column, one delta.

### Keyboard

The handle is focusable with `tabindex="0"`. The keyboard contract:

- `ArrowLeft` / `ArrowRight` → ±10px
- `Shift + ArrowLeft` / `Shift + ArrowRight` → ±1px
- `Enter` / `Space` → no-op (no toggle semantics)

`aria-valuenow` reflects the live pixel width; `aria-valuemin = minColumnWidth()`; no `aria-valuemax` because the table has no hard ceiling.

### Double-click to fit

`dblclick` on the resize handle re-measures the column from its currently visible content and pins the result:

```ts
onResizeHandleDoubleClick(event: MouseEvent, column: BsDatatableColumnDirective) {
  event.stopPropagation();
  const w = Math.max(this.minColumnWidth(), this.measureColumnWidth(column.name()));
  this.setColumnWidth(column.name(), w);
}
```

`measureColumnWidth(name)` is the same helper used during initial auto-sizing — measures `max(header content, every visible td content)` using the `width: max-content !important` trick to bypass Bootstrap's `width: 100%`. The column transitions to (or stays in) **User-locked**; subsequent batch loads still don't re-measure.

In virtual mode the measurement only considers what's in the rendered range — fitting to the current scroll window. Double-clicking after scrolling can yield a different width if the new viewport's content is wider or narrower; that's intended.

The handle also gets a keyboard equivalent so it isn't pointer-only:

- `Home` → fit (same path as `dblclick`)

Keyboard contract for the handle is now:

| Key | Effect |
|---|---|
| `ArrowLeft` / `ArrowRight` | ±10px |
| `Shift + ArrowLeft` / `Shift + ArrowRight` | ±1px |
| `Home` | Fit to current visible content |
| `Enter` / `Space` | no-op |

### Sort interaction

The sortable `<th>` has `(click)`, `(mousedown)`, `(keydown.enter)`, `(keydown.space)`. The resize handle is a child element of the `<th>`. Two isolators keep the gestures separate:

1. `event.stopPropagation()` inside the handle's `pointerdown` and `keydown` handlers so neither bubbles to the `<th>`.
2. The handle is positioned `absolute; right: 0` — outside the typical click target zone for sorting.

### Out of scope

- Persistence beyond the component lifetime (localStorage, profile save). Defer until a real consumer needs it.
- Drag-to-reorder columns. Separate feature, separate gesture.
- Per-column min-width input (`column.minWidth`). One global `minColumnWidth` is enough for v1.

## Implementation outline

### Files

```
libs/mintplayer-ng-bootstrap/datatable/
├── src/
│   ├── datatable/datatable.component.{ts,html,scss}     # EDIT — add virtualScroll, [fetch], selection
│   ├── datatable-fetch.ts                                # NEW — request/response types + Fetch type alias
│   ├── datatable-settings.ts                             # KEEP — internal state
│   ├── datatable-sort-base.ts                            # KEEP — shared base
│   ├── _datatable-sort.scss                              # KEEP — shared SCSS partial
│   ├── datatable-column/datatable-column.directive.ts    # KEEP
│   └── row-template/row-template.directive.ts            # EDIT — context type covers placeholder rows

libs/mintplayer-ng-bootstrap/virtual-datatable/  # DELETE — the entire package
```

### Implementation order

1. **Type contract** — add `BsDatatableFetchRequest` / `BsDatatableFetchResponse` / `BsDatatableFetch<T>` to `datatable-fetch.ts`. Export from the datatable barrel.
2. **`[fetch]` plumbing** — replace `data = model<PaginationResponse<TData>>()` with `fetch = input.required<BsDatatableFetch<TData>>()`. An effect (or computed) builds a `BsDatatableFetchRequest` from `settings()` and calls `fetch()`, storing the response in an internal signal.
3. **Virtual mode** — when `virtualScroll()` is true, render `<cdk-virtual-scroll-viewport [itemSize]>` instead of the paged table body. Use a thin internal data source (no public API — folded into the component) that requests pages on demand from the same `fetch` callback. Move the existing `setupScrollSync` and `setupColumnWidthSync` helpers from `BsVirtualDatatableComponent` into the merged component, activated only when `virtualScroll()` is true.
4. **Selection** — new `selection = model<TData[]>([])`, `selectable`, `compareWith`. Header cell renders the deselect-all checkbox per the visual contract above; per-row cell drives `add`/`remove` against `selection()` using `compareWith`.
5. **Demo** — `apps/ng-bootstrap-demo/.../datatables.component.{ts,html}` is rewritten as a single `<bs-datatable [fetch] [virtualScroll] [selectable] [compareWith] [(selection)]>` plus a `<bs-select>` toggle that flips between paginated and virtual modes. Both pull from the existing `ArtistService` wrapped in a fetch callback.
6. **Delete** — remove the `virtual-datatable` library entry: `libs/mintplayer-ng-bootstrap/virtual-datatable/`, the `@mintplayer/ng-bootstrap/virtual-datatable` package export, all imports.
7. **Tests** — port the relevant `virtual-datatable.aria.spec.ts` cases under the unified component's spec file. Drop tests that only verified the existence of the now-deleted directive (`bs-virtual-row-template`).

## Testing

- Paginated mode (existing behavior): page / perPage / sort changes call `fetch` with the right request and render the response.
- Virtual mode: scrolling triggers page fetches; column widths sync between header and body; scroll position survives `reset()`.
- Selection: checking a row appends to `selection()`; unchecking removes via `compareWith`; switching pages (or scrolling) doesn't lose selection of unseen rows.
- Header checkbox: hidden when `selection().length === 0`; visible & checked when ≥1; clicking it sets `selection([])`.
- ARIA: `[role=grid]`, `aria-rowcount` reflects `totalRecords`, `aria-rowindex` set on visible rows (virtual mode reuses the existing `BsVirtualDatatable.totalRowCount`/`aria-rowindex` logic moved into the merged component).
- Visual: existing `nx test mintplayer-ng-bootstrap` and `nx e2e ng-bootstrap-demo-e2e` pass after demo migration.

## Migration notes for consumers

| Before | After |
|---|---|
| `<bs-datatable [(data)]="response">` | `<bs-datatable [fetch]="fetchFn">` |
| `<bs-virtual-datatable [dataSource]="ds" [itemSize]="48">` | `<bs-datatable [virtualScroll]="true" [itemSize]="48" [fetch]="fetchFn">` |
| `*bsVirtualRowTemplate="let row"` | `*bsRowTemplate="let row"` (same directive name as the paginated mode) |
| Manual `VirtualDatatableDataSource<T>` subclass | Plain `(req) => fetch(req).then(...)` callback |

The `fetch` callback shape is the smallest superset of what the previous two contracts demanded — page+sort were always available; `totalRecords` + `totalPages` replace the `PaginationResponse` envelope and the manual `dataSource.length$` signal.
