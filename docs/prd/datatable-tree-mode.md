# PRD: Datatable tree-mode — nested expandable rows + cascading selection

Tracks: [issue #306](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/306).
Builds on: [`docs/prd/datatable-virtual-merge-and-selection.md`](./datatable-virtual-merge-and-selection.md) — the unified `[fetch]` contract, the `[virtualScroll]` switch, and the deselect-all-only selection model are foundations this PRD extends. Resurrects the tree-mode + cascading-selection scope deferred from that PRD.

## Overview

Add nested / expandable rows to `<bs-datatable>` (and `<mp-datatable>` underneath), composable with virtual scrolling and lazy child fetching.

1. **Weighted-virtual-scroll model**: every loaded row contributes exactly **1** row to the virtual count when collapsed, and **`1 + sum(descendant weights)`** when expanded. Children are rendered as same-shape sibling rows with depth-based indentation — every row keeps the same `itemSize`. Virtual scroll math stays identical to today's flat model; the only change is that "data" is the flattened expansion of the tree, not the raw array.
2. **Lazy children**: when `[tree]="true"`, the existing `[fetch]` callback gains an optional `parentId` argument. The component fires `fetch({ parentId: row[idKey], page: 1, perPage, sortColumns })` the first time a row is expanded; results are cached and re-used on collapse/expand cycles.
3. **`childCount` reserves space**: every row carries `row[childCountKey]` (direct children — not total descendants). When a parent is expanded but its children aren't loaded yet, the viewport reserves `childCount` placeholder rows of vertical space so the scrollbar stays accurate and the layout doesn't jump on load. `childCount > 0` also drives chevron visibility (no separate `hasChildrenKey`).
4. **Cascading checkbox selection**: checking a parent selects parent + all *currently-loaded* descendants; unchecking does the inverse. Loaded descendants of an unloaded ancestor are reachable through normal tree-walking; not-yet-loaded subtrees are out of selection scope by design (loading them later doesn't auto-select).
5. **Vidyano-style deselect-all header**: no "select all". When `selection.length === 0` the header checkbox cell is empty. When ≥1 row is selected, the header renders a checked checkbox; clicking it clears the entire selection. (This rule already shipped in the virtual-merge-and-selection PRD — tree-mode just inherits it.)
6. **Backend**: extend `apps/api` (ASP.NET Core + EF Core SQLite) with a new `TreeItem` entity, a deterministic seed generator, and `TreeItemsController` exposing two `GET` endpoints (`/api/treeItems` for roots; `/api/treeItems/{id}/children` for children of any item — root or nested). No JSON file storage; we follow the existing `DemoSeed.cs` pattern.
7. **Demos**: new "Tree mode (expandable rows)" example on the datatables demo page in all three demo apps (Angular, React, Vue), live-demo-before-snippet per repo convention.

Backwards compatibility is not a constraint. The `BsDatatableFetch<T>` signature widens to accept an optional `parentId`; callers without tree-mode are unaffected (the field is unread).

## Tech stack & constraints

- Lit 3 web component + Angular signal-based wrapper + React (`@lit/react`) and Vue (`<script setup>`) wrappers. New WC code is framework-agnostic (no Angular imports in `libs/mintplayer-web-components/**`).
- Fixed `itemSize` virtual scrolling (existing mechanism). No variable-height support — the weighted-row model is what removes the need for it.
- Bootstrap 5 + `--bs-*` CSS variables for the chevron and indent.
- ASP.NET Core 10 minimal-API style backend (already in place at `apps/api`).
- Computed signals over inline template expressions; no `forEach` / imperative loops in TypeScript.

## The weighted-virtual-scroll model

Today's virtual scroll math (`mp-datatable.ts:367-381`):
```
start = floor(scrollTop / itemSize) - buffer
end   = start + ceil(viewportHeight / itemSize) + 2*buffer
visible = effectiveData.slice(start, end)
```
This works because `effectiveData` is a flat array where index ⇄ y-offset.

Tree-mode keeps the same formula. The change is upstream: instead of `effectiveData` being the raw `data` / fetched page, it's the **flattened expansion** of the loaded tree, computed in a `computed()` signal:

```typescript
// Pseudocode in the WC core
private flattenedRows = computed<FlatRow<T>[]>(() => {
  const expanded = this._expandedIds;
  const out: FlatRow<T>[] = [];
  const walk = (rows: T[], depth: number, ancestorIds: readonly unknown[]) => {
    for (const row of rows) {
      out.push({ row, depth, ancestorIds, key: this._rowKey(row, /* …*/ ), kind: 'real' });
      const id = row[this._idKey];
      if (!expanded.has(id)) continue;
      const cached = this._childCache.get(id);
      const cc = (row as any)[this._childCountKey] ?? 0;
      if (cached) {
        walk(cached, depth + 1, [...ancestorIds, id]);
        // Reserve placeholders for not-yet-loaded child pages of this parent
        const remaining = (this._childTotals.get(id) ?? cached.length) - cached.length;
        for (let i = 0; i < remaining; i++) {
          out.push({ row: undefined, depth: depth + 1, ancestorIds: [...ancestorIds, id], key: `placeholder-${id}-${i}`, kind: 'placeholder' });
        }
      } else {
        // Expanded but no children loaded yet: reserve cc placeholders.
        for (let i = 0; i < cc; i++) {
          out.push({ row: undefined, depth: depth + 1, ancestorIds: [...ancestorIds, id], key: `placeholder-${id}-${i}`, kind: 'placeholder' });
        }
      }
    }
  };
  walk(this._rootRows, 0, []);
  return out;
});
```

Properties:
- **Uniform `itemSize`** for `kind: 'real'` AND `kind: 'placeholder'` rows. The scrollbar reflects the expanded total accurately the moment a row is expanded, even before children arrive.
- **O(n) flatten cost** per expansion change, where n = currently-loaded rows. The signal memoizes between expansion changes; virtual-scroll's `slice(start, end)` reads from the memoized array.
- **Stable keys**: each real row keyed by `rowKey(row)`; placeholders keyed by `placeholder-${parentId}-${i}`. Lit `repeat()` keeps DOM nodes stable across scroll.
- **No prefix-sum table needed**: because all weights are 1, `index ↔ y-offset` is still trivial.

The user's mental model ("expanding a row makes it count for 6 rows") is realized here as: expanding adds children + placeholders to the flat array → its `.length` grows → the virtual viewport's `bottom` spacer recomputes to `(total - end) * itemSize` → scrollbar grows. Collapsing removes them — `.length` shrinks back.

## Component API

Extends [the existing `bs-datatable` API](../../libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts). New inputs and models:

| New input / model | Type | Default | Purpose |
|---|---|---|---|
| `tree` | `boolean` | `false` | Switch to tree mode. Hard-coded chevron column appears as the leftmost cell. |
| `idKey` | `keyof TData \| ((row: T) => unknown)` | required when `tree` | Stable row identity. Used as expansion key and parent reference. |
| `childCountKey` | `keyof TData` | required when `tree` | Per-row direct-child count. Drives chevron visibility AND placeholder reservation. |
| `treeIndent` | `number` (rem) | `1.25` | Indent per depth level on the chevron cell only. User columns stay aligned. |
| `expandedIds` | `model<Set<unknown>>` | `new Set()` | Two-way expansion state, keyed by `idKey`. |
| `selectionStrategy` | `'flat' \| 'cascading'` | `'flat'` | When `tree=true`, switches to `'cascading'` by default. Explicit input lets the consumer opt out. |

Updated existing inputs:
- `itemSize` (already exists): unchanged — applies uniformly to real and placeholder rows.
- `rowKey` (already exists): unchanged — but when `tree=true` MUST be consistent with `idKey` (selection assumes the row's identity for selection storage matches the expansion key). Component asserts in dev mode.

New outputs:
- `rowExpand: output<{ row: T; depth: number }>` — fires after `expandedIds` changes to include the row.
- `rowCollapse: output<{ row: T; depth: number }>` — fires after `expandedIds` removes the row.
- (No "lazy-load failed" output in v1 — the fetch callback's promise rejection is the consumer's responsibility, surfaced as a `data-load-error` row attribute the consumer can style. See [Open questions](#open-questions).)

Updated row template context:
```typescript
interface BsRowTemplateContext<T> {
  $implicit: T | undefined;      // undefined for placeholder rows
  index: number;                 // index in the FLATTENED array (visible position)
  depth: number;                 // 0 for roots; +1 per nesting level
  isExpanded: boolean;           // true if this row is expanded
  isPlaceholder: boolean;        // true when $implicit === undefined (loading slot)
}
```

Consumers handle placeholders in their template:
```html
<ng-container *bsRowTemplate="let row; let depth = depth; let isPlaceholder = isPlaceholder">
  @if (isPlaceholder) {
    <td colspan="3"><bs-spinner inline /> Loading…</td>
  } @else {
    <td>{{ row.name }}</td>
    <td>{{ row.team }}</td>
    <td>{{ row.headcount }}</td>
  }
</ng-container>
```

(The chevron column is component-owned and rendered *before* the consumer's cells; consumers do not template it.)

## Extended `[fetch]` contract

The existing `BsDatatableFetch<T>` is `(req: PaginationRequest) => Promise<PaginationResponse<T>>` (`libs/mintplayer-ng-bootstrap/datatable/src/datatable-fetch.ts:3-4`). Tree-mode adds an optional `parentId` to the request — a dedicated request type in the datatable package, NOT a change to the shared `@mintplayer/pagination` package:

```typescript
// libs/mintplayer-ng-bootstrap/datatable/src/datatable-fetch.ts
import { PaginationRequest, PaginationResponse } from '@mintplayer/pagination';

export interface BsDatatableFetchRequest extends PaginationRequest {
  /** null/undefined = root level; any other value = children of the row with that idKey. */
  parentId?: unknown;
}

export type BsDatatableFetch<T> =
  (req: BsDatatableFetchRequest) => Promise<PaginationResponse<T>>;
```

| Mode | Trigger | Behavior |
|---|---|---|
| Paginated (flat) | default | One `fetch({ page, perPage, sortColumns })` per settings change. `parentId` undefined. |
| Virtual (flat) | `[virtualScroll]="true"` | Page cache; sequential page fetches with `parentId` undefined. |
| Paginated tree | `[tree]="true"` | One root fetch; one child fetch per expand (`parentId` = row's idKey). |
| Virtual tree + lazy | `[tree]` + `[virtualScroll]` | Root fetch + child fetch per expand + next-page child fetch when viewport approaches a loaded chunk's end. Placeholder rows reserve viewport space until each chunk arrives. |

The component owns *when* to call. Consumers write one callback that branches on `parentId`:

```typescript
fetchTreeItems: BsDatatableFetch<TreeItem> = async ({ parentId, page, perPage }) => {
  if (parentId == null) {
    return this.http.get<PaginationResponse<TreeItem>>(`/api/treeItems`, { params: { page, perPage } }).toPromise();
  } else {
    return this.http.get<PaginationResponse<TreeItem>>(`/api/treeItems/${parentId}/children`, { params: { page, perPage } }).toPromise();
  }
};
```

## Tree rendering

- **Chevron column**: hard-coded leftmost when `tree=true`, narrow fixed width (`min-content`). Renders `▸` (collapsed) / `▾` (expanded) on rows where `row[childCountKey] > 0`. Plain HTML `<button>` for accessibility (`aria-expanded`, `aria-controls` — see ARIA section). Empty cell on leaves.
- **Indent**: `[style.padding-left.rem]="depth * treeIndent()"` applied to the chevron cell *only*. User columns stay aligned across depths — the indent is a property of the tree gutter, not of the row.
- **Placeholder row appearance**: spinner + "Loading…" — overridable via the consumer's `*bsRowTemplate` (which sees `isPlaceholder: true`). Default unstyled fallback if the consumer's template returns nothing for placeholders.
- **Sort**: sort applies *within siblings only*. The component re-fetches per parent when `sortColumns` change (root re-fetch, plus a re-fetch for every expanded `parentId`). Cached children are invalidated.

### Keyboard interaction (ARIA)

- Per [WC ARIA implementation decisions](./wc-aria-accessibility.md), the chevron is a focusable `<button aria-expanded="false" aria-controls="...">` inside the row.
- Row gains `role="treegrid"` semantics (the table is the treegrid; rows are `role="row"` with `aria-level`, `aria-expanded`, `aria-setsize`, `aria-posinset`).
- Keyboard: `ArrowRight` expands a collapsed row; `ArrowLeft` collapses an expanded row (or jumps to parent if already collapsed); `Enter` / `Space` toggle. `Home`/`End` jump to first/last visible row in the flat list.
- Live region: when children arrive after a lazy fetch, the existing `bs-live-announcer` announces "N items loaded under X". Placeholder visibility is `aria-busy="true"` on the parent row.

## Cascading selection + Vidyano deselect-all header

Building on the selection model from [the merge-and-selection PRD](./datatable-virtual-merge-and-selection.md):

- `selection: model<TData[]>` — unchanged storage shape. Object equality via `compareWith` (already exists).
- `selectionStrategy = 'cascading'` (auto when `tree=true`):
  - Checking a parent: adds parent + all currently-loaded descendants to `selection`. Walks `_childCache` recursively. Does NOT trigger fetches.
  - Unchecking a parent: removes parent + all currently-loaded descendants from `selection`.
  - Indeterminate (tri-state checkbox visual): a parent shows the indeterminate state when *some but not all* of its currently-loaded descendants are selected. Computed in a `computed()` signal off `selection` + `_childCache`.
  - Leaf check/uncheck: standard single-row add/remove; the parent's indeterminate/checked state recomputes.
- Header checkbox:
  - `selection().length === 0` → header cell empty (no checkbox).
  - `selection().length > 0` → header cell shows a **checked** checkbox; clicking it clears `selection` entirely.
  - There is **no "select all"**. (Already shipped in the merge-and-selection PRD; tree-mode inherits.)
- Loaded-only semantics: cascading does not auto-select rows inside not-yet-loaded subtrees. Loading them later does not auto-add them to selection. Documented in the demo as the deliberate choice. (Alternative would be to track "logical selection" via ancestor flags, which complicates the model substantially — out of scope.)

## Web component layer

All new logic lands in `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts` (and supporting files under `libs/mintplayer-web-components/datatable/src/types/`). Per the [no-Angular-imports-in-WC rule](../../CLAUDE.md), only Lit + framework-agnostic types here.

New WC public surface (custom-element properties + events):
- Properties (JS-property reflect, not attribute-only because the values are objects/sets): `tree`, `idKey`, `childCountKey`, `treeIndent`, `expandedIds`, `selectionStrategy`.
- Events:
  - `mp-datatable-row-expand` — `{ row, depth, parentId }`.
  - `mp-datatable-row-collapse` — `{ row, depth, parentId }`.
  - `mp-datatable-expanded-ids-change` — `{ expandedIds: Set<unknown> }` (for two-way binding).
  - `mp-datatable-fetch-request` — `{ parentId, page, perPage, sortColumns }` (fires when the WC needs data; the Angular/React/Vue wrappers translate this into the consumer's `fetch` callback).

The WC does **not** call `fetch` itself — it raises `mp-datatable-fetch-request` and waits for the wrapper to set the response back via a `setFetchResponse(parentId, response)` method. This keeps the WC framework-agnostic (no `fetch` HTTP coupling) and lets each wrapper bridge to its host framework's HTTP idiom.

## Angular wrapper

`libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts`:

- New `input()`s and `model()`s mirroring the WC properties.
- Effect on `expandedIds()` change: diff against previous set, fire `rowExpand` / `rowCollapse` outputs.
- Effect that listens for `mp-datatable-fetch-request` events and calls the consumer's `fetch()` input with the request, then calls the WC's `setFetchResponse(parentId, response)`.
- `BsRowTemplateContext` extended with `depth`, `isExpanded`, `isPlaceholder`.
- Dev-mode assertion: when `tree=true` and `idKey` is unset, `console.error` with a descriptive message.

## React + Vue wrappers

Per investigation, both `libs/mintplayer-react-bootstrap/datatable/src/BsDatatable.tsx` (via `@lit/react`) and `libs/mintplayer-vue-bootstrap/datatable/src/BsDatatable.vue` exist but don't currently expose the `fetch`-callback abstraction (only `data` + `columns`).

For tree-mode, both wrappers need:
- Pass-through props for `tree`, `idKey`, `childCountKey`, `treeIndent`, `expandedIds` (JS-property syncing — these are non-attribute values).
- Pass-through props for `selectionMode`, `selection`, `selectionStrategy`, `compareWith` (the existing selection inputs aren't yet bridged — confirm + extend).
- A `fetch` prop (or `onFetch` event-callback style for React idiom): React: `fetch={async (req) => …}`; Vue: `:fetch="fetchTreeItems"`.
- Event bridging for `mp-datatable-row-expand` / `mp-datatable-row-collapse` / `mp-datatable-expanded-ids-change` (two-way `v-model:expandedIds` in Vue; `onExpandedIdsChange` in React).
- Hand-written, NOT codegen — per [hand-write framework wrappers, don't codegen them](../../CLAUDE.md) (`feedback_hand_written_framework_wrappers`).

## Backend extension — `apps/api`

ASP.NET Core 10 + EF Core SQLite, following the existing pattern in `apps/api/Controllers/` and `apps/api/Data/DemoSeed.cs`.

### New entity

```csharp
// apps/api/Models/TreeItem.cs
namespace MintPlayer.NgBootstrap.Api.Models;

public class TreeItem
{
    public int Id { get; set; }
    public int? ParentId { get; set; }       // null = root
    public string Name { get; set; } = "";
    public string DisplayValue { get; set; } = "";  // e.g. "450 employees" — what the demo shows in extra cells
    public int Headcount { get; set; }       // sample numeric column
    public int ChildCount { get; set; }      // precomputed: # of direct children. 0 = leaf.
    public TreeItem? Parent { get; set; }
    public List<TreeItem> Children { get; set; } = new();
}
```

### DbContext

Extend `apps/api/Data/DemoDbContext.cs`:
```csharp
public DbSet<TreeItem> TreeItems => Set<TreeItem>();
// In OnModelCreating: self-referential FK on ParentId
```

### Seed generator

Extend `apps/api/Data/DemoSeed.cs` with `await SeedTreeItemsAsync(db, ct)`:
- Deterministic `Random(99)` for stable shape.
- **Depth**: 4 levels (root → div → team → squad → person — or org-tree analogue).
- **Branching**: 50 roots, ~20 children per root, ~5 per branch, ~3 per leaf-group. Total ~30k rows — enough to stress virtual scroll + lazy load realistically.
- Pre-compute `ChildCount` for every row after the tree is built (single SQL pass, or LINQ groupby `ParentId` before save).
- Idempotent: skip if `TreeItems` table already has rows.

Final memory footprint: ~30k rows × ~80 bytes ≈ 2.4 MB in SQLite. Negligible.

### Controller

```csharp
// apps/api/Controllers/TreeItemsController.cs
[ApiController]
[Route("api/treeItems")]
public class TreeItemsController : ControllerBase
{
    private readonly DemoDbContext db;
    public TreeItemsController(DemoDbContext db) => this.db = db;

    // GET /api/treeItems?page=1&perPage=50&sort=name:asc
    [HttpGet]
    public async Task<ActionResult<PagedResult<TreeItemDto>>> GetRoots(
        [FromQuery] int page = 1, [FromQuery] int perPage = 50, [FromQuery] string? sort = null,
        CancellationToken ct = default)
    {
        var q = db.TreeItems.Where(t => t.ParentId == null);
        q = ApplySort(q, sort);
        return Ok(await PagedResult<TreeItemDto>.FromAsync(q.Select(ToDto), page, perPage, ct));
    }

    // GET /api/treeItems/123/children?page=1&perPage=50
    [HttpGet("{parentId}/children")]
    public async Task<ActionResult<PagedResult<TreeItemDto>>> GetChildren(
        int parentId, [FromQuery] int page = 1, [FromQuery] int perPage = 50, [FromQuery] string? sort = null,
        CancellationToken ct = default)
    {
        var q = db.TreeItems.Where(t => t.ParentId == parentId);
        q = ApplySort(q, sort);
        return Ok(await PagedResult<TreeItemDto>.FromAsync(q.Select(ToDto), page, perPage, ct));
    }

    private static Expression<Func<TreeItem, TreeItemDto>> ToDto => t =>
        new TreeItemDto { Id = t.Id, ParentId = t.ParentId, Name = t.Name,
                          DisplayValue = t.DisplayValue, Headcount = t.Headcount, ChildCount = t.ChildCount };
}
```

Response envelope follows the existing `PagedResult<T>` shape (matches `@mintplayer/pagination`'s `PaginationResponse<T>` field-wise: `data`, `totalRecords`, `totalPages`, `page`, `perPage`).

CORS, port, deploy: no changes — `apps/api` already exposes :5000 with the existing allowlist; the new controller is picked up automatically.

## Demo pages

All three demo apps add a new "Tree mode — expandable rows" example to the existing datatables demo page (NOT a separate page — section on the existing one).

### Angular — `apps/ng-bootstrap-demo/src/app/pages/enterprise/datatables/datatables.component.{ts,html,scss}`

- New `TreeItemService` at `apps/ng-bootstrap-demo/src/app/services/tree-item/tree-item.service.ts`: thin `HttpClient` wrapper around the two new endpoints; exposes one `fetch: BsDatatableFetch<TreeItem>` that branches on `parentId`.
- New `Tree mode` H2 section in the existing demo page, before `<bs-code-snippet>`, per the demo-before-snippet convention.
- Live demo: `<bs-datatable tree [idKey]="'id'" [childCountKey]="'childCount'" [fetch]="treeItemService.fetch" [(expandedIds)]="expandedIds" [(selection)]="treeSelection" selectionMode="multiple" virtualScroll [itemSize]="40">`.

### React — `apps/react-bootstrap-demo/src/app/pages/DatatablePage.tsx`

- New section with a `fetch` callback hook + state for `expandedIds: Set<number>` and `selection: TreeItem[]`.
- React wrapper extension to surface the new props.

### Vue — `apps/vue-bootstrap-demo/src/views/DatatableView.vue`

- New section with `<script setup>` state for expansion + selection; `v-model:expandedIds`, `v-model:selection`.
- Vue wrapper extension to surface the new props.

### Shared `TreeItem` type

Currently no shared types package across the three demos. Either:
1. **Recommended**: keep `TreeItem` interface duplicated in each demo (existing convention — `Artist`, `Customer`, etc. are all redeclared).
2. Defer: introduce a `@mintplayer/demo-types` package as separate cleanup (out of scope for this PRD).

Going with (1) to stay aligned with the existing convention; flag (2) as a follow-up cleanup.

## File changes

```
NEW   docs/prd/datatable-tree-mode.md                                          # this PRD

EDIT  libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts  # flattenedRows signal, chevron column, lazy state, cascading selection
EDIT  libs/mintplayer-web-components/datatable/src/types/column-def.ts         # depth/isPlaceholder added to RowRenderer context
NEW   libs/mintplayer-web-components/datatable/src/types/tree-state.ts         # FlatRow<T>, internal types

EDIT  libs/mintplayer-ng-bootstrap/datatable/src/datatable-fetch.ts            # BsDatatableFetchRequest with parentId
EDIT  libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts   # tree/idKey/childCountKey/expandedIds inputs + fetch bridging
EDIT  libs/mintplayer-ng-bootstrap/datatable/src/row-template/row-template.directive.ts  # context fields

EDIT  libs/mintplayer-react-bootstrap/datatable/src/BsDatatable.tsx            # surface tree props + fetch bridge + new events
EDIT  libs/mintplayer-vue-bootstrap/datatable/src/BsDatatable.vue              # surface tree props + fetch bridge + v-models

NEW   apps/api/Models/TreeItem.cs                                              # entity
NEW   apps/api/Models/TreeItemDto.cs                                           # DTO
NEW   apps/api/Controllers/TreeItemsController.cs                              # 2 GET endpoints
EDIT  apps/api/Data/DemoDbContext.cs                                           # TreeItems DbSet + self-ref FK
EDIT  apps/api/Data/DemoSeed.cs                                                # SeedTreeItemsAsync

NEW   apps/ng-bootstrap-demo/src/app/services/tree-item/tree-item.service.ts   # fetch callback
NEW   apps/ng-bootstrap-demo/src/app/entities/tree-item.ts                     # client type
EDIT  apps/ng-bootstrap-demo/src/app/pages/enterprise/datatables/datatables.component.{ts,html}  # new section + snippets

EDIT  apps/react-bootstrap-demo/src/app/pages/DatatablePage.tsx                # new section + fetch
EDIT  apps/vue-bootstrap-demo/src/views/DatatableView.vue                      # new section + fetch
```

## Implementation checklist

**Backend**
- [ ] `Models/TreeItem.cs` + `TreeItemDto.cs`.
- [ ] `DemoDbContext` self-referential mapping for `ParentId`.
- [ ] `DemoSeed.SeedTreeItemsAsync` deterministic generator (4 levels, ~30k rows, precomputed `ChildCount`).
- [ ] `TreeItemsController` with two `GET` endpoints, sort + pagination support.
- [ ] Manual smoke: `curl http://localhost:5000/api/treeItems?page=1&perPage=10`, `curl http://localhost:5000/api/treeItems/1/children`.

**Web component**
- [ ] `flattenedRows` computed signal (rows + placeholders, depth-tagged).
- [ ] Chevron column rendering with `aria-expanded` / `aria-controls`.
- [ ] Depth-based indent on chevron cell.
- [ ] `mp-datatable-fetch-request` event + `setFetchResponse()` method (decouple from HTTP).
- [ ] Cascading selection — parent toggle, indeterminate computed signal, leaf bubble-up.
- [ ] Keyboard handling — `Arrow{Left,Right}`, `Enter`/`Space` on chevron.
- [ ] `role="treegrid"`, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-busy` on loading parents.
- [ ] Live-announcer hook on child-load completion.

**Angular wrapper**
- [ ] New inputs/models (`tree`, `idKey`, `childCountKey`, `treeIndent`, `expandedIds`, `selectionStrategy`).
- [ ] Effect: bridge `mp-datatable-fetch-request` → consumer's `fetch()` → `setFetchResponse()`.
- [ ] Effect: emit `rowExpand` / `rowCollapse` outputs on `expandedIds` diff.
- [ ] Extended `BsRowTemplateContext` with `depth`, `isExpanded`, `isPlaceholder`.
- [ ] Dev-mode assertion: `tree=true` requires `idKey` + `childCountKey`.

**React + Vue wrappers**
- [ ] React: new props (`tree`, `idKey`, …, `expandedIds`, `onExpandedIdsChange`, `fetch`); JS-property syncing for object values.
- [ ] Vue: same as React; `v-model:expandedIds` + `v-model:selection`.
- [ ] Event-name aliases for `mp-datatable-row-expand` / `-collapse` / `-expanded-ids-change` / `-fetch-request`.

**Demos**
- [ ] Angular: `TreeItemService`, new H2 section, code snippets via `<bs-code-snippet>` AFTER the live demo.
- [ ] React: new section with state + fetch callback.
- [ ] Vue: new section with state + fetch callback.

**Tests**
- [ ] Unit (Lit): `flattenedRows` correctness for nested-expand/collapse, placeholder math, idempotent expand-collapse.
- [ ] Unit (Lit): cascading selection — parent check propagates to loaded descendants only; indeterminate computed correctly.
- [ ] Unit (Angular): two-way `expandedIds` and `selection`; `rowExpand`/`rowCollapse` output emissions.
- [ ] Component (Angular): virtual-scroll + tree integration — placeholder count matches `childCount` before load, replaces with real rows after.
- [ ] E2E (Playwright): expand a root row → assert children appear; expand a deeper row → assert children appear with deeper indent; collapse → assert children removed and scrollbar shrinks; cascading select via parent checkbox; deselect-all header behavior.
- [ ] API integration: roots endpoint returns 50 rows in deterministic order; children endpoint returns expected count per `ChildCount`.

## Test plan

| Layer | Surface | Tooling | Where |
|---|---|---|---|
| WC unit | `flattenedRows`, expansion math, cascading select | vitest in `libs/mintplayer-web-components/datatable/test` | new |
| NG unit | wrapper effects, output emissions | jest in `libs/mintplayer-ng-bootstrap/datatable/test` | new |
| Demo E2E | expand/collapse, lazy load, cascading select | Playwright via `dcg:playwright` skill (destructive-bootstrap pattern) | `apps/ng-bootstrap-demo/e2e/` |
| API smoke | endpoint shape | manual `curl` + `dotnet test` if a test project is added | manual |

## Out of scope / future

- **Multi-column tree (TreeTable)**: PrimeNG's `<p-treeTable>` has a distinct tree-of-columns layout. Not in scope; we're a row-tree.
- **Sort across the whole tree** (vs sort within siblings): not in scope; siblings-only is the simpler, more useful model for org/category trees.
- **Drag-to-reparent rows**: out of scope.
- **Server-driven expansion state** (return `expanded: true` in DTOs to pre-expand): out of scope. Consumer can seed `expandedIds` on init.
- **Persisting cached children across re-fetches**: cache invalidates on sort change / root refetch (simple). A smarter cache (re-merge by id) is a follow-up.
- **Logical (subtree) selection**: when a parent's not-yet-loaded subtree should count as selected, with the descendants materialized as needed. Significantly more complex (ancestor flags + reconciliation on load); leave for a future iteration.
- **Variable-height rows**: still not supported. The weighted model removes the need for this feature — tree rows reuse the uniform itemSize.
- **`apps/api` JSON file storage**: the user's question mentioned JSON, but the existing api is SQLite-backed with deterministic seeds (`DemoSeed.cs`). Sticking with the existing convention — no JSON file.

## Open questions

1. **Selection on the chevron-clicking interaction**: should clicking a chevron also focus the row, or stay focus-neutral? (Existing component sets `data-focused` on row click — chevron click probably should NOT, since it's a control inside the row. Confirm.)
2. **Placeholder UX while lazy-loading**: spinner-per-row vs single-spinner-at-bottom-of-parent. The PRD proposes per-row; could be heavy if `childCount` is large (50+). May want a "loading first N rows" + "and N more…" treatment for the long tail. Punt to implementation review.
3. **Sort change while children are expanded**: the proposal is to refetch root + every expanded parent. This is a thundering-herd risk for deep expansions. Sequential refetch with a small concurrency cap (e.g. 4) is a sensible default — confirm during implementation.
4. **`compareWith` requirement clarity**: today `compareWith` defaults to `Object.is`; for tree mode with id-based selection, the natural default is `(a, b) => a[idKey] === b[idKey]`. Should `tree=true` implicitly override `compareWith` to id-based? Probably yes — flag for implementation.

## Verification notes

- PrimeNG references in this PRD (e.g. `<p-table>` row expansion + virtual scrolling limitations) were verified against the v17/v18 docs and the open GitHub issues #16438, #9008, #9799, #16631. Source-level verification is also possible via the locally-cloned `C:\Repos\prime\{primeng,primereact,primevue,primeuix}` repositories if specific behaviors need confirmation during implementation.
- The weighted-virtual-scroll math has been validated mentally against the current `refreshVirtualRange` implementation (`mp-datatable.ts:367-381`); the only contract change is the source of `effectiveData` (now `flattenedRows()` when `tree=true`).

### primeuix scan (sanity check)

A focused scan of `C:\Repos\prime\primeuix` (PrimeFaces's shared headless/UI primitives layer beneath primeng/primevue/primereact) yielded the following relevant findings:

- **No shared virtual scroller primitive** in primeuix — only theming tokens at `packages/styles/src/virtualscroller/index.ts` (~8 lines of loader CSS). Each framework adapter implements virtualization independently. → Confirms there's no upstream reference implementation to crib from; our weighted-rows model stands on its own.
- **No shared tree-state or cascading-selection primitive** — the only headless module is `packages/headless/src/listbox/` (flat selection only). Cascading checked state, indeterminate computation, and tree traversal are implemented per-framework in primeng/primevue/primereact. → Validates the WC-owns-the-logic design in this PRD; we're not skipping a shared abstraction.
- **Tree indent + toggle button are token-driven**, worth mirroring in our CSS:
  - `tree.indent` (default `1rem`) — matches our `treeIndent` input default of `1.25` rem.
  - Toggle button tokens: `{size, borderRadius, hoverBackground, color, hoverColor, focusRing}` — already covered by Bootstrap's `--bs-*` button variables; no new tokens needed.
- **No indeterminate-checkbox tokens** in primeuix — they don't theme that visual state. Our cascading-selection tri-state will rely on Bootstrap's existing `.indeterminate` form-check styling.
- **Separate DataTable vs TreeTable** in primeng/primevue/primereact (different CSS classes `.p-datatable-row-toggle-button` vs `.p-treetable-node-toggle-button`, different stylesheets). → We're going the *opposite* direction by making tree a flag on `<bs-datatable>`. The weighted-virtual-scroll model is what makes this practical — primeuix's separation is partly because their virtual scroller doesn't handle tree-aware variable rows. Our uniform-itemSize tree sidesteps that constraint.

Net: nothing in primeuix overturns the PRD's design decisions. The scan reinforces that the weighted-rows + lazy-children model is a fresh take rather than reinventing an existing primitive.
