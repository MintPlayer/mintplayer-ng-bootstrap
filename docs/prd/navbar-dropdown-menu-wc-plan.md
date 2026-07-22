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

### Phase 2 — items → directives + `::slotted` (D1 + D2) ✅ DONE (2026-07-22)
Refinement adopted: **every menu child is an `<li>` and each directive marks the `<li>`**, so `::slotted(.dropdown-item|.dropdown-divider|.dropdown-header)` styles all three in the shadow and the companion light-DOM sheet shrinks to just the item's nested `<a>`/`<button>` reset (via negative-margin expansion so the whole row navigates, matching Bootstrap). Verified: all 4 libs build, 758/758 WC tests pass, and the **real generated `mp-dropdown-menu` DSD renders correct no-JS** (Playwright: header/normal/active/disabled/divider, light + dark). Steps as executed:
1. Added `::slotted(.dropdown-item / .dropdown-divider / .dropdown-header)` box rules (resolving `--bs-dropdown-*` inherited through the flat tree) to `dropdown-menu.styles.scss`; re-ran codegen-wc; regenerated the dropdown DSD chrome (now menu-only).
2. Delete `mp-dropdown-{item,divider,header}` WCs + wrappers + chrome constants.
3. Add Angular `[bsDropdownItem]` / `[bsDropdownDivider]` / `[bsDropdownHeader]` directives (`host: { '[class.dropdown-item]': 'true' }`, etc.).
4. Ship the **companion light-DOM sheet** with each wrapper package (Angular global style, React/Vue imported CSS) — validated in Phase 0:
   - `.dropdown-item > a, .dropdown-item > button { display:block; width:100%; color:inherit; text-decoration:none; background:none; border:0 }`
   - `.dropdown-header { display:block; padding:.5rem 1rem; font-size:.875rem; color:var(--bs-secondary-color); white-space:nowrap }`
   - `.dropdown-divider { height:0; margin:.5rem 0; border-top:1px solid var(--bs-border-color-translucent) }`
5. Add React/Vue presentational `<BsDropdownItem>` / `<BsDropdownDivider>` / `<BsDropdownHeader>` (render `<li className="dropdown-item">` etc.).
6. Verify item styling parity (Phase 0 criteria) through the WCs + wrappers, standalone and in the navbar.

### Phase 3 — reclaim `bs-` names + FULL migration, no back-compat (D3)
**Scope reversal (2026-07-22, user):** delete BOTH legacy systems, migrate all consumers, no shims. Scoping confirmed low-risk — the trigger/overlay/a11y stack (`[bsDropdown]`, `*bsDropdownMenu`, `[bsDropdownToggle]`, `input[bsCombobox]`, `bsRovingFocus`/`Item`) is KEPT and doesn't couple to the visual components (coupling is inverted); `bsRovingFocusItem` already generates the aria-activedescendant id; the WC's listbox mode defers keyboard to `bsRovingFocus`.

Dropdown-menu:
1. ✅ Deleted legacy `dropdown-menu` visual components; relocated the WC wrapper into the `dropdown-menu` entry point (selector `bs-dropdown-menu`, class `BsDropdownMenuComponent`).
2. ⏳ Migrate consumers (typeahead listbox, context-menu/offcanvas/dropdown demos, specs) to `<bs-dropdown-menu>` + `<li bsDropdownItem>` (`isSelected`→`active`); `mode="listbox"` for combobox/typeahead.

Navbar:
3. Delete legacy navbar lib (`bs-navbar`/`-dropdown`/`-item`/`-brand` @Components); relocate navbar-wc into the `navbar` entry point; rename `bs-navbar-wc*`→`bs-navbar*`.
4. Migrate the demo shell (`app.component.html`) + navbar demo to the new navbar with `<bs-dropdown-menu>` + `[bsDropdownItem]` nested inside `<bs-navbar>`.

### Phase 4 — React + Vue parity + SSR
1. Bring `BsNavbar*` + `BsDropdownMenu` wrappers to parity in both frameworks.
2. Compose `injectMpNavbarDsd(injectMpDropdownDsd(injectMpShellDsd(html)))` in the React/Vue demo servers (Angular already wired on branch B).

