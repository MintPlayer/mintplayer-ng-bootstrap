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
