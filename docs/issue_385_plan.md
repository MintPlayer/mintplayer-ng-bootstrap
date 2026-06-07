# Development Plan: Issue #385

**Issue**: #385
**Title**: feat(datatable): lazy windowed fetch for `[fetch]` + `[virtualScroll]` (flat mode eager-loads all pages)
**Type**: Feature / Enhancement
**Priority**: High (blocks MintPlayer.Spark #178)

## Executive Summary

In ng-bootstrap 22 the flat (non-tree) datatable, when combined with server-side `[fetch]` and `[virtualScroll]`, eagerly drains the **entire** result set up front (`runVirtualFetchAll` loops every page in 200-row chunks into memory) and only then virtualizes the in-memory array. That defeats virtual scrolling and is a behavior regression versus the removed `virtual-datatable`'s true lazy `(skip,take)` windowing.

This change makes flat virtual + `[fetch]` fetch **only the visible window (+ buffer) on demand**, rendering placeholder rows for not-yet-loaded ranges and sizing the scrollbar from `totalRecords`. It does so by reusing the existing tree lazy-fetch machinery (`mp-datatable-fetch-request` / `setFetchResponse` / placeholder rows), keyed by **page** instead of `parentId`. The public `[fetch]` contract (`(req: PaginationRequest) => Promise<PaginationResponse>`) is **unchanged** — consumers (ng-spark) need zero changes.

---

## Problem Statement

### Current Behavior
- Wrapper `datatable.component.ts` fetch effect (`:237-264`) routes flat + virtual to `runVirtualFetchAll` (`:411-431`), which fetches page 1, then loops pages `2..totalPages` (200-row `perPage`), accumulating all rows into `currentData` before the WC virtualizes.
- WC `mp-datatable.ts` flat `getFlatList` branch (`:891-911`) produces a trivial mapping of `_data` with no placeholders. Lazy on-demand placeholder fetch (`maybeFetchPlaceholdersInViewport` `:586-599`, `requestChildrenFetch` `:1118-1132`, `setFetchResponse` `:1139-1145`) exists **only for tree children** (gated by `if (this._tree)` at `:579`).
- Result: opening a virtual list of N rows triggers `⌈N/200⌉` sequential fetches and loads everything into memory before the first scroll.

### Expected Behavior
- Flat virtual + `[fetch]` fetches page 1 first (for `totalRecords` + initial rows), then fetches additional pages **only as their rows scroll into the viewport (+ buffer)**.
- Unloaded ranges render placeholder rows; the virtual scroll region is sized from `totalRecords`, not `_data.length`.
- Sort / settings changes invalidate the page cache and re-fetch the visible window.
- Opening a virtual list of N rows issues `O(visible/perPage)` fetches, not `⌈N/perPage⌉`.

### Impact
- Unblocks **MintPlayer.Spark #178** (Angular 22 + ng-bootstrap 22 upgrade), which is held on this regression. ng-spark's `query-list` / `po-detail` `renderMode: 'VirtualScrolling'` queries become lazy again.
- Benefits every ng-bootstrap consumer using flat virtual + server-side fetch.

---

## Technical Analysis

### Files to Modify
- `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts` — flat-window placeholder/cache machinery (the bulk of the change).
- `libs/mintplayer-web-components/datatable/src/types/tree.ts` — generalize the fetch-request/response docs (the `parentId: null` + `page` flat-window case); types are reused as-is, comments updated.
- `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts` — replace `runVirtualFetchAll` with `runVirtualFetchFirst`; extend `onFetchRequest` for `parentId == null` flat windows; call `el.invalidateData()` on sort/settings change.
- Demo app (`apps/ng-bootstrap-demo/...` datatable demo page) — add a virtual + fetch example.
- WC + wrapper unit test specs.
- Version bump for `@mintplayer/ng-bootstrap` (+ `@mintplayer/web-components` if published independently).

### Dependencies
- None external. Reuses `@mintplayer/pagination` (`PaginationRequest`/`PaginationResponse`) and the existing tree fetch machinery.

### Architecture Considerations
- **Reuse over reinvention** (CLAUDE.md): the tree lazy-fetch path is the template. Flat windows are "roots without a tree" — keyed by `page` instead of `parentId`.
- **`parentId: null` disambiguation** — the existing `setFetchResponse(null, …)` early-returns (tree-root semantics: "root-level fetches use the `data` setter directly"), and `requestChildrenFetch` skips `_pendingFetches` for null parents. Flat windows therefore use **separate page-keyed storage** (`_pageCache`, `_pendingPageFetches`) branched on `!this._tree`. Tree and flat are mutually exclusive, so branching on `_tree` is safe.
- **Window size = `settings.perPage`** → the WC's `_perPage` drives both the fetch request and the index→page math (`page = ⌊i/perPage⌋+1`, `offset = i%perPage`), so the WC page index equals the fetch page identity. No second divisor, no cache-key divergence.
- **Page-1 source mirrors tree mode**: wrapper sets `el.data = page-1 rows` + `el.totalRecords`; pages ≥2 flow through `setFetchResponse` into `_pageCache`. Analogous to tree (roots = `_data`, children = `_childCache`) — minimal new surface.
- **`isExternallyPaged()`** (`_totalRecords > _data.length`) already gates external paging; the new flat-window sparse path keys off `_virtualScroll && isExternallyPaged() && !_tree`. When `totalRecords ≤ perPage` (single page) it falls back to the current trivial flat mapping.
- See the PRD's **Chosen Design** for the settled interface + rejected alternatives.

---

## Implementation Plan

### Phase 1: WC flat-window data model (`mp-datatable.ts`)
1. Add fields: `private _pageCache: Map<number, unknown[]> = new Map();` and `private _pendingPageFetches: Set<number> = new Set();`.
2. Add a `page?: number` field to the `FlatVisibleRow` placeholder shape (so the viewport scan reads the page directly).
3. Add a helper `isFlatWindowed(): boolean` = `this._virtualScroll && !this._tree && this.isExternallyPaged()`.
4. Rewrite the flat branch of `getFlatList()` (`:893-911`): when `isFlatWindowed()`, build a length-`_totalRecords` sparse list — for index `i`, `page = ⌊i/perPage⌋+1`, `pos = i%perPage`; real row from `_data[i]` when `page === 1`, else from `_pageCache.get(page)?.[pos]`; otherwise a placeholder `{ row: undefined, key: '__placeholder-flat-'+i, depth: 0, parentId: null, page, isExpanded: false, isPlaceholder: true }`. When not flat-windowed, keep the existing trivial mapping.
5. Update `getEffectiveData()` so flat-windowed mode returns `getFlatList().map(r => r.row)` (length `_totalRecords`), mirroring the tree branch — this feeds `refreshVirtualRange` total + `getVirtualSpacerHeights`.
6. Update `aria-rowcount` (`render()` `:613`) to use `getFlatList().length` in flat-windowed mode (currently `_data.length` for non-tree).

### Phase 2: WC on-demand fetch + cache writes (`mp-datatable.ts`)
1. In `refreshVirtualRange` (`:564-580`): drive the viewport scan in flat-windowed mode too — `if (this._tree) maybeFetchPlaceholdersInViewport(); else if (this.isFlatWindowed()) maybeFetchPagesInViewport();` (the tree scan stays as-is).
2. Add a sibling `maybeFetchPagesInViewport()` (rather than overloading the tree scan, which keys by `parentId`): for flat placeholders (`parentId == null`, has `page`), collect the page set in `[startIndex,endIndex)`, skip pages already in `_pageCache` or `_pendingPageFetches`, and emit one fetch-request per needed page. `maybeFetchPlaceholdersInViewport` stays tree-only.
3. Add `requestPageFetch(page: number)`: add to `_pendingPageFetches`, dispatch `mp-datatable-fetch-request` with `{ parentId: null, page, perPage: this._perPage, sortColumns: [...this._sortColumns] }`.
4. Extend `setFetchResponse(parentId, response)`: when `!this._tree` (flat-window), `_pendingPageFetches.delete(response.page)`, `_pageCache.set(response.page, [...response.data])`, set `_totalRecords` if changed, `requestUpdate()`. Keep the tree path (`parentId != null` → `_childCache`) and the existing null early-return only for the tree case.
5. Add `public invalidateData(): void` — clears `_pageCache` + `_pendingPageFetches`, `requestUpdate()`.

### Phase 3: Angular wrapper (`datatable.component.ts`)
1. Replace `runVirtualFetchAll` (`:411-431`) with `runVirtualFetchFirst(fetcher, settings)`: fetch page 1 with `perPage = settings.perPage.selected`; set `currentData` = page-1 rows and `totalRecords` = response total; do **not** loop remaining pages. Keep the `virtualFetchToken` guard.
2. Update the fetch effect (`:254`) to call `runVirtualFetchFirst` and, before it, call `el.invalidateData()` when the WC element exists (mirror tree `invalidateChildren()` at `:252`) so sort/settings changes drop the stale window.
3. Extend `onFetchRequest` (`:536-562`): when `detail.parentId == null` (flat window), call `[fetch]({ page: detail.page, perPage: detail.perPage, sortColumns })` and `el.setFetchResponse(null, { data, totalRecords, page, perPage })`. Keep the existing tree-child path for `parentId != null`. Guard so this only runs in flat virtual mode (not classic tree-root, which the wrapper never emits as a `null`-parent request).

### Phase 4: Tests
1. WC unit tests (`vitest` + jsdom): placeholder render in flat virtual + external; window fetch-request emitted only for viewport pages; `_pendingPageFetches` dedup (no duplicate request for an in-flight page); `setFetchResponse(null, …)` populates `_pageCache` and clears placeholders; `invalidateData()` clears cache; scrollbar/spacer sized from `totalRecords`.
2. Wrapper unit tests: page-1-first (only one fetch on open, not `⌈N/perPage⌉`); `parentId == null` bridge calls `[fetch]` with the requested page and forwards to `setFetchResponse`; sort change calls `invalidateData()` then refetches.

### Phase 5: Demo + publish
1. Add a "Virtual scroll + server-side fetch" example to the ng datatable demo page (demo before snippet — see CLAUDE.md/memory).
2. `nx build mintplayer-web-components` + `nx build mintplayer-ng-bootstrap`; run WC + wrapper tests.
3. Bump `@mintplayer/ng-bootstrap` version, publish, then notify so Spark #178 can bump and resume.

---

## Test Scenarios

### Scenario 1: Lazy window on open
- **Given**: a flat `[fetch]` + `[virtualScroll]` datatable backed by 10,000 rows, `perPage = 50`, viewport showing ~20 rows.
- **When**: the table first renders.
- **Then**: exactly one fetch (page 1) fires on open; total `_data`/cache holds ≤ `perPage + buffer-pages` worth of rows, not 10,000; scrollbar is sized for 10,000 rows.

### Scenario 2: Fetch-on-scroll
- **Given**: the table from Scenario 1, page 1 loaded.
- **When**: the user scrolls so rows 400–420 enter the viewport.
- **Then**: a fetch-request for the page(s) covering indices 400–420 fires (once each), placeholders show until the response, then real rows replace them; pages not scrolled to are never fetched.

### Scenario 3: Dedup in-flight page
- **Given**: a page fetch for page 9 is in flight (`_pendingPageFetches` has 9).
- **When**: `refreshVirtualRange` runs again (scroll jitter) with page 9 still in view.
- **Then**: no second fetch-request for page 9 is emitted.

### Scenario 4: Sort invalidates the window
- **Given**: pages 1, 5, 9 loaded in `_pageCache`.
- **When**: the user changes the sort column.
- **Then**: `el.invalidateData()` clears `_pageCache` + `_pendingPageFetches`, the wrapper refetches page 1, and previously-loaded pages re-fetch lazily as they re-enter the viewport.

### Scenario 5: Single-page list (no regression)
- **Given**: a flat virtual `[fetch]` list where `totalRecords ≤ perPage`.
- **When**: it renders.
- **Then**: `isExternallyPaged()` is false → the trivial flat mapping path runs, no placeholders, behaves as today.

---

## Acceptance Criteria

- [ ] Opening a virtual list of N rows issues `O(visible/perPage)` fetches, not `⌈N/perPage⌉`.
- [ ] Placeholders render for unloaded ranges; real rows replace them on response.
- [ ] Virtual scroll region / scrollbar sized from `totalRecords`.
- [ ] Sort / settings change invalidates the page cache and refetches the visible window.
- [ ] Public `[fetch]` contract unchanged (existing consumers untouched).
- [ ] Tree mode behavior unchanged (regression-guarded).
- [ ] WC unit tests (placeholder render, window-request dedup, cache populate, invalidation, spacer sizing) green.
- [ ] Wrapper unit tests (page-1-first, `parentId == null` bridge, invalidation) green.
- [ ] Virtual + fetch demo example added.
- [ ] New `@mintplayer/ng-bootstrap` version published.

---

## Build & Test Commands

```bash
npx nx run mintplayer-web-components:codegen-wc   # if any .styles.scss/.element.* changed
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap
npx nx test mintplayer-web-components
# wrapper tests:
npx nx test mintplayer-ng-bootstrap
```

---

## Related Files

- `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts`
- `libs/mintplayer-web-components/datatable/src/types/tree.ts`
- `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts`
- `libs/mintplayer-ng-bootstrap/datatable/src/datatable-fetch.ts`
- ng datatable demo page (`apps/ng-bootstrap-demo/...`)
