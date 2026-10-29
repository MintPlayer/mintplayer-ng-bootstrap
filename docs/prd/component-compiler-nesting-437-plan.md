# Plan — Component compiler: recursive partials and component composition (#437)

**PRD:** `docs/prd/component-compiler-nesting-437.md`.
**Parent plan:** `docs/prd/headless-catalog-437-plan.md` (this is milestone M5a there).
**Status:** Complete (2026-10-28).
**Branch / delivery:** `feat/headless-catalog-437`, same PR (#439). Commit per milestone; tests batched at the end of
the milestone set (N5), targeted specs only, capped with `timeout` and `--testTimeout=15000`.

## N0 — Spikes (PRD §6)

- [x] NS1 recursive partial, four fronts, Angular SSR hydration (fixture: query-builder tree)
- [x] NS2 slots into a nested partial (`editor` at depth 3)
- [x] NS3 composition fixture + Lit adoption fix
- [x] NS4 module identity of bundled composed children
- [x] NS5 output-name collisions with DOM events
- [x] NS6 cross-group and cross-config check-mode staleness
- [x] NS7 content (named, scoped, default) into a composed child; Lit adoption vs parent render
- [x] NS8 `v-model:x` on a composed child via `ModelBinding`
- [x] NS9 self-composition, three levels, Angular SSR included

## N1 — Source and pipeline

- [x] `source.mjs`:
  - allow `import X from './sibling.view.vue'` (relative, sibling `.view.vue` only);
  - recognise a partial's self-reference and imported partial tags;
  - recognise `mp-*` tags.
- [x] `index.mjs`, two passes:
  - load every manifest;
  - build the tag registry (entry, names, inputs, outputs, kinds, models);
  - then emit.
- [x] Partials are folded into their importing templates: no standalone output. Error on:
  - an orphan partial;
  - a partial that calls another partial which calls it back (only self-recursion is allowed).
- [x] Group dependency graph from composed tags; error on a cycle.
- [x] Composed-child binding validation against the child manifest.
- [x] DOM-event output-name table and check (PRD §5.4).
- [x] `--check` covers cross-group staleness (NS6).
- [x] `registry: [configs]`: other configs' manifests join the registry read-only; the Nx plugin adds their globs to the inputs.
- [x] Slot names of a composed child validated against its template's `defineSlots`; `v-model:x` only on a `model: true` input.

## N2 — Partials in the four emitters

- [x] Angular:
  - inline `<ng-template #x bsX let-…>` per using `.html`;
  - recurse through `ngTemplateOutlet`;
  - generate the typed context-guard directive and add it to `imports`.
- [x] React: `XTemplate` function component in its own `.generated.tsx`, taking props and `slots`; keys hoisted.
- [x] Vue: rewrite the partial import to `.generated.vue`; forward slots.
- [x] Lit: a recursive template function in its own `.generated.ts`, taking `slots`.

## N3 — Composition in the four emitters

- [x] Angular: `<bs-x [in] (lower)>`, with the class in `imports`.
- [x] React: `<BsX in onName>`, with the import from the front package.
- [x] Vue: `<BsX :in @lower / @update:x>`, with the import.
- [x] Lit: `<mp-x .in @lower>`, a registering import, and `data-mp-owned`.
- [x] `web-components/machine/src/host-props.ts`: `ownedByTemplate` honours `data-mp-owned`.
- [x] Content into a composed child (PRD §5.5): Angular slot directives + `ng-content`, React render props / children, Vue as written, Lit `<slot>Renderer` / owned children.
- [x] `ModelBinding<T>` in `ui-core/component`; `v-model:x` → value + set in every front (PRD §5.6).
- [x] Self-composition in every front; the cycle check exempts the self edge (PRD §5.7).

## N4 — Docs

- [x] Compiler README: replace "Only native elements and `<slot>`" with the partial and composition rules.
- [x] Parent PRD D10: amend "no components"; note on the S10 verdict.
- [x] CHANGELOG: none for consumers (internal compiler change), unless NS5 renames an output.

## N5 — Query builder back to nested markup, and verification

- [x] `connectQueryBuilder` returns a nested node tree (`children`), not flat rows; `aria-level` is dropped where
  nesting carries it.
- [x] `query-builder.view.vue` + `query-builder-node.view.vue` (the partial), with nested `<ul>`s per group.
- [x] Scoped styles: indentation from nesting instead of `--qb-depth`.
- [x] Specs: compiler `templates.spec.ts` (PRD §9.2), ui-core query-builder, Vue model-sync / passthrough, and the
  query-builder e2e selectors.
- [x] Type-check all five libs, `ngc` on the ng lib and demo, and the React and Vue demos.

Then resume the parent plan: hierarchy-chart, then M6, with file-manager → treeview as the first composition.
