# PRD: `mp-navbar` — cross-framework navbar WC with no-JS SSR

Status: **Draft / investigation**. Companion to [`shell-wc-ssr.md`](./shell-wc-ssr.md) (the precedent) and [`navbar-noscript.md`](./navbar-noscript.md) (the Angular noscript contract this must preserve).

## 1. Problem

`<bs-navbar>` is Angular-only. It lives entirely in `libs/mintplayer-ng-bootstrap/navbar/` as a family of `@Component`/`@Directive` classes, and its no-JS behaviour is implemented with Angular-specific machinery:

- The collapse/expand state machine is a `::ng-deep` CSS rule set on a light-DOM `.navbar` that pierces Angular's emulated encapsulation (`navbar.component.scss`).
- The SSR-only hamburger (`<input type="checkbox" class="navbar-toggler-checkbox visually-hidden">` + `<label for>`) is emitted by an `@if (isServerSide)` template branch (`navbar.component.html:7-54`).
- The `.noscript` class that gates every no-JS reveal rule is toggled by `BsNoNoscriptDirective` (server adds it, hydration removes it).
- Sub-dropdowns use `@angular/cdk/overlay`; the collapse animation uses `@mintplayer/ng-animations` (`[@slideUpDown]`); IDs come from the injectable `BsIdService`; active-link tracking subscribes to `Router.events`.

React and Vue consumers have no equivalent. We want the navbar available to all three frameworks with the **same no-JS-first behaviour**, following the exact pattern already proven for the shell: a framework-agnostic **Lit** web component that ships its interactive state machine inside its own shadow root, server-rendered as **Declarative Shadow DOM (DSD)** so it is fully functional before (and without) any JavaScript, with thin per-framework wrappers.

## 2. The central architectural problem (read this first)

`mp-shell` was *easy* to put in a shadow root because it uses **no Bootstrap component classes** — it hand-writes its own flex layout and only pulls in Bootstrap's Sass *functions, variables and breakpoint mixins* to compute media queries (`shell.styles.scss:1-3`). Nothing Bootstrap-styled is slotted; the consumer drops fully-styled content into named slots.

The navbar is the opposite. Today it relies on the **entire Bootstrap navbar/nav/dropdown CSS**, compiled into the component via:

```scss
// navbar.component.scss
::ng-deep {
    @import "node_modules/bootstrap/scss/dropdown";
    @import "node_modules/bootstrap/scss/nav";
    @import "node_modules/bootstrap/scss/navbar";
}
```

Those rules style `.navbar`, `.navbar-nav`, `.nav-link`, `.dropdown-menu`, `.dropdown-item`, `.navbar-toggler`, `.navbar-brand`, `.navbar-collapse` — and crucially **most of those elements are consumer-authored light-DOM content** (`<a class="nav-link">`, dropdown items), with the `.nav-link` / `.dropdown-item` classes added *imperatively* in `ngAfterContentChecked` (`navbar-item.component.ts:67-89`, `navbar-brand.component.ts:16-20`).

Bootstrap CSS does **not** cross a shadow boundary (recorded in our own conventions). So any shadow-DOM design must answer: **who renders the styled nav items, and where does their Bootstrap CSS come from?** There are two viable shapes, and the choice drives everything else (API, SSR, wrappers, breaking-change surface). They are laid out in §4; §5+ assume the recommended one and note where the alternative diverges.

## 3. Current public API (what must be preserved or consciously broken)

From `libs/mintplayer-ng-bootstrap/navbar/src/index.ts`:

