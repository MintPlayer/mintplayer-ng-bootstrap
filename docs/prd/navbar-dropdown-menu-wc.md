# PRD: Migrate the navbar + menu-dropdown to cross-framework Lit WCs (multi-element)

## Problem

The navbar is still **Angular-only** (`libs/mintplayer-ng-bootstrap/navbar/`, `bs-navbar` `@Component`). It has three properties that block the workspace's "one Lit WC + per-framework wrappers" model:

1. **Bootstrap styles are imported wholesale into an Angular component.** `navbar.component.scss` pulls `bootstrap/scss/dropdown` + `nav` + `navbar` under `/* :host */ ::ng-deep` so the compiled class rules escape view-encapsulation and reach the projected `.dropdown-menu` / `.nav-item` / `.navbar-collapse`. The memory's "we sadly need them" is exactly this: the navbar renders Bootstrap's own markup classes, and only these partials style them.
2. **There are two unrelated dropdown systems.** Inside `<bs-navbar>` the consumer uses `bs-navbar-dropdown` + `bs-navbar-item` (CDK `DomPortal` overlay-pull, `:focus-within` no-JS). Separately, `bs-dropdown-menu` + `bs-dropdown-item` exist for the standalone `bsDropdown` directive (typeahead, tree-select, dropdown-button). They share almost nothing. A consumer cannot put `<bs-dropdown-menu>` inside `<bs-navbar>` today.
3. **The interactive behavior is Angular-locked.** Nested-submenu overlay-pull uses `@angular/cdk`'s `DomPortal`; there is no React or Vue navbar at all.

The goal is to make the navbar and its menu-dropdown **framework-agnostic Lit web components with hand-written ng/react/vue wrappers**, while **preserving every behavior the Angular navbar has today** — no-JS interactivity, JS overlay-pull of nested dropdowns, and the first-level height cap — and to **unify the two dropdown systems** so the *same* `bs-dropdown-menu` renders correctly both standalone and inside `bs-navbar`.

## Starting point — salvage branch `feat/dropdown-menu-wc` (branch B)

This is **not greenfield.** An earlier branch, `feat/dropdown-menu-wc` (merge-base `2058097f`, 2026-06-03), already built essentially the whole multi-element family and is the confirmed salvage base:

- **WCs (10, all real LitElements):** `mp-navbar`, `mp-navbar-item`, `mp-navbar-brand`, `mp-navbar-dropdown` (+ base `mp-navbar-element`); `mp-dropdown-menu`, `mp-dropdown-item`, `mp-dropdown-divider`, `mp-dropdown-header` (+ base `mp-dropdown-element`).
- **Wrappers for all three frameworks**, using the established styles (Angular `CUSTOM_ELEMENTS_SCHEMA` + `afterNextRender` client-only define; React `@lit/react` `createComponent`; Vue SFC `inheritAttrs:false` + `v-bind="$attrs"`).
- **SSR:** `injectMpNavbarDsd` / `injectMpDropdownDsd` string injectors + `gen-navbar-chrome.mjs` / `gen-dropdown-chrome.mjs` generators + Nx targets, composed in the demo servers alongside `injectMpShellDsd`.
- **No-JS + overlay-pull + height cap all working** (see Core architecture) — the mechanisms are proven on the branch.

> ⚠️ The `libs/mintplayer-web-components/{navbar,dropdown-menu,dropdown}/` directories currently visible on `master` are **gitignored, orphaned `*.styles.ts`** from an aborted pass — no `.scss` source, no element, not exported. They are stale build artifacts, not an implementation. The real work lives only on branch B.

### Delta from branch B (driven by the locked decisions below)

Branch B is the base, but three things change:

