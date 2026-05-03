# PRD: Split web-components into `.ts` / `.html` / `.scss` files

## Problem

`libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts` is a single 4 473-line file that defines a vanilla custom element (`class MintDockManagerElement extends HTMLElement`). It bundles three concerns into one TypeScript module:

- A 485-line ES template-literal `templateHtml` (lines 32–516) that **mixes** a `<style>...</style>` block (~330 lines of CSS) **and** the element's HTML markup.
- The full TypeScript class with state, drag/drop logic, layout math, and DOM wiring (~3 950 lines).
- The `customElements.define(...)` registration at the bottom.

This is hard to maintain:

- IDE tooling for HTML autocompletion and SCSS variable resolution does not work inside an ES template literal.
- Style review and markup review require scrolling past unrelated code; diffs touching CSS and behaviour are interleaved.
- The pattern is unique in this repo (`bs-*` Angular components already use `templateUrl` / `styleUrls`), creating an inconsistent mental model.
- Future web-components in other libs would inherit the same problem if we don't fix it now.

We want to author this element (and any future `*.element.ts`) as three co-located files — `mint-dock-manager.element.ts`, `mint-dock-manager.element.html`, `mint-dock-manager.element.scss` — while keeping the public build contract unchanged: **`npm run build`** (which delegates to `nx build`) must continue to produce the same packaged Angular library, in one command, with no extra developer steps.

## Goal

1. Co-locate web-component sources as `<name>.element.ts` + `.html` + `.scss`, just like Angular components in this repo.
2. The `.ts` class continues to be a vanilla `HTMLElement` subclass (not Lit, not Stencil) — no rewrite of the runtime class shape.
3. `npm run build` / `nx build mintplayer-ng-bootstrap` performs SCSS compilation and HTML inlining transparently, before `@nx/angular:package` (ng-packagr) runs.
4. Authoring works on Windows + the CI Linux runner with no per-platform divergence.
5. The pattern generalises: adding a second `*.element.ts` later requires zero new build wiring — just three more files.

### Non-goals

- Replacing the runtime web-component pattern with Lit or Stencil. The class extends `HTMLElement` directly and that stays.
- Changing the public API of `MintDockManagerElement` or `BsDockManagerComponent`.
- Splitting the 4 000-line class itself into smaller modules. That is a separate refactor; this PRD is about file-format only.
- Building web-components for consumption outside the Angular library (i.e. as standalone `<script>` artefacts). The output remains a normal entry of the published `@mintplayer/ng-bootstrap` package.

## Current state

```text
libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/
└── mint-dock-manager.element.ts     ← TS class + <style> + HTML, 4 473 lines
```

Build today:

```jsonc
// libs/mintplayer-ng-bootstrap/project.json
"build": {
  "executor": "@nx/angular:package",
  "options": {
    "tsConfig": "libs/mintplayer-ng-bootstrap/tsconfig.lib.json",
    "project": "libs/mintplayer-ng-bootstrap/ng-package.json"
  }
}
```

```jsonc
// nx.json
"targetDefaults": {
  "build": { "dependsOn": ["^build"], "inputs": ["production", "^production"], "cache": true }
}
```

Consumed via `BsDockManagerComponent` (`templateUrl` + `styleUrls`, normal Angular component) which renders `<mint-dock-manager #manager>` and calls `MintDockManagerElement.configureDocument(...)`.

## Reference research — what already exists

| Tool / pattern | Verdict | Why |
|---|---|---|
| **Stencil** (`@stencil/core`) | Partial fit | Solves split-file authoring but is a rewrite (decorators, JSX) and adds a second compiler/bundler alongside ng-packagr. Reserve for a future "many web-components" reality. |
| **Lit + `*-lit-css`** | Not a fit | Specific to `html\`...\`` / `css\`...\`` tagged templates. Requires adopting Lit. |
| **`@nxext/stencil`** | Not a fit (today) | Latest is for Nx 21; this workspace is Nx 22.5. |
| **`@nx-plus/web-components`** | Not a fit | Long unmaintained. |
| **`rollup-plugin-web-components`** | Not a fit | Last published ~5 years ago. |
| **`rollup-plugin-import-css` + `rollup-plugin-string`** | Partial fit | Right primitives, but ng-packagr's internal Rollup pass does **not** accept user plugins (issues #1418, #1619, #2772 closed wontfix). Would require a sidecar bundler. |
| **Vite library mode + `?raw` / `?inline`** | Partial fit | Cleanest DX as a sidecar build; output fed back into the lib as a `.ts` artefact. Heaviest tooling. |
| **esbuild + `esbuild-sass-plugin` (`type: 'css-text'`)** | Partial fit | Fastest sidecar option; `css-text` mode is purpose-built for shadow-DOM constructable stylesheets. |
| **Codegen Nx target (Node script + `sass`) + `dependsOn`** | **Recommended** | Smallest dependency footprint, ng-packagr only ever sees plain TS, generalises trivially to N web-components, integrates with the existing `targetDefaults.build.dependsOn` pattern. |

