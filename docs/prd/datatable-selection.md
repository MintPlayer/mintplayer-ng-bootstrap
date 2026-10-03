# PRD — Datatable selection that survives paging, and a checkbox-only selection mode

**Status:** Decisions locked (grilled 2026-10-03). Spikes not started.
**Plan:** [datatable-selection-plan.md](./datatable-selection-plan.md)
**Related issues:** #422 (this), **#407 (reload dedupe / `reload()`), folded into this PR (D11)**, #307 (checkboxes), #384/#385/#386 (windowed fetch, `selectedRows`), MintPlayer/MintPlayer.Spark#467 (consumer)

## 0. Summary

Spark renders `<bs-datatable selectionMode="multiple" [(selection)] [rowKey] [fetch] (rowClick)>` and
needs three things the datatable cannot do today:

1. a selection that survives server-side paging, sorting and re-fetching;
2. a row click that **opens** the row instead of selecting it;
3. a checkbox cell that is the only way to select.

"Click selects" stays the default, because `mp-file-manager` and the React/Vue demos rely on it. The keyboard map is unified for every mode (D13), and the checkbox cell no longer forwards double-clicks (D12).

The same PR also lands #407: `reload()`, the `fetch` identity guard and atomic `applyFetchState` (D11). Spark hits #407 and #422 on the same table.

## 1. Problem (verified against `master` @ `67244d46`)

All line numbers refer to `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts`
(abbreviated DT) unless another file is named.

### 1.1 Selected rows are resolved only from loaded data

- The element keeps `_selectedIds: Set<string>` (DT:287). The Set survives page changes, so the ticks
  still render correctly.
- `emitSelectionChange` (DT:2726-2736) builds `selectedRows` through `resolveRows` (DT:2743-2753). That
  function only looks in `_data`, `_pageCache` and `_childCache`, and filters out every id it cannot
  resolve (DT:2752).
- `loadPage` replaces `_data` for each page (DT:2471). `scheduleFetchReload` clears `_pageCache`,
  `_childCache` and the totals (DT:2497-2503), and so does setting the `fetch` callback to null (DT:544-549).
- The Angular wrapper overwrites its model with that truncated list:
  `selection.set([...detail.selectedRows])` (`datatable.component.ts:536`). Its effect (`:476-481`) then
  pushes `selection().map(keyFn)` back down as `selectedIds`, so the element's own key Set is **wiped**
  to match.

**Correction to the issue:** virtual-scroll windows are never evicted. #385 decided against an LRU for
v1, and `_pageCache` is cleared only on a reload. Rows are actually lost on:

- a page change in non-virtual `[fetch]` paging;
- any sort, `perPage` change or `fetch` re-assignment, in either mode;
- the Angular round-trip, in every case above.

### 1.2 Key bugs found along the way

| # | Where | Bug |
|---|---|---|
| K1 | DT:2747 | `resolveRows` keys rows with `this._rowKey(row, -1)`. With the fallback `` `row-${index}` `` (DT:312-315), every row without an id becomes `row--1`, so `selectedRows` is always empty for those rows. |
| K2 | DT:2191 | Local and external pagination pass the index **within the page slice**, so `row-0` on page 1 and `row-0` on page 2 collide even with static `[data]`. (Windowed mode uses the global index at :2174; tree mode uses `out.length` at :2211.) |
| K3 | `datatable.component.ts:480` | The effect passes the **selection-array index** to `rowKey`, so fallback keys never match the element's keys. |
| K4 | `datatable.component.ts:127-130` | The wrapper falls back to `` `row-${index}` ``, which is unstable across pages. |
| K5 | `datatable.component.ts:149` | `compareWith` is declared and never read. It is still bound in the demo (`datatables.component.html:147`, `.ts:279`) and documented in `docs/prd/datatable.md:104, 306-317`. |
| K6 | DT:593 | Setting `selectionMode = 'none'` clears the selection **without an event**, so wrapper models go stale. |
| K7 | DT:2265-2268, :2175 | Shift-range only looks inside the virtual window. If the anchor has scrolled out of the window, the click silently becomes a plain select. If a page in range has not loaded yet, `__placeholder-flat-i` keys enter the selection. |

