# Development Plan: Issue #251

**Issue**: #251
**Title**: Migrate e2e tests from Cypress to Playwright
**Type**: Tooling migration
**Priority**: Medium

## Executive Summary

Replace the dormant Cypress e2e setup with `@nx/playwright`. The existing Cypress project is scaffolding only — its single spec asserts `<h1>` contains "Welcome ng-bootstrap-demo" against a demo whose homepage no longer matches that template, and the `e2e` Nx target is not invoked anywhere in CI. The migration discards the broken placeholder and ships six real specs (smoke, routing, modal, dropdown, datepicker, dock) wired to run on every PR in parallel with the existing unit-test target.

---

## Problem Statement

### Current Behavior
- `apps/ng-bootstrap-demo-e2e` uses `@nx/cypress:cypress` with Cypress 13.
- The single spec (`src/integration/app.spec.ts`) asserts content that no longer exists in the demo.
- `cy.login()` is a no-op stub that only `console.log`s.
- `pull-request.yml` runs `nx affected --target=test` only — the `e2e` target is never invoked. The suite has no working signal in CI or locally.

### Expected Behavior
- `apps/ng-bootstrap-demo-e2e` uses `@nx/playwright` with `@playwright/test`.
- Six specs cover the surfaces most likely to regress: home/navbar smoke, route navigation, modal open/close, dropdown selection, datepicker pick, dock split.
- `pull-request.yml` runs `nx run-many --targets=test,e2e --parallel=2` so unit tests and e2e run concurrently.
- E2e runs against the production build (`nx build --configuration=production`), served statically by Playwright's `webServer` block.
- Browser matrix: Chromium + Firefox (catches engine-specific bugs like the documented Firefox flex-shrink issue).

### Impact
- PRs gain a real e2e signal for the first time.
- Engine coverage adds Firefox — directly addresses the documented Firefox-only flex-shrink class of bugs.
- Cypress dependency removed; one fewer test framework to maintain.
- PR CI time grows by the e2e duration but, because it runs in parallel with unit tests, the wall-clock impact is bounded by whichever target is slower.

---

## Technical Analysis

### Files to Modify

**Add**
- `apps/ng-bootstrap-demo-e2e/playwright.config.ts` — config with `webServer`, `use.baseURL`, projects for chromium + firefox.
- `apps/ng-bootstrap-demo-e2e/e2e/smoke.spec.ts`
- `apps/ng-bootstrap-demo-e2e/e2e/routing.spec.ts`
- `apps/ng-bootstrap-demo-e2e/e2e/modal.spec.ts`
- `apps/ng-bootstrap-demo-e2e/e2e/dropdown.spec.ts`
- `apps/ng-bootstrap-demo-e2e/e2e/datepicker.spec.ts`
- `apps/ng-bootstrap-demo-e2e/e2e/dock.spec.ts`

**Modify**
- `apps/ng-bootstrap-demo-e2e/project.json` — replace `@nx/cypress:cypress` executor with `@nx/playwright:playwright`; keep `implicitDependencies: ['ng-bootstrap-demo']`.
- `apps/ng-bootstrap-demo-e2e/tsconfig.json` — change `types` from `["cypress", "node"]` to `["@playwright/test", "node"]`; update `include` to point at `e2e/` instead of `src/`.
- `package.json` — drop `cypress` and `@nx/cypress`; add `@playwright/test` and `@nx/playwright@22.7.1`.
- `.github/workflows/pull-request.yml` — add Playwright browser-install step; replace the existing `Test` step's command with `nx affected --targets=test,e2e --parallel=2 …`.
- `nx.json` — add `@nx/playwright/plugin` to `plugins` if not already inferred.

**Delete**
- `apps/ng-bootstrap-demo-e2e/cypress.json`
- `apps/ng-bootstrap-demo-e2e/src/integration/app.spec.ts`
- `apps/ng-bootstrap-demo-e2e/src/support/{app.po.ts,commands.ts,index.ts}`
- `apps/ng-bootstrap-demo-e2e/src/fixtures/example.json`
- The empty `apps/ng-bootstrap-demo-e2e/src/` tree afterwards.

### Dependencies
- `@nx/playwright@22.7.1` (matches existing Nx version).
- `@playwright/test` (latest).
- Removes `cypress@^13.0.0` and `@nx/cypress@22.7.1`.

### Architecture Considerations
- E2e against the **production build**, not `nx serve`. AOT/prod-only bugs surface; the Cypress config defined a `production` configuration but never ran it.
- Specs sit in `e2e/` (Playwright convention) rather than `src/integration/` (Cypress convention).
- `e2e` target's `dependsOn: ['^build']` ensures Nx executes `ng-bootstrap-demo:build` before Playwright starts.
- Browser matrix kept at Chromium + Firefox; WebKit is excluded — Linux WebKit on CI is not Safari and gives false confidence on iOS.

---

## Implementation Plan

### Phase 1: Strip Cypress
1. Remove `cypress` and `@nx/cypress` from `package.json` devDependencies.
2. Delete the legacy `src/`, `cypress.json`, and the integration spec.

### Phase 2: Install Playwright + scaffold project
1. `npm install --save-dev @playwright/test @nx/playwright@22.7.1`.
2. `npx playwright install chromium firefox` locally (CI does this in its own step).
3. Write `playwright.config.ts` with `webServer` running a static server over `dist/apps/ng-bootstrap-demo`, `baseURL` pointing at it, and projects for chromium + firefox.
4. Rewrite `project.json` with the `@nx/playwright:playwright` executor and `dependsOn: ['ng-bootstrap-demo:build']`.
5. Update `tsconfig.json` types and includes.

