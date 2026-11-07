# Plan — Filter state in the datatable; overlay content survives a close (#465)

PRD: [filter-state-keep-alive-465.md](./filter-state-keep-alive-465.md)

Status: **Draft** (2026-11-07). Proposed branch `fix/465-filter-state-keep-alive` from `master` (not yet
created — needs the owner's go). One PR here; one PR in MintPlayer.Spark (M10).

Spike notes go in `docs/prd/spikes/issue-465/`, one short `S<n>-*.md` each: what was measured, where,
and what it settles. Browser checks use the `playwright_node` MCP against the running demos.

**Tests first.** Each fix milestone is preceded by a milestone that writes its regression tests and
records them **red** (by reading/type-checking plus one targeted run of only the new specs, since a
red-first proof needs one run). The full suite sweep still runs **once**, in M11.

| Milestone | Scope |
|---|---|
| S1–S6 | Spikes (below) |
| M1 | Datatable regression tests (red) |
| M2 | Core: mounted bodies, per-column `ctx`, value-keyed options, focus per open |
| M3 | `filtersReadonly` + `ctx.readonly` |
| M4 | Re-query on outside filter change (loop-proof) |
| M5 | Overlay regression tests (red) |
| M6 | Overlay keep-alive: presence latch, phase stamp, body hosts, Angular directive views |
| M7 | Compiler / generated-front adjustments found in S3 (Vue teleport `v-if`, React `BodyPortal`, Lit `bodyTeleport`) |
| M8 | Demos (ng, React, Vue): read-only toggle, a long custom list showing kept scroll, a modal with a stateful form |
| M9 | Docs: `FilterContext` doc, `types/filter.ts:94`, filter-row PRD pointer, CLAUDE.md overlay rule, READMEs, CHANGELOG `### Breaking`, versions |
| M10 | MintPlayer.Spark: panel from `ctx`, `[(filters)]`, `ctx.readonly`, tests, dependency bump |
| M11 | One verification sweep (builds, unit, e2e for datatable + overlays), push once, open the PRs |

## Spikes

### S1: kept slot, live context, focus on reopen
- In each front, render a slot at a stable position and pass a **new** context object per render:
  Angular `ngTemplateOutlet` (same `TemplateRef`), React render prop, Vue scoped slot, Lit template.
- Record whether the consumer component is re-created (counter in its constructor / `useEffect` /
  `onMounted` / `connectedCallback`).
- Check in Chromium, Firefox and WebKit that the popover `toggle` event (newState `open`) fires after the
  panel is visible, so `focus()` lands on reopen.
- **Decides** whether the generated fronts need any change for D5/D6.

### S2: entering from kept markup
- With the root kept in its closed form, show that `whenRendered` resolves before the `entering` render
  and the `.show` transition is skipped (modal fade).
- Try `data-mp-phase` on the root and waiting for `entering`.
- **Decides** the presence change in §6.3.

### S3: body hosts that outlive a close
- For each front, keep the host after close: React `BodyPortal` (host created in `useEffect`), Vue
  `<Teleport>` + emitter `v-if` (`emit-vue.mjs:53-66`), Lit `bodyTeleport` (`render(nothing)`), Angular
  `overlay-directive.ts` embedded view.
- Check that `data-bs-theme` / `dir` / `lang` follow changes between opens, and that destroying the owner
  removes the host.
- **Decides** M6/M7 per front.

### S4: the filters echo, per front
- Trace one user tick through `filtersChange` and back in through `[(filters)]` / `v-model:filters` /
  React controlled prop / Lit write-back. Confirm the canonical compare (`datatable.core.ts:1404-1409`)
  sees an equal value each time.
- **Decides** that D8's guard is sufficient (PRD §5.1); if a front re-enters with a non-equal shape,
  that front's echo is fixed in M4.

### S5: how a kept, closed overlay is hidden
- Per overlay, find what hides it without `.show`: Bootstrap `.modal` (`display: none` unless
  `.d-block`/style), `.offcanvas` (visibility), `.popover` / `.tooltip` / `.dropdown-menu` (no default
  hide in our parts?).
- Confirm with the accessibility snapshot that closed content is out of the tree and not tabbable;
  confirm the overlay stack's `inert` bookkeeping is untouched.
- **Decides** whether cores write `hidden` on the root.

### S6: value keys
- Reuse the core's canonical JSON for `DistinctValue.value` (including `null`, `NaN`, numbers vs
  strings `1`/`"1"`). Confirm keys are unique and stable, and that an attribute-safe form is needed for
  `data-dt-filter-value`.
