# Product Requirements Document: Navbar `data-bs-theme` migration

**Parent issue**: #324
**Title**: Modernize `BsNavbarComponent` to Bootstrap 5.3 `data-bs-theme` pattern
**Status**: Draft
**Created**: 2026-05-14
**Last Updated**: 2026-05-14

---

## Overview

`BsNavbarComponent` currently emits the **deprecated** `.navbar-light` / `.navbar-dark` classes (Bootstrap deprecated both in v5.2 / v5.3). The `Color.light` branch also drops `bg-light` silently, so a light navbar renders transparent. During issue #324 we hit both bugs trying to make the demo navbar adapt to the toggled theme.

This PRD lands a small migration of the navbar component to Bootstrap 5.3's recommended pattern — `data-bs-theme` host attribute + `bg-*` utility — so:

1. `[color]="Color.light"` produces a *visible* navbar (light-gray) instead of an invisible one (latent bug fix).
2. Setting `[color]="null"` (the documented default) becomes the idiomatic way to ask for a *truly adaptive* navbar that inherits the page theme — pair it with `bg-body-tertiary` in your template to get a theme-aware tinted background.
3. The demo can finally fulfil issue #324's spec — *a navbar that adapts to the toggled theme* — without per-component-level theme hacks.

Folded into the issue #324 PR per the project's branch/PR policy (don't open a second PR for follow-up work surfaced mid-implementation).

---

## Goals & Objectives

### Primary Goals
- Replace the deprecated `.navbar-light` / `.navbar-dark` class emission with `data-bs-theme="light|dark"` on the rendered `<nav>` element.
- Make every `Color` enum value emit a *complete*, *visible* navbar (fix the `Color.light` → no `bg-*` bug).
- Make `[color]="null"` emit neither `data-bs-theme` nor `bg-*` — the cascade from `<html data-bs-theme>` then drives navbar colors automatically. This is the idiomatic adaptive setup.
- Restore issue #324's intended demo behavior: navbar visually adapts to light / dark / auto.

### Success Metrics
- `<bs-navbar>` rendered with each `Color` value produces a visible, readable navbar in both `<html data-bs-theme="light">` and `<html data-bs-theme="dark">` contexts.
- The demo app's main navbar adapts to the theme toggle with sufficient contrast in both modes (manual visual pass).
- Existing 8 navbar specs continue to pass without modification.
- New unit spec asserts the migrated emission logic per `Color` value.

---

## Functional Requirements

### Must Have (P0)

- [ ] **FR-1**: `BsNavbarComponent` renders a `data-bs-theme` host attribute on the same `<nav>` element that currently receives `[class]="navClassList()"`. Value is derived from the `[color]` input per FR-2.
- [ ] **FR-2**: `[color]` mapping table:

  | `[color]` value | Class emission | `data-bs-theme` emission |
  |---|---|---|
  | `null` (default) | *(nothing)* | *(omitted — cascades from page)* |
  | `Color.light` | `bg-light` | `light` |
  | `Color.white` | `bg-white` | `light` |
  | `Color.body` | `bg-body` | *(omitted — cascades from page)* |
  | `Color.transparent` | `bg-transparent` | *(omitted — cascades from page)* |
  | `Color.dark` | `bg-dark` | `dark` |
  | `Color.primary` `.secondary` `.success` `.danger` `.warning` `.info` | `bg-{name}` | `dark` |

- [ ] **FR-3**: The `[class]` binding stops emitting `.navbar-light` and `.navbar-dark` entirely. Bootstrap 5.3 has deprecated both — they no longer drive token resolution; the `[data-bs-theme]` selector cascade does.
- [ ] **FR-4**: Demo navbar updated to `[color]="null"` + `class="bg-body-tertiary"`. Result: navbar inherits `<html data-bs-theme>` (set by `BsThemeService`) and renders with `--bs-tertiary-bg` — both vars swap with the page theme automatically. No `effectiveMode()` binding needed; pure CSS-driven adaptation.
- [ ] **FR-5**: All 8 existing navbar specs continue to pass without modification. (Verified by team audit — none assert on `.navbar-light` / `.navbar-dark`.)
- [ ] **FR-6**: New unit spec covers FR-2's full mapping table: instantiate `<bs-navbar>` with each `Color` value (and `null`), assert the resulting host classes and `data-bs-theme` attribute. Plus one regression test confirming `.navbar-light` and `.navbar-dark` are *not* emitted for any input.

### Should Have (P1)

- [ ] **FR-7**: Theming doc page (`/additional-samples/theming`) gets a small section on the navbar's new behavior — *"to make your navbar follow the page theme, set `[color]="null"` and add `bg-body-tertiary"`* — with the Bootstrap docs link for the underlying pattern.
- [ ] **FR-8**: CHANGELOG entry under `[Breaking]` (or `[Changed]` if we judge it not actually breaking — see Migration Notes) describing the class-emission change.

### Out of Scope
- Adding `Color.body_tertiary` to the `Color` enum. The `bg-body-tertiary` utility is applied as a normal class on the consumer side — no enum change needed.
- Replacing Bootstrap's `_navbar.scss` import with a curated subset. The current import works; modernizing the import strategy is a separate concern.
- Migrating other components that use legacy theme classes (none audited in this work — would be a per-component task).
- Auto-detection of color contrast: consumers passing `[color]="Color.primary"` get `data-bs-theme="dark"` regardless of whether the primary token resolves to a dark or light hue in their custom theme. Manual selection trumps heuristics.