### Phase 3: Author the six specs
1. `smoke.spec.ts` — `goto('/')`, assert navbar brand `ng-bootstrap` visible and the five top-level nav items (`Home`, `Basic`, `Overlays`, `Advanced`, `Animations`, `Additional samples`) are present.
2. `routing.spec.ts` — `goto('/')`, click into `/basic/alert` via the navbar, assert URL and that the alert page heading renders.
3. `modal.spec.ts` — visit `/overlays/modals`, open a modal, assert it appears, close via the close button, assert it disappears.
4. `dropdown.spec.ts` — visit `/overlays/dropdown`, open a dropdown, click a menu item, assert it closed and the selection registered.
5. `datepicker.spec.ts` — visit `/basic/datepicker`, open the picker, click a day, assert the input shows that date.
6. `dock.spec.ts` — visit `/advanced/dock`, perform a split via pointer events, assert two panes exist where one was. (Use pointer events per the project memory rule on HTML5 dnd.)

### Phase 4: Wire CI
1. Add "Install Playwright browsers" step to `pull-request.yml` after `Install dependencies`: `npx playwright install --with-deps chromium firefox`.
2. Replace the `Test` step's command with: `npx nx affected --targets=test,e2e --parallel=2 --watch=false --base=… --head=…`.
3. Confirm dry-run-publish steps still work (they depend on the existing `Build` step's `dist/` outputs).

### Phase 5: Validate
1. Run `npx nx e2e ng-bootstrap-demo-e2e` locally — both browsers green.
2. Push branch, watch PR run — verify test + e2e both run, both green, total wall-clock ≈ max(test, e2e) not test+e2e.
3. Intentionally break one assertion locally and re-run to confirm CI fails on regressions.

---

## Test Scenarios

### Scenario 1: Demo home loads and navbar renders
- **Given** the production build is served
- **When** Playwright navigates to `/`
- **Then** brand `ng-bootstrap` is visible and all five top-level nav items are present in both Chromium and Firefox

### Scenario 2: Routing navigates between component pages
- **Given** Playwright is on `/`
- **When** it clicks the Basic → Alert link
- **Then** URL is `/basic/alert` and the alert demo content renders

### Scenario 3: Modal opens and closes
- **Given** Playwright is on `/overlays/modals`
- **When** it clicks the trigger then the close button
- **Then** the modal appears and is removed from the DOM

### Scenario 4: Dropdown opens and a selection registers
- **Given** Playwright is on `/overlays/dropdown`
- **When** it opens the dropdown and clicks a menu item
- **Then** the dropdown closes and the selection is reflected in the page

### Scenario 5: Datepicker selects a date
- **Given** Playwright is on `/basic/datepicker`
- **When** it opens the picker and clicks a specific day
- **Then** the input field shows that date

### Scenario 6: Dock splits a pane via pointer events
- **Given** Playwright is on `/advanced/dock`
- **When** it dispatches pointerdown/pointermove/pointerup to perform a split
- **Then** the dock has one more pane than before

### Scenario 7: Parallel CI execution
- **Given** a PR with changes affecting both libs and the demo
- **When** the workflow runs
- **Then** `nx run-many` reports `test` and `e2e` running concurrently, and total wall-clock is approximately `max(test, e2e)` not `test + e2e`

### Scenario 8: Firefox-specific regression detection
- **Given** a regression that only manifests in Firefox (e.g. flex-shrink class)
- **When** CI runs
- **Then** the Firefox project fails while Chromium passes, and the PR is blocked

---

## Acceptance Criteria

- [ ] `cypress` and `@nx/cypress` are gone from `package.json`.
- [ ] `@playwright/test` and `@nx/playwright@22.7.1` are present.
- [ ] `apps/ng-bootstrap-demo-e2e/` contains `playwright.config.ts`, `project.json`, `tsconfig.json`, and an `e2e/` directory with six `.spec.ts` files.
- [ ] No `cypress.json`, `src/integration/`, `src/support/`, or `src/fixtures/` remain in that project.
- [ ] `npx nx e2e ng-bootstrap-demo-e2e` runs all six specs against `chromium` and `firefox` and passes.
- [ ] `pull-request.yml` installs Playwright browsers and runs `nx affected --targets=test,e2e --parallel=2`.
- [ ] A PR run shows both `test` and `e2e` executing concurrently in the Nx output.
- [ ] Dry-run publish steps still pass after the workflow changes.

---

## Build & Test Commands

This is an Angular/Nx workspace (no .NET). Use:

```bash
# Install
npm ci
npx playwright install --with-deps chromium firefox

# Build the demo (prerequisite for e2e against the prod artifact)
npx nx build ng-bootstrap-demo --configuration=production

# Run unit tests (Vitest) and e2e tests in parallel
npx nx run-many --targets=test,e2e --parallel=2 --watch=false

# Just e2e
npx nx e2e ng-bootstrap-demo-e2e

# Just one Playwright spec file, helpful for iteration
npx nx e2e ng-bootstrap-demo-e2e -- e2e/modal.spec.ts
```

---

## Related Files

- `apps/ng-bootstrap-demo-e2e/project.json`
- `apps/ng-bootstrap-demo-e2e/cypress.json` (delete)
- `apps/ng-bootstrap-demo-e2e/src/` (delete)
- `apps/ng-bootstrap-demo-e2e/tsconfig.json`
- `apps/ng-bootstrap-demo/src/app/app.component.html` (read-only, source of stable navbar selectors)
- `apps/ng-bootstrap-demo/src/app/pages/pages.routes.ts` (read-only, source of route paths)
- `.github/workflows/pull-request.yml`
- `package.json`
- `nx.json`
