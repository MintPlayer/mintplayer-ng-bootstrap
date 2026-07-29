# PRD: Navbar Noscript / SSR Behavior

**Status:** Implemented — and since re-implemented **inside the web component**. The behavior matrix
below is still the contract; the mechanism moved out of the Angular `bs-navbar` template into
`<mp-navbar>`'s shadow root. Everything the original document described in terms of
`bsNoNoscript` / `.noscript`, `[@slideUpDown]`, `showNavs()` and `navbar.component.scss` is gone —
see [§Mechanism migration](#mechanism-migration) for the old → new mapping and
[`navbar-dropdown-menu-wc.md`](./navbar-dropdown-menu-wc.md) for the migration itself.

## Problem

When JavaScript is disabled (or before the page hydrates), `<bs-navbar>` did not behave correctly.
Two historical Angular states, both wrong:

- **Post-#280 signal migration:** the collapse area was hard-coded to `height: 0` in the SSR HTML by
  `[@slideUpDown]="false"`. Because the noscript CSS reveal rule only fired when the SSR-only
  checkbox was `:checked` **or** the navbar had `:focus-within`, neither of which is true on first
  paint, the menu was empty for noscript users at **every** viewport width.
- **Pre-#280:** `showNavs$` was an RxJS observable filtered through `windowWidth !== null`, which
  never emitted during SSR. The async pipe yielded `null`, no animation state bound, no inline
  `height: 0` was written, so the menu rendered visible at all widths — which is also wrong: at
  narrow widths the items should hide behind the hamburger.

Neither state matched the intended UX, and the SSR-only checkbox+label toggler and the `.noscript`
CSS reveal rules had been introduced ad-hoc in the ARIA pass (PR #327) without a written spec. This
document is that spec.

## Goal

Pin down the noscript / SSR / pre-hydration behavior of the navbar in a single document, and align
the implementation so:

1. **Wide mode (viewport ≥ navbar expand breakpoint)** — items are visible without JavaScript, no
   interaction required.
2. **Small mode (viewport < breakpoint), initial paint** — items are hidden behind the hamburger
   toggler.
3. **Small mode, after the user reveals the menu** — items become visible via either of two CSS-only
   paths:
   - `.navbar-toggle:checked` — mouse/touch user clicks the hamburger `<label>`, which toggles the
     hidden `<input type="checkbox">`.
   - `.navbar-collapse:focus-within` — keyboard user Tabs into the collapse.
4. **JS-enabled** — the checkbox stays the state holder, but only clicks/keys routed through the
   component drive it; the no-JS `:focus-within` path disengages once `<mp-navbar>` marks itself
   with `data-js`.

## Reference Implementations

`tab-control-noscript.md` documents the same hidden-input + `<label [for]>` + `:checked` CSS pattern
for the Angular tier, and [`shell-wc-ssr.md`](./shell-wc-ssr.md) is the precedent for running that
pattern **inside a shadow root** served as Declarative Shadow DOM — which is what the navbar does
now. (`accordion-multi.md` also documented the pattern, but the accordion has since moved to native
`<details>`/`<summary>`, which needs no state machine at all.)

The navbar's hamburger uses a single `<input type="checkbox">` rather than per-item radios, and adds
a second reveal path on `:focus-within` for keyboard users.

## Mechanism migration

The Angular `bs-navbar` is now a thin wrapper that projects content into the WC's slots
(`libs/mintplayer-ng-bootstrap/navbar/src/navbar/navbar.component.html`) and registers the custom
element **client-side only** so SSR emits a bare `<mp-navbar>` tag
(`navbar.component.ts:61-67`). Old → new:

| Original mechanism | Today |
|---|---|
| `bsNoNoscript` adds `.noscript` on the server; Angular removes it on hydration | `<mp-navbar>` **adds** `data-js` in `connectedCallback` (`mp-navbar.ts:71`). No-JS selectors are therefore `:host(:not([data-js]))` — the inverse gate, with the same meaning |
| `[@slideUpDown]` Angular animation writing inline `height` | `grid-template-rows: 0fr ↔ 1fr` on `.navbar-collapse` + `overflow: hidden` / `min-height: 0` on `.navbar-collapse-inner` (`navbar.styles.scss:111-126`) — `height: auto` is not animatable, a grid row is |
| `showNavs()` computed from `window.innerWidth` in `BsNavbarNavComponent` | Pure CSS `media-breakpoint-up` / `-down` blocks per `:host([breakpoint])` (`navbar.styles.scss:172-192`). No width is measured in JS, so there is no SSR-vs-client divergence to reconcile |
| SSR-only `@if (isServerSide)` template branch with a checkbox, JS branch with a `<button>` | **One** shadow template for both tiers (`mp-navbar.ts:223-256`): the checkbox+label is always the markup; `firstUpdated` upgrades it to a disclosure button (`role="button"` + live `aria-expanded`) when JS is present (`mp-navbar.ts:188-197`) |
| `togglerCheckboxId` from `BsIdService` (ids must be unique per document) | The fixed id `mp-navbar-toggle`. Ids inside a shadow root are scoped to that root, so every navbar instance can reuse it |
| `bs-navbar-nav` owning window-resize state | `bs-navbar-nav` is `display: contents` and only picks the `start`/`end` slot (`navbar-nav.component.ts`) |
| Wide-mode reveal via a `.noscript` height override loop in `navbar.component.scss` | The wide-mode block sets `display: flex` + `grid-template-rows: none`, which makes the collapse animation inert at that width for **both** tiers — no `.noscript`-gated override needed (`navbar.styles.scss:176-182`) |

`bsNoNoscript` itself was **not** deleted — `priority-nav` and `tab-control` still use it. It is only
the navbar that no longer does.

## Behavior matrix

`bp` below stands for the navbar's expand breakpoint (e.g. 992 for `breakpoint="lg"`). "SSR" rows
describe the bytes the server writes; "noscript" rows describe how the browser renders those bytes
when no JS runs; "JS" rows describe the state after the element upgrades.

| Mode | Viewport | Host attributes | `.navbar-collapse` | What user sees |
|---|---|---|---|---|
| SSR HTML emitted | any | `breakpoint`, `color`, … (no `data-js`) | `<template shadowrootmode>` chrome, collapsed by the narrow-mode `0fr` rule | — (server output) |
| Noscript, initial | `< bp` | no `data-js` | `grid-template-rows: 0fr` | menu hidden, hamburger label visible |
| Noscript, `:checked` | `< bp` | no `data-js` | `1fr !important` | menu visible; bars morph to an X |
| Noscript, `:focus-within` | `< bp` | no `data-js` | `1fr !important` | menu visible |
| Noscript, initial | `≥ bp` | no `data-js` | `display: flex`, `grid-template-rows: none` | menu visible inline, hamburger `display: none` |
| JS-enabled, collapsed | `< bp` | `data-js` | `0fr` **+ `visibility: hidden`** after a 0.35s delay | menu hidden *and* out of the tab order |
| JS-enabled, expanded | `< bp` | `data-js` | `1fr !important`, `visibility: visible` | menu visible, slides open |
| JS-enabled | `≥ bp` | `data-js` | `display: flex`, `grid-template-rows: none` | menu visible, hamburger hidden |

The per-breakpoint blocks are emitted only for breakpoints with a non-zero min-width
(`@if $min and $min > 0` in `navbar.styles.scss:172`), i.e. `sm`…`xxl`. `breakpoint="xs"` gets
neither block and so keeps the base always-visible collapse.

## Implementation

Everything lives in two files: the WC's shadow template (`mp-navbar.ts`) and its shadow stylesheet
(`navbar.styles.scss`). Both tiers read the same markup — there is no server/client template branch.

### 1. The checkbox is the state holder, in both tiers

`mp-navbar.ts:232-247` renders a visually-hidden-but-focusable `<input type="checkbox"
class="navbar-toggle" id="mp-navbar-toggle">` followed by `<label for="mp-navbar-toggle"
class="navbar-toggler" aria-hidden="true">` whose fallback content is the three hamburger bars. The
label is the visible hamburger; clicking it toggles the checkbox with no JavaScript. The
visually-hidden clip rules are at `navbar.styles.scss:96-104`.

Deliberately **no** `role="button"` / `aria-expanded` in `render()`: that same render output is the
static DSD chrome, where no script can keep `aria-expanded` in sync, and a native checkbox's
`checked` state is the honest self-updating channel. `firstUpdated` adds both once JS is confirmed
present (`mp-navbar.ts:188-197`), and `#setExpanded` is the single write path that keeps
`aria-expanded` accurate afterwards — including for programmatic closes, which never fire the
checkbox's `change` event (`mp-navbar.ts:175-186`).

Because the checkbox presents as a button, `Enter` is handled explicitly — native checkboxes only
toggle on `Space` (`mp-navbar.ts:204-211`).

### 2. The collapse animates a grid row

`.navbar-collapse` is a one-row grid transitioning `grid-template-rows` between `0fr` and `1fr`; the
single child `.navbar-collapse-inner` carries `min-height: 0` and the parent `overflow: hidden` so
the content clips as the row collapses (`navbar.styles.scss:111-126`). A
`prefers-reduced-motion: reduce` block kills both this transition and the hamburger-bar transition
(`navbar.styles.scss:127-130`).

### 3. Two reveal paths, one of them no-JS-only

```scss
.navbar-toggle:checked ~ .navbar-collapse,
:host(:not([data-js])) .navbar-collapse:focus-within {
  grid-template-rows: 1fr !important;
  visibility: visible;
  --mp-collapse-hide-delay: 0s;
}
```

(`navbar.styles.scss:159-170`.) Both paths are part of the contract:

- **`:checked`** — mouse/touch reveal, active in **both** tiers. The label-for-checkbox pattern is
  needed because Safari and macOS Chrome do not focus a `<button>` on mouse click, so a
  `:focus-within` rule alone would not fire for click users.
- **`:focus-within`** — keyboard reveal, **no-JS only**, gated on `:host(:not([data-js]))`. It is
  also **scoped to `.navbar-collapse`**, not the whole host: the toggler lives in the host too, so a
  host-level `:focus-within` would leave focus on the toggler after a click-to-close and immediately
  re-reveal the menu.

Why the gate: once hydrated, clicking a top-level nav link leaves focus on a still-visible anchor
*inside* the collapse, and an ungated `:focus-within` would hold the menu open against
dismiss-on-navigate (`mp-navbar.ts:92-106`, which closes every open dropdown and calls
`toggle(false)`). Dropdown leaves hide on close and drop focus, which is why the bug only showed on
top-level links.

### 4. JS mode also removes the collapsed menu from the tab order

The `0fr` grid row only *paint*-clips the menu — its links stay focusable, so keyboard users could
Tab into invisible content once the `:focus-within` reveal was gated off. `navbar.styles.scss:205-214`
adds `visibility: hidden` (plus a `--mp-collapse-hide-delay: 0.35s` so it waits for the slide-shut)
to the collapsed narrow-mode collapse, gated on `[data-js]` so the no-JS keyboard reveal keeps its
focusable links. The reveal rule in §3 resets the delay to `0s` so opening un-hides instantly.

### 5. Wide mode needs no noscript override

The per-breakpoint `media-breakpoint-up` block hides the checkbox and label outright and switches
`.navbar-collapse` to `display: flex` with `grid-template-rows: none` and `overflow: visible`
(`navbar.styles.scss:176-182`) — so the collapse machinery is simply not in play at that width, for
either tier. `.navbar-collapse-inner` becomes `display: contents` so the two `<ul>`s are the flex
children, and `.nav-end` takes `margin-inline-start: auto`. The `media-breakpoint-down` half sets
the collapsed `0fr` default and centers the brand.

A `positioning="fixed"` bar whose open menu is taller than the viewport scrolls internally rather
than running off-screen (`navbar.styles.scss:223-243`).

### 6. Dropdowns follow the same doctrine

`mp-navbar-dropdown` mirrors the gate: `:host(:not([data-js]):focus-within)` reveals the slotted
panel with no JS; with JS, only `data-open` (inline) or `data-menu-open` (the wide-mode submenu
`OverlayController` overlay) do (`navbar-dropdown.styles.scss:117-124`, `mp-navbar-dropdown.ts:70`).
The JS toggle fires on **mousedown**, not click (`mp-navbar-dropdown.ts:156-169`). With no JS there
is no `data-expand` attribute either, so every panel renders inline and in flow — the safe baseline.

### 7. SSR + hydration handoff

`injectMpNavbarDsd` (`libs/mintplayer-web-components/navbar/ssr/inject-mp-navbar-dsd.ts`) inserts
each navbar WC's static `<template shadowrootmode>` chrome into the server-rendered HTML string. It
also walks the serialized markup to stamp `data-submenu` on nested dropdowns, because that attribute
is normally set by `connectedCallback` and gates every submenu-specific shadow style.

On upgrade:

1. `createRenderRoot` clears the DSD chrome and lets Lit render fresh (`mp-navbar.ts:55-62`) — the
   same destructive handoff as `mp-shell`.
2. `connectedCallback` sets `data-js`, disengaging the `:focus-within` reveal, and publishes
   `--mp-navbar-breakpoint` so descendant dropdowns (a *different* shadow tree) can resolve the
   breakpoint without any DI — custom properties inherit through shadow boundaries
   (`mp-navbar.ts:143-155`).
3. `firstUpdated` upgrades the checkbox to a disclosure button.

There is no resize listener and no width measurement anywhere in the path, so no first-paint
reconciliation is needed.

## Files that own this contract

1. **`libs/mintplayer-web-components/navbar/src/components/mp-navbar.ts`** — the shadow template,
   the `data-js` gate, the single `#setExpanded` write path, dismiss-on-navigate.
2. **`libs/mintplayer-web-components/navbar/src/styles/navbar.styles.scss`** — the whole CSS state
   machine: reveal paths, per-breakpoint blocks, tab-order hiding, reduced motion.
3. **`libs/mintplayer-web-components/navbar/src/styles/navbar-dropdown.styles.scss`** +
   **`mp-navbar-dropdown.ts`** — the dropdown half of the same gate.
4. **`libs/mintplayer-web-components/navbar/ssr/inject-mp-navbar-dsd.ts`** — DSD injection.
5. **`docs/prd/navbar-noscript.md`** — this document.

The shadow stylesheet is compiled into a generated `.styles.ts`; after editing the SCSS, re-run
`npx nx run mintplayer-web-components:codegen-wc`, and re-run
`npx nx run mintplayer-web-components:codegen-ssr-chrome` after editing `render()` so the DSD chrome
isn't stale.

## Testing

Manual (matches the matrix above):

- **SSR HTML (curl)**: confirm each `<mp-navbar>` carries a `<template shadowrootmode="open">` and
  **no** `data-js` attribute. (Demonstrates §7.)
- **Noscript wide-mode**: load the SSR HTML with JS disabled, viewport ≥ breakpoint. Menu items
  visible, hamburger absent. (Demonstrates §5.)
- **Noscript small-mode, initial**: same context, viewport < breakpoint. Hamburger label visible,
  menu items not. (Demonstrates §2 + the absence of `:checked`/`:focus-within`.)
- **Noscript small-mode, click hamburger label**: menu reveals and the bars morph to an X. Click
  again: menu collapses. (Demonstrates the `:checked` path.)
- **Noscript small-mode, keyboard**: Tab until focus enters the collapse; the menu reveals and
  subsequent Tabs walk the items. Shift-Tab back out: menu collapses. (Demonstrates the
  `:focus-within` path.)
- **Noscript dropdown**: Tab onto a dropdown trigger — its panel reveals inline, pushing siblings
  down rather than overlapping. (Demonstrates §6.)
- **JS-enabled small-mode**: clicking the hamburger slides the menu; collapsed menu items are **not**
  reachable by Tab. (Demonstrates §4.)
- **JS-enabled wide-mode**: menu items inline, no toggler visible.

Automated:

- The navbar unit specs and `mp-navbar.aria.spec.ts` should keep passing.
- The Playwright e2e specs that exercise navbar collapse / anchor-scroll must pass at both desktop
  and mobile viewports, and the no-JS specs (`javaScriptEnabled: false`) must pass against the
  DSD-injected HTML.

### Testing rule: in JS-enabled tests, **click** the navbar items — never just focus them

The `:focus-within` reveal path on dropdowns and on the small-mode collapse is a **no-JS-only**
mechanism — it is gated on `:host(:not([data-js]))`, and `connectedCallback` sets `data-js` the
moment the element upgrades. From that point on visibility is controlled exclusively by the
checkbox (collapse) and by `data-open` / `data-menu-open` (dropdowns), which only the component's own
handlers write.

Consequences for test authors (vitest specs, Playwright e2e, ng-mocks fixtures alike — **anything
where the navbar has upgraded normally**):

- ❌ **Do NOT** call `.focus()` / `Tab` / any other focus-only gesture to reveal a dropdown. You will
  see the test pass against an SSR snapshot, then fail against the upgraded DOM — the focus-within
  CSS isn't matching anything.
- ✅ **Do** call `.click()` on the trigger. `mp-navbar-dropdown` toggles on the trigger's
  **mousedown** (`mp-navbar-dropdown.ts:167-169`), which a synthetic `.click()` produces in
  Playwright; in unit tests dispatch a `mousedown` explicitly.
- ⚠️ The element is registered lazily — the Angular wrapper imports
  `@mintplayer/web-components/navbar` in `afterNextRender` (`navbar.component.ts:61-67`), so on cold
  CI runners a too-eager test can race the upgrade. Add
  `await page.waitForLoadState('networkidle')` after `page.goto('/')`, or await
  `customElements.whenDefined('mp-navbar')`.

Reverse case (testing the SSR/noscript path specifically): there you *do* test focus-within, but the
element must **not** have upgraded — which means a true SSR-rendered snapshot with
`javaScriptEnabled: false`. There is no in-between state where focus alone opens an upgraded
dropdown.

## Open questions resolved

1. ~~Class semantics: `.noscript` vs `:not(.no-noscript)`?~~ — the Angular tier kept `.noscript`
   (added on SSR, affirmative selectors). The WC inverted it to an affirmative `data-js` **added on
   upgrade**, which is strictly better here: the attribute is set by the element that owns the CSS,
   so there is no cross-library dependency on a directive being present.
2. ~~Reveal mechanism: only `:focus-within`, or both `:checked` and `:focus-within`?~~ — both. The
   hamburger label is the mouse/touch path; `:focus-within` is the keyboard path, no-JS only.
