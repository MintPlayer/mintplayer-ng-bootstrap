# PRD — Component compiler: recursive partials and component composition (#437, D10 extension)

**Parent PRD:** `docs/prd/headless-catalog-437.md` §5 D10 (the component compiler).
**Plan:** `docs/prd/component-compiler-nesting-437-plan.md`.
**Status:** spikes not started. Raised 2026-10-28 by the owner after the query builder had to flatten its tree.
**Delivery:** in the #437 PR (`feat/headless-catalog-437`), before the hierarchy chart and M6.

## 1. Summary

The component compiler (`libs/mintplayer-component-compiler`) rejects every component tag in a `.view.vue`
template. All three template emitters throw `components are not supported` (`src/templates/emit-angular.mjs:70`,
`emit-react.mjs:109`, `emit-lit.mjs:112`). This blocks two different things:

- **Recursion within one component.** A tree whose state lives in one core needs markup that repeats itself. The
  query builder had to give up its nested groups and render flat rows with `aria-level` (S10 verdict).
- **Composition of components.** One component cannot render another D10 component. The S3 verdict made
  composition the rule for visual nesting, but nothing can express it yet. M6 needs it throughout:
  - file-manager → treeview
  - dock → splitter
  - scheduler → datetime-picker
  - ribbon → its 17 children

This PRD adds both as two separate features. **Partials** are sibling templates that share their parent's core and
may call themselves. **Composed children** are other components, each with its own core, written by their tag.

## 2. Goals

1. A template can render a sibling `.view.vue` **partial**, and a partial can render itself. The output is the same
   tree in all four fronts, with no wrapper element, so `<ul>` → `<li>` stays valid.
2. A partial sees its parent's slots. A scoped slot such as the query builder's `editor` works at any depth.
3. A template can render **another component** by its Lit tag (`<mp-treeview>`).
   - The compiler checks every binding against that component's manifest.
   - Each front emits its own idiom: `bs-treeview`, `BsTreeview` or `mp-treeview`.
4. Everything stays type-checked:
   - `ngc --noEmit` checks a partial's context in Angular;
   - `tsc` checks React;
   - `vue-tsc` checks the generated Vue;
   - `tsc` checks Lit.
5. Angular still SSRs everything, hydration still matches, and no-JS still renders.
6. The query builder goes back to nested markup. The file-manager in M6 is the first component to use
   composition.

## 3. Scope

The owner pulled all four first-draft non-goals into scope (2026-10-28: "they may be unmissable"):

- **Content into a composed child.** Named and scoped slots, plus default content (§5.5, NS7).
- **`v-model:x` on a composed child** (§5.6, NS8).
- **A component that composes itself**, each instance with its own core (§5.7, NS9).
- **Composition across compiler configs.** A config can read another config's manifests into its registry (§5.8,
  NS6).

There are no non-goals.

## 4. Findings (investigation 2026-10-28)

Three read-only investigations, one per front pair and one for the pipeline. Nothing was run.

### 4.1 Pipeline

- **Every template compiles on its own today.** `findEntries` (`src/index.mjs:113-134`) finds each `.view.vue`
  and compiles it into its own `<base>.generated.*` (`:151-154`). A manifest only maps elements to templates
  (`src/components/model.mjs:58`).
- **Import rules.** `src/templates/source.mjs:86-91` rejects value imports and relative imports. Both rules need a
  narrow exception for sibling partials.
- **Compiling with a tag registry needs two passes.** The first pass loads every manifest and builds
  tag → `{entry, names, inputs, outputs (react / lower), kinds, models}` from `model.mjs:110-120`. The second pass
  emits.
- **Nx stays correct within one config.** The plugin's inputs already glob every manifest (`src/nx/plugin.cjs:39-40`),
  and there is one target per config.
- **The package graph has no cycles today.** Entries already import one another (`has-overlay` is imported by 9
  entries, `list-group` by 3). ui-core stays free of front dependencies as long as a `.view.vue` names only tags,
  never front imports.
- **Shared code is bundled into each lib.** `@mintplayer/web-components/*` and `@mintplayer/react-bootstrap/*`
  are not external in their own Vite builds (`libs/mintplayer-web-components/vite.config.mts:52-67`, react
  `vite.config.mts:73-83`). A composed child is therefore bundled into a shared chunk. That works, but a module with
  identity (a context key, the scoped-styles registry) must not be duplicated. This is spike NS4.

### 4.2 Angular

