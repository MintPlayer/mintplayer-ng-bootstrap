# Development Plan: Issue #324

**Issue**: #324
**Title**: dark-mode / style customization instructions
**Type**: Feature + Documentation
**Priority**: Medium

## Executive Summary

The library does not currently ship a recommended way to switch Bootstrap's color mode at runtime, and the demo has no consumer-facing documentation for customizing colors. This work delivers three things together:

1. A new library subentry `@mintplayer/ng-bootstrap/theme` exposing `BsThemeService` — a tiny signal-first service that owns the user's mode (`'auto' | 'light' | 'dark' | string`), resolves `auto` via `prefers-color-scheme`, writes `data-bs-theme` on `<html>`, persists to localStorage, and live-updates when the OS-level preference changes.
2. A demo-side cycling icon button in the right-side navbar that calls `setMode()`, plus a navbar `[color]` binding that adapts to `effectiveMode()`.
3. A new doc page `/additional-samples/theming` that walks the consumer through build-time SCSS customization, runtime CSS-variable customization, the 3-state toggle recipe, SSR/no-flash integration via an inline pre-boot `<script>`, and custom `data-bs-theme="…"` variants (sepia / high-contrast / brand).

The runtime switch mechanism is Bootstrap-native (`data-bs-theme` selector), not per-variable JS mutation — `bootstrap/scss/_root.scss` (which we already `@import`) ships a complete `[data-bs-theme="dark"]` block, so a single attribute flip swaps the full palette atomically. Per-variable `style.setProperty('--bs-…')` is documented as the *customization* primitive, not the switch primitive.

---

## Problem Statement

### Current Behavior
- The demo renders permanently in Bootstrap's light theme. There is no UI to toggle modes, and there is no `data-bs-theme` attribute set anywhere in the demo (verified — only mention is in unrelated `mp-ribbon`/`mp-quick-access-toolbar` elements where it is set for internal styling).
- `<bs-navbar [color]="colors.dark">` is hardcoded in `apps/ng-bootstrap-demo/src/app/app.component.html:1` — the navbar is dark regardless of body theme.
- The library does not export any theming API or service. Consumers asking "how do I switch dark mode at runtime?" have no documented answer.
- The library SCSS entrypoint (`libs/mintplayer-ng-bootstrap/_bootstrap.scss`) `@import`s a subset of Bootstrap — `root` is included (so `[data-bs-theme]` blocks are emitted), but several per-component SCSS files (`navbar`, `dropdown`, `card`, etc.) are commented out. Bootstrap's component-specific dark overrides defined in those files are therefore **not** part of the compiled output. Components that style themselves explicitly via the library's own SCSS need a one-off check that they look correct in both modes; any gaps get caught during the implementation visual pass.

### Expected Behavior
- A global icon button in the demo's right-side navbar cycles `auto → light → dark → auto`. Icon reflects current mode.
- `<html data-bs-theme="…">` updates synchronously with the toggle. `auto` resolves via `matchMedia('(prefers-color-scheme: dark)')` and live-tracks system-level changes.
- The user's last mode persists across reloads (localStorage key `bs-theme-mode`). No flash on reload: an inline pre-boot `<script>` in `index.html`'s `<head>` reads localStorage + matchMedia and writes `data-bs-theme` before the first paint.
- The demo navbar binds `[color]` to `effectiveMode()` so it looks cohesive in both modes.
- A new page at `/additional-samples/theming` documents: SCSS variable overrides, runtime CSS-variable overrides, the 3-state toggle recipe, the inline pre-boot script for SSR setups, and how to author a custom `data-bs-theme="sepia"` variant.

### Impact
- Library consumers gain a tested, recommended pattern for runtime theme switching — answering a question the library author posed in the issue itself ("what's the recommended approach?").
- The demo showcases the library's dark-mode coverage rather than ignoring it, which is a visible signal of quality for any visitor evaluating the library.
- A documented customization path lowers the support cost of "how do I brand this with our company colors?" questions.

