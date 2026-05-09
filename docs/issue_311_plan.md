# Development Plan: Issue #311

**Issue**: #311
**Title**: Stepper demo using angular CDK
**Type**: Demo / docs (no library code change)
**Priority**: Medium

## Executive Summary

Add a new demo page under `Additional samples → Stepper` that showcases Angular CDK's `@angular/cdk/stepper` primitive across the full 2×2 cross of its two main axes (`linear` × `orientation`). No library code changes — this is purely a new page in `apps/ng-bootstrap-demo`. The page also links to the upstream Angular CDK stepper documentation so visitors can drill in.

---

## Problem Statement

### Current Behavior
The demo app's "Additional samples" menu lists Collapse, FocusTrap, Drag-drop, Select2 drag-drop, QR-code viewer, Swiper, and Anchor scrolling — but no stepper. Users evaluating the library can see CDK Drag-Drop integrated but have no example for CDK Stepper.

### Expected Behavior
A new menu entry `Additional samples → Stepper` opens `/additional-samples/stepper`. The page shows four runnable stepper instances covering linear/non-linear and horizontal/vertical, each styled with Bootstrap utilities and `BsButtonTypeDirective` (`[color]` on plain `<button>`), plus an info alert linking to the Angular CDK stepper docs.

### Impact
Closes a documentation gap. Demonstrates that the Bootstrap library composes cleanly with Angular CDK primitives (precedent: drag-drop). No runtime impact on consumers.

---

## Technical Analysis

### Files to Create
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/stepper/stepper.component.ts`
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/stepper/stepper.component.html`
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/stepper/stepper.component.scss`
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/stepper/stepper.component.spec.ts`

### Files to Modify
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/additional-samples.routes.ts` — add `{ path: 'stepper', loadComponent: () => import('./stepper/stepper.component').then(m => m.StepperComponent) }`.
- `apps/ng-bootstrap-demo/src/app/app.component.html` — add a `<bs-navbar-item>` linking to `/additional-samples/stepper` inside the `Additional samples` dropdown, alphabetically near the existing entries (after "Swiper" or before "Anchor scrolling" — keep dropdown order).

### Dependencies
- `@angular/cdk` (v21.2.9, already installed) — uses the `@angular/cdk/stepper` entry point.
- `@angular/forms` (v21.2.9, already installed) — `ReactiveFormsModule`, `FormGroup`, `FormControl`, `Validators`.
- `@mintplayer/ng-bootstrap/grid`, `/button-type` (`BsButtonTypeDirective` — applied as `[color]` on a plain `<button>`), `/alert`, `/form` — already used by sibling demos.
- No new packages.

### Architecture Considerations
- Match the existing demo conventions seen in `swiper.component.ts` and `drag-drop.component.ts`: standalone component, `OnPush` change detection, `templateUrl`/`styleUrls`, demo selector prefix `demo-stepper`.
- Use the CDK stepper's `cdkStepper` directive applied to a host element, with `*cdkStepDef`-style step definitions (`<cdk-step>`), `*cdkStepHeader` for header rendering, and `cdkStepperNext`/`cdkStepperPrevious` directives on plain `<button>` elements (styled via `[color]` from `BsButtonTypeDirective`) for navigation.
- The `linear` and `orientation` inputs come straight from `CdkStepper`. Forms gate Next on linear examples via `[stepControl]` bound to a `FormGroup`.
- Buttons use the `BsButtonTypeDirective` API: `<button [color]="colors.primary">…</button>` — there is no `<bs-button>` component or `bsButton` attribute selector. Reference: `apps/ng-bootstrap-demo/src/app/pages/basic/button-type/button-type.component.{ts,html}`.
- All styling local to `stepper.component.scss`. No new Bootstrap library tokens.

---

## Implementation Plan

### Phase 1: Component scaffold
1. Create the four files under `stepper/`. Mirror `swiper.component.ts`'s shape: standalone, `OnPush`, demo selector.
2. Wire route in `additional-samples.routes.ts`.
3. Wire navbar entry in `app.component.html` (Additional samples dropdown).
4. `stepper.component.spec.ts`: minimal `should create` test, mirroring `drag-drop.component.spec.ts`.

### Phase 2: Page chrome
1. `<h1 class="text-center">Stepper</h1>` matching siblings.
2. Below the H1, a `<bs-alert [type]="colors.info">` with a hyperlink to `https://material.angular.dev/cdk/stepper/overview` and a one-sentence orientation note.
3. Four `<h2>`-titled sections inside one `<bs-grid>` container:
   - "Linear · Horizontal (reactive forms wizard)"
   - "Linear · Vertical (reactive forms wizard)"
   - "Non-linear · Horizontal (free navigation)"
   - "Non-linear · Vertical (free navigation)"