- **Where the code goes.** Each view becomes its own `.html`. Props are `@let p_x = props().x` and slots are
  `slots().a` (`templates/emit-angular.mjs:20-26`).
  - An `<ng-template>` declared in the same `.html` sees the root `@let`s and the component's members, and every
    recursive instance keeps that scope.
  - `@let` is allowed inside an `ng-template` (Angular 18.1+; the repo has 22.0.8).
- **Partial.** The partial is inlined as `<ng-template #fooNode let-…>` at the end of every view that uses it. It
  recurses through `*ngTemplateOutlet`.
  - `emitAngular` emits one file at a time, so `entryOutputs` must pass the partial sources in.
- **Typed context.** A guard directive is generated per partial:
  - `@Directive({ selector: 'ng-template[bsFooNode]' })` with `static ngTemplateContextGuard(d, ctx: unknown): ctx is FooNodeContext`.
  - It follows the slot-directive pattern (`components/emit-angular.mjs:75`).
  - A generic guard would infer `unknown`, so the compiler emits one directive per partial, typed from the partial's
    `defineProps`.
- **Composed child.**
  - Recorded in `ctx.uses` (`:77`, `:109`), added to the component's `imports` (`:84`), and imported in TS
    (`:57`).
  - Names come from `model.mjs:116-117`: `Bs${Pascal}Component` and `bs-${element}`, with manifest overrides.
  - Outputs are lowercased. A `model()` input gives `[x]` plus `(xChange)`.
- **Hydration.** Hydration supports the embedded views that `ngTemplateOutlet` creates. Nothing in the repo
  recurses yet, so this needs proof (NS1). A deep tree also produces a large hydration annotation payload.

### 4.3 React

- **Template props.** The template's props are `props & {slots, children, className, attrs, refs}`
  (`templates/emit-react.mjs:46-55`).
  - A partial is a function component that takes its own props plus the parent's `slots`.
  - It gets no `attrs`, `className` or refs, and is never the root or the `mp-attrs` element.
- **Recursion.** A recursive function component is fine. Keys come from `:key`, which the emitter hoists onto
  `<React.Fragment key>` (`:99-101`).
- **Composed child.** `:x` → `x`, and `@ev` → `on<Ev>`, taken from the child manifest's `react` name. The bindings are
  checked against the manifest, because `x()` throws on an unknown identifier (`expressions.mjs:46`).

### 4.4 Vue

- **The SFC is copied almost verbatim** (`templates/emit-vue.mjs:214-239`), with the marker attributes removed.
- **Imports.** The partial import must be rewritten: `./foo-node.view.vue` → `./foo-node.view.generated.vue`.
  Referring to itself by file name works in `<script setup>`.
- **Slot forwarding** into a partial is emitted as:
  `<template v-for="(_, n) in $slots" #[n]="a"><slot :name="n" v-bind="a ?? {}" /></template>`.
- **Type checking.** ui-core has no vue-tsc; its `tsconfig.lib.json` includes `.ts` only. The generated SFCs are
  checked by vue-bootstrap's `typecheck` (`project.json:37-53`). That stays the gate, as the S18 verdict decided.

### 4.5 Lit

- **Partial.** A partial is `export const fooNode = (args) => html\`…\``, which calls itself. It is dispatched
  from `bare()` (`templates/emit-lit.mjs:112`) and receives `slots`.
- **Composed child.** Emitted as `<mp-x .prop=${…} @lower=${…}>` (`:123`, `:131`), with an import that registers the
  element.
- **Scope.** Neither emitter uses `scopedHtml`, because `data-mps` arrives in the core's bags. So every node in a
  partial needs a bag, and a composed element keeps its own scope, never the parent's.
- **Adoption-loop trap.**
  - `ownedByTemplate` (`libs/mintplayer-web-components/machine/src/host-props.ts:42-45`) treats every hyphenated
    tag as foreign, even when it is stamped.
  - `#adopt` (`:86-95`) watches the host's direct children only.
  - So a composed `<mp-treeview>` placed directly in an `mp-host` root is adopted as consumer content, re-rendered,
    and adopted again. Wrapped in a native element it is safe.
  - The fix is in §5.3.

## 5. Design

### 5.1 Partials

**Source.**
- A partial is a `.view.vue` in the same `templates/` folder that no manifest element names and that another template
  of the group imports: `import FooNode from './foo-node.view.vue'`.