| Export | Kind | Key surface |
|---|---|---|
| `BsNavbarComponent` (`bs-navbar`) | component | inputs: `autoclose=true`, `ariaLabel='Main navigation'`, `collapseId`, `color`, `breakpoint='md'`; public signal `isExpanded`; `expandButtonTemplate` |
| `BsNavbarBrandComponent` (`bs-navbar-brand`) | component | named-slot logo; `routerLink` (declared, unused) |
| `BsNavbarNavComponent` (`bs-navbar-nav`) | component | `collapse=true`; holds the `.navbar-collapse` + `[@slideUpDown]` |
| `BsNavbarItemComponent` (`bs-navbar-item`) | component | `<li>`; derives dropdown/leaf state from injected parents |
| `BsNavbarDropdownComponent` (`bs-navbar-dropdown`) | component | `autoclose=true`; `isVisible` signal; CDK overlay for sub-menus |
| `BsNavbarTriggerDirective` (`[bsNavbarTrigger]`) | directive | `bsNavbarTrigger` (required url(s)); `isActive` |
| `BsExpandButtonDirective` (`[bsExpandButton]`) | directive | custom hamburger template, ctx `$implicit: isExpanded()` |
| `BsNavbarContentDirective` (`[bsNavbarContent]`) | directive | top-padding offset for fixed navbar via `ResizeObserver` |
| `NavLinkDirective`, `DropdownToggleDirective` | internal | auto-class adders; not for end use |

A consumer writes, today:

```html
<bs-navbar color="primary" breakpoint="lg">
  <bs-navbar-brand><a routerLink="/">MyApp</a></bs-navbar-brand>
  <bs-navbar-nav>
    <bs-navbar-item><a routerLink="/home" bsNavbarTrigger="/home">Home</a></bs-navbar-item>
    <bs-navbar-item>
      <a bsNavbarTrigger>Products</a>
      <bs-navbar-dropdown>
        <bs-navbar-item><a routerLink="/p/1">Product 1</a></bs-navbar-item>
      </bs-navbar-dropdown>
    </bs-navbar-item>
  </bs-navbar-nav>
</bs-navbar>
```

The compositional, content-projection API and `routerLink` integration are the things at risk in a WC migration. Per workspace convention, **breaking changes are acceptable when documented** — but the navbar is a high-visibility, routing-coupled component, so the API direction is the one decision worth making deliberately (§4).

## 4. Design decision: how nav items are authored

### Option A — Data-driven items (recommended)

`mp-navbar` owns the **entire** rendered structure in its shadow root: `<nav>`, hamburger state machine, `.navbar-collapse`, `<ul class="navbar-nav">`, every `<li>`, `<a class="nav-link">`, and the dropdown `<ul class="dropdown-menu">`. The consumer passes an **items array** (a property) describing the tree, plus optional **render-callbacks** for custom label/brand content (the established `mp-treeview.nodeRenderer` precedent). Active-state and navigation are surfaced as **properties + events** (`href`, `active`, a `navigate` CustomEvent); routing lives in the wrappers.

```
mp-navbar
  .items = [{ label, href?, active?, children?, render? }, …]
  .brand = render-callback | slotted [slot=brand]
  attributes: color, breakpoint, expanded (reflected), aria-label, autoclose, dismiss-on-navigate
  events: expandedchange, navigate
```

- **Bootstrap CSS**: the full navbar/nav/dropdown partials are compiled into the shadow root's `static styles` (codegen-wc already compiles SCSS → a `*.styles.ts` `CSSResult`). Everything Bootstrap-styled is shadow-owned, so it is fully encapsulated — **no global Bootstrap stylesheet required**, consistent with the WC philosophy.
- **No-JS**: the whole tree is server-rendered into the DSD template, so the menu, items and dropdowns exist at first paint with zero JS; the `:checked`/`:focus-within` state machine (§6) lives in the same shadow root and is live immediately.
- **Cost**: the largest API break. The `<bs-navbar-item>` / content-projection / `[routerLink]` ergonomics are replaced by data + render-callbacks + wrapper-provided routing. This is the cleanest cross-framework story and the most faithful to mp-shell/mp-treeview.

### Option B — Slotted items (compositional, lower break)

