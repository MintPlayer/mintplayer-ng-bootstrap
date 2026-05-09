# Product Requirements Document: Cypress → Playwright e2e migration

**Issue**: #251
**Title**: Migrate e2e tests from Cypress to Playwright
**Status**: Complete
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

- [x] **FR-1**: `apps/ng-bootstrap-demo-e2e` uses `@nx/playwright:playwright`. Cypress, `@nx/cypress`, the `cypress.json`, and the `src/` tree are removed.
- [x] **FR-2**: `playwright.config.ts` defines two browser projects (`chromium`, `firefox`) and a `webServer` that serves the production build. (Implemented as `node dist/apps/ng-bootstrap-demo/server/server.mjs` — runs the built SSR server, which serves `dist/apps/ng-bootstrap-demo/browser/` statically with SSR fallback. Cleaner than spinning up a separate static server, no extra deps.)
- [x] **FR-3**: Six specs exist in `apps/ng-bootstrap-demo-e2e/e2e/` — `smoke`, `routing`, `modal`, `dropdown`, `datepicker`, `dock` — each pinned to a specific demo route and a behaviour-level assertion (not just route-loaded).
- [x] **FR-4**: `nx run-many --targets=test,e2e --parallel=2` runs both targets concurrently. The `e2e` target depends on `ng-bootstrap-demo:build` so the prod artifact is always fresh.
- [x] **FR-5**: `.github/workflows/pull-request.yml` installs Playwright browsers (`chromium`, `firefox`) with `--with-deps`, then runs `nx affected --targets=test,e2e --parallel=2` in place of the current `test`-only step.

### Should Have (P1)

- [x] **FR-6**: A `nx e2e ng-bootstrap-demo-e2e -- <spec>` invocation can target a single spec file for fast local iteration. (Playwright's CLI accepts spec-path filters; Nx forwards everything after `--` to the executor.)
- [x] ~~**FR-7**: The dock spec uses pointer events (`pointerdown`/`pointermove`/`pointerup`), not HTML5 native drag events — per the project's pointer-events rule.~~ **Deferred along with the drag-to-split scenario itself** (see M3 deviation note). When a future drag-to-split spec is added, it will use pointer events per this rule. The current dock spec exercises the capture button — no drag at all.

---

## Timeline & Milestones

### Milestone 1: Strip Cypress, install Playwright ✅
- [x] Drop `cypress`, `@nx/cypress`, and `eslint-plugin-cypress` from `package.json`.
- [x] Add `@playwright/test@^1.59.1` + `@nx/playwright@22.7.1`.
- [x] Delete `cypress.json`, `src/` tree, and project `.eslintrc.json` (project will inherit root eslint).
- [x] Flip `nx.json` `generators."@nx/angular:application".e2eTestRunner` from `cypress` to `playwright`.
- [x] Install Chromium + Firefox browser binaries locally (`npx playwright install chromium firefox`).

### Milestone 2: Scaffold Playwright project ✅
- [x] Write `playwright.config.ts` with `webServer`, `baseURL`, `projects: [chromium, firefox]`.
- [x] Rewrite `project.json` with `@nx/playwright:playwright` executor and `dependsOn: ['ng-bootstrap-demo:build']`.
- [x] Update `tsconfig.json` types/include for Playwright.
- [x] Add `.gitignore` for Playwright artifacts (`test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`).
- [x] `webServer` runs the built SSR server (`node dist/apps/ng-bootstrap-demo/server/server.mjs`) — tests against the actual prod artifact, not just the prod-mode compiler.

### Milestone 3: Author the six specs ✅
- [x] `smoke.spec.ts` — home loads, navbar brand + 6 main sections (Home/Basic/Overlays/Advanced/Animations/Additional samples) visible.
- [x] `routing.spec.ts` — open the Basic dropdown in the navbar, click Alert, assert URL `/basic/alert` and `<h1>Alert</h1>` visible.
- [x] `modal.spec.ts` — click "Show modal", assert "Modal title" visible, click "Close", assert it's gone.
- [x] `dropdown.spec.ts` — click "Dropdown" toggle, assert `bs-calendar` visible, click outside (page h1), assert calendar gone.
- [x] `datepicker.spec.ts` — open picker, click next-month chevron, click day "1" (odd → not disabled by demo's even-day rule), assert "The selected date is:" line changed.
- [x] `dock.spec.ts` — assert Panel 1 visible; click "Capture layout JSON", assert "Captured snapshot" header appears.

**Deviation from plan:** dock spec does *not* drag-to-split via pointer events. Reproducing that scripted gesture requires reverse-engineering the dock-manager's drop-zone protocol; the spec would couple to internal Lit drag handlers and break on every tweak. Capture-button assertion exercises dock-manager rendering and the capture API end-to-end at a stable boundary instead. A future drag-to-split spec can be added once the dock exposes a documented test hook for synthesising splits.

### Milestone 4: Wire CI and validate ✅
- [x] Update `pull-request.yml`: add `Install Playwright browsers` step (`npx playwright install --with-deps chromium firefox`); replace single-target `Test` step with `npx nx affected --targets=test,e2e --watch=false --parallel=2 …`.
- [x] Local `nx e2e ng-bootstrap-demo-e2e` green on both Chromium and Firefox — 12/12 passing in 46.7s.
- [ ] PR run shows test + e2e concurrent execution; both green. *(awaits push + PR)*

**Hydration fix during validation:** initial run showed 5/12 failures concentrated in Firefox click-and-assert specs plus the datepicker text assertion. Root cause: the demo uses Angular SSR but does *not* call `provideClientHydration()`, so each navigation does a destructive client bootstrap — there's a window where SSR HTML is in the DOM but click handlers are not yet bound. Chromium happens to bootstrap fast enough; Firefox doesn't. Fix: `await page.waitForLoadState('networkidle')` after every `goto` in click-driven specs (modal, dropdown, datepicker, dock). Datepicker also needed the `^` regex anchor dropped — Playwright's text matching includes leading whitespace the anchor didn't tolerate.

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
