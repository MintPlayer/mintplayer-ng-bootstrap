# Development Plan: Navbar + menu-dropdown → cross-framework Lit WCs

**Type**: Feature / cross-framework migration
**PRD**: `docs/prd/navbar-dropdown-menu-wc.md`
**Salvage base**: branch `feat/dropdown-menu-wc` (branch B), rebased onto `master`
**Branch/PR**: one branch, one squash PR — created only on explicit go-ahead (never before).

## Executive Summary

The Angular-only navbar imports `bootstrap/scss/{dropdown,nav,navbar}` wholesale under `::ng-deep` and runs two disjoint dropdown systems (`bs-navbar-dropdown`/`bs-navbar-item` for the navbar; `bs-dropdown-menu`/`bs-dropdown-item` for the standalone `bsDropdown`). Nested-submenu overlay-pull is `@angular/cdk` `DomPortal` — Angular-only; there is no React/Vue navbar.

This plan migrates the navbar and its **menu-dropdown** to framework-agnostic Lit web components with hand-written ng/react/vue wrappers, **preserving** the no-JS `:focus-within` interactivity, the JS overlay-pull of nested dropdowns, and the first-level height cap, and **unifying** the two dropdown systems so the same `<bs-dropdown-menu>` renders correctly standalone *and* inside `<bs-navbar>`.

Branch B already built ~all of it (10 WCs + 3× wrappers + SSR injectors/generators). This plan **salvages and rebases** it, then applies three user-decided deltas: **(D1)** items/dividers/headers become attribute directives on plain light-DOM elements instead of WCs; **(D2)** their styling moves into `mp-dropdown-menu`'s shadow as `::slotted(...)` rules; **(D3)** the clean `bs-navbar` / `bs-dropdown-menu` / `bs-dropdown-item` selectors are reclaimed (legacy navbar dropdown system retired).

## Problem Statement

### Current behavior (master)
- `bs-navbar` is an Angular `@Component`; `navbar.component.scss` `@import`s `bootstrap/scss/dropdown` + `nav` + `navbar` under `::ng-deep` (the only way the projected `.dropdown-menu`/`.nav-link` get styled under view-encapsulation).
- Navbar dropdowns use `bs-navbar-dropdown` + `bs-navbar-item`; nested submenus are pulled into a CDK `DomPortal` overlay (`navbar-dropdown.component.ts`). No-JS reveal via `li.nav-item:focus-within > bs-navbar-dropdown > ul` in `navbar.component.scss`. Height cap is dynamic `calc(100vh - {navbarHeight}px - padding)` (JS) + `max-height: calc(100vh - 100% - 1rem)` (no-JS).
- `bs-dropdown-menu`/`bs-dropdown-item` are a *separate* system (standalone `bsDropdown`, typeahead, tree-select). They are **not** usable inside `<bs-navbar>`.
- No React/Vue navbar.

### Expected behavior
- `mp-dropdown-menu` (WC) is the presentational panel carrying `bootstrap/scss/dropdown` in its shadow; reusable standalone and in the navbar. `mp-navbar` (WC) carries `bootstrap/scss/navbar` + `nav`.
- Items/dividers/headers are plain light-DOM elements + `[bsDropdownItem]`/`[bsDropdownDivider]`/`[bsDropdownHeader]` directives (React/Vue presentational equivalents). No item WC.
- The same `<bs-dropdown-menu>` + `[bsDropdownItem]` works standalone and inside `<bs-navbar>`.
- No-JS `:focus-within` reveal, JS `OverlayController` overlay-pull (no CDK), and the first-level height cap are all preserved, in all three frameworks.

### Impact
- Unblocks a cross-framework navbar (React + Vue parity).
- Collapses two dropdown systems into one reusable panel — a net reduction in surface area.
- Removes `@angular/cdk` `DomPortal` from the navbar dropdown path.

## Technical Analysis

### Salvage inventory (branch B → keep / change / drop)

**Keep (rebase as-is):**
- `libs/mintplayer-web-components/navbar/src/components/` — `mp-navbar.ts`, `mp-navbar-item.ts`, `mp-navbar-brand.ts`, `mp-navbar-dropdown.ts`, `mp-navbar-element.ts`.
- `libs/mintplayer-web-components/dropdown-menu/src/components/mp-dropdown-menu.ts` (+ base `mp-dropdown-element.ts`).
- SSR: `.../navbar/ssr/*`, `.../dropdown-menu/ssr/*`, `tools/lit-ssr-utils/gen-navbar-chrome.mjs`, `gen-dropdown-chrome.mjs`; Nx targets `codegen-navbar-chrome` / `codegen-dropdown-chrome`.
- `mp-navbar` collapse-reveal scoping fix (commit `922c8fd7`).
- `OverlayController` wiring in `mp-navbar-dropdown` (no change needed — controller is byte-identical on master).