- This is the only value import and the only relative import allowed. It must name a sibling `.view.vue`.
- A partial refers to itself by its file name (`<FooNode :node="child" />`) without importing itself.
- Its `defineProps<{…}>()` is its full contract. It has no `mp-host`, no `mp-attrs` and no `ref`.
- It may contain `<slot>`s. The front fills them from the parent's slots.
- The compiler rejects:
  - a partial that is not imported, which is an orphan and an error rather than a standalone template;
  - a cycle between two partials, A → B → A. Only self-recursion is allowed: a partial may call itself, but two
    partials may not call each other.

**Emitted per front:**

| Front | Partial | Use site |
|-|-|-|
| Angular | `<ng-template #fooNode bsFooNode let-node="node" …>` inlined once per using `.html`, after the root; plus a generated `BsFooNodeTemplate` guard directive in the component's `imports` | `<ng-container *ngTemplateOutlet="fooNode; context: { node: child }" />` |
| React | `export function FooNodeTemplate(props: FooNodeProps & { slots })` in `foo-node.view.generated.tsx` | `<FooNodeTemplate node={child} slots={slots} />` |
| Vue | `foo-node.view.generated.vue`, which forwards slots into itself | `<FooNode :node="child">` + the slot-forwarding block |
| Lit | `export const fooNodeTemplate = (args) => html\`…\`` in `foo-node.view.generated.ts` | `${fooNodeTemplate({ node: child, slots })}` |

**Keys.** A `v-for` over a partial keeps `:key`:
- Angular: `@for (…; track key)`;
- React: the hoisted `Fragment key`;
- Lit: the existing keyed path;
- Vue: as written.

### 5.2 Composed children

**Source.**
- An `mp-*` tag that the registry knows. The registry holds every manifest in the same config.
- Bindings:
  - `:input` and `.prop`;
  - `@output`, written with the output's manifest name (`@selectionChange`), as in a manifest.
- The compiler validates every binding name against the child's manifest: an unknown input or output is an error.
- A bag (`v-bind="view.x"`) may add native attributes such as `class`, `aria-*` and `data-*`, which the front
  forwards like a consumer's attributes.
- A composed child takes content through its slots (§5.5).

**Emitted per front:**

| Front | Element | Input | Output | Import |
|-|-|-|-|-|
| Angular | `<bs-x>` | `[x]` | `(lower)` | the child class in `imports` |
| React | `<BsX>` | `x={}` | `on<Name>={}` | `@mintplayer/react-bootstrap/<entry>` |
| Vue | `<BsX>` | `:x` | `@lower` / `@update:x` | `@mintplayer/vue-bootstrap/<entry>` |
| Lit | `<mp-x>` | `.x=${}` | `@lower=${}` | `@mintplayer/web-components/<entry>` (side effect) |

Each front's package and import path comes from that front's `outDir(entry)` → package mapping in the config, never
from the manifest.

**Dependency check.** The compiler builds the group → group graph from composed tags and refuses a cycle. Nx sees the
edge through the generated import, so no `project.json` change is needed.

### 5.3 The Lit host fix

`ownedByTemplate` must not adopt a composed child. The template stamps each composed element with
`data-mp-owned` (React and Vue ignore it; the Angular and Lit hosts read it), and `ownedByTemplate` treats
`data-mp-owned` as owned. The marker is chosen over keeping a list of the nodes the template rendered: the check stays
local, and SSR output shows it.

### 5.4 Output-name collisions

The Angular, Vue and Lit fronts lowercase output names, so they can match a DOM event that bubbles to the same
element: `toggle`, `select`, `change`, `input`, `close`. On a composed child the listener would then fire for both. The
compiler refuses a lowercased output name that is in a list of standard event names, and the component renames
the output. The list is a fixed table in the compiler. NS5 measures whether any current manifest collides.

### 5.5 Content into a composed child

**Source.** Content is passed with Vue's own syntax:
- `<mp-x><template #name="{ a, b }">…</template></mp-x>` for a named or scoped slot;
- plain children for the default slot.

The compiler checks each slot name against the child's template slots (its `defineSlots`). Inside the slot, an
expression may read the parent's props, loop locals and the slot's parameters.

| Front | Emitted |
|-|-|
| Angular | `<ng-template bsXName let-a="a" let-b="b">…</ng-template>` inside `<bs-x>`, with the child's slot directive in `imports`. Default content is projected by `<ng-content>`. |
| React | a render prop `name={({ a, b }) => <>…</>}`. Default content goes to `children`. |
| Vue | `<template #name="{ a, b }">` as written. |
| Lit | a scoped slot becomes `.nameRenderer=${({ a, b }) => html\`…\`}`. Unscoped and default content become children (named ones carry `slot="name"`), each marked `data-mp-owned` (§5.3). |

