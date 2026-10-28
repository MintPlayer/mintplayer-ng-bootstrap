# Plan — Headless core + four fronts for the whole catalog (#437)

**PRD:** `docs/prd/headless-catalog-437.md`.
**Status:** in progress — M0–M3 done, M4 under way. Draft PR #439.
**Branch:** `feat/headless-catalog-437`, rebased onto `master` at fd49127e on 2026-10-28 (picks up tile-manager #441, datatable fill mode #443, package versioning #445 / #447).
**Delivery:** one PR. Commit per milestone; the test sweep runs once at the end (M9).

Each component milestone is the same checklist, done for every component in the wave:

1. **Core** in `ui-core/<name>`, covering:
   - machine
   - `connect()` bags
   - `<name>.scoped.scss`, with no Bootstrap partials (C4)
   - specs, ported from the WC `*.spec.ts` and `*.aria.spec.ts`
2. **Fronts.** An Angular component, a React component, a Vue SFC, and the Lit element rebuilt on the core.
   - All four render their own template, with the no-JS carriers in the template (D4).
   - None contains `<mp-*>`.
3. **Demo pages** in all three apps updated to the new API, with the keymap documented.
4. **E2e.** Port the existing e2e and add `<name>-nojs.spec.ts` (PRD §9.3).
5. **CHANGELOG** `### Breaking` entry for the component.

## M0 — Spikes (PRD §7)

- [x] S1 Bootstrap layering, all three demos
- [x] S12 React/Vue SSR sheet collection (pairs with S1)
- [ ] S2 compound cores (radio-group + radio [x], accordion [x] + tab)
- [x] S3 nested cores (tree-select over treeview): (a) sub-machine. `attachTreeController` (ui-core/treeview) is the shared tree behaviour; the tree-select core attaches it with a `click` hook and reuses `connectTreeview` for the row bags
- [x] S5 hydration with consumer templates and pre-hydration text
- [ ] S6 measurement-free server layout (carousel, splitter, hierarchy chart)
- [ ] S9 navbar dropdown CSS-only open
- [x] S8 base-select under SSR
- [x] S11 theme cookie SSR and code-snippet highlighting
- [ ] S4 virtual window in React/Vue (before M5)
- [x] S10 query-builder editor contract (before M5): a front-native `editor` slot; the leak spec is moot (below)
- [ ] S7 scheduler static grid go/no-go (before M6)
- [x] S13 single template in the core, compiled into the four fronts (navbar prototype); widened into D10 / M3b
- [ ] Write each verdict into PRD §7, and update D1–D9 and C1–C8 accordingly

## M1 — Bootstrap baseline (PRD §6)

- [x] `ui-core/styles/bootstrap.scss` plus prebuilt `bootstrap.css`:
  - Bootstrap in `@layer mp.bootstrap`
  - the layer order declared once
  - the button re-bind, `color-mode.css` and the utility patches carried over
- [x] `libs/mintplayer-ng-bootstrap/_bootstrap.scss` becomes a re-export, and the commented-out partials are enabled through the baseline
- [x] React and Vue demos import the baseline instead of `bootstrap.min.css`
- [x] Scoped-sheet codegen wraps output in `@layer mp.components`
- [x] Typeahead scoped sheet: drop the `form-control` and `dropdown` partial imports (fixes the pilot's specificity trap)
- [x] `_conformance/no-bootstrap-partials-in-scoped.spec.ts`
- [x] `collectScopedStyles()`, wired into React and Vue `entry-server`
- [x] Permanent override-probe e2e (consumer CSS beats the component) in all three demos

## M2 — Shared ui-core infrastructure (PRD D8)

- [x] `ui-core/overlay`: placement with flip, dismiss stack, open state. Move the typeahead onto it (fixes the pilot's no-flip deviation).
- [x] `ui-core/roving`
- [x] `ui-core/announce`
- [x] `ui-core/focus` (trap, restore by key, inert)
- [x] `ui-core/forms`:
  - `adoptPreHydrationText`, generalised out of the Angular typeahead
  - `errorFeedback` bag
- [x] `ui-core/tree`
- [x] `ui-core/virtual-window` (per the S4 result)
- [x] `ui-core/drag`
- [x] Move into ui-core:
  - `swiper-core`, `scheduler-core`, `timeline-core`, `charts/core` and `phone-core`
  - theming store and cookie
  - datatable sort
  - the query-builder model
- [x] Bridges:
  - a compound-registration helper per front (S2): **deferred to M3**, built with radio-group when S2 runs
  - a `hrefFor` convention type
  - hydrated marker in the bags: `data-mp-hydrated` (`ui-core/store` `hydratedAttr`), an attribute rather than the `mp-hydrated` class, because `class` stays the front's
- [x] Conformance specs:
  - no `<mp-*>` in the framework libs (§9.1)
  - SSR non-empty per demo route (§9.2)
  - the shared e2e hydration-warning listener (§9.4)

## M3 — Wave A (PRD §8)

- [x] card (no core): class mapping in `ui-core/card`; `navStyle` dropped (breaking)
- [x] input-group (no core): plain `.input-group` in every front; sheet in `ui-core/input-group` for RTL, bare and hosted controls. The Lit `mp-input-group` stays a shadow WC until phone-input converts (M4), because `mp-phone-input` composes it in its shadow root
- [x] checkbox / switch (no machine; the native input is the state): ids, classes and the ARIA bag live in `ui-core/checkbox`. `BsControlValidityDirective` exposes signals the front renders, and the error node is `.invalid-feedback d-block`. The Lit `mp-checkbox` stays a shadow WC until datatable converts (M5), because `mp-datatable` renders it in its shadow root
- [x] toggle-button (new Angular front): `bs-toggle-button` is a second selector of `BsCheckboxComponent` with the type fixed, so there is one code path, not a duplicate component. React and Vue compose `BsCheckbox`, and Lit `mp-toggle-button` is light DOM on `connectCheckbox`
- [x] radio + radio-group
- [x] pagination (+ `hrefFor`)
- [x] shell
- [x] accordion (+ tab)
- [x] tab-control (+ page); delete `isServerSide` — the Lit `mp-tab-control` stays as-is until the dock converts (M6)
- [x] dropdown-menu — moved to M4: the navbar dropdown detects submenus through it and its DSD injector reads the menu chrome, so it converts together with the navbar
- [x] sparkline (+ Vue front)
- [x] Delete the shell and accordion chrome generators, injectors and targets (removed with their components; dropdown-menu, navbar and carousel follow in M4)

## M3b — Component compiler (PRD D10; gates the rest of M4)

This turns S13 into the full library. Every M4–M6 component is then authored as a component source, and its fronts are generated.

- [x] `libs/mintplayer-component-compiler` Nx plugin project (`@mintplayer/nx-component-compiler`): move `tools/front-templates` into it as the template stage, keep its spec, delete `tools/front-templates`
- [x] Manifest API: plain data `satisfies ComponentGroup` (inputs incl. `model`, outputs, methods, `provides`, styles), typed against the core; hooks live on `ComponentCore`
- [x] Emitters for the front components: Angular (signal inputs and outputs, CVA for a model, `hostDirectives` extensions), React (`forwardRef`, `useMachine`, props extend `HTMLAttributes` + rest passthrough), Vue (`defineProps` / `defineEmits` / `defineModel`, `inheritAttrs: false`), Lit (properties, events, `LightChildren`, light DOM)
- [ ] Group styles: one `<group>.scoped.scss`; the compiler stamps `data-mps=<group>` on every template element
- [x] Output routing: `<front-lib>/<group>/src/generated/` + entry-point scaffolding (ng-package secondary entry, React/Vue vite entry, WC sub-entry) written once by the generator
- [x] Nx: `createNodes` infers `compile-components` (cacheable inputs and outputs); front `build` / `test` / `typecheck` `dependsOn` it; `nx g …:component` scaffold; `--check` in CI (CI `--check` dropped: outputs are gitignored, see S17)
- [x] S14 navbar family + dropdown-menu fully generated; the hand-written fronts are deleted (dropdown-menu converts with M4)
- [ ] S15 group styles on accordion (+ tab)
- [ ] S16 escape hatches (RouterLinkActive, checkbox CVA, React imperative handle)
  - the select's CVA is resolved: `select.angular.ts` adds the accessor and validity as `hostDirectives` and merges the form state over the inputs in `extendInputs`
- [ ] S17 clean-tree build + cache hit
- [x] S18 template type errors fail `typecheck`; decide on a VS Code extension
- [ ] S19 fixture workspace run (publishability)
- [ ] Verdicts S14–S19 written in PRD §7

## M4 — Wave B

Every item below is authored as a D10 component source once M3b lands.

- [ ] navbar (+ brand, item, dropdown) and dropdown-menu (moved from M3); delete `SSR_NAVBAR_HEIGHT`, the navbar chrome and the dropdown-menu chrome
  - done so far: S13 templates; Lit navbar and dropdown-menu in light DOM; navbar and dropdown chrome deleted; `SSR_NAVBAR_HEIGHT` replaced by a CSS estimate; press-time triggers; new Lit, core and e2e specs
  - left: CHANGELOG Breaking entries; then regenerate it under M3b/S14
- [x] select: one D10 source (`ui-core/select`), a native `<select>` in every front; query-builder and scheduler use plain native selects inside
  - compiler additions it needed: `NATIVE_TAGS` (`<selectedcontent>`), `:value.prop` on a select as a React-only seed, `mp-attrs` (consumer attributes on a non-root element in React and Vue), a Lit `<slot>Renderer` per scoped slot, kebab-case Lit attributes, slot parameter types imported in Angular
  - left for every `mp-attrs` component: Angular and Lit keep consumer `aria-*` other than `aria-label` on the host
- [x] dropdown-menu stays hand-written: its item, divider and header are attribute directives on the consumer's own `<li>`s, which a generated component cannot be
- [x] Angular `aria-passthrough.spec.ts` lists `PENDING_437` (code-snippet): dropped with the conversion, the generated front puts consumer attributes on its root
- [x] otp-input: one D10 source (`ui-core/otp-input`), one real input in every front, the boxes decorative; `case` renamed `letterCase`; Angular CVA + `focus()` delegation as host directives
  - compiler fixes it needed: builtin output types (`string`) are not imported; the Vue `mp-attrs` merge coerces the bag's `class` to a string
- [x] multi-range: one D10 source (`ui-core/multi-range`), native range inputs stacked on one track in every front; the core adds the neighbour constraint, the fill and press-on-track; Angular CVA as a host directive
  - compiler addition it needed: a `:style` bag below the root (Angular `[style]`, React `reactStyle()`, Lit `styleMap`), for the geometry custom properties of PRD D7
- [x] calendar: one D10 source (`ui-core/calendar`); the grid, keymap and week numbers are pure functions and `attachCalendarGrid` is the shared DOM behaviour, so the pickers render the same grid; inert (disabled month buttons, no tabbable day) until hydrated
  - compiler fix it needed: a `kind: 'number'` Angular input casts `numberAttribute` to the declared type (a literal union such as `FirstDayOfWeek`)
- [x] datepicker, timepicker (+ time-list), datetime-picker: one D10 source each; a native `date` / `time` / `datetime-local` field before hydration, then a readonly display + hidden `name` input + native `popover="auto"` popups placed by `ui-core/overlay` `trackPopovers`; Angular CVA + validator as host directives
  - `mp-scheduler` (a shadow-root host) embeds `mp-datetime-picker`: it now adopts the light sheets and ships `_styles/input-group.styles` (Bootstrap `.input-group` + `.btn`), and its editor's Escape steps aside while a picker popover is open
- [x] signature-pad
- [x] theme-toggle (Q2)
- [x] code-snippet: highlighting after hydration (S11); the rows set through the compiler's new `v-html`; highlight.js loaders moved to ui-core
- [x] phone-input; convert the Lit `mp-input-group` to a light front over `ui-core/input-group` with it. The flag corpus moved to `ui-core/flags`, the rich-option rules of the select became a shared Sass mixin (`select/src/styles/_rich-select.scss`), and the stacked layout is a container query (no ResizeObserver)
- [x] M4 controls that sit in a group (select, phone-input, datepicker, ...) read the `.input-group-sm/lg` ancestor and the `--mp-group-radius-*` channel in their own scoped sheets: the group no longer mirrors `size` onto them. Select and phone-input pair their own corners; a control that renders its own `.input-group` (date, time, datetime, phone pickers) is sized and paired by one generic nested-group rule in `input-group.scoped.scss`
- [ ] splitter: MOVED to M6, lands with dock and file-manager. The dock renders every split node as a nested `mp-splitter` and reads its shadow dividers, `resizing` events and size pinning (`dock/src/core/intersection-sizing.ts`); converting it alone would break the dock until M6. It becomes a splitter + splitter-pane group (D1: the parent owns sizes, each pane registers and renders the divider before it)
- [x] timeline (+ item): layout is CSS on the root classes, rows are light children, selection by key
- [x] trend-chart (+ Vue front)
- [x] carousel (+ item); delete the carousel chrome. The radios stay the index store in both tiers; the parent learns the slide count from its declared items on the server (Angular content query, React children, Vue slot vnodes)
- [x] typeahead React/Vue fronts confirmed template-owning (PRD §8 Wave B note): both render their own markup from `connect()` bags through `useMachine`, no `<mp-typeahead>` inside

## M5 — Wave C

- [x] treeview: flat rows (APG flat tree), so no front needs a recursive template; lazy children merge in the core; `node` slot replaces `nodeRenderer(node, ctx)`
- [x] tree-select (D2(a)): one D10 source; native popover panel; multiple mode is `aria-selected` + `aria-multiselectable`, checkbox mode `aria-checked` (mixed) with a decorative check glyph; `bs-form` ancestor no longer required
- [x] datatable:
  - `virtual-window`
  - `initialPage`
  - `hrefFor` sort and paging
  - delete the wrapper's `isPlatformServer` guards and `rowViews` bridges
  - **Design (decided 2026-10-28):**
    - **Consumer content is front-native slots (D3):**
      - `header {column}`, `cell {row, column, rowIndex}`, `row {row, rowIndex, ctx}` (whole row: the consumer's `<td>`s), and `filter {column, ctx}` (a custom filter panel).
      - The column def keeps only data: name, label, flags, filter config, and `format(row) → string` for the default cell text.
      - `cellRenderer` / `headerRenderer` / `filterRenderer` (functions returning a DOM `Node`) are gone; Lit gets `cellRenderer({…})` etc. as slot renderers.
      - Angular's `*bsDatatableColumn` (a header template that doubled as the column definition) gives way to `[columns]` plus `*bsDatatableHeader` / `*bsDatatableCell` / `*bsDatatableRow`. Angular already took `[columns]`, so all fronts now share one API.
    - **Composition is by repeated markup (D2(b) is unavailable in a template):**
      - The row checkbox is a native `input.form-check-input`. Its `indeterminate` is set after render (D4).
      - The pager and the per-page picker are `nav > ul.pagination` built from `connectPagination` bags, with `hrefFor` links (D5).
    - **The core** is built from a pure `connectDatatable(options) → view` plus the `datatableCore` machine:
      - The machine owns data, sort, paging, selection, focus, tree expansion, the fetch lifecycle (`SupersedingRequest`), the windowed page cache and filter state.
      - DOM work lives in `attach`: measuring column widths, resize drag, scroll tracking, and focus.
    - **No Angular extras (revised while landing):** the `settings` and `selection` bridges were dropped rather
      than ported. `[(sortColumns)]` / `[(page)]` / `[(perPage)]` / `[(selectedIds)]` are the API in all four
      fronts, and `(selectionchange)` carries the rows; a second Angular-only model would only duplicate them.
    - **Custom filter panels are per column (revised while landing):** `filterMode: 'custom'` renders the `filter`
      slot for that column only. A table-wide slot would have replaced the built-in panel on every column.
    - **Panels are native popovers:** the filter and resize panels are `popover="auto"` with a `popovertarget`
      trigger, placed by `trackPopovers`; the document-root overlay portal is no longer involved.
    - **Stages:**
      - (1) flat table: sort, paging, selection, keyboard, row events, slots;
      - (2) fetch, reload, windowed fetch, virtual scroll, fill;
      - (3) tree mode;
      - (4) filter row and panels, distincts;
      - (5) column resize;
      - (6) fronts' extras, specs, conformance, demos, e2e.
- [x] query-builder (+ group, condition, subquery), per S10: one D10 source (`ui-core/query-builder`).
    - The recursive group / condition / subquery elements became flat rows with `aria-level` (the compiler has no
      component recursion); `entityForNode` resolves a subquery's entity per row.
    - Custom editors are one `editor` slot over fields marked `editor: 'custom'`; the slot's `onChange` reaches
      the core through a module-level map keyed by the root's `data-qb-instance` (the datatable precedent).
    - Live value inputs keep a per-input draft in the core, so a half-typed number survives a Vue re-render.
    - The light-styles SSR generator lost its stale datatable row and the four query-builder rows.
- [x] **M5a — compiler nesting** (recursive partials + component composition), before the hierarchy chart and
  M6. Own PRD and plan: `docs/prd/component-compiler-nesting-437.md`, `docs/prd/component-compiler-nesting-437-plan.md`
  (spikes NS1–NS6). Its N5 puts the query builder back on nested markup.
- [x] hierarchy-chart (+ Vue front). The server renders at `FALLBACK_HOST_SCALE` (a 420px host) and a ResizeObserver refits once live: the S6 answer for this component. The Lit bridge now follows a later consumer `aria-label`, and compiled attributes fall back to their default on removal (and `"false"` is false).

## M6 — Wave D

- [x] file-manager — composes the D10 splitter, treeview and datatable (`<mp-splitter>` / `<mp-treeview>` / `<mp-datatable>` in its view, so each front renders its own). The datatable's `cell` slot gets `row: unknown`, so the core sorts the rows itself (`autoSort=false`, `v-model:sortColumns`) and the slot reads its typed row as `view.rows[rowIndex]`. Columns are memoised per messages object, because a new `columns` array resets the widths. The no-custom-elements list lost 15 stale rows (charts, datatable, query-builder, splitter, tree-select), and the scoping spec now imports the hierarchy, splitter and file-manager sheets.
- [x] tile-manager — landed on master separately as #440 / PR #441 (headless core + four fronts)
- [ ] dock. **Decided 2026-10-28 (owner): pane content is portalled into core-owned hosts.** The old element kept a pane's consumer content alive across a redock through shadow `<slot>`s. A front-rendered pane would remount whenever its stack changes: React, Vue and Angular all remount content whose parent changes. Rejected alternatives:
  - a flat layer positioned over the stacks (golden-layout virtual mode, flexlayout-react): tab order would follow the layer;
  - keyed slots that remount on a move: an editor pane would lose its state;
  - keeping the dock Lit-only (Q1).

  Design:
  - [x] **Compiler: `<teleport :to="exp">…</teleport>`** (215247ab) (Vue's own syntax). React emits `createPortal(children, to)`, Vue `<Teleport :to>`, Angular a `bsTeleport` structural directive from the `machine` entry (it creates the embedded view and moves its root nodes into `to`, as CDK's DomPortalOutlet does), and Lit a `teleport(to, template)` directive that `render()`s into `to`. A null `to` renders nothing, which is the server's case. Pane content therefore does not server-render: the owner accepted this.
  - [ ] **Core:** `attach` creates one `div.dock-pane-content` host per pane name (scoped `data-mps=dock`) and puts them in state (`paneHosts`). Every pane name is kept, so a host never changes identity. The view lists every pane in one flat keyed `v-for` of teleports at the root, a position no framework ever reparents. Each stack's body renders an EMPTY `[data-dock-pane-body=<name>]` placeholder for its active pane. A MutationObserver on the root re-seats each host into its current placeholder after every commit, before paint. This is safe because no framework touches foreign children of an element it renders empty. A host whose pane is not shown is parked detached, and the portal still renders into it, so its state survives.
  - [ ] **Layout:** the pure modules (`layout-tree`, `resize`, `geometry`, `sizes`, `intersection-sizing`) move to `ui-core/dock` with their specs. A recursive `dock-node` partial renders `split` as `<mp-splitter>` + `<mp-splitter-panel>` and `stack` as its own tablist strip + body, without the legacy Lit `mp-tab-control`. The floating windows, drop indicator and joystick are declarative. Pointer drag, floating drag/resize, intersection handles and the keyboard pane-move mode stay attach-time behaviour that commits through the layout tree.
- [ ] ribbon (+ 17 children)
- [ ] scheduler, per S7 and Q1

## M7 — Removal sweep (PRD §10)

- [ ] Delete what's left:
  - `tools/lit-ssr-utils` generators and specs
  - `gen-light-styles-chrome`
  - `light-dom` SSR injector
  - `codegen-ssr-chrome` and its `dependsOn` entries
  - the server.ts and entry-server injector chains
- [ ] Delete every `data-js` gate and the unused WC infrastructure moved to ui-core
- [ ] Remove `light-dark()` and `--mp-color-mode` workarounds from scoped sheets (C6)
- [ ] Grep the framework libs for `isPlatformServer`; every hit is justified or removed

## M8 — Docs

- [ ] CLAUDE.md: rewrite the WC-authoring, SSR chrome, Bootstrap and wrapper-trap sections for the new architecture; add the Bootstrap layering rules (C1–C5)
- [ ] CHANGELOG. No hand version bumps: since #445 every `package.json` holds `0.0.0-PLACEHOLDER` and the publish workflow plans the versions, so CHANGELOG entries name no version numbers.
- [ ] PRD Status → Complete, with an as-built summary and deviations

## M9 — Verification (once, at the end)

- [ ] Build all five libraries and three demos
- [ ] Unit tests (ui-core, web-components, ng, react, vue)
- [ ] E2e across the three demos: functional, no-JS, axe, axe-nojs, override probe
- [ ] Keyboard walk-through of each wave's demo pages
- [ ] Push once, read CI, then mark the PR ready
