# Plan — Tile manager: headless core + responsive layouts (#440)

PRD: [tile-manager-responsive-440.md](./tile-manager-responsive-440.md)

Status: **In progress** (2026-10-23), grilled with decisions D1–D15 and one review round. S1–S5, M1
(`19576ed2`), M2 (`27ae0b55`, `1e3798c1`), M3 (`b89b16d0`), M4 (`ddb695f5`), M5 (`f1b946a8`, `5c1ed56c`, `420b871b`), M6 (`2d26609f`), M7 and M8 are done; next is M9. Specs are written but run only in M10.
The branch is `feat/440-tile-manager-responsive`, targeting `master`. Everything lands in **one PR**: the core,
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
- Keyboard state is `{ kind: 'move' | 'resize', tileId, entry }`. **R enters resize mode**, where
  plain arrows resize (PRD §6, the owner's request of 2026-10-23); M/R switch mode and keep `entry`.
  Announcements and instructions name the active mode. Specs: R gated by `resizeMode`/`disableResize`,
  switching keeps Escape reverting to the entry layout, and Shift+arrow in M still resizes.
- A keyboard step that lands on a locked tile **skips past it**: keep stepping in that direction to
  the first cell where the pack is not blocked. Only announce "Move blocked." when there is no such
  cell, and announce the edge ("Already in row 1.") instead of doing nothing silently. Owner,
  2026-10-23: on the S3 page, M + ArrowDown on "Revenue" said "Move blocked." because the locked
  "Notes" tile sat directly below, so up/down looked broken while left/right worked. Regression spec.
- Every gesture computes from the **rendered** (projected) position, never the stored one.
  Regression spec, reproduced by the owner on the current WC on 2026-10-23: a layout authored for 4
  columns, rendered at 2, then a drag of the right-hand tile. The tile must move by the pointer
  delta. On `master` it jumps ~560 px right, because positions outside `1..n` create implicit grid
  tracks while `cellOrigin` assumes n equal ones.
- The drag translate is measured from the cell the tile is **rendered** in, never from the gesture's
  target rect. Over a locked cell the preview keeps the last valid place, so measuring from the
  blocked target threw the tile ~800 px at each cell crossing (owner, S3 page, 2026-10-23). Regression spec.
- Decided while implementing: `messages.ts` lands in M2 (the machine announces through it); M3 adds the
  instruction strings. M or R on a tile that allows neither is not consumed; on a tile that allows only
  the other one it announces "cannot be moved/resized". A column-count change waits until M/R mode ends
  (the count is frozen) and is announced then. Pointer gestures are ignored while M/R mode is active.

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
- Done as: `connect(machine, rootId)` with a keyed `descriptions` list (board description plus one
  instruction node per capability set in use); `TileFlip` stays in `dom.ts` next to the other DOM
  readers instead of a separate `flip.ts`; `label` and `minRowHeight` became machine inputs; state
  data attributes are presence-only (`data-dragging`, not `="true"`). `connect.spec.ts` covers the
  pre-measure Tier 2 render, modes off, a locked tile, M/R mode and a hidden then re-shown tile.

## M4: Lit front
- Rewrite `libs/mintplayer-web-components/tile-manager` on `MachineController` with the `props()`
  directive.
- Keep the shadow root with the named slots, and use `adoptLightStyles` for the scoped sheet.
- Port the element and ARIA specs, translating them to the new API.
- Done as: `mp-tile-manager.ts` (class `MintTileManagerElement` kept). One `ResizeObserver` on the grid,
  `measure` in the next frame; only changed properties are forwarded. `minColumnWidth` and `gap` are now
  numbers (px). The WC `types/`, `utils/` and `.element.html/.scss` are gone; the barrel re-exports the model
  types and `withoutNarrowerLayouts` from ui-core by name. `TileFlip` tolerates a DOM without the Web
  Animations API or `matchMedia` (jsdom). The old 1400 lines of element specs became two wiring specs; the
  layout and keyboard rules they used to cover are pinned in the ui-core machine specs.

## M5: Angular front
- `bs-tile-manager` renders the §5.2 tree natively, with no `<mp-tile-manager>`.
- `*bsTile="let tile of tiles()"` wrapping `*bsTileHeader` / `*bsTileContent` replaces `bs-tile` / `bs-tile-header`; its `of` is the tile list (no `[tiles]` input).
- `layouts = model()`, plus the outputs.
- On SSR, render the full tree plus the `breakpointCss` `<style>`, and install the sheet via the
  scoped-styles server installer.
- The specs drive inputs from signals.
- Done as: `tile-manager.component.{ts,html}` + `directives/tile-template.directives.ts` (`*bsTile` stamps the consumer block per tile with an injector holding that tile's `BsTileSlots`; `*bsTileHeader` / `*bsTileContent` register into it, so `tile` is in scope by closure; slots kept per id via `linkedSignal`, so a new tile object updates the view in place; the manager reads `tiles` from `bsTileOf` via a computed, since a push from the directive would be NG0600).
  `bs-tile` / `bs-tile-header` are deleted. One effect per input
  forwards only what changed, and `layouts` is echo-guarded by reference against the machine snapshot so
  an unrelated input change never re-pushes a stale record. Host `aria-label` / `-labelledby` /
  `-describedby` are read via `HostAttributeToken` (deterministic for hydration), removed from the host
  and merged into the board bag. `grid` is an optional `viewChild` because the machine notifies before
  the view exists. Angular strips `<style>` from templates, so the D14 `breakpointCss` is written on the
  server into `<head>` through the scoped-style registry (`tile-manager-layout-<id>`). Demo ported
  (Edit-layout switch, hide/lock panels, column badge, stored-layouts JSON). Verified in the browser:
  hydrates with no `<mp-tile-manager>`, stacks below 576px, 5 columns at 1280px, keyboard move commits
  into `[(layouts)]` and localStorage.

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
