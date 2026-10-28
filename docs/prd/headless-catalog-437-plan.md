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
- [ ] S3 nested cores (tree-select over treeview)
- [x] S5 hydration with consumer templates and pre-hydration text
- [ ] S6 measurement-free server layout (carousel, splitter, hierarchy chart)
- [ ] S9 navbar dropdown CSS-only open
- [x] S8 base-select under SSR
- [ ] S11 theme cookie SSR and code-snippet highlighting
- [ ] S4 virtual window in React/Vue (before M5)
- [ ] S10 query-builder editor contract (before M5)
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
- [ ] Angular `aria-passthrough.spec.ts` lists `PENDING_437` (code-snippet): that wrapper does not forward ARIA today; drop the entry when it converts
- [x] otp-input: one D10 source (`ui-core/otp-input`), one real input in every front, the boxes decorative; `case` renamed `letterCase`; Angular CVA + `focus()` delegation as host directives
  - compiler fixes it needed: builtin output types (`string`) are not imported; the Vue `mp-attrs` merge coerces the bag's `class` to a string
- [x] multi-range: one D10 source (`ui-core/multi-range`), native range inputs stacked on one track in every front; the core adds the neighbour constraint, the fill and press-on-track; Angular CVA as a host directive
  - compiler addition it needed: a `:style` bag below the root (Angular `[style]`, React `reactStyle()`, Lit `styleMap`), for the geometry custom properties of PRD D7
- [x] calendar: one D10 source (`ui-core/calendar`); the grid, keymap and week numbers are pure functions and `attachCalendarGrid` is the shared DOM behaviour, so the pickers render the same grid; inert (disabled month buttons, no tabbable day) until hydrated
  - compiler fix it needed: a `kind: 'number'` Angular input casts `numberAttribute` to the declared type (a literal union such as `FirstDayOfWeek`)
- [x] datepicker, timepicker (+ time-list), datetime-picker: one D10 source each; a native `date` / `time` / `datetime-local` field before hydration, then a readonly display + hidden `name` input + native `popover="auto"` popups placed by `ui-core/overlay` `trackPopovers`; Angular CVA + validator as host directives
  - `mp-scheduler` (a shadow-root host) embeds `mp-datetime-picker`: it now adopts the light sheets and ships `_styles/input-group.styles` (Bootstrap `.input-group` + `.btn`), and its editor's Escape steps aside while a picker popover is open
- [x] signature-pad
- [ ] theme-toggle (Q2)
- [ ] code-snippet
- [ ] phone-input; convert the Lit `mp-input-group` to a light front over `ui-core/input-group` with it
- [ ] M4 controls that sit in a group (select, phone-input, datepicker, ...) read the `.input-group-sm/lg` ancestor and the `--mp-group-radius-*` channel in their own scoped sheets: the group no longer mirrors `size` onto them
- [ ] splitter
- [ ] timeline (+ item)
- [ ] trend-chart (+ Vue front)
- [ ] carousel; delete the carousel chrome
- [ ] typeahead React/Vue fronts confirmed template-owning (PRD §8 Wave B note)

## M5 — Wave C

- [ ] treeview
- [ ] tree-select (D2 per S3)
- [ ] datatable:
  - `virtual-window`
  - `initialPage`
  - `hrefFor` sort and paging
  - delete the wrapper's `isPlatformServer` guards and `rowViews` bridges
- [ ] query-builder (+ group, condition, subquery), per S10
- [ ] hierarchy-chart (+ Vue front)

## M6 — Wave D

- [ ] file-manager
- [x] tile-manager — landed on master separately as #440 / PR #441 (headless core + four fronts)
- [ ] dock
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
