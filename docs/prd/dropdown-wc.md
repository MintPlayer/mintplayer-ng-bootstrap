# PRD: `mp-dropdown-menu` — cross-framework dropdown-menu WC

Status: **Draft**. First building block toward the cross-framework navbar ([`navbar-wc-ssr.md`](./navbar-wc-ssr.md)); also independently useful (typeahead / tree-select / combobox / context-menu all render dropdown menus). Follows the WC + ng/react/vue-wrapper precedent of [`shell-wc-ssr.md`](./shell-wc-ssr.md).

## 1. Problem & motivation

Bootstrap's `.dropdown-menu` / `.dropdown-item` surface exists in this workspace only as Angular components (`@mintplayer/ng-bootstrap/dropdown-menu`: `bs-dropdown-menu`, `bs-dropdown-item`) and an Angular directive (`@mintplayer/ng-bootstrap/dropdown-divider`). React and Vue have no equivalent.

Porting this surface to a framework-agnostic **Lit** web component first (before the navbar) is deliberate: it isolates and proves the navbar's single hardest sub-problem — **getting Bootstrap's dropdown CSS, including its theme-aware `--bs-dropdown-*` variables, to render correctly inside a shadow root** — in a small, independently shippable component.

### The load-bearing risk this validates

`dropdown-menu.component.scss` does two things that a shadow boundary complicates:

1. `@import "bootstrap/scss/dropdown"` — compiles the full Bootstrap dropdown CSS into the component.
2. **Re-binds every `--bs-dropdown-*` custom property to a theme-aware token** (`--bs-dropdown-bg: var(--bs-body-bg)`, etc.). The comment explains why: Bootstrap's own `[data-bs-theme="dark"] .dropdown-menu` dark override can't match when `data-bs-theme` sits on `<html>` (the typical `BsThemeService` setup) and the rule is scoped under `:host ::ng-deep`.

In a shadow root the rebind problem flips in our favour: **CSS custom properties inherit *through* shadow boundaries.** `--bs-body-bg` / `--bs-body-color` / `--bs-border-color` set on `<html>` by the theme inherit into the shadow root, so a `--bs-dropdown-bg: var(--bs-body-bg)` rebind inside the shadow tracks the page theme automatically — no `data-bs-theme` selector needs to cross the boundary at all. The spike (§6) confirms this empirically before we commit.

## 2. Scope

In scope — four presentational primitives, **visual + keyboard only, no positioning/toggle**:

- `mp-dropdown-menu` — renders `<ul class="dropdown-menu show">`, owns theme-aware Bootstrap dropdown CSS, hosts roving-tabindex keyboard nav over its items.
- `mp-dropdown-item` — renders `<li class="dropdown-item">`, with `selected` / `disabled` state.
- `mp-dropdown-divider` — renders `<li><hr class="dropdown-divider"></li>`.
- `mp-dropdown-header` — renders `<li><h6 class="dropdown-header">`, slotted label. (New; no Angular equivalent today.)

Plus ng / react / vue wrappers for each, and a demo section per framework.

Out of scope (deliberately deferred):

- **Trigger + open/close + positioning** — i.e. the `@mintplayer/ng-bootstrap/dropdown` behaviour layer (`bsDropdown`, `bsDropdownToggle`, overlay placement, click-outside). The menu here is `position: static` and always rendered (Bootstrap `.show`); *where* and *whether* it appears stays the consumer's / a future `mp-dropdown` WC's job (which would reuse the existing `OverlayController`). This mirrors how the current `bs-dropdown-menu` is purely presentational and leans on the separate `bsDropdown` directive for behaviour.
- **`listbox`/combobox mode wiring to a host control** — the WC will expose a `mode="menu" | "listbox"` attribute that sets roles, but the activedescendant bookkeeping that typeahead/tree-select do stays in those (Angular) consumers for now.
- Replacing the existing Angular `bs-dropdown-menu` internals — the new Angular wrapper is *additive*; migrating typeahead/tree-select/context-menu onto it is a later step.

## 3. Component API

### `mp-dropdown-menu`

```
attributes / properties
  mode      "menu" | "listbox"   (default "menu")   → sets <ul> role + item roles
  max-height number (px)          (optional)         → maps to max-height on the <ul>, overflow auto
  label-id   string               (optional)         → aria-labelledby on the <ul>
events
  select  CustomEvent<{ item: MpDropdownItem; value?: unknown }>   bubbles+composed, fired on item activation
keyboard (menu mode only)
  ArrowDown / ArrowUp  move roving tabindex across enabled items (wraps)
  Home / End           first / last enabled item
slots
  default  → mp-dropdown-item / mp-dropdown-divider / mp-dropdown-header children
```