**Change:**
- `mp-dropdown-menu.styles.scss` — add `::slotted(.dropdown-item / .dropdown-divider / .dropdown-header)` rules (D2).
- Angular wrapper selectors — `-wc-` → clean `bs-` (D3).

**Drop:**
- `mp-dropdown-item.ts`, `mp-dropdown-divider.ts`, `mp-dropdown-header.ts` WCs (D1) + their ng/react/vue wrappers (`BsDropdownItemWc`, `BsDropdownItem.tsx`, `BsDropdownItem.vue`, etc.).

### Files to create / modify

**Web components** (`libs/mintplayer-web-components/`)
- *modify* `dropdown-menu/src/styles/dropdown-menu.styles.scss` — `::slotted` item/divider/header rules re-bound to `--bs-dropdown-*` live tokens → re-run `codegen-wc`.
- *delete* `dropdown-menu/src/components/mp-dropdown-{item,divider,header}.ts` + their `styles/*.scss` + barrels.
- *modify* `dropdown-menu/src/index.ts`, `dropdown-menu/ssr/*` (drop item/divider/header chrome constants; regenerate).
- *keep/rebase* `navbar/**`.

**Angular wrappers** (`libs/mintplayer-ng-bootstrap/`)
- *create* `dropdown-menu/src/directives/dropdown-item.directive.ts` (`[bsDropdownItem]`, `host: { '[class.dropdown-item]': 'true' }` — template: `BsGridRowDirective`), plus `[bsDropdownDivider]` (`.dropdown-divider` on `<hr>`) and `[bsDropdownHeader]` (`.dropdown-header` on `<h6>`).
- *create* the **companion light-DOM link-reset stylesheet** (`.dropdown-item > a, .dropdown-item > button { display:block; width:100%; color:inherit; text-decoration:none }`) — shipped with the wrapper (mirrored in the React/Vue packages).
- *create/rename* `bs-dropdown-menu` wrapper around `mp-dropdown-menu`; `bs-navbar` / `bs-navbar-item` / `bs-navbar-brand` / `bs-navbar-dropdown` wrappers (off `-wc-`).
- *delete* branch B's `bs-dropdown-wc-item/divider/header` wrappers.
- *resolve* legacy `bs-dropdown-menu` collision (naming decision — see Open items).

**React/Vue wrappers** — `BsNavbar*`, `BsDropdownMenu`; replace `BsDropdownItem` WC-wrapper with a **presentational** `<BsDropdownItem>` rendering `<li className="dropdown-item">` (+ `BsDropdownDivider`/`BsDropdownHeader`).