### 1.3 Every click selects

- `onRowClick` (DT:2606-2618) calls `handleSelectionOnClick` (DT:2691-2724) before it emits
  `mp-datatable-row-click`. A plain click replaces the selection, Ctrl/Meta toggles, and Shift selects
  a range.
- The `closest('input[type="checkbox"]')` guard at DT:2607 is dead code. The input sits in
  `mp-checkbox`'s shadow root, so the target is retargeted to the host, and the td swallows the click first.
- `onRowContextMenu` (DT:2630-2650) replaces the selection when the right-clicked row is not already selected.
- Keyboard: Enter and Space on a row (DT:2558-2572) select that row and also emit row-click. In tree
  mode, both keys expand a parent row first (DT:2552-2555).
- The checkbox cell `<td class="checkbox-cell">` (DT:2018) only stops `click` propagation; `dblclick`
  still bubbles to the row (DT:1999). Only the 2.5rem-wide `mp-checkbox` toggles
  (`datatable.light.scss:288-293`), and the cell has no `cursor` rule.

### 1.4 Who is affected

| Consumer | Selection model | Affected by 1.1 |
|---|---|---|
| Angular `bs-datatable` | `model<TData[]>`, overwritten from `selectedRows` | Yes: the keys are wiped |
| React `BsDatatable` | none (`@lit/react` passthrough); its doc comment at `:29` points consumers at `selectedRows` | Rows are truncated, keys survive |
| Vue `BsDatatable` | `v-model:selectedIds`, keys only | Rows are truncated, keys survive |
| `mp-file-manager` | keys only; static data; explicit `rowKey`; re-pushes `.selectedIds` on every render (`mp-file-manager.ts:976-986, 1103-1108`) | No |

## 2. Goals

