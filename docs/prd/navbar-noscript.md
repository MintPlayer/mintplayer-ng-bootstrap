# PRD: Navbar Noscript / SSR Behavior

## Problem

When JavaScript is disabled (or before Angular hydrates the SSR HTML), `<bs-navbar>` does not behave correctly:

- **Today (master, post-#280 signal migration):** The collapse area is hard-coded to `height: 0` in the SSR HTML by `[@slideUpDown]="false"`. Because the noscript CSS reveal rule (`navbar.component.scss:46-50`) only fires when the SSR-only checkbox is `:checked` **or** the navbar has `:focus-within`, neither of which is true on first paint, the menu is empty for noscript users at **every** viewport width.
- **Historically (pre-#280):** `showNavs$` was an RxJS observable filtered through `windowWidth !== null`, which never emitted during SSR. The async pipe yielded `null`, no animation state bound, no inline `height: 0` was written, so the menu rendered visible at all widths — which is also wrong: at narrow widths the items should hide behind the hamburger.

Neither state matches the intended UX. There is no existing PRD that documents the contract; the SSR-only checkbox+label toggler and the `.noscript` CSS reveal rules were introduced ad-hoc in the ARIA pass (PR #327) without a written spec.

## Goal

Pin down the noscript / SSR / pre-hydration behavior of `<bs-navbar>` in a single document, and align the implementation so:

1. **Wide mode (viewport ≥ navbar expand breakpoint)** — items are visible without JavaScript, no interaction required.
2. **Small mode (viewport < breakpoint), initial paint** — items are hidden behind the hamburger toggler.
3. **Small mode, after the user reveals the menu** — items become visible via either of two CSS-only paths:
   - `:has(.navbar-toggler-checkbox:checked)` — mouse/touch user clicks the hamburger label, which toggles the hidden `<input type="checkbox">`.
   - `:focus-within` — keyboard user Tabs into the toggler or any descendant.
4. **JS-enabled** — the existing signal-driven path (`isExpanded` + `[@slideUpDown]`) takes over once `BsNoNoscriptDirective` clears the `.noscript` class on hydration.

## Reference Implementations

### Accordion / Tab-control noscript

`accordion-multi.md` and `tab-control-noscript.md` already document the hidden-input + `<label [for]>` + `:checked` CSS pattern. The navbar's hamburger uses the same idea (added in #327) but with a single `<input type="checkbox">` rather than per-tab radios, and adds a second reveal path on `:focus-within` for keyboard users.

## Class semantics (unchanged)

`bsNoNoscript` (`libs/mintplayer-ng-bootstrap/no-noscript/src/no-noscript/no-noscript.directive.ts:6-19`) keeps its current behavior:

- Adds `class="noscript"` to its host on the server (`isPlatformServer(PLATFORM_ID) === true`).
- Does **not** add the class in the browser. On hydration, the host binding re-evaluates and Angular removes the SSR-baked class from the DOM.

All noscript CSS in this PRD therefore uses affirmative selectors (`.navbar.noscript { ... }`), and the JS-enabled path is "the absence of `.noscript`". No directive/API rename is in scope.

## Behavior matrix

`bp` below stands for the navbar's expand-breakpoint pixel threshold (e.g. 992 for `breakpoint="lg"`). "SSR" rows describe the bytes the server writes; "noscript" rows describe how the browser renders those bytes when no JS runs; "JS" rows describe the hydrated state after the JS-driven toggler takes over.

| Mode | Viewport | `.navbar` class | `.navbar-collapse` inline | What user sees |
|---|---|---|---|---|
| SSR HTML emitted | any | `... noscript` | `style="height: 0"` (from `[@slideUpDown]="false"`) | — (server output) |
| Noscript, initial | `< bp` | `.noscript` | inline `height: 0` wins | menu hidden, hamburger label visible |
| Noscript, `:has(:checked)` | `< bp` | `.noscript` | CSS overrides to `height: auto !important; overflow: visible` | menu visible |
| Noscript, `:focus-within` | `< bp` | `.noscript` | same CSS override | menu visible |
| Noscript, initial | `≥ bp` | `.noscript` | wide-mode CSS override sets `height: auto !important` | menu visible inline, hamburger hidden via `d-{bp}-none` |
| JS-enabled, collapsed | `< bp` | (no `.noscript`) | animation engine, currently `height: 0` | menu hidden, button toggler visible |
| JS-enabled, expanded | `< bp` | (no `.noscript`) | animation engine, currently `height: <auto>` | menu visible, slides via `@slideUpDown` |
| JS-enabled | `≥ bp` | (no `.noscript`) | animation engine, `showNavs() === true` | menu visible, hamburger hidden |

## Implementation

The contract has two moving parts: the SSR HTML output (driven by `showNavs()` in TypeScript) and the noscript CSS overrides (in `navbar.component.scss`).

### 1. `showNavs()` returns `false` on SSR

`libs/mintplayer-ng-bootstrap/navbar/src/navbar-nav/navbar-nav.component.ts:30-32`:

```ts
if (windowWidth === null) {
  return false;
}
```

This is the post-#280 behavior. **It is correct and must be kept.** Returning `false` bakes `style="height: 0"` into the SSR HTML via `state('false', style({ height: 0 }))` in `SlideUpDownAnimation`, which is the default-hidden state the noscript CSS expects to override.

The earlier hot-fix that flipped this to `return true` (commit on this branch, currently uncommitted) must be reverted before this PRD lands.

### 2. SSR-only hamburger toggler — unchanged

`navbar.component.html:7-54` keeps both branches:

- `@if (isServerSide)` — hidden `<input type="checkbox" class="navbar-toggler-checkbox visually-hidden">` plus a `<label [for]="togglerCheckboxId">`. The label is the visible hamburger; clicking it toggles the checkbox without any JavaScript.
- `@else` — plain `<button (click)="toggleExpanded()">` for the JS-enabled path.

The `togglerCheckboxId` is a stable, per-component id generated by `BsIdService` (`navbar.component.ts:57`). The `aria-controls` attribute on both branches points at the same `collapseId()`.

### 3. Noscript CSS reveal rules

`navbar.component.scss:42-50` already covers the two small-mode reveal paths:

```scss
::ng-deep .navbar.noscript {
    bs-navbar-nav .navbar-collapse {
        overflow: hidden;
    }

    &:has(.navbar-toggler-checkbox:checked) bs-navbar-nav .navbar-collapse,
    &:focus-within bs-navbar-nav .navbar-collapse {
        height: auto !important;
        overflow: visible;
    }
}
```

This stays. **Both** reveal paths are part of the contract:

- **`:has(.navbar-toggler-checkbox:checked)`** — mouse/touch reveal. The label-for-checkbox pattern is needed because Safari and macOS Chrome do not focus a `<button>` on mouse click, so a `:focus-within` rule alone would not fire for click users.
- **`:focus-within`** — keyboard reveal. Tabbing into the checkbox (which is `visually-hidden` but focusable) sets `:focus-within` on the `<nav>`, which sets `overflow: visible` on the collapse and makes the menu items themselves reachable on subsequent Tabs.

The `:focus-within` rule also covers a case the `:checked` rule doesn't: if the user closes the menu (unchecks) but keeps focus inside it, the menu stays revealed until focus leaves the navbar.

### 4. New: wide-mode noscript override

Add a rule to `navbar.component.scss` that overrides the inline `height: 0` for every `navbar-expand-{bp}` variant at and above its breakpoint:

```scss
@each $breakpoint, $min in $grid-breakpoints {
    @if $min and $min > 0 {
        @include media-breakpoint-up($breakpoint, $grid-breakpoints) {
            ::ng-deep .navbar.noscript.navbar-expand-#{$breakpoint} {
                bs-navbar-nav .navbar-collapse {
                    height: auto !important;
                    overflow: visible;
                }
            }
        }
    }
}
```

This complements Bootstrap's built-in `@media (min-width: <bp>) { .navbar-expand-{bp} .navbar-collapse { display: flex !important; flex-basis: auto !important; } }` — Bootstrap fixes the *display*; this PRD adds the rule that fixes the *height* (which Bootstrap leaves to the JS collapse plugin).

The rule is gated on `.noscript` so it does not interfere with the JS-driven animation: once `BsNoNoscriptDirective` removes the class on hydration, the rule disengages and `[@slideUpDown]` is the sole authority over `height`.

### 5. Hydration handoff

When Angular hydrates:

1. The `BsNoNoscriptDirective` host binding re-evaluates with `isNoScript = false` → `.noscript` is removed from the `<nav>`.
2. The noscript CSS in §3 and §4 stops matching. Any `height: auto !important` it was contributing falls away.
3. `BsNavbarNavComponent` constructor calls `onWindowResize()` synchronously, which sets `isResizing = true` and `windowWidth = window.innerWidth`. `showNavs()` recomputes.
4. `[@.disabled]="isResizing()"` keeps the slide animation suppressed for the first ~300ms — so the transition from SSR `height: 0` to the new computed state applies instantly, no slide-down flicker. After the debounce, `isResizing` flips to `false` and subsequent toggle actions slide normally.

This handoff is verified end-to-end by the JS-enabled Playwright checks below.

## Files modified

1. **`libs/mintplayer-ng-bootstrap/navbar/src/navbar-nav/navbar-nav.component.ts`** — keep `return false;` for the `windowWidth === null` branch (revert the in-flight hot-fix).
2. **`libs/mintplayer-ng-bootstrap/navbar/src/navbar/navbar.component.scss`** — add the wide-mode override loop from §4. Update the explanatory comment above the `.noscript` block to reference this PRD.
3. **`docs/prd/navbar-noscript.md`** — this document.

No changes to `BsNoNoscriptDirective`, no changes to `navbar.component.html`, no changes to the SSR hamburger toggler markup added in #327.

## Testing

Manual (matches the matrix above):

- **SSR HTML (curl)**: `curl localhost:4200/` and confirm every `.navbar-collapse` has `class="... noscript"` on its parent `<nav>` and `style="height: 0"` inline. (Demonstrates §1.)
- **Noscript wide-mode**: load the SSR HTML in a context with JS disabled, viewport ≥ breakpoint. Menu items visible, hamburger hidden by `d-{bp}-none`. (Demonstrates §4.)
- **Noscript small-mode, initial**: same context, viewport < breakpoint. Hamburger label visible, menu items not. (Demonstrates §1 + §3 absence of `:checked`/`:focus-within`.)
- **Noscript small-mode, click hamburger label**: menu reveals. Click again: menu collapses. (Demonstrates `:has(:checked)` path.)
- **Noscript small-mode, keyboard**: Tab into the page until focus enters the navbar; menu reveals on first Tab into the hidden checkbox; subsequent Tabs walk the menu items. Shift-Tab back out: menu collapses. (Demonstrates `:focus-within` path.)
- **JS-enabled small-mode**: hamburger button (not label) renders; clicking it slides the menu via `@slideUpDown`. No SSR-baked `height: 0` lingers after the first toggle.
- **JS-enabled wide-mode**: menu items inline, no toggler visible.

Automated:

- `navbar.component.spec.ts` and `navbar.aria.spec.ts` should keep passing.
- The Playwright e2e specs (post-#323 migration) that exercise navbar collapse / anchor-scroll must continue to pass at both desktop and mobile viewports.

## Open questions resolved

1. ~~Class semantics: `.noscript` vs `:not(.no-noscript)`?~~ — keep current `.noscript` (added on SSR), affirmative selectors. No rename.
2. ~~Reveal mechanism: only `:focus-within`, or both `:checked` and `:focus-within`?~~ — both. The hamburger label is the mouse/touch path; `:focus-within` is the keyboard path.
