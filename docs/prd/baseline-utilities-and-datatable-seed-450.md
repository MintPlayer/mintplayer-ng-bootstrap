# PRD: lost Bootstrap utilities and the datatable seed's missing metadata (#450)

Issue: [#450](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/450). Both defects shipped in
#439 (headless catalog, ng-bootstrap 22.30.0 / ui-core 1.3.0) and #449 (datatable SSR seed). Plan:
[baseline-utilities-and-datatable-seed-450-plan.md](./baseline-utilities-and-datatable-seed-450-plan.md).

## 1. The baseline dropped six Bootstrap classes

### What was measured

Compiling stock `bootstrap/scss/bootstrap.scss` and `@mintplayer/ui-core/styles/bootstrap.scss` and
diffing their class selectors gives exactly six classes Bootstrap ships and the baseline does not:

| Lost | Patch | Cause |
|---|---|---|
| `.w-25` `.w-50` `.w-75` `.w-100` | `utilities/width.scss` | `"width": (values: auto, responsive: true)` replaces Bootstrap's entry whole |
| `.text-wrap` `.text-nowrap` | `utilities/white-space.scss` | `"white-space": (values: …)` replaces Bootstrap's `class: text` entry, so the classes become `.white-space-*` |

`overflow.scss` also replaces Bootstrap's `"overflow-x"`, but its list is a superset of Bootstrap's
(`auto hidden visible scroll`), so nothing is lost. `cursor.scss` adds a key Bootstrap does not have.

### Why it only broke now

The patches have been wrong since 2023. Before #439, the Angular `_bootstrap.scss` ran the utility
API **twice**: `@import "bootstrap/scss/bootstrap-utilities.scss"` came first and emitted Bootstrap's
full set, the patches were imported after it, and `utilities/api` ran again at the end with the
patched map. The first pass hid every value the second one lost. #439 moved the stack into
`ui-core/styles/_bootstrap-stack.scss` and ran the API once (no duplicate utilities in the CSS), so
the patched entries became the only ones. No spec compiled the stack, so nothing compared the output
with Bootstrap's.

### Decisions

- **D1.** A patch that changes a Bootstrap key merges into Bootstrap's entry
  (`map.merge(map.get($utilities, "width"), (responsive: true))`). A patch that adds classes of its own
  uses a key of its own (`"mp-white-space"`, `class: white-space`), never Bootstrap's key.
- **D2.** Regression spec `ui-core/_conformance/bootstrap-baseline-superset.spec.ts` compiles both
  sheets with `sass` and requires the baseline's class set to be a superset of stock Bootstrap's. It
  pins the issue's own assertions too (`.w-100{width:100%!important}`, `.w-md-auto`). This catches
  any future patch, not just these two.

## 2. A seeded first page drops the consumer's fetch metadata

### What happens

With `stateKey`, the server prefetches page 1 and the client seeds from the transfer and skips the
page-1 fetch. `prefetch` keeps only `data` and `totalRecords`. A consumer whose `fetch` also records
something off its response (Spark's query grid: the result's `columns` and `disabledActions`) runs
that code on the server, but on the client the seed replaces the call. The consumer gets no copy of
the metadata and no signal that page 1 was seeded. Spark's hydrated grid shows rows with no cells
and no header, and never recovers.

### Decisions

- **D3. `DatatableFetchResponse.extra?: JsonValue`.** The consumer returns its metadata next to the
  rows: `{ data, totalRecords, extra: { columns, disabledActions } }`. The seed carries it verbatim.
  `runPrefetch` already rejects a non-JSON seed with a named path, so a non-JSON `extra` on a seeded
  table fails loudly on the server, not silently on the client.
- **D4. `pageLoad` output: `{ request, result, seeded }`** fires for every response the table
  applies (root page, virtual window, tree children) and once for a seeded page.
  `request` is the `DatatableFetchRequest` without its `signal` (`DatatablePageRequest`), so it can
  be stored. `result` is the `DatatableFetchResponse` including `extra`. `seeded` is `true` only for
  the page that came from the transfer. The consumer rebuilds its state from `pageLoad` on both paths
  and needs no side channel in `fetch`.
- **D5. Client only.** `pageLoad` is emitted from `attach` (the seed the state was created with) and
  from `inputsChanged` (a seed adopted for a late `fetch`). Both run only on the client, after the
  first render, so it fires once per seeded page. The server's own fetch already ran the consumer's code.
- **D6. Lit has no seed.** `mp-datatable` gets `pageLoad` for fetched pages like every front; the
  seeded path is unreachable there (the Lit controller passes no seed), unchanged by this issue.
- Rejected: an optional `seed` hook next to `fetch` (issue proposal 2). It would be a second callback
  with the same job as an output, available in only the fronts that seed, and it would still need the
  metadata in the transfer.

### Accessibility

No DOM or ARIA change. The datatable's live "N rows loaded" announcement is unchanged: a seeded page
is not announced, as before.

## Out of scope

None.
