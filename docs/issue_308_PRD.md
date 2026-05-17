# Product Requirements Document: Card — full Bootstrap parity

**Issue**: #308
**Title**: Card: Provide all bootstrap features
**Status**: Draft
**Created**: 2026-05-17
**Last Updated**: 2026-05-17

---

## Summary

Replace the minimal `bs-card` + `bs-card-header` pair with a full Bootstrap 5 card family (body / title / subtitle / text / link / footer / images / group) implemented as Lit web components with thin Angular wrappers. Color variants are exposed via the existing typed `Color` enum on the card root, header, and footer. The image surface is collapsed into a single `<bs-card-img>` with a `position` input that switches between top, bottom, and full-bleed overlay (where the overlay form also wraps slotted content into `card-img-overlay`). Internally the card WCs render in **light DOM** — diverging from the dock/ribbon/otp-input shadow-DOM precedent — so Bootstrap's parent-child CSS selectors (`.card > .card-header`, etc.) keep working. Backwards compatibility is explicitly out of scope.

---

## Overview

The Bootstrap 5 card is a foundational layout primitive: a bordered container that can hold headers, footers, structured body content, images in three positions, and color variants. The current `mintplayer-ng-bootstrap` card exposes ~5% of that surface and pushes consumers back to raw Bootstrap classes for everything else. This PRD covers the rewrite to full parity, with no backwards-compatibility constraints.

---

## Goals & Objectives

### Primary Goals
- Consumers can express every Bootstrap 5 card configuration without writing raw `class="..."` strings.
- The typed `Color` enum is uniformly applicable across alert, button, card, card-header, card-footer.
- The card family follows the WC-first precedent (Lit element + Angular wrapper) so a future React/Vue consumer gets the card for free.

### Success Metrics
- Demo page covers every region and every `Color` variant.
- Playwright visual snapshot of the demo locks the appearance.
- Zero remaining `class="card-*"` strings in the demo app's templates after the rewrite.

---

## Chosen Design

**Component family (Angular selector → underlying custom element):**

| Angular component        | Custom element        | Inputs / attributes                          |
|--------------------------|-----------------------|----------------------------------------------|
| `bs-card`                | `mp-card`             | `[color]: Color?`, `[outline]: boolean`      |
| `bs-card-header`         | `mp-card-header`      | `[color]: Color?`, `[navStyle]: 'tabs'\|'pills'?` |
| `bs-card-body`           | `mp-card-body`        | —                                            |
| `bs-card-footer`         | `mp-card-footer`      | `[color]: Color?`                            |
| `bs-card-title`          | `mp-card-title`       | —                                            |
| `bs-card-subtitle`       | `mp-card-subtitle`    | —                                            |
| `bs-card-text`           | `mp-card-text`        | —                                            |
| `bs-card-link`           | `mp-card-link`        | `[href]: string`                             |
| `bs-card-img`            | `mp-card-img`         | `[position]: 'top'\|'bottom'\|'overlay'`, `[src]: string`, `[alt]: string?` |
| `bs-card-group`          | `mp-card-group`       | —                                            |

**Usage example (representative composition):**

```html
<bs-card [color]="colors.primary">
  <bs-card-img position="top" src="cover.jpg" alt=""></bs-card-img>
  <bs-card-header>Heading</bs-card-header>
  <bs-card-body>
    <bs-card-title>Title</bs-card-title>
    <bs-card-subtitle>Subtitle</bs-card-subtitle>
    <bs-card-text>Some body text.</bs-card-text>
    <bs-card-link href="#">Action</bs-card-link>
  </bs-card-body>
  <bs-list-group>
    <bs-list-group-item>Item</bs-list-group-item>
  </bs-list-group>
  <bs-card-footer>Footer</bs-card-footer>
</bs-card>

<bs-card-group>
  <bs-card>...</bs-card>
  <bs-card>...</bs-card>
</bs-card-group>
```

**Image overlay form:**

```html
<bs-card>
  <bs-card-img position="overlay" src="bg.jpg" alt="">
    <bs-card-title>On image</bs-card-title>
    <bs-card-text>Overlaid copy</bs-card-text>
  </bs-card-img>
</bs-card>
```

**Color contract.** `[color]` on `bs-card` / `bs-card-header` / `bs-card-footer` maps to `text-bg-<name>` (Bootstrap 5.2+ auto-contrast shorthand). `[outline]=true` on `bs-card` flips to `border border-<name>` (+ background reset) on the root only — header/footer keep their own `[color]` independently.

**Internal rendering: light DOM.** Every card WC overrides `createRenderRoot()` to return `this`. This lets Bootstrap's `.card > .card-header { ... }` selectors apply across the WC family, which would otherwise be broken by shadow-DOM boundaries. Each element file carries one class-level comment explaining the divergence from the dock/ribbon precedent.

**Bootstrap CSS lives at the card-root WC only.** A single `@import "bootstrap/scss/card"` in `mp-card.element.scss`; sub-elements rely on the global cascade.

### Designs considered (and rejected)

