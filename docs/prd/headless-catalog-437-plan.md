# Plan — Headless core + four fronts for the whole catalog (#437)

**PRD:** `docs/prd/headless-catalog-437.md`.
**Status:** not started; PRD Proposed (2026-10-20).
**Branch:** to be created with owner permission, from `master` after #438 merges.
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

- [ ] S1 Bootstrap layering, all three demos
- [ ] S12 React/Vue SSR sheet collection (pairs with S1)
- [ ] S2 compound cores (radio-group + radio, accordion + tab)
- [ ] S3 nested cores (tree-select over treeview)
- [ ] S5 hydration with consumer templates and pre-hydration text
- [ ] S6 measurement-free server layout (carousel, splitter, hierarchy chart)
- [ ] S9 navbar dropdown CSS-only open
- [ ] S8 base-select under SSR
- [ ] S11 theme cookie SSR and code-snippet highlighting
- [ ] S4 virtual window in React/Vue (before M5)
- [ ] S10 query-builder editor contract (before M5)
- [ ] S7 scheduler static grid go/no-go (before M6)
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

- [ ] `ui-core/overlay`: placement with flip, dismiss stack, open state. Move the typeahead onto it (fixes the pilot's no-flip deviation).
- [ ] `ui-core/roving`
- [ ] `ui-core/announce`
- [ ] `ui-core/focus` (trap, restore by key, inert)
- [ ] `ui-core/forms`:
  - `adoptPreHydrationText`, generalised out of the Angular typeahead
  - `errorFeedback` bag
- [ ] `ui-core/tree`
- [ ] `ui-core/virtual-window` (per the S4 result)
- [ ] `ui-core/drag`
- [ ] Move into ui-core:
  - `swiper-core`, `scheduler-core`, `timeline-core`, `charts/core` and `phone-core`
  - theming store and cookie
  - datatable sort
  - the query-builder model
- [ ] Bridges:
  - a compound-registration helper per front (S2)
  - a `hrefFor` convention type
  - `mp-hydrated` class writing in the bags
- [ ] Conformance specs:
  - no `<mp-*>` in the framework libs (§9.1)
  - SSR non-empty per demo route (§9.2)
  - the shared e2e hydration-warning listener (§9.4)

## M3 — Wave A (PRD §8)

- [ ] card (no core)
- [ ] input-group (no core)
- [ ] checkbox / switch
- [ ] toggle-button (new Angular front)
- [ ] radio + radio-group
- [ ] pagination (+ `hrefFor`)
- [ ] shell
- [ ] accordion (+ tab)
- [ ] tab-control (+ page); delete `isServerSide`
- [ ] dropdown-menu
- [ ] sparkline (+ Vue front)
- [ ] Delete the shell, accordion and dropdown-menu chrome generators, injectors and targets (navbar and carousel follow in M4)

## M4 — Wave B

- [ ] navbar (+ brand, item, dropdown); delete `SSR_NAVBAR_HEIGHT` and the navbar chrome
- [ ] select
- [ ] otp-input
- [ ] multi-range
- [ ] calendar
- [ ] datepicker, timepicker (+ time-list), datetime-picker
- [ ] signature-pad
- [ ] theme-toggle (Q2)
- [ ] code-snippet
- [ ] phone-input
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
- [ ] tile-manager
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
- [ ] CHANGELOG, plus version bumps for ui-core, web-components, ng, react and vue
- [ ] PRD Status → Complete, with an as-built summary and deviations

## M9 — Verification (once, at the end)

- [ ] Build all five libraries and three demos
- [ ] Unit tests (ui-core, web-components, ng, react, vue)
- [ ] E2e across the three demos: functional, no-JS, axe, axe-nojs, override probe
- [ ] Keyboard walk-through of each wave's demo pages
- [ ] Push once, read CI, then mark the PR ready