---

## Technical Analysis

### Files to Add
- `libs/mintplayer-ng-bootstrap/theme/` *(new subentry)*
  - `ng-package.js` — generated stub matching the `navigation-lock` pattern: `module.exports = require('../ng-package.secondary.cjs').secondaryEntry();`
  - `src/index.ts` — public exports
  - `src/lib/service/bs-theme.service.ts` — `BsThemeService`
  - `src/lib/service/bs-theme-mode.ts` — type alias `BsThemeMode = 'auto' | 'light' | 'dark' | (string & {})` and storage-key constant
  - `src/lib/service/bs-theme.service.spec.ts` — Vitest unit spec
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/theming/theming.component.ts` *(new)*
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/theming/theming.component.html` *(new)*
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/theming/theming.component.scss` *(new — only if needed)*
- `apps/ng-bootstrap-demo/src/app/components/theme-toggle/theme-toggle.component.ts` *(new — the cycling icon button used in the navbar)*
- `apps/ng-bootstrap-demo-e2e/e2e/theme-toggle.spec.ts` *(new — Playwright e2e spec)*

### Files to Modify
- `apps/ng-bootstrap-demo/src/index.html` — add inline pre-boot `<script>` to `<head>` (before any CSS link), writing `data-bs-theme` synchronously from localStorage + matchMedia.
- `apps/ng-bootstrap-demo/src/app/app.component.html` — add `<demo-theme-toggle>` as a `<bs-navbar-item>` inside the right-side `<bs-navbar-nav class="me-0">`, alongside the existing GitHub link. Change `<bs-navbar [color]="colors.dark">` to `[color]="navbarColor()"` where `navbarColor` is a computed signal that returns `colors.dark` when `effectiveMode === 'dark'` and `colors.light` when `effectiveMode === 'light'`.
- `apps/ng-bootstrap-demo/src/app/app.component.ts` — inject `BsThemeService`, expose `navbarColor` computed, import `BsThemeToggleComponent` (or the demo's own `DemoThemeToggleComponent`).
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/additional-samples.routes.ts` — add `{ path: 'theming', loadComponent: () => import('./theming/theming.component').then(m => m.ThemingComponent) }`.
- `apps/ng-bootstrap-demo/src/app/app.component.html` (navbar-dropdown for `/additional-samples`) — add `<bs-navbar-item><a [routerLink]='["/additional-samples", "theming"]'>Theming</a></bs-navbar-item>`, alphabetically placed before/after the existing items per the dropdown's current ordering convention (which is mostly insertion order, not strict alphabetical — placement reviewed during implementation).
- `libs/mintplayer-ng-bootstrap/package.json` — register the new subentry exports if explicit (most subentries are discovered by ng-packagr's `ng-package.js` walker; verify pattern matches `navigation-lock`).
- `tsconfig.base.json` — add path mapping `@mintplayer/ng-bootstrap/theme` if other subentries are mapped there.

### Dependencies
- None new. Uses only `@angular/core` (signal, computed, inject, effect, Injectable), `@angular/common` (DOCUMENT injection token for SSR-safe document access), and the browser-native `matchMedia` / `localStorage`.

### Architecture Considerations
- **Why `data-bs-theme` is the right switch primitive (not per-var `setProperty`)** — Bootstrap's `bootstrap/scss/_root.scss` already emits a full `[data-bs-theme="dark"]` block via `@include color-mode(dark, true)` defining ~25 core vars; each per-component SCSS file ships its own `[data-bs-theme="dark"]` dark overrides. Flipping the attribute is one DOM write that swaps everything atomically. JS-driven `setProperty` for the switch would require enumerating every overridden var, would lock us into Bootstrap's current var names, and would force us to re-derive `prefers-color-scheme` semantics in JS for "auto". The per-var primitive remains documented for the *customization* recipe (brand color, runtime palette override).
- **Why JS-driven `auto` resolution** — Bootstrap's default `$color-mode-type: data` config emits *only* `[data-bs-theme="…"]` selectors, not the `@media (prefers-color-scheme: dark)` variant. Flipping `$color-mode-type` to `media-query` would emit the media-query variant but lose the ability to *override* the system preference (which we need for the 3-state toggle). Therefore the service reads `matchMedia('(prefers-color-scheme: dark)')` in JS, computes `effectiveMode`, and writes `data-bs-theme`. A `change` listener on the matchMedia object updates `effectiveMode` live when the user is in `auto`.
- **SSR safety** — The service uses `inject(DOCUMENT)` and guards `localStorage`/`matchMedia` access behind `isPlatformBrowser`. On the server, the service initializes to default `auto` but does not write the attribute (server-rendered HTML has no `data-bs-theme`). The inline pre-boot `<script>` in `index.html` runs only in the browser (it's evaluated after hydration begins, but before Angular paints) and writes the attribute before any CSS-driven paint occurs. This is consistent with the project's "destructive bootstrap" SSR model — Angular re-renders the tree after hydration, but the `<html>` attribute is set outside the Angular-managed DOM and survives.
- **Inline-script / service coordination** — Both read the same localStorage key (`bs-theme-mode`) and the same matchMedia query. The script is a doc-snippet duplicate of the resolution logic, not a shared import (it has to run before any module loads). To minimize drift, the storage key is defined as a constant in `bs-theme-mode.ts` and the inline script is hand-written to match. The risk is acknowledged in the docs and in a `CLAUDE.md`-bound note.
- **Navbar color binding** — The current `colors.dark` value comes from `@mintplayer/ng-bootstrap`'s `Color` enum. The light counterpart is `colors.light`. The computed `navbarColor()` returns one or the other based on `effectiveMode()`. If the light-mode navbar contrast turns out to be poor (insufficient text-vs-bg contrast given the library's partial SCSS imports), fall back to leaving the navbar dark always and documenting the choice.
- **Custom variants (`'sepia'`, etc.)** — The `BsThemeMode` type uses the `'…' | (string & {})` pattern so known literals get autocomplete while arbitrary strings still compile. Consumers ship a `[data-bs-theme="sepia"] { … }` SCSS block themselves; the service just writes the string. The doc page covers this with a worked example.

---

## Implementation Plan

### Phase 1: Library — `BsThemeService` + subentry skeleton
1. Scaffold `libs/mintplayer-ng-bootstrap/theme/` matching the `navigation-lock` subentry layout (`ng-package.js`, `src/index.ts`, `src/lib/...`).
2. Add `bs-theme-mode.ts` exporting:
   - `export type BsThemeMode = 'auto' | 'light' | 'dark' | (string & {});`
   - `export type BsEffectiveThemeMode = 'light' | 'dark' | (string & {});`
   - `export const BS_THEME_STORAGE_KEY = 'bs-theme-mode';`
3. Implement `BsThemeService` (`@Injectable({ providedIn: 'root' })`):
   - Constructor: `inject(DOCUMENT)`, `inject(PLATFORM_ID)`. Read initial mode from localStorage (browser only) defaulting to `'auto'`.
   - `readonly mode: Signal<BsThemeMode>` — private writable backing signal, exposed as `Signal`.
   - `readonly effectiveMode: Signal<BsEffectiveThemeMode>` — `computed()` that resolves `'auto'` via the matchMedia signal and returns `mode` otherwise.
   - Internal `prefersDark: Signal<boolean>` populated from `matchMedia('(prefers-color-scheme: dark)')` (browser only), updated via a `change` listener.
   - `setMode(m: BsThemeMode): void` — writes the writable, persists to localStorage (browser only).
   - `effect()` that writes `documentElement.setAttribute('data-bs-theme', effectiveMode())` whenever the computed changes (browser only).
4. Public exports in `src/index.ts`:
   - `BsThemeService`
   - `BsThemeMode`, `BsEffectiveThemeMode`
   - `BS_THEME_STORAGE_KEY`

### Phase 2: Library — unit tests
1. `bs-theme.service.spec.ts` (Vitest + happy-dom or jsdom — matching the project's existing service-test pattern):
   - Initial mode is `'auto'` when localStorage is empty.
   - Initial mode reads from localStorage when present.
   - `setMode('dark')` persists to localStorage and updates `mode`.
   - `effectiveMode` resolves `'auto'` to `'light'` when `prefers-color-scheme: dark` is false.
   - `effectiveMode` resolves `'auto'` to `'dark'` when `prefers-color-scheme: dark` is true.
   - `effectiveMode` returns the literal mode for explicit `'light'` / `'dark'` / `'sepia'`.
   - matchMedia `change` event updates `effectiveMode` when in auto mode.
   - matchMedia `change` event does NOT change `effectiveMode` when in explicit mode.
   - DOM `data-bs-theme` attribute reflects `effectiveMode` after any state change.
   - On server platform (PLATFORM_ID = 'server'), no localStorage or matchMedia access occurs.

### Phase 3: Demo — pre-boot script + theme toggle UI
1. Inject the inline `<script>` into `apps/ng-bootstrap-demo/src/index.html`'s `<head>`:
   ```html
   <script>
     (function () {
       try {
         var m = localStorage.getItem('bs-theme-mode') || 'auto';
         var r = (m === 'auto')
           ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
           : m;
         document.documentElement.setAttribute('data-bs-theme', r);
       } catch (_) {}
     })();
   </script>
   ```
   Placed before any `<link rel="stylesheet">` to prevent FOUC.
2. Create `DemoThemeToggleComponent` (`apps/ng-bootstrap-demo/src/app/components/theme-toggle/`):
   - Standalone component, `selector: 'demo-theme-toggle'`.
   - Injects `BsThemeService`.
   - Renders an icon-only `<button>` (uses an existing icon set already used in the demo — verify which one during implementation).
   - Icon switches based on `mode()` (sun for light, moon for dark, half-half or "computer" glyph for auto).
   - Click handler: `setMode(next(mode()))` where `next` cycles `auto → light → dark → auto`.
   - `aria-label` updates with the current mode for screen readers (consistent with the codebase's ARIA pass).
3. Wire into `app.component.html`:
   - Replace `[color]="colors.dark"` on the root `<bs-navbar>` with `[color]="navbarColor()"`.
   - Add `<bs-navbar-item><demo-theme-toggle /></bs-navbar-item>` inside `<bs-navbar-nav class="me-0">`, **before** the GitHub link.
4. Update `app.component.ts`:
   - Inject `BsThemeService`.
   - Add `navbarColor = computed(() => themeSvc.effectiveMode() === 'dark' ? Color.dark : Color.light)`.
   - Add `DemoThemeToggleComponent` to `imports`.
5. Add a route entry in `additional-samples.routes.ts`:
   ```ts
   { path: 'theming', loadComponent: () => import('./theming/theming.component').then(m => m.ThemingComponent) },
   ```
6. Add a `<bs-navbar-item>` link to `/additional-samples/theming` inside the Additional samples navbar dropdown.

### Phase 4: Demo — doc page content
The `theming.component.html` page covers, in order:

1. **Introduction** — Bootstrap 5.3+'s native color-mode system, why `data-bs-theme` is the runtime switch primitive.
2. **Build-time customization (SCSS)** — Worked example of overriding `$primary`, `$body-bg`, etc. before `@import "bootstrap/..."`. Notes the library's partial SCSS imports and which Bootstrap variables affect what.
3. **Runtime customization (CSS variables)** — Worked example using `document.documentElement.style.setProperty('--bs-primary', '#ff5722')`. Notes that the per-component vars (`--bs-navbar-active-color`, `--bs-card-bg`, etc.) can be tweaked the same way. Links to Bootstrap's CSS variables documentation for the canonical list.
4. **Runtime mode switching (auto / light / dark)** — Walks through `BsThemeService` usage. Live demo: a small inline three-button group on the page that calls `setMode()` directly. Shows the `effectiveMode` signal.
5. **Per-component variable reference table** — Markdown table of the most-commonly-tweaked `--bs-*` variables, grouped by component (navbar, card, dropdown, button, modal). Notes that the table is a curated subset; the canonical source is Bootstrap's docs.
6. **Custom variants beyond light/dark** — Worked example: author a `[data-bs-theme="sepia"] { --bs-body-bg: ...; --bs-body-color: ...; }` SCSS block in your global styles, then `themeSvc.setMode('sepia')`. The type accepts the string, the service writes the attribute, your CSS picks it up.
7. **SSR & no-flash integration** — The inline pre-boot `<script>` snippet (verbatim, with explanation of why it must be inline and in `<head>` before any CSS link). Notes that the storage key must match `BS_THEME_STORAGE_KEY`.

Page should use the demo's existing code-snippet component (`bs-code-snippet` per `libs/mintplayer-ng-bootstrap-snippets`) for all SCSS / TS / HTML examples.

### Phase 5: E2E
1. `apps/ng-bootstrap-demo-e2e/e2e/theme-toggle.spec.ts`:
   - **Test 1 — pre-boot script applies persisted mode before paint**: navigate to root, evaluate `localStorage.setItem('bs-theme-mode', 'dark')` + reload, assert `document.documentElement.getAttribute('data-bs-theme') === 'dark'` immediately after `domcontentloaded` (before any Angular bootstrap completes).
   - **Test 2 — toggle cycles through modes**: navigate, click the toggle, assert attribute swaps, click again, click again, assert it returns to auto.
   - **Test 3 — persistence across reload**: set mode to `light` via toggle click, reload, assert mode is still `light` and `data-bs-theme="light"` is present.
   - **Test 4 — body background actually swaps**: capture `getComputedStyle(document.body).backgroundColor` in light mode, switch to dark, capture again, assert the two values differ.
   Per the project's e2e convention, use `waitForLoadState('networkidle')` after each `goto`.

### Phase 6: Polish
1. CHANGELOG entry under `[Unreleased] / Added`: "Theme service + dark-mode toggle in demo (`@mintplayer/ng-bootstrap/theme`)".
2. PR description includes before/after screenshots (light and dark navbar in the demo).
3. Visual spot-check of every existing demo page in both modes — log any components that look broken in light or dark, decide per-component whether to fix-in-PR or file a follow-up.

---

## Test Scenarios

### Scenario 1: First visit, system prefers dark
- **Given**: no `bs-theme-mode` in localStorage, OS `prefers-color-scheme: dark`.
- **When**: user loads the demo.
- **Then**: first paint shows dark theme (`<html data-bs-theme="dark">`), no flash. Toggle icon shows the "auto" glyph.

### Scenario 2: Explicit override persists
- **Given**: user is in auto mode (no storage key).
- **When**: user clicks the toggle until light is selected, then reloads.
- **Then**: localStorage contains `bs-theme-mode=light`. After reload, theme is light and toggle shows the "light" glyph. System dark-mode preference is ignored.

### Scenario 3: Live OS-level dark/light toggle while in auto
- **Given**: user is in auto mode, OS in light.
- **When**: user flips OS to dark mode (matchMedia `change` event fires).
- **Then**: demo flips to dark without page reload. `effectiveMode()` updates synchronously, `data-bs-theme` swaps, dependent computed (navbar color) updates.

### Scenario 4: Custom variant
- **Given**: a consumer has authored `[data-bs-theme="sepia"] { ... }` in their global SCSS.
- **When**: they call `themeSvc.setMode('sepia')`.
- **Then**: TypeScript accepts the string (no widening cast needed), `data-bs-theme="sepia"` is set, their custom variant renders, `effectiveMode()` returns `'sepia'`.

### Scenario 5: Demo navbar in light mode
- **Given**: demo loaded, mode set to `light`.
- **When**: page renders.
- **Then**: navbar uses `Color.light`, has sufficient contrast for the brand text and menu items. (Verified visually during the polish pass.)

### Scenario 6: SSR / no-flash
- **Given**: SSR-rendered HTML served to a browser with `bs-theme-mode=dark` in localStorage.
- **When**: page loads (DOM parsing reaches the inline script in `<head>`).
- **Then**: `data-bs-theme="dark"` is written before any `<link rel="stylesheet">` is evaluated. First paint is dark. Angular hydrates, `BsThemeService` reads the same storage key, no mismatch, no flash.

---

## Acceptance Criteria

- [ ] `@mintplayer/ng-bootstrap/theme` subentry builds and exports `BsThemeService`, `BsThemeMode`, `BsEffectiveThemeMode`, `BS_THEME_STORAGE_KEY`.
- [ ] `BsThemeService.setMode('dark')` writes `data-bs-theme="dark"` on `<html>` synchronously and persists `bs-theme-mode=dark` in localStorage.
- [ ] `BsThemeService.effectiveMode()` resolves `'auto'` via `matchMedia('(prefers-color-scheme: dark)')` and updates live on system-preference changes.
- [ ] Demo navbar shows a cycling icon button next to the GitHub link that cycles `auto → light → dark → auto`. Icon and `aria-label` reflect current mode.
- [ ] Demo navbar's `[color]` binds to `effectiveMode()` (light navbar in light mode, dark in dark mode).
- [ ] Inline `<script>` in `apps/ng-bootstrap-demo/src/index.html` `<head>` applies the persisted (or system-resolved) `data-bs-theme` before any CSS link is evaluated. No flash on reload.
- [ ] `/additional-samples/theming` page exists and covers: build-time SCSS, runtime CSS-var, mode switching, per-component var reference, custom variants, SSR integration.
- [ ] Vitest unit spec covers `BsThemeService` (10+ specs covering all branches incl. SSR platform).
- [ ] Playwright e2e spec `theme-toggle.spec.ts` covers pre-boot script, toggle cycle, persistence, computed-bg swap.
- [ ] CHANGELOG entry added under `[Unreleased] / Added`.
- [ ] No regressions on existing demo pages in light or dark mode (manual visual pass).

---

## Build & Test Commands

```bash
# Build the new subentry + everything that depends on it
nx build mintplayer-ng-bootstrap

# Build the demo app
nx build ng-bootstrap-demo

# Run all unit tests
npm run test
# Or, target just the new theme subentry's specs (adjust target name to project name in workspace)
nx test mintplayer-ng-bootstrap

# Serve the demo locally
nx serve ng-bootstrap-demo

# Run Playwright e2e (against the served demo)
nx e2e ng-bootstrap-demo-e2e
# Or filter to the new spec
nx e2e ng-bootstrap-demo-e2e -- --grep "theme"
```

---

## Related Files

- `apps/ng-bootstrap-demo/src/app/app.component.html` — current navbar markup
- `apps/ng-bootstrap-demo/src/app/app.component.ts` — current root component
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/additional-samples.routes.ts` — route registry
- `apps/ng-bootstrap-demo/src/index.html` — pre-boot script target
- `libs/mintplayer-ng-bootstrap/_bootstrap.scss` — library Bootstrap import (partial)
- `libs/mintplayer-ng-bootstrap/navigation-lock/` — subentry layout reference
- `node_modules/bootstrap/scss/_root.scss` — confirmed source of `[data-bs-theme]` blocks
- CLAUDE.md sections referenced by the PRD: ARIA conventions for icon buttons, signals-over-template patterns, demo SSR notes.
