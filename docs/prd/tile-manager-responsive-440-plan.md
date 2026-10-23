# Plan — Tile manager: headless core + responsive layouts (#440)

PRD: [tile-manager-responsive-440.md](./tile-manager-responsive-440.md)

Status: **Proposed** (2026-10-23), grilled with decisions D1–D15 and one review round, not started. The branch will be
`feat/440-tile-manager-responsive`, targeting `master`. Everything lands in **one PR**: the core,
the four fronts, the demos, the docs and the version bumps.

Spike artifacts go in `docs/prd/spikes/issue-440/`, one short `S<n>-*.md` per spike, recording what
was measured, where, and the decision it settles. Browser checks use the `playwright_node` MCP
against the running demos. Test suites run **once**, in M10.

| Milestone | Scope |
|---|---|
| S1–S5 | Span rule, measuring, gesture split, SSR paint, animation |
| M1 | ui-core pure modules: `columns`, `derive`, `scale`, `pack` (moved + range fix), `grid-geometry` (moved), `ssr-css` |
| M2 | `TileManagerMachine`: inputs, measure, gestures, keyboard, commit/preview, optimistic layouts, mode gating |
| M3 | `connect()` + `messages`: per-capability ARIA bags, announcements; scoped SCSS + `flip.ts` |
| M4 | Lit front: rewrite `mp-tile-manager` on the machine (shadow root + slots, adopted sheet) |
| M5 | Angular front: `bs-tile-manager` on `machineSignal`, header/content directives, `[(layouts)]`, SSR `<style>` |
| M6 | React front: `BsTileManager` on `useMachine` |
| M7 | Vue front: `BsTileManager.vue` on `useMachine`, `v-model:layouts` |
| M8 | Demos (ng, React, Vue): breakpoints, width readout, column-count badge, panel checklist (D9), edit/view toggle, localStorage `layouts` round-trip; keymap docs |
| M9 | E2E + conformance + axe; CHANGELOG `### Breaking`; versions; `tile-manager.md` pointer; CLAUDE.md note if a new gotcha appears |
| M10 | A single verification sweep, then push once and open the PR |

## Spikes (run first; each one decides something in the PRD)

### S1: span rule when projecting down (D6)
- Build a scratch page on the existing WC (pre-rewrite is fine) with a datatable, a KPI and a chart
  tile.
- Render 6 → 4, 3, 2 and 1 columns with edge-scaling and with a plain cap, at 390, 768, 1280 and
  2560 px. Take screenshots of each.
- Judge whether `rowSpan` should be capped at 1 column.
- **Decides** the span rule and the `rowSpan` policy.

### S2: measuring and units (§5.3, §5.4)
- Observe the inner grid with `contentBoxSize` during a window drag in Chromium, Firefox and WebKit.
  There must be no `ResizeObserver loop` warning, and state changes only on a count change.
- Check `calc()` and `rem` inside `@container (min-width: …)` in all three engines.
- **Decides** the measurement wiring, and whether SSR resolves to px.

### S3: gesture split (PRD §8, the #1 risk)
- Move the drag and touch long-press decisions into a machine prototype.
- Drive it from the Lit front and from a minimal Angular front.
- Run the keyboard walkthrough at 390 px.
- **Decides** between a DOM-free machine and the shared `GestureController` fallback, before M2 is
  finalized.

### S4: SSR paint (D14)
- Use Angular SSR with the issue's 4 tiles at 3 widths and JS disabled; the correct layout must
  show. That includes the **track count**, which `@container` on `.tile-container` sets on its
  `.tile-grid` descendant.
- Assert that the SSR HTML has **no inline** `grid-column`, `grid-row` or `grid-template-columns`,
  and that the inline values appear only after the first client `measure()`.
- Then hydrate. There must be no NG0500 and no visible reflow.
- **Decides** whether the `<style>` placement and the client cleanup are as specified.

### S5: animation across a count change (§5.3)
- Record FLIP on a breakpoint crossing, with reduced motion on and off.
- **Decides** whether the whole reflow animates or jumps.

