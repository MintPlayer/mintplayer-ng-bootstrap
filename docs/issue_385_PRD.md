# Product Requirements Document: Lazy windowed fetch for flat `[fetch]` + `[virtualScroll]`

**Issue**: #385
**Title**: feat(datatable): lazy windowed fetch for `[fetch]` + `[virtualScroll]` (flat mode eager-loads all pages)
**Status**: Complete
**Created**: 2026-06-07
**Last Updated**: 2026-06-07

---

## Summary

**As built.** Flat (non-tree) datatables that combine server-side `[fetch]` with `[virtualScroll]` previously eager-loaded the entire result set (`runVirtualFetchAll` drained every page into memory before virtualizing) — a behavior regression versus the removed `virtual-datatable`. That path is now **lazy and windowed**: the wrapper fetches page 1 for the total (`runVirtualFetchFirst`), then the WC fetches additional pages only as their rows scroll into view, rendering placeholders for unloaded ranges and sizing the scroll region from `totalRecords`. The implementation **reuses the tree lazy-fetch machinery** (`mp-datatable-fetch-request` / `setFetchResponse` / placeholder rows) keyed by **page** instead of `parentId`: a dedicated `_pageCache`/`_pendingPageFetches` pair plus a sibling viewport scanner `maybeFetchPagesInViewport()` (the tree `maybeFetchPlaceholdersInViewport` stays parentId-keyed), all disambiguated by `!this._tree`. Window size = `settings.perPage`, so the WC page index equals the fetch page identity. The public `[fetch]` contract is **unchanged** — consumers (notably MintPlayer.Spark #178, which this unblocks) need zero changes.

**Load-bearing decisions:** (1) page/perPage windowing over a new `{skip,take}` callback — keeps the contract stable; request count scales with `1/perPage`, tuned by raising `perPage`. (2) Page-keyed storage branched on `!this._tree` rather than reusing the `parentId: null` tree-root path, which has its own early-return semantics. (3) `onFetchRequest` keys `setFetchResponse` on the **requested** `detail.page`, not `response.page`, so a server that normalises page numbers can't deadlock the window (guarded by a test). (4) Page-1 mirrors tree roots in `_data`; pages ≥2 in `_pageCache`.

**Restoration parity:** this closes the only capability the #306 `virtual-datatable` merge dropped — the old `VirtualDatatableDataSource`'s lazy `(skip,take)` windowing with placeholder fill, multi-page viewport fetch, and `reset()`-immediate-refetch. All of those are restored (`reset()` ↔ `invalidateData()` + the `updated()`→`refreshVirtualRange()`→rescan that re-fetches the visible window with no scroll; proven by test). Everything else the old `bs-virtual-datatable` exposed — `isResponsive`, `itemSize`, sorting, row template, ARIA rowcount — was already present in the merged datatable.

**Tests:** 8 WC tests (`mp-datatable.windowed-fetch.spec.ts`) + 4 wrapper tests (`datatable.windowed-fetch.spec.ts`); full suites green (758 WC / 519 wrapper). Reviewed via the DCG gate — verdict passes-with-fixes; the one should-fix (plan doc drift) is resolved, residual items are benign nits.

---

## Overview

Add a lazy, scroll-driven windowed-fetch path for **flat virtual + external `[fetch]`** datatables, mirroring the tree-mode lazy-children path. The web component owns virtualization, placeholder rendering, viewport→page detection, and the page cache; the Angular wrapper bridges the WC's fetch-request event to the consumer's existing `[fetch]` callback and seeds page 1.

---

## Goals & Objectives

### Primary Goals
- Replace eager `runVirtualFetchAll` with on-demand, viewport-driven page fetching for flat virtual mode.
- Render placeholders for unloaded ranges; size the scroll region from `totalRecords`.
- Invalidate + refetch on sort/settings change.
- Keep the public `[fetch]` contract and all existing consumers unchanged.

### Success Metrics
- Opening a virtual list of N rows issues `O(visible/perPage)` fetches, not `⌈N/perPage⌉`.
- No full-dataset materialization in memory for flat virtual lists.
- Tree mode and non-virtual flat fetch behavior unchanged (regression-guarded by tests).

---

## Chosen Design

**Reuse the tree lazy-fetch machinery for flat virtual mode, keyed by page; the public `[fetch]` contract is UNCHANGED.** (Design fan-out **not run** — the public interface is settled in the issue handoff; the remaining work is internal to a single component, `mp-datatable.ts`, constrained by the existing `setFetchResponse`/`mp-datatable-fetch-request` contract, with no plausible second *public* shape. The internal cache-mechanics decisions below were resolved by grilling instead.)

### Public interface (unchanged)
```ts
// libs/mintplayer-ng-bootstrap/datatable/src/datatable-fetch.ts — UNCHANGED
type BsDatatableFetch<T> =
  (req: PaginationRequest /* { page, perPage, sortColumns } */) => Promise<PaginationResponse<T>>;
```
In flat virtual mode the datatable calls this once per *needed page* instead of draining all pages.

### Internal mechanics (resolved by grilling)
- **Window size = `settings.perPage`.** The WC's `_perPage` drives both the fetch request and the index→page math, so the WC page index equals the fetch page identity:
  ```
  page   = Math.floor(i / perPage) + 1
  offset = i % perPage
  ```
- **Page-1 source mirrors tree mode.** The wrapper sets `el.data = page-1 rows` + `el.totalRecords` (via `runVirtualFetchFirst`); pages ≥2 arrive through `setFetchResponse(null, resp)` into a new page-keyed cache. Analogous to tree (roots = `_data`, children = `_childCache`).
  ```ts
  // getFlatList flat-window branch, index i:
  page = Math.floor(i / perPage) + 1;
  const row = page === 1 ? _data[i] : _pageCache.get(page)?.[i % perPage];
  // → real row, or placeholder { row: undefined, parentId: null, page, isPlaceholder: true }

  // setFetchResponse(null, resp), flat-window (!_tree) branch:
  _pendingPageFetches.delete(resp.page);
  _pageCache.set(resp.page, [...resp.data]);
  ```
- **`parentId: null` disambiguation.** The existing `setFetchResponse(null, …)` early-returns with tree-root semantics, and `requestChildrenFetch` skips `_pendingFetches` for null parents. Flat windows therefore use **separate page-keyed storage** (`_pageCache: Map<number, rows[]>`, `_pendingPageFetches: Set<number>`) branched on `!this._tree`. Tree and flat are mutually exclusive, so branching on `_tree` is safe.
- **`invalidateData()`** — new public WC method clearing `_pageCache` + `_pendingPageFetches`; the wrapper calls it on sort/settings change before refetching page 1 (mirrors `invalidateChildren()`).
- **Cache eviction** — none in v1; keep all loaded pages. Add LRU only if a real memory problem surfaces.

### Usage example (consumer — no change required)
```ts
// Consumer code is identical to today's [fetch] + [virtualScroll]:
fetchUsers = (req: PaginationRequest): Promise<PaginationResponse<User>> =>
  this.api.getUsers(req.page, req.perPage, req.sortColumns);
```
```html
<bs-datatable [fetch]="fetchUsers" [virtualScroll]="true" [(settings)]="settings">
  ...
</bs-datatable>
<!-- Now fetches page-by-page as the user scrolls, instead of draining all pages on open. -->
```

### What complexity this hides
- Viewport→page mapping, placeholder reservation, in-flight dedup, and the page cache live entirely in the WC.
- The wrapper only seeds page 1, bridges the fetch-request event to `[fetch]`, and invalidates on sort.
- Consumers see no new API and no behavioral surprise beyond "it's lazy now".

### Designs considered (and rejected)
- **New `{skip,take}` callback (`BsDatatableFetchWindow`)** — breaks every consumer's `[fetch]`; page/perPage windowing reuses the existing contract. *(The issue body floated `{skip,take}` as one option; rejected to preserve the contract.)*
- **Keep `runVirtualFetchAll`** — that *is* the bug.
- **Infinite-scroll append** — no random-access jump, can't size the scrollbar to the true total, degrades to eager on fast scroll.
- **Per-row fetch** — too chatty; page granularity matches server paging.
- **Wrapper-only fix** — the wrapper can't render placeholders or know the viewport; virtualization lives in the WC.
- **Dedicated virtual window size (≠ perPage)** — fewer requests for tiny `perPage`, but the WC page index would diverge from the fetch page, needing a second divisor and a cache key disjoint from the contract. Rejected for complexity.
- **Single `_pageCache` source (page 1 also via `setFetchResponse`)** — one source of truth, but diverges from how tree mode + the `el.data` effect already work and forces the wrapper to suppress its `el.data` sync. Rejected; mirroring tree is lower-risk.

---

## Out of Scope

- **Tree mode** — already lazy; only regression-guarded here. *Rationale: the lazy-children path already does on-demand fetch; this issue is exclusively the flat path.*
- **React / Vue datatable ports of this behavior** — *Rationale: separate follow-up; this issue ships the WC + Angular wrapper, which is what unblocks Spark #178.*
- **Changing the public `[fetch]` signature** — *Rationale: a contract change would break every consumer; the whole design reuses page/perPage to avoid it.*
- **Non-virtual flat fetch** — *Rationale: already correct (single-page `runFetch`); untouched.*
- **Cache eviction / LRU** — *Rationale: v1 keeps all loaded pages; LRU is deferred until a real memory problem is observed (see Open Questions).*

---

## Functional Requirements

### Must Have (P0)
- [x] **FR-1**: Flat virtual + external `[fetch]` fetches page 1 on open (one fetch), not all pages.
- [x] **FR-2**: Pages ≥2 are fetched only when their rows enter the viewport (+ buffer), via `mp-datatable-fetch-request { parentId: null, page, perPage, sortColumns }`.
- [x] **FR-3**: Unloaded ranges render placeholder rows (`isPlaceholder: true`), replaced by real rows on response.
- [x] **FR-4**: The virtual scroll region / spacers are sized from `totalRecords`, not `_data.length`.
- [x] **FR-5**: In-flight pages are deduped via `_pendingPageFetches` (no duplicate request for a page already loading).
- [x] **FR-6**: `setFetchResponse(null, resp)` populates the page cache (keyed by `resp.page`) and clears the corresponding placeholders.
- [x] **FR-7**: `invalidateData()` clears the page cache + pending set; the wrapper calls it on sort/settings change, then refetches page 1.
- [x] **FR-8**: The public `[fetch]` contract is unchanged; existing consumers compile and behave identically.
- [x] **FR-9**: Tree mode and non-virtual flat fetch behavior are unchanged.

### Should Have (P1)
- [x] **FR-10**: `aria-rowcount` reflects `totalRecords` (full virtual list) in flat-windowed mode.
- [x] **FR-11**: A "Virtual scroll + server-side fetch" demo example on the ng datatable demo page (demo before snippet).

---

## Timeline & Milestones

### Milestone 1: WC flat-window data model
- [x] Add `_pageCache` + `_pendingPageFetches` fields and `page?: number` on the placeholder row shape.
- [x] `isFlatWindowed()` helper; rewrite the flat `getFlatList` branch to build the sparse length-`totalRecords` list.
- [x] `getEffectiveData()` + `aria-rowcount` use the sparse length in flat-windowed mode.

### Milestone 2: WC on-demand fetch + cache writes
- [x] Call the viewport scan for flat-windowed mode (`maybeFetchPagesInViewport()`, sibling of the tree path); handle `parentId == null` page placeholders.
- [x] `requestPageFetch(page)`; extend `setFetchResponse` for the `!_tree` page-cache branch.
- [x] `invalidateData()`.

### Milestone 3: Angular wrapper
- [x] Replace `runVirtualFetchAll` with `runVirtualFetchFirst` (page-1 only + totalRecords).
- [x] `el.invalidateData()` on sort/settings change before refetch.
- [x] Extend `onFetchRequest` for `parentId == null` flat windows (key the page cache on the requested `detail.page`, not `response.page`, so a server that normalises page numbers can't deadlock the window).

### Milestone 4: Tests + demo
- [x] WC unit tests (placeholder render, window-request dedup, cache populate, invalidation, aria-rowcount/spacer sizing, single-page fallback) — `mp-datatable.windowed-fetch.spec.ts` (7 tests).
- [x] Wrapper unit tests (page-1-first, `parentId == null` bridge, requested-page-key lock, invalidation) — `datatable.windowed-fetch.spec.ts` (4 tests).
- [x] Virtual + fetch demo example — dedicated "Virtual scrolling — lazy windowed fetch" section on the ng datatable demo page (5000-row synthetic source, simulated latency, live fetch-page log, placeholder-aware rows).

### Milestone 5: Publish + cross-repo handoff
- [x] Build all libs + run tests (WC + wrapper + demo all green).
- [x] Bump versions: `@mintplayer/web-components` 1.6.0 → 1.7.0 (the fix), `@mintplayer/ng-bootstrap` 22.2.0 → 22.3.0, and raise ng-bootstrap's `@mintplayer/web-components` peer floor to `^1.7.0` (the new wrapper requires the new WC flat-window API).
- [ ] Publish — automatic via `publish-master.yml` on merge to `master` (`skipDuplicate`); no manual publish.
- [ ] Notify so MintPlayer.Spark #178 bumps ng-bootstrap and resumes (post-merge).

---

## Open Questions

> Recorded as v1 assumptions (resolved by grilling); revisit only if reality contradicts them.

- [ ] **Cache eviction for very large scrolls** — *Assumption: keep all loaded pages in v1; add LRU only if memory becomes a measured problem.*
- [ ] **Window page size** — *Assumption: reuse `settings.perPage`; consumers needing fewer requests raise `perPage`. No dedicated virtual window size in v1.*

---

## Technical Notes (Issue-Specific)

- The WC distinguishes flat-window mode by `_virtualScroll && !_tree && isExternallyPaged()` (`isExternallyPaged()` = `_totalRecords > _data.length`). When `totalRecords ≤ perPage` it falls back to the existing trivial flat mapping (no placeholders).
- `el.autoSort` is already `false` in fetch mode (wrapper `:286`), so the flat-window branch does **not** client-sort — server-side sort owns ordering. Sort changes go through `invalidateData()` + page-1 refetch.
- The `mp-datatable-fetch-request` event already carries `{ parentId, page, perPage, sortColumns }`; flat windows set `parentId: null` + a real `page`. The wrapper's `onFetchRequest` already maps `parentId ?? undefined` into the `[fetch]` request, so the bridge needs only the page-cache forwarding branch.

---

## Related
- Issue #385
- Blocks: MintPlayer.Spark #178 (`docs/issue_178_PRD.md` in the Spark repo, Status: Blocked by ngbootstrap#385)
- See CLAUDE.md for: WC authoring (`observedAttributes` static getter, codegen-wc after SCSS edits), hand-written framework wrappers, `CUSTOM_ELEMENTS_SCHEMA` bridging.
