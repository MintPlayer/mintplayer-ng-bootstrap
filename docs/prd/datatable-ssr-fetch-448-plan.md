# Plan — Datatable: server-side filtering + SSR / hydration / transfer state (#448)

PRD: [datatable-ssr-fetch-448.md](./datatable-ssr-fetch-448.md) (decisions D1–D10 in §12)

Status: **S1–S5 and M1–M8 done** (2026-10-30) on `feat/448-datatable-ssr-fetch`, targeting
`master`; spike results in `spikes/issue-448/`. M9 (sweep + PR) in progress; M10 (Spark) waits for the
publish. Everything in this repo lands in **one PR**. The Spark work (M10) follows the
publish in the Spark repo, as the same unit of work.

Spike artifacts go in `docs/prd/spikes/issue-448/`, one short `S<n>-*.md` per spike, recording what
was measured, where, and the decision it settles. Each spike is a throwaway prototype of at most a
few files, measured against a server render of the demo (`curl` the SSR HTML, then the
`playwright_node` MCP for hydration). Test suites run **once**, in M9.

| Milestone | Scope |
|---|---|
| S1–S5 | Server await per front, keys and escaping, hydration equality, timeout and payload, custom slot and demo mapping |
| M1 | Core, filters: `canonicalize` (named errors), `DatatableFilters`, the two-way `filters` model (removing the column seed and `filterChange`), `fetchParams`, `filters`/`params` on fetch, window, child and distincts requests, the key `{s,pp,p,f,q}`, change → page 1 + invalidate + reload, custom mode through the model, the `'datetime'` editor (UTC instants, DST read-back) |
| M2 | Core, SSR: `fetchPage` extracted from `attach`, `fetchedKey`, `state(inputs, seed)`, `stateKey`, `prefetch`, `transferKey` |
| M3 | `ui-core/transfer-state`: `TransferStore`, `serializeTransferState`, `readTransferState`, `runPrefetch` (timeout, abort, warnings); `ComponentCore.prefetch`/`transferKey` in `ui-core/component` |
| M4 | Angular bridge: `PendingTasks` + `TransferState`, `provideMachineSsr({ prefetchTimeout })`, one-shot read, missing-`stateKey` dev warning |
| M5 | Vue bridge (`onServerPrefetch`, the `mpTransferState` plugin). React bridge (`use()` + Suspense per S1, `MpTransferStateProvider`) |
| M6 | API: filter-aware search and distincts (`DatatableFilters` → `QueryRequest`, comparison included), `TreeItemsController` filters |
| M7 | Demos (ng, React, Vue): filterable fetch tables with `[(filters)]`, `fetchParams` (a search box), a `stateKey` SSR page, `#mp-state` emitted in the React/Vue `entry-server`, a datetime column |
| M8 | Specs: core unit, `runPrefetch`, bridge SSR and CSR specs, `*.aria.spec.ts` (seeded, filter reload, datetime editor), e2e; CHANGELOG `### Breaking`; versions; datatable docs (filter semantics, SSR how-to, the entry-server snippet) |
| M9 | One verification sweep, push once, open the PR; release after the merge |
| M10 | **Spark** (`C:\Repos\MintPlayer.Spark`, after the publish), PRD §10.2: bump the packages; the datatable owns the filters (`requestFor`/`distinctsFn` map `request.filters` + `params`; drop the `filters()` signal and the reload effects); presets → `[(filters)]`; `[fetchParams]`; `stateKey` on non-live grids; full comparison filters (DTO, RavenDB clauses, type → `filterInputType`, the custom UI); server-side `fetch` answered by Spark's own pipeline service (the caching layer between `IDatabaseAccess` and the middleware), virtual grids included; verify `/query/songs` (paged, virtual, filtered URL) with JS off and with hydration |

M1 is independent of SSR and comes first. The SSR milestones depend on it, because filters and
params are part of the transfer key.

## Spikes (run first)

### S1: awaiting on the server, per front (D5)
- **Angular:** in a zoneless `renderApplication`, put a 300 ms promise in `PendingTasks.run()` from
  a field initializer. Confirm that the HTML waits for it, that a `TransferState.set` inside the
  task appears in the `{APP_ID}-state` script, and that a set after the task does not.
- **Vue:** `onServerPrefetch` inside a composable of a generated component. Confirm that
  `renderToString` awaits it and that the `shallowRef` update reaches the HTML.
- **React 19:** `renderToPipeableStream` + `onAllReady`, with `use()` on a promise cached per
  request under `transferKey`, inside a bridge-added Suspense boundary. Check that the boundary
  resolves with rows and that hydration does not re-suspend. If it does, prototype the two-pass
  fallback instead.

### S2: keys and escaping (D3)
- Angular, two fetch tables, one with a client-only component above it: `BsIdService` keys shift,
  while `stateKey` + request-hash keys hit.
- `serializeTransferState`: a row containing `</script><!--` and U+2028 round-trips.

### S3: hydration equality
- For each framework, in paged and `virtualScroll` mode, with `[(filters)]` set and `fetchParams`
  set:
  1. **With hydration:** the first client frame equals the server DOM (diff `outerHTML`), no
     `Loading…`, 0 page-1 fetches.
  2. **Without hydration** (Angular without `provideClientHydration`, Vue/React
     `createApp`/`createRoot` over the SSR HTML): the seed is read, no `Loading…`, 0 fetches.
  3. **CSR only:** exactly one fetch.
  4. **Key mismatch:** exactly one fetch and no hydration error.
- **Decides** whether `fetchedKey` is enough, or more of the snapshot needs seeding.

### S4: timeout and payload (D6)
- An `HttpClient` `fetch` on the 141-row shape, page size 10. Measure the render time with a 2 s API
  and with a failing API, against 1/3/5 s timeouts, and confirm the per-abort warning.
- Measure the HTML size with the HTTP transfer cache alone, with the seed alone, and with both, for
  the `transferCache: false` doc note.

### S5: custom slot and demo mapping
- The `bsDatatableFilter` slot context can apply a selection through the core, so that it lands in
  the `filters` model.
- `DatatableFilters` → `QueryRequest` (`apps/api/QueryBuilder/Expression.cs`) for values, inverse,
  number, date and datetime comparisons, losslessly.
- The Angular demo's artists source (`artist.service.ts:21-30`, a Spark query): either it takes
  filters, or the demo moves to the demo API.

## Milestone notes

- **M1:** grep the demos for `filterChange`/`filterSelection` and migrate every use in M7, because
  the build breaks on removed API, which is intended.
- **M2:** moving the closure state must keep the `generation`/`abort` superseding exactly. The
  existing datatable unit specs guard it, in M9.
- **M3–M5** touch `ui-core/component`, the new `ui-core/transfer-state` entry and `machine/` in each
  lib. After the input and model changes, rerun `nx run mintplayer-ui-core:compile-components` and
  `nx run mintplayer-web-components:cem --skip-nx-cache`. Extend the conformance import lists if a
  new entry needs it.
- **M8:** add a CLAUDE.md gotcha if a spike turns up a non-obvious trap (for example "zoneless SSR
  waits only on `PendingTasks`; TransferState is serialized after `whenStable`").
