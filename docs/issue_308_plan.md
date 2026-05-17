# Development Plan: Issue #308

**Issue**: #308
**Title**: Card: Provide all bootstrap features
**Type**: Feature / Enhancement (BC break accepted by author)
**Priority**: Medium

## Executive Summary

The current `bs-card` exposes only `[rounded]` plus a minimal `bs-card-header`. Bootstrap 5 cards have a much larger surface: `card-body`, `card-title`, `card-subtitle`, `card-text`, `card-link`, `card-footer`, three image positions (`card-img-top`/`-bottom`/full-bleed + `card-img-overlay`), color variants (`text-bg-*` / `border-*`), the `card-group` layout primitive, and the `card-header-tabs` / `card-header-pills` nav modifiers.

This redesign ships the full Bootstrap card surface as a family of Lit web components with thin Angular wrappers, following the dock / scheduler / otp-input precedent for new components. Backwards compatibility is explicitly out of scope — the existing demo and any consumer call-sites get rewritten in this PR.

---

## Problem Statement

### Current Behavior
- `<bs-card>` renders `<div class="card">` with a hardcoded inner `<div class="card-body p-0">` wrapping all `<ng-content>`. The `p-0` is a workaround that fights Bootstrap's intended padding.
- `<bs-card-header>` exists with a single `noPadding` input.
- Nothing else from Bootstrap card is exposed: no body component, no title/subtitle/text, no footer, no image positions, no color/border variants, no card-group, no header tabs/pills.
- Color variants must be applied by the consumer with raw `class="bg-primary text-white"`, bypassing the typed `Color` enum used by `bs-alert` and `BsButtonTypeDirective`.

### Expected Behavior
A consumer can compose any Bootstrap card configuration without dropping to raw classes:

```html
<bs-card [color]="colors.primary">
  <bs-card-img position="top" src="header.jpg"></bs-card-img>
  <bs-card-header [color]="colors.dark">Title row</bs-card-header>
  <bs-card-body>
    <bs-card-title>Heading</bs-card-title>
    <bs-card-subtitle>Subheading</bs-card-subtitle>
    <bs-card-text>Body copy.</bs-card-text>
    <bs-card-link href="...">Action</bs-card-link>
  </bs-card-body>
  <bs-list-group>...</bs-list-group>
  <bs-card-footer>Footer</bs-card-footer>
</bs-card>

<bs-card-group>
  <bs-card>...</bs-card>
  <bs-card>...</bs-card>
</bs-card-group>
```

Image-overlay form:
```html
<bs-card>
  <bs-card-img position="overlay" src="bg.jpg">
    <bs-card-title>On image</bs-card-title>
    <bs-card-text>Overlaid copy</bs-card-text>
  </bs-card-img>
</bs-card>
```

### Impact
Consumers stop reaching for raw Bootstrap classes inside their templates, the typed `Color` enum becomes uniformly applicable across alert / button / card / footer, and the lib regains parity with what users expect when they install a "ng-bootstrap" package.

---

## Technical Analysis

### Files to Modify

**Refactor (rewrite, no BC):**
- `libs/mintplayer-ng-bootstrap/card/src/index.ts`
- `libs/mintplayer-ng-bootstrap/card/src/card/card.component.{ts,html,scss,spec.ts}`
- `libs/mintplayer-ng-bootstrap/card/src/card-header/card-header.component.{ts,html,scss,spec.ts}`
- `apps/ng-bootstrap-demo/src/app/pages/basic/containers/card/card.component.{ts,html}` — rewrite demo to showcase every new piece.

**Add (Lit WC layer under `card/src/lib/web-components/`):**
- `mp-card.element.ts` (+ `.template.ts` / `.scss`)
- `mp-card-header.element.ts`
- `mp-card-body.element.ts`
- `mp-card-footer.element.ts`
- `mp-card-title.element.ts`
- `mp-card-subtitle.element.ts`
- `mp-card-text.element.ts`
- `mp-card-link.element.ts`
- `mp-card-img.element.ts` (single component, `position` attribute switches between top/bottom/overlay shapes)
- `mp-card-group.element.ts`

**Add (Angular wrappers under `card/src/lib/components/`):**
- One Angular component per WC, all standalone, all `ChangeDetectionStrategy.OnPush`. Selectors: `bs-card-body`, `bs-card-title`, `bs-card-subtitle`, `bs-card-text`, `bs-card-link`, `bs-card-footer`, `bs-card-img`, `bs-card-group`. Existing `bs-card` and `bs-card-header` get rewritten in the same shape.

**Add (types):**
- `card/src/lib/types/card-image-position.ts` — `'top' | 'bottom' | 'overlay'`.

