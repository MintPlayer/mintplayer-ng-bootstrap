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
  (no ng-package.js — the WC lib builds with Vite; the 5 stray ng-package.js files in older WC dirs are inert)
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
- Generated files (`*.styles.ts`, `*.element.template.ts`, `custom-elements.json`) are **gitignored build artifacts** (`.gitignore`: `libs/**/*.styles.ts` etc.) — never stage or hand-edit them; only the `.scss`/`.html` sources are tracked.

### SSR chrome codegen (`*-chrome.generated.ts`)

WCs with a no-JS SSR path ship a Declarative-Shadow-DOM "chrome" constant, rendered from the **built** element via `@lit-labs/ssr`:

- `tools/lit-ssr-utils/gen-<name>-chrome.mjs` → `libs/mintplayer-web-components/<name>/ssr/mp-<name>-chrome.generated.ts`, produced by the Nx target `codegen-<name>-chrome`, which `dependsOn` the WC `build` (it imports the compiled `dist` element, so it can't be part of `build` — that would be circular).
- Like all generated files, `*-chrome.generated.ts` are gitignored build artifacts (`.gitignore`: `libs/mintplayer-web-components/**/*.generated.ts`). Never commit or hand-edit them.
- They regenerate automatically because every SSR demo build `dependsOn` the aggregate **`mintplayer-web-components:codegen-ssr-chrome`** (it fans out to the per-component `codegen-*-chrome` targets). **When adding a new SSR WC, add its `codegen-<name>-chrome` to that aggregate** — the demos need no change. After editing a WC's shadow markup/styles, rerun `nx run mintplayer-web-components:codegen-ssr-chrome` (or just build a demo) so the SSR chrome isn't stale.

### WC gotchas

- `static get observedAttributes()` must be a **static getter** (spread `super.observedAttributes`), not a static array.
- **Do not shadow read-only DOM properties.** `HTMLElement` already defines `scrollHeight`, `title`, `lang`, etc. as typed members — defining a same-named accessor fails to compile (`TS2416`). Pick a non-clashing name (e.g. `panelScrollHeight` with attribute `scroll-height`).
- **Bootstrap utility classes do not cross the shadow boundary.** `p-0`, `d-flex`, reboot defaults — none reach inside a WC's shadow root. Re-declare every rule you need in the component's own SCSS.
- Per-component templates that vary per row must be **render-callback functions** (see `mp-treeview.nodeRenderer`), not slots — slots can't be per-node in a dynamic tree.
- Composition over reinvention: reuse `OverlayController` (`libs/.../overlay`) for popups and `mp-treeview` for trees.

### Module resolution

`tsconfig.base.json` maps `@mintplayer/web-components/*` → `libs/mintplayer-web-components/*` (wildcard). A new `<name>/src/index.ts` is auto-discovered as a sub-entrypoint by `vite.config.mts` and resolves in dev/build with no extra config.

## Framework wrappers

- **Angular** (`libs/mintplayer-ng-bootstrap/<name>/`): `@Component` with `CUSTOM_ELEMENTS_SCHEMA`, bridges `[attr.x]` inputs and `(custom-event)` outputs to the WC; `<ng-template>` directives are bridged to render-callbacks via `EmbeddedViewRef`. Form controls implement `ControlValueAccessor`.
- **React** (`libs/mintplayer-react-bootstrap/<name>/`): `@lit/react` `createComponent`; object/function props assigned via the element ref; controlled `value` + `onChange`.
- **Vue** (`libs/mintplayer-vue-bootstrap/<name>/`): `.vue` SFC; `v-model` via `defineModel`; object props assigned to the element ref `onMounted`/`watch`; named scoped slots.

## Build & test

**Run test suites only once ALL milestones of a task are implemented — never after each one.**
The suites here are slow (`nx test mintplayer-ng-bootstrap` alone is ~2.5 min, a full
cross-app e2e sweep far longer), so a per-milestone run costs more time than it saves.
Verify intermediate work by reading the code and type-checking; commit per milestone if you
like, but batch the build + unit + e2e sweep into a single pass at the end.

```bash
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap        # ng-packagr secondary entries
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components        # vitest + jsdom
# backend (no migration unless entities change):
dotnet build apps/api/Api.csproj -c Debug
```

Issue branches target **`master`** (not `development`). Breaking changes are acceptable when documented — the libraries favor a clean API over back-compat shims.

**All pull requests are squashed into `master`.** No intermediate commit ever lands on the default
branch, so a commit part-way through a PR does **not** have to build or pass tests — only the final
state of the branch does. Commit freely at each milestone to keep the work reviewable and revertable;
don't hold back a commit because the suite is mid-refactor, and don't spend a run proving an
intermediate commit green. This is the other half of the batching rule above: verify by reading and
type-checking as you go, and run the suites once at the end.

A corollary for commit messages: since they are squashed away, the durable record of *why* is the PR
description and the docs under `docs/prd/` — put reasoning that outlives the branch there, not only in
a commit body.