### Phase 5 — tests, demos, a11y, hosting — ⏳ IN PROGRESS (2026-07-22)
- ✅ **All four libs + all three demo apps build green**; WC unit tests 758/758, Angular unit tests 472/472.
- ✅ **In-browser verification (Angular demo, Playwright, JS on):** the migrated navbar renders as a proper horizontal bar; first-level dropdowns are hidden until click and open on click (`data-open`); 35 items render with correct nested-link theming (dropdown color, no underline via the companion sheet); submenu carets present. **This caught + fixed a real bug** — the `mp-navbar-dropdown` reveal/positioning used `::slotted(mp-dropdown-menu)` which the Angular `<bs-dropdown-menu>` wrapper host defeated; retargeted to `::slotted(:not([slot="label"]))` (+ overlay panel getter), regenerated the navbar DSD chrome.
- ⬜ **Remaining (CI / follow-up):** the pre-existing Playwright e2e (`smoke`/`routing`/`navigation-lock`/`shell`/`carousel` + new no-JS specs) run in CI — selectors were updated; not run locally (no browser matrix here). No-JS `:focus-within` + submenu-overlay + Firefox parity to confirm via CI/manual. React/Vue demo pages already build; SSR DSD injectors composed (`injectMpNavbarDsd`/`injectMpDropdownDsd`).
- ⬜ **Known follow-up (documented):** active-route highlighting isn't wired per-item on the new navbar (legacy auto-highlighted the current route); needs `routerLinkActive`→`[active]` plumbing on `bs-navbar-item`/`bsDropdownItem`.

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

## Phase 6 — post-PR navbar review fixes (2026-07-22, PR #390)

Five navbar regressions found in in-browser review (see PRD "Post-PR review fixes" for root causes + fix rationale). Implement in order; regenerate **both** codegens (`nx run mintplayer-web-components:codegen-wc` + `nx run mintplayer-web-components:codegen-navbar-chrome`) after any shadow-CSS/`render()` change; re-verify each in the running Angular demo (wide + narrow + dark).

1. **#1 underline** — `navbar-item.styles.scss` + `navbar-brand.styles.scss`: `text-decoration: none !important` on `::slotted(a),::slotted(button)`.
2. **#5 dark toggler** — `navbar.styles.scss`: `.navbar-toggler-icon` → `background-image:none; background-color:var(--bs-navbar-color); mask:var(--mp-toggler-mask) …`; define `--mp-toggler-mask` (hamburger SVG) on `:host`.
3. **#3 fixed positioning (Angular demo only)** — de-dup `part="nav"` in `mp-navbar.ts` (start `<ul>` → `part="nav-start"`); `apps/ng-bootstrap-demo/src/styles.scss`: `demo-bootstrap-root mp-navbar{position:fixed;inset:0 0 auto;width:100%;z-index:1030}`; content-wrapper `padding-top` = bar height in `app.component.{html,scss}`, align `ViewportScroller.setOffset`.
4. **#2 collapse animation** — `mp-navbar.ts render()`: add `.navbar-collapse-inner` wrapper; `navbar.styles.scss`: `.navbar-collapse{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s ease}` + open→`1fr`, inner `min-height:0;overflow:hidden`, wide-mode reset `display:flex;grid-template-rows:none`, `prefers-reduced-motion` guard.
5. **#4 inline (small) vs overlay (wide)** — `mp-navbar.ts`: publish `--mp-navbar-breakpoint` + `data-breakpoint` on breakpoint change. `navbar-dropdown.styles.scss`: default panels inline (`position:static`); `@each $grid-breakpoints` `media-breakpoint-up` re-enables first-level `absolute` gated on `:host([data-expand="<bp>"])`. `mp-navbar-dropdown.ts`: read `--mp-navbar-breakpoint`, set own `data-expand`; gate `OverlayController` construction/engagement behind `matchMedia(min-width)`, re-eval on `change`, cleanup in `disconnectedCallback`; small-mode submenu opens inline via `data-open`.

**Verification:** rebuild web-components + ng-bootstrap + ng demo; re-run Playwright checks (nav-links no underline; toggler light on dark page; navbar fixed/top/full-width in the Angular demo; collapse slides; small-mode dropdowns inline, wide-mode nested submenus overlay). React/Vue unaffected except the shared WC CSS improvements.

## Phase 6 continued — post-PR review rounds (2026-07-22)