---

## Migration Notes / Breaking-Change Analysis

The semantic of `[color]` is **unchanged** for every realistic consumer:

- `Color.dark` (the only production usage): still produces a dark navbar (`bg-dark` + `data-bs-theme="dark"`).
- `Color.light` (used implicitly by 8 specs via `null` default): the *default null* path no longer emits `navbar-light` — that class was a no-op in 5.3 anyway. **The actual visible behavior of `<bs-navbar>` with no `[color]` set changes from "transparent navbar" to "fully inherits page theme, no background". For 99% of consumers this is invisible (their navbar already had no styling).**
- `Color.light` (explicit): the navbar is now *visible* (`bg-light`). Anyone who was setting `[color]="Color.light"` was almost certainly trying to get a visible light-themed navbar — they get one now.
- All other `Color` values: emit `data-bs-theme="dark"` instead of `.navbar-dark`. Visually identical for any consumer using Bootstrap's default CSS — both classes resolve text/link colors via the same `--bs-navbar-*` token. Different only if the consumer has CSS keyed off `.navbar-dark` directly.

**Net effect**: the change is *technically breaking* (the class list is different), *practically a no-op* for any consumer not styling against the deprecated classes themselves. Worth a `[Breaking]` CHANGELOG note for transparency, but no migration steps consumers actually need to take unless they have custom CSS keyed off `.navbar-dark` / `.navbar-light`.

---

## Timeline & Milestones

### Milestone 1: Library change
- [ ] Update `BsNavbarComponent` — replace `backgroundColorClass` computed with two computeds: `bgClass` (just `bg-*` per FR-2 table) and `dataBsTheme` (per FR-2 table).
- [ ] Template binds both: `[class]="navClassList()"` keeps existing wiring; add `[attr.data-bs-theme]="dataBsTheme()"`.
- [ ] Remove `navbar-light` / `navbar-dark` emission entirely.

### Milestone 2: Tests
- [ ] New unit spec `navbar.color.spec.ts` (or appended to `navbar.component.spec.ts`) covering full FR-2 mapping.
- [ ] Verify all 8 existing specs still pass.

### Milestone 3: Demo update
- [ ] `app.component.html` — change `[color]="colors.dark"` → `[color]="null"` and add `class="bg-body-tertiary"` to the `<bs-navbar>`.
- [ ] Remove the explanatory comment I added earlier justifying "navbar always dark" — replaced by the new adaptive behavior.
- [ ] Smoke-test in browser: navbar visible and theme-adaptive in light + dark; brand text + menu items legible in both modes.

### Milestone 4: Polish
- [ ] Add the small navbar-adaptive note to `/additional-samples/theming` (FR-7).
- [ ] CHANGELOG entry under `[Changed]` or `[Breaking]` (FR-8).
- [ ] Update the parent #324 PRD to reflect the new navbar behavior — replace the documented "fall-back: navbar stays dark always" trap text with the new adaptive setup.

---

## Open Questions

> None. All resolved against the Bootstrap 5.3 documentation and the team audit findings.

---

## Technical Notes (Issue-Specific)

- **Why the cascade works:** `node_modules/bootstrap/scss/_navbar.scss` defines `--bs-navbar-color`, `--bs-navbar-active-color`, etc. inside `.navbar { … }` selectors, with dark-mode overrides under `[data-bs-theme="dark"] .navbar { … }`. When we set `data-bs-theme` on the navbar itself (or let it inherit from `<html>`), the SCSS selector matches and the right tokens resolve. The library imports `_navbar.scss` at `navbar.component.scss:12`, so all of this is already in our compiled CSS.
- **Why `bg-body-tertiary` is the right adaptive bg:** Bootstrap's `--bs-tertiary-bg` is redefined for both `[data-bs-theme="light"]` and `[data-bs-theme="dark"]` in `_root.scss`. So `class="bg-body-tertiary"` produces a slightly tinted background that swaps with the page theme — light gray on light, dark grey-blue on dark. Better visual separation from the body than `bg-body` (which is the page color, no contrast).
- **Why we don't change the `Color` enum:** the enum is shared across many components (alert, button, badge, etc.). Adding `body_tertiary` for one component's benefit pollutes the shared shape. Consumers wanting a tertiary-bg navbar pass `[color]="null"` and add the class via plain HTML — same shape Bootstrap docs use.
- **`Color.body` semantic change:** old behavior emitted `navbar-dark bg-body` — dark text on the page body color. In dark mode, body bg is dark and text was already dark = unreadable. New behavior emits `bg-body` only, no `data-bs-theme` → both bg and text inherit from page theme → readable in both modes. *De-facto bugfix*, though no one was reported to use this value.

---

## Related
- Parent: Issue #324 + `docs/issue_324_PRD.md`
- Bootstrap 5.3 navbar docs: <https://getbootstrap.com/docs/5.3/components/navbar/#color-schemes>
- Bootstrap 5.3 color modes: <https://getbootstrap.com/docs/5.3/customize/color-modes/>
- Library file under change: `libs/mintplayer-ng-bootstrap/navbar/src/navbar/navbar.component.ts`
- Library SCSS that already cascades correctly: `libs/mintplayer-ng-bootstrap/navbar/src/navbar/navbar.component.scss`