Roving nav works over **slotted** items: the menu reads `slot.assignedElements()` and listens for `slotchange` (the WC equivalent of the Angular `contentChildren` + the menu's `onKeydown`). Item roles: `menu` → `menuitem`, `listbox` → `option`.

### `mp-dropdown-item`

```
attributes / properties
  selected  boolean   → .active class + aria-selected (listbox) ; property `value?: unknown`
  disabled  boolean   → .disabled class + aria-disabled, removed from roving order
events
  (activation surfaces via the menu's `select` event; item also emits a native click)
keyboard
  Enter / Space  activate (forwards to click) when not disabled
slots
  default  → item label/content
```

Generates a stable `id` if none supplied (module-level counter / `crypto.randomUUID()` replacing the Angular `BsIdService`).

### `mp-dropdown-divider`, `mp-dropdown-header`

Thin: divider renders `<li><hr class="dropdown-divider"></li>`; header renders `<li><h6 class="dropdown-header"><slot></slot></h6></li>`. Both inherit the menu's theme-aware tokens.

## 4. Target file layout (mirrors `shell/`)

```
libs/mintplayer-web-components/dropdown-menu/
  index.ts                          → export * from './src'
  ng-package.js                     → secondary-entry shim (copy shell's)
  src/
    index.ts                        → MpDropdownMenu, MpDropdownItem, MpDropdownDivider, MpDropdownHeader, event-detail types, *Styles
    components/
      index.ts
      mp-dropdown-menu.ts
      mp-dropdown-item.ts
      mp-dropdown-divider.ts
      mp-dropdown-header.ts
    styles/
      dropdown-menu.styles.scss      → @import bootstrap functions/variables/variables-dark/mixins + dropdown; the --bs-dropdown-* theme rebind
      dropdown-menu.styles.ts        → GENERATED by codegen-wc
      dropdown-item.styles.scss      → the .bs-rovingfocus-active hover-mirror rule (ported)
      dropdown-item.styles.ts        → GENERATED
    types/
      index.ts
      dropdown.ts                    → SelectEventDetail, DropdownMode
```

`codegen-wc` already globs `**/*.styles.scss → **/*.styles.ts` for this lib, so no project.json target change is needed for styles. Vite `discoverEntries` + the `@mintplayer/web-components/*` tsconfig wildcard pick up the new entry automatically.

Wrappers:

```
libs/mintplayer-ng-bootstrap/dropdown-menu-wc/   (new; leave the legacy dropdown-menu/ untouched)
libs/mintplayer-react-bootstrap/dropdown-menu/src/{BsDropdownMenu,BsDropdownItem,BsDropdownDivider,BsDropdownHeader}.tsx + index.ts
libs/mintplayer-vue-bootstrap/dropdown-menu/src/{BsDropdownMenu,BsDropdownItem,BsDropdownDivider,BsDropdownHeader}.vue + index.ts
```

## 5. SSR / no-JS

The menu's structure lives in its shadow root, so for it to be visible without JS it needs Declarative Shadow DOM — the same Tier-2 mechanism as the shell (`@lit-labs/ssr` → `<template shadowrootmode>` → per-request `injectMp…Dsd`). **However**, a dropdown menu is normally hidden until triggered, and *this* slice explicitly excludes the trigger/positioning behaviour. So:

- The **menu chrome** (`<ul class="dropdown-menu">` + the inlined `<style>`) is static and can be DSD-pre-generated exactly like the shell (`gen-dropdown-menu-chrome.mjs`, a copy of `gen-shell-chrome.mjs`) **if** we want no-JS rendering. Whether to wire the DSD injection now or defer until the navbar consumes it is **open question Q1**.
- Slotted items are light-DOM, server-rendered normally by each framework, and appear in the menu's `<slot>` when the shadow attaches at parse time — no per-request lit-ssr needed for them. (This is the static-chrome + light-DOM-items "A2" shape flagged in the navbar PRD, validated here on a smaller surface.)
- Wrapper SSR plumbing is unchanged from the shell: lit-ssr DOM shim installed first in each server entry, `@lit-labs/ssr-client/lit-element-hydrate-support.js` first client import. No SSR code inside wrapper files.

## 6. Spike — VALIDATED ✓

Run at `libs/mintplayer-web-components/_spike-dropdown/` (throwaway, git-tracked, **delete before the feature PR**). All three assumptions held:

1. **Compiles standalone ✓** — `dropdown-menu.styles.scss` (Bootstrap `functions/variables/variables-dark/maps/mixins/dropdown` + the `--bs-dropdown-*` rebind, *without* the Angular `:host ::ng-deep` wrapper) compiled to a self-contained 8.3 KB CSS string using the exact Sass options `codegen-wc` uses (`loadPaths: [scssDir, repoRoot, repoRoot/node_modules]`, the Bootstrap-5.3 `silenceDeprecations` list).
2. **Renders in a shadow root ✓** — dropped into a real `attachShadow({mode:'open'})` + `adoptedStyleSheets`, a `<ul class="dropdown-menu show">` with header / items / active / disabled / divider rendered pixel-faithful to the current Angular `bs-dropdown-menu` (verified by screenshot in Chromium).
3. **Theme tracks across the boundary ✓** — with `data-bs-theme` toggled on `<html>` and **no `data-bs-theme` selector inside the shadow** (asserted programmatically), the dropdown's computed background flipped `rgb(255,255,255)` → `rgb(33,37,41)` and text `rgb(33,37,41)` → `rgb(222,226,230)`, following the inherited `--bs-body-bg`/`--bs-body-color`. This confirms the custom-property-inheritance claim in §1 and is the key result that de-risks the navbar.

> Decisive takeaway: a presentational dropdown WC needs **zero** `data-bs-theme` plumbing across the boundary — the rebind-to-`--bs-*`-tokens trick (already in the Angular component) is *sufficient and simpler* in shadow than it was under `:host ::ng-deep`. Follow-up to confirm during build: Firefox parity (recorded flex-shrink gotcha), and the multi-shadow case where each `mp-dropdown-item` is its own WC styling its own `.dropdown-item` (sidesteps `::slotted` entirely).

### Original spike plan (for reference)

Throwaway, git-tracked, deleted before the feature PR. Goal: validate §1's two assumptions on the smallest possible surface.

1. **Compiles standalone:** run dart-sass over a `dropdown-menu.styles.scss` containing the Bootstrap `functions/variables/variables-dark/mixins/dropdown` imports + the `--bs-dropdown-*` rebind, with the same load paths `codegen-wc` uses. Confirm it produces a self-contained CSS string with no `::ng-deep`/Angular assumptions.
2. **Renders in a shadow root:** drop that CSS into a `<template shadowrootmode="open">` (or a tiny `LitElement` `static styles`) on a plain HTML page, with a slotted `<li class="dropdown-item">` list. Confirm it looks identical to the current Angular `bs-dropdown-menu`.
3. **Theme tracks across the boundary:** put `data-bs-theme="dark"` + the Bootstrap theme variables on `<html>` and toggle it. Confirm the dropdown's background/text/hover follow the page theme **with no `data-bs-theme` selector inside the shadow** (proving the custom-property-inheritance claim). Check Chrome **and Firefox**.

Location: `libs/mintplayer-web-components/_spike-dropdown/` (per the `_spike-lit-context/` precedent) or a standalone `.html` file. Findings get folded back into this PRD before implementation.

## 7. Open questions

1. **Wire DSD/SSR now or defer?** The presentational menu has no trigger, so no-JS visibility may not matter until the navbar consumes it. Build the `gen-dropdown-menu-chrome` + injection now (full shell parity) or ship the WC client-only first and add DSD when the navbar needs it? (Leaning: defer DSD; ship the visual + keyboard + theming WC first, since that's what de-risks the navbar.)
2. **`mp-dropdown-header` semantics** — `<h6 class="dropdown-header">` (Bootstrap default) vs a role/aria-only group label. (Leaning: match Bootstrap's `<h6>`.)
3. **Legacy `bs-dropdown-menu` migration** — keep both indefinitely, or migrate typeahead/tree-select/context-menu/combobox onto the WC wrapper in a follow-up? (Out of scope here; note it.)
4. **`value` typing** — is the item `value` an opaque `unknown` carried through the `select` event, or constrained? (Leaning: opaque `unknown`, like the other data-carrying WCs.)

## 8. Out of scope

- Trigger / open-close / overlay positioning (the `bsDropdown` behaviour layer) — separate future `mp-dropdown` WC.
- Visual redesign — output must match the current Bootstrap dropdown appearance at parity.
- Rewiring existing Angular consumers (typeahead, tree-select, combobox, context-menu) onto the new WC.
