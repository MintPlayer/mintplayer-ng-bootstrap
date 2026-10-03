# Plan — Datatable selection across pages + `'checkbox'` selection mode (#422)

**PRD:** [datatable-selection.md](./datatable-selection.md)
**Status:** Not started. The PRD's open questions were resolved by grilling on 2026-10-03 (D11–D14). The spikes run before M1.

| Milestone | Scope | PRD |
|---|---|---|
| S | Spikes S1–S5 | §9 |
| M1 | WC: selected-row Map + aligned `resolveRows` + key fixes | §5.1, D2–D4, D7 |
| M2 | WC: `selectionMode` side-effects + shift-range fix | D8, D9 |
| M2b | WC: #407: `reload()`, `applyFetchState`, identity/equality guards | §5.6, D11 |
| M3 | Angular wrapper: merge-by-key, `selectedRows` push, single fetch effect, `reload()`, drop `compareWith` | §5.2, D5, D6, D11 |
| M4 | WC: `'checkbox'` mode + unified keymap + td dblclick | §5.4, §5.5, D1, D12, D13 |
| M5 | Accessibility + `rowLabel` | §6, D10, D14 |
| M6 | React + Vue wrappers | §5.3 |
| M7 | Demos (3 frameworks) + docs | G6, D7 |
| M8 | Specs (WC, Angular, React/Vue, e2e) | §10 |
| M9 | Batched verification sweep | — |

## Conventions

- Branch `feat/datatable-selection-422` off `master`. It is created only with permission.
- One PR covers everything, including any bugs found on the way.
- Commit per milestone. Between milestones, verify with `tsc --noEmit` and by reading the code. **No test runs before M9.**
- After editing `datatable.light.scss`, run `npx nx run mintplayer-web-components:codegen-wc`.
- Light-tier rules apply (`scopedHtml`, rescoped SCSS, `renderRoot` rather than `shadowRoot`).

## Ordering rationale

- M1 and M2 make the WC the single source of selection truth.
- M3 depends on it (the `selectedRows` setter), and is the #1 risk (S2).
- M4 is independent of M1–M3 but touches the same handlers, so it is done after them to avoid rebasing conflicts within the branch.
- The specs are written in M8 but run only in M9.

## S — Spikes

Each spike records its verdict and evidence in PRD §9. Throwaway code goes in the scratchpad or a `_spike-*` folder that is deleted before the PR.

- [ ] **S1** Hit-target origin in the checkbox td. Click the td padding, the mp-checkbox border, the label and the inner input in Chromium, Firefox and WebKit. Log each `click` target and count the `change` events. Accept the design if `closest('mp-checkbox')` gives exactly one toggle for each click location.
- [ ] **S2** Angular echo. Build a signal-host spec around `bs-datatable` with a stub WC event, and count `selection-change` emissions and `selectedRows` setter calls across a page change and a header clear. Pick the minimal guard: an equal key list means no push.
- [ ] **S3** Shift-range with placeholders, using the `windowed-fetch.spec.ts` `setup({ latch: true })` harness. Decide between "loaded keys only" and "refuse while placeholders are in range", then record the rule as D9.
- [ ] **S4** Focus after a click on the td padding. Compare roving focus on the row with focus on the checkbox, using a keyboard walk and axe. Record which one keeps Space/Enter coherent.
- [ ] **S5** Map reconciliation cost. Push `selectedIds` with 10k rows and 1k selected, simulating file-manager's per-render push. Pass if the push takes under 1 ms per render.

## M1 — WC: retain selected rows `[§5.1, D2–D4, D7]`

**Files:** `libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts`

- [ ] Add `_selectedRowCache: Map<string, T>`.
- [ ] Pass `row` into `handleSelectionOnClick` (DT:2691) from `onRowClick` (:2606) and from the keyboard path (:2558).
- [ ] Write the Map in each case:
  - plain, Ctrl and single clicks;
  - shift-range (:2699);
  - checkbox toggle and cascade (:2653, with `collectDescendantKeys` :2291 returning `[key,row]` pairs);
  - context-menu promote (:2632).
- [ ] Clear the Map in `onDeselectAll` (:2674). Prune it in the `selectedIds` setter (:600).
- [ ] Add a `selectedRows` setter that seeds the Map and the keys.
- [ ] Rewrite `resolveRows` (:2743) to return an array **aligned with `ids`**: live row, else Map, else `undefined`. Refresh the Map entry when a live row is found.
- [ ] Change the event detail type: `selectedRows: (T | undefined)[]` (breaking, D3). Update the JSDoc to say "act on `selectedIds`, render from `selectedRows`".
- [ ] K1: key rows with the renderer's stable index, not `-1` (:2747).
- [ ] K2: paginated rendering uses the global index (:2191).
- [ ] D7: `console.warn` once when `fetch` is set or selection is active and a row has no `id` and no custom `rowKey`.
- [ ] `tsc --noEmit`, then commit.

