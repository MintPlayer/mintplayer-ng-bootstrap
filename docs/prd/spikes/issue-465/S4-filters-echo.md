# S4 — The filters echo, per front (D8 loop safety)

Read 2026-11-07 (`ui-core/datatable/src/datatable.core.ts`).

Every inbound `filters` value, whichever front delivered it, reaches the core through ONE path:
`inputsChanged` (`datatable.core.ts:1403-1410`):

```ts
if (inputs.filters !== prev.filters) {
  const next = requestFilters(inputs.filters);
  if (canonicalJson(next, 'filters') !== canonicalJson(api.state().filters, 'filters')) {
    api.setState({ filters: next, filterOperandTexts: {} });
  }
}
```

- Angular `[(filters)]`: the `model()` write-back is a new input value → `inputsChanged` → equal → ignored.
- React `filters` + `onFiltersChange`: the parent's `setState` → new prop → same.
- Vue `v-model:filters`: `update:filters` → parent ref → new prop → same.
- Lit: the property write-back happens before `filterschange`; a listener that writes the same value
  back is a new property value → same.

The fronts differ only in **how** the value comes back, never in where it lands, so the canonical
compare covers all four.

**D8 placement.** The re-query goes **inside** that `if` (only a value that differs canonically from the
core's own state can trigger it). It writes `filterLoaded` / `filterLoading` only and emits nothing, so
it cannot produce another `filters` change. There is no path from a re-query back to `inputsChanged`.

**Decides:** the guard is sufficient; T8b proves the echo per front (two-way bound in each test host).
