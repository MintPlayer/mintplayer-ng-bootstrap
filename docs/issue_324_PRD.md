# Product Requirements Document: Dark mode + theming guidance

**Issue**: #324
**Title**: dark-mode / style customization instructions
**Status**: Implementation complete — pending PR
**Created**: 2026-05-13
**Last Updated**: 2026-05-14

---

## Overview

Ship a recommended, library-supported path for runtime color-mode switching (`auto` / `light` / `dark` / custom variants), wire it into the demo as a global toggle button, and add a documentation page that teaches consumers how to customize Bootstrap colors at both build time (SCSS) and run time (CSS variables + `data-bs-theme`).

The runtime switch mechanism is Bootstrap-native: flip `data-bs-theme` on `<html>`. The library ships `BsThemeService` to own that state, persist it, and resolve `auto` via `prefers-color-scheme`. The demo wires its own icon button — the library deliberately does not impose a UI shape.

---

## Goals & Objectives

### Primary Goals
- Provide an answer to the issue's open question — "what's the recommended approach to switch between Bootstrap light/dark mode at runtime?" — that compiles, ships, and is reproducible by any consumer.
- Demonstrate the answer in the demo so visitors can see and try it.
- Document customization (build-time SCSS, runtime CSS-var, custom `data-bs-theme="…"` variants) so consumers don't have to reverse-engineer the recipe.

### Success Metrics
- A new public API at `@mintplayer/ng-bootstrap/theming` with one service (`BsThemeService`), one writable mode method (`setMode`), and two readonly signals (`mode`, `effectiveMode`).
- A working three-state toggle in the demo navbar, persisting across reloads, with no light/dark flash on initial paint.
- A doc page at `/additional-samples/theming` covering all six topics listed under FR-3.
- Unit + e2e tests demonstrating service behaviour and end-to-end toggle integration.

---

## Functional Requirements

### Must Have (P0)

- [x] **FR-1**: New library subentry `@mintplayer/ng-bootstrap/theming` exporting `BsThemeService`, the `BsThemeMode` type (`'auto' | 'light' | 'dark' | (string & {})`), the resolved `BsEffectiveThemeMode` type, and the `BS_THEME_STORAGE_KEY` constant. Subentry follows the existing `navigation-lock` packaging pattern.
- [x] **FR-2**: `BsThemeService` (signal-first, methods-only API):
  - `readonly mode: Signal<BsThemeMode>` — readonly view; initialised from `localStorage[BS_THEME_STORAGE_KEY]` (default `'auto'`).
  - `readonly effectiveMode: Signal<BsEffectiveThemeMode>` — computed; resolves `'auto'` via `matchMedia('(prefers-color-scheme: dark)')`; returns the literal otherwise.
  - `setMode(m: BsThemeMode): void` — writes the writable, persists to localStorage, triggers the attribute-write effect.
  - Internal `effect()` writes `document.documentElement.setAttribute('data-bs-theme', effectiveMode())` whenever the computed changes.
  - `prefers-color-scheme` `change` listener installed once, drives a private `prefersDark` signal — `effectiveMode` recomputes live when in `auto` mode.