| # | Branch B did | This PRD requires | Why |
|---|---|---|---|
| D1 | `mp-dropdown-item` / `-divider` / `-header` are **WC elements** (own shadow, own `.dropdown-item` styles, host-attribute-driven) | **Delete those WCs.** Items are plain light-DOM elements + an Angular **attribute directive** `[bsDropdownItem]` (and framework equivalents) applying the `.dropdown-item` class | User decision (Q2). Item styling must come from the `mp-dropdown-menu` shadow, so a separate WC per item can't be styled from there. |
| D2 | Item styling lived in each item's **own** shadow (no `::slotted`) | Move `.dropdown-item` / `.dropdown-divider` / `.dropdown-header` rules **into `mp-dropdown-menu`'s shadow as `::slotted(...)` rules** | Consequence of D1 — see "The item-styling problem" (the #1 risk). |
| D3 | New Angular wrappers used `-wc-` selectors (`bs-navbar-wc`, `bs-dropdown-wc-menu`) to coexist with the legacy components | **Reclaim the clean `bs-navbar` / `bs-dropdown-menu` / `bs-dropdown-item` selectors**, retiring the legacy Angular navbar dropdown system | Breaking changes are acceptable here; the workspace favors a clean API over shims. See "Naming & collision". |

## Goals

1. **`mp-dropdown-menu`** — a framework-agnostic Lit WC that is the *presentational menu panel* (`<ul class="dropdown-menu">` + slotted items) and **carries the `bootstrap/scss/dropdown` styles inside its shadow root**. Reusable **standalone** (driven by an external trigger) **and inside the navbar**.
2. **`mp-navbar`** — a Lit WC that carries the `bootstrap/scss/navbar` **and `bootstrap/scss/nav`** styles inside its shadow (the base `.nav-link` box lives in `_nav.scss`, not `_navbar.scss`, so both are required).
3. **Items, dividers, headers are plain light-DOM elements**, styled via attribute directives (`[bsDropdownItem]`, `[bsDropdownDivider]`, `[bsDropdownHeader]` in Angular; presentational components/class helpers in React/Vue). **No per-item web component.**
4. The **same `bs-dropdown-menu` + `bsDropdownItem`** render correctly both standalone and nested inside `<bs-navbar>`.
5. **No-JS interactivity preserved:** dropdowns reveal via `:focus-within` with JavaScript disabled; the navbar collapse toggles via a hidden checkbox + `<label>`.
6. **JS overlay-pull preserved:** with JS enabled, nested submenus are lifted into a viewport-positioned overlay (`position:fixed` via `OverlayController`), not clipped inside the parent — **framework-agnostic, replacing CDK `DomPortal`**.
7. **First-level dropdown height cap preserved** (`max-height: calc(100vh - 100% - 1rem)` first-level; `calc(100vh - 1rem)` for the JS submenu overlay).
8. **React + Vue** wrappers + SSR, at parity with Angular.

## Non-goals

- No new general SSR framework — we reuse the shell's Declarative-Shadow-DOM string-injection pattern (`@lit-labs/ssr` at build time → constant → runtime regex insert), already proven and framework-agnostic.
- No behavior change to `mp-shell`, `tree-select`, or other shipped WCs.

> ⚠️ **Scope reversal (2026-07-22, user decision).** The combobox / listbox / typeahead / `[bsDropdown]` directive were originally out of scope. The user has since directed a **full migration with no backward compatibility**: those controls move onto the new WC-backed `bs-dropdown-menu` (`mode="listbox"`) + `[bsDropdownItem]`, and the **legacy `libs/mintplayer-ng-bootstrap/dropdown-menu` component is deleted entirely.** This resolves the selector collision by removing the legacy occupant. See Locked decision #6 and the expanded plan phases.

## Locked decisions (confirmed with the user)

| # | Decision | Consequence |
|---|---|---|
| 1 | **Multi-element architecture.** `mp-dropdown-menu` (presentational panel) and `mp-navbar` are peers; `mp-navbar-dropdown` wraps a trigger + a slotted `mp-dropdown-menu`. (Rejected: the newer branch A's single unified `mp-dropdown` — it gives no reusable standalone panel.) | The same `mp-dropdown-menu` panel is reused in both the standalone and navbar contexts; only its *trigger owner* differs. |
| 2 | **Dropdown item = attribute directive on `<li>`.** `[bsDropdownItem]` applies `.dropdown-item` to the `<li>` (repo convention, deviates from BS5's `<li><a class=dropdown-item>`); **no `mp-dropdown-item` WC.** Same for `[bsDropdownDivider]` / `[bsDropdownHeader]`. | Item *box* styling lives in `mp-dropdown-menu`'s shadow via `::slotted(.dropdown-item)`; a nested `<a>` is handled by a small **companion light-DOM stylesheet shipped with each wrapper** (the one deliberate rule outside the shadow). See "The item-styling problem". |
| 3 | **Salvage & rebase branch B**, don't greenfield. | Rebase B onto `master`; reconcile packaging conflicts; apply deltas D1–D3. |
| 4 | **Overlay-pull via `OverlayController`, not CDK `DomPortal`.** | Works in all three frameworks; no `@angular/cdk` dependency in the WC layer. Already how branch B does it. |
| 5 | **Include `bootstrap/scss/nav` in `mp-navbar`.** | `_navbar.scss` only adds contextual overrides; the base `.nav-link` box (display, padding, color, focus/hover/disabled) is defined in `_nav.scss`. Answers the user's "should nav also be included?" — yes. |
| 6 | **Breaking changes are acceptable; reclaim the clean `bs-` selectors; full migration, no back-compat (2026-07-22).** | The legacy Angular navbar dropdown system (`bs-navbar-dropdown`/`bs-navbar-item`) AND the legacy `bs-dropdown-menu`/`bs-dropdown-item` component are **deleted**. The combobox / `[bsDropdown]` directive / typeahead are migrated onto the new WC-backed `bs-dropdown-menu` (`mode="listbox"`) + `[bsDropdownItem]`. The new components take the clean `bs-navbar` / `bs-dropdown-menu` selectors. |
| 7 | **One feature branch / one PR**, created only on explicit go-ahead. | The phasing below is internal sequencing, not separate PRs. |

## Core architecture

### Component responsibilities

| Element | Role | Shadow content | Carries which Bootstrap styles |
|---|---|---|---|
| `mp-dropdown-menu` | Presentational **menu panel**. No trigger of its own. | `<ul class="dropdown-menu"><slot></slot></ul>` | `bootstrap/scss/dropdown` (container) **+ `::slotted` item/divider/header rules** (new, D2), re-bound to `--bs-dropdown-*` live tokens. |
| `mp-navbar` | Navbar chrome + responsive collapse (hamburger). | `<nav>` + hidden toggle checkbox + `<label>` toggler + `.navbar-collapse` with `brand` / default / `end` slots. | `bootstrap/scss/navbar` **+ `bootstrap/scss/nav`** (decision #5). |
| `mp-navbar-dropdown` | **Trigger + behavior** for a dropdown inside the navbar. Renders the `<a class="nav-link dropdown-toggle">` trigger in its own shadow and **slots** a `mp-dropdown-menu` panel beside it. Owns no-JS reveal, JS `OverlayController`, and the height cap. | `<a class="nav-link dropdown-toggle">` + `<slot>` (the panel) | navbar-dropdown positioning/reveal CSS. |
| `mp-navbar-item`, `mp-navbar-brand` | Thin slot hosts (`render() → <slot>`); `active`/`disabled` reflected for `::slotted` styling. | `<slot></slot>` | — |

**Reuse in both contexts (the headline requirement):** `mp-dropdown-menu` is trigger-less on purpose.
- **Standalone:** an external trigger (the existing `bsDropdown` directive / a button) opens it; the panel positions itself.
- **In the navbar:** `mp-navbar-dropdown` provides the trigger `<a>` and drives reveal/overlay; the consumer still authors a plain `<bs-dropdown-menu>` with `[bsDropdownItem]` children. Because `mp-navbar-dropdown` renders the trigger in its **own shadow** and the panel is a slotted sibling, `:focus-within` and `OverlayController` both see trigger *and* panel without crossing a slot boundary.

### No-JS reveal (progressive enhancement, gated by `data-js`)

Two independent CSS state machines, both living inside the relevant WC's shadow, both disabled once JS upgrades the element:

**Navbar collapse** (`mp-navbar` shadow) — a visually-hidden focusable checkbox holds the state:
```scss
.navbar-toggle:checked ~ .navbar-collapse,
.navbar-collapse:focus-within {          /* scoped to .navbar-collapse, NOT :host — */
  height: auto !important;                /* :host(:focus-within) re-reveals on the close-click */
  overflow: visible !important;
}
```

**Dropdown reveal** (`mp-navbar-dropdown` shadow) — trigger + panel share one shadow/host:
```scss
::slotted(mp-dropdown-menu) {
  position: absolute; top: 100%; inset-inline-start: 0; z-index: 1000;
  display: none;
  max-height: calc(100vh - 100% - 1rem);   /* first-level height cap (goal #7) */
  overflow-y: auto;
}
:host(:not([data-js]):focus-within) ::slotted(mp-dropdown-menu),   /* no-JS: focus reveals */
:host([data-open]) ::slotted(mp-dropdown-menu) { display: block; } /* JS: click sets data-open */
```
`connectedCallback` sets `data-js` on the host, so after hydration `:not([data-js])` stops matching and **only** `[data-open]` (set on click) reveals — this is the "click, never focus, once hydrated" rule the Angular navbar already follows.

### JS overlay-pull (nested submenus) — `OverlayController`, no portal

`mp-navbar-dropdown` constructs an `OverlayController` (`@mintplayer/web-components/overlay`, a `ReactiveController`; byte-identical on master and branch B) for submenus. There is **no DOM re-parenting / portal**: the panel stays a slotted child; the controller sets inline `left`/`top` while CSS pins it `position:fixed` so it escapes the parent's `overflow`/clip and floats in the viewport. First candidate position that fits wins; else it flips.
```scss
:host([data-submenu]) ::slotted(mp-dropdown-menu)            { position: static; max-height: none; }  /* no-JS submenu inline */
:host([data-submenu][data-js]) ::slotted(mp-dropdown-menu)   { position: fixed; z-index: 1050; max-height: calc(100vh - 1rem); overflow-y: auto; }
:host([data-submenu][data-menu-open]) ::slotted(mp-dropdown-menu) { display: block; }
```
This preserves today's "nested dropdowns are pulled into an overlay" behavior (goal #6) but framework-agnostically, so React and Vue get it for free.

### SSR (Declarative Shadow DOM, all three frameworks)

Same pattern as `mp-shell`: `@lit-labs/ssr` renders each empty element **at build time** into a `<template shadowrootmode="open">` constant (`gen-navbar-chrome.mjs`, `gen-dropdown-chrome.mjs` → `*-chrome.generated.ts`); at request time a pure-string, idempotent, per-tag regex injector splices the chrome after each open tag. Composed in the demo servers:
```js
injectMpNavbarDsd(injectMpDropdownDsd(injectMpShellDsd(html)))
```
lit-ssr never runs inside any framework server (Angular Domino / Vite SSR) — only the injectors do. Tag-boundary care (`(?=[\s>/])`) keeps `mp-navbar` from matching `mp-navbar-item`.

## Component design

### `mp-dropdown-menu`
- **Attributes:** `mode` (`menu` | `listbox`), `max-height` (→ `--mp-dropdown-max-height`), `label-id`.
- **Events:** `select` (`{ item, value }`, bubbles + composed).
- **Slot:** default (items / dividers / headers, plus a nested `mp-dropdown-menu` for submenus).
- **Shadow:** `<ul class="dropdown-menu show" role=${mode} part="menu">…<slot @slotchange></slot></ul>`.
- **Styles (D2 — the change from branch B):** the container `.dropdown-menu` rule (re-bound `--bs-dropdown-*` → live tokens, `position: static; display: block; overflow-y: auto`) **plus new `::slotted` rules** for items/dividers/headers (see next section).
- Keyboard roving-tabindex in menu mode; assigns `role="menuitem"` / `"option"`.

### `mp-navbar`
- **Attributes:** `breakpoint`, `color` (→ `data-bs-theme`), `expanded`, `aria-label`.
- **Events:** `expandedchange` (`{ expanded }`).
- **Slots:** `brand`, default (start nav), `end`.
- **Shadow:** `<nav class="navbar">` + `brand` slot + hidden toggle checkbox + `<label class="navbar-toggler">` + `.navbar-collapse` containing `.navbar-nav` slots.
- **Styles:** `bootstrap/scss/navbar` + `bootstrap/scss/nav` (+ config partials for `$grid-breakpoints`, inlined breakpoint px since mixins don't cross the shadow boundary).

### `mp-navbar-dropdown`
- Detects submenu via `this.closest('mp-dropdown-menu')` → `data-submenu` + constructs `OverlayController`.
- **Shadow:** `<a class="nav-link dropdown-toggle" role="button" tabindex="0" aria-haspopup="menu">…<slot name="label"></slot></a>` + `<slot>` (panel).
- Click → toggles `data-open` / `data-menu-open`; `connectedCallback` → `data-js`.

### `mp-navbar-item`, `mp-navbar-brand`
- `render() → html\`<slot></slot>\``; reflect `active` / `disabled`. The slotted `<a href>` stays light DOM for no-JS navigation.

## The item-styling problem (the #1 risk — read before implementing)

**Your Q2 reasoning is right that a separate item WC can't be styled from the menu's shadow — but the directive approach has its own constraint that must be designed around.**

Items are now plain light-DOM `<li bsDropdownItem>` **slotted** into `mp-dropdown-menu`'s shadow `<slot>`. A shadow stylesheet's ordinary selectors (`.dropdown-item {}`, as Bootstrap emits them) **do not match slotted light-DOM elements** — the only reach across the slot boundary is **`::slotted()`**. So the menu SCSS must re-express item rules:
```scss
/* mp-dropdown-menu shadow — NEW, replacing branch B's per-item-WC styles */
::slotted(.dropdown-item)          { display:block; width:100%; padding:…; color:var(--bs-dropdown-link-color); … }
::slotted(.dropdown-item:hover),
::slotted(.dropdown-item:focus)    { color:var(--bs-dropdown-link-hover-color); background:var(--bs-dropdown-link-hover-bg); }
::slotted(.dropdown-item.active)   { color:var(--bs-dropdown-link-active-color); background:var(--bs-dropdown-link-active-bg); }
::slotted(.dropdown-item.disabled) { color:var(--bs-dropdown-link-disabled-color); pointer-events:none; }
::slotted(.dropdown-divider)       { … } ::slotted(.dropdown-header) { … }
```

**Hard limitation:** `::slotted(X)` styles the slotted element *itself* only — it **cannot style descendants** of slotted content (`::slotted(li) a` is invalid). So if a consumer writes `<li bsDropdownItem><a routerLink>Text</a></li>`, the menu shadow can style the `<li>` box but **not the inner `<a>`** (color, `text-decoration`, full-row padding). Branch B sidestepped this precisely by making each item its own WC (whose shadow *could* style its own `::slotted(a)`).

**Resolution (DECIDED — "directive on `<li>` + link reset").** Two cooperating layers, so `<ul><li>` list semantics are preserved (the slotted top-level element is always the `<li>`) while a nested link is still styled:

1. **Author shape:** `<li bsDropdownItem>` is the item; a nested `<a routerLink>` / `<button>` (or plain text) lives inside it. `bsDropdownItem` applies `.dropdown-item` to the **`<li>`** (the repo's existing convention — the current `bs-dropdown-item` also renders `<li class="dropdown-item">`). Note this deviates from Bootstrap 5's own markup (`<li><a class="dropdown-item">`), consistent with what this repo already ships.
2. **Menu shadow (`::slotted`):** `mp-dropdown-menu` styles the item *box* — padding, color, hover, active, disabled, dark theme — via `::slotted(.dropdown-item)` re-bound to `--bs-dropdown-*` live tokens. This reaches the `<li>` itself (the directly-slotted element).
3. **Companion light-DOM stylesheet (CONFIRMED, not optional):** the things `::slotted` cannot reach are the descendants of the slotted `<li>` — the item's inner link, and (because Bootstrap puts their class on an inner `<hr>`/`<h6>`) the divider and header. Each wrapper package ships a small, **class-scoped** light-DOM sheet that uses only globally-available `--bs-*` tokens:
   ```css
   /* shipped with the ng/react/vue wrapper — NOT global Bootstrap, NOT the WC shadow */
   .dropdown-item > a,
   .dropdown-item > button { display:block; width:100%; color:inherit; text-decoration:none; background:none; border:0; }
   .dropdown-header  { display:block; padding:.5rem 1rem; font-size:.875rem; color:var(--bs-secondary-color); white-space:nowrap; }
   .dropdown-divider { height:0; margin:.5rem 0; border-top:1px solid var(--bs-border-color-translucent); }
   ```
   This is the single deliberate place styling lives outside the WC shadow. The *expensive* part — the item box and its hover/active/disabled/focus states — stays encapsulated in the shadow via `::slotted(.dropdown-item)`; only these few descendant rules ship light-DOM.

**Rejected:** an item WC (branch B's approach — self-contained but contradicts decision #2); rendering the menu in light DOM (`createRenderRoot → this`) so plain `.dropdown-item` applies (breaks shadow encapsulation and the "WC carries the styles" property).

**Phase 0 spike — DONE ✅ (2026-07-22).** `docs/prd/_spike-dropdown-slotted.html` (+ `_spike-min-bootstrap.css`, the exact minimal ng-bootstrap sheet — no `.dropdown-*` rules). Under minimal-global-CSS-only, a slotted `<li class="dropdown-item"><a></a></li>` styled by shadow `::slotted(.dropdown-item)` + the companion sheet is **pixel-identical** to a real Bootstrap dropdown (isolated iframe) across header/normal/active/disabled/divider in **both light and dark themes** (verified via Playwright screenshot + computed-style assertions: box padding `4px 16px`, active `#0d6efd`/white, disabled 50%-alpha, nested `<a>` `display:block` fills box + inherits color + no underline). Confirms the chosen design renders correctly — it was a parity check, not a design fork. The spike surfaced that header/divider join the item's link in the companion sheet (folded into resolution 3 above). Throwaway files to delete before the PR.

## Naming & collision (one open sub-decision)

Decision #6 reclaims `bs-dropdown-menu` / `bs-dropdown-item`. **But a legacy `bs-dropdown-menu` / `bs-dropdown-item` already exists** (`libs/mintplayer-ng-bootstrap/dropdown-menu/`), consumed by the standalone `bsDropdown` directive **including its listbox/combobox mode** (typeahead). Reclaiming the selector collides with that consumer, which is explicitly out of scope (non-goal: combobox/listbox untouched).

**Recommended:** the new WC-backed menu takes `bs-dropdown-menu` / `bsDropdownItem`; the legacy component is either (a) renamed to an internal `bs-listbox-menu` used only by typeahead, or (b) kept as-is under its current selector *only for listbox mode* and the new one scoped to menu mode. **This needs a quick decision in planning** (it's the residual naming question, tracked in Open questions). Until resolved, the plan proceeds against the WCs (which are unaffected) and defers the Angular selector bikeshed.

## Risks & mitigations

- ~~**`::slotted` item styling**~~ **RETIRED (Phase 0 passed).** Box via `::slotted(.dropdown-item)`; nested `<a>` + header + divider via the companion light-DOM sheet. Verified pixel-identical to Bootstrap under minimal-global-CSS-only, light + dark (see "The item-styling problem" → Phase 0 spike).
- **Legacy `bs-dropdown-menu` selector collision.** *Mitigation:* audit consumers of the legacy component first (typeahead, tree-select, dropdown-button); decide rename vs mode-split before touching Angular selectors.
- **Rebase packaging conflicts** in `tsconfig.base.json` + `libs/*/package.json` from master's #382 (Angular 22), #383 (subpath exports), and the `@mintplayer/web-components`+`lit` peerDependencies commit. *Mitigation:* re-register branch B's navbar/dropdown-menu element + `/ssr` subpaths under master's *newer* export scheme and peerDep rule; OverlayController is byte-identical so no feature-code reconciliation.
- **DSD injector tag-boundary bugs** (`mp-navbar` vs `mp-navbar-item`). *Mitigation:* keep branch B's `(?=[\s>/])` boundary + per-element negative-lookahead idempotency; e2e asserts each element gets exactly one chrome template.
- **Theme tokens don't cross the shadow the way raw Bootstrap literals assume.** *Mitigation:* re-bind `--bs-dropdown-*` / navbar vars to live `--bs-body-*` / `--bs-tertiary-*` tokens inside each shadow (branch B + the legacy Angular `dropdown-menu.component.scss` already show the exact block); rely on the consumer page's `:root` `--bs-*` inheriting through the boundary.
- **No-JS focus-within re-reveal on close-click.** *Mitigation:* scope collapse reveal to `.navbar-collapse` not `:host` (branch B commit `922c8fd7` already fixed this — carry it).

## Phased plan (single branch, internal sequencing)

- **Phase 0 — spike (GATE):** prove `::slotted` item styling matches Bootstrap across states + dark theme (both `<a bsDropdownItem>` and `<li bsDropdownItem>` shapes); decide the inner-link shim question. Confirm the no-JS reveal + OverlayController submenu still work with items as plain light-DOM `<li>` (branch B proved it with item *WCs*).
- **Phase 1 — rebase branch B onto master:** resolve `tsconfig.base.json` + `package.json` conflicts; re-register subpath exports/aliases under the post-#383 scheme + peerDeps; get `nx build mintplayer-web-components` + the three wrapper builds green **as branch B built them** (item WCs still present), as a known-good baseline.
- **Phase 2 — apply D1/D2 (items → directives + `::slotted`):** delete `mp-dropdown-item` / `-divider` / `-header` WCs and their wrappers; add `::slotted` item/divider/header rules to `mp-dropdown-menu.styles.scss` (re-run `codegen-wc`); regenerate the dropdown DSD chrome; add Angular `[bsDropdownItem]` / `[bsDropdownDivider]` / `[bsDropdownHeader]` directives and React/Vue presentational equivalents.
- **Phase 3 — apply D3 (reclaim `bs-` names) + unify:** rename the new Angular wrappers off `-wc-` to `bs-navbar` / `bs-dropdown-menu`; retire the legacy navbar dropdown system; resolve the legacy `bs-dropdown-menu` listbox collision per the naming decision; wire the demo so `<bs-dropdown-menu>` is used **inside** `<bs-navbar>`.
- **Phase 4 — React + Vue wrappers + SSR:** bring the React/Vue navbar + dropdown-menu wrappers to parity; compose `injectMpNavbarDsd`/`injectMpDropdownDsd` in the React/Vue demo servers.
- **Phase 5 — no-JS + hydration + a11y tests, demos, Docker:** Playwright no-JS specs (reveal via `:focus-within`, collapse via checkbox, submenu inline) + JS specs (click-to-open, overlay-pull, height cap) on all three frameworks + Firefox; ARIA; demo pages (demo-before-snippet); confirm the three prod SSR servers emit the DSD.

## Testing

- **No-JS (headline):** JavaScript disabled — top-level dropdown reveals on `:focus-within`; submenu renders inline; navbar collapses/expands via the hamburger checkbox; verified Chromium + Firefox, all three frameworks.
- **JS behavior:** click opens (never focus, post-`data-js`); nested submenu lifts to a `position:fixed` overlay via `OverlayController` and flips when it won't fit; first-level panel capped at `calc(100vh - 100% - 1rem)` and scrolls.
- **Reuse:** the *same* `<bs-dropdown-menu>` + `[bsDropdownItem]` renders correctly both standalone and inside `<bs-navbar>`.
- **Item styling parity:** slotted item hover/active/disabled/dark-theme match the current Bootstrap dropdown (the spike's pass criterion, re-asserted as e2e).
- **SSR:** view-source shows one `<template shadowrootmode>` per element (no double injection, correct tag boundaries); the DSD renders styled with JS off.
- **Build:** `nx build mintplayer-web-components` (codegen-wc + cem + chrome generators) + the three wrapper builds + WC unit tests green.

## Open questions

1. **Legacy `bs-dropdown-menu` collision** — rename the legacy listbox component vs mode-split the selector. Decide in planning (see "Naming & collision").
2. ~~**Inner-link styling shim**~~ **RESOLVED** — a wrapper-shipped light-DOM `.dropdown-item > a` reset stylesheet ships as a confirmed part of the design (item = `<li bsDropdownItem>` + nested `<a>`).
3. **React/Vue "directive" equivalents** — presentational component (`<BsDropdownItem>` rendering `<li className="dropdown-item">`) vs a documented class name. Recommend the presentational component for parity.

## References

- Salvage base: branch `feat/dropdown-menu-wc` (10 WCs + 3× wrappers + SSR).
- SSR/no-JS precedent (the pattern this reuses): `docs/prd/shell-wc-ssr.md`; `mp-shell` (`libs/mintplayer-web-components/shell/`).
- Current Angular navbar (behavior to preserve): `libs/mintplayer-ng-bootstrap/navbar/`, `docs/prd/navbar-noscript.md`.
- Overlay primitive: `libs/mintplayer-web-components/overlay/src/overlay-controller.ts`.
- Shadow-boundary rules: project `CLAUDE.md` ("Bootstrap utility classes do not cross the shadow boundary").
- Companion plan: `docs/prd/navbar-dropdown-menu-wc-plan.md`.

## Post-PR review fixes (2026-07-22, PR #390) — 5 navbar regressions

In-browser review of the migrated Angular navbar (Playwright) surfaced five regressions vs the legacy (master) navbar. Root causes verified live; fix design grounded in how master implemented each. **Every shadow-CSS or `render()` change requires re-running BOTH codegens** (`codegen-wc` → `*.styles.ts`, and `gen-navbar-chrome.mjs` → `mp-navbar-chrome.generated.ts`) or SSR/no-JS renders stale chrome.

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Top-level nav-links underlined | `mp-navbar-item`'s `::slotted(a)` sets `text-decoration:none` *without* `!important`; Reboot's global `a{text-decoration:underline}` wins across the boundary (the sibling `color` rule already uses `!important`). | Add `!important` to `text-decoration:none` in `navbar-item.styles.scss` + `navbar-brand.styles.scss`. |
| 2 | No slide-up-down on collapse (small mode) | `.navbar-collapse` toggles `height:0↔auto` (not animatable), `transition: all 0s`. Legacy used a 300ms Angular `@slideUpDown` height animation. | Shadow CSS: wrap the nav lists in `.navbar-collapse-inner` and animate `grid-template-rows: 0fr↔1fr` (~0.35s, honors auto height, no-JS-safe); `prefers-reduced-motion` guard. Changes `render()` → chrome regen. |
| 3 | Navbar not fixed/top/full-width (Angular demo) | The WC host is `position:static` by design (in-flow); master's Angular navbar was `position:fixed` + `top/left/right:0` + a `ResizeObserver` content padding-offset. **Angular-demo-only.** | Demo-global (scoped) `demo-bootstrap-root mp-navbar { position:fixed; inset:0 0 auto; z-index:1030 }` in `apps/ng-bootstrap-demo/src/styles.scss`; content wrapper `padding-top` = bar height (align `ViewportScroller.setOffset`). Also de-dup the WC `part="nav"` (the start `<ul>` wrongly reuses it → rename to `part="nav-start"`). No WC default change; React/Vue unaffected. |
| 4 | Nested dropdowns pulled into a `fixed` overlay even in small mode | `navbar-dropdown.styles.scss` positions panels `absolute`/`fixed` unconditionally (no breakpoint gate), and `mp-navbar-dropdown` **always** constructs the `OverlayController` for submenus. The descendant dropdown has no knowledge of the navbar `breakpoint`. Legacy used JS `isSmallMode` → `showInOverlay=!isSmallMode` (overlay only in wide mode; inline below). | `mp-navbar` publishes the breakpoint as an inherited CSS var `--mp-navbar-breakpoint` (+ `data-breakpoint`). Default dropdown CSS = **inline** (`position:static`) — the no-JS baseline; with JS, `mp-navbar-dropdown` reads the breakpoint, sets `data-expand="<bp>"` on itself, and `media-breakpoint-up` rules re-enable first-level `absolute`; the `OverlayController` is **gated behind `matchMedia(min-width)`** (constructed/engaged only in wide mode, closed + `change`-listener re-eval on resize, cleaned up in `disconnectedCallback`). Small mode (and no-JS) → inline. |
| 5 | Dark-mode toggler lines are dark (near-invisible) | The compiled navbar bakes `--bs-navbar-toggler-icon-bg` to an SVG with `stroke=rgba(33,37,41,.75)`; the light-stroke swap is `[data-bs-theme=dark] .navbar-toggler-icon`, but `data-bs-theme` doesn't cross the shadow boundary and adaptive `color="body-tertiary"` leaves the host theme unset. | Shadow CSS: drop the baked SVG `background-image`; render the hamburger as a `mask` + `background-color: var(--bs-navbar-color)` (the theme-aware token that already inherits across the boundary). Follows page theme for adaptive colors AND solid colors, no host `data-bs-theme` needed. |

Implementation order: #1, #5, #3, #2, #4 (isolated → most surface). Verify each in-browser (wide + narrow + dark). Follow-up still open: per-item active-route highlighting.

### Round 2 (2026-07-22) — `positioning` input + spacing parity vs the live (master) navbar

- **`positioning="fixed"` is now a real `mp-navbar` input** (not a demo-only CSS hack). `:host([positioning="fixed"])` → `position:fixed; inset:0 0 auto; width:100%; z-index:1030`. Bridged through the ng/react/vue wrappers. The **Angular demo** sets `[positioning]="'fixed'"` (preserving the pre-WC fixed bar) + a content `padding-top`; React/Vue leave it in-flow. Fix #3's demo-only `bs-navbar{position:fixed}` rule is removed.
- **Spacing regressions restored** by comparing computed styles against the live site (which runs master). In small mode:
  - **Brand centered** — `::slotted([slot="brand"]) { margin-inline: auto }` in the narrow media block (auto margins center the brand, toggler stays right). Matches master (brand host resolved to `margin: … auto`).
  - **Nested submenu inset** — `:host([data-submenu]) ::slotted(...) { margin: 0 0.5rem }` (was master's `.submenu { margin: 0 .5rem }`).
  - **First-level right inset** — `:host(:not([data-submenu])) ::slotted(...) { margin-inline-end: 1rem }` (was master's `.dropdown-menu.me-3`); reset to `0` in the wide floated-overlay rule.
  - Item padding (`4px 16px`) and navbar padding (`8px 0`) already matched master via the compiled Bootstrap partials.
  - Verified in-browser: fixed bar top/full-width; brand centered; first-level `margin: 0 16px 0 0` and submenu `0 8px` in small mode (identical to live); wide overlay unaffected.

### Round 3 (2026-07-22)

- **Dismiss-on-navigate.** `mp-navbar` listens for clicks; when a real nav link (`<a href>` — a routerLink renders one; dropdown *triggers* are `<a role="button">` without `href`, excluded) is clicked it `close()`s every descendant `mp-navbar-dropdown` and `toggle(false)`s the collapse — so the menu slides shut in small mode (no-op in wide) and open dropdowns close (both modes). Added a public `close()` to `mp-navbar-dropdown` (closes the overlay + the inline `data-open`). Verified: clicking a leaf link navigates, closes the dropdown, and collapses the bar.
- **First-level dropdown left inset (small mode).** Changed the first-level panel from `margin-inline-end: 1rem` to `margin: 0 1rem` so it isn't glued to the window's left edge; still reset to `0` by the wide floated-overlay rule (wide unaffected). Verified `margin: 0px 16px` in small mode, `0` in wide.

### Round 4 (2026-07-22) — SSR chrome files are gitignored build artifacts

The `*-chrome.generated.ts` DSD files were mistakenly committed for navbar + dropdown (shell's was already gitignored per `.gitignore` `libs/mintplayer-web-components/**/*.generated.ts`). They are build artifacts (each `codegen-<name>-chrome` declares the file as its `outputs`), so they are now **untracked + gitignored**, consistent with shell. To keep them regenerated on a clean build, a new aggregate target **`mintplayer-web-components:codegen-ssr-chrome`** (fans out to `codegen-{shell,navbar,dropdown}-chrome`) replaces the per-component chrome deps in the demo builds — the ng/vue/react demo build(-ssr) targets now `dependsOn` the single aggregate (also fixes react, which previously regenerated no chrome). Verified: deleting all three then `nx build ng-bootstrap-demo` regenerates them via the aggregate. See CLAUDE.md → "SSR chrome codegen" for the durable convention.

### Round 5 (2026-07-22) — demo move, fixed-bar scroll, version bumps, e2e coverage

- **Demo relocation.** The navbar demo page moved from `pages/overlay/navbar` → `pages/enterprise/navbar` (route `/enterprise/navbar`; menu item under the **Enterprise** dropdown, removed from Overlays). `overlay.routes.ts` / `enterprise.routes.ts` / `app.component.html` updated. Verified in-browser.
- **Fixed-bar small-mode scroll.** When `positioning="fixed"` and the open menu exceeds the viewport, the bar now caps at `max-height: 100dvh` with `overflow: hidden auto` (restores the pre-WC `max-height:100%; overflow-y`). **CSS gotcha locked in:** both host attributes must live INSIDE `:host(...)` — `:host([breakpoint=x])[positioning=fixed]` (i.e. `&[positioning=fixed]` nested under the `:host([breakpoint])` block) does NOT match the host; emitted instead as its own top-level per-breakpoint `media-down` block `:host([breakpoint=x][positioning=fixed])`.
- **Scrollbar hidden** on that fixed/scrolling bar via `scrollbar-width: none` + `::-webkit-scrollbar { width:0 }` (cross-platform). Chosen over the pre-WC Windows-only `.os-windows { margin-right:-17px }`, which assumes a 17px classic scrollbar + OS detection the framework-agnostic WC lacks and would clip content on overlay-scrollbar platforms.
- **`serve` regenerates SSR chrome.** The e2e webServer is `nx serve ng-bootstrap-demo --configuration=production` (an SSR dev-server — `build` has `server: server.ts` + `ssr`, and `server.ts` injects the DSD). Since the chrome is gitignored, `ng-bootstrap-demo:serve` now also `dependsOn mintplayer-web-components:codegen-ssr-chrome` (nx-cached) so a fresh checkout's SSR/no-JS path has the generated chrome.
- **Version bumps:** web-components `2.0.2→2.1.0`, ng-bootstrap `22.4.0→22.5.0`, react-bootstrap `19.6.0→19.7.0`, vue-bootstrap `3.7.0→3.8.0`.

### Test coverage (behavior lock-in)

The navbar behavior/layout is locked by **Playwright e2e**, not the WC unit tests — jsdom (`nx test mintplayer-web-components`) has no layout engine/media queries, so it can't assert margins/`position`/centering/scroll/`:focus-within`. Specs in `apps/ng-bootstrap-demo-e2e/e2e/`:

- **`navbar.spec.ts`** (JS enabled, chromium + firefox, 11 tests) — nav-links not underlined; `positioning=fixed` → fixed/top/full-width; first-level opens as an absolute overlay; **switching dropdowns** (real trusted clicks exercising the mousedown outside-close path); nav-link click dismisses + navigates; small-mode: hamburger toggles collapse (slide), brand centered, dropdowns inline with the 1rem first-level / 0.5rem submenu insets, fixed-bar internal scroll when the menu exceeds a short viewport; dark-mode toggler icon is light (luminance).
- **`navbar-nojs.spec.ts`** (`javaScriptEnabled: false`, chromium + firefox) — the server-rendered DSD attaches with no upgrade (shadow chrome + slotted nav links present), and the hamburger drives the collapse via the **native `<label for>` → in-shadow `<input type=checkbox>`** (`:checked ~ .navbar-collapse`), asserted two-way with `toBeChecked()`. Note: with JS disabled `page.evaluate`/computed-style is unavailable, and the collapse reveal is a *paint-clip* (`overflow:hidden` + grid `0fr↔1fr`) that leaves bounding boxes unchanged — so it can't be measured geometrically (unlike `mp-shell`'s off-screen translate). The native checked-state is the honest, observable proxy for the CSS reveal it gates.

Not covered by unit tests (deliberately — layout can't be asserted in jsdom); the pure-DOM bits (`close()`, `data-expand` derivation, roving roles) remain a possible future jsdom unit-test add.

## Angular API re-alignment over the frozen WC (2026-07-22)

**Problem raised:** the migration changed the *public Angular authoring API* severely, and in ways that quietly break the library's own conventions. Two smells:
1. **`slot="end"` leaks the WC's shadow-slot name** into consumer templates. `bs-navbar-brand` correctly hides its slot (`host:{'[attr.slot]':"'brand'"}`); the start/end grouping does not — so right-aligning an item means writing a raw WC attribute. Information-hiding violation.
2. **`<bs-navbar-nav>` disappeared** and dropdown items changed from the uniform `<bs-navbar-item><a>…</a></bs-navbar-item>` idiom (at every nesting level) to `<bs-dropdown-menu>` + raw `<li bsDropdownItem>`.

**Principle that unblocks the fix:** shadow-DOM encapsulation hides the WC's *internals*; it does **not** constrain the light DOM we feed it. Angular wrapper components can render exactly the flat, slot-tagged structure `mp-navbar`/`mp-dropdown-menu` expect — so we can restore the old ergonomic Angular API **without changing the (final) WC**. The WC stays the single source of UI truth; the wrappers become richer authoring sugar over it.

### Feasibility (investigated — two read-only agents; WC contracts + old-API audit)

| Old-API element | Verdict | Mechanism / note |
|---|---|---|
| **`<bs-navbar-nav [align]>`** grouping container | ✅ **Works** | Host `[attr.slot]="align==='end' ? 'end' : null"` + `display:contents`. Authored inside `<bs-navbar>`, the `<bs-navbar-nav>` host is projected as a **direct** child of `<mp-navbar>` (so it is slotted); `display:contents` elides its box so its `<bs-navbar-item>` children become the flex children of the WC's `<ul class="navbar-nav">`. **This is the identical display:contents-flattening the WC already relies on** for its own default slot + `.navbar-collapse-inner` — the wrapper just adds one more level of the same kind. Custom props (`--bs-nav-link-*`, `--mp-navbar-breakpoint`) inherit straight through. |
| **`<bs-navbar-nav [collapse]>`** | ❌ **Blocked** | The WC has ONE collapse region wrapping *both* nav groups; there is no per-group collapse hook. Drop the input (or accept it as a documented no-op). Not restorable without changing the WC. |
| **Uniform `<bs-navbar-item><a></bs-navbar-item>` as a dropdown item** | ⚠️ **Works with caveat** | `bs-navbar-item` must become **context-aware**: `bs-dropdown-menu` / `bs-navbar-dropdown` provide an injection token; inside a menu the item renders `<li class="dropdown-item"><a>…` (the light DOM `mp-dropdown-menu` queries — it does `querySelectorAll('.dropdown-item')` scoped by `closest('mp-dropdown-menu')===this`, control = `item.querySelector('a,button')`), instead of its normal `<mp-navbar-item>` (`.nav-link`) render. **Caveat:** the companion link-reset sheet uses a **direct-child** combinator `.dropdown-item > a`, so the anchor must stay an immediate child (no `mp-navbar-item` in between). Dual-mode component, not "reuse unchanged". |
| **`<bs-navbar-toggler>` / `*bsExpandButton`** (custom/consumer toggler) | ❌ **Blocked** | The hamburger is a **shadow-internal no-JS CSS state machine** (`<input type=checkbox>` + `<label for>` + `:checked ~`). A light-DOM consumer toggler can't join that `:checked` machine (checkbox is in the shadow) → **no-JS-dead**, defeating the WC's central no-JS guarantee; a JS-only toggler duplicates the built-in one. Recommendation: **don't restore as functional.** Keep programmatic control via `[expanded]`/`(expandedchange)`; if the symbol must exist for source-compat, ship a documented no-op/deprecation marker. |
| **`[bsNavbarTrigger]`** (non-navigating active-state anchor) | ✅ **Works** (wrapper directive) | Pure Angular-router concern (sets `.active` on URL match, never navigates). Only needed if we restore the *trigger-anchor* dropdown idiom; the current `<bs-navbar-dropdown [label]>` (WC owns the trigger) is cleaner and is **recommended to keep** instead. |
| **`[bsNavbarContent]="nav"` + `#nav`** (fixed-bar content padding) | ✅ **Works** (wrapper directive) | `ResizeObserver` on the `bs-navbar` host → `padding-top` on page content; replaces the current hard-coded `padding-top:76px`. Optional ergonomic nicety. |
| **CDK `DomPortal` overlay-pull of nested submenus** | ➖ **N/A — superseded** | Deliberately replaced by the WC's self-contained `position:fixed` shadow dropdown. CDK overlays can't cross the shadow boundary anyway; nothing to restore. |

### Recommended re-aligned API (over the unchanged WC)
```html
<bs-navbar [color]="'body-tertiary'" [breakpoint]="'lg'" [positioning]="'fixed'">
  <bs-navbar-brand><a routerLink="/">ng-bootstrap</a></bs-navbar-brand>

  <bs-navbar-nav>                         <!-- start group (default slot) -->
    <bs-navbar-item><a routerLink="/">Home</a></bs-navbar-item>
    <bs-navbar-dropdown [label]="'Basic'">
      <bs-navbar-item><a routerLink="/basic/alert">Alert</a></bs-navbar-item>   <!-- context-aware -->
      <bs-navbar-dropdown [label]="'Forms'"> … </bs-navbar-dropdown>            <!-- recursive -->
    </bs-navbar-dropdown>
  </bs-navbar-nav>

  <bs-navbar-nav align="end">             <!-- end group (slot="end") -->
    <bs-navbar-item><demo-theme-toggle /></bs-navbar-item>
  </bs-navbar-nav>
</bs-navbar>
```
No raw `slot=`, no raw `<li bsDropdownItem>`, no `<bs-dropdown-menu>` boilerplate inside the navbar; `<bs-navbar-nav align>` restores the familiar grouping and hides the slot. `bs-dropdown-menu` + `[bsDropdownItem]` **remain** the public API for **standalone** menus (typeahead / tree-select / `[bsDropdown]`) — the navbar just stops requiring consumers to hand-assemble them.

### Constraints locked in by the investigation
- **`display:contents` grouping must be static** (component stylesheet or static host binding), **never applied via `afterNextRender`/JS** — else a no-JS layout flash. SSR/DSD-safe as pure CSS.
- **Context-switching item render is a compile-time structural branch** (identical server-side) — SSR-safe.
- **Cross-browser spike: ✅ PASSED (2026-07-22, Chromium + Firefox, 4/4).** `display:contents` on a slotted wrapper flattens its `mp-navbar-item` children into the shadow `.navbar-nav` flex layout in **both** alignment groups: wide mode — grouped items are row peers of bare items (equal vertical centers), the `end` group right-aligns via `margin-inline-start:auto`, and link colors reach through the extra display:contents level; narrow mode — grouped items stack in the revealed collapse like bare items. (Throwaway spec `_spike-nav-grouping.spec.ts`, dynamic injection into the live demo navbar; deleted after this verdict.) The grouping API is GO.
- **React/Vue parity:** this is Angular *authoring ergonomics* — the WC contract is identical across frameworks, so correctness never depends on it. The grouping container + context-aware item can be mirrored in React/Vue (same display:contents+slot mechanism) but that's a deliberate opt-in; until then Angular gains `<bs-navbar-nav>` that React/Vue lack. `[collapse]` is unsupportable everywhere — don't expose it in any framework.

### Open scope decisions (need confirmation before implementation)
1. **How far to re-align:** (A) minimal — just add `[align]` to items to kill the `slot="end"` leak; (B) **recommended** — restore `<bs-navbar-nav [align]>` grouping + context-aware `bs-navbar-item` dropdown items; (C) maximal — also restore `bsNavbarTrigger` trigger-anchor idiom + `bsNavbarContent`/`#nav` + no-op toggler shim.
2. **Dropdown-item authoring:** keep `<li bsDropdownItem>` inside the navbar, or make `bs-navbar-item` dual-mode so items are uniform at every level (option B). Standalone `bs-dropdown-menu` keeps `[bsDropdownItem]` regardless.
3. **Toggler symbols:** omit entirely (breaking) vs ship a no-op/deprecated `bs-navbar-toggler`/`*bsExpandButton` for source-compat.
4. **Ship in PR #390 or a follow-up PR** (this is additive wrapper surface over a frozen WC, so it can land separately without touching the WC).

### Scope decision + animated-toggler investigation (2026-07-22, round 2)

**User decisions:** scope **C (maximal)** confirmed — which subsumes B (grouping container + dual-mode items), so open decisions 1–2 above are resolved. Additionally: **re-introduce the animated hamburger→X ("cross") toggler** on the navbar. Decision 3 is superseded by the investigation below (the WC owns the animated cross; no shim). Decision 4 (PR #390 vs follow-up) is **still open** — recommendation: follow-up PR (additive surface; #390 is green and review-gated).

**Status-quo correction:** the standalone `@mintplayer/ng-bootstrap/navbar-toggler` lib was **never deleted** — it still exists and `advanced/toggle-buttons` still uses `<bs-navbar-toggler [(state)]>` standalone. What the migration lost is the animated cross **on the navbar itself** (the WC toggler is a static masked SVG). "Re-introduce" therefore means: restore the animated X on the navbar's own toggler — not resurrect a deleted component.

**Old visual, recovered verbatim from `master`** (reproduce faithfully): three bars `25px×2px`, `margin: 6px 0`, `transition: 0.4s` (all-props, ease), no keyframes, default transform-origin. Open state by `nth`: bar 1 `rotate(-45deg) translate(-7px, 5px)`; bar 2 `opacity: 0`; bar 3 `rotate(45deg) translate(-6px, -4px)`. **Rotate-then-translate order is load-bearing** — the translate runs in the bar's already-rotated coordinate space; reordering misaligns the X. Color: old used `var(--bs-secondary-color)`; the WC version should use `var(--bs-navbar-color)` — the theme-aware token its current masked icon already uses (correct across the shadow boundary for adaptive and solid navbar colors).

**Mechanism verdicts** (crux: does the X-morph *state* work with JS disabled?):

| Mechanism | no-JS X-morph | no-JS click | Verdict |
|---|:---:|:---:|---|
| **1. WC-internal bars** — replace the icon span with 3 shadow bar spans; X driven by the existing sibling machine `.navbar-toggle:checked ~ .navbar-toggler .navbar-toggler-bar` | ✅ | ✅ | **RECOMMENDED** |
| 2. `slot="toggler"` inside the shadow `<label>` + custom-property state bridge (`:checked ~ .navbar-toggler ::slotted([slot=toggler]) { --mp-toggler-open: 1 }`; consumer glyph derives transforms via `calc()`) | ✅ | ✅* | Viable, over-scoped |
| 3. `::part(toggler)` styling only (no WC change) | ❌ | ✅ | Reject |
| 4. JS-only light-DOM toggler calling `navbar.toggle()` | ❌ | ❌ | Reject |

**Key finding — a zero-WC-change animated toggler is impossible.** The open/closed state lives in the in-shadow checkbox; with JS off nothing can reflect it to the host, `::part()` cannot select the part's descendants, and consumer CSS can never see the shadow `:checked`. Every no-JS-correct option is a WC change, so the minimal one wins: **option 1**, the same `:checked ~` sibling pattern that already reveals the collapse (DOM order verified: checkbox precedes the label). No new component in any framework; the WC owns the animated cross as its default toggler (WC = single source of UI truth). `::part(toggler)` stays for consumer padding/border tweaks; bars join the existing `prefers-reduced-motion` block; the mask custom property is dropped. Effort ~half a day incl. codegen + one e2e assertion.

Option 2 (kept in the back pocket, only if consumer-swappable toggler graphics ever become a real requirement) is technically sound — custom properties set on a slotted element inherit into its light-DOM subtree, and the *derived* transform/opacity longhands transition when the var flips — with one hard constraint worth recording: **native label activation does not forward clicks from interactive descendants**, so a slotted toggler must render `<div>`/`<span>` bars, never a `<button>`/`<a>`, or the no-JS click dies.

**Host `expanded` reflection:** not needed and wouldn't help — with JS off nothing runs to reflect it (that's exactly why the design keys off in-shadow `:checked`). One-liner later if JS-present consumers ever want `:host([expanded])` styling; orthogonal to this work.

**No-JS technique noted for the record (from the user):** tri-state controls sometimes use a checkbox's `indeterminate` as the default "auto" state. Caveat that governs its use here: `indeterminate` is a DOM **property with no HTML attribute** — a script-free document can never start a checkbox `:indeterminate` (it parses unchecked), so nothing load-bearing for no-JS may hang off it. The natively no-JS tri-state is a **radio group with no `checked`** (all radios match `:indeterminate` with zero script). Irrelevant to the binary navbar toggle; recorded for future no-JS state machines.

#### Toggler design finalized (2026-07-22, round 3): slot + fallback hybrid

User requirements added: consumers must still be able to supply their **own** toggler with state binding, and a worry was raised about the default toggler flashing in noscript before JS swaps in a custom one. Resolution — options 1 + 2 combine cleanly, and **the flash cannot happen**:

- The WC renders `<slot name="toggler">` inside the shadow `<label>`, with the **default animated bars as the slot's fallback content**. No slotted toggler → default cross. 
- **Slot assignment is a parse-time parser behavior under DSD, not JS** — the server HTML contains both the fallback (inside the shadow slot) and the consumer's slotted glyph, and the browser assigns the glyph at parse time, so fallback bars are never painted when a custom toggler exists. First paint shows the custom toggler, JS or no JS. The "default in noscript, custom after JS" model (which *would* flash) is therefore unnecessary and rejected.
- **Custom toggler is a first-class noscript citizen:** click forwards to the checkbox via native label activation (constraint: the slotted glyph must NOT be interactive — no `<button>`/`<a href>`, labels don't forward clicks from interactive descendants); open-state arrives via the custom-property bridge `.navbar-toggle:checked ~ .navbar-toggler ::slotted([slot="toggler"]) { --mp-navbar-expanded: 1 }` — the glyph's own CSS derives the morph (`transform: rotate(calc(var(--mp-navbar-expanded, 0) * 45deg))`, `opacity: calc(1 - var(--mp-navbar-expanded, 0))`); transitions sit on the derived longhands, so they animate.
- **JS state binding** (a boolean in TS) stays on `bs-navbar`: `[expanded]` / `(expandedchange)`.
- **Angular sugar:** a `[bsNavbarToggler]` directive sets `slot="toggler"` on its host (no leaked slot names, per the re-alignment principle). The standalone `@mintplayer/ng-bootstrap/navbar-toggler` lib stays untouched for standalone use — and must NOT be slotted as-is (it renders a `<button>`).

**PR target resolved (user): Phase 7 ships in PR #390.**

**Implemented (2026-07-22):** all of the above shipped — `bs-navbar-nav [align]`, context-aware `bs-navbar-item`, menu-owning `bs-navbar-dropdown`, the animated slot+fallback toggler, `[bsNavbarToggler]`, `[bsNavbarContent]` — with the demo fully migrated to the re-aligned API. See the plan's "Phase 7 — EXECUTED" section for commits and deviations (notably: the demo now hydrates — `provideClientHydration(withEventReplay())` — so `bsNavbarContent` must remove its own SSR-inline approximation before measuring the author baseline; and `bsNavbarTrigger` was deliberately not restored).

## Round 6 (2026-07-22) — dropdown-switch bug + templated trigger label

### Dropdown switch required two clicks (asymmetric) — root cause + fix

**Report:** with "Overlays" open, clicking "Advanced" closed Overlays but did NOT open Advanced (second click needed); the reverse direction worked. Two-agent investigation (live repro + static analysis):

- **Root cause — the mousedown-close / click-open split, exposed by real-pointer drift.** The open dropdown was dismissed by a document *mousedown* capture listener while the new one opened on *click*. A real pointer that drifts a few px downward between press and release (normal with a mouse; the trigger's bottom edge is flush with the panel top) then loses the click: the sibling's panel is yanked out **mid-gesture**, mousedown/mouseup hit-test targets diverge, and the browser retargets `click` to their **common ancestor** (`mp-navbar`) — the trigger's `@click` never fires. Reproduced exactly (down y=50 → up y=58: Overlays closes, Advanced stays shut; clean second click opens it).
- **Why asymmetric:** pure geometry. Overlays' panel (`inset-inline-start: 0`, wider than its trigger) bleeds ~106px rightward **directly under the Advanced trigger** — a live drift zone. Advanced's panel opens entirely to the *right* of the Overlays trigger — no overlap. The code was symmetric; the layout wasn't.
- **Why the e2e missed it (doubly blind):** Playwright's trusted `.click()` presses and releases at the exact same coordinate (zero drift — a genuinely working gesture), and the switching test asserted only the `data-open`/`data-menu-open` flags, not computed visibility.
- **Why legacy master didn't show it:** the old navbar dismissed via `(clickOutside)` and toggled on the same `click` — open+close rode one already-targeted event. (Note: unifying dismissal onto `click` alone would NOT fix the drift case — the release still lands in the still-open panel and the click still retargets.)
- **Fix (user-approved): resolve the whole gesture at PRESS time.** The trigger toggles on `mousedown` — the same event the sibling's document capture listener closes on — so close+open ride ONE event in guaranteed order (document capture before target), and everything is decided while the pointer is still on the trigger; drift/click-retargeting become irrelevant. Native-menu feel (macOS/Windows menus open on press). No `preventDefault` (it would suppress focus); `user-select: none` on the toggle instead. Keyboard (`Enter`/`Space`/`Escape`) and no-JS `:focus-within` untouched; OverlayController needs no change (submenu open now also rides mousedown via the shared `#toggle`).
- **e2e hardened against both blind spots:** the switching test now asserts computed `display` (not just flags), and a new **drifting-pointer test** reproduces the exact reported gesture (`mouse.down` near the trigger's bottom edge, `mouse.move` a few px lower, `mouse.up`) and requires the panel to open from that single gesture.

### No-JS submenu styling gap — `data-submenu` marked server-side

**Report:** with JavaScript disabled, a submenu trigger (Basic → Forms) rendered flush-left — missing the dropdown-item padding — while JS-enabled was correct. Suspected dev-server caching; **actual cause was a real gap**: every submenu-specific shadow style (`padding: 0.25rem 1rem` trigger, right caret, 0.5rem panel inset) is gated on `:host([data-submenu])`, and `data-submenu` was set only in `connectedCallback` — JS. A no-JS page never sets it, so the trigger fell back to first-level nav-link padding (`0.5rem` left vs the items' `1rem`).

**Fix:** `injectMpNavbarDsd` now runs a `markSubmenus` pre-pass — a depth scan over the serialized HTML that adds `data-submenu=""` to any `<mp-navbar-dropdown>` open tag lexically nested inside `<mp-dropdown-menu>` (the same structural fact the runtime's `closest('mp-dropdown-menu')` checks). Idempotent (skips already-marked tags); hydration-safe (JS re-sets the identical attribute); benefits all three demo servers (they share the injector). `:host-context()` was rejected as the CSS-only alternative — Firefox/Safari never shipped it. Locked in by a new `navbar-nojs.spec.ts` test: every nested dropdown carries `data-submenu`, no first-level one does.

### Top-level nav-link click didn't collapse the bar — `:focus-within` gate

**Report (small mode):** clicking a dropdown leaf (Basic → Alert) collapsed the bar; clicking the top-level "Home" link didn't. **Cause:** the collapse has two reveal paths — `:checked` and the no-JS keyboard path `.navbar-collapse:focus-within` — and the latter was **not** gated on `data-js` (the dropdown WC gates its own focus-within reveal; the navbar's never got the same treatment, and `mp-navbar` never set `data-js` at all). Dismiss-on-navigate correctly unchecked the checkbox in both cases, but a top-level link **stays visible**, so focus rests on it inside the collapse and `:focus-within` holds the menu open; a dropdown leaf hides on close (its panel goes `display:none`), drops focus, and released the reveal — which masked the bug. Verified live: after clicking Home, `checked=false` yet `grid-template-rows` stayed open with `document.activeElement` = the Home anchor.

**Fix:** `mp-navbar` sets `data-js` in `connectedCallback` (mirroring `mp-navbar-dropdown`) and the reveal becomes `:host(:not([data-js])) .navbar-collapse:focus-within` — focus-within is now a **no-JS-only** path, matching the legacy navbar (focus-within lived in `.noscript` rules there; see the "click, never focus, in JS-enabled tests" convention). Hydrated keyboard users still toggle via the focusable checkbox. Locked in by a small-mode e2e test that clicks the top-level Home link and asserts the collapse slides shut.

## Round 7 (2026-07-22, post-squash, branch `feat/navbar-wc-a11y`) — accessibility restoration

PR #327 ("library-wide ARIA pass") had made the legacy navbar accessible; #390 deleted that navbar (and its `navbar.aria.spec.ts`) without porting the contract to the WC. Two-agent investigation (contract extraction from `1532fe01` + live keyboard audit) mapped the gaps; user confirmed the missing rounded focus ring first-hand. Re-established on the WC (all four milestones):

- **Toggler focus ring (WCAG 2.4.7):** focus lives on the visually-hidden 1×1 checkbox — its own outline is invisible, and the label (`aria-hidden`) never receives focus, so Bootstrap's `.navbar-toggler:focus` ring was dead. Fixed with `.navbar-toggle:focus-visible ~ .navbar-toggler { border-radius; box-shadow }` (currentColor — theme-aware; wraps custom slotted toggler glyphs too).
- **Disclosure-button semantics:** `role="button"` on the checkbox + Enter support (native checkboxes only toggle on Space); `aria-controls` → the real shadow collapse id.
- **Stale-aria fix:** one `#setExpanded` write path (checked + `aria-expanded` + emit). Programmatic `toggle()`/`[expanded]`/dismiss-on-navigate used to leave `aria-expanded` lying (proven live: `checked:false, aria:"true"`), because only the checkbox `change` handler synced it and programmatic `.checked =` writes don't fire `change`.
- **Collapsed menu out of the tab order (JS mode):** the 0fr grid row only paint-clips — links stayed focusable, so keyboard users tabbed into invisible content (worse after the Round-6 `data-js` gate removed the accidental focus-reveal; even #327 never fixed this). `visibility: hidden` on the collapsed region, with a `--mp-collapse-hide-delay` custom property riding the base transition so the hide waits for the slide-shut while the reveal is instant. **Gotcha caught by e2e:** the delay var is set per-MODE, not per-direction — the reveal rule must reset it to `0s` or opening inherits the exit delay and links stay unfocusable for 0.35s. Specificity managed with `:where()` around the host attributes (no `!important`/reduced-motion fights). The no-JS `:focus-within` reveal keeps focusable links (`data-js` gate).
- **Dropdown trigger `aria-expanded`:** never set before; now mirrored from BOTH open flags (`data-open` inline / `data-menu-open` overlay) via `observedAttributes`.
- **Keyboard menu entry/exit:** ArrowDown on a trigger opens + focuses the first item control (the menu's roving keydown lives on a slot SIBLING the trigger's events can never reach — Tab used to be the only way in); Escape handled at the HOST level (composed keydown — works from the shadow trigger or inside the slotted menu), closes the innermost open dropdown, returns focus to its trigger; closed hosts let it bubble so nested submenus unwind one level per press.
- **Checkbox-vs-focus-within design note (user question):** the checkbox is NOT replaceable by `:focus-within` — focus-within pierces shadow boundaries fine (flat tree; we already use it), but it can't give a no-JS **mouse** toggle (Safari/macOS Chrome don't focus buttons on click — the legacy code's own documented reason), isn't sticky (menu shuts when focus leaves), and can't close while the toggler holds focus. The checkbox + focus-within pair each cover what the other can't; scoping the reveal to the collapse (not the host) and gating it on no-JS are both deliberate (close-then-reopen bug; disclosure pattern).
- **Tests:** `mp-navbar.aria.spec.ts` (9 jsdom tests: role/name/expanded sync incl. programmatic + attribute, aria-controls id match, landmark label, both open-flag mirrors, ArrowDown focus, Escape focus-return) + 4 e2e keyboard tests (visible rounded ring on Tab, collapsed menu skipped, expanded menu tabbable again, ArrowDown/Escape flow) — chromium + firefox.

### Templated dropdown trigger (`*bsNavbarDropdownLabel`) — `[label]` removed

**User decisions:** items/brand were already fully templatable (arbitrary projected HTML; constraint: the interactive control should be a DIRECT-child `<a>`/`<button>` for full Bootstrap fidelity — nav-link styling, whole-row link reset, `role=menuitem` placement). The one text-only spot was the trigger label. Resolution: **remove the `[label]` string input entirely** (pre-squash, no fallback) and make the trigger a **structural-directive template** — `<span *bsNavbarDropdownLabel>…</span>` — captured via `contentChild.required` and rendered into the WC's `label` slot with `ngTemplateOutlet`. **Repo idiom note (user correction): consumer-authored template content in wrappers uses structural directives + `ngTemplateOutlet` (`*bsRowTemplate` precedent), NOT `<ng-content select>`** — the first cut used ng-content select and was reworked. Accessible name derives from the template content (icon-only labels need `aria-label`). React/Vue already take the WC `label` slot directly — all three frameworks now share the same templated-label model.
