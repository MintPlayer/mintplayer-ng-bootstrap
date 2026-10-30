# PRD — Datatable: server-side filtering in `[fetch]` mode, and SSR + hydration + transfer state (#448)

- **Status:** Grilled 2026-10-30, decisions D1–D10 (§12). Spikes S1–S5 confirm the remaining
  mechanics before M1.
- **Issue:** [#448](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/448)
- **Packages:**
  - `@mintplayer/ui-core`:
    - `component`: the `prefetch` and `transferKey` hooks
    - `datatable`
    - `transfer-state` (new: the framework-neutral store, the serializer and `runPrefetch`)
  - the machine bridges: `@mintplayer/ng-bootstrap/machine`, `@mintplayer/react-bootstrap/machine`
    and `@mintplayer/vue-bootstrap/machine`
  - the datatable fronts (generated, so they change only through inputs and models)
  - the demos (ng, React, Vue) and `apps/api`
  - MintPlayer.Spark (§10), released after this package is published
- **Related:**
  - #412 (SSR + web components)
  - #385 (lazy virtual fetch)
  - [headless-catalog-437.md](./headless-catalog-437.md)
  - Spark `docs/spark_ssr_PRD.md`
- **Plan:** [datatable-ssr-fetch-448-plan.md](./datatable-ssr-fetch-448-plan.md)
- **One unit of work.** No backward compatibility: no shims and no deprecations (D1).

## 0. Summary

1. **Filtering is always server-side in `[fetch]` mode.**
   - The active filters are a two-way `filters` model (D9), and they are sent on every request:
     paged, virtual-window, tree-children and distincts (other columns only).
   - They are part of the request key, and a change resets to page 1 and reloads.
   - Filters travel as `FilterSelection` without labels (D1).
   - Outside query context (search, parent, flags) travels as a JSON-only `fetchParams` (D2).
   - Date-time comparisons are UTC instants, and calendar dates are a separate type (D10).
2. **The datatable copes with all three render modes:**

   | Mode | First page |
   |---|---|
   | CSR | The browser fetches on attach |
   | SSR + hydration | With a `stateKey` (D3), the server fetches, the result goes into transfer state, and the client seeds from it: the same DOM, no `Loading…` frame, no second request |
   | SSR without hydration | Same as above. Transfer state is still read |

   Without a `stateKey`, server and client both render the loading state, and a development
   warning appears. The prefetch, its timeout and the transfer are **generic**: they work for any
   component and live in the bridges and `ui-core/transfer-state` (D5, D6), not in the datatable.

## 1. Problem (verified against `master` @ `b5983c26`)

### 1.1 Filters in fetch mode

- **The filter model** is in `datatable/src/types/filter.ts`:
  - modes: `values | comparison | custom` (:72)
  - operators: `eq | neq | lt | lte | gt | gte` (:75)
  - input types: `number | date` (:88)
  - `FilterSelection`: `{ values: DistinctValue[], inverse, operator?, operand? }` (:91-103)

  The column definitions carry a `filterSelection` seed (`types/column-def.ts:49-74`). State holds
  `filterSelections` (`datatable.core.ts:134-149`), and `filterSelectionOf` (`datatable.ts:473`)
  merges them.
- **The table never filters** (`datatable.core.ts:748-749`). `applyFilter` and `compareFilter`
  (:781-808) write state and emit `filterChange`, and nothing else.
- **Fetch mode ignores filters.** `DatatableFetchRequest` (`types/tree.ts:24-36`) is
  `{ parentId, page, perPage, sortColumns, signal }`. Neither the request (:397-398) nor the reload
  key (:466) contains filters. A filter change never calls `scheduleReload`, which runs only on
  sort, page, perPage and input changes (:578, :586, :594, :1167-1217).
- **Distincts** (:764-780, `SupersedingRequest` :750) are the only source in fetch mode
  (:759-762). They do not carry the other columns' filters.
- **Virtual windows and tree children** (:416, :434) use the same `request()`, without filters.
- **Demos:** all filter demos use `[data]` and filter the array themselves. No fetch demo filters.
  The demo API's `QueryRequest` (`apps/api/QueryBuilder/Expression.cs:39-46`) already takes an
  expression tree.

### 1.2 SSR of the first page

- **The first fetch exists only inside `attach`.** The closure locals `generation`, `abort`,
  `lastKey`, `reloadQueued`, `pendingPages` and `pendingChildren` are at `datatable.core.ts:380-385`,
  and the first `scheduleReload()` is at :1167.
- **Every front attaches only after mount:**
  - Angular: `afterNextRender` (`ng-bootstrap/machine/src/core.ts:107-111`)
  - React: `useEffect` (`react-bootstrap/machine/src/core.ts:59-61`)
  - Vue: `onMounted` (`vue-bootstrap/machine/src/core.ts:70-73`)
  - Lit: `hostConnected`

  The React and Vue demos server-render too.
- **The server snapshot is a loading table.** It starts at `fetched: null` (:271), the view derives
  `loading` from that (:318), and the pager reads `totalRecords ?? rows.length`
  (`datatable.ts:215,221`).
- **The only server-side core hook is the synchronous `state(inputs)`**
  (`component/src/component.ts:114`).
- **Angular has no stable instance id.** `BsIdService` is a root-wide counter
  (`a11y/src/service/id.service.ts:13-19`). `HttpTransferCache` keys by request
  (`@angular/common/fesm2022/http.mjs:181-197`).
- **The facts the design relies on:**
  - Angular `TransferState` is `providedIn: 'root'`, and it works without hydration (it is just
    empty under CSR).
  - It is serialized in `BEFORE_APP_SERIALIZED` after `whenStable()`, and `whenStable()` waits on
    `PendingTasks` (`@angular/platform-server/fesm2022/platform-server.mjs:109,162-191`).
  - Vue and React have no client channel of their own, and neither demo serializes state today.
- **The datatable is the only core that loads data at mount.** Tree-select, treeview and
  file-manager load on expand or open, and typeahead while typing.

## 2. Goals

- G1. In `[fetch]` mode, every request carries the active filters and `fetchParams`, and every change
  to either resets to page 1 and refetches. Nothing is filtered locally.
- G2. CSR works, with no server involvement at all.
- G3. With a `stateKey`, the server HTML (Angular, React, Vue) contains the first page and the
  correct pager, for any filters, sort, `fetchParams`, paging or virtual mode.
- G4. With a `stateKey`, hydration and a destructive re-render both show no `Loading…` frame and no
  second request for the same key.
- G5. A slow, failed or aborted server fetch never hangs the render or poisons the client. The
  timeout is generic.
- G6. Without a `stateKey`, server and client agree on the loading state, and development warns
  about it.

## 3. Non-goals

- Client-side filtering in `[fetch]` mode.
- `[data]` mode filtering. The consumer still filters its own array, now driven by the `filters`
  model.
- Server-rendering deeper virtual windows, expanded children or the distinct lists.
- Lit SSR. The Lit front gets the inputs and the models, and no server path.
- How a consumer *answers* `fetch` on the server: caching, in-process execution, prediction (D7).

## 4. Design: server-side filtering

### 4.1 The request

```ts
type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

interface DatatableFetchRequest<P extends JsonValue = JsonValue> {
  parentId?; page; perPage; sortColumns; signal;
  filters: DatatableFilters;          // only active filters, without labels (D1)
  params: P | undefined;              // fetchParams, verbatim (D2)
}
interface DistinctsRequest<P extends JsonValue = JsonValue> {
  column; search; signal;
  filters: DatatableFilters;          // the OTHER columns' active filters (facets)
  params: P | undefined;
}
type DatatableFilters = Record<string, {
  values: JsonValue[];                // DistinctValue.value only, no labels
  inverse: boolean;
  operator?: FilterOperator;
  operand?: string | number;          // see D10 for the date and datetime encodings
}>;
```

The semantics are documented in the TSDoc and in the datatable docs:
- value equality;
- `inverse` means "not one of";
- how a null value is represented;
- `comparison` uses `operator` + `operand`, and `values` is empty in that case;
- `'number'` operands are numbers;
- `'date'` operands are `yyyy-mm-dd` calendar dates;
- `'datetime'` operands are UTC instants (D10).

### 4.2 One canonicalizer

- `canonicalize(value)` is a pure function: keys sorted, empty selections dropped. It **throws a
  named error** on a function, symbol, bigint, `Date`, class instance (any non-plain prototype) or
  cycle, and names the path (`fetchParams.filter.since is a Date`) (D2).
- One request key, `canonicalize({ s, pp, p, f, q })`, drives three things:
  - the reload de-duplication (`lastKey`);
  - the seeded `fetchedKey`;
  - the transfer key.

  So de-duplication, SSR and hydration cannot disagree.

### 4.3 Behaviour

- **A change** of `filters` (from the UI or from the model) or of `fetchParams`:
  1. reset to page 1;
  2. `invalidate()` the page, child and window caches (virtual mode scrolls to the top);
  3. `scheduleReload()`.
- **`filters` is a two-way model (D9):**
  - Angular `[(filters)]`, Vue `v-model:filters`, Lit property write-back, React `filters` +
    `onFiltersChange`.
  - It replaces the column `filterSelection` seed and the `filterChange` event, both of which are
    removed.
  - The core emits through `api.setState({ filters })`.
- **`filterMode: 'custom'`** slots write through the core's apply API into the model, like any other
  mode. S5 verifies the slot context exposes this.
- **`filterInputType: 'datetime'`** (new, D10): a `datetime-local` editor whose value is converted to
  a UTC ISO instant when the filter is applied. A DST gap resolves forward, an overlap resolves to
  the earlier instant (JavaScript semantics), and the editor shows back the value that was applied.

## 5. Design: SSR + hydration + transfer state

### 5.1 Core seeding

- `fetchPage(fetch, request) → Promise<{ fetched, totalRecords, fetchedKey }>` moves out of the
  `attach` closure. `attach` keeps the generation and abort superseding, the announcer and `failed`.
- The snapshot gains `fetchedKey`. `attach` initializes `lastKey` from it, so the attach-time
  `scheduleReload()` returns early when the seed already answers the current key. `reload()` and a
  new `fetch` still clear it.
- `state(inputs, seed?)` starts at `{ fetched, totalRecords, fetching: false, fetchedKey }` when a
  seed is supplied.

### 5.2 Generic contract (`ui-core/component` + `ui-core/transfer-state`)

```ts
interface ComponentCore<I, S> {
  /** Server only. Resolves to a JSON seed, or undefined when there is nothing to prefetch. */
  prefetch?(inputs: I, signal: AbortSignal): Promise<JsonValue> | undefined;
  /** Request-identity key. Undefined = no prefetch and no transfer (D3). */
  transferKey?(inputs: I): string | undefined;
}
```

- **The datatable:**
  - `transferKey` is `mp-dt:${stateKey}:${hash(requestKey)}` when `stateKey` and `fetch` are set,
    and `undefined` otherwise.
  - `prefetch` returns the first page for the inputs' page, perPage, sort, `filters` and
    `fetchParams`.
- **`runPrefetch(core, inputs, { timeout, signal })`** is shared by all bridges (D6):
  - It creates the abort signal (`AbortSignal.any` of the timeout and the render's own abort).
  - It awaits the prefetch and writes the result to the store under `transferKey`.
  - On a timeout, rejection or abort it writes **nothing**, logs a server warning that names the
    component and its key, and resolves. The server then renders the loading snapshot and the client
    fetches normally.
- **The store:**
  - `TransferStore { get, set, remove, toJson }`.
  - `serializeTransferState(store)` escapes `<`, `>`, `&`, U+2028 and U+2029.
  - `readTransferState(doc, id = 'mp-state')`.
- **Client reads are one-shot:** the seed is removed once it has been consumed. So a later
  client-side navigation to the same route fetches fresh data, in the same way that Angular's HTTP
  transfer cache stops answering once the app is stable.
- **Missing `stateKey`:** the core reports it, and the bridge logs once per table in development on
  the server: "fetch datatable rendered without data on the server: set stateKey".

### 5.3 Bridges

| Front | Server: await | Store | Client: read |
|---|---|---|---|
| Angular | `inject(PendingTasks).run(() => runPrefetch(...))` in `useCore` when `isPlatformServer` | `TransferState` (`makeStateKey`) | `TransferState.get(key, null)` in `seed()`, then `remove` |
| Vue | `onServerPrefetch(() => runPrefetch(...))` in `useMachine` | the `mpTransferState` plugin (a per-request `TransferStore`) | the plugin reads `#mp-state` once at startup |
| React | `use()` on the promise cached in the per-request store under `transferKey`, inside a Suspense boundary the bridge adds (fallback: the loading snapshot) (D5) | `MpTransferStateProvider` | the provider reads `#mp-state` once at startup |
| Lit | — | — | — |

- **Timeout setting (D6):** one app-level value on the provider that owns the store:
  - Angular `provideMachineSsr({ prefetchTimeout })`
  - the Vue plugin option
  - an `MpTransferStateProvider` prop

  The default is 3000 ms, with S4 to confirm it. No component has its own timeout.
- **Vue and React apps** emit `serializeTransferState(store)` through `entry-server`'s
  `<!--app-head-->` slot, as `collectScopedStyles` already does. The demos show it, and the docs
  give the snippet.
- **React fallback:** if S1 shows hydration re-suspending, or a mismatch from the boundary fallback,
  React switches to a two-pass render. It does not drop SSR.

### 5.4 Inputs and models (the complete new surface)

| Name | Kind | Meaning |
|---|---|---|
| `filters` | two-way model | The active filters, in the `DatatableFilters` shape (D9) |
| `fetchParams` | input, `JsonValue` | Consumer query context: sent in every request, part of the key, a change means page 1 + reload (D2) |
| `stateKey` | input, `string` | Names the data source, and turns on the SSR prefetch and the transfer (D3) |

**Removed:** the column `filterSelection` seed and the `filterChange` event (D9). `ssrFetch` and
`initialResult` are not added (D4).

## 6. Edge cases

- **Key mismatch between server and client** (for example a client-only `perPage` or filters
  restored in the browser): the transfer lookup misses, the client renders the server DOM first, and
  then fetches exactly once. S3 verifies there is no hydration error.
- **Same `stateKey` and same request on two tables:** they share one entry. This is harmless,
  because the payload is identical.
- **Payload duplication with Angular's HTTP transfer cache:** the docs suggest the per-request
  `transferCache: false` on the consumer's `fetch`. Whether to use it is the consumer's choice (D7).
- **The announcer:** a seeded page announces nothing. Only client loads announce.
- **Seeds and `aria-busy`:** a seeded table renders no `aria-busy` and no loading row.

## 7. Accessibility

There is no new interactive surface apart from the `datetime` editor. That editor is a native
`datetime-local` input, labelled like the `date` editor, and its applied-value read-back is
associated with it through `aria-describedby`.
- `aria-busy` follows `fetching` on a filter-driven reload, and the result count is announced once.
- Add `*.aria.spec.ts` cases for the seeded state, a filter reload and the datetime editor.

## 8. Testing

- **Core unit:**
  - `canonicalize`: key order, dropped empties, and the named errors for each rejected type.
  - The key includes `f` and `q`.
  - A filter, model or params change → page 1 + exactly one fetch with `filters` and `params`.
  - Distincts carry the other columns' filters and `params`. Window and child requests carry both.
  - Datetime conversion, including DST gap and overlap cases.
  - A seed means no fetch on attach, and a key mismatch means one fetch.
  - `transferKey` is `undefined` without a `stateKey`.
- **`runPrefetch`:** a timeout, a rejection and an abort each write nothing and warn once.
- **Bridges:**
  - Angular: `renderApplication` → rows and pager in the HTML, and the key in the state script.
    Bootstrapping the client over that HTML makes 0 `fetch` calls. CSR without the script makes 1.
  - Vue and React: the same, through `readTransferState`.
- **E2E (ng, React, Vue):**
  - The server HTML has rows.
  - No `Loading…` frame, measured with a MutationObserver from document start.
  - The network shows 0 page-1 fetches.
  - A filter or `fetchParams` change → one request containing it, the page goes back to 1, and the
    pager is updated.

## 9. Breaking changes (CHANGELOG `### Breaking`)

- `[fetch]` requests carry `filters` and `params`, and the table reloads on filter and params
  changes. Remove any `filterChange` → refetch wiring.
- The column `filterSelection` seed and the `filterChange` event are removed. Use the
  `[(filters)]` model.
- `DatatableFetchRequest` and `DistinctsRequest` gain required fields.
- `fetchParams` and `filters` must be JSON. Anything else throws a named error.

## 10. MintPlayer.Spark (the consumer, the same unit of work, after the publish)

Spark's query grids must run fully featured on this datatable: server-side filtering (values **and**
comparison), sorting, paging and virtual scrolling, server-rendered and hydrated. Spark consumes from
npm (`@mintplayer/ng-bootstrap ^22.29.0`, `@mintplayer/ui-core ^1.2.0`), so this package is published
first.

### 10.1 Today (read 2026-10-30)

- **The grid:** `ng-spark/grid/src/spark-query-grid.component.html:61-79`, plus a second instance in
  the reference picker (`po-form/src/spark-reference-picker.component.html:41`). Columns use
  `filterMode: 'custom'` and a `bsDatatableFilter` slot (html:93).
- **Spark owns the filter state outside the table:**
  - `onFilterChange` (ts:1081-1119) converts selections into `QueryColumnFilter`
    `{Name, Includes[], Excludes[]}`, including the `< none >` complement, and keeps them in a
    `filters()` signal (ts:1011).
  - `onFilterChanged` (1130-1134) reloads.
  - `requestFor` (1310-1316) adds `search` and the columns.
  - Effects refetch when search or presets change (846-869).
  - `distinctsFn` (1040-1070) merges the context itself.
- **The backend:** `ExecuteQueryRequest` (`QueryRequests.cs:27-79`) and `DistinctValuesRequest`
  (82-120) already accept column filters. `QueryExecutor.ApplyColumnFilters` (:1017-1019) applies
  them. `QueryColumnFilter` has no comparison operators.
- **SSR:** see `docs/spark_ssr_PRD.md`.
  - The .NET supplier predicts responses up front. `SparkServerBackend` answers from that map, keyed
    by `METHOD path canonicalJson(body)`, and a miss is an error (D3 there) → the loading state.
  - Virtual-scroll and live grids are not predicted (`SparkRoutesPrerenderContributor.cs:162`).

### 10.2 Target

- **The datatable owns the filter state.** Spark removes its `filters()` signal, the filter, search
  and preset reload effects, and the context merging in `distinctsFn`.
  - `requestFor` and `distinctsFn` map `request.filters` → `QueryColumnFilter`. `inverse` becomes
    `Excludes`, and the `< none >` complement is computed here.
  - `request.params` carries `{ search, parentId, parentType, deleted, parentDeleted }` through
    `[fetchParams]`.
- **URL presets** bind as `[(filters)]`.
- **`stateKey`** is set on every non-live grid (the query id plus the parent context). Live grids
  (`/spark/live`) bind no `stateKey`.
- **Comparison filters, full support (D8):**
  - `QueryColumnFilter` gains `Operator` + `Operand`, and `ApplyColumnFilters` builds RavenDB
    comparison and range clauses.
  - Attribute type → `filterInputType`: numeric → `number`, `DateOnly` → `date`,
    `DateTime`/`DateTimeOffset` → `datetime`, compared as instants (D10).
  - Spark's custom filter UI handles comparison columns.
- **SSR data is Spark's own concern (D7).** Spark makes server-side `fetch` calls answerable
  reliably in its own pipeline, through a service between `IDatabaseAccess` and the Spark middleware
  in the single PersistentObject/query pipeline (for example a Redis-backed cache). It does not rely
  on reproducing the datatable's request body in C#. This includes virtual-scroll grids. The
  datatable sets no requirement on the mechanism. It only calls `fetch` on the server and transfers
  what comes back.
- **Transfer de-duplication** is up to Spark, for example the per-request `transferCache: false`
  on the grid's execute call.

## 11. Remaining spike questions

- S1: Angular `PendingTasks` from a field initializer, Vue `onServerPrefetch` inside a composable,
  React `use()` under Suspense with `onAllReady` (otherwise the two-pass fallback).
- S2: `stateKey` + request-hash keys stay stable when an earlier client-only component exists; the
  escaping round-trip.
- S3: hydration equality, in paged and virtual mode, with filters, with and without hydration, CSR,
  and a key mismatch.
- S4: the timeout default against a slow API (2 s) and a failing one; the payload size with and
  without the HTTP transfer cache.
- S5: the custom-filter slot writes through the model; `DatatableFilters` → the demo API's
  `QueryRequest`; whether the Angular demo moves off the Spark artists source.

## 12. Decisions (grilled 2026-10-30)

| # | Decision |
|---|---|
| D1 | The wire format is `FilterSelection` without labels, keyed by column. Each consumer maps it. No backward compatibility anywhere in this work |
| D2 | `fetchParams` is an opaque `JsonValue` that is part of the request and the key, and a change means page 1 + reload. A runtime canonicalizer throws named errors on non-JSON values (functions, `Date`, class instances, cycles) |
| D3 | `stateKey` turns on the SSR prefetch and the transfer. Without it, both sides render the loading state, with a one-time development warning on the server. No automatic key, and no `useId` fallback |
| D4 | `ssrFetch` and `initialResult` are dropped. `stateKey` is the whole SSR surface |
| D5 | React awaits with `use()` under a bridge-added Suspense boundary. The fallback is a two-pass render, never dropping SSR |
| D6 | The prefetch timeout works for any component: `runPrefetch` in the shared layer, one app-level setting (default 3000 ms, S4 to confirm), a warning per abort, nothing transferred on an abort |
| D7 | The datatable does not care how `fetch` is answered on the server. Spark solves that in its pipeline (a caching service between `IDatabaseAccess` and the middleware) |
| D8 | Spark gets full comparison filter support (operators, operands, RavenDB clauses, type mapping, the UI) in this unit of work |
| D9 | `filters` is a two-way model that replaces the column seeds and `filterChange`. Empty selections are dropped |
| D10 | Date-time comparisons are instants, the same for every user. The new `'datetime'` type sends UTC ISO 8601 (`…Z`). `'date'` stays a calendar `yyyy-mm-dd` |