`mp-navbar` owns only the **chrome** in shadow (the `<nav>`, hamburger, `.navbar-collapse` wrapper, `<slot name="brand">`, default `<slot>` for the nav list and a `<slot>` per dropdown), and the consumer slots their own `<ul>/<li>/<a class="nav-link">` light-DOM markup — preserving an API close to today's.

- **Bootstrap CSS**: chrome styling is shadow-inlined; but the **slotted items stay in light DOM**, so their `.nav-link` / `.dropdown-item` / `.dropdown-menu` styling must come from a **global Bootstrap stylesheet in the host app** (slotted nodes are styled by the document, not the shadow — `::slotted()` can only reach top-level slotted elements with a limited selector and cannot style nested `.dropdown-menu` structure). This reintroduces the global-CSS coupling the WC architecture exists to remove, and means cross-framework parity depends on each demo loading Bootstrap.
- **No-JS**: works — light-DOM children are server-rendered by each framework normally and appear in their slots when the DSD chrome attaches at parse time. Dropdown reveal via `:focus-within` must reach across the slot, which `::slotted`/`:has` interaction makes fragile.
- **Cost**: smaller API break, but a leakier encapsulation boundary and harder, less-portable CSS for dropdowns.

> **Recommendation: Option A.** It is the only shape that keeps Bootstrap CSS fully shadow-encapsulated (the entire reason `mp-shell` works no-JS across three frameworks without shipping global CSS), and it matches the data + render-callback precedent already set by `mp-treeview` / `mp-tree-select`. Option B trades a cleaner migration path for a permanent global-Bootstrap dependency and brittle dropdown CSS. **This is the decision to confirm before detailed design proceeds.**

## 5. Target file layout (mirrors `shell/`)

```
libs/mintplayer-web-components/navbar/
  index.ts                              → export * from './src'
  ng-package.js                         → secondary-entry shim (copy shell's)
  src/
    index.ts                            → MpNavbar + event-detail/types + navbarStyles
    components/
      index.ts
      mp-navbar.ts                      → the LitElement (customElements.define at bottom)
    styles/
      navbar.styles.scss                → hand-authored: Bootstrap navbar/nav/dropdown partials + the noscript state machine
      navbar.styles.ts                  → GENERATED by codegen-wc (do not edit)
    types/
      index.ts
      navbar-item.ts                    → NavbarItem, NavigateEventDetail, ExpandedChangeEventDetail
  ssr/
    index.ts                            → re-export MP_NAVBAR_DSD_CHROME + injectMpNavbarDsd
    inject-mp-navbar-dsd.ts             → regex-splice helper (copy shell's, rename)
    mp-navbar-chrome.generated.ts       → GENERATED by a new gen-navbar-chrome target
```

Wrappers:

```
libs/mintplayer-ng-bootstrap/navbar-wc/    (new; keep the legacy navbar/ until consumers migrate)
libs/mintplayer-react-bootstrap/navbar/src/BsNavbar.tsx + index.ts
libs/mintplayer-vue-bootstrap/navbar/src/BsNavbar.vue + index.ts
```

`vite.config.mts` `discoverEntries` auto-finds the React/Vue sub-entries; `tsconfig.base.json`'s `@mintplayer/web-components/*` wildcard resolves the WC and its `ssr/` entry with no extra config.

## 6. No-JS state machine (shadow-internal, no global CSS)

Port the shell's pattern. Inside the shadow root:

- A visually-hidden-but-focusable `<input type="checkbox" id="mp-navbar-toggle" class="navbar-toggle">` and a `<label for="mp-navbar-toggle">` hamburger — same shadow root, so `for`/`id` associate without crossing any boundary, and a mouse/touch click toggles `:checked` with no JS (the `<label for>` path also covers Safari/macOS-Chrome not focusing buttons on click — the exact reason the Angular version uses a checkbox+label, per `navbar-noscript.md`).
- Three reveal levers (mirroring the Angular contract in `navbar-noscript.md`, but expressed against shadow-internal `.navbar-collapse` rather than `::ng-deep .navbar.noscript`):
  1. **Wide (≥ breakpoint)** — a per-breakpoint `@media (min-width)` loop forces the collapse open regardless of `:checked`.
  2. **Narrow + `:checked`** — mouse/touch reveal via the sibling/`:has` combinator on the toggle.
  3. **Narrow + `:focus-within`** — keyboard reveal; keeps the menu open while tabbing items.
