# Product Requirements Document: Stepper demo (Angular CDK)

**Issue**: #311
**Title**: Stepper demo using angular CDK
**Status**: Draft
**Created**: 2026-05-09
**Last Updated**: 2026-05-09

---

## Overview

Add a new demo page under `Additional samples → Stepper` in `apps/ng-bootstrap-demo` that showcases the `@angular/cdk/stepper` primitive. The page demonstrates the full 2×2 cross of CDK stepper's two main axes (`linear` × `orientation`) and links to the upstream Angular CDK stepper documentation. **No library code change** — this issue is a demo-only addition, parallel to how the existing `drag-drop` demo showcases `@angular/cdk/drag-drop`.

---

## Goals & Objectives

### Primary Goals
- Close the documentation gap: visitors evaluating `@mintplayer/ng-bootstrap` can see CDK stepper composed with the library's chrome (`BsButtonTypeDirective`, `bs-grid`, `bs-form-control`, `bs-alert`).
- Show all four canonical CDK stepper configurations in one place, with realistic content.
- Link out to the upstream Angular CDK stepper docs so a reader can drill into the API reference without leaving the page.

### Success Metrics
- The page is reachable from the navbar (`Additional samples → Stepper`).
- All four stepper instances render and behave correctly on a 320px and a 1920px viewport.
- `npx nx build ng-bootstrap-demo` and the new `stepper.component.spec.ts` both pass.
- Zero changes to any file under `libs/`.

---

## Functional Requirements

### Must Have (P0)
- [ ] **FR-1**: New route `/additional-samples/stepper` registered in `additional-samples.routes.ts`, lazy-loading a new `StepperComponent`.
- [ ] **FR-2**: New navbar entry "Stepper" inside the existing "Additional samples" dropdown in `app.component.html`.
- [ ] **FR-3**: Four working stepper instances on the page, covering all four cells of the `linear` × `orientation` matrix:
  - Linear · Horizontal (with reactive forms)
  - Linear · Vertical (with reactive forms)
  - Non-linear · Horizontal (free navigation, no forms)
  - Non-linear · Vertical (free navigation, no forms)
- [ ] **FR-4**: Linear examples use `ReactiveFormsModule` with `[stepControl]` bound to a `FormGroup`. Next button is disabled until the current step's form is valid.
- [ ] **FR-5**: Non-linear examples allow clicking any step header to jump to that step.
- [ ] **FR-6**: Each example has Back, Next, and Reset controls rendered as plain `<button>` elements with `[color]` applied via `BsButtonTypeDirective` (imported from `@mintplayer/ng-bootstrap/button-type`). Last step shows Submit instead of Next on the linear examples.
- [ ] **FR-7**: Step headers render as numbered circles + label, with visual states for `active` and `completed`. Styling is local to `stepper.component.scss` using Bootstrap utility classes.
- [ ] **FR-8**: A `<bs-alert [type]="colors.info">` near the top of the page contains a hyperlink labelled "Angular CDK stepper documentation" pointing to the upstream Angular CDK stepper docs (`https://material.angular.dev/cdk/stepper/overview`), opening in a new tab.
- [ ] **FR-9**: `stepper.component.spec.ts` covers at minimum a `should create` test, mirroring `drag-drop.component.spec.ts`.

### Should Have (P1)
- [ ] **FR-10**: Reset button on each example calls `stepper.reset()` via `@ViewChild(CdkStepper)`. After reset the first step is selected and any form state is cleared on the linear examples.
- [ ] **FR-11**: Honour `prefers-reduced-motion: reduce` for any transitions on step header state changes.

---

## Timeline & Milestones

### Milestone 1: Scaffold and routing
- [ ] Create `stepper/` folder with empty component skeleton (mirrors swiper).
- [ ] Add route to `additional-samples.routes.ts`.
- [ ] Add navbar entry to `app.component.html`.
- [ ] `npx nx serve ng-bootstrap-demo` shows the page (empty content) at the new URL.

### Milestone 2: Linear examples with forms
- [ ] Build `linear · horizontal` stepper with 3 reactive-form steps and `[stepControl]`.
- [ ] Build `linear · vertical` mirror of the same.
- [ ] Confirm Next is disabled on invalid forms and enabled on valid forms.

### Milestone 3: Non-linear examples
- [ ] Build `non-linear · horizontal` with static content and clickable headers.
- [ ] Build `non-linear · vertical`.

### Milestone 4: Styling polish + docs link + tests
- [ ] Step circles, connecting lines, active/completed states finalised in scss.
- [ ] `<bs-alert>` with the documentation link added at top of page.
- [ ] Reset wired to `stepper.reset()` via `@ViewChild`.
- [ ] `stepper.component.spec.ts` passes.
- [ ] Manual smoke test on desktop + 320px viewport.

---

## Open Questions

> None at PRD draft time. All design decisions were resolved in the planning grill (4 examples covering the 2×2 cross; reactive forms on linear examples; Bootstrap utilities + `BsButtonTypeDirective`; alert with docs link).

---

## Technical Notes (Issue-Specific)

- **Library code stays untouched.** This is enforced by the acceptance criterion "Zero changes to any file under `libs/`". Reviewer should diff `git diff master...issues/#311 -- libs/` and expect no output.
- **CDK entry point**: `@angular/cdk/stepper` is exported from `@angular/cdk` v21.2.9 (already installed). No new package needed.
- **Step header rendering**: CDK stepper exposes step metadata via `*cdkStepHeader` and `*cdkStepBody` structural directives applied to the host. The wrapper element on which `cdkStepper` is set chooses the layout (`<div cdkStepper>` for horizontal; for vertical, the same directive works — orientation is controlled by the `[orientation]` input plus our own scss layout switch).
- **`@ViewChild` for Reset**: Each stepper instance is referenced via `@ViewChild('linearH', { read: CdkStepper })` etc., so Reset can call `.reset()`. (Per memory `feedback_template_refs.md`, prefer `#var="cdkStepper"` exportAs over `{ read: ... }` if `CdkStepper` declares an `exportAs`. The CDK source declares `exportAs: 'cdkStepper'`, so `#linearH="cdkStepper"` is the right form.)
- **Computed signals**: per `feedback_computed_signals_in_template`, any derived UI state (e.g. "is the linear-horizontal stepper at its last step?") that's used in the template should live in a `computed()` field, not an inline ternary in `[disabled]="..."`. For Submit-vs-Next visibility, prefer a `computed()` over a getter.
- **No imperative loops**: per `feedback_no_imperative_iteration`, any iteration over form steps in the .ts file should use `map`/`filter` etc. — no `forEach` accumulators, no `for (let i = ...)`.
- **Docs link target**: `https://material.angular.dev/cdk/stepper/overview` is the canonical Angular Material site that hosts the CDK stepper guide. Verify it loads at implementation time; if it's moved, fall back to the `angular.dev` equivalent.

---

## Related
- Issue #311
- Existing pattern reference: `apps/ng-bootstrap-demo/src/app/pages/additional-samples/drag-drop/` (CDK-primitive demo precedent).
- Existing pattern reference: `apps/ng-bootstrap-demo/src/app/pages/additional-samples/swiper/` (page-shape: H1 + bs-alert + bs-grid).
- Memory: `feedback_template_refs.md`, `feedback_computed_signals_in_template.md`, `feedback_no_imperative_iteration.md`.