ng-packagr 21 explicitly does not support custom file loaders, so the answer is **not** "teach the lib build about `.html` / `.scss` raw imports." It is "produce a generated `.ts` before ng-packagr runs." This matches the established Nx convention.

## Proposed approach

### Author-time file layout

```text
libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/
├── mint-dock-manager.element.ts          ← class (extends HTMLElement)
├── mint-dock-manager.element.html        ← markup only, no <style>
├── mint-dock-manager.element.scss        ← styles only
└── mint-dock-manager.element.template.ts ← GENERATED, git-ignored
```

The `.ts` file imports the generated module:

```ts
import { templateHtml } from './mint-dock-manager.element.template';
// ...
cachedTemplate.innerHTML = templateHtml;
```

The generated `.template.ts` exports a single string built from `<style>${compiledCss}</style>${htmlMarkup}`:

```ts
// AUTO-GENERATED — do not edit by hand. Regenerated by nx run mintplayer-ng-bootstrap:codegen-wc.
export const templateHtml = `<style>...</style>...markup...`;
```

This preserves the existing runtime contract exactly (one string fed into `template.innerHTML`), so the 4 000-line class needs only a one-line change at the import site.

### Build-time wiring

Add a new Nx target `codegen-wc` to `libs/mintplayer-ng-bootstrap/project.json`:

```jsonc
"codegen-wc": {
  "executor": "nx:run-commands",
  "outputs": ["{projectRoot}/**/web-components/*.element.template.ts"],
  "inputs": [
    "{projectRoot}/**/web-components/*.element.html",
    "{projectRoot}/**/web-components/*.element.scss",
    "{workspaceRoot}/tools/scripts/build-web-components.mjs"
  ],
  "cache": true,
  "options": {
    "command": "node tools/scripts/build-web-components.mjs libs/mintplayer-ng-bootstrap"
  }
}
```

Wire it as a prerequisite of `build` (one of two equivalent options — pick one in implementation):

- **Option A** — per-target `dependsOn` on the project's `build`:
  ```jsonc
  "build": { ..., "dependsOn": ["^build", "codegen-wc"] }
  ```
- **Option B** — workspace-wide via `nx.json` `targetDefaults` so any future lib that adds a `codegen-wc` target gets it automatically.

Recommendation: **Option A** for the first iteration (explicit, scoped to the one lib that needs it). Promote to Option B only if/when a second lib grows web-components.

### The codegen script

`tools/scripts/build-web-components.mjs`:

1. Glob `<libRoot>/**/web-components/*.element.html`.
2. For each match, read the sibling `.scss` (required) and `.html` (required).
3. Compile SCSS via the `sass` package's `compileString({ style: 'compressed', sourceMap: false })`.
4. Emit `<name>.element.template.ts` with `export const templateHtml = ...` whose body is `<style>${css}</style>${html}` — properly escaped for backticks and `${`.
5. Skip rewrite if the output is byte-identical (preserves Nx cache hits and avoids spurious git noise locally; CI never has the file because it is `.gitignore`d).

Add `sass` (latest 1.x; pure-JS dart-sass) to `devDependencies`. ~7 MB, single dep. No native binaries — works on Windows and Linux CI uniformly.

Add to `.gitignore`:

```text
libs/**/web-components/*.element.template.ts
```

### Type-check ergonomics

The generated `.template.ts` is committed-out but referenced by an `import` in the hand-written `.element.ts`. Two safeguards so the IDE doesn't complain on a fresh clone:

1. `tsconfig.lib.json` already covers `**/*.ts` — no change needed.
2. Add a `postinstall` step (or document `npm run codegen:wc`) that runs the codegen once after `npm install`, so red squigglies disappear without needing a full `nx build`. Cheapest place: extend the existing `postinstall` in `package.json`.

```jsonc
"scripts": {
  "postinstall": "node ./decorate-angular-cli.js && nx run mintplayer-ng-bootstrap:codegen-wc"
}
```

(Trade-off: makes `npm install` ~1–2 s slower. Acceptable.)

### Watch mode (optional, deferred)

For `nx serve` of the demo app, the codegen target should re-run on `.html` / `.scss` changes. Two implementation paths, both deferred to a follow-up:

