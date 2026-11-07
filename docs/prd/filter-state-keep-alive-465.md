# PRD — Filter state lives in the datatable; overlay content survives a close (#465)

Issue: [#465](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/465) · Plan:
[filter-state-keep-alive-465-plan.md](./filter-state-keep-alive-465-plan.md) · Spikes:
`docs/prd/spikes/issue-465/` · Status: **Draft, grilled 2026-11-07** (decisions D1–D10 below are the
owner's answers).

Companion change in MintPlayer.Spark: `docs/column_filter_reopen_selection_PRD.md` (the panel renders
from `ctx.selection`), extended by §6 of this document (two-way `filters`, read-only).

## 1. The bug, as the user sees it

On <https://coverage.mintplayer.com/query/platform-lifecycle> (a Spark grid): tick some values in a
column's filter popup, close it, reopen it — **every box is unticked**, although the grid is still
filtered. On <https://bootstrap.mintplayer.com/enterprise/datatables> (the library's built-in panel) the
same steps keep the ticks.

## 2. Cause (measured and read, master `6ad1d95c8`)

Two independent defects, one in each repository:

1. **Spark keeps its own copy of the selection.** `spark-column-filter-panel.component.ts:59`
   `selected = signal<DistinctValue[]>([])`, `inverse` (:61) and `freeText` (:63) start empty and
   `ctx.selection` is never read. The panel only works for as long as it lives.
2. **The datatable destroys the panel on every close.** The `filter` slot sits inside
   `v-if="fc.open && fc.open.custom"` (`ui-core/datatable/src/templates/datatable.view.vue:52`);
   `fc.open` is non-null only while `state.filterColumn === column` (`datatable.ts:970`), and closing
   sets it to `null` (`datatable.core.ts:1036-1039`). All four fronts compile that `v-if`, so the slot
   is destroyed in Angular, React, Vue and Lit alike, and Spark's copy goes with it.

The built-in panel survives only because every tick is derived from the core's selection by value
(`datatable.ts:899`). Spark also binds the datatable's `filters` model **one-way out**
(`(filtersChange)` only, `spark-query-grid.component.html:75`): its URL preset filters are never written
into the datatable, so even a panel that reads `ctx.selection` would not show them ticked.

### 2.1 The overlay audit (same root, wider)

The issue claims "overlays render their content once, then only show/hide it". Measured against the
generated fronts, that holds in exactly two places:

| Overlay | Angular | React | Vue | Lit |
|---|---|---|---|---|
| modal / offcanvas default content | kept (`<ng-content>` belongs to the parent view) | **lost** (`view.rendered ? <BodyPortal>`) | **lost** (`v-if="view.rendered"` + teleport) | kept (`LightChildren.capture()`) |
| modal / offcanvas header, footer | **lost** (`ngTemplateOutlet` inside `@if`) | **lost** | **lost** | kept as nodes; `*Renderer` callbacks rebuilt |
| popover, tooltip, `[bsDropdown]` content | **lost** (`createEmbeddedView` per open, `destroy()` on close, `ng machine/src/overlay-directive.ts:51-62`) | **lost** | **lost** | **lost** (`render(nothing)`, `core-directive.ts:41-52`) |

Every overlay core gates its markup on `isRendered(phase)` (`ui-core/overlay/src/presence.ts:26`,
`phase !== 'closed'`), and the fronts unmount on it.

## 3. Goals

- **G1. The datatable core is the single source of truth for filter state**, settable from outside and
  two-way bound in all four fronts (it already is a `model: true` input; Spark must use it).
- **G2. A one-way bound grid cannot drift**: with `filtersReadonly`, filters are set programmatically
  only; the user sees them and cannot edit them.
- **G3. Ticked values stay ticked** across close/reopen, across new data (rows, distincts from the
  server, a list where the ticked value is gone) and across outside writes to `filters`.
- **G4. Panel content survives a close**: a column's filter panel body (custom slot and built-in) is
  created on its first open and kept, hidden, afterwards.
- **G5. Every overlay follows the same rule** in every front: content is created on first open and
  kept, hidden, until the component/directive is destroyed.

## 4. Non-goals

- Drafts in the `filters` model (D2): the model stays *applied filters only*; equal filters stay equal
  requests.
- Inferring one-way binding from a missing change listener (D3).
- An opt-out (`destroyOnClose`) (D9).
- Server-side rendering of closed overlays: a closed overlay still renders nothing on the server.
- Toast: each toast is a transient data item, removed when dismissed, not "closed" (see D8 note).

## 5. Decisions (grilled 2026-11-07)

| # | Decision | Why |
|---|---|---|
| D1 | The datatable core owns filter state; `filters` (`model: true`) is its two-way channel in every front. Panels — built-in and consumer — are **stateless views of `ctx`**. | One source of truth; outside writes (URL, server, Clear) show up ticked. |
| D2 | `filters` carries **applied filters only**. Drafts (inverse with nothing ticked, half-typed operand) stay core-internal and survive a close; the search term still resets on close. | Equal filters ⇒ equal requests; drafts never reach the wire or a URL. |
| D3 | One-way consumers set an **explicit `filtersReadonly`** input (default `false`), identical in all four fronts. Nothing is inferred. | Angular `model()` and Lit DOM events cannot tell `[filters]` from `[(filters)]`; inference would make fronts differ. |
| D4 | A read-only filter column's panel **opens and shows the applied state with every editing control disabled** (checkboxes, invert, clear, operator, operand). The search box stays enabled: it narrows the list and edits nothing. The slot gets `ctx.readonly === true`; `apply`, `compare` and `clear` are no-ops (no `filtersChange`). `search` and `close` still work. | The user can still see *why* rows are missing. |
| D5 | A column's panel **body** (custom slot **and** built-in) is created on the column's **first open** and kept, hidden by the native `popover="auto"`, after every close. Never-opened columns build nothing. The kept body is destroyed when the column stops being filterable, changes `filterMode`, or leaves `columns`. | One rule; scroll position, unapplied text and focus state survive. |
| D6 | Per-open behaviour stays per open, **driven by the core**: `ctx.term` is `''` on reopen, distincts are re-fetched on open, focus moves into the panel on **every** open. A closed column's `ctx` carries `values: null`, `loading: false`, its current `selection`, `term: ''`. | Keeps the filter-row PRD's contract (§13.1 "search term resets on close"). |
| D7 | Built-in options are **keyed by value** (canonical JSON), and a click resolves the value by that key, not by index. A ticked value absent from new data stays listed first, ticked. | Index keys shift when new data arrives; a click racing a re-render can resolve to the wrong value. |
| D7b | The selection snapshot (`filterSnapshots`, taken when a selection first becomes non-empty) stops being the **whole** universe of listed values: the universe is snapshot ∪ loaded, so a value that arrives with new data is listed and can be ticked. The snapshot still keeps a list from collapsing to the selection. | Found writing T4: with a tick in place, a new value in new rows or a new server list was never listed (`bucketDistincts`, `datatable.ts:588-589`). |
| D8 | An **open** panel with a `distincts` source **re-queries** when the *other* columns' filters change from outside. Loop-proof by construction (§5.1). | A faceted list is computed over the other columns' filters; it goes stale otherwise. |
| D9 | **Every overlay** — modal, offcanvas, popover, tooltip, `[bsDropdown]` / dropdown-menu, context menu — keeps its content after the first open, hidden (`display: none`: out of the tab order and the accessibility tree), in all four fronts. **Fixed behaviour, no opt-out.** | The convention the issue cites, made true everywhere. A consumer that wants a reset does it on the open/close event or binds its form to its own state. |
| D10 | Overlays are in **this PR** (one PR per task). The Spark change is a separate PR in its own repository. | Owner's call. |

*Toast* is excluded from D9 pending review: a dismissed toast is removed from its stack, it does not
"close". If the owner reads D9 as including toast, it joins M6 unchanged.

### 5.1 Why D8 cannot loop

- An outside `filters` write is compared canonically with the core's own (`datatable.core.ts:1404-1409`);
  the echo of our own `filtersChange` is equal and ignored in every front (Angular `model()` echo, React
  controlled prop, Vue `v-model`, Lit property write-back — verified per front in S4).
- The re-query writes `filterLoaded` / `filterLoading` only, never `filters`, and emits nothing.
- It fires only when the changed set excludes the open column's own entry (the facet ignores it).
- Tests T8a/T8b pin: one outside change ⇒ exactly one `distincts` call; an echo ⇒ zero.

## 6. Design

### 6.1 Datatable core (`ui-core/datatable`)

- **State**: `filterMounted: readonly string[]` — columns opened at least once. Appended on the open
  toggle; pruned in `inputsChanged` to columns still present, filterable and in the same `filterMode`
  (a mode change drops the entry, so the body rebuilds in its new mode).
- **View** (`connectDatatable`): `DatatableFilterCell` gains `body: DatatableFilterPanel | null` —
  non-null when the column is mounted — and keeps `open` as a boolean-ish flag for styling/ARIA.
  `filterPanel(column, open)` builds `ctx` per column: shared `values`/`loading`/`term` only for the
  open column, D6 defaults otherwise. The template's condition becomes `fc.body && fc.body.custom` /
  `v-else-if="fc.body"`, so the body no longer depends on the open state; the popover hides it.
- **Focus**: unchanged trigger (`focusFilter` set on the open toggle, consumed after render), but the
  `.filter-panel-body` first-child guard no longer implies "freshly mounted"; S1 confirms the toggle event
  fires after the popover is shown so `focus()` lands on a visible element on reopen.
- **Options** (D7): `key: canonicalJson(value)`; the input carries `data-dt-filter-value=<key>`;
  `onChange` resolves by key against the current list (and the selection).
- **Read-only** (D3/D4): new input `filtersReadonly`; the manifest adds it to all four fronts. The built-in
  bags write `disabled` on every control; `filterCommands` gate `apply`/`compare`/`clear`;
  `FilterContext.readonly: boolean` is added. Programmatic `filters` writes keep working.
- **Re-query** (D8): in `inputsChanged`, when the outside `filters` differ canonically, a panel is open, a
  `distincts` source exists and an entry other than the open column changed → `loadDistincts(open,
  term, false)`.
- **Docs**: `FilterContext` doc comment says the slot is created once per column and lives until the
  column changes; the panel must render from `ctx`. `types/filter.ts:94` drops the stale
  `*bsDatatableFilterPanel` name.

### 6.2 Fronts

No hand-written front changes for the datatable: the template and manifest regenerate all four. S1
verifies each front updates the kept slot's context in place (Angular `ngTemplateOutlet` with a new
context object and the same template does not recreate the view; React render prop at a stable position
keeps the child's identity; Vue scoped slot; Lit template).

### 6.3 Overlays (D9)

- **Presence** (`ui-core/overlay/src/presence.ts`): a `mounted` latch next to the phase —
  `isMounted = phase !== 'closed' || openedOnce`. Cores expose `view.rendered` from the latch instead of
  the phase, and write `hidden` (or rely on Bootstrap's own `display: none` without `.show`/`.d-block`,
  decided per overlay in S5) on the root while `closed`.
- **Entering from kept markup**: `whenRendered` currently resolves as soon as the root exists. With kept
  markup it exists already, still in its closed form, so the `.show` transition would have no starting
  point. Cores stamp the phase on the root (`data-mp-phase`) and `whenRendered` waits for
  `entering` (S2).
- **Body host**: kept across closes; `data-bs-theme`, `dir` and `lang` are re-copied on every open (S3).
  React `BodyPortal` stays mounted after the first open; Vue's teleport target keeps its `v-if` on the
  latch (`emit-vue.mjs:53-66`); Lit `bodyTeleport` no longer `render(nothing)` on close; Angular's
  `overlay-directive.ts` keeps the embedded view and detaches nothing on close, destroying it with the
  directive.
- **Lifetime**: kept content is destroyed with its component/directive (a destroyed tooltip trigger
  removes its tooltip).
- **A11y**: a closed overlay's kept content is `display: none` — not focusable, not in the accessibility
  tree; the overlay stack's `inert` handling is unchanged (S5).

### 6.4 Spark (separate PR, MintPlayer.Spark)

Extends Spark's `column_filter_reopen_selection_PRD.md`:

1. The panel renders from `ctx.selection` (its §6, unchanged) and honours `ctx.readonly`.
2. `spark-query-grid` binds `[(filters)]` (translating its `QueryColumnFilter[]` both ways), so URL
   presets reach the datatable and show ticked.
3. Bump `@mintplayer/ng-bootstrap` / `ui-core` to the release that ships this PRD.

## 7. Accessibility

- Kept, closed filter bodies and overlay content are `display: none` (popover closed / `hidden`): out of
  both trees (CLAUDE.md "hidden means hidden from both trees").
- Read-only controls use the native `disabled`, which removes them from the tab order; the panel still
  receives focus on open (its first focusable, else the panel itself with `tabindex="-1"`), so a keyboard
  user can read the state and Escape out.
- Focus moves into the panel / overlay on every open, and returns to the trigger on close, unchanged.

## 8. Breaking changes (CHANGELOG `### Breaking`)

- Overlay and filter panel content is no longer recreated on open; a consumer relying on a fresh
  component per open must reset on the open event.
- `FilterContext.readonly` added; `DatatableFilterCell.body` added, `open` narrowed (internal view type).
- Built-in filter option keys and `data-dt-filter-value` change from index to value key.

## 9. Acceptance criteria

1. Tick → close → reopen keeps the ticks, built-in and custom, in all four fronts and in Spark.
2. New data (rows, a different distincts response, a list without the ticked value) keeps the ticked
   values ticked; a click after new data ticks the value clicked.
3. `filters` written from outside (while closed and while open) shows ticked on (re)open / in place.
4. With `filtersReadonly`, the panel opens, shows the state, and no user action emits `filtersChange`;
   programmatic writes still filter the rows.
5. A consumer panel's instance and DOM node are the same object across close/reopen; `ctx` is current
   after each reopen (`term === ''`, fresh values); focus moves in on every open.
6. Every overlay's consumer content is created once across open/close/open in every front; closed
   content is not focusable; enter/leave transitions, focus trap and focus return still work on reopen.
7. Existing filter-row, overlay unit specs and e2e stay green.