**Lit risk.** A child's own adoption must not fight the parent's render (NS7).

### 5.6 `v-model:x` on a composed child

A pure view has nothing to assign to, so two-way binding needs a value object from the core.
`ui-core/component` exports `ModelBinding<T> = { readonly value: T; readonly set: (v: T) => void }`.
`v-model:x="view.thing"` compiles to `:x="view.thing.value"` plus `@xChange="view.thing.set"`.

The compiler checks two things:
- `x` is a `model: true` input of the child;
- the expression is a member path.

The type of `ModelBinding` does the rest.

### 5.7 A component that composes itself

A template may use its own element's tag. Each instance has its own core. Recursion ends with the data, because the
template places the tag under a `v-if` or a `v-for` that ends.

| Front | Self-reference |
|-|-|
| Angular | a standalone component can use itself in its own template without listing itself in `imports`; NS9 proves this under SSR |
| React | the generated component refers to itself |
| Vue | it refers to itself by file name |
| Lit | it uses its own tag |

The group-cycle check exempts a group's edge to itself.

### 5.8 Composition across configs

A config may list `registry: ['../other/component-compiler.config.mjs']`. The manifests of those configs join the
registry read-only: they are resolved but never emitted. Their front packages come from their own config's front
mapping.

The Nx plugin adds the listed configs' manifest globs to `compile-components` inputs, so the cache key changes when a
referenced manifest changes.

## 6. Spikes

Each spike writes its verdict into §7 below before the milestone it gates starts.

| # | Question | Gates | Pass criterion |
|-|-|-|-|
| NS1 | A recursive partial in all four fronts: the query builder's group → children tree as the fixture. Angular `ng-template` + `ngTemplateOutlet` recursion with a guard directive; React recursive function component; Vue self-reference; Lit recursive function. | N2 | `ngc --noEmit` rejects a deliberate wrong field on `let-node`; Angular SSR of a 4-deep tree hydrates with no NG05xx and no console error; the DOM is identical in all four fronts |
| NS2 | Slots reach a nested partial: the `editor` scoped slot rendered from a condition at depth 3, in all four fronts. | N2 | the slot renders with its typed ctx at depth 3; vue-tsc and ngc accept it; changing the slot's argument type fails both |
| NS3 | Composition fixture: a minimal two-group fixture (a host that composes `mp-treeview`) in all four fronts, including the Lit adoption fix. | N3 | the child renders and its output reaches the host core in every front; the Lit host does not re-adopt it (no loop, measured by a mutation counter); Angular SSR renders the child |
| NS4 | Module identity: does bundling a composed child into the parent entry's chunk duplicate the scoped-styles registry or a context key (React, Vue, Lit)? | N3 | one registry instance per page, measured by the count of `style[data-mps]` per scope = 1 |
| NS5 | Output collisions: list every current manifest output whose lowercased name is a DOM event name. | N3 | list written; zero collisions after renames, or a rename recorded in the CHANGELOG |
| NS6 | Cross-group and cross-config staleness: `compile-components-check` detects a stale front when only the CHILD manifest changed, including a child in a `registry` config. | N1 | edit a child input name → check fails on the parent's generated files; the Nx input hash changes |
| NS7 | Content into a composed child: a scoped slot, a named unscoped slot and default content, in all four fronts; Lit adoption vs the parent's render. | N3 | the content renders in the child's slot with its params; a parent re-render keeps node identity in Lit; Angular SSR renders it |
| NS8 | `v-model:x` on a composed child via `ModelBinding`. | N3 | a child edit reaches `set`; a parent change reaches the child; a non-model input is a compile error |
| NS9 | Self-composition: a component that renders its own tag, three levels deep, in all four fronts, Angular SSR included. | N3 | three nested instances with independent cores; no compile cycle error; SSR hydrates |

## 7. Spike verdicts

*(none yet)*

## 8. Open questions

- Hydration payload size for deep trees (NS1 measures it); if it is large, consider `ngSkipHydration` on the
  partial's container only.

## 9. Acceptance

1. NS1–NS6 verdicts written.
2. Compiler specs (`templates.spec.ts`) cover:
   - partial recursion in each front;
   - slot forwarding;
   - a composed child per front, including its imports and binding names;
   - the errors: an unknown binding, an orphan partial, a cycle between partials, a group cycle and an output collision.
3. The compiler README's "no components" rule is replaced by the partial and composition rules.
4. The query builder renders nested `<ul>`s through a partial. Its ui-core, Vue conformance and e2e specs are green.
5. The parent PRD's D10 and the S10 verdict note the change.
