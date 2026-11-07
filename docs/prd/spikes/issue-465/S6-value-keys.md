# S6 — Value keys for the built-in options (D7)

Read 2026-11-07.

- `canonicalJson` (`ui-core/transfer-state/src/canonical.ts:69`) **throws** on a non-finite number
  (`kindOf`, :32), and `localDistincts` (`datatable.ts:569-574`) can list `NaN` (deduplicated with
  SameValueZero), `Infinity` and `undefined` (a missing cell). So it cannot be the key on its own.
- `null` and `undefined` must not collide: `sameValue(null, undefined)` is false, so both can be listed.

**Key function** (ui-core datatable, exported for tests):

```ts
export const distinctKey = (value: unknown): string =>
  value === undefined ? 'u'
  : typeof value === 'number' && !Number.isFinite(value) ? `n:${value}`   // NaN, Infinity, -Infinity
  : `j:${canonicalJson(value)}`;
```

The `j:` / `n:` / `u` prefixes keep `1` (`j:1`) apart from `"1"` (`j:"1"`) and `NaN` (`n:NaN`) apart from
the string `"NaN"` (`j:"NaN"`). A key is unique iff `sameValue` says the values differ, for every
JSON value plus the three non-finite numbers and `undefined`.

The option input carries `data-dt-filter-value="<key>"`, read with `getAttribute`, so no selector
escaping is involved. `onChange` resolves the clicked key against `filterOptionsOf(selection, current
list)`; an unknown key (the list moved on before the render) falls back to the selection, then is
ignored, never resolved to a different value. T5 pins it.

**Decides:** D7's key.