- **Angular-only redesign** — rejected. Loses cross-framework portability that the lib has been moving toward (memory rule: "Default to Lit WC + Angular wrapper for new components"). The card is being effectively rewritten, qualifying as "new".
- **Shadow DOM + adopt bootstrap card slice in every WC** — rejected. Bootstrap's parent-child CSS selectors (`.card > .card-header`, `.card > .list-group + .card-footer`) cannot cross shadow boundaries. Reimplementing all of those interactions per-WC duplicates upstream Bootstrap and creates a drift surface every Bootstrap minor release.
- **Per-region directives instead of components** (e.g. `<div bsCardBody>`) — rejected at the Q2/Q3 step. WC route forces components per region anyway; mixing directives and components would diverge from dock/otp-input precedent.
- **Separate `<bs-card-img-top>` / `<bs-card-img-bottom>` / `<bs-card-img-overlay>` components** — rejected at Q5. Single `<bs-card-img [position]>` is more compact; the overlay form's dual role (image + container) is captured by a class-level note.
- **Separate `[bgColor]` / `[textColor]` / `[borderColor]` inputs** — rejected at Q4. Three inputs for the 95% case ("give me a blue card"); `text-bg-*` shorthand already solves the contrast problem upstream.
- **Auto-wrap unmatched slot content in card-body** — rejected at Q3. Implicit slot routing is hard to debug, and mixing matched + unmatched children gives ambiguous semantics once image-overlay and list-group enter the picture.

### Designs not run

A 2-agent design fan-out was not run. Public API was fully resolved by the grilling phase; the only remaining open question (light DOM vs shadow DOM) was a single internal decision with a clear technical determinant (Bootstrap's reliance on parent-child selectors), not a design space that benefits from parallel exploration.

---

## Functional Requirements

### Must Have (P0)
- [ ] **FR-1**: `<bs-card>` accepts `[color]: Color?` mapping to `text-bg-<name>`.
- [ ] **FR-2**: `<bs-card>` accepts `[outline]: boolean` (root-only) mapping to `border border-<name>` + background reset, mutually exclusive with the filled variant.
- [ ] **FR-3**: `<bs-card-header>` and `<bs-card-footer>` each accept `[color]: Color?` independent of the card root.
- [ ] **FR-4**: All ten components exist as Lit WCs with Angular wrappers (table above), correct Bootstrap classes applied to host elements.
- [ ] **FR-5**: `<bs-card-img position="top|bottom">` renders `<img class="card-img-{position}">` with `src` / `alt`.
- [ ] **FR-6**: `<bs-card-img position="overlay">` renders `<img class="card-img">` followed by a `<div class="card-img-overlay">` containing the slotted content.
- [ ] **FR-7**: `<bs-card-group>` applies Bootstrap's connected-card-group layout to slotted cards.
- [ ] **FR-8**: `<bs-card-header [navStyle]>` makes a nested `nav` / `ul` carry `card-header-tabs` or `card-header-pills` so Bootstrap's tab integration applies.
- [ ] **FR-9**: All card WCs render in light DOM; the single Bootstrap-card SCSS import lives in `mp-card.element.scss`.
- [ ] **FR-10**: Demo page rewritten to exercise every region and every `Color` variant.

### Should Have (P1)
- [ ] **FR-11**: Playwright visual snapshot of the demo route locks the rendered appearance against regressions.

---

## Timeline & Milestones

### Milestone 1: Lit WC family
- [ ] Directory scaffold + types.
- [ ] Implement all ten `mp-*` elements in light DOM with attribute → class mapping.
- [ ] Bootstrap card SCSS import at `mp-card` only.

### Milestone 2: Angular wrappers
- [ ] One standalone Angular component per WC; typed inputs; effects reflecting to underlying custom elements.
- [ ] Re-export from `card/src/index.ts`.

### Milestone 3: Header tabs / pills
- [ ] `[navStyle]` mechanism on `bs-card-header` confirmed during impl; demo shows tab control inside header.

### Milestone 4: Tests
- [ ] Smoke + class-application specs for every wrapper + WC.

### Milestone 5: Demo + Playwright
- [ ] Demo page rewritten end-to-end.
- [ ] Playwright snapshot committed.

### Milestone 6: BC cleanup
- [ ] Old `[rounded]` / `[noPadding]` inputs removed.
- [ ] Any consumer call-sites in the demo updated.
- [ ] PR description documents the BC break.

---

## Open Questions

> No items escalated to the requester. All design decisions resolved during grilling.

---

## Technical Notes (Issue-Specific)

- **Light DOM trade-off.** Because the card WCs don't isolate styles, consumers must have Bootstrap CSS loaded globally — which is already the assumption of the rest of the lib. Document in the class-level comment of `mp-card.element.ts` so future maintainers don't shadow-DOM-ify "for consistency" with dock/ribbon.
- **SSR.** Light-DOM Lit elements upgrade on the client; on the server they emit the slotted content unstyled until hydration. Verify the demo route doesn't visibly flash; if it does, check existing precedents (otp-input, ribbon) for how they handle the same problem. The `[E2E destructive bootstrap]` memory applies — the Playwright spec must `waitForLoadState('networkidle')` after `goto` and the demo must not use `provideClientHydration()`.
- **`Color.transparent` interaction.** The enum includes `transparent` and `body` / `white` — they map to `text-bg-transparent` etc., which Bootstrap doesn't define. Either define those classes in the card SCSS, narrow the input type to exclude them, or document the silently-empty result. Pick during impl.
- **`bs-card-link`.** Bootstrap's `.card-link` styling applies hover spacing between adjacent links. Verify the light-DOM cascade picks up `.card-link + .card-link` correctly when each link is wrapped in `<bs-card-link>` (a custom element between them may break the adjacency selector). If broken, render the underlying `<a class="card-link">` directly in the host instead of inside a wrapping element.

---

## Related
- Issue #308
- See `CLAUDE.md` for: workspace structure, WC + Angular wrapper conventions, demo SSR caveats.
- Memory pointers: `feedback_wc_plus_angular_wrapper`, `feedback_wc_no_angular_imports`, `feedback_directive_composition_over_inputs`, `project_e2e_destructive_bootstrap`, `reference_button_api`.
