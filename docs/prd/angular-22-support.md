# PRD: Support Angular 22 across all Angular libraries

## Problem

Angular 22.0.0 was released on 2026-06-03. The workspace pins Angular **21.2.x** and all
five publishable Angular libraries declare `^21.0.0` peer dependencies. We want first-day
Angular 22 support for every `@mintplayer/*` Angular library.

Two complications make this more than a version bump:

1. **Nx has not shipped Angular 22 support.** `@nx/angular@22.7.5` (the latest Nx, just
   migrated to via `nx migrate latest`) caps its Angular tooling peers at `< 22.0.0`
   (`@angular/build`, `@angular-devkit/*`, `@schematics/angular`, `ng-packagr`). Even the
   Nx 23 beta still caps `< 22.0.0`. Nx support is expected to land in a future Nx 23
   release. Until then a normal install fails with `ERESOLVE`. We must **force the
   resolution via npm `overrides`** rather than wait for Nx. (Nx's `22.x` major number is
   unrelated to Angular's `22.x` — coincidental.)
2. **Angular 22 hard-requires TypeScript 6.0.** `@angular/compiler-cli@22` and
   `@angular/build@22` declare `typescript: ">=6.0 <6.1"`. The repo was on TS **5.9.3**, so
   this is a mandatory major TypeScript bump, with knock-on tooling upgrades.

## Goals

1. All `@mintplayer/*` Angular libraries declare `@angular/* ^22.0.0` peers and are
   versioned `22.0.0` (the lib-major-tracks-Angular-major convention; Angular 21 support is
   dropped — breaking changes are acceptable per workspace norms).
2. `npm install` / `npm update` resolves cleanly on Angular 22 **without** waiting for Nx,
   using a minimal, targeted `overrides` block.
3. TypeScript 6.0 and its dependent dev tooling are upgraded so the workspace type-checks
   and builds.
4. Every Angular library builds (ng-packagr) **and** AOT-compiles cleanly in a consumer
   app (`ng-bootstrap-demo`).

## Non-goals

- Upgrading Nx itself to a version with native Angular 22 support — that release does not
  exist yet. The `overrides` are the bridge; they should be **removed** once Nx ships
  Angular 22 support (tracked below).
- React / Vue / web-component libraries — unaffected by the Angular version.
- The `mintplayer-ng-bootstrap-snippets` VS Code extension — not a consumable Angular
  library (no Angular peer deps); left at its current version.

## Investigation findings (2026-06-03)

A three-agent sweep checked every Angular-coupled dependency against the npm registry.

### Official Angular packages — all green
Every `@angular/*`, `@angular-devkit/*`, `@angular/cli|build|compiler-cli|language-service`,
`@schematics/angular`, `ng-packagr`, and `@angular/cdk` has a stable **22.0.0**. Pin
`~22.0.0` (matches the prior `~21.2.x` tilde style).

- `@angular/core@22` peers: `rxjs ^6.5.3 || ^7.4.0` (no change), `zone.js ~0.15 || ~0.16`
  (n/a — the apps are zoneless; no `zone.js` in the tree), `typescript >=6.0 <6.1`.

### Third-party Angular libraries — no overrides needed
| Package | Pin | Why it's fine on ng22 |
|---|---|---|
| `ngx-highlightjs` | `~14.0.1` | peer `@angular/core >=19` (open upper bound) |
| `ng-mocks` | `^14.15.3` | explicitly lists `22.0.0-alpha - 22` |
| `@analogjs/vitest-angular` | `^2.6.0` | architect peer range covers ng22's `0.2200.0` (do **not** use the `3.0.0-alpha.*` line — it re-caps below ng22) |
| `@angular-eslint/*` | `~21.4.0` | ships a bundled Angular compiler, declares no `@angular/core` peer; a 22.x line does not exist yet but is unnecessary |

### TypeScript 6.0 toolchain fallout
| Package | Action | Reason |
|---|---|---|
| `typescript` | `5.9.3 → ~6.0.3` | required by Angular 22 |
| `@typescript-eslint/*` | `7.16.0 → ^8.60.1` | v7 caps TS `<5.6`; v8.60.1 peers `typescript >=4.8.4 <6.1`, still allows `eslint 8.57` |
| `vue-tsc` | `^2.2.8 → ^3.3.3` | v3 peers `typescript >=5.0` (no upper cap); v2 predates TS6 |
| `@swc/core` | `1.15.33 → 1.15.40`, `jiti` `2.4.2 → 2.7.0` | own transpilers; TS-version-agnostic, bumped opportunistically |
| `ts-node` | **removed** | unused (only `.ts-node` *CSS class* matched in source); frozen at 10.9.2, unmaintained for TS6 |
| `@swc-node/register`, `vite`, `vitest`, `eslint` | unchanged | no TS6 constraint |

### The Nx blocker → `overrides`
`@nx/angular@22.7.5` and (transitively) `@analogjs/vite-plugin-angular` cap
`@angular-devkit/build-angular` / `ng-packagr` / `@angular-devkit/*` / `@schematics/angular`
/ `@angular/build` at `< 22.0.0`. A targeted per-parent override using the `$name`
self-reference syntax forces those peers to the root-declared `~22.0.0` and silences the
`ERESOLVE`:

```jsonc
"overrides": {
  "@nx/angular": {
    "@angular/build": "$@angular/build",
    "@angular-devkit/build-angular": "$@angular-devkit/build-angular",
    "@angular-devkit/core": "$@angular-devkit/core",
    "@angular-devkit/schematics": "$@angular-devkit/schematics",
    "@schematics/angular": "$@schematics/angular",
    "ng-packagr": "$ng-packagr"
  },
  "@analogjs/vite-plugin-angular": {
    "@angular/build": "$@angular/build",
    "@angular-devkit/build-angular": "$@angular-devkit/build-angular"
  }
}
```

## Implementation status (2026-06-03)

**Done + verified (in this branch — `feature/angular-22-support`):**
- ✅ **Root `package.json`** — all `@angular/*`, `@angular-devkit/*`, `@angular/cli|build|compiler-cli|language-service`, `@schematics/angular`, `ng-packagr`, `@angular/cdk` → `~22.0.0`; `typescript → ~6.0.3`; `@typescript-eslint/* → ^8.60.1`; `vue-tsc → ^3.3.3`; third-party bumps; `ts-node` removed; the `overrides` block above.
- ✅ **Library manifests** — `ng-bootstrap` (incl. its `@mintplayer/ng-*` peers), `ng-animations`, `ng-click-outside`, `ng-focus-on-load`, `ng-qr-code`, `ng-swiper`: peers `^21.0.0 → ^22.0.0`, `version → 22.0.0`.
- ✅ **Clean install resolves** — `npm update` after wiping `node_modules`/lockfile: `changed 2239 packages`, **no ERESOLVE**. `npm ls` confirms `@angular-devkit/build-angular@22.0.0 overridden`, `@angular/core@22.0.0`, `typescript@6.0.3`, `ng-packagr@22.0.0` deduped under `@nx/angular`, `@analogjs`, and root.
- ✅ **TS 6 fix** — `libs/mintplayer-web-components/src/test-setup.ts`: TS 6's `lib.dom.d.ts` added `scrollMargin` to `IntersectionObserver`; the jsdom mock now declares it.
- ✅ **All Angular libraries build** — `nx build mintplayer-ng-bootstrap` (+ its 9 dependent tasks incl. `mintplayer-web-components`) and `nx build mintplayer-ng-animations` pass under Angular 22 / ng-packagr 22 / TS 6.0.3, with Nx 22.7.5 forced via overrides.
- ✅ **Source migration for full AOT** — the four Angular 22 breaking-change fixes below.
  `nx build ng-bootstrap-demo` (full AOT, 14 tasks) and `nx test mintplayer-ng-bootstrap`
  (**515 tests / 172 files, all pass**) are green.

### Source migration (done)

ng-packagr's **partial compilation** builds the libraries, but the consumer app's **full
AOT** build (`nx build ng-bootstrap-demo`) surfaced genuine Angular 22 breaking-change
errors in library source. Four root fixes (the three `NG2012` "imports must be standalone"
errors were *cascade* failures that cleared once the `NG1054` collisions were fixed —
standalone has defaulted to `true` since Angular 19):

1. **NG1054 — `model()` already emits `<name>Change`; the explicit output collided.** A
   `model('x')` auto-registers an `xChange` output, so a sibling `xChange = output()` is an
   error in Angular 22. Removed the redundant output (and any manual `.emit()` / re-emitting
   effect); `model.set()` drives the auto-output. The two form controls were unaffected — their
   `ControlValueAccessor`s listen to the WC's DOM events directly, not the wrapper output.
   - `color-picker/.../color-wheel.component.ts` — removed `hsChange` output + the constructor
     effect that re-emitted it (the effect also echoed on parent-driven `[(hs)]` updates — a
     latent loop; the model's auto-output is strictly more correct).
   - `multi-range/.../multi-range.component.ts` — removed `valueChange` output + its emit.
   - `otp-input/.../otp-input.component.ts` — removed `valueChange` output + its emit.
   - ⚠️ The 19 other `XChange = output()` declarations pair with *unrelated* model/input names
     (e.g. `slideChange`, `selectionChange`) and are **not** collisions — left as-is.
2. **`ComponentFactoryResolver` removed from `@angular/core` in v22.**
   - `modal/.../modal-host.component.ts` — it was injected but **never used** (only a
     commented-out `ComponentPortal` arg referenced it; the portal-factory provider replaced it).
     Removed the import + injection; no `ViewContainerRef.createComponent()` migration needed.

## Follow-ups / watch list

- **Remove the `overrides` block** once an Nx release advertises Angular 22 support
  (watch https://nx.dev/changelog — likely Nx 23 stable), then `nx migrate` to it.
- **Node engine** — Angular 22 wants `node ^22.22.3 || ^24.15.0 || >=26.0.0`; the dev box
  is on `v22.13.0` (EBADENGINE warning). Bump local/CI Node to ≥ 22.22.3.
- `@angular-devkit/build-angular@22` is deprecated in favor of `@angular/build` (already a
  dependency) — a future cleanup, not required here.
- Watch for a `@angular-eslint` 22.x line and drop the `~21.4.0` pin when it ships.