- [x] **FR-3**: New demo page at `/additional-samples/theming` covering, in order: (a) intro to Bootstrap 5.3 color modes, (b) build-time SCSS variable overrides with a worked example, (c) runtime CSS-variable overrides with a worked example, (d) the 3-state toggle recipe via `BsThemeService`, (e) per-component `--bs-*` variable reference table for the most commonly tweaked components, (f) authoring a custom `[data-bs-theme="sepia"]` variant, and (g) SSR / no-flash inline-script integration.
- [x] **FR-4**: Demo right-side navbar shows a single icon button that cycles `auto → light → dark → auto`. Icon reflects current mode; `aria-label` updates accordingly. Placed before the existing GitHub link in `<bs-navbar-nav class="me-0">`.
- [x] **FR-5**: Demo `<bs-navbar>` adapts to the page theme. Implemented via `[color]="'body-tertiary'"` (a Bootstrap utility-suffix string supported after the navbar-modernize work — see `docs/issue_324_navbar_modernize_PRD.md`). The navbar emits `bg-body-tertiary` and inherits `<html data-bs-theme>`, so `--bs-tertiary-bg` and navbar text colors swap with the page theme automatically — no JS-driven `effectiveMode()` binding needed.
- [x] **FR-6**: Inline pre-boot `<script>` block added to `apps/ng-bootstrap-demo/src/index.html`'s `<head>`, placed before any `<link rel="stylesheet">`. Reads localStorage + matchMedia, writes `data-bs-theme` synchronously. Prevents light-mode flash for dark-mode users on reload.
- [x] **FR-7**: Vitest unit spec `bs-theme.service.spec.ts` covers: initial-mode reads from storage and falls back to `'auto'`; `setMode` persists and updates the signal; `effectiveMode` resolves `'auto'` correctly via both matchMedia states; explicit modes pass through; matchMedia `change` event only triggers when in `auto`; DOM attribute reflects `effectiveMode` after any change; SSR platform skips localStorage/matchMedia/DOM access.
- [x] **FR-8**: Playwright e2e spec `theme-toggle.spec.ts` covers: pre-boot script applies persisted mode before paint; toggle cycles through `auto → light → dark → auto`; persistence across reload; body background `getComputedStyle` differs between light and dark.
- [x] **FR-9**: New navbar dropdown link "Theming" under "Additional samples" pointing to `/additional-samples/theming`.

### Should Have (P1)

- [x] **FR-10**: CHANGELOG entry under `[Unreleased] / Added`: "Theme service + dark-mode toggle in demo (`@mintplayer/ng-bootstrap/theming`)".
- [x] **FR-11**: Visual regression spot-check of every existing demo page in both modes (manual). Any components that are visibly broken in either mode get a one-line note in the PR description; severe breakage gets a follow-up issue (out of scope for this PR per the BC-is-not-default feedback note — design for the cleanest end state, not a half-finished one).