## M2 — WC: mode side-effects + shift-range `[D8, D9]`

- [ ] When `selectionMode → 'none'` clears a non-empty selection, also clear the Map and emit `selection-change` (:593).
- [ ] Shift-range resolves the anchor against the flat model and never adds `__placeholder-*` keys (:2265-2268, :2175), following the S3 verdict.
- [ ] Introduce an `isMulti` helper (`multiple || checkbox`) and replace the `=== 'multiple'` checks (:1063, :2698).
- [ ] `tsc --noEmit`, then commit.

## M2b — WC: reload and fetch state (#407) `[§5.6, D11]`

- [ ] `set fetch` (DT:354-364): return early on the same identity.
- [ ] `set sortColumns` (DT:369-372): skip when structurally equal.
- [ ] `reload({ resetPage = false } = {})`: clear `_lastReloadKey` and the page/child caches, optionally reset to page 1, then schedule. Leave the selection untouched.
- [ ] `applyFetchState({ fetch?, sortColumns?, page?, perPage? })`: assign every provided field without scheduling, then schedule exactly once.
- [ ] Delete the stale `invalidateData` / `setFetchResponse` comments (DT:243, :253, :259).
- [ ] Update the CEM docs for the new methods.
- [ ] `tsc --noEmit`, then commit.

## M3 — Angular wrapper `[§5.2, D5, D6, D11]`

**Files:** `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts`

- [ ] Rewrite `onSelectionChange` (:531-537) to rebuild from `detail.selectedIds` by index: take `detail.selectedRows[i]`, otherwise the existing `selection()` entry with that key, otherwise omit the row from the model (the key stays in the WC).
- [ ] Merge the fetch and settings forwarding effects (:224-229, :248-262) into one effect that calls `el.applyFetchState(...)`. It must **not** read `selection` (S2).
- [ ] Add a public `reload(opts?)` that forwards to the WC.
- [ ] Add a `[rowLabel]` input that forwards to the WC.
- [ ] Change the effect (:476-481) to push `selectedRows`, with the S2 guard. Fixes K3 (no array-index `rowKey`).
- [ ] Remove `compareWith` (:149). Remove its demo binding (`datatables.component.html:147`, `.ts:279`).
- [ ] Correct the `rowKey` JSDoc (:126) to say a stable key is required with `[fetch]`. The fallback stays `row-${index}`, but is documented as unstable.
- [ ] Update the `selectionMode` doc comment (:118) for `'checkbox'`.
- [ ] `tsc --noEmit`, then commit.

## M4 — WC: `'checkbox'` mode + unified keymap `[§5.4, §5.5, D1, D12, D13]`

- [ ] Add `'checkbox'` to the `DatatableSelectionMode` type (:56) and to the attribute parser whitelist (:800-806).
- [ ] `onRowClick`: skip `handleSelectionOnClick` in `'checkbox'` mode, and still emit row-click. Delete the dead `input[type=checkbox]` guard (:2607).
- [ ] `onRowContextMenu`: no promote in `'checkbox'` mode.
- [ ] The checkbox `<td>` click toggles via `onRowCheckboxToggle` unless `ev.composedPath()` enters the checkbox's shadow root (S1; `closest` was rejected). No `focus()`/`preventDefault()` (S4).
- [ ] Stop `dblclick` at the td in **every** mode (D12).
- [ ] Remove the Enter/Space expand branch (:2552-2555) in every mode. ArrowRight/ArrowLeft (:2544-2551) and the expander button stay (D13).
- [ ] `'checkbox'` keyboard (:2558-2572): Enter only emits row-click. Space toggles the checkbox and emits nothing else. Shift+Space does nothing.
- [ ] Default-mode keyboard: unchanged apart from parent rows now reaching the select + row-click branch.
- [ ] `datatable.light.scss`: add `cursor: pointer` on the checkbox cell in `'checkbox'` mode (`:host([selection-mode=checkbox])`). Run `codegen-wc`.
- [ ] `tsc --noEmit`, then commit.

## M5 — Accessibility `[§6, D10]`

- [ ] Set `aria-multiselectable="true"` on the grid for `multiple` and `checkbox`.
- [ ] Keep roving tabindex and focusable rows in `'checkbox'` mode.
- [ ] Focus after a click on the td padding, per S4.
- [ ] Make the announcer count `_selectedIds`, including off-page keys.
- [ ] D14: add a `rowLabel: (row) => string` property and a `selectRowNamed(label)` entry in `labels.ts` (all locales).
  - The name is resolved after render: `rowLabel(row)`, otherwise the trimmed `textContent` of the first data cell, otherwise `selectRow(N)`.
  - Pass it as a string to `mp-checkbox`'s `label`. Do not use `aria-labelledby`: that would cross the shadow boundary.
- [ ] Commit.

## M6 — React + Vue `[§5.3]`

