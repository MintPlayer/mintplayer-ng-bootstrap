# Product Requirements Document: WC-owned `fetch` callback for `<mp-datatable>`

**Issue**: #386
**Title**: WC owns the server-fetch loop via a `fetch` callback (drop consumer phantom wiring + the `totalRecords` prop; work standalone)
**Status**: Complete
**Created**: 2026-06-07
**Last Updated**: 2026-06-07

---

## Summary

`<mp-datatable>` now owns the entire server-paged loop behind a single `fetch` callback. A consumer sets `el.fetch = (req) => Promise<{ data, totalRecords }>` and nothing else — the web component loads page 1, derives the grand total from the response, fetches each window/child on demand as rows scroll into view, paginates, and reloads on sort/perPage. This replaces the previous design where the consumer (or each framework wrapper) had to seed page 1 via `data`, set a separate `totalRecords` property, bridge the `mp-datatable-fetch-request` event to `setFetchResponse()`, and call `invalidateData()`/`invalidateChildren()` on sort. All of that "phantom wiring" is gone. The component is brand new, so **no backward-compatibility layer was kept** — there is exactly one server-paging contract.

---

## Decisions and the "why"

### 1. The WC owns the fetch loop via a `fetch` callback (not an event + `setFetchResponse`)
**Why:** the previous event-bridge made *every* consumer re-implement the same orchestration — and a framework-less / Rollup consumer had to write all of it by hand. Moving the loop into the WC means the orchestration exists once, in the one place that already knows the viewport, the caches, and the page math. The wrappers collapse to forwarders (`el.fetch = fn`); a vanilla consumer writes one line. The callback is a property (like `rowKey`/`columns`), so `@lit/react` forwards it for free and Vue assigns it in `syncProps` — no per-framework event plumbing.
**Rejected:** keeping the event + `setFetchResponse` as the primary API (forces the bridge on everyone); keeping it as a *secondary* fallback (dual code paths to maintain on a brand-new component with no consumers to protect).

### 2. `totalRecords` is derived from the response, never set by the consumer
**Why:** every paginated API already returns the total alongside the rows. Requiring the consumer to *also* hand it to the component as a separate property was redundant — "bogus," in the reviewer's words. The only reason it used to be separate is that page 1 entered through the `data` setter, which carries rows but no total. Now that the WC makes the page-1 call itself, it reads `totalRecords` straight off the response. The public `totalRecords` **setter was removed**; a read-only getter remains so a consumer can display "row X of N".
**Rejected:** a consumer-set `totalRecords` input (redundant with the response); inferring the total by scrolling to the end (infinite-scroll — loses random access and an accurate scrollbar, the very things #385 windowing provides).

### 3. The web component must work standalone (vanilla + Rollup)
**Why:** `<mp-datatable>` is a framework-agnostic Lit element; not every consumer uses Angular/React/Vue. The server-paged experience has to be first-class with no framework: `el.fetch = fn` is the whole API. The WC unit tests exercise exactly this path (`document.createElement('mp-datatable')` + `el.fetch`), so "works standalone" is a tested guarantee, not an aspiration.

### 4. Selection-change emits the selected **row objects**, not just ids
**Why:** once the WC owns the data, the consumer no longer holds the rows to resolve `selectedIds → row objects` itself (the old Angular wrapper did this from its private `currentData` copy, which would now always be empty). The WC has every loaded row (page 1 + windows + children), so it resolves ids → rows in one pass and emits `selectedRows` on `mp-datatable-selection-change`. This is the one deliberate **public event-contract change**; it's additive (`selectedIds` stays).
**Rejected:** leaving selection id-only and making each wrapper keep a shadow copy of the data (defeats the point of WC ownership; breaks cross-window selection).

### 5. Direct callback calls, no internal event round-trip
**Why:** the windowing/child machinery used to *dispatch* `mp-datatable-fetch-request` so an external bridge could answer it. With the WC owning `fetch`, it just calls the callback directly where it used to dispatch — fewer moving parts, no event/`setFetchResponse` ceremony, and the requested-page key (the #385 deadlock guard) lives inside the WC instead of relying on the wrapper to echo it.

### 6. Reloads are coalesced (microtask + change-key) and stale responses are dropped (generation token)
**Why:** sort/perPage/page changes arrive *both* as user actions (header click, footer) *and* as echoed property pushes from a framework's two-way binding. Without coalescing, one logical change triggers several fetches. A microtask debounce plus a `{sort, perPage, page}` change-key collapses the burst into one reload and makes echoes no-ops. A generation token, bumped on every invalidation, drops in-flight responses that resolve after a newer sort — so a slow page-1 from the old sort can't clobber the new window.

### 7. `fetch` implies server-side sort (`autoSort = false`); static `data` still supported
**Why:** when a server is paging, it also sorts — the WC must not re-sort the one page it holds. Setting `fetch` flips `autoSort` off automatically. Static in-memory tables (`el.data = [...]`, no `fetch`) are unchanged: client sort + client pagination, `totalRecords` defaults to `data.length`.

---

## Public API (after)

```ts
type DatatableFetchRequest  = { parentId: unknown | null; page: number; perPage: number; sortColumns: SortColumn[] };
type DatatableFetchResponse<T> = { data: T[]; totalRecords: number };
type DatatableFetch<T> = (req: DatatableFetchRequest) => Promise<DatatableFetchResponse<T>>;

// vanilla:
const el = document.querySelector('mp-datatable');
el.columns = [...];
el.fetch = async ({ parentId, page, perPage, sortColumns }) => {
  const r = await api.list({ parentId, page, perPage, sortColumns });
  return { data: r.items, totalRecords: r.totalCount };
};
// nothing else.
```

**Removed** (no backward compat): `mp-datatable-fetch-request` event, `setFetchResponse()`, `invalidateData()`, `invalidateChildren()`, the `totalRecords` **setter**, and the `TreeFetchRequestDetail` / `TreeFetchResponse` types. `parentId === null` = a root window (flat rows or the tree's top level, pages ≥ 2 windowed); non-null = a node's children — branched on inside the WC.

## Wrappers (now forwarders)

- **Angular** (`bs-datatable`): `[fetch]` → `el.fetch`. Removed `runVirtualFetchFirst`/`runFetch`/the `onFetchRequest` bridge/the `totalRecords` signal/invalidate-on-sort. Kept `[(settings)]` two-way binding + static `[data]`; `[(selection)]` now reads `detail.selectedRows`.
- **React**: pure `@lit/react` passthrough; `fetch` forwards as a property. Removed the dead `onFetchRequest` event.
- **Vue**: forwards one `fetch` prop in `syncProps`; removed the `fetchRequest` emit and the `setFetchResponse`/`invalidate*` exposes.

## Out of Scope

- Re-introducing an event-based fetch path (explicitly removed; one contract only).
- The Spark-blocking #385 windowing machinery itself — this PRD is the ownership/ergonomics layer on top of it.

## Versions

`@mintplayer/web-components` → **2.0.0** (breaking public-API redesign). Wrappers track their framework major and bump minor with a `^2.0.0` peer floor: `@mintplayer/ng-bootstrap` 22.4.0, `@mintplayer/react-bootstrap` 19.6.0, `@mintplayer/vue-bootstrap` 3.7.0.

## Related
- Issue #386 (this), built on #385 (lazy windowed fetch machinery)
- Unblocks the ergonomics for MintPlayer.Spark query-pages (the real consumer of windowed server paging)
