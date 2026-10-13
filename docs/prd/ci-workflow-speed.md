# PRD — Shave the GitHub workflows further (#430 and beyond)

**Issue:** [#430](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/430)
**Plan:** [ci-workflow-speed-plan.md](./ci-workflow-speed-plan.md)
**Status:** Proposed (2026-10-13). Research only; nothing is implemented yet. D1–D9 decided by the owner
(2026-10-13, §5).
**Scope:** `.github/workflows/publish-master.yml`, `.github/workflows/pull-request.yml`,
`.github/actions/{setup,playwright}`, the four image Dockerfiles, `apps/*-e2e/playwright.config.ts`,
the slowest vitest suites, and `nx.json` / `project.json` cache metadata. Everything lands in **one PR**.

## 1. Problem

PR #429 took `pull-request.yml` from ~16 min to ~5.6 min. Issue #430 proposes the same split for
`publish-master.yml` (8.0 min warm, 14.6 min cold) and projects ~5.5–6 min warm and ~10.5 min cold.
Three parallel investigations (master workflow, PR workflow, cross-cutting levers) measured where the
time actually goes. They found that #430 misses the biggest cost, and that the PR workflow still has
~2.5–3 min of avoidable time.

Evidence runs:
- master 38376156576 (warm, 8.0 min) and 37662009449 (cold, 14.6 min);
- PR 38375267077, 38373759165 (4 shards, ~5.6 min) and 38372444056 (cold caches, 7.7 min);
- PR 38367902196 (old single-job layout, cold unit tests).

## 2. Findings

### 2.1 publish-master: the images rebuild what the build job already built

Most of the ~4m50s image phase is `npm install` and `nx build` running a **second time inside Docker**.
BuildKit step timings (warm / cold):

| Image | `npm install` in Docker | `nx build` in Docker | push | attestation | step |
|---|---|---|---|---|---|
| Angular demo | 47.0 s / 49.8 s | 87.1 s / 92.6 s (2 of 20 tasks cached) | 4–6 s | 6 s | 148 s |
| React demo | cached (same daemon as Angular) | 33–42 s, plus `build-ssr` 3.5–7.7 s | ~5 s | 7 s | 44 s |
| Vue demo | cached | 35–40 s, plus `build-ssr` ~9 s | ~6 s | 7 s | 42 s |
| API | n/a | restore 3.9 s + publish 4.4 s, base image pull 10 s | 7 s | 8 s | 25 s |

- The Node Dockerfiles copy the whole tree (`COPY ./ .`) **before** `npm install --legacy-peer-deps`, so
  the npm layer never caches across commits. There is no `cache-from` / `cache-to` anywhere.
- Inside Docker the Nx remote cache is unavailable: no token is passed, and `.nx` is in `.dockerignore`.
- **What gets shipped is not what was tested.** The images build on `node:22-alpine` with `npm install`;
  the tests ran on Node 24 with `npm ci`.
- **#430's plain matrix would make each leg slower.** React and Vue skip the 47 s `npm install` today only
  because they share one Docker daemon with the Angular build. On separate runners each leg pays its own
  install plus a cold Nx build, ~2–2.5 min per leg. #430 assumed ~45 s.
- The runtime stages are small. Angular needs only the dist bundle (no `node_modules`). React and Vue need
  `server.mjs` plus an unpinned `npm install express@^5.1.0 compression@^1.8.0` (2.7 s). The API
  Dockerfile is already fine (restore before the source copy, multi-stage, 25 s).

Other waste in the single `build` job:
- `npm ci` takes 49–64 s because `setup-node` has no `cache: 'npm'`. The shared setup action from #429
  takes 29 s.
- The `Build API` step is redundant: `dotnet test` builds the project itself.
- `Test API` (23 s) waits for the JS tests.
- The four attestations run back to back (28 s).
- Each image step uploads a build-record artifact (~2 s each).
- `deploy` (19 s) waits for `publish-libs` (24 s) although it only pulls GHCR images.
- `cancel-in-progress: true` on master can cancel a run **after** the npm publish but **before** deploy.
  This is accepted (D6): the next run publishes and deploys the newer commit anyway.

### 2.2 pull-request: the Angular shards are unbalanced and pay for things they don't use

The slowest job is always one of the two Angular **firefox** shards: 329–342 s against a 5m37s–5m51s run.

- **Shard skew.** With `fullyParallel`, `--shard` cuts the ordered test list, and that list goes browser
  by browser. Shards 1–2 ran 124 and 123 chromium tests, shards 3–4 ran 123 and 123 firefox tests. Firefox
  takes ~1.8× as long per test: ~205 s of chromium work and ~360 s of firefox work in total. Spread evenly
  that is ~141 s per shard, but the worst shard takes 186 s.
- **Browser install.** Every e2e job restores a 467 MB cache and then spends ~40 s on
  `install-deps chromium firefox webkit`. Of the 117 MB that apt installs, most is WebKit's media
  libraries, and the Angular suite never runs WebKit. React and Vue spent ~58 s each installing browsers
  even when their e2e task was an Nx cache hit (3 s).
- **Dev-server start-up.** `nx serve ng-bootstrap-demo --configuration=production` takes ~51 s and is not
  cacheable. Six jobs pay it (4 shards, axe-ng, live API). `ng-bootstrap-demo:build:production` was a
  remote-cache hit in all three measured runs (4–7 s). The Angular CLI logs "caching has been disabled".
- **Workers.** The CI setting is `workers: 2`, with a comment about 2-vCPU runners. Public-repo Linux
  runners have had 4 vCPUs for a while. The config also records CPU-starvation flakes, so changing this
  needs a measured before and after.
- Already fine (each under 5 s): checkout, the affected check, .NET setup, concurrency, job start
  latency. The Nx remote cache is wired into every job.

### 2.3 Cross-cutting

- **Remote cache: 19 of 20 build tasks and 15 of 15 test tasks were hits** in PR 38375267077. Nx inputs
  are not too broad: `sharedGlobals` is empty, and the codegen targets hit the cache every run.
- **The 307 s cold master test step was a merge race, not a cache problem.** The PR was merged while its
  final CI run (37661796378) was still testing. Master's test step started 56 s into that run, before
  anything was cached. The 5 tasks that missed are exactly the 5 that run was still executing. If
  branch protection required the `pull-request` check (D7), this could not happen, and the warm master
  test step is ~23 s.
- **PR runs write to the remote cache.** Master replayed test output produced by pull_request run
  38367902196. The workflow comment says PRs get a read-only token. Either that token has write scope or
  the cache server does not enforce read-only. This helps speed but is a cache-poisoning surface (§5 D8).
  Fork PRs receive no secrets, so they always run fully cold.
- **Two cacheable targets miss on every master run:** `snippets:build` (~8 s) and `api:build` (~3 s).
  `snippets:build` declares **no `outputs`**, so a cache hit would restore no `.vsix`. That is a latent bug
  in the Marketplace publish step.
- **Cold unit tests take 270 s at `--parallel=2`.**
  - web-components takes 200.6 s wall (317.8 s of test time). The scheduler specs are ~146 s of that (46%):
    `mp-scheduler.keyboard.spec` alone is 41.7 s for 123 tests (~340 ms each), then keyboard-matrix
    26.5 s, row-panel 17.9 s, grid-model 16.9 s, api 12.8 s, aria 10.3 s.
    `query-builder.memory-leak.spec` is 15.6 s for 2 tests.
  - ng-bootstrap takes 154.8 s, dominated by jsdom (setup 92 s, environment 131 s, summed across files).
  - ng-bootstrap-demo takes 47 s for 93 "should create" files.
  - Do **not** switch to happy-dom: the aria specs depend on jsdom's `ElementInternals` support.
- `npm ci` takes 29 s with an npm-cache hit. A `node_modules` cache keyed on lockfile + Node version would
  bring that to ~5 s, but postinstall (`codegen-wc`) must still run.
- .NET restore is 2.9 s, so NuGet caching gains nothing.
- No job has a `timeout-minutes`.

### 2.4 Why PR runs can write to the "read-only" cache (VPS, 2026-10-13)

`nx-cache.mintplayer.com` is `enxtur/nx-caching-server` behind Traefik (`/var/www/nx-cache`). The
`docker-compose.yml` labels define three routers:

- `nx-cache-rw` (priority 200): any method, requires `Bearer ${NX_CACHE_RW_TOKEN}`.
- `nx-cache-ro` (priority 100): `GET`/`HEAD` only, requires `Bearer ${NX_CACHE_RO_TOKEN}`.
- A fallback (priority 1) that denies everything else.

Both token routers swap the client token for the server's internal one. Measured, without printing any
token value:

- In `.env`, the RO, RW and internal tokens are all different.
- The running container's labels hash-match the compose file and use the current `.env` tokens.
- Probing the live endpoint with the server's RO token: `GET` → 404 (allowed, entry missing), `PUT` → 403,
  `POST` → 403, and a follow-up `GET` → 404 (nothing stored). No token at all → 403. **The server
  enforces read-only correctly.**
- Yet 53 cache entries were written on 2026-10-13 between 08:14 and 09:24 UTC. No master run happened in
  that window (the next started at 09:25), only the `pull_request` runs of PR #429.
- `pull-request.yml` sends `secrets.NX_CACHE_RO_TOKEN` on `pull_request` events.

**Conclusion:** the GitHub secret `NX_CACHE_RO_TOKEN` does not hold the server's RO token. Only the RW token
is accepted for a `PUT`, so it almost certainly holds the RW value. The secret is org-level (it is not a
repo or environment secret), so a repo-scoped `gh` login cannot read or list it.

Traefik has no access log enabled, so which router served a request cannot be confirmed afterwards.
Enabling it (with headers dropped) would make this checkable later.

## 3. Goals

1. publish-master: **≤ 3 min warm, ≤ 6 min cold** (today 8.0 / 14.6; #430 targeted ~6 / ~10.5).
2. pull-request: **≤ 3 min** when the Angular e2e runs and the build is a cache hit (today ~5.6).
3. The image deployed is **byte-for-byte the build the tests ran against** (same Node, same `npm ci`).
4. Keep the publishing gate: nothing a test covers reaches npm or GHCR if a test fails.
5. Keep the Nx showcase patterns (`affected`, remote cache, project graph). Improve them, never remove them.
6. Fix the latent `snippets:build` outputs bug and the publish/deploy cancellation hazard.

Non-goals: larger (paid) runners, replacing the coverage service, changing which browsers are tested.

## 4. Proposal

### 4.1 publish-master (supersedes #430's layout where they differ)

| Job | Steps | `needs` |
|---|---|---|
| `build` | setup action; `nx run-many -t build build-ssr --configuration=production`; upload `dist` | — |
| `test` | setup action; `nx run-many -t test --exclude=api --coverage`; upload lcov | — |
| `test-api` | **setup-dotnet only** (no Node, no `npm ci`); `dotnet test … --collect:"XPlat Code Coverage"`; upload cobertura | — |
| `coverage` | **setup-node only**; download both artifacts; `rebase-lcov-paths.mjs`; `coverage-upload-v1` `finish: true`; **does not gate** publishing | `test`, `test-api` |
| `docker` matrix (`ng`, `react`, `vue`, `api`) | download `dist`; **runtime-only Dockerfile** that COPYs the prebuilt `dist/apps/<app>`; build-push; attest; make **this** package public | `build`, `test`, `test-api` |
| `publish-libs` | unchanged | `build`, `test`, `test-api` |
| `publish-snippets` | npm publish + VS Marketplace (both read only the snippets source) | per D1 |
| `deploy` | Deploy to VPS (drop the `compose down` before `up -d`) | `docker` only |
| `publish-master` | aggregator, `if: always()` | all |

- **Runtime-only Dockerfiles.** Each Node demo image becomes one stage on `node:24-slim` (Debian, D3) that
  copies `dist/apps/<app>` (browser + server). React and Vue also copy `server.mjs` and install pinned
  `express` / `compression`. Because the root `.dockerignore` excludes `dist`, each image gets its own
  `apps/<app>/Dockerfile.dockerignore`. Whether a clean-checkout local `docker build` must keep working
  is D2.
- **Make-public moves into the matrix leg** (one PATCH per package). That drops a whole job and its
  ~10–15 s runner start.
- **#430's optional "build images before the tests with a GHA layer cache" is dropped.** Once the legs
  are runtime-only, a gated leg takes ~30–40 s, so building early would save ~10 s for real complexity.
- `DOCKER_BUILD_RECORD_UPLOAD=false`.
- Concurrency on master is unchanged: `cancel-in-progress: true` stays (D6).

### 4.2 pull-request

- **Browser-aware shards.** Replace `--shard=i/4` over all projects with a matrix of
  `{project, shard}`: chromium ×2 and firefox ×4 (D4: shortest wall time wins), sized from measured
  per-browser totals (~205 s / ~360 s, so ~100 s and ~90 s of tests per shard). This uses the
  public API only; `PWTEST_SHARD_WEIGHTS` is undocumented and is rejected.
- **`browsers` input on `.github/actions/playwright`**, included in the cache key. It installs browsers
  and `install-deps` only for those engines. chromium for chromium shards, axe and live API; firefox for
  firefox shards; all three for React and Vue.
- **Skip the browser install when the e2e task will be a cache hit.** Run `nx show` or a
  `--skip-nx-cache=false` dry check, or reorder so the install runs lazily from the e2e target. This saves
  runner minutes rather than wall time (D9 picks the mechanism).
- **Serve the prebuilt Angular demo** (`dist/apps/ng-bootstrap-demo` via its SSR `server.mjs`, as React
  and Vue already do) instead of `nx serve`. On a cache hit the 51 s compile becomes ~5 s. The config
  comment calls this path brittle, so the plan has a spike step (S2) before committing to it.
  Fallback: persist `.angular/cache`.
- **`workers: 3`** in CI, decided by an A/B on the firefox shard (S3). It stays at 2 if flakes return.
- React and Vue e2e get the same per-browser matrix when they are affected and miss the cache. They
  become the critical path once Angular is fixed (~220–230 s today).

### 4.3 Cross-cutting

- `snippets:build` gets `outputs` (the `.vsix` and packed dir); `api:build` gets correct inputs/outputs so
  it caches.
- **Faster cold unit tests:**
  - Split `mp-scheduler.keyboard.spec` and `keyboard-matrix.spec` into several files so vitest
    parallelises them.
  - Find out why each keyboard test costs ~340 ms (suspects: a full mount per test, real-timer waits) and
    fix the fixture.
  - Move `query-builder.memory-leak.spec` to fake timers, or shrink it.
  - Collapse ng-bootstrap-demo's 93 "should create" specs into one table-driven spec, or try
    `isolate: false` for that project (S4).
- Optional `api:test` Nx target wrapping `dotnet test`, so API tests become cacheable and affected-gated
  on PRs (~30 s saved when the API is untouched).
- Cache `node_modules` keyed on `hashFiles('package-lock.json')` + Node version in the setup action. On a
  hit, skip `npm ci` but still run the postinstall codegen (D5).
- Job-level `timeout-minutes` on every job, as a cost guard.

## 5. Decisions (owner, 2026-10-13)

| # | Question | Decision |
|---|---|---|
| D1 | Do snippets publish independently of the tests? | **Gate them** (`needs: [test, test-api]`). It costs ~10 s off the critical path and keeps "nothing publishes on red". |
| D2 | Must `docker build` from a clean checkout still work locally? | **Yes**, via a `builder` stage selected by `--target` / build-arg. CI uses the runtime-only target. |
| D3 | Runtime base image | **`node:24-slim`** (Debian/glibc, like the Ubuntu runner, and the owner's familiar distro). Matches the test Node; no musl risk. ~70 MB larger than Alpine. |
| D4 | How to balance the e2e shards | **Whatever gives the shortest run:** a per-browser matrix, chromium ×2 + firefox ×4 (6 jobs), not `PWTEST_SHARD_WEIGHTS`. More runner minutes are accepted. |
| D5 | Cache `node_modules`? | **Yes**, with the postinstall codegen re-run on a hit. |
| D6 | Master concurrency | **Keep `cancel-in-progress: true`.** A cancelled run between publish and deploy is acceptable; the next run covers it. |
| D7 | Require the `pull-request` check before merge | **Yes.** Owner action: the classic branch-protection rule on `master` already has "Require status checks" on (strict) with **no checks listed**. Add `pull-request` there, and also turn on "Do not allow bypassing" (`enforce_admins` is off today, so an admin merge skips the check and the race stays). |
| D8 | PR runs write to the remote cache | **Enforce read-only** for PR runs, and keep the workflow comment true. Master fills the cache itself. Investigated on the VPS (2026-10-13), see §2.4: the server already enforces read-only, and the leak is the GitHub org secret `NX_CACHE_RO_TOKEN`. Fix: set that secret to the server's RO value (owner, M9). |
| D9 | Skipping browser installs on e2e cache hits | **Only if S5 finds a clean mechanism** (e.g. the install as a lazy Nx dependency of the e2e target). Otherwise drop it. |

## 6. Expected result

| | Today | #430 as written | This PRD |
|---|---|---|---|
| publish-master warm | 8.0 min | ~5.5–6 min (likely worse, §2.1) | **~2.5 min** (build/test ~70 s → image leg ~40 s → deploy ~25 s) |
| publish-master cold | 14.6 min | ~10.5 min | **~5.5–7 min** (the faster-specs work decides which) |
| pull-request (Angular affected, build cached) | ~5.6 min | — | **~2.5–3 min** |

## 7. Risks

- **Runtime match.** The bundles are built on Ubuntu/glibc with Node 24 and run on `node:24-slim`
  (Debian/glibc, Node 24), so native dependencies are not a concern. S1 still runs each image.
- **D8 makes master colder after a merge.** If PRs can no longer write to the cache, the first master run
  after a merge recomputes what the PR changed. Measure it on the first post-merge runs; the §3 cold
  target already covers it.
- **More matrix legs mean more runner minutes.** Wall time drops, but billed minutes may rise slightly.
  The browser-install trimming and the cache-hit skip offset part of it.
- **Renamed checks.** Matrix changes rename the per-job checks; branch protection keys on the
  `pull-request` aggregator only.
- **The prebuilt Angular SSR server in e2e** may differ from `nx serve` (proxy, base href). S2 must pass
  before it lands.
- **`workers: 3`** may bring back the CPU-starvation flakes. A/B it first; `retries: 1` hides flakes, so
  read retry counts, not just pass/fail.

## 8. Acceptance criteria

- [ ] Everything in #430's acceptance list, except where §4.1 supersedes it (the make-public job, the GHA
      pre-build).
- [ ] No image build runs `npm install` or `nx build`. Each image copies the `dist` artifact the tests
      ran against.
- [ ] `test-api` installs no Node. `coverage` installs no .NET and no `node_modules`, and does not gate
      publishing.
- [ ] Angular e2e shards are per browser, and no shard is more than 25% slower than the mean of its
      browser.
- [ ] The playwright action installs only the requested browsers.
- [ ] `snippets:build` declares outputs. Two consecutive master runs show it as a cache hit and still
      publish a `.vsix`.
- [ ] Every job has `timeout-minutes`.
- [ ] Measured on the first runs after merge: publish-master ≤ 3 min warm / ≤ 6 min cold; pull-request
      ≤ 3 min with the Angular e2e running against a cached build.
