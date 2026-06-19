# PRD / Plan: Navbar + Dropdown → Web Components

**Status:** In progress — `mp-dropdown` built (Angular wrapper + demo done); `mp-navbar` not yet started.
**Branch:** `feat/navbar-web-component` (off `master`).
**Part of:** the multi-framework expansion (`docs/prd/multi-framework-component-expansion.md`, Wave 1).

## Goal

Two reusable, framework-agnostic Lit web components, each with Angular/React/Vue wrappers, no-JS-capable (no HTML duplication):

- **`mp-dropdown`** — a general **menu** dropdown (button/link trigger → menu of items). Replaces the *menu* use of `bs-dropdown-menu`/`bs-dropdown-item`. Consumed standalone **and** by the navbar.
- **`mp-navbar`** — responsive navbar that *consumes* `mp-dropdown` as nav items.

## Locked decisions

1. **No backward compatibility** — design the cleanest API; document breaks, no shims.
2. **Two components only** for the navbar family: `mp-navbar` + `mp-dropdown` (peers). Brand/items/toggler are **slots + `::slotted()` CSS + attributes**, not elements (more shadow boundaries = more friction). Re-declare needed Bootstrap rules inside each shadow (utilities don't cross the boundary).
3. **Dropdown scope = MENU only.** The combobox/listbox (typeahead + the legacy `[bsDropdown]` directives + `bs-dropdown-menu`) **stays untouched** — a typeable `<input>` trigger can't live in a `<summary>`, so `<details>`-based `mp-dropdown` can't represent `role=combobox`+`listbox`. A future combobox WC could share `OverlayController` but is NOT `mp-dropdown`.
4. **No-JS toggle = native `<details>`/`<summary>`** (click-persistent, keyboard-native, nests; no `:focus-within` hack needed). Placement is the inherited `--mp-dropdown-position` lever (`absolute` floats / `static` inline) so the dropdown stays navbar-agnostic; the navbar sets `static` in its collapsed/mobile mode via media query.

## Spike — DONE (both mechanisms PASS, Chromium + Firefox, JS off)

Throwaway files under `docs/prd/_spike-navbar-*` (NOT committed; delete once `mp-navbar` is built). Run: `npx playwright test -c docs/prd/_spike-navbar.playwright.config.mjs`.

- **No-JS in-shadow CSS state machine** validated, incl. nested dropdowns + wide-mode. Confirmed that a `<details>` submenu can **float in wide mode without expanding the navbar** (`position:absolute` out of flow) and **expand inline in small mode** (`position:static`), switched by one `@media`.
- **JS nested-dropdown positioning** via the real `OverlayController` (`@mintplayer/web-components/overlay`): top-level opens below, nested opens to the side with viewport flip, Esc/outside-click/resize handled.
- **The crux:** each dropdown owns its `<details>` + menu in its OWN shadow root, so nesting composes with no parent/child DI and no CDK `DomPortal`. `:host(:not(:defined))` → inline/absolute CSS; on upgrade `<details>`'s `toggle` event drives `OverlayController` (`position:fixed` + flip). Revised navbar WC estimate ↓ to ~6–9d.

## `mp-dropdown` — BUILT + verified live (Angular)

`libs/mintplayer-web-components/dropdown/` — element + `dropdown.styles.scss` + `ssr/` (static DSD chrome via `tools/lit-ssr-utils/gen-dropdown-chrome.mjs` + `injectMpDropdownDsd`, resolved as `@mintplayer/web-components/dropdown/ssr`).

- `<details>`/`<summary>` toggle; `slot="trigger"` (non-interactive — the `<summary>` is the toggle) + default slot (items); items styled `::slotted(a/button)` as `.dropdown-item`; dividers/headers fold in; trigger appearance is the consumer's via `::part(trigger)`.
- Destructive `createRenderRoot` + `adoptStyles` (same as carousel).
- **Gotchas fixed (verified in the running Angular demo at `/overlays/dropdown`):**
  - Items were underlined + link-blue → global Bootstrap `a` reboot beats normal `::slotted(a)` (cascade sorts encapsulation context before specificity). Fix: `!important` on `color`/`text-decoration` in `::slotted`.
  - Nested-submenu trigger ("More options") unstyled → the slotted element is the `bs-dropdown` *wrapper*, not `mp-dropdown`, so `::slotted(mp-dropdown)` missed. Fix: set trigger styling as `--mp-dropdown-trigger-*` custom props on the parent `.dropdown-menu`; they inherit through the wrapper + across the shadow boundary into the nested `summary` (also adds the right-caret).
  - Submenu side-join: menus' borders are **translucent**, so any gap/border-only strip shows the page. Final: `:host([nested])` keeps the leading border (the visible divider) + squares its leading corners; `POSITIONS_SIDE` offsetX **-1** overlaps so that border renders over the parent's solid body — one crisp divider, no page bleed, no double border.

**Angular wrapper:** `BsDropdownComponent` (`bs-dropdown`) + `BsDropdownTriggerDirective` (`[bsDropdownTrigger]` → `slot="trigger"`), co-located in `@mintplayer/ng-bootstrap/dropdown` (doesn't clash with the legacy `[bsDropdown]` attribute directive). Two-way `[(open)]` via `model` (NB: `model` auto-creates `openChange` — don't add an explicit output, NG1054). Demo at `apps/ng-bootstrap-demo/.../overlay/dropdown` has a `bs-dropdown` menu + nested submenu section; `server.ts` injects `injectMpDropdownDsd(injectMpShellDsd(...))`.

## Remaining

1. **e2e** — `javaScriptEnabled:false` + JS Playwright specs for the dropdown demo (no-JS `<details>` toggle via DSD; JS positioning/flip/nested). This run also confirms the no-JS DSD chrome end-to-end.
2. **Popover-API fallback** — `position:fixed` breaks under an ancestor with `transform`/`filter`/`will-change`; escalate the panel to the top layer via the Popover API (`popover` + `showPopover()`).
3. **React + Vue `BsDropdown` wrappers** (+ demo pages + e2e).
4. **`mp-navbar`** — build the WC (consumes `mp-dropdown`; brand/toggle slots; responsive collapse via in-shadow hamburger; `color`/`breakpoint`/`aria-label`; sets `--mp-dropdown-position: static` in small mode) + ng/react/vue wrappers (router fragment-nav stays in wrappers) + demos + no-JS e2e. Then delete the `_spike-navbar-*` throwaways.

## Verification status

WC build + 773 WC unit tests green; `nx build mintplayer-ng-bootstrap` green. `mp-dropdown` visuals verified live in the Angular demo (Playwright MCP). No-JS/e2e/React/Vue/navbar still pending (see Remaining).