Full detail in the PRD ("Post-PR review fixes", Rounds 1–5). Summary of what shipped after the migration PR (all on `feat/navbar-dropdown-menu-wc`, pushed to PR #390):

- **R1** — 5 regressions: nav-link underline; collapse slide (`grid-template-rows`); Angular-demo fixed positioning; small-inline vs wide-overlay dropdowns (breakpoint via `--mp-navbar-breakpoint` + matchMedia); dark toggler (mask + `--bs-navbar-color`).
- **R2** — `positioning="fixed"` input on `mp-navbar` (bridged ng/react/vue; demo uses it); brand centering + submenu/first-level insets restored vs the live master navbar.
- **R3** — dismiss-on-navigate (`mp-navbar` closes dropdowns + collapses on `<a href>` click); first-level left inset.
- **R4** — `*-chrome.generated.ts` gitignored as build artifacts; new `codegen-ssr-chrome` aggregate; demos `dependsOn` it (documented in CLAUDE.md).
- **R5** — navbar demo moved Overlays → **Enterprise** (`/enterprise/navbar`); fixed-bar small-mode internal scroll (`max-height:100dvh; overflow:hidden auto`, `:host([breakpoint=x][positioning=fixed])` — both attrs inside `:host()`); scrollbar hidden via `scrollbar-width:none` (not the OS-specific `-17px`); `serve` now `dependsOn codegen-ssr-chrome` (SSR/no-JS on a fresh checkout); version bumps (wc 2.1.0 / ng 22.5.0 / react 19.7.0 / vue 3.8.0).

**Tests (behavior lock-in):** `apps/ng-bootstrap-demo-e2e/e2e/navbar.spec.ts` — 11 Playwright tests, chromium + firefox, JS-enabled (see PRD "Test coverage"). `navbar-nojs.spec.ts` (JS disabled, chromium + firefox) — asserts the SSR DSD attaches with no upgrade and the collapse toggles via the native `<label>`→in-shadow-`<input type=checkbox>` state (`toBeChecked()`); with JS off, `page.evaluate`/computed-style is unavailable and the collapse reveal is a paint-clip with unchanged bounding boxes, so the native checked-state is the observable proxy for the CSS `:checked ~` reveal. Layout/CSS can't be asserted in the jsdom WC unit tests, so it lives in e2e.

## Phase 7 — Angular API re-alignment over the frozen WC (investigated 2026-07-22)

Goal: restore the old ergonomic Angular authoring API (grouping `<bs-navbar-nav>`, uniform `<bs-navbar-item>` dropdown items, no leaked `slot="end"`) **without changing the WC**. Full analysis + feasibility table + recommended API + constraints in the PRD ("Angular API re-alignment over the frozen WC"). This phase is **additive Angular wrapper surface** — no WC or SSR-chrome change — so it can ship in a separate follow-up PR from #390.

**Scope confirmed (2026-07-22): option C (maximal)**, plus the animated hamburger→X toggler restored on the navbar (see PRD "Scope decision + animated-toggler investigation" — the WC owns the cross via its in-shadow `:checked` machine; verdict table there). The "WC stays frozen" premise is relaxed for exactly one change: the toggler render/styles (a zero-WC-change animated toggler is provably impossible — no-JS state can't leave the shadow). **PR target resolved: ships in PR #390.** Toggler finalized as the **slot + fallback hybrid** (PRD round 3): `<slot name="toggler">` in the shadow label, default bars as fallback, custom-property state bridge for slotted glyphs — no noscript flash (slot assignment is parse-time under DSD).

### Step 0 — spike (GATE, do first)
Validate `display:contents` on a slotted wrapper flattening its children into the shadow `.navbar-nav` flex row, in **both** alignment groups, **Chromium + Firefox** (older Firefox dropped display:contents flex items). Throwaway page: `<mp-navbar breakpoint="lg">` with `<div style="display:contents"><mp-navbar-item>…</mp-navbar-item></div>` in the default slot and another `slot="end"`. Assert: (1) row (wide) / column (narrow) layout matches bare items; (2) `end` group right-aligns (`margin-inline-start:auto`); (3) link color (`--bs-nav-link-*`) reaches items; (4) no-JS collapse reveals grouped items. If Firefox fails → fall back to per-item `[align]` (option A) and stop.

### Step 1 — `<bs-navbar-nav [align]>` grouping container (`libs/mintplayer-ng-bootstrap/navbar/src/navbar-nav/`)
- Component: template `<ng-content></ng-content>`; host `[attr.slot]` = `align()==='end' ? 'end' : null`; **static** `display:contents` (host style / encapsulated sheet — NOT via `afterNextRender`, per PRD no-JS-flash constraint).
- Input `align = input<'start'|'end'>('start')`. **Omit `[collapse]`** (WC owns one shared collapse region — blocked). Export from the navbar entry `index.ts`.
- Removes raw `slot="end"` from consumer templates (mirrors how `bs-navbar-brand` hides `slot="brand"`).

### Step 2 — context-aware `bs-navbar-item` dropdown items
- Add an injection token (e.g. `BS_DROPDOWN_MENU_CONTEXT`) provided by `bs-dropdown-menu` **and** `bs-navbar-dropdown`.
- `bs-navbar-item` `@Optional() inject`s it: **outside** a menu → current `<mp-navbar-item>` render (`.nav-link`); **inside** a menu → `<li class="dropdown-item"><a>…` with the anchor as an **immediate child** (companion reset uses `.dropdown-item > a`). Reuse `[bsDropdownItem]`'s class/aria/roving wiring; ensure `mp-dropdown-menu`'s `querySelectorAll('.dropdown-item')` (scoped by `closest`) + `querySelector('a,button')` still resolve.
- `bs-dropdown-menu` + `[bsDropdownItem]` stay the public API for **standalone** menus — unchanged.

### Step 3 — animated hamburger→X toggler (the one WC change; slot + fallback hybrid)
- `mp-navbar.ts` `render()`: replace `<span class="navbar-toggler-icon">` with `<slot name="toggler">` inside the existing `<label>` (checkbox, `for` wiring, and `part="toggler"` untouched), whose **fallback content** is three `<span class="navbar-toggler-bar">`.
- `navbar.styles.scss`: fallback bars `25px×2px`, `margin: 6px 0`, `background-color: var(--bs-navbar-color)`, `transition: 0.4s`; X-morph via `.navbar-toggle:checked ~ .navbar-toggler .navbar-toggler-bar:nth-child(…)` using the **verbatim old transforms** (bar 1 `rotate(-45deg) translate(-7px, 5px)`, bar 2 `opacity: 0`, bar 3 `rotate(45deg) translate(-6px, -4px)` — rotate-then-translate order is load-bearing); custom-glyph state bridge `.navbar-toggle:checked ~ .navbar-toggler ::slotted([slot="toggler"]) { --mp-navbar-expanded: 1 }`; drop the now-unused `--mp-toggler-mask`; add the bars to the `prefers-reduced-motion` block.
- Angular: `[bsNavbarToggler]` directive (navbar entry) sets `slot="toggler"` on its host — hides the slot name. Slotted glyphs must be non-interactive (no `<button>`/`<a href>` — label click-forwarding dies); document on the directive.
- Codegen: `codegen-wc` + `codegen-navbar-chrome` (auto via the `codegen-ssr-chrome` aggregate). React/Vue wrappers and demos: **no change** (slot works directly). The standalone `@mintplayer/ng-bootstrap/navbar-toggler` lib (toggle-buttons demo) stays as-is and must not be slotted (renders a `<button>`).
- e2e: extend `navbar.spec.ts` (crossed state after `.click()` — never focus — e.g. bar 1 computed `transform` ≠ `none` when open, back to `none`/identity when closed); `navbar-nojs.spec.ts` can't read computed styles, so the JS-enabled spec carries the visual assertion; the no-JS spec already proves the `:checked` machine the morph keys off.

### Step 4 — `[bsNavbarTrigger]` + `[bsNavbarContent]`/`#nav` directives
- `bsNavbarContent`: `ResizeObserver` on the `bs-navbar` host → content `padding-top` (replaces hard-coded `76px`).
- `bsNavbarTrigger`: only if the trigger-anchor idiom is restored; otherwise keep `bs-navbar-dropdown [label]` (recommended) and skip.
- No functional light-DOM toggler (no-JS-dead — PRD verdict table); no no-op shim needed since the real `bs-navbar-toggler` lib still exists for standalone use.

### Step 5 — migrate the demo + tests
- Rewrite `apps/ng-bootstrap-demo/src/app/app.component.html` to the re-aligned API (two `<bs-navbar-nav>` groups; uniform `<bs-navbar-item>` dropdown items). Keep the existing navbar e2e specs green (they assert behavior, which is unchanged) and add a spec asserting the `end` group right-aligns and grouped items lay out correctly (guards the display:contents mechanism). Re-run chromium + firefox.
- **(Optional) React/Vue parity** — mirror `bs-navbar-nav` + context-aware item; else document the Angular-only asymmetry.

### Verification
`nx build` the 4 libs + 3 demos; WC unit tests green (Step 3 touches `mp-navbar`'s render — update any toggler-icon assertions); regenerated SSR chrome (aggregate) — verify the DSD toggler morphs under no-JS manually or via the JS-enabled spec; navbar JS + no-JS e2e green chromium + firefox; new grouping/alignment + crossed-toggler e2e green.

### Phase 7 — EXECUTED (2026-07-22)

All five steps implemented and committed milestone-by-milestone on `feat/navbar-dropdown-menu-wc` (PR #390): `57721f6a` (bs-navbar-nav), `9652ab00` (context-aware item + menu-owning dropdown + demo migration), `9f98b722` (animated toggler), `e99c0a1c` (bsNavbarContent). Deviations and discoveries vs the plan:

- **Demo migration folded into step 2** (not step 5): `bs-navbar-dropdown` owning its menu is breaking, so `app.component.html` + the enterprise/navbar demo page (live demo + both code snippets) were rewritten in the same commit to keep every milestone green. Step 5 reduced to lock-in tests + full verification.
- **`bsNavbarTrigger` not restored** (plan's own default): `bs-navbar-dropdown [label]` owns the trigger; a non-navigating trigger-anchor directive would have zero consumers.
- **Hydration discovery:** `app.config.ts` now has `provideClientHydration(withEventReplay())` — the old "destructive bootstrap" note is outdated. Consequence for `bsNavbarContent`: the client REUSES the SSR element, so the directive's own server-side `padding-top: 58px` approximation is still inline when the client measures the author baseline — it must `removeStyle` before measuring or it double-counts (was: 58 + 70 = 128px). Fixed in `e99c0a1c`.
- **Wedged-watcher incident (repeat of the known failure mode):** after the step-4 edits the SSR bundle was current (`padding-top: 58px` in the served HTML) while the browser bundle was stale (old CSS, no directive) — recovered by restarting the dev server, never `ng build`.
- **e2e lock-in grew to 16 tests/browser (32 total):** added `bs-navbar-nav` grouping/alignment (display:contents flattening + end-group right-align, replacing the deleted throwaway spike as a permanent guard), hamburger→X morph (JS-enabled spec carries the visual assertion; computed styles are unreadable no-JS), `bsNavbarContent` live-height offset, dark-mode luminance retargeted to the bars.

### Round 8 (2026-07-22, branch `feat/navbar-wc-a11y`) — active-route highlighting

Full detail in the PRD ("Round 8"). Legacy highlight was pure stock Bootstrap on the ANCHOR's `.active` (nav-link = text recolor; dropdown-item = primary bg) + `[bsNavbarTrigger]` prefix-matching for the trigger chain. Fix: `::slotted(a.active)` (nav items), `.dropdown-item > a.active` in the companion sheets ×3 frameworks (menu items, full-row via the negative-margin fill), `:host([active])` trigger hooks in the WC (text recolor top-level, primary bg for `[data-submenu]`), driven in Angular by `hostDirectives: [RouterLinkActive]` on `bs-navbar-dropdown` (`isActiveChange` → `[attr.active]`). SSR/no-JS correct (CSS-only + server-rendered classes/attrs). e2e: menu-item row bg, trigger-chain highlight without opening, top-level recolor.

### Round 7 (2026-07-22, post-squash, branch `feat/navbar-wc-a11y`) — accessibility restoration

Full detail in the PRD ("Round 7"). Restores the PR-#327 navbar a11y contract lost with the legacy deletion: toggler focus ring (`:focus-visible ~` sibling), role=button + Enter, aria-controls, single `#setExpanded` write path (stale-aria fix), collapsed menu out of the tab order (`visibility` + `--mp-collapse-hide-delay`; reveal resets the delay), dropdown trigger `aria-expanded` (both flags), ArrowDown menu entry + host-level Escape with focus return. 9 jsdom aria tests + 4 e2e keyboard tests; 46/46 navbar e2e chromium + firefox.

### Round 6 (2026-07-22) — press-time dropdown toggle + `*bsNavbarDropdownLabel`

Full analysis in the PRD ("Round 6"). Commits: `95061674` (fix: toggle on mousedown — press-time gesture resolution; drift-proof switching; switching e2e asserts computed visibility + new drifting-pointer test) and `908add0a` (feat!: `[label]` input REMOVED; trigger label is a structural-directive template `*bsNavbarDropdownLabel` rendered via `ngTemplateOutlet` — repo idiom per user correction, not `<ng-content select>`; demo + enterprise page + snippets migrated). e2e now 17 tests/browser (34 total), green chromium + firefox.
