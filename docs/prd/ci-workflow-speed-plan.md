# Plan — Shave the GitHub workflows further (#430 and beyond)

**PRD:** [ci-workflow-speed.md](./ci-workflow-speed.md)
**Status:** In progress (2026-10-13) on `ci/workflow-speed-430`, PR #431. M1–M6, M8 done; M7 and the
sweep (M10) pending.

Workflow changes can only really be verified on GitHub, and every push is billed. So: spikes S1–S5 run
**locally**, the milestones are verified by reading the code plus `actionlint`, and the PR is pushed
**once**, when everything is done. The first PR run measures pull-request. publish-master can only be
measured after the merge, so its numbers go into the PR description as a follow-up comment.

| Step | Scope | PRD | Status |
|---|---|---|---|
| G | Grill D1–D9 | §5 | Done (2026-10-13): D1 gate, D2 builder stage, D3 `node:24-slim`, D4 chromium ×2 + firefox ×4, D5 yes, D6 keep cancelling, D7 yes (owner), D8 read-only (owner), D9 only if clean |
| S1 | Locally: `docker build` each runtime-only image from a CI-built `dist` (`nx run-many -t build build-ssr -c production`); run it; confirm SSR serves on `node:24-slim` | §4.1, D3 | **Passed.** `--target prebuilt --build-context dist=dist/apps/<app>`: ng 55 s (incl. base-image pull), react 42 s, vue 23 s; ~350 MB each; `GET /` → 200 with DSD (`shadowrootmode`) in all three |
| S2 | Locally: run the Angular e2e against the prebuilt SSR `server.mjs` instead of `nx serve`; compare base href, proxy, readiness; full chromium suite green | §4.2 | **Passed** on the risky subset: 42 specs that touch `/api` (datatable ×5, query-builder, file-manager, tree-select, shell + no-JS) green on chromium, server up in 1 s, no .NET API needed (the specs mock `/api`). Full suite runs in M10 |
| S3 | Locally (4-vCPU-limited): firefox suite at `workers: 2` vs `3`, 3 runs each, count retries | §4.2 | **Dropped.** With per-browser shards each shard holds ~90–100 s of tests, so a third worker buys little against the recorded CPU-starvation flakes. `workers: 2` stays; revisit only if a shard becomes the long pole |
| S4 | Profile `mp-scheduler.keyboard.spec` (why ~340 ms per test); try `isolate: false` on ng-bootstrap-demo | §4.3 | Delegated with M7 |
| S5 | Find a clean way to skip the browser install when the e2e target is an Nx cache hit (D9) | §4.2 | **Dropped (D9).** Nx only knows a task is a hit when it runs it, and the install has to precede the run; a dry-run probe is the hack D9 ruled out. It saved runner minutes only, not wall time |
| M1 | **Cache metadata:** `snippets:build` outputs; `api:build` inputs/outputs; optional `api:test` target | §4.3 | Done: `snippets:build` declares its `outputs`; React/Vue `build-ssr` made cacheable (`cache: true`, production inputs) now that CI builds them. `api:build` left alone (3 s, and nothing in CI runs it any more); `api:test` not added (the API tests run in their own parallel job, off the critical path) |
| M2 | **Setup action:** `node_modules` cache keyed on lockfile + Node version, postinstall codegen on a hit; `dotnet` and `node` made opt-in inputs so `test-api` / `coverage` install only what they need | §4.3, D5 | Done |
| M3 | **Playwright action:** `browsers` input (default all three) driving install, `install-deps` and the cache key | §4.2 | Done |
| M4 | **Dockerfiles:** runtime-only default target on `node:24-slim` + a `builder` stage for local clean-checkout builds (D2); per-app `Dockerfile.dockerignore`; pinned express/compression; API Dockerfile unchanged | §4.1 | Done. A **named build context** (`--build-context dist=…`) replaced the per-app `.dockerignore`: the root one still excludes `dist`, and the default (`standalone`) target still builds from source |
| M5 | **publish-master.yml:** jobs per §4.1: build / test / test-api / coverage / docker matrix (+ attest + make-public per leg) / publish-libs / publish-snippets (D1) / deploy (`needs: docker`, no `compose down`) / aggregator; `DOCKER_BUILD_RECORD_UPLOAD=false`; concurrency unchanged (D6); remove `Build API` and the stale comment | §4.1 | Done |
| M6 | **pull-request.yml:** per-browser e2e matrix (chromium ×2, firefox ×4) for Angular, and for React/Vue when affected; `browsers` passed per job; prebuilt-server webServer (if S2 passes); `workers` per S3; cache-hit install skip (if S5 finds a way) | §4.2 | Done: 12 e2e legs (ng chromium ×2 + firefox ×4; react/vue × chromium/firefox/webkit); Playwright args go after `--` because Nx consumes a bare `--project`; ng e2e + axe serve the prebuilt build (`apps/ng-bootstrap-demo-e2e/prebuilt-server.ts`); e2e/axe jobs skip .NET; coverage rebase skipped when a PR affects no test project (a docs-only PR failed on it) |
| M7 | **Specs:** split the scheduler keyboard/keyboard-matrix specs and fix their fixture cost; fake timers in `query-builder.memory-leak.spec`; collapse or de-isolate the ng-bootstrap-demo "should create" specs | §4.3 | Open |
| M8 | `timeout-minutes` on every job in both workflows | §4.3 | Done |
| M9 | Owner actions outside the repo: in the `master` branch-protection rule (Settings → Branches), add `pull-request` as a required check and turn on "Do not allow bypassing" (D7); set the org secret `NX_CACHE_RO_TOKEN` to the server's RO value, piped from the VPS straight into `gh secret set` (D8, PRD §2.4); verify by counting volume files written during the next PR-only window (expect 0) | §5, §2.4 | D8 done 2026-10-13: write-sink on the VPS (PRD §2.4), RO token rotated to an ASCII-only value (the old one held a `£`, which the PowerShell pipe re-encoded) and the containers recreated so Traefik's labels carry it. PR run 38395501588 attempt 3: all Nx tasks `[remote cache]`, 0 cache files written. D7 (branch protection) pending with the owner |
| M10 | **Batched sweep:** `actionlint` on both workflows; `nx run-many -t build build-ssr -c production`; `nx run-many -t test`; local `docker build` + run of all 4 images; Angular e2e (chromium + firefox) against the prebuilt server. Then push once and read the single PR run | §8 | Open |
| M11 | After merge: record the first warm and cold publish-master timings in the PR thread and here; tick the §8 measurements | §6, §8 | Open |

## Notes per milestone

- **M4/M5 ordering.** The `dist` artifact must contain `dist/apps/*/server` (the build-ssr output) as
  well as the browser output. It uploads all of `dist/`, and the build job now runs
  `-t build build-ssr -c production`, so it does.
- **M5 permissions.** `id-token`, `attestations`, `artifact-metadata` and `packages: write` move to the
  `docker` job only. Make-public needs the token that can PATCH package visibility, so keep whatever the
  current step uses.
- **M6 matrix naming.** Use `name: e2e ng (${{ matrix.project }} ${{ matrix.shard }})`. The `pull-request`
  aggregator `needs` the matrix job as a whole, so branch protection is unaffected.
- **M6 shard sizing.** chromium ×2 / firefox ×4 (D4), from the measured ~205 s / ~360 s totals: ~100 s
  and ~90 s of tests per shard. If the first PR run shows one browser's shards clearly above the other's,
  rebalance (e.g. chromium ×3) in the same PR before merging. That is the one acceptable second push,
  batched with any review fixes.
- **M7** touches only spec files and fixtures, no component code. Keep each assertion; split files and
  reduce setup cost, never weaken checks.
