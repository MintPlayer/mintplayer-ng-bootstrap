# Dark mode spikes: findings (2026-09-30)

These spikes gate milestones B–G of [../../dark-mode-plan.md](../../dark-mode-plan.md). All three passed. Each ran in
a throwaway worktree. The harnesses were not kept; this file is the record.

## A1: Angular SSR attribute write (PASS, D4 confirmed)

**How it was run:** a demo SSR build (`-c development`), `node dist/apps/ng-bootstrap-demo/browser/server/server.mjs`,
then curl.

- **Server branch** (at the top of the constructor): inject `REQUEST` and `DOCUMENT` inside
  `isPlatformServer`, then `setAttribute` synchronously.
  - The attribute is serialized, and `lang` is preserved. There was no NG0953 over roughly 20 renders, and
    `ngh`/`ng-state` were still emitted.
  - Cases checked: dark / light / sepia pass through. `auto`, no cookie, and `x"><script` (raw or encoded) produce no
    attribute. `a=1; bs-theme-mode=dark; b=2` resolves to dark.
- **With the meta default:**
  - `<meta name="bs-theme-default-mode" content="dark">` is readable from the server `DOCUMENT` at construction time,
    because the head has already been parsed.
  - An invalid cookie counts as absent, so the meta default applies. A **valid `auto` cookie beats a non-auto meta**,
    because the user's explicit choice wins.
- **`REQUEST === null` on a prerendered route** is safe: it falls back to "no cookie". Route extraction never
  constructs the service. Prerendered HTML carries no attribute, so the pre-boot script is what themes those pages.
- **`Vary: Cookie`:**
  - ng: `headers.append('Vary', 'Cookie')` in the `text/html` branch of `server.ts`, after
    `headers.delete('content-length')`. Verified with `curl -sI`; static files are unaffected.
  - react/vue `server.mjs`: splice at `:74` (`template.replace(...)` → `injectThemeAttribute`), and add Vary in the
    `res.set` at `:75`. Both also use `express.static` with `maxAge: '1y'`.
- **Hydration never writes to `<html>`.** The only client-side writer is the service's own effect. **The current
  localStorage-seeded browser branch would undo a server-written dark theme.** The D4 mirror fixes that, and a spec
  pins "cookie dark + empty storage stays dark".
- **Running locally** needs `NG_ALLOWED_HOSTS=localhost`, with requests sent to `127.0.0.1`. Without that, the SSRF
  guard returns 400. The e2e setup needs the same.

## A2: generated pre-boot bundle and packaging (PASS, D5 confirmed, plus two surprises)

- **Integration:** a codegen script, `tools/scripts/build-theme-preboot.mjs`, runs as an extra command of the
  existing `codegen-wc` target.
  - Its output lands **in the source tree, gitignored** (`theming/bs-theme-preboot.js`), like `*.styles.ts`, and is
    cached through `outputs`.
  - `theming/src/index.ts` becomes a Vite sub-entry, which is harmless: the barrel doesn't export `preboot.ts`.
- **Pipeline:**
  - Steps: esbuild IIFE at **es2015** → `ts.transpileModule` down to ES5 → esbuild minify (es5).
  - This order is required: esbuild 0.28 at `target:'es5'` **hard-errors** on `const`/`let`/`for-of`.
  - Result: 807 B, no module syntax, parses with `acorn` (ES5, script).
  - **Source rule:** no ES2015+ runtime APIs (`find`, `includes`, `startsWith`) in the modules it pulls in; acorn
    only checks syntax.
- **Surprise 1:** `nxCopyAssetsPlugin` **silently skips gitignored files**
  (`@nx/js/.../copy-assets-handler.js:47`). This is why **`custom-elements.json` is missing from the published
  `@mintplayer/web-components@2.16.0` tarball** today. Fix: an `emitStaticFiles()` Vite plugin (`this.emitFile` in
  `generateBundle`, which fails when a file is missing) for the pre-boot bundle, `color-mode.css` and
  `custom-elements.json`. This ships in this PR.
- **Exports:** `generateSubpathExports` spreads the **source** `package.json` exports. Explicit
  `./theming/bs-theme-preboot.js` and `./theming/color-mode.css` keys are added there. `require.resolve` passes from
  a dist-linked folder.
- **Sass:** `@use '@mintplayer/web-components/theming/color-mode.css';` at the **top** of `_bootstrap.scss`.
  - The Angular build resolves it in-workspace, because its sass importer applies the tsconfig paths.
  - Consumers resolve it with `--load-path=node_modules` or `--pkg-importer=node`.
- **Demos:**
  - ng assets glob: `{ glob: 'bs-theme-preboot.js', input: 'libs/mintplayer-web-components/theming', output:
    'theming' }`.
  - React/Vue (Vite) need a small shared plugin (dev middleware + `emitFile`), plus a `resolve.alias` for the
    `color-mode.css` `@import`, because CSS imports bypass `nxViteTsPaths`.
- **Surprise 2, critical CSS:**
  - Angular's inliner (beasties) prunes **every `[data-bs-theme=dark]` rule** from the inlined critical CSS, because
    the static HTML has no attribute.
  - The script order is fine: the meta and `<script src>` stay ahead of the inlined `<style>` and
    `<link media=print onload>`.
  - But a dark user with no server-written attribute paints light critical CSS until the async stylesheet loads.
    That affects `auto`, prerendered pages, cached pages and CSR builds. Decision: see the PRD, D5c.

## A3: dark icons via style queries (PASS in all 3 engines, D6 confirmed, no mask fallback)

- **Measured on:** Chromium 151, Firefox 153, WebKit 26.5.
- **Identical results across shadow-root, plain light-DOM and rescoped light-tier instances:**
  - dark page, light page, nested light-in-dark and nested dark-in-light
  - live `data-bs-theme` toggling on `<html>` (updates on the next frame)
  - `:host` inside `@container` works
  - the nearest themed ancestor wins
- **Rescoper:** `rescopeCss` passes `@container style(...)` through intact and scopes the inner selectors. **No
  rescoper change is needed.**
- **Sass:** dart-sass 1.102 compiles it unchanged.
- **Pattern:**
  ```scss
  @container style(--mp-color-mode: dark) {
    .form-select { --bs-form-select-bg-img: #{escape-svg($form-select-indicator-dark)}; }
    .form-check-input { --bs-form-switch-bg: #{escape-svg($form-switch-bg-image-dark)}; }
  }
  ```
  No `container-type` is needed; the default style container is enough.
- **Forced colours** are a separate problem, and style queries don't solve them. The engines differ:
  - Only Chromium truly forces colours.
  - Firefox repaints with a high-contrast palette.
  - WebKit on Windows only flips the media query.

  Measured results and fixes:
  - **Data-URI caret:** survives, but its baked colour follows `--mp-color-mode`, not the forced palette. It washes
    out when the two mismatch. **Fix:** `@media (forced-colors: active) { .form-select { appearance: auto;
    background-image: none; } }` gives a system-drawn arrow.
  - **Switch knob:** needs the same treatment, via a forced-colors override.
  - **Accordion mask:** invisible, because its background is forced to Canvas. `forced-color-adjust: none` is wrong.
    **Fix:** `@media (forced-colors: active) { background-color: CanvasText }`, correct in both Chromium palettes and
    in Firefox.
