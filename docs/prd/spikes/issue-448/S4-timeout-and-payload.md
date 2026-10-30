# S4 — Timeout and payload (D6)

**Timeout.** `runPrefetch` races the core's prefetch against `timeout` (default 3000 ms, app-level via
`provideMachineSsr` / `MpTransferStateProvider` / `mpTransferState`), aborts the fetch's signal when it
fires, writes nothing, and warns once with the key. A failed prefetch warns with the error; a prefetch
aborted by the render itself is silent. All three paths are pinned with fake timers in
`transfer-state.spec.ts`; the server then renders the loading snapshot and the browser fetches, as with
no server render at all.

Not measured: render times against a deliberately slow (2 s) or failing live API across 1/3/5 s
timeouts. The spec covers the behaviour; wall-clock numbers would only restate the configured timeout.

**Payload** (dev SSR, `/enterprise/datatables`, 10-row page of the customers table):

| | bytes |
|---|---|
| React / Vue `#mp-state` (whole script) | 1 498 |
| Angular `#ng-state` (whole script) | 13 772 |
| …of which the customers seed | ≈1 400 |

Angular's remainder is its HTTP transfer cache for the page's other `GET` tables. The customers fetch
is a `POST`, which the HTTP transfer cache skips by default, so the seed is **not** duplicated. A
consumer whose `fetch` is a `GET` through `HttpClient` gets the response twice (the cache and the
seed); the docs recommend `withHttpTransferCacheOptions({ filter })` excluding the table endpoint, or
`transferCache: false` on that request.
