# @mintplayer/nx-component-compiler

Write a headless component ONCE and generate its Angular, React, Vue and Lit components (PRD #437 D10).
A component group is three sources in the core library:

| Source | What it is |
|-|-|
| `<group>/src/<group>.core.ts` | a `ComponentCore` per element (`@mintplayer/ui-core/component`): state, a pure `view()` returning the template's props, `attach`, `inputsChanged`, `methods`, and context (`consume` / `provides`) |
| `<group>/src/templates/*.view.vue` | the markup, as a Vue SFC subset (Volar gives completion and type-checking for free) |
| `<group>/src/<group>.component.ts` | the manifest: plain data `satisfies ComponentGroup`, `import type` only, so Node loads it with types stripped. Inputs (`default`, `kind`, `reflect`, `model`), outputs, methods, styles, docs |

The compiler writes a complete component, plus an `index.ts` barrel, into each front lib's
`<group>/src/generated/` (gitignored). The front lib's entry just does `export * from './generated'`.

| Front | Generated |
|-|-|
| Angular | `<el>.component.generated.ts` + `.html`: signal inputs (`model()` for two-way), `output()`, slot directives `[bs<El><Slot>]`, context through DI |
| React | `Bs<El>.generated.tsx`: `forwardRef` + an imperative handle for methods, `Omit<HTMLAttributes, own>` props, a context provider |
| Vue | `Bs<El>.generated.vue`: runtime props, `defineEmits` (+ `update:x` for models), `defineExpose` |
| Lit | `mp-<el>.generated.ts`: a light-DOM `LitElement` with `CoreController` and `LightChildren` |

Outputs are keyed camelCase in the manifest. Angular, Vue and Lit expose them lowercased (`expandedchange`),
React as `on<Pascal>`. A two-way input (`model: true`) is the core state key of the same name, written back
when the core changes it. React stays controlled through the matching output.

**Escape hatch.** Put a front-only need in `<front lib>/<group>/src/<element>.<front>.ts`. The generator
picks up these named exports:

- Angular: `hostDirectives`, `providers`, `extendInputs`
- Vue: `extendInputs`
- React: `useExtendInputs(inputs, { children })` (a hook; the declared children let it read what the server render must know, like a carousel's slide count)

`navbar-dropdown.angular.ts` (router-active state) is the example.

## Nx

`./src/nx/plugin.cjs` infers two targets on every project that holds a `component-compiler.config.mjs`:

- `compile-components`: cached; its outputs are the fronts' `generated` dirs.
- `compile-components-check`: writes nothing, and fails when a file is missing, stale or orphaned.

To scaffold a group, run `nx g ./libs/mintplayer-component-compiler:component <name>`.

```bash
node libs/mintplayer-component-compiler/bin/component-compiler.mjs --config libs/mintplayer-ui-core/component-compiler.config.mjs [--check]
```

## Config

```js
import { defineConfig } from '@mintplayer/nx-component-compiler';

export default defineConfig({
  root: 'libs/my-core',               // <root>/<entry>/src/templates/<name>.view.vue
  package: '@my/core',                // how generated components import the cores
  templates: 'src/templates',         // optional
  fronts: {                           // any subset of angular | react | vue | lit
    angular: { outDir: (entry) => `libs/my-ng/${entry}/src/generated`, runtime: '@my/ng/machine' },
    react: { outDir: (entry) => `libs/my-react/${entry}/src/generated`, runtime: { file: 'libs/my-react/machine/src/index' } },
    vue: { outDir: (entry) => `libs/my-vue/${entry}/src/generated`, runtime: { file: 'libs/my-vue/machine/src/index' } },
    lit: { outDir: (entry) => `libs/my-wc/${entry}/src/generated`, runtime: '@my/wc/machine' },
  },
});
```

`runtime` names the module that exports the front's helpers:

- Prop bags: React needs `reactProps` and `reactFormProps`; Lit needs the `props()` directive.
- Component hosts: `useCore` (Angular, React, Vue) or `CoreController` (Lit).

Give it as a package specifier, or as `{ file }` to have each generated file import it by a relative path.

The same API is available programmatically as `await compileComponents(config, { cwd, check })`.
The stages are also exported separately: `readSource`, `emitAngular` / `emitReact` / `emitVue` / `emitLit`
(templates), and `emit*Component` (components).

## Templates

A template is the component's markup, written as a Vue single-file component and compiled into
the template of every front. A template without a manifest is still compiled on its own.

| Source `<name>.view.vue` | Angular `.html` | React `.tsx` | Vue `.vue` | Lit `.ts` |
|-|-|-|-|-|
| the whole template | `templateUrl` of the component | `<Name>Template` component | the SFC itself | `nameTemplate({…})` function |
| prop `x` | `props().x` on a manifest component, else signal `x()` | prop `x` | prop `x` | argument `x` |
| `<slot name="a">` | `slots().a` template ref, else `<ng-content select>` / fallback | `slots.a` (node or `(args) => node`) | `<slot>` | `slots.a` (nodes or callback) |
| `ref="root"` | `#root` | `rootRef` prop | `ref` | `rootRef` argument |

### Template rules

- **Script.** `<script setup lang="ts">` holds only `import type` lines (by package path) plus
  `defineProps<{…}>()` and `defineSlots<{…}>()`, each with an inline type literal.
- **Attribute bags.** An element may have one `v-bind="bag"`. Next to it, use only bound
  attributes, not a static `class`: the bag owns `class`.
- **Bindings.**
  - `:attr` becomes an attribute binding, `:class` a class binding, and `.prop` a property binding.
  - `@event="handler"` binds a handler passed in as a prop.
  - `:style="bag"` takes a core-computed record of geometry custom properties (PRD D7), below the
    root only: Angular `[style]`, React `style={reactStyle(bag)}`, Lit `styleMap`. It is refused on
    the root, `mp-host` and `mp-attrs` elements, which belong to the consumer. Every other style
    belongs in the scoped sheet.
- **Control flow.**
  - `v-if` / `v-else-if` / `v-else` are supported.
  - `v-for="(item, i) in items"` is supported, with `:key`.
- **`v-html`** sets an element's content from a string: Angular `[innerHTML]` (sanitised), React
  `dangerouslySetInnerHTML`, Lit `unsafeHTML`, Vue `v-html`. The element takes no other content.
  The string must be markup the core built from escaped input (highlighted code, say), never
  consumer HTML. Its nodes carry no `data-mps`, so style them by anchoring on a scoped ancestor
  with `/*! @mps-global */`.
- **Expressions.** They may read props, loop locals and `$slots`, and nothing else. Functions
  and arrow functions are refused, so all logic stays in the core.
- **Elements.** Only native elements and `<slot>` are allowed; no components. Vue's parser reads an
  unknown tag as a component, so newer native elements are listed in `NATIVE_TAGS`
  (`source.mjs`), today only `<selectedcontent>`. Such an element takes no attributes or content.
- **`:value.prop` on a `<select>`** is a seed for React only: React emits it as `defaultValue`
  because it refuses `selected` on an `<option>`. The other fronts drop it and select through
  each option's `selected` bag key. A live `select.value` write would land before the options
  exist, and would turn a multiple select's array into a string that matches nothing.
- **`mp-attrs`.** Marks the element that receives the consumer's attributes (`aria-*`, `id`,
  `tabindex`, ...) when that is not the root, e.g. the `<select>` inside the select's wrapper.
  - React spreads `attrs` there and types the props for that element.
  - Vue sets `inheritAttrs: false` and merges `$attrs` into its bag. The consumer's `class` and
    `style` stay on the root.
  - A `role` in the element's bag is the core's ARIA contract, so it wins over a consumer's
    `role` in both fronts. A consumer's `role` applies only when the bag sets none.
  - The marked element must always render: no `v-if` or `v-for` on it.
  - Angular and Lit have a host element, which keeps the attributes. Their cores read `aria-label`
    as the view's `label` argument.
- **Scoped slots in Lit.** A slot with parameters also gets a `<slot>Renderer` property on the Lit
  element, typed with the template's exported `<Name><Slot>SlotArgs`. It wins over `slot="…"`
  children. Angular's slot directives import the types named in the slot's parameters.
- **Lit attributes** are the kebab-case form of a camelCase input (`numberVisible` →
  `number-visible`).
- **`mp-host`.** Marking the root element `mp-host` makes it the front's host element in
  Angular and Lit:
  - Those two fronts emit only its children. The component applies the root's bag to itself
    (`useHostProps` / `applyHostProps`).
  - React and Vue render the element as written.
