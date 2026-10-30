# S3 — Hydration equality

Measured 2026-10-30 with the `playwright_node` MCP on the demo's customers table (paged, `stateKey`,
`[(filters)]` seeded with `country ∈ {BE, NL}`, `fetchParams = { search }`).

| | Angular | React | Vue |
|---|---|---|---|
| Rows after hydration | 10 | 10 | 10 |
| `Loading…` in the table | no | no | no |
| `/api/customers/*` requests on load | **0** | **0** | **0** |
| Hydration errors | none | none (after the fix below) | none |
| `data-mp-hydrated` | yes | yes | yes |

Typing in the search box then issues **exactly one** `POST /api/customers/table` with
`{ page: 1, perPage: 10, sortColumns: [], filters: { country: … }, params: { search: "0002" } }`.

**Decision:** `fetchedKey` is enough; no other part of the snapshot needs seeding.

**Trap found — locale formatting.** React reported a text mismatch in the Created column: the demo
formatted the instant with `toLocaleString()`, which printed `19-12-2024` in Node and `19/12/2024` in
the browser. A server's timezone is also rarely the reader's. Anything a `format` callback prints for
an SSR table must be deterministic: the demos now use `Intl.DateTimeFormat('en-GB', { timeZone: 'UTC' })`.
Recorded in the CHANGELOG's SSR entry.

**Second finding, pre-existing:** React warned `Invalid DOM property colspan` for the loading and empty
state cells; `reactProps()` now maps `colspan`/`rowspan` (and `minlength`/`maxlength`).

**API trap found on the way (D10):** SQLite returns a `DateTime` as `Unspecified`, so the API serialized
instants without `Z` and a browser parsed them as local time. `DemoDbContext` now restores
`DateTimeKind.Utc` on read with a convention-wide converter.

Not measured: the "without hydration" variants (`createApp`/`createRoot` over SSR HTML). The seed is
read from the store in the bridge's state initializer, independent of hydration, so the same path
applies.
