# Plan — Shave the GitHub workflows further (#430 and beyond)

**PRD:** [ci-workflow-speed.md](./ci-workflow-speed.md)
**Status:** Proposed (2026-10-13). Not started; D1–D9 are decided. One branch, one PR
(`ci/workflow-speed-430`), squashed into `master`.

Workflow changes can only really be verified on GitHub, and every push is billed. So: spikes S1–S5 run
**locally**, the milestones are verified by reading the code plus `actionlint`, and the PR is pushed
**once**, when everything is done. The first PR run measures pull-request. publish-master can only be
measured after the merge, so its numbers go into the PR description as a follow-up comment.

| Step | Scope | PRD | Status |
|---|---|---|---|
| G | Grill D1–D9 | §5 | Done (2026-10-13): D1 gate, D2 builder stage, D3 `node:24-slim`, D4 chromium ×2 + firefox ×4, D5 yes, D6 keep cancelling, D7 yes (owner), D8 read-only (owner), D9 only if clean |
| S1 | Locally: `docker build` each runtime-only image from a CI-built `dist` (`nx run-many -t build build-ssr -c production`); run it; confirm SSR serves on `node:24-slim` | §4.1, D3 | Open |
| S2 | Locally: run the Angular e2e against the prebuilt SSR `server.mjs` instead of `nx serve`; compare base href, proxy, readiness; full chromium suite green | §4.2 | Open |
| S3 | Locally (4-vCPU-limited): firefox suite at `workers: 2` vs `3`, 3 runs each, count retries | §4.2 | Open |
| S4 | Profile `mp-scheduler.keyboard.spec` (why ~340 ms per test); try `isolate: false` on ng-bootstrap-demo | §4.3 | Open |
| S5 | Find a clean way to skip the browser install when the e2e target is an Nx cache hit (D9) | §4.2 | Open |
| M1 | **Cache metadata:** `snippets:build` outputs; `api:build` inputs/outputs; optional `api:test` target | §4.3 | Open |
| M2 | **Setup action:** `node_modules` cache keyed on lockfile + Node version, postinstall codegen on a hit; `dotnet` and `node` made opt-in inputs so `test-api` / `coverage` install only what they need | §4.3, D5 | Open |
| M3 | **Playwright action:** `browsers` input (default all three) driving install, `install-deps` and the cache key | §4.2 | Open |
| M4 | **Dockerfiles:** runtime-only default target on `node:24-slim` + a `builder` stage for local clean-checkout builds (D2); per-app `Dockerfile.dockerignore`; pinned express/compression; API Dockerfile unchanged | §4.1 | Open |
| M5 | **publish-master.yml:** jobs per §4.1: build / test / test-api / coverage / docker matrix (+ attest + make-public per leg) / publish-libs / publish-snippets (D1) / deploy (`needs: docker`, no `compose down`) / aggregator; `DOCKER_BUILD_RECORD_UPLOAD=false`; concurrency unchanged (D6); remove `Build API` and the stale comment | §4.1 | Open |
| M6 | **pull-request.yml:** per-browser e2e matrix (chromium ×2, firefox ×4) for Angular, and for React/Vue when affected; `browsers` passed per job; prebuilt-server webServer (if S2 passes); `workers` per S3; cache-hit install skip (if S5 finds a way) | §4.2 | Open |
| M7 | **Specs:** split the scheduler keyboard/keyboard-matrix specs and fix their fixture cost; fake timers in `query-builder.memory-leak.spec`; collapse or de-isolate the ng-bootstrap-demo "should create" specs | §4.3 | Open |
| M8 | `timeout-minutes` on every job in both workflows | §4.3 | Open |
| M9 | Owner actions outside the repo: in the `master` branch-protection rule (Settings → Branches), add `pull-request` as a required check and turn on "Do not allow bypassing" (D7); set the org secret `NX_CACHE_RO_TOKEN` to the server's RO value, piped from the VPS straight into `gh secret set` (D8, PRD §2.4); verify by counting volume files written during the next PR-only window (expect 0) | §5, §2.4 | Open |
| M10 | **Batched sweep:** `actionlint` on both workflows; `nx run-many -t build build-ssr -c production`; `nx run-many -t test`; local `docker build` + run of all 4 images; Angular e2e (chromium + firefox) against the prebuilt server. Then push once and read the single PR run | §8 | Open |
| M11 | After merge: record the first warm and cold publish-master timings in the PR thread and here; tick the §8 measurements | §6, §8 | Open |

## Notes per milestone

- **M4/M5 ordering.** The `dist` artifact must contain `dist/apps/*/server` (the build-ssr output) as
  well as the browser output. Today's upload only has to cover `dist/libs` for `publish-libs`, so check
  what it actually includes and widen the upload path.
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
