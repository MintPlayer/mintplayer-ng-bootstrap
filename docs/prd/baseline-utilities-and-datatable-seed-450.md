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

`overflow.scss` also replaced Bootstrap's `"overflow-x"`, but its list repeated Bootstrap's
(`auto hidden visible scroll`), so nothing was lost — by coincidence, not by design. `cursor.scss`
used a key Bootstrap 5.3 does not define, so it was safe only until a release adds one. Both are
covered by D1.

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
  This holds for every patch, not only the two that lost classes: `cursor` (`mp-cursor`) and
  `overflow-x` (`mp-overflow-x`, only the values Bootstrap lacks) also moved to keys of their own, so
  a future Bootstrap that defines `cursor` or extends `overflow-x` is never replaced by ours.
  Class names are unchanged for consumers (`.cursor-*`, `.overflow-x-*`, `.white-space-*`). Making
  `width` responsive also adds `.w-{sm,md,lg,xl,xxl}-{25,50,75,100}` next to `.w-{bp}-auto`.
- **D1a. `white-space.scss` stays.** Bootstrap ships only `.text-wrap` and `.text-nowrap`; the
  patch adds `break-spaces none normal nowrap pre pre-line pre-wrap revert` as `.white-space-*`,
  which keeps the shipped bundle more complete. Nothing in the repo uses them, but dropping them
  would remove classes consumers may rely on.
- **D2.** Regression spec `ui-core/_conformance/bootstrap-baseline-superset.spec.ts` compiles both
  sheets with `sass` and requires the baseline's class set to be a superset of stock Bootstrap's. It
  pins the issue's own assertions too (`.w-100{width:100%!important}`, `.w-md-auto`). A second check
  reads every `styles/utilities/*.scss` and fails on a literal entry under a non-`mp-` key, so a
  patch cannot replace a key Bootstrap only adds in a later release. It reads the files with `fs`:
  vitest serves `.scss?raw` as an empty string, which made a first `import.meta.glob` version pass
  against the unfixed patches.

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
  be stored. `result` is `{ data, totalRecords, extra? }` as the table applied it (`totalRecords`
  falls back to the row count when the response omits it). `seeded` is `true` only for the page that
  came from the transfer. On the client, the consumer rebuilds its state from `pageLoad` on both
  paths. Names per front: Angular `(pageload)`, React `onPageLoad` (the detail, not an event), Vue
  `@pageload`, Lit a bubbling `pageload` `CustomEvent`.
- **D5. Client only.** `pageLoad` is emitted from `attach` (the seed the state was created with) and
  from `inputsChanged` (a seed adopted for a late `fetch`). Both run only on the client, after the
  first render, so it fires once per seeded page. The server's own fetch already ran the consumer's code.
  A consumer that needs its metadata in the server HTML (Spark's columns) therefore records it in
  `fetch`, which runs on the server and on every client fetch, and in `pageLoad` when `seeded` is
  true. Pinned by `ng-bootstrap/datatable/src/datatable-ssr-pageload.spec.ts`, which also asserts the
  hydrated grid has cells and a header. See [S1](./spikes/issue-450/S1-emit-at-attach.md).
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