- **Decides** the key function for D7.

## M1 — datatable regression tests (written first, red)

ui-core `datatable.core.spec.ts` / `datatable.spec.ts` (jsdom), plus one spec per front for slot
identity, plus `apps/ng-bootstrap-demo-e2e/e2e/datatable-filter.spec.ts` for the real-browser parts.

| # | Test |
|---|---|
| T1 | Custom slot: a consumer panel with internal state (a counter, a typed value) survives close → reopen; same instance (construct count 1) and same DOM node. Angular, React, Vue, Lit. |
| T2 | On reopen, `ctx.selection` is current, `ctx.term === ''`, `ctx.values` comes from the new fetch (the `distincts` stub returns a different list on the second open). |
| T3 | Built-in: tick A and B, close, reopen → A and B ticked. |
| T4 | Built-in, new data: tick A; the server returns a reordered list without A and with new values → A still ticked and listed first; clicking B ticks B (not the value now at B's old index). Same for local `data` replacement. |
| T5 | Click vs render race: replace the loaded list in state, dispatch `change` on the still-rendered option for X before the re-render → X is applied. |
| T6 | `filters` written from outside while closed → reopen shows them ticked (built-in) / in `ctx.selection` (custom), including values not in the distinct list (fallback label). |
| T7 | `filters` written from outside while open → ticks update in place; same panel instance. |
| T8a | Open panel with `distincts`; an outside change to **another** column's filter → exactly one `distincts` call, with the new facet. |
| T8b | The echo of our own `filtersChange` (two-way bound, all four fronts) → zero extra `distincts` calls and no second `filtersChange`. |
| T9 | (M3) `filtersReadonly`: every built-in control `disabled`; `ctx.readonly === true`; `ctx.apply` / `compare` / `clear` emit no `filtersChange`; a programmatic `filters` write still filters the rows; the panel still opens and focus lands in it. |
| T10 | Focus moves into the panel on the first **and** the second open (kept body). e2e. |
| T11 | No body exists for a never-opened column; the kept body is destroyed when the column becomes non-filterable, changes `filterMode`, or is removed from `columns`. |
| T12 | A closed kept body is not tabbable and not in the accessibility tree. e2e. |

## M5 — overlay regression tests (written first, red)

One spec per overlay per front (`_conformance/overlay-keep-alive.spec.ts` in each lib, table-driven),
plus e2e for transitions and focus.

| # | Test |
|---|---|
| O1 | Consumer content (default slot, header, footer, directive template) is created once across open → close → open: modal, offcanvas, popover, tooltip, `[bsDropdown]`, context menu. All four fronts. |
| O2 | Closed kept content is not focusable and not in the accessibility tree. |
| O3 | The enter/leave transition runs on the second open (phase sequence `entering` → `shown`; `.show` added after a flushed frame). e2e. |
| O4 | Focus trap and focus return work on the second open. |
| O5 | The body host's `data-bs-theme` / `dir` / `lang` follow a change made while closed. |
| O6 | SSR: a closed overlay still renders no body-host markup (unchanged). |
| O7 | Destroying the owner (component / directive / trigger) removes its kept content and host. |

## M10 — MintPlayer.Spark

Follows Spark's `docs/column_filter_reopen_selection_PRD.md` (M1–M4 there), extended with the
`[(filters)]` binding, `ctx.readonly` handling and the dependency bump. Tests first there as well: the
panel spec (stub `FilterContext` with a pre-selected value, inverse and free text; ticking a second
value applies both), and a grid spec showing a URL preset filter arrives ticked in the panel.