## M1: ui-core pure modules
- Add the `libs/mintplayer-ui-core/tile-manager/` entry. Its tsconfig path is auto-discovered the
  same way as the typeahead's; verify this.
- Move `pack.ts` and `grid-geometry.ts` from web-components and add the range fix.
- Add `columns.ts`, `derive.ts`, `scale.ts`, `ssr-css.ts` and `types.ts`.
- Write the unit specs listed in PRD §10, which are pure.

## M2: machine
- Build `TileManagerMachine extends Machine<TileManagerState>` (`ui-core/store`).
- Commands, the count freezing during a gesture or M mode, and an injected timer for long-press.
- Mode gating: `dragMode`/`resizeMode` × `disableMove`/`disableResize` on every path.
- Commit and preview semantics: Escape reverts, blur commits, and a no-op commit emits nothing.
- The D15 commit payload (`layouts`, `staleCounts`) and `resetLayout(count)`.
- Optimistic `layouts`: a new object from `setInputs` replaces the internal copy.

## M3: connect, messages, styles
- `connect(snapshot, rootId)` builds the bags for the board, tiles, handles, grips, instructions and
  live region.
- Add `messages.ts` with a localizable type.
- Port `tile-manager.scoped.scss` from the current element SCSS, including:
  - the min floors (D14);
  - `:focus-visible`;
  - the reduced-motion rules.

  Add it to the ui-core codegen target.
- Add `flip.ts`, the shared DOM helper.

## M4: Lit front
- Rewrite `libs/mintplayer-web-components/tile-manager` on `MachineController` with the `props()`
  directive.
- Keep the shadow root with the named slots, and use `adoptLightStyles` for the scoped sheet.
- Port the element and ARIA specs, translating them to the new API.

## M5: Angular front
- `bs-tile-manager` renders the §5.2 tree natively, with no `<mp-tile-manager>`.
- `*bsTileHeader` / `*bsTileContent` replace `bs-tile` / `bs-tile-header`.
- `layouts = model()`, plus the outputs.
- On SSR, render the full tree plus the `breakpointCss` `<style>`, and install the sheet via the
  scoped-styles server installer.
- The specs drive inputs from signals.

## M6: React front
- `BsTileManager` uses `useMachine` / `reactProps`.
- Content through `renderHeader` / `renderContent`.
- Support both the controlled `layouts` and the uncontrolled `defaultLayouts`.
- Add an attribute-passthrough row.

## M7: Vue front
- `BsTileManager.vue` uses the `useMachine` composable.
- `#header` and `#content` scoped slots, and `defineModel('layouts')`.
- Add `inheritAttrs:false`.
- Add an attribute-passthrough row and a behaviour spec.

## M8: demos and docs
- All three demos get:
  - a `breakpoints` editor (or a `stackBelow` input);
  - a width readout and a column-count badge;
  - a panel checklist showing host-owned visibility;
  - an edit/view toggle that binds the modes to `'off'`;
  - `layouts` persisted per count in localStorage.
- Each demo shows the demo first, then the snippet, and documents the keymap.

## M9: E2E, conformance, release notes
- Write `tile-manager-responsive.spec.ts` (ng, react and vue) covering PRD §10.
- Update the keyboard walkthrough at 390 px.
- Add axe entries for the projected and read-only states.
- Add the four-front DOM conformance test.
- Write the CHANGELOG `### Breaking` table (PRD §7) and the version bumps (PRD §11). **Get the
  owner's call on web-components 3.0.0 vs a minor first.**
- Add a pointer in `tile-manager.md`.

## M10: verification sweep (once, at the end)
- Build `mintplayer-ui-core`, `mintplayer-web-components` and the three front libs.
- Run `nx test` for `mintplayer-ui-core` (tile-manager), `mintplayer-web-components` (tile-manager)
  and the ng/react/vue tile-manager specs.
- Run the new e2e spec, the walkthrough and the axe entries.
- Push once, read the single CI run, then open the PR.