- G1. A selected key is never dropped because its row is not loaded. Only an explicit deselect removes it.
- G2. Every selection event carries a row object for each key whose row the element has **ever seen**.
- G3. In Angular, `[(selection)]` keeps working across pages, sorts and re-fetches, and ends as `[]` after a header clear (§3 of the issue).
- G4. An opt-in mode in which a row click opens, only the checkbox selects, and the keyboard follows the same split.
- G5. In the default mode, click selection behaves exactly as it does today. The only changes are the bug fixes K1-K7 and the deliberate behaviour changes D12/D13.
- G7. A re-fetch happens only when something actually changed or `reload()` is called, with exactly one request per change (#407).
- G6. All three frameworks document both modes, with a row keymap on each demo page.

## 3. Non-goals

- **Select-all.** This stays deliberately absent (`docs/prd/datatable.md:42-44`): the WC cannot know about rows outside the loaded window, and Spark does not want it.
- **Cascading into unloaded descendants.** Tree cascading remains limited to loaded rows (`datatable.md:290-297`).
- **A shadow copy of the data set in the wrappers.** This was rejected in #386 (`docs/issue_386_PRD.md:30-32`). §5.1 keeps only the rows **of selected keys**, inside the WC, and only for as long as they are selected. That is a selection's own state, not a mirror of the data.
- **Page-cache eviction / LRU.** Still out (#385).

## 4. Locked decisions (proposed, to be confirmed by grilling)

| # | Decision | Consequence |
|---|---|---|
| D1 | The opt-in mode is a new **`selectionMode` value `'checkbox'`**: multi-select, triggered only by the checkbox. | It cannot form invalid combinations (a "single + checkbox trigger" would have no way to select at all). No new attribute is needed, and the wrappers only widen `DatatableSelectionMode`. Internal `=== 'multiple'` checks (DT:1063, :2698) become an `isMulti` helper. A boolean `row-click-selects` default-true was rejected because HTML boolean attributes cannot default to true. `selection-trigger` is the runner-up (it would allow a meaningless combination with `single`/`none`). |
| D2 | The WC keeps a `Map<key, row>` for the selected keys. It is filled on every selecting path and pruned on every deselecting path. | `resolveRows` resolves in this order: live data (`_data`, `_pageCache`, `_childCache`), then the Map, then nothing. A fresh row seen in live data refreshes its Map entry, so a re-fetched row object always wins over a stale cached one. |
| D3 | `selectedIds` stays authoritative. **`selectedRows` is index-aligned with it: `(T \| undefined)[]`**, with `undefined` where a key has never had a row (a host seeded the key without one). Q2 → C. | The event type change is **breaking** for React/Vue/plain-WC consumers, who must narrow. It is resilient: the pairing is positional, so nothing is silently dropped and no third array has to be reconciled. Angular's `selection: TData[]` cannot hold a hole: the wrapper keeps the key in the WC and omits it from the model only when there truly is no row. Angular seeds rows (D4), so this does not happen through Angular itself. |
| D4 | A new `selectedRows` **setter** on the WC seeds the Map. It also implies the keys, via `rowKey`. | The Angular effect pushes rows, not only keys, so the Map knows rows supplied by the host. The `selectedIds` setter reconciles the Map, dropping entries whose keys are gone. This must stay O(n) and cheap, because file-manager pushes it on every render. |
| D5 | The Angular wrapper rebuilds `selection` from `detail.selectedIds`. Each row comes from `detail.selectedRows`, otherwise from the existing `selection()` entry with the same key. | Only keys that really left the selection are dropped. K3 is fixed in the same change. |
| D6 | **Remove `compareWith`** (breaking change, documented). | Identity is `rowKey`. The demo binding and `datatable.md` §compareWith are updated. |
| D7 | Fallback keys: fix K1 and K2 (use the global flat index everywhere), and `console.warn` once when `fetch` is set or selection is active while a row has no `id` and no custom `rowKey`. | We warn rather than throw, because static tables without ids keep working. The `rowKey` JSDoc, the demo prose and `datatable.md` all state that a stable `rowKey` is required with `[fetch]`. |
| D8 | Setting `selectionMode` to `'none'` emits `selection-change` when it clears a non-empty selection (fixes K6). | Wrapper models stay in sync. |
| D9 | Shift-range resolves the anchor and the target against `getFlatList()`, not the rendered window. **If the range contains any placeholder, it is refused**: the selection and the anchor are unchanged, and the live region announces a localized `rangeIncomplete`. An anchor that is missing from the flat list falls back to a plain select (S3). Fixes K7. | Default mode only. `'checkbox'` mode has no range. |
| D10 | `aria-multiselectable="true"` on the grid for `multiple` and `checkbox`. | This fills a gap that exists today. |
| D11 | **#407 folded in, in full** (Q1 → A): an identity guard in `set fetch`, a public `reload({ resetPage? })`, an equality check in `set sortColumns`, atomic `applyFetchState({ fetch, sortColumns, page, perPage })`, and removal of the stale `invalidateData`/`setFetchResponse` comments (DT:243/253/259). | The Angular wrapper's two forwarding effects (`datatable.component.ts:224-229`, `:248-262`) merge into one that calls `applyFetchState`. That effect must **not** read `selection`, or a selection change would trigger a fetch (covered by S2). `reload()` keeps every selected key and its row Map (G1). |
| D12 | **The checkbox `<td>` stops `dblclick` in every mode** (Q3 → A). | Behaviour change in the default mode: double-clicking a checkbox no longer opens the row. The cell is selection-only. |
| D13 | **One keymap for every row in every mode** (Q4 → A, default mode included): Enter = open (row-click), Space = selection, ArrowRight/ArrowLeft + the expander button = expand/collapse. The Enter/Space expand shortcut on parent rows (DT:2552-2555) is removed. | Behaviour change in the default tree mode: Enter on a parent row now opens it instead of expanding. Parent rows become openable from the keyboard for the first time. In the default mode, Space keeps today's semantics (select with the click modifiers); in `'checkbox'` mode it toggles the checkbox. |
| D14 | **Checkbox accessible name** (Q5 → B + C): an optional `rowLabel: (row) => string` callback; when it is undefined or returns an empty string, use the trimmed `textContent` of the row's first data cell; when that is empty too, fall back to "Select row N". The name is rendered through a new localized `selectRowNamed(label)` in `labels.ts`. | The name is computed as a string in the WC after render and passed to `mp-checkbox`'s `label`. `aria-labelledby` cannot be used, because it would cross `mp-checkbox`'s shadow boundary. Because it is recomputed each render, the name follows a re-rendered cell. Exposed on all three wrappers. |

## 5. Design

### 5.1 Retaining selected rows (WC)

```ts
private _selectedIds = new Set<string>();       // unchanged, authoritative
private _selectedRowCache = new Map<string, T>(); // NEW, keys ⊆ _selectedIds
```

The Map is written at every path that changes `_selectedIds`. The table below comes from a full survey of those paths:

| Path | Location | Row available | Change |
|---|---|---|---|
| Click, single mode / plain click, multiple mode / Ctrl toggle | `handleSelectionOnClick` DT:2691-2724 | in the caller | pass `row` through |
| Shift-range | DT:2699-2710 | yes (`computeVisibleRows`) | store each row |
| Keyboard Enter/Space | DT:2558-2563 | yes | pass `row` through |
| Checkbox toggle + cascade | `onRowCheckboxToggle` DT:2653-2665, `collectDescendantKeys` DT:2291-2302 | row yes; descendants in `_childCache` | collect `[key,row]` pairs |
| Context-menu promote | DT:2632-2636 | yes | store |
| Header deselect-all | `onDeselectAll` DT:2674-2679 | — | `clear()` |
| `selectedIds` setter | DT:600-603 | no | prune |
| `selectedRows` setter | NEW | yes | seed |
| `selectionMode → 'none'` | DT:593 | — | `clear()` + emit (D8) |
| data / reload / sort / tree collapse | DT:512-516, :2484-2505, :2355-2395 | — | untouched (by design) |

`resolveRows(ids)` returns an array **aligned with `ids`**. For each id it gives the live row if there is one, otherwise the cached row, otherwise `undefined` (the seeded-key case, D3). It derives keys with the same stable index the renderer uses (K1).

### 5.2 Angular wrapper

- `onSelectionChange` builds the new selection with D5: for index `i`, it takes `detail.selectedRows[i]`, otherwise the existing `selection()` entry with key `selectedIds[i]`, otherwise it omits the row from the model (the key stays in the WC; D3).
- The fetch/settings forwarding becomes one effect that calls `applyFetchState` (D11). The component exposes `reload()`.
- The effect pushes `selectedRows` (and, through it, the keys) instead of keys built from array indices (fixes K3). An echo guard keeps the WC event → `selection.set` → effect → setter cycle from re-emitting. That guard is spike S2.
- `compareWith` is removed (D6).
- The `rowKey` JSDoc is corrected (D7).
- After a header clear, the model ends as `[]` (G3), which falls out of D5 because `selectedIds` is empty.

### 5.3 React / Vue

There is no selection model to fix there. The changes are:

- widen the `selectionMode` type (Vue `BsDatatable.vue:48`; React gets it through the WC type);
- expose `selectedRows` as a settable property (Vue: an object prop assigned to the element ref; React: through the ref, like other object props);
- update the React doc comment at `BsDatatable.tsx:29` to say that `selectedRows` now covers every key whose row was ever seen.

### 5.4 `'checkbox'` mode behaviour

| Input | Default (`multiple`) | `'checkbox'` |
|---|---|---|
| Row click, including Ctrl/Shift | select / toggle / range, then row-click | **row-click only** |
| Right-click an unselected row | promote to selection | **no selection change** |
| Click anywhere in the checkbox `<td>` | nothing, unless the click lands on the checkbox itself | **toggle** via `onRowCheckboxToggle`; ignored only when `ev.composedPath()` enters the checkbox's shadow root (S1: `closest('mp-checkbox')` swallows host-padding clicks); no `focus()`/`preventDefault()`, so the browser focuses the row (S4); `cursor: pointer` |
| Double-click in the checkbox `<td>` | **stopped at the td** (D12, changed) | **stopped at the td** |
| Enter on a row, including parent rows | select, then row-click (parent rows: **now opens too**, D13) | **row-click only** |
| Space on a row, including parent rows | select with the click modifiers; no longer expands parent rows (D13) | **toggle that row's checkbox**, no row-click (the existing `preventDefault` stops page scroll) |
| ArrowRight / ArrowLeft, expander button | expand / collapse (unchanged) | expand / collapse |
| Shift+Space / Shift+click | range | **none** |
| Header checkbox | indeterminate + clear all | unchanged |

### 5.6 Reload and fetch state (#407, D11)

- `set fetch`: `if (value === this._fetch) return;`. Re-assigning the same function becomes a no-op, which kills the inline-closure fetch loop only for stable references. The JSDoc and demo say to pass a stable function.
- `set sortColumns`: skips the reload when the new value is structurally equal to the current one.
- `reload({ resetPage = false } = {})`: clears `_lastReloadKey` and the page/child caches (optionally resets `page` to 1), then calls `scheduleFetchReload()`. It never touches `_selectedIds` or the selected-row Map.
- `applyFetchState({ fetch?, sortColumns?, page?, perPage? })`: assigns every provided field without scheduling, then schedules exactly one reload. No combination of fields and no split across ticks can produce two requests when it goes through this path. The individual setters remain for plain-WC consumers.
- Angular `BsDatatableComponent.reload()` forwards to the WC. React and Vue reach it through the element ref.

### 5.5 Styling

`datatable.light.scss`: add `:host([selection-mode=checkbox]) .checkbox-cell { cursor: pointer; }`, authored in the light-tier rescoped form. Then run `codegen-wc`. The datatable has no DSD chrome, so the only SSR touchpoint is the light-styles chrome, which regenerates automatically.

## 6. Accessibility contract

- `role="grid"` / `treegrid` with row-level roving tabindex stays as it is. Rows remain focusable in `'checkbox'` mode, because Enter opens them (`keyboard.spec.ts:82/:90` gate this on selection, so it must include `'checkbox'`).
- `aria-selected` stays on `<tr>` in every selectable mode and updates in the same render.
- `aria-multiselectable="true"` for `multiple` and `checkbox` (D10).
- Row checkboxes are named by D14: `rowLabel(row)`, otherwise the first data cell's text, otherwise "Select row N" (`labels.ts:25/122` plus a new `selectRowNamed`). They stay individual Tab stops: `mp-checkbox` uses `delegatesFocus`.
- The live announcer's count ("N rows selected") counts `_selectedIds`, including off-page keys.
- Each demo page gets a **row keymap** for both modes, in all three frameworks (CLAUDE.md "every pointer gesture has a keyboard equivalent / demo documents the keymap").
- Focus after a click on the td padding is decided by spike S4.

## 7. The #1 risk

**The Angular round-trip.** The wrapper and the WC now both hold rows, and `selection.set` re-runs an effect that writes back into the WC. If the echo guard is wrong, the result is a loop, or a model that flips between the cached and the fresh row objects. Spike S2 has to settle this before M3.

## 8. Public API delta

| Package | Change | Breaking |
|---|---|---|
| web-components | `selectionMode: 'none' \| 'single' \| 'multiple' \| 'checkbox'` | no |
| web-components | `selectedRows` setter (seeds the Map) | no |
| web-components | event `selectedRows` becomes `(T \| undefined)[]`, index-aligned with `selectedIds`, and includes off-page rows seen before | **yes** (type) |
| web-components | `selectionMode='none'` emits `selection-change` | behavioural (fix) |
| web-components | fallback key uses the global index on paginated tables | key values change for id-less rows |
| web-components | checkbox `<td>` stops `dblclick` in every mode | **behavioural** |
| web-components | Enter opens and Space no longer expands parent rows; expanding is Arrow keys + expander only | **behavioural** |
| web-components | `rowLabel` callback; first-cell text as the default checkbox name; `selectRowNamed` label | no |
| web-components | `reload({ resetPage })`, `applyFetchState(...)`; `set fetch` no-op on the same identity; `set sortColumns` equality check | behavioural (fix) for identity re-assignment |
| ng-bootstrap | `compareWith` removed | **yes** |
| ng-bootstrap | `selection` is no longer truncated on page change | behavioural (fix) |
| ng-bootstrap | `reload()` method; `[rowLabel]` input | no |
| react / vue | `selectedRows` and `rowLabel` props; widened `selectionMode` | no |

## 9. Spikes

Each spike gets a verdict row and its evidence (engine and Playwright versions). A failed spike stays in the table as a rejection, with its evidence.

| # | Question | Method | Verdict |
|---|---|---|---|
| S1 | When the checkbox `<td>` is clicked: does a click on the `mp-checkbox` label/padding arrive as two clicks (label, then the synthetic input click), both retargeted to `mp-checkbox`? Can `closest('mp-checkbox')` alone prevent every double toggle, in Chromium, Firefox and WebKit? | A static replica `<tr tabindex><td class=checkbox-cell><mp-checkbox>` (built `mp-checkbox` bundled with esbuild), driven by `page.mouse.click`. Playwright 1.62.1; Chromium 151.0.7922.34, Firefox 153.0, WebKit 26.5. | **`closest()` REJECTED.** A click on the host's own padding or border (present as soon as any CSS gives the host a box) is retargeted to `mp-checkbox` and fires no `change`, so the `closest` guard swallows it: zero toggles, and in Chromium/Firefox focus still moves to the input. A label click arrives at the td twice; both clicks are retargeted. **Adopted guard: skip the td toggle only when `ev.composedPath()` enters the checkbox's shadow root.** That gave exactly one toggle at every location (td padding, host padding, label, input, Space) in all 3 engines. |
| S2 | Angular echo: WC event → `selection.set` → effect → `selectedRows` setter. Does it re-emit or loop? What guard is minimal: reference equality on the key list, or a suppress flag? | Wrapper spec driven by a `signal()` host, counting events across page change and header clear | Measured during M3 (see §13). |
| S3 | Shift-range across a virtual window whose pages have not all loaded. Should the range be "loaded keys between anchor and target in flat order", or should it be refused while placeholders are inside it? | jsdom on the `windowed-fetch` harness; total 100, perPage 10, scroll simulated. Node 24.15.0, vitest 4.1.10, jsdom 27.4.0. | **K7 confirmed twice.** (a) Shift-click across an unloaded page selected 25 ids, **10 of them `__placeholder-flat-*`**. `selectedRows` had 15 entries, and the placeholder keys became orphans after the page loaded. (b) With the anchor scrolled out of the window, the range silently degraded to a plain select. **Adopted (D9): resolve both ends against `getFlatList()`. If any placeholder lies in `[lo, hi]`, refuse: the selection and the anchor are unchanged, and the live region announces `rangeIncomplete`. Otherwise select every real key in the range. An anchor that is no longer in the flat list deliberately falls back to a plain select.** "Skip the placeholders" was rejected because it gives a range with holes that looks contiguous, i.e. a silent partial selection. |
| S4 | Focus after a click on the td padding in `'checkbox'` mode: should it go to the row (roving `_focusedRowKey`) or to the checkbox? Check what NVDA/axe expect, and what keeps Space working afterwards. | The S1 replica with Playwright in all 3 engines. Neither NVDA nor axe was run (axe runs in the M9 sweep). | **Row.** The browser focuses the `tr` natively in all 3 engines, and the row's `@focus` updates roving. Space then toggles, Enter opens, and ArrowDown moves. Moving focus to the checkbox strands Enter and the arrow keys: the row keydown bails on `composedPath()[0] !== currentTarget`. **So the td handler calls neither `focus()` nor `preventDefault()`.** |
| S5 | Cost of reconciling the Map on file-manager's every-render `selectedIds` push | Plain-TS vitest micro-benchmark, 10k rows, 1k selected, 2,000 iterations | **Pass.** Full prune: 0.055 ms per push (0.096 ms with 50% of keys changed). The early exit (same length, and every key already in the Set) takes 0.007 ms and also avoids a needless `requestUpdate`. **Adopted:** early exit, otherwise one pass over the Map keys. |

## 10. Testing

**WC (vitest + jsdom):**

- `selection.spec.ts`:
  - `'checkbox'` counterparts for :195 (context menu) and :254/:266/:279/:286 (modifiers);
  - a td-padding toggle;
  - selection that survives a page change, a sort reload and a `fetch` re-assignment;
  - a header clear with off-page keys → `[]`.
- `keyboard.spec.ts`:
  - `'checkbox'` counterparts for :108 (Enter), :129 (Shift+Space) and :222/:238 (Space);
  - **delete the duplicated describe block at :248-277.**
- `aria.spec.ts`: `aria-multiselectable`; `aria-selected` unchanged after Enter in `'checkbox'` mode; the announcer counts off-page keys; `selectedIds` holding unloaded keys.
- `tree.spec.ts`: a `'checkbox'` counterpart for :117.
- `windowed-fetch.spec.ts`: revise :180 (`selectedRows.length === selectedIds.length` no longer holds for seeded keys); add a shift-range-with-placeholders case (S3).
- K1/K2: an id-less paginated table selects distinct rows on page 1 and page 2.
- D3: seeding `selectedIds` with an unloaded key gives an `undefined` at that index in `selectedRows`.
- D12/D13: a `dblclick` on the checkbox td emits no row-dblclick (both modes); Enter on a tree parent emits row-click and does not expand; Space on a parent does not expand; ArrowRight/ArrowLeft still do.
- D14: checkbox name from `rowLabel`, from the first cell's text, and from "Select row N" when the cell is empty; the name updates after the cell re-renders.
- D11 (#407):
  - assigning the same `fetch` twice → one request;
  - `applyFetchState` with all four fields → one request;
  - `reload()` → one request and the selection kept;
  - `reload({ resetPage: true })` → page 1;
  - an equal `sortColumns` → no request;
  - the issue's cross-tick repro → one request when it goes through the Angular wrapper.

**Angular:**

- `datatable.component.spec.ts:102-109` and `datatable.windowed-fetch.spec.ts:65-77` change from "replace" to "merge by key".
- New: a page-change survival case, a header-clear → `[]` case, and `selectionMode="checkbox"`. All are driven from a `signal()`.

**React / Vue:** extend the conformance specs (`event-maps.spec.tsx:37-48`, `BsDatatable.spec.ts:90`) for the `selectedRows` property.

**e2e (Angular, using `datatable-virtual.spec.ts`'s `mockArtistApi`):**

- tick 3 rows, page or scroll on, tick 1 more, sort, and expect 4 selected;
- in `'checkbox'` mode, a row click navigates or emits without selecting.

These are the cases only a browser can check (S1 retargeting).

## 11. Versioning

- `@mintplayer/web-components`: minor (additive), with the behavioural fixes noted.
- `@mintplayer/ng-bootstrap`: **major-worthy** (`compareWith` removed). Bump it the way this repo bumps breaking changes, with a note in the changelog/PR.

## 12. Resolved questions (grilled 2026-10-03)

Guiding preference from the grilling: **resilience is best**. Pick the option that cannot fail silently, even when it costs a breaking change.

| Q | Question | Answer | Locked as |
|---|---|---|---|
| Q1 | Fold #407 into this PR? | A: all of it, atomic apply included | D11, §5.6 |
| Q2 | How should keys without rows appear in the event? | C: an index-aligned `selectedRows` with `undefined` holes | D3 |
| Q3 | Stop `dblclick` at the checkbox td in the default mode too? | A: yes, in every mode | D12 |
| Q4 | Enter on a tree parent row in `'checkbox'` mode? | A: Enter opens, Arrow keys expand; **default mode too** | D13 |
| Q5 | Checkbox accessible name? | B + C: `rowLabel` callback, otherwise first-cell text, otherwise "Select row N" | D14 |

## 13. Successors, named rather than implied

None. Everything in scope ships in one PR (see the global one-PR rule).
