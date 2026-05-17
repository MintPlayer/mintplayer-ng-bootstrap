# Product Requirements Document: Card — full Bootstrap parity

**Issue**: #308
**Title**: Card: Provide all bootstrap features
**Status**: Complete
**Created**: 2026-05-17
**Last Updated**: 2026-05-17

---

## Summary

**Shipped** — ten components (`bs-card` / `-header` / `-body` / `-footer` / `-title` / `-subtitle` / `-text` / `-link` / `-img` / `-group`) plus a sibling Lit-shaped WC family (`mp-card*`), totalling 23 source files under `libs/mintplayer-ng-bootstrap/card/src/lib/`. Both layers share a single `card-classes.ts` of class-mutation helpers so they cannot drift. The Bootstrap card SCSS is imported once at `mp-card.element.scss` and injected into `document.head` by `ensureCardStylesInjected()` — both `<mp-card>`'s `connectedCallback` and `BsCardComponent`'s constructor trigger it, so Angular-only and direct-WC consumers each pull the styles once. The demo at `/basic/containers/card` exercises every region and every `Color` variant; a Playwright visual baseline at `apps/ng-bootstrap-demo-e2e/.../card-demo-chromium-win32.png` pins the appearance.

**Load-bearing decisions made during implementation:**

- **Plain `HTMLElement` instead of `LitElement` for the WC family** — the PRD's "Lit + light DOM" intent was sound for framework portability, but Lit's `render()` clobbers slotted children even when `createRenderRoot()` returns `this`. Plain `HTMLElement` gives the same reactive surface (`observedAttributes` + `attributeChangedCallback`) for structural elements that own no template, without that pitfall. Captured in `card-classes.ts:1-13`.
- **Angular wrappers apply Bootstrap classes to their own host** instead of rendering `<mp-card>` inside. If the wrapper rendered the WC nested, the DOM would be `<bs-card><mp-card class="card">…</mp-card></bs-card>` and Bootstrap's `.card > .card-header` parent-child selectors would no longer match. With host-class application, `<bs-card>` IS the `.card` element and `<bs-card-header>` IS a direct child — selectors apply naturally. The WCs and Angular wrappers are parallel implementations (no nesting), sharing only the class-mutation logic.
- **`<bs-card-img>` host carries the same `.card-img-*` class as the inner `<img>`**, plus `overflow: hidden` on the host — so card-group's corner-rounding adjacency `.card-group > .card > .card-img-top` matches AND Bootstrap's `width: 100%` rule on `.card-img-top` still sizes the actual image element. The host's border-radius then clips the inner img.
- **`<bs-card-img>` template uses a single `<ng-content>` inside `<ng-template #projected>` projected via `*ngTemplateOutlet`** in each `@switch` branch — multiple `<ng-content>` slots in conditional branches silently dropped the projected children in Angular 18+.

**Traps named during the work** that a reviewer should keep in mind:

- Adding `class="d-block"` to a `<bs-card-group>` breaks the responsive flex layout (`d-block` is `!important`). Any future demo or consumer code that wants to override card-group's display has to use a non-utility approach.
- Future maintainers who "consistency-fix" the card WCs to `LitElement` will re-introduce the slotted-children-clobbering bug; comment in `card-classes.ts:1-13` names this explicitly.
- `mp-card-img` reads `position` only on connect; runtime changes now `console.warn` instead of silently no-op-ing.

**Drifts deferred:** Playwright visual spec skips on non-Win32 (`green-by-skip` on Linux CI, mirroring `ribbon.visual.spec.ts` precedent — same trade-off, same memo).

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
- [x] **FR-1**: `<bs-card>` accepts `[color]: Color?` mapping to `text-bg-<name>`.
- [x] **FR-2**: `<bs-card>` accepts `[outline]: boolean` (root-only) mapping to `border border-<name>` + background reset, mutually exclusive with the filled variant.
- [x] **FR-3**: `<bs-card-header>` and `<bs-card-footer>` each accept `[color]: Color?` independent of the card root.
- [x] **FR-4**: All ten components exist as WCs (plain HTMLElement, not LitElement — see Summary) with Angular wrappers (table above), correct Bootstrap classes applied to host elements.
- [x] **FR-5**: `<bs-card-img position="top|bottom">` renders `<img class="card-img-{position}">` with `src` / `alt`.
- [x] **FR-6**: `<bs-card-img position="overlay">` renders `<img class="card-img">` followed by a `<div class="card-img-overlay">` containing the slotted content.
- [x] **FR-7**: `<bs-card-group>` applies Bootstrap's connected-card-group layout to slotted cards.
- [x] **FR-8**: `<bs-card-header [navStyle]>` makes a nested `nav` / `ul` carry `card-header-tabs` or `card-header-pills` so Bootstrap's tab integration applies.
- [x] **FR-9**: All card WCs render in light DOM; the single Bootstrap-card SCSS import lives in `mp-card.element.scss`.
- [x] **FR-10**: Demo page rewritten to exercise every region and every `Color` variant.

### Should Have (P1)
- [x] **FR-11**: Playwright visual snapshot of the demo route locks the rendered appearance against regressions.

---

## Timeline & Milestones

### Milestone 1: Lit WC family
- [x] Directory scaffold + types.
- [x] Implement all ten `mp-*` elements in light DOM with attribute → class mapping.
- [x] Bootstrap card SCSS import at `mp-card` only.

### Milestone 2: Angular wrappers
- [x] One standalone Angular component per WC; typed inputs; effects reflecting to underlying custom elements.
- [x] Re-export from `card/src/index.ts`.

### Milestone 3: Header tabs / pills
- [x] `[navStyle]` mechanism on `bs-card-header` confirmed during impl; demo shows tab control inside header.

### Milestone 4: Tests
- [x] Smoke + class-application specs for every wrapper + WC.

### Milestone 5: Demo + Playwright
- [x] Demo page rewritten end-to-end.
- [x] Playwright snapshot committed.

### Milestone 6: BC cleanup
- [x] Old `[rounded]` / `[noPadding]` inputs removed.
- [x] Any consumer call-sites in the demo updated.
- [ ] PR description documents the BC break. (Owned by `pr_create`)

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
