# @mintplayer/front-templates

Write a component's markup once, as a Vue single-file component, and compile it into the
template of every front: Angular, React, Vue and Lit. This came out of PRD #437 spike S13.

The source is an ordinary `.vue` file, so Volar gives it completion, type-checking and
go-to-definition with no plugin. The compiler accepts a deliberately small subset of Vue,
which every front can express without a runtime of its own.

```bash
node tools/front-templates/bin/front-templates.mjs --config libs/mintplayer-ui-core/front-templates.config.mjs
# --check: write nothing; exit 1 if a generated file is missing or stale
```

In this workspace, `mintplayer-ui-core:codegen` runs the compiler. Every generated file is
gitignored (`libs/*/*/src/generated/`).

## Config

```js
import { defineConfig } from '../../tools/front-templates/src/index.mjs';

export default defineConfig({
  root: 'libs/my-core',               // <root>/<entry>/src/templates/<name>.view.vue
  templates: 'src/templates',         // optional
  fronts: {                           // any subset of angular | react | vue | lit
    angular: { outDir: (entry) => `libs/my-ng/${entry}/src/generated` },
    react: { outDir: (entry) => `libs/my-react/${entry}/src/generated`, runtime: { file: 'libs/my-react/machine/src/react-props' } },
    vue: { outDir: (entry) => `libs/my-vue/${entry}/src/generated` },
    lit: { outDir: (entry) => `libs/my-wc/${entry}/src/generated`, runtime: '@my/wc/machine' },
  },
});
```

`runtime` names the module that exports the prop-bag helpers. React needs `reactProps` and
`reactFormProps`; Lit needs the `props()` directive. Give it as a package specifier, or as
`{ file }` to have each generated file import it by a relative path.

The same API is available programmatically: `compileFrontTemplates(config, { cwd, check })`,
plus the separate `readSource` and `emitAngular` / `emitReact` / `emitVue` / `emitLit`.

## What each front gets

| Source `<name>.view.vue` | Angular `.html` | React `.tsx` | Vue `.vue` | Lit `.ts` |
|-|-|-|-|-|
| the whole template | `templateUrl` of the component | `<Name>Template` component | the SFC itself | `nameTemplate({…})` function |
| prop `x` | signal `x()` on the component | prop `x` | prop `x` | argument `x` |
| `<slot name="a">` | `slots().a` template ref, else `<ng-content select>` / fallback | `slots.a` (node or `(args) => node`) | `<slot>` | `slots.a` (nodes or callback) |
| `ref="root"` | `#root` | `rootRef` prop | `ref` | `rootRef` argument |

## Template rules

- **Script.** `<script setup lang="ts">` holds only `import type` lines (by package path) plus
  `defineProps<{…}>()` and `defineSlots<{…}>()`, each with an inline type literal.
- **Attribute bags.** An element may have one `v-bind="bag"`. Next to it, use only bound
  attributes, not a static `class`: the bag owns `class`.
- **Bindings.**
  - `:attr` becomes an attribute binding, `:class` a class binding, and `.prop` a property binding.
  - `@event="handler"` binds a handler passed in as a prop.
  - `:style` is refused. Styles belong in the scoped sheet.
- **Control flow.**
  - `v-if` / `v-else-if` / `v-else` are supported.
  - `v-for="(item, i) in items"` is supported, with `:key`.
- **Expressions.** They may read props, loop locals and `$slots`, and nothing else. Functions
  and arrow functions are refused, so all logic stays in the core.
- **Elements.** Only native elements and `<slot>` are allowed; no components.
- **`mp-host`.** Marking the root element `mp-host` makes it the front's host element in
  Angular and Lit:
  - Those two fronts emit only its children. The component applies the root's bag to itself
    (`useHostProps` / `applyHostProps`).
  - React and Vue render the element as written.