- A `watch` flag in the script using `chokidar`.
- An `nx watch --projects=mintplayer-ng-bootstrap --includeDependentProjects -- nx run mintplayer-ng-bootstrap:codegen-wc` command documented in the README.

The first iteration of this PRD does **not** need watch mode; the `.ts` class file is what changes 99 % of the time during dev, and that path already works.

## Migration steps for `mint-dock-manager.element.ts`

1. Extract lines 33–112 (the `<style>` block contents, without the wrapping `<style>` tags) → `mint-dock-manager.element.scss`.
2. Extract the rest of the template literal (HTML markup) → `mint-dock-manager.element.html`.
3. Replace the `templateHtml` constant with `import { templateHtml } from './mint-dock-manager.element.template';`.
4. Delete the now-orphan `cachedTemplate` rebuild path (no behavioural change — the generated string is functionally identical).
5. Add `tools/scripts/build-web-components.mjs` and the `codegen-wc` target.
6. Update `.gitignore` and `package.json` `postinstall`.
7. Run `npm install` then `nx build mintplayer-ng-bootstrap` and confirm the dist output is byte-identical to a baseline build (modulo whitespace from SCSS compression).
8. Run the `dock` demo page and confirm visual + behavioural parity (drag, dock, float, resize).

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| SCSS compile output differs subtly from hand-written CSS (e.g. shorthand collapse, vendor prefixing) | Use `style: 'compressed'` only at publish time; keep authoring CSS; one-time visual diff against the demo page; keep a baseline CSS dump in the PR description. |
| `nx build` cache miss on every change because inputs aren't tracked | The `inputs` array on `codegen-wc` explicitly includes the `.html` and `.scss` files; verify with `nx show project mintplayer-ng-bootstrap --json`. |
| Generated file out-of-date in IDE on a fresh clone | `postinstall` runs the codegen once; `npm install` is the natural entry point. |
| Future contributor edits the generated `.template.ts` instead of the source | First line of the generated file is `// AUTO-GENERATED — do not edit. Source: <name>.element.html / <name>.element.scss`; gitignored so manual edits are visibly transient. |
| SCSS package adds noticeable install time on CI | `sass` is pure JS, ~7 MB, no postinstall hooks. Negligible. |
| Pattern doesn't generalise if a future element needs `<svg>` symbols or other assets | Out of scope; revisit when that requirement appears. The codegen script is small enough (<100 LoC) to extend. |

## Out-of-the-way alternatives considered (and rejected for now)

- **Migrate to Stencil for `mint-dock-manager`** — best long-term answer if the lib grows to ~5+ web-components, but is a wholesale rewrite of the element class today and adds a second build pipeline. Re-evaluate if/when a second `*.element.ts` lands.
- **Sidecar Vite library build** — works, but introduces a second bundler config to maintain for one element. Codegen-as-string is strictly leaner.
- **Patch ng-packagr to accept Rollup plugins** — upstream has explicitly declined; forking is unjustifiable for one element.

## Open questions

1. Should the generated `*.template.ts` be **committed** rather than gitignored? Trade-off:
   - *Committed*: zero-setup IDE experience, diffs visible in PRs (noisy), risk of merge conflicts on the generated file.
   - *Gitignored* (proposed): clean diffs, but requires `postinstall` to bootstrap.
   Default to gitignored unless the team prefers the committed-artefact pattern.

2. Should we standardise on a per-element `customElements.define()` call inside the `.ts` file (as today) or hoist registration into a per-lib `register-elements.ts` that the consuming Angular module calls explicitly? Out of scope for this PRD but worth flagging — the answer affects SSR safety once we have more elements.

3. Naming: `*.element.template.ts` vs `*.element.generated.ts` vs `*.element.tpl.ts`. Recommend `.template.ts` — matches Angular's `templateUrl` mental model.

## Acceptance criteria

- [ ] `mint-dock-manager.element.ts` no longer contains a CSS or HTML template-literal; it imports `templateHtml` from a generated module.
- [ ] `mint-dock-manager.element.html` and `mint-dock-manager.element.scss` exist as the source-of-truth files.
- [ ] Running `npm run build` from a clean clone (after `npm install`) produces a working `dist/libs/mintplayer-ng-bootstrap` with the dock manager rendering identically to before.
- [ ] Running `npm install` regenerates the template artefact via `postinstall`.
- [ ] `nx build mintplayer-ng-bootstrap` is cache-correct: editing only the `.html` invalidates the cache, editing an unrelated `.md` does not.
- [ ] Adding a hypothetical second `foo.element.ts` + `.html` + `.scss` Just Works without further wiring.
- [ ] Demo app's dock page renders and behaves identically (manual smoke: drag, dock, float, resize).
