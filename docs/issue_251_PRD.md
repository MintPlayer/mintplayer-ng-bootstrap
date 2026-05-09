# Product Requirements Document: Cypress → Playwright e2e migration

**Issue**: #251
**Title**: Migrate e2e tests from Cypress to Playwright
**Status**: Draft
**Created**: 2026-05-09
**Last Updated**: 2026-05-09

---

## Overview

Replace the dormant Cypress e2e setup in `apps/ng-bootstrap-demo-e2e` with `@nx/playwright`. Ship six real specs that exercise the surfaces most likely to regress, and wire them to run on every PR in parallel with the existing Vitest unit-test target. The current Cypress spec is a broken placeholder (asserts content that no longer exists) and the `e2e` target was never invoked in CI, so this is a clean cutover, not a port.

---

## Goals & Objectives

### Primary Goals
- Establish a working e2e signal on every PR — first time this project will have one.
- Add Firefox engine coverage to catch the documented Firefox-only bug class (e.g. flex-shrink).
- Run unit tests and e2e tests in parallel so wall-clock CI time is bounded by `max(test, e2e)`.

### Success Metrics
- All six Playwright specs green on `chromium` and `firefox` against the production build.
- A PR run shows `test` and `e2e` executing concurrently in the Nx output.
- Removing or breaking an asserted UI behaviour (e.g. dropdown not closing on selection) causes the PR check to fail.

---

## Functional Requirements

### Must Have (P0)

- [ ] **FR-1**: `apps/ng-bootstrap-demo-e2e` uses `@nx/playwright:playwright`. Cypress, `@nx/cypress`, the `cypress.json`, and the `src/` tree are removed.
- [ ] **FR-2**: `playwright.config.ts` defines two browser projects (`chromium`, `firefox`) and a `webServer` that serves `dist/apps/ng-bootstrap-demo` (production build) on a stable port.
- [ ] **FR-3**: Six specs exist in `apps/ng-bootstrap-demo-e2e/e2e/` — `smoke`, `routing`, `modal`, `dropdown`, `datepicker`, `dock` — each pinned to a specific demo route and a behaviour-level assertion (not just route-loaded).
- [ ] **FR-4**: `nx run-many --targets=test,e2e --parallel=2` runs both targets concurrently. The `e2e` target depends on `ng-bootstrap-demo:build` so the prod artifact is always fresh.
- [ ] **FR-5**: `.github/workflows/pull-request.yml` installs Playwright browsers (`chromium`, `firefox`) with `--with-deps`, then runs `nx affected --targets=test,e2e --parallel=2` in place of the current `test`-only step.

### Should Have (P1)

- [ ] **FR-6**: A `nx e2e ng-bootstrap-demo-e2e -- <spec>` invocation can target a single spec file for fast local iteration.
- [ ] **FR-7**: The dock spec uses pointer events (`pointerdown`/`pointermove`/`pointerup`), not HTML5 native drag events — per the project's pointer-events rule.

---

## Timeline & Milestones

### Milestone 1: Strip Cypress, install Playwright ✅
- [x] Drop `cypress`, `@nx/cypress`, and `eslint-plugin-cypress` from `package.json`.
- [x] Add `@playwright/test@^1.59.1` + `@nx/playwright@22.7.1`.
- [x] Delete `cypress.json`, `src/` tree, and project `.eslintrc.json` (project will inherit root eslint).
- [x] Flip `nx.json` `generators."@nx/angular:application".e2eTestRunner` from `cypress` to `playwright`.
- [x] Install Chromium + Firefox browser binaries locally (`npx playwright install chromium firefox`).

### Milestone 2: Scaffold Playwright project
- [ ] Write `playwright.config.ts` with `webServer`, `baseURL`, `projects: [chromium, firefox]`.
- [ ] Rewrite `project.json` with `@nx/playwright:playwright` executor and `dependsOn: ['ng-bootstrap-demo:build']`.
- [ ] Update `tsconfig.json` types/include for Playwright.

### Milestone 3: Author the six specs
- [ ] `smoke.spec.ts`
- [ ] `routing.spec.ts`
- [ ] `modal.spec.ts`
- [ ] `dropdown.spec.ts`
- [ ] `datepicker.spec.ts`
- [ ] `dock.spec.ts` (pointer events, not native dnd)

### Milestone 4: Wire CI and validate
- [ ] Update `pull-request.yml` (install browsers, run `nx affected --targets=test,e2e --parallel=2`).
- [ ] Local `nx e2e ng-bootstrap-demo-e2e` green on both engines.
- [ ] PR run shows test + e2e concurrent execution; both green.

---

## Open Questions

> No open questions. All decisions resolved during planning grilling — see plan §"Implementation Plan" for resolved choices on migration shape, test roster, Nx integration, CI wiring, browser matrix, and dev-server strategy.

---

## Technical Notes (Issue-Specific)

### Why production build instead of `nx serve`
The Cypress project had a `production` configuration that was never invoked. AOT-only bugs (tree-shaking, prod-only minification) would ship undetected. Since the demo *is* the showcase, a prod regression on the demo is the worst-case bug — testing against the prod build closes that gap.

### Why no WebKit
WebKit on Linux CI is not Safari on macOS/iOS. Including it gives false confidence on iOS-specific issues without actually catching them. Chromium + Firefox covers the two engines users actually run, and Firefox specifically guards the documented flex-shrink bug class.

### Why six specs and not one (or twenty)
The discarded Cypress placeholder taught the lesson — a single trivial spec rots into noise and gets ignored. Six specs hit the four behaviour categories most likely to regress in this library (overlays, forms, advanced layout, basic routing) without becoming maintenance overhead. New components added later (per `dcg:playwright` skill conventions) will append specs in this directory.

### Parallel CI strategy
`nx run-many --targets=test,e2e --parallel=2` is preferred over splitting into separate GitHub Actions jobs:
- Single `npm ci` and single `playwright install` — avoids the install cost being paid twice.
- Nx's affected graph naturally skips both targets when neither is touched.
- Wall-clock bound is `max(test, e2e)` since they run concurrently within the same runner.

The existing `Build` step is kept as a separate workflow step because the dry-run publishes downstream depend on its `dist/` outputs.

---

## Related
- Issue #251
- See plan: `docs/issue_251_plan.md`
- Project memory: pointer-events over HTML5 dnd; Firefox flex-shrink class; Branch/PR permission rule.