**Packaging (rebase reconciliation)** — `tsconfig.base.json` (re-add navbar/dropdown-menu + `/ssr` aliases under master's post-#383 scheme); `libs/mintplayer-web-components/package.json` + `libs/mintplayer-ng-bootstrap/package.json` (new subpath exports; satisfy the `@mintplayer/web-components`+`lit` peerDependencies rule); `libs/mintplayer-web-components/project.json` (chrome-gen targets).

**Demos + servers** — `apps/{ng,react,vue}-bootstrap-demo` navbar pages (with `<bs-dropdown-menu>` nested in `<bs-navbar>`); `server.ts` / `entry-server.ts` compose `injectMpNavbarDsd(injectMpDropdownDsd(...))`.

### Architecture considerations
- **Reuse over reinvention:** `mp-dropdown-menu` is the single panel for both contexts; `mp-navbar-dropdown` owns trigger+behavior; `OverlayController` (existing) does positioning — no portal, no CDK.
- **`::slotted` limitation** is the crux (PRD "The item-styling problem"): it styles the slotted element only, never its descendants. Author convention `bsDropdownItem` on the directly-slotted interactive element; a wrapper-shipped light-DOM `.dropdown-item > a` stylesheet only if the spike shows it's needed.
- **Theme tokens cross the boundary, class rules don't:** re-bind `--bs-dropdown-*`/navbar vars to `--bs-body-*`/`--bs-tertiary-*` inside each shadow; the container `.dropdown-menu`/`.navbar` rules compile in via `@import bootstrap/scss/...`.

## Implementation Plan

### Phase 0 — spike (GATE) ✅ DONE (2026-07-22)
1. ✅ Built `docs/prd/_spike-dropdown-slotted.html` + compiled the exact minimal ng-bootstrap sheet (`_spike-min-bootstrap.css`, 0 `.dropdown-*` rules). Under minimal-global-CSS-only, `<li class="dropdown-item"><a></a></li>` styled by shadow `::slotted(.dropdown-item)` + the companion light-DOM sheet is **pixel-identical** to a real Bootstrap dropdown (isolated iframe), light + dark, across header/normal/active/disabled/divider. Verified via Playwright screenshot + computed styles.
2. Finding: the companion sheet carries `.dropdown-item > a` reset **plus** `.dropdown-header` + `.dropdown-divider` (Bootstrap puts those on inner elements ::slotted can't reach). The item *box* + states stay in the shadow.
3. ⬜ Deferred to Phase 1/5 (needs branch B present): re-confirm no-JS `:focus-within` reveal + `OverlayController` submenu + height cap with items as plain light-DOM `<li>` (branch B proved it with item WCs; low risk).
4. **Exit gate met:** the chosen design renders correctly; it was a parity check, not a design fork. Throwaway spike files to delete before the PR.

### Phase 1 — rebase branch B onto master ✅ DONE (2026-07-22)
1. ✅ Cherry-picked branch B's 8 commits (`b8a5ec3a`..`2ecaebb4`) onto `feat/navbar-dropdown-menu-wc`.
2. ✅ Only conflicts were in `tsconfig.base.json` (two commits) — branch B's explicit `@mintplayer/ng-bootstrap/{dropdown-menu-wc,navbar-wc}` aliases, made redundant by master's post-#383 wildcard `@mintplayer/ng-bootstrap/*` → `./libs/mintplayer-ng-bootstrap/*` (kept the wildcard, dropped the explicit aliases). The `@mintplayer/web-components/*` wildcard likewise covers the new WC subpaths. No `package.json` conflicts arose.
3. ✅ Green baseline (item WCs still present, `-wc-` selectors): `nx build mintplayer-web-components` (dropdown-menu 18 kB + navbar 25 kB emitted), `nx build mintplayer-ng-bootstrap` (all secondary entries), React + Vue builds, and **758/758 WC unit tests** all pass.
   - ⚠️ Watch-item for Phase 3/5: verify the new libs' `package.json` declare `@mintplayer/web-components` + `lit` as peerDeps (master's rule) before publish; the local build doesn't exercise that.

### Phase 2 — items → directives + `::slotted` (D1 + D2)
1. Add `::slotted(.dropdown-item / .dropdown-divider / .dropdown-header)` box rules (re-bound to `--bs-dropdown-*`) to `dropdown-menu.styles.scss`; `nx run mintplayer-web-components:codegen-wc`; regenerate dropdown DSD chrome.
2. Delete `mp-dropdown-{item,divider,header}` WCs + wrappers + chrome constants.
3. Add Angular `[bsDropdownItem]` / `[bsDropdownDivider]` / `[bsDropdownHeader]` directives (`host: { '[class.dropdown-item]': 'true' }`, etc.).
4. Ship the **companion light-DOM sheet** with each wrapper package (Angular global style, React/Vue imported CSS) — validated in Phase 0:
   - `.dropdown-item > a, .dropdown-item > button { display:block; width:100%; color:inherit; text-decoration:none; background:none; border:0 }`
   - `.dropdown-header { display:block; padding:.5rem 1rem; font-size:.875rem; color:var(--bs-secondary-color); white-space:nowrap }`
   - `.dropdown-divider { height:0; margin:.5rem 0; border-top:1px solid var(--bs-border-color-translucent) }`
5. Add React/Vue presentational `<BsDropdownItem>` / `<BsDropdownDivider>` / `<BsDropdownHeader>` (render `<li className="dropdown-item">` etc.).
6. Verify item styling parity (Phase 0 criteria) through the WCs + wrappers, standalone and in the navbar.

### Phase 3 — reclaim `bs-` names + unify (D3)
1. Rename new Angular wrappers off `-wc-` to `bs-navbar` / `bs-dropdown-menu`.
2. Resolve the legacy `bs-dropdown-menu` collision (rename legacy listbox component to internal, or mode-split — per the naming decision).
3. Retire the legacy navbar dropdown system (`bs-navbar-dropdown`/`bs-navbar-item` components).
4. Wire the Angular demo: `<bs-dropdown-menu>` with `[bsDropdownItem]` children nested inside `<bs-navbar>`.

### Phase 4 — React + Vue parity + SSR
1. Bring `BsNavbar*` + `BsDropdownMenu` wrappers to parity in both frameworks.
2. Compose `injectMpNavbarDsd(injectMpDropdownDsd(injectMpShellDsd(html)))` in the React/Vue demo servers (Angular already wired on branch B).

### Phase 5 — tests, demos, a11y, hosting
1. No-JS Playwright specs (all three + Firefox): `:focus-within` reveal, checkbox collapse, inline submenu.
2. JS specs: click-to-open (post-`data-js`), submenu overlay-pull + flip, first-level height cap.
3. ARIA: `role="menu"`/`menuitem`, `aria-haspopup`, toggler label, nav landmark.
4. Demo pages (demo-before-snippet) in all three demos; confirm the three prod SSR servers emit the DSD.

## Test Scenarios

### Scenario 1: reuse in both contexts
- **Given** a `<bs-dropdown-menu>` with `[bsDropdownItem]` children. **When** placed standalone (external trigger) and again inside `<bs-navbar>`. **Then** both render with correct Bootstrap dropdown styling; items respond to hover/active/disabled identically.

### Scenario 2: no-JS reveal (JavaScript disabled)
- **Given** the navbar SSR'd with DSD, JS off. **When** the user tabs to / focuses a dropdown trigger. **Then** `:focus-within` reveals the panel; a submenu renders inline; the hamburger checkbox toggles the collapse. Verified Chromium + Firefox, all three frameworks.

### Scenario 3: JS overlay-pull + height cap
- **Given** a hydrated navbar (`data-js` set). **When** a top-level dropdown with a nested submenu is clicked. **Then** the top-level panel opens below the trigger capped at `calc(100vh - 100% - 1rem)` and scrolls; the submenu lifts into a `position:fixed` overlay via `OverlayController` and flips side when it won't fit; focus (not click) never opens it.

### Scenario 4: item styling parity
- **Given** the current Bootstrap dropdown item as reference. **When** rendered via `[bsDropdownItem]` on a slotted element + `mp-dropdown-menu`'s `::slotted` rules. **Then** default/hover/active/disabled and dark-theme match (Phase 0 pass criteria, re-asserted).

### Scenario 5: SSR injection integrity
- **Given** a page with `mp-navbar`, `mp-navbar-item`, and `mp-dropdown-menu`. **When** the server injects DSD. **Then** each element gets exactly one `<template shadowrootmode>` (idempotent, correct tag boundaries — `mp-navbar` never matches `mp-navbar-item`).

## Acceptance Criteria

- [ ] `mp-dropdown-menu` + `mp-navbar` are Lit WCs with ng/react/vue wrappers; no item/divider/header WC remains.
- [ ] `[bsDropdownItem]` / `[bsDropdownDivider]` / `[bsDropdownHeader]` directives (+ React/Vue presentational equivalents) apply the Bootstrap classes; item styling matches current Bootstrap across states + dark theme.
- [ ] The same `<bs-dropdown-menu>` + `[bsDropdownItem]` renders correctly standalone and inside `<bs-navbar>`.
- [ ] No-JS `:focus-within` reveal + hamburger collapse work with JS disabled (Chromium + Firefox, all three frameworks).
- [ ] JS overlay-pull of nested submenus works via `OverlayController` (no CDK `DomPortal`); first-level height cap preserved.
- [ ] React + Vue at parity with Angular, including SSR DSD injection.
- [ ] Legacy navbar dropdown system retired; legacy `bs-dropdown-menu` collision resolved; combobox/listbox/typeahead untouched.
- [ ] `nx build mintplayer-web-components` + the three wrapper builds + WC unit tests green; no-JS/JS/a11y e2e green.

## Build & Test Commands

```bash
npx nx run mintplayer-web-components:codegen-wc          # after any .styles.scss / .element.* change
npx nx run mintplayer-web-components:codegen-navbar-chrome
npx nx run mintplayer-web-components:codegen-dropdown-chrome
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components                    # vitest + jsdom (--pool=threads on Windows)
# e2e: navbar no-JS + JS specs in apps/{ng,react,vue}-bootstrap-demo-e2e
```

## Open items (decide during planning)

1. **Legacy `bs-dropdown-menu` collision** — rename the legacy listbox component (→ internal `bs-listbox-menu`) vs mode-split the selector. Blocks the D3 Angular rename only.
2. ~~**Inner-link styling shim**~~ **RESOLVED** — the companion light-DOM `.dropdown-item > a` reset ships with each wrapper (item = `<li bsDropdownItem>` + nested `<a>`).
3. **React/Vue item representation** — presentational component (recommended) vs documented class name.

## Related Files

- `docs/prd/navbar-dropdown-menu-wc.md` (PRD)
- `libs/mintplayer-ng-bootstrap/navbar/` (current Angular navbar — behavior reference)
- `libs/mintplayer-ng-bootstrap/dropdown-menu/` (legacy standalone dropdown — collision source)
- `libs/mintplayer-web-components/overlay/src/overlay-controller.ts`
- `docs/prd/shell-wc-ssr.md` (the SSR/no-JS pattern being reused)
- branch `feat/dropdown-menu-wc` (salvage base)