### Phase 3: Linear examples (with reactive forms)
1. Two `FormGroup`s per linear example (3 steps × 2 demos = 6 form groups total). Use realistic field choices: account info (name, email), address (street, city, zip), confirm (terms checkbox).
2. Render each step header via `*cdkStepHeader` — numbered circle + label, with `.active`/`.completed` modifier classes.
3. Step body uses `formGroup` binding and `formControlName` inputs styled with `<bs-form-control>` (consistent with other reactive-form demos in this repo).
4. `[stepControl]` on each `<cdk-step>` so Next is disabled until the step's form is valid.
5. Last step shows a "Submit" button (`(click)` writes a placeholder result) and a Reset that calls `stepper.reset()`.

### Phase 4: Non-linear examples
1. Static content per step (text + a couple of `<bs-alert>` blocks). No forms, no validation.
2. All step headers clickable — clicking jumps the stepper to that index (CDK stepper supports this when `linear=false`).
3. Same Back/Next/Reset controls below.

### Phase 5: Styling (`stepper.component.scss`)
1. `.step-circle` — fixed-size round badge, primary background when active, success when completed, muted otherwise.
2. `.step-headers-horizontal` — flex row, connecting line between circles.
3. `.step-headers-vertical` — flex column, connecting line via left border on the body.
4. Smooth transitions on the active/completed state changes.
5. Honour `prefers-reduced-motion: reduce`.

### Phase 6: Verify
1. `npx nx build ng-bootstrap-demo` — clean compile.
2. `npx nx serve ng-bootstrap-demo` — visit `/additional-samples/stepper`.
3. Walk through all four demos manually:
   - Linear: confirm Next is disabled with empty/invalid form, enabled when valid, advances on click.
   - Non-linear: confirm clicking any header jumps to that step.
   - Vertical: confirm headers stack and bodies render below their respective headers.
4. Open DevTools narrow viewport — confirm no horizontal overflow on mobile.
5. `npx nx test ng-bootstrap-demo --testPathPattern=stepper` — spec passes.

---

## Test Scenarios

### Scenario 1: Linear stepper gates Next on form validity
- **Given**: User opens `/additional-samples/stepper` and focuses the "Linear · Horizontal" example.
- **When**: User views the first step with all fields empty.
- **Then**: Next button is disabled. After filling required fields with valid values, Next becomes enabled and clicking it advances to step 2.

### Scenario 2: Non-linear stepper allows free navigation
- **Given**: User scrolls to "Non-linear · Horizontal".
- **When**: User clicks the third step's header without visiting steps 1 or 2.
- **Then**: Stepper jumps directly to step 3; Back returns to 2.

### Scenario 3: Vertical orientation lays out correctly
- **Given**: User views "Linear · Vertical".
- **When**: Page renders.
- **Then**: Step headers stack vertically; the active step's body renders below its header (not in a separate column). On a 320px viewport the layout still fits without horizontal scroll.

### Scenario 4: Reset returns to first step
- **Given**: User has advanced past step 1 in any of the four examples.
- **When**: User clicks Reset.
- **Then**: Stepper returns to step 1 with form values cleared (linear) or just selected-index reset (non-linear).

### Scenario 5: Docs link works
- **Given**: User reads the info alert at the top of the page.
- **When**: User clicks the "Angular CDK stepper documentation" link.
- **Then**: Browser navigates to the upstream CDK stepper docs page in a new tab.

### Scenario 6: Navbar entry navigates correctly
- **Given**: User opens the Additional samples dropdown in the navbar.
- **When**: User clicks "Stepper".
- **Then**: Browser routes to `/additional-samples/stepper` and the new page renders.

---

## Acceptance Criteria

- [ ] New folder `apps/ng-bootstrap-demo/src/app/pages/additional-samples/stepper/` exists with `.ts/.html/.scss/.spec.ts`.
- [ ] Route registered in `additional-samples.routes.ts`.
- [ ] Navbar entry added in `app.component.html` (Additional samples dropdown).
- [ ] Page renders four working stepper examples covering the 2×2 cross of `linear` × `orientation`.
- [ ] Linear examples use `ReactiveFormsModule` with `[stepControl]` gating Next.
- [ ] Non-linear examples allow clicking any header to jump.
- [ ] Page header includes a `<bs-alert type="info">` linking to the upstream Angular CDK stepper docs.
- [ ] No changes to any file under `libs/`.
- [ ] `npx nx build ng-bootstrap-demo` passes.
- [ ] `npx nx test ng-bootstrap-demo --testPathPattern=stepper` passes.
- [ ] Manual smoke test on desktop and a 320px viewport — no overflow, no console errors.

---

## Build & Test Commands

```bash
# Build demo app
npx nx build ng-bootstrap-demo

# Serve demo locally
npx nx serve ng-bootstrap-demo

# Run unit tests for new component only
npx nx test ng-bootstrap-demo --testPathPattern=stepper
```

---

## Related Files

- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/additional-samples.routes.ts` — route registration pattern.
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/swiper/swiper.component.{ts,html}` — page-shape reference (H1, bs-alert, bs-grid wrapper).
- `apps/ng-bootstrap-demo/src/app/pages/additional-samples/drag-drop/drag-drop.component.{ts,html}` — CDK-primitive integration reference.
- `apps/ng-bootstrap-demo/src/app/app.component.html` (lines 287–328) — navbar dropdown to extend.