### Dependencies
- Existing `Color` enum at `libs/mintplayer-ng-bootstrap/src/lib/enums/color.enum.ts` — reused for `[color]`.
- Bootstrap SCSS at `node_modules/bootstrap/scss/card.scss` — keep importing once at the card root component level (light DOM strategy means a single `@import` covers all sub-elements).
- `@mintplayer/ng-bootstrap/tab-control` — only relevant for verifying header-tabs/pills work when a tab control is slotted into `bs-card-header`. No code change in the tab lib expected.
- `@mintplayer/ng-bootstrap/list-group` — must remain compatible inside `bs-card` (Bootstrap's CSS coordinates list-group + card-header/footer border behaviour).

### Architecture Considerations
See the **Chosen Design** section of the PRD. Two load-bearing calls:
1. **Lit WC + Angular wrapper** for every region (matches dock/otp-input precedent).
2. **Light DOM rendering** for every card WC (`createRenderRoot() { return this; }`) — diverges from the in-house shadow-DOM precedent because Bootstrap's `.card > .card-header` parent-child selectors cannot pierce shadow boundaries. Each WC adds a single class-level comment explaining the divergence.

The Angular wrappers carry no behaviour — they exist to provide typed inputs, IDE completion, and SSR-safe rendering of the underlying custom elements. No Angular imports inside `web-components/**`.

---

## Implementation Plan

### Phase 1: Lit WC family in light DOM
1. Create the directory tree under `card/src/lib/{web-components,components,types}`.
2. Implement `mp-card.element.ts` — light DOM, applies `class="card"` to host, reads `color`/`outline` attributes, maps to Bootstrap classes (`text-bg-<name>` or `border border-<name>` + `bg-transparent` for outline).
3. Implement the structural sub-elements (`mp-card-header`, `-body`, `-footer`, `-title`, `-subtitle`, `-text`, `-link`) — each applies its Bootstrap class to the host element.
4. Implement `mp-card-img` — observes `position` and `src`, renders `<img>` with appropriate class; when `position="overlay"`, also wraps slotted content in a `card-img-overlay` div (light-DOM render so external CSS sees it).
5. Implement `mp-card-group` — applies `class="card-group"` to host.
6. Single Bootstrap-card SCSS import lives in `mp-card.element.scss` (light-DOM, so global cascade applies to all children regardless of which WC owns them).

### Phase 2: Angular wrappers
1. One standalone component per WC, all with `bs-`-prefixed selectors and `OnPush`.
2. `BsCardComponent` exposes `[color]: Color | undefined` and `[outline]: boolean`; effect-based attribute reflection onto the underlying `<mp-card>`.
3. `BsCardHeaderComponent` / `BsCardFooterComponent` expose `[color]: Color | undefined` only (no outline — Bootstrap doesn't define outline for header/footer).
4. `BsCardImgComponent` exposes `[position]: 'top' | 'bottom' | 'overlay'`, `[src]: string`, `[alt]: string`.
5. Re-export everything from `card/src/index.ts`.

### Phase 3: Header tabs / pills wiring
1. `BsCardHeaderComponent` gets a `[navStyle]: 'tabs' | 'pills' | undefined` input. When set, applies `card-header-tabs` or `card-header-pills` to a slotted nav via a class hook on the host (light DOM + Bootstrap's CSS does the rest).
2. Demo: add an example placing a `bs-tab-control` (or equivalent nav) inside a `bs-card-header` with `[navStyle]="'tabs'"`.

### Phase 4: Tests
1. Smoke specs for every new Angular wrapper (`should create`).
2. Class-application specs:
   - `bs-card [color]=Color.primary` → host has `text-bg-primary`.
   - `bs-card [color]=Color.primary [outline]=true` → host has `border border-primary` + `bg-transparent`, no `text-bg-*`.
   - `bs-card-header [color]=Color.dark` → host has `text-bg-dark`.
   - `bs-card-img position="top"` → renders `<img class="card-img-top">`.
   - `bs-card-img position="overlay"` → renders `<img class="card-img">` + a `card-img-overlay` slot wrapper.
   - `bs-card-header [navStyle]="'tabs'"` → host carries the contract class (or the slotted nav gets `card-header-tabs` via the chosen mechanism — to confirm during impl).
3. WC-level specs mirror the wrapper specs for the underlying custom elements.

### Phase 5: Demo + Playwright
1. Rewrite `apps/ng-bootstrap-demo/src/app/pages/basic/containers/card/card.component.html` to showcase: simple card, card with header+body+footer, card with list-group, card with image-top, card with image-overlay, all color variants (one card per `Color` value), outline variants, card-group, horizontal card (using existing `bs-grid` + `bsRow` + `class="g-0"` — pattern only, no new component), header with tab-control.
2. Add a Playwright spec that loads the card demo route and captures a visual snapshot. Frame the spec narrowly — `await page.goto(...)`, `await page.waitForLoadState('networkidle')` (per the SSR-destructive-bootstrap memory), `await expect(page).toHaveScreenshot('card-demo.png')`. Update the baseline on the first run.

### Phase 6: SSR + Cleanup
1. Sanity-pass the demo under SSR prerender — light-DOM Lit elements don't render on the server; confirm consumers see graceful unstyled output until hydration (or guard with `bsHostElement`-style helpers if the lib has any). Check existing precedents (otp-input, ribbon) to see how they handle this.
2. Remove the `noPadding` and `rounded` inputs from the old components. Document the BC break in the PR description.

---

## Test Scenarios

### Scenario 1: Composed card renders every Bootstrap region
- **Given**: a `bs-card` containing header, image-top, body (with title/subtitle/text/link), list-group, and footer.
- **When**: the demo page renders.
- **Then**: the DOM contains exactly one element each of `.card`, `.card-header`, `.card-img-top`, `.card-body`, `.card-title`, `.card-subtitle`, `.card-text`, `.card-link`, `.list-group`, `.card-footer`, in document order.

### Scenario 2: Color variant applies the right shorthand class
- **Given**: `<bs-card [color]="colors.success">…</bs-card>`.
- **When**: rendered.
- **Then**: the host element has class `text-bg-success`, and does NOT have `border-*` / `bg-transparent`.

### Scenario 3: Outline variant flips to border-only
- **Given**: `<bs-card [color]="colors.danger" [outline]="true">…</bs-card>`.
- **When**: rendered.
- **Then**: the host element has classes `border`, `border-danger`, and either `bg-transparent` or no `text-bg-*`. The header/footer inside are unaffected unless they set their own `[color]`.

### Scenario 4: Card image overlay wraps slotted content
- **Given**: `<bs-card-img position="overlay" src="x.jpg"><bs-card-title>T</bs-card-title></bs-card-img>` inside a card.
- **When**: rendered.
- **Then**: an `<img class="card-img" src="x.jpg">` exists, followed by a `<div class="card-img-overlay">` containing the title. The img and the overlay are siblings inside the same card root.

### Scenario 5: Header nav-style applies tab classes
- **Given**: `<bs-card-header [navStyle]="'tabs'"><nav class="nav nav-tabs">…</nav></bs-card-header>`.
- **When**: rendered.
- **Then**: the inner nav (or its `ul`) ends up carrying `card-header-tabs` so Bootstrap's `_card.scss` styling kicks in. (Exact mechanism is an implementation detail to be settled during Phase 3.)

### Scenario 6: Card group renders connected
- **Given**: two `bs-card`s inside `<bs-card-group>`.
- **When**: rendered.
- **Then**: the host has class `card-group`, no gutters between cards, both cards equal height.

### Scenario 7: Visual regression (Playwright)
- **Given**: the rewritten demo page at `/containers/card`.
- **When**: navigated to and `networkidle` settles.
- **Then**: the page screenshot matches the committed baseline (within Playwright's default pixel tolerance).

---

## Acceptance Criteria

- [ ] All ten Bootstrap card regions exist as Lit WCs + Angular wrappers, light-DOM rendered.
- [ ] `<bs-card>`, `<bs-card-header>`, `<bs-card-footer>` all accept `[color]: Color`. `<bs-card>` also accepts `[outline]: boolean`.
- [ ] `<bs-card-img>` supports `position="top"`, `position="bottom"`, `position="overlay"` with the overlay form correctly wrapping slotted content.
- [ ] `<bs-card-group>` exists and renders Bootstrap's connected-card-group layout.
- [ ] `<bs-card-header>` exposes a way (`[navStyle]` or equivalent) to apply `card-header-tabs` / `card-header-pills` when a nav is slotted in.
- [ ] Demo page exercises every region + variant.
- [ ] Smoke + class-application specs pass for every new component.
- [ ] Playwright visual snapshot of the demo committed and green in CI.
- [ ] No `:host ::ng-deep @import "bootstrap/scss/card"` remains in any sub-element; the single import lives at the card root.
- [ ] No Angular imports inside `card/src/lib/web-components/**`.

---

## Build & Test Commands

```bash
# Frontend lib build
npx nx build mintplayer-ng-bootstrap

# Lib unit tests (card only)
npx nx test mintplayer-ng-bootstrap --testFile=card

# Demo dev server
npx nx serve ng-bootstrap-demo

# Playwright (card demo route)
npx nx e2e ng-bootstrap-demo-e2e --testFile=card
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/card/**` — target of the rewrite.
- `libs/mintplayer-ng-bootstrap/src/lib/enums/color.enum.ts` — reused.
- `libs/mintplayer-ng-bootstrap/alert/**` — color-input precedent.
- `libs/mintplayer-ng-bootstrap/button-type/**` — `[color]` directive precedent.
- `libs/mintplayer-ng-bootstrap/otp-input/**` — Lit WC + Angular wrapper precedent (most recent).
- `libs/mintplayer-ng-bootstrap/dock/**` — shadow-DOM Lit WC precedent we're diverging from for card-specific reasons.
- `apps/ng-bootstrap-demo/src/app/pages/basic/containers/card/**` — demo to rewrite.