- Dropdown open in no-JS mode via `:focus-within` on the `<li>` (Option A renders the `<li>` in shadow, so this is a clean internal rule — no slot-piercing).
- The "open" state funnels through one numeric CSS lever (`--mp-navbar-open`, like `--mp-shell-open`), with `expanded` / explicit attributes overriding the responsive default.

Because the state machine is **inside** the shadow root and rendered into the DSD template, it is interactive in a DSD-capable browser **before any script** — no `.noscript` class, no hydration handoff, no Angular `isServerSide` branch.

## 7. SSR via Declarative Shadow DOM (copy the shell mechanism exactly)

Two-tier model from `shell-wc-ssr.md`:

- **Tier 1 (interactive no-JS):** the `:checked` + sibling-combinator state machine above.
- **Tier 2 (visible-but-inert structure):** `@lit-labs/ssr` serialises the shadow chrome into `<template shadowrootmode="open">` so the parser attaches it at byte 0.

Build-time codegen (new Nx target `gen-navbar-chrome`, copied from `tools/lit-ssr-utils/gen-shell-chrome.mjs`):

1. `dependsOn: ["build"]`; render `html\`<mp-navbar></mp-navbar>\`` through `@lit-labs/ssr` + `collectResult`.
2. Extract the `<template shadowrootmode>…</template>` block, write `MP_NAVBAR_DSD_CHROME` as a `JSON.stringify`'d constant into `mp-navbar-chrome.generated.ts`.

**Caveat specific to Option A:** the shell's DSD chrome is *static* (independent of slotted content), so a single pre-generated constant suffices. With a **data-driven** navbar, the rendered `<ul>/<li>` depends on the per-request `items`, so the chrome is **not** static. Two sub-options:

- **A1 (per-request lit-ssr):** render `mp-navbar` with its `items` through `@lit-labs/ssr` *per request* in each framework server. Rejected for Angular by the shell PRD ("do not run `@lit-labs/ssr` inside `@angular/ssr` — its global DOM shim collides with Angular's Domino"). Workable for React/Vue (their servers already install the lit-ssr shim) but not portable.
- **A2 (static chrome + light-DOM items):** keep the toggle/collapse **chrome** static and DSD-injected exactly like the shell, but render the **items as light-DOM** projected through a `<slot>` — i.e. the WC owns chrome+CSS in shadow, but the item `<ul>` is slotted and server-rendered by each framework's normal SSR. This converges Option A's encapsulated chrome with Option B's light-DOM items. **This is the likely sweet spot** and should be validated by a spike (§9) — it needs `::slotted` to reach the slotted `<ul class="navbar-nav">` enough for layout, with item-level Bootstrap styling either shadow-`::slotted` or a small shared adoptedStyleSheet.

The per-request injection helper `injectMpNavbarDsd(html)` is a verbatim copy of `injectMpShellDsd` (per-element negative-lookahead regex, idempotent), wired into all three demo servers next to the existing shell call (`apps/*-bootstrap-demo` `server.ts` / `entry-server.*`).

## 8. Per-framework wrappers (established conventions)

