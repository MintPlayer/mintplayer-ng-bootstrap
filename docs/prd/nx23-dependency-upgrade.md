# Nx 23 + Angular dependency upgrade

Status: **Implemented on `feat/charts-wc` (PR #401)**, 2026-08-10. Rides the charts PR at the
user's explicit request; the charts work itself is [charts-wc.md](./charts-wc.md).
**CI green on the upgraded workspace** — run 31388684015 (`815b242c`): `pull-request` and
`dry-run-publish-libs` both success, i.e. build, unit tests, API tests, e2e across the three demo
apps, the axe gate and the publish dry-run all pass on Nx 23 + Angular 22.0.8.

> Reading a run mid-flight is not a verdict. Both this run and the previous one reported the axe
> gate, the live-API e2e and the dist upload as *failed* while `status: in_progress`, and both
> finished fully green — Playwright retries a flaky spec and the step conclusion is rewritten.
> Wait for `status: completed` before diagnosing anything.

## Why

`npm ci` surfaced nine deprecation warnings and `npm audit` reported 80 vulnerabilities
(4 critical, 55 high). Tracing each deprecation to the direct dependency responsible showed that
almost none were actionable — they are transitive build tooling (`glob`, `inflight`,
`node-domexception`, `whatwg-encoding`) reachable only through `@angular/cli`, `@nx/*`,
`@vue/test-utils` and `jsdom`. Two were ours to fix, and both turned out to be gated on one
thing: **Nx 22 does not support Angular 22.**

`@nx/angular@22.7.5` declares its Angular peers as `>= 19.0.0 < 22.0.0`. The workspace runs
Angular 22, so `package.json` carried override blocks forcing Nx to accept it. `@nx/angular@23.1.1`
declares `>= 20.0.0 < 23.0.0` — the constraint disappears, and with it the overrides.

## What changed

| Change | Effect |
|---|---|
| `@nx/*` 22.7.5 → **23.1.1** (11 packages, via `nx migrate`) | Angular 22 peers legitimate |
| `angular-eslint` 21.4.0 → **22.1.0** | bundled by the Nx migration, not optional |
| `@angular/*` 22.0.0 → **22.0.8** | clears **GHSA-58w9-8g37-x9v5** (compiler XSS: two-way binding sanitization bypass) |
| `@angular-devkit/build-angular` **removed** | the deprecated package is gone from the tree entirely |
| `overrides["@nx/angular"]` (6 entries) and `overrides["@analogjs/vite-plugin-angular"]` **removed** | existed only to paper over Nx 22 |
| demo `build`/`extract-i18n` → `@angular/build:*` | `serve` was already migrated |
| `@playwright/test` → 1.62.1, `@axe-core/playwright` → 4.12.1, `@analogjs/vitest-angular` → 2.6.4, `@eslint/eslintrc` → 3.3.6 | routine |

Audit after: **31 vulnerabilities, 0 critical** (from 80 / 4 critical).

## Findings worth keeping

- **The overrides block does not disappear on Nx 23 — it relocates.** `@nx/vue@23.1.1` peers on
  `vue-tsc@^2.0.0` while this workspace uses `^3.3.3`, so the same `$`-override pattern is now
  needed for `vue-tsc` instead of for Angular.
- **`@vue/server-renderer` carried a latent break.** It was pinned to exactly `3.5.34` and peers
  on `vue@3.5.34` exactly, while root `vue` is `^3.5.34`. It resolved only because the lockfile
  happened to hold vue at the matching version — **any plain `npm install` (as opposed to
  `npm ci`) would have failed with ERESOLVE.** Both now float together on `^3.5.34`.
- **Three ERESOLVE failures were stale-state artifacts, one was real.** Deleting `node_modules`
  is not enough: npm resolves from `package-lock.json`, so a stale entry keeps re-imposing itself.
  A major multi-package bump needs the lockfile regenerated, which is why this PR carries a
  wholesale lockfile diff. That is the state CI installs from anyway.
- **`@angular-devkit/build-angular:application` was always an alias** — its `builders.json`
  declares `implementation: "@angular/build:application"`. Switching executors was a rename, not
  a migration; the package could not be *removed* until Nx 23 because
  `@analogjs/vite-plugin-angular` pulls it in as an optional peer and the two optional ranges
  (Nx `< 22`, Analog `^22`) were irreconcilable without a root dep to point `$` at.
- **`nx migrate` did NOT re-add `nxCloudId`** this time (the trap recorded in the Nx-23 notes);
  `nx.json` came through byte-identical. The trap fires on the non-interactive path — this run
  prompted and the prompt was skipped. Still worth checking after every migrate.

## One codemod deliberately reverted

The Angular v22 `trust-proxy-headers` migration wrote into `apps/ng-bootstrap-demo/server.ts`:

```ts
new AngularNodeAppEngine({ trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto'] })
```

That is exactly the two-header default which **caused a production outage** — `README.md`
records it as *"the one that bit us in production"*: `@angular/ssr` deopts to CSR for any
untrusted `x-forwarded-*` header, and Traefik also forwards `-for`, `-port` and `-server`, so
`docker-compose.yml` deliberately sets `NG_TRUST_PROXY_HEADERS` with **six** headers. An explicit
option in code would override that env var and silently reinstate the deopt. Reverted; the env
var remains the single source of truth.

## Deliberately not done

- **`@angular/animations` → `animate.enter`/`animate.leave`.** Not a codemod — it would delete
  the entire public API of the published `@mintplayer/ng-animations` package. See
  [angular-animations-api.md](./angular-animations-api.md).
- **React 19 migration** — no-op; the workspace is already on `react@19.2.6`. Nx's
  `ai-instructions-for-react-19.md` is a prompt-only migration aimed at workspaces still on 18.
- **ESLint flat-config conversion** — offered by `nx migrate` as a hybrid prompt migration;
  a self-contained follow-up.
- **`@babel/core` 7 → 8** — major, with its own ripple through the React demo.
- **`@angular/platform-browser-dynamic` → `@angular/platform-browser`** — newly deprecated in
  Angular 22; a small API migration, but a source change rather than a dependency bump.

## Remaining deprecation warnings (all upstream, none actionable)

`glob@7/8/10` + `inflight` (via `@angular/cli`, `@nx/react`, `@vue/test-utils`,
`source-map-explorer`), `rimraf@2.6.3` (via `source-map-explorer` alone), `node-domexception`
(via `@lit-labs/ssr`, `@nx/*`), `whatwg-encoding` (via `@nx/web`, `jsdom`).

`source-map-explorer` is worth a look independently: it is the sole source of `rimraf@2.6.3`,
is already at its latest published version (2.5.3, so upgrading fixes nothing), and **no script,
target, CI step or doc in this repo references it** — it appears to be a leftover.
