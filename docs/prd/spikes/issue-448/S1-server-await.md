# S1 — Awaiting the first page on the server, per front (D5)

Measured 2026-10-30 against the dev SSR servers (`node apps/{react,vue}-bootstrap-demo/server.mjs`,
`nx serve ng-bootstrap-demo`) with `apps/api` on :5000, `curl`-ing `/enterprise/datatables`.

| Front | Mechanism | Server HTML |
|---|---|---|
| Angular | `PendingTasks.run(runPrefetch …)` from the bridge's first effect, `TransferState.set` inside the task | 10 rows, seed under `mp-dt:customers:…` in `#ng-state` |
| React 19 | `use()` on a per-request pending promise keyed by `transferKey`, `renderToPipeableStream` + `onAllReady` | 10 rows, seed in `#mp-state` |
| Vue | `onServerPrefetch` in the bridge's `useMachine`, `renderToString` | 10 rows, seed in `#mp-state` |

React and Vue produce the **same key** (`mp-dt:customers:11udwizt6v1`) for the same query: the key is
the canonical request, not a framework id.

**Deviation from the plan (D5):** the React bridge adds **no Suspense boundary of its own**. With
`onAllReady` the stream waits for every `use()` before the shell is flushed, so the nearest app
boundary (or the root) is enough, and a bridge-owned boundary would add a fallback the server never
shows. A consumer that streams with `onShellReady` must wrap the table in `<Suspense>` themselves; the
two-pass fallback was not needed.

**Trap found:** the demo columns were first named after the API's PascalCase fields while the JSON rows
are camelCase, so the seed transferred but every cell rendered empty. Column `name` is the row key;
the API resolves filter and sort fields case-insensitively.