### Out of Scope
- Per-component dark-mode CSS coverage gaps in the library SCSS subset (`_bootstrap.scss` imports only a partial set of Bootstrap component SCSS files; components with their own SCSS may have light/dark gaps that surface during the visual pass). Handled per-component as separate follow-up issues if any concretely break.
- Bundling the pre-boot script as a library asset (consumers' SSR setups vary too much — Angular index.html vs Next.js `_document.tsx` vs Razor partial — a documented snippet is more portable).
- A `<bs-theme-toggle>` component in the library. The demo's cycling icon button is wired locally; consumers compose their own UI.
- Theming for non-Bootstrap components in the library (custom WC styling, like `mp-scheduler` or `mp-dock`). They have their own internal `data-bs-theme` handling already (verified in ribbon WC); separate concern.

---

## Timeline & Milestones

### Milestone 1: Library service
- [x] Scaffold `libs/mintplayer-ng-bootstrap/theming/` subentry.
- [x] Implement `BsThemeService` + types + constant.
- [x] Unit spec covering all branches (FR-7).
- [x] `nx build mintplayer-ng-bootstrap` passes.

### Milestone 2: Demo wiring
- [x] Inline pre-boot script in `index.html` (FR-6).
- [x] `ThemeToggleComponent` (icon button) (FR-4).
- [x] Navbar `[color]` binding to `effectiveMode()` (FR-5).
- [x] Smoke-test in browser: toggle cycles, attribute swaps, navbar adapts, no flash on reload.

### Milestone 3: Doc page
- [x] Route + navbar dropdown entry (FR-9).
- [x] All six content sections per FR-3.
- [x] Live three-button mode switcher embedded in the page or an inline 3-button group calling `setMode` directly.

### Milestone 4: E2e + polish
- [x] Playwright spec (FR-8).
- [ ] Visual pass on all existing demo pages in both modes (FR-11).
- [x] CHANGELOG entry (FR-10).
- [ ] PR description with light + dark navbar screenshots.

---

## Open Questions

> None. All design decisions resolved during grilling on 2026-05-13. No escalations to the issue requester needed (issue author is the developer).

---

## Technical Notes (Issue-Specific)

- **Why `data-bs-theme` is the switch and `setProperty` is reserved for customization**: `bootstrap/scss/_root.scss` already emits `[data-bs-theme="dark"]` via `@include color-mode(dark, true)`. Flipping the attribute swaps the full palette atomically and inherits future Bootstrap updates for free. Re-implementing the swap in JS via per-variable `setProperty` would require enumerating every overridden var, would rot on Bootstrap upgrades, and would force us to re-derive `prefers-color-scheme` semantics in JS for "auto". `setProperty` is the right tool for *runtime customization* (brand-color picker, end-user theming) and is documented as such — not as the mode-switch primitive.
- **Why `auto` is JS-resolved, not CSS-resolved**: Bootstrap's default `$color-mode-type: data` config emits selectors only, not `@media (prefers-color-scheme: dark)` blocks. Flipping `$color-mode-type` to `media-query` would emit the media query but lose the ability to override system preference — incompatible with a three-state toggle. JS resolution gives us one observable state (`effectiveMode`) and full control.
- **Why an inline pre-boot script in `<head>`, not a deferred module**: SSR-rendered HTML has no `data-bs-theme` attribute; without intervention, dark-mode users see a white flash before the Angular service runs. The inline script in `<head>` (before any `<link rel="stylesheet">`) reads localStorage + matchMedia and writes the attribute *before* the browser evaluates Bootstrap's CSS. No FOUC. The technique is what Bootstrap's own docs, GitHub, and MDN all use.
- **Drift risk between inline script and service**: both read the same localStorage key (`BS_THEME_STORAGE_KEY`) and the same matchMedia query, but the inline script is hand-written JS (can't import the constant — it runs before any module loads). Mitigation: the constant lives in `bs-theme-mode.ts` with a comment pointing to the script; the doc page shows the script with the literal key inlined.
- **Custom variant type**: `BsThemeMode = 'auto' | 'light' | 'dark' | (string & {})` — the `(string & {})` trick preserves autocomplete for known values while accepting arbitrary strings without an `as` cast. `effectiveMode` widens to `BsEffectiveThemeMode = 'light' | 'dark' | (string & {})` because `'auto'` is always resolved.
- **Navbar adaptation resolved via library refactor**: initial implementation tried `[color]="navbarColor()"` with a `Color.dark`/`Color.light` swap, which surfaced a latent bug — `Color.light` emitted `navbar-light` but no `bg-light`, rendering an invisible navbar that merged into the white body. Root-caused to the navbar component still using Bootstrap's deprecated `.navbar-light`/`.navbar-dark` class pattern. Resolved by modernizing `BsNavbarComponent` to emit `data-bs-theme` on the rendered `<nav>` per Bootstrap 5.3's recommended pattern, widening `[color]` to accept utility-suffix strings, and updating the demo to `[color]="'body-tertiary'"` — pure-CSS cascade adaptation, no JS binding required. See `docs/issue_324_navbar_modernize_PRD.md` for the navbar-side scope.

---

## Related
- Issue #324
- See `CLAUDE.md` for: signal-first conventions, computed-over-template feedback, ARIA conventions for icon buttons (icon-only toggles must carry an updating `aria-label`), demo SSR notes.
- Related memory notes (auto-loaded): `feedback_computed_signals_in_template.md`, `project_e2e_destructive_bootstrap.md`, `project_wc_aria_decisions.md`.
- Bootstrap upstream reference: `node_modules/bootstrap/scss/_root.scss` (verified to ship `[data-bs-theme="light"]` and `[data-bs-theme="dark"]` blocks).