- [ ] Vue `BsDatatable.vue`:
  - widen the `selectionMode` prop (:48);
  - add `selectedRows` and `rowLabel` props assigned to the element ref in `onMounted`/`watch`;
  - expose `reload` via `defineExpose`;
  - keep `inheritAttrs: false` + `v-bind="$attrs"`.
- [ ] React `BsDatatable.tsx`:
  - expose `selectedRows` and `rowLabel` through the ref/props passthrough (`reload` is reachable on the element ref);
  - update the doc comment at :29.
- [ ] `tsc --noEmit` for both libs, then commit.

## M7 — Demos + docs `[G6, D7]`

- [ ] Angular `datatables.component.html`:
  - "Row selection" section (:75-78): add a live `'checkbox'`-mode table **before** its snippet, with `(rowClick)` showing the opened row;
  - fix the `snippetSelectionHtml` claim (`.ts:205-216`);
  - add a row keymap for both modes, next to the filter keymap (:236-242).
- [ ] React `DatatablePage.tsx` and Vue `DatatableView.vue`: add a selection section next to the windowed one, in both modes, with the keymap.
- [ ] `docs/prd/datatable.md`:
  - add a correction note on `compareWith` (:104, :306-317);
  - state that a stable `rowKey` is required with `[fetch]`.
- [ ] Commit.

## M8 — Specs `[§10]`

Write all of these; run them only in M9.

- [ ] WC `mp-datatable.selection.spec.ts`:
  - `'checkbox'` counterparts (context menu, modifiers, td padding);
  - survival across a page change, a sort reload and a fetch re-assignment;
  - a header clear with off-page keys → `[]`;
  - K1/K2 id-less pagination.
- [ ] WC `mp-datatable.keyboard.spec.ts`:
  - `'checkbox'` Enter/Space/Shift+Space;
  - **remove the duplicated describe block at :248-277.**
- [ ] WC `mp-datatable.aria.spec.ts`: `aria-multiselectable`, Enter does not change `aria-selected`, the announcer counts off-page keys, unloaded `selectedIds`.
- [ ] WC `mp-datatable.tree.spec.ts`: a `'checkbox'` counterpart of :117.
- [ ] WC `mp-datatable.windowed-fetch.spec.ts`: revise :180 (aligned array with `undefined`), and add the S3 range case.
- [ ] WC #407 cases (PRD §10 D11 list): same-identity fetch, `applyFetchState`, `reload()` with the selection kept, `resetPage`, equal `sortColumns`.
- [ ] WC D12/D13/D14 cases (PRD §10).
- [ ] Angular: the #407 cross-tick repro gives one request; `reload()` forwards.
- [ ] Angular `datatable.component.spec.ts:102-109` and `datatable.windowed-fetch.spec.ts:65-77`: switch to merge-by-key, and add page-change survival, header clear → `[]`, and `'checkbox'` mode. Drive everything from a `signal()` host.
- [ ] React `event-maps.spec.tsx` and Vue `BsDatatable.spec.ts`: add the `selectedRows` property.
- [ ] e2e `apps/ng-bootstrap-demo-e2e/e2e/datatable-virtual.spec.ts` (`mockArtistApi`): add the cross-page/sort survival flow and the `'checkbox'`-mode row-click flow. Use click, never focus.
- [ ] Commit.

## M9 — Batched verification sweep

Every log goes to the scratchpad raw, and each command records its exit code.

- [ ] `npx nx build mintplayer-web-components` (runs codegen + CEM)
- [ ] `npx nx build mintplayer-ng-bootstrap`, `mintplayer-react-bootstrap`, `mintplayer-vue-bootstrap`
- [ ] `npx nx test mintplayer-web-components`, `mintplayer-ng-bootstrap`, react, vue
- [ ] Datatable e2e: Angular `datatable-*`, plus axe in all three demos
- [ ] Walk each demo by keyboard only, through the MCP browser: both modes, Tab/Enter/Space/Escape, nothing trapped
- [ ] Fill PRD §9 verdicts and write an "As built" section

## Risks

- **Angular echo loop (S2).** This is the #1 risk. If no clean guard exists, fall back to pushing keys plus a separate one-shot `selectedRows` seed only on host-initiated changes.
- **Fallback-key change (K2).** It changes the keys of id-less paginated rows. That only matters to someone persisting fallback keys, which never worked across pages anyway.
- **The file-manager per-render push (S5).** If reconciliation is measurable, skip it when the incoming key list is equal.

## Explicitly rejected (do not resurrect casually)

- **`row-click-selects` boolean, default true.** HTML boolean attributes cannot default to true.
- **Wrappers keeping a shadow data copy.** Rejected in #386. The Map holds selected rows only, inside the WC.
- **Select-all.** The WC cannot know about unloaded rows, and Spark explicitly does not want it.
- **Placeholder row objects in `selectedRows` for unresolved keys.** That would hand consumers fake rows.
