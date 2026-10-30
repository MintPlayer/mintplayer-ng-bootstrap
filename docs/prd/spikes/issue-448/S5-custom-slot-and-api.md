# S5 — Custom slot and the demo API mapping

- **Custom slot → model.** The `filter` slot context's `apply(values, inverse)` / `clear()` go through
  the core's `setFilters`, so a custom panel writes the same `filters` model as the built-in ones: the
  Country panel in all three demos (Benelux / per-country / Everywhere) round-trips into
  `[(filters)]` / `v-model:filters` / `onFiltersChange`.
- **Filters → SQL.** The Spark-style `QueryRequest` in `apps/api/QueryBuilder/Expression.cs` was not
  reused: it has no inverse sets and no comparison operands. `DatatableFilterApplier` builds the
  predicate directly with expression trees. Probed with `curl` against `POST /api/customers/table`:

  | Filter | Result |
  |---|---|
  | `country ∈ {BE, NL}` | 200, BE/NL rows only |
  | the same, `inverse` | 200, no BE/NL rows |
  | `createdAt ≥ "2025-01-01T00:00:00.000Z"` | 200, sorted descending, all ≥ the instant |
  | `params.search` | 200, narrows `name LIKE %…%` |
  | an unknown field | 400 `UNKNOWN_FILTER_FIELD` |
  | an unparseable operand | 400 `INVALID_FILTER_VALUE` |
  | distincts for `country` with another column's filter | 200, faceted by that filter |

  A calendar `date` compares the column's `.Date`; a `datetime` operand is parsed as a
  `DateTimeOffset` and compared as UTC (D10).
- **Demo data source.** The Angular demo's artists table is a Spark query that cannot take filters, so
  the filter demo moved to the demo API's customers (`/api/customers/table` + `/distincts`) in all
  three frameworks.
