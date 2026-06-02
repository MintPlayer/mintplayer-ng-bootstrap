# CLAUDE.md

Project-wide technical conventions for the `@mintplayer/*-bootstrap` workspace. Read this before adding components.

## What this workspace is

A multi-framework Bootstrap component system. As of 2026 it is split into:

- **`@mintplayer/web-components`** (`libs/mintplayer-web-components`) — framework-agnostic **Lit** web components. The single source of UI truth.
- **`@mintplayer/ng-bootstrap`** (`libs/mintplayer-ng-bootstrap`) — Angular wrappers.
- **`@mintplayer/react-bootstrap`** (`libs/mintplayer-react-bootstrap`) — React wrappers.
- **`@mintplayer/vue-bootstrap`** (`libs/mintplayer-vue-bootstrap`) — Vue wrappers.
- Demo apps: `apps/{ng,react,vue}-bootstrap-demo` (+ `-e2e` Playwright projects).
- Backend for data-driven demos: `apps/api` (ASP.NET Core + EF Core).

New components default to **a Lit WC + hand-written wrappers per framework** (dock / scheduler / timeline / treeview / tree-select are the precedent). Wrappers are normal source, NOT codegen'd.

## Web component authoring

Each WC lives at `libs/mintplayer-web-components/<name>/` with this shape:

```
<name>/
  index.ts                       → export * from './src'
  ng-package.js                  → secondary-entry shim (mirror an existing one)
  src/
    index.ts                     → public API barrel
    components/<el>.ts           → the LitElement (calls customElements.define at the bottom)
    styles/<name>.styles.scss    → hand-written styles  ──┐ codegen input
    styles/<name>.styles.ts      → GENERATED, do not edit ◄┘ (exports `<camelName>Styles`)
    types/ , providers/ , ...
```

Some larger components instead use `<el>.element.html` + `<el>.element.scss` → a GENERATED `<el>.element.template.ts` (exports `template` + `styles`). Either pattern is fine; inline `html\`\`` in `render()` suits dynamic templates, the `.element.html` pattern suits mostly-static structure.

### SCSS / template codegen (important)

`.styles.scss` and `.element.html`/`.element.scss` are **compiled into TypeScript** by `tools/scripts/build-web-components.mjs`. The element imports the *generated* `.ts`, never the `.scss` directly. So:

- **After editing any `.styles.scss`, `.element.scss`, or `.element.html`, re-run codegen or the change is invisible:**
  ```bash
  npx nx run mintplayer-web-components:codegen-wc
  # watch mode:
  npx nx run mintplayer-web-components:codegen-wc-watch
  ```
- `nx build mintplayer-web-components` runs `codegen-wc` + `cem` (custom-elements manifest) automatically as `dependsOn`.
- Generated files (`*.styles.ts`, `*.element.template.ts`) are committed but are build artifacts — regenerate, don't hand-edit.

### WC gotchas

- `static get observedAttributes()` must be a **static getter** (spread `super.observedAttributes`), not a static array.
- **Do not shadow read-only DOM properties.** `HTMLElement` already defines `scrollHeight`, `title`, `lang`, etc. as typed members — defining a same-named accessor fails to compile (`TS2416`). Pick a non-clashing name (e.g. `panelScrollHeight` with attribute `scroll-height`).
- **Bootstrap utility classes do not cross the shadow boundary.** `p-0`, `d-flex`, reboot defaults — none reach inside a WC's shadow root. Re-declare every rule you need in the component's own SCSS. (Note: in the **ng demo app** only reboot/utilities/grid/forms/buttons are global — Bootstrap *component* classes like `.badge` / `.btn-close` / `.card` are NOT; they live inside the `bs-*` components. The React/Vue demo apps import full `bootstrap.min.css`, so everything is global there.)
- **Slotted content vs shadow-inserted content — only the former is page-styleable.** A `<slot>` does NOT move projected content into the shadow DOM; the element stays a **light-DOM child of the host** (the slot only relocates where it *renders*), so **page CSS styles it normally** (e.g. `mp-tree-select` chips via `slot="chips"`). Content the WC **inserts into its own shadow root** — its shadow markup, or a render-callback's returned DOM (e.g. `mp-tree-select`'s `suggestionTemplate` appended into the nested `mp-treeview` shadow) — is genuinely shadow content and **page CSS cannot reach it**. Style true shadow content via `::slotted(...)` (slotted nodes, shallow selectors), **CSS custom properties** (they inherit *into* shadow — the theming seam), inheritable props (`color`/`font`), **inline styles**, or classes the WC defines itself.
- Per-component templates that vary per row must be **render-callback functions** (see `mp-treeview.nodeRenderer`), not slots — slots can't be per-node in a dynamic tree. (Trade-off: such per-row content lands in shadow and is therefore not page-styleable — see the slotted-vs-shadow note above.)
- Composition over reinvention: reuse `OverlayController` (`libs/.../overlay`) for popups and `mp-treeview` for trees.

### Module resolution

`tsconfig.base.json` maps `@mintplayer/web-components/*` → `libs/mintplayer-web-components/*` (wildcard). A new `<name>/src/index.ts` is auto-discovered as a sub-entrypoint by `vite.config.mts` and resolves in dev/build with no extra config.

## Framework wrappers

- **Angular** (`libs/mintplayer-ng-bootstrap/<name>/`): `@Component` with `CUSTOM_ELEMENTS_SCHEMA`, bridges `[attr.x]` inputs and `(custom-event)` outputs to the WC; `<ng-template>` directives are bridged to render-callbacks via `EmbeddedViewRef`. Form controls implement `ControlValueAccessor`.
- **React** (`libs/mintplayer-react-bootstrap/<name>/`): `@lit/react` `createComponent`; object/function props assigned via the element ref; controlled `value` + `onChange`.
- **Vue** (`libs/mintplayer-vue-bootstrap/<name>/`): `.vue` SFC; `v-model` via `defineModel`; object props assigned to the element ref `onMounted`/`watch`; named scoped slots.

## Build & test

```bash
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap        # ng-packagr secondary entries
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components        # vitest + jsdom
# backend (no migration unless entities change):
dotnet build apps/api/Api.csproj -c Debug
```

Issue branches target **`master`** (not `development`). PRs squash-merge. Breaking changes are acceptable when documented — the libraries favor a clean API over back-compat shims.