- **Angular** (`navbar-wc/`): `@Component` with `CUSTOM_ELEMENTS_SCHEMA`; `afterNextRender(() => import('@mintplayer/web-components/navbar'))` (client-only, avoids the Domino/lit-ssr clash); bridge attributes via `[attr.x]`, events via `(expandedchange)`/`(navigate)` with `stopPropagation()` on the re-dispatch (the shell's double-fire fix); map `items`/render-callbacks as element properties; integrate `Router` here (translate `navigate` events / `href`s to `routerLink` navigation, port `BsNavbarTriggerDirective` active-tracking).
- **React** (`navbar/src/BsNavbar.tsx`): `@lit/react` `createComponent`; `events: { onExpandedchange, onNavigate }`; `items`/render-callbacks assigned as properties; `forwardRef` facade only if boolean-attribute presence translation is needed (shell precedent).
- **Vue** (`navbar/src/BsNavbar.vue`): `<script setup>`, `defineOptions({ inheritAttrs:false })`, side-effect import, `defineModel` for `expanded`, `ref` + `onMounted`/`watch` to assign `items`/render-callbacks, `addEventListener` in `onMounted`/`onBeforeUnmount` for events, `v-bind="$attrs"` on the element.
- **SSR plumbing is per-app, not per-wrapper**: the lit-ssr DOM shim is installed first in each server entry; `@lit-labs/ssr-client/lit-element-hydrate-support.js` is the first client import. No SSR code inside wrapper files (shell precedent).

## 9. Validation spikes (allowed throwaway/tracked test cases)

Before committing to a shape, prove the two load-bearing assumptions with small spikes (the repo already has a `_spike-lit-context/` precedent under `libs/mintplayer-ng-bootstrap/`):

1. **Bootstrap-in-shadow spike**: compile `bootstrap/scss/{navbar,nav,dropdown}` into a Lit `static styles` CSSResult and render a hard-coded `<ul class="navbar-nav">…<ul class="dropdown-menu">` tree inside the shadow root. Confirm it looks identical to the current Angular navbar at wide + narrow viewports, in Chrome **and Firefox** (Firefox flex-shrink gotcha is on record). This validates Option A's "CSS fully encapsulated" claim.
2. **Slotted-items styling spike (Option A2/B)**: slot a light-DOM `<ul class="navbar-nav">` into the WC and measure how far `::slotted` + a shared adoptedStyleSheet can style nav-links/dropdowns without a global Bootstrap sheet. Determines whether A2 is viable (and therefore whether the DSD chrome can stay static per the shell mechanism).
3. **No-JS state-machine spike**: port the `:checked`/`:focus-within`/wide-mode reveal trio into the shadow root and verify all three paths with JS disabled at narrow + wide viewports (curl the DSD HTML; load with scripting off).

Spikes live under `libs/mintplayer-web-components/_spike-navbar/` (git-tracked, deleted before the feature PR) or as standalone HTML files; either is acceptable per the request.

## 10. Open questions (for the team / user)

1. **§4 API shape — Option A (data-driven) vs B (slotted) vs A2 (hybrid: shadow chrome + slotted items).** Pivotal; everything downstream depends on it.
2. **Legacy `bs-navbar` fate** — keep both during a deprecation window, or replace outright (precedent `mp-tree-select` deleted the legacy controls with no shim)?
3. **Routing contract** — does `mp-navbar` stay router-agnostic (emit `navigate` + accept `active`/`href`, wrappers do the routing), matching the "frontend is framework-agnostic" stance? (Recommended: yes.)
4. **Sub-dropdown positioning** — replace CDK overlay with the existing framework-agnostic `OverlayController` (`libs/.../overlay`, reuse mandated by CLAUDE.md) or pure-CSS flow positioning in no-JS mode.
5. **`BsNavbarContentDirective` (fixed-navbar top-padding)** — re-express as a published `--mp-navbar-height` CSS var / resize event consumed by wrappers.
6. **Animation** — replace `[@slideUpDown]` with a CSS `grid-template-rows: 0fr → 1fr` (or `max-height`) transition so it works without `@angular/animations`.

## 11. Out of scope

- Visual redesign of the navbar — output must match the current Bootstrap appearance.
- Changing the no-JS *contract* defined in `navbar-noscript.md` — this PRD re-expresses the same three reveal paths inside a shadow root; it does not alter the UX matrix.
