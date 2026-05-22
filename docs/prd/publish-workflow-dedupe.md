# PRD: Deduplicate npm-publish steps via a local composite action + matrix

## Problem

`.github/workflows/publish-master.yml` currently contains **27 hand-written `JS-DevTools/npm-publish@v4` steps** — one "Push to NPM" + one "Push to Github" per library, for 13 libraries published to both registries, plus a 14th (`ng-bootstrap-snippets`) published only to NPM. Every block is a near-identical 8 lines of YAML differing only in the `package:` path. `.github/workflows/pull-request.yml` has the same shape repeated **9 more times** as `dry-run: true` verification steps (against `@v3` of the same action — a separate inconsistency).

This is painful to maintain:

- Adding a new library means pasting two ~8-line blocks into `publish-master.yml` and one into `pull-request.yml`, then keeping all three in sync.
- The two workflows have drifted: PR uses `JS-DevTools/npm-publish@v3`, master uses `@v4`; the master workflow publishes `web-components`, `react-bootstrap`, `vue-bootstrap`, `ng-bootstrap`, and `ng-bootstrap-snippets` that the PR dry-run does not exercise.
- Cross-cutting changes (e.g. adding `provenance: true`, bumping the action major version, changing `access`, swapping the NPM token secret) require ~30 identical edits.
- The repeated YAML buries the genuinely-different steps (Docker images, VSCode marketplace, .NET API) under wall-of-publish.

We want one canonical `uses:` invocation per registry, called declaratively over a list of packages, while preserving the current behaviour exactly: provenance attestations, OIDC token scope, secret masking, the commented-out FTP step's reliance on the `publish_ng_bootstrap` step output, and the non-standard `libs/mintplayer-ng-bootstrap-snippets/` package path.

## Goal

1. Replace the 27 inline publish steps in `publish-master.yml` and the 9 dry-run steps in `pull-request.yml` with **a single local composite action** plus **a matrix-driven list of packages**.
2. Keep npm provenance / OIDC attestations working unchanged. `id-token: write` permission and `secrets.PUBLISH_TO_NPMJS` continue to flow correctly.
3. Adding a new library requires editing **one list** (the matrix include list), nothing else — no new YAML steps anywhere.
4. The composite action is reused by both workflows: production publish on `publish-master.yml`, dry-run verification on `pull-request.yml`.
5. No regressions on the registry side: NPM and GitHub Packages each receive the same package set they receive today; the snippets package continues to publish to NPM only.
6. Align `pull-request.yml` on `JS-DevTools/npm-publish@v4` to match master (drive-by fix).

### Non-goals

- Switching to npm **trusted publishing** (OIDC, no token). It's now GA but it requires `npm >= 11.5.1` AND is incompatible with `workflow_call` callers — out of scope for this PRD; track separately if desired.
- Replacing `JS-DevTools/npm-publish` with raw `npm publish`. The action's "already-published version = success" behaviour is load-bearing for re-runs.
- Touching the non-npm steps (Docker images for ghcr.io, the VSCode marketplace publish, the .NET API build/publish, the VPS deploy job). They stay byte-identical.
- Restoring the commented-out FTP-publish step that references `steps.publish_ng_bootstrap.outputs.type`. We **preserve the step `id`** so a future un-commenting still works, but the FTP step itself remains commented.
- Splitting build → publish into separate jobs and passing `dist/` via artifact upload. See [Tradeoffs](#tradeoffs); rejected for v1.

## Current state

### `publish-master.yml`

```text
jobs.build.steps:
  - Checkout / Setup node / Install / Build / Test               (5 steps)
  - Push to NPM + Push to Github  × 13 libraries                 (26 steps)
  - Push to NPM  × 1 (snippets, NPM only)                        (1 step)
  - Publish to Visual Studio Marketplace                          (1 step)
  - GHCR docker login + 3 image builds + 3 attestations           (10 steps)
  - .NET setup/build/test + API image + attestation               (5 steps)
```

The 27 publish steps differ only in `package:`. Per-block fields:

| field        | NPM block                                        | GH Packages block                                |
| ------------ | ------------------------------------------------ | ------------------------------------------------ |
| `uses`       | `JS-DevTools/npm-publish@v4`                     | `JS-DevTools/npm-publish@v4`                     |
| `package`    | `dist/libs/<lib>/package.json` (snippets differs) | same                                            |
| `registry`   | `https://registry.npmjs.org`                     | `https://npm.pkg.github.com`                     |
| `token`      | `${{ secrets.PUBLISH_TO_NPMJS }}`                | `${{ github.token }}`                            |
| `access`     | `public`                                          | `public`                                          |
| `provenance` | `true`                                            | `true`                                            |

### Package inventory

(Produced by the research sweep; full table preserved here so the matrix definition is reviewable in one place.)

| # | logical name | package.json path | NPM | GH Packages | dry-run in PR | notes |
|---|---|---|---|---|---|---|
| 1 | ng-animations | `dist/libs/mintplayer-ng-animations/package.json` | ✅ | ✅ | ✅ | baseline |
| 2 | ng-click-outside | `dist/libs/mintplayer-ng-click-outside/package.json` | ✅ | ✅ | ✅ | baseline |
| 3 | ng-focus-on-load | `dist/libs/mintplayer-ng-focus-on-load/package.json` | ✅ | ✅ | ✅ | baseline |
| 4 | encode-utf8 | `dist/libs/mintplayer-encode-utf8/package.json` | ✅ | ✅ | ✅ | baseline |
| 5 | dijkstra | `dist/libs/mintplayer-dijkstra/package.json` | ✅ | ✅ | ✅ | baseline |
| 6 | qr-code | `dist/libs/mintplayer-qr-code/package.json` | ✅ | ✅ | ✅ | baseline |
| 7 | pagination | `dist/libs/mintplayer-pagination/package.json` | ✅ | ✅ | ✅ | baseline |
| 8 | ng-qr-code | `dist/libs/mintplayer-ng-qr-code/package.json` | ✅ | ✅ | ✅ | baseline |
| 9 | ng-swiper | `dist/libs/mintplayer-ng-swiper/package.json` | ✅ | ✅ | ✅ | baseline |
| 10 | web-components | `dist/libs/mintplayer-web-components/package.json` | ✅ | ✅ | ❌ | **add to PR matrix** |
| 11 | react-bootstrap | `dist/libs/mintplayer-react-bootstrap/package.json` | ✅ | ✅ | ❌ | **add to PR matrix** |
| 12 | vue-bootstrap | `dist/libs/mintplayer-vue-bootstrap/package.json` | ✅ | ✅ | ❌ | **add to PR matrix** |
| 13 | ng-bootstrap | `dist/libs/mintplayer-ng-bootstrap/package.json` | ✅ | ✅ | ✅ | has step `id: publish_ng_bootstrap` |
| 14 | ng-bootstrap-snippets | `libs/mintplayer-ng-bootstrap-snippets/package.json` | ✅ | ❌ | ❌ | **outlier**: `libs/…` not `dist/libs/…`, NPM only |

## Reference research — what already exists

| Approach | Verdict | Why |
|---|---|---|
| **Shell loop over `npm publish`** | Not a fit | `uses:` cannot be inside a `run:` step; rewriting in shell loses `JS-DevTools/npm-publish`'s "version already published → success" handling, dry-run flag, and provenance plumbing. |
| **`strategy.matrix` over steps inside one job** | Not a fit | GitHub Actions matrices are job-level, not step-level. There is no way to "matrix" a step inside an existing job. |
| **Reusable workflow (`workflow_call`)** | Partial fit | Works, but a reusable workflow is a *whole job* — needs its own runner, must re-checkout, matrix has to be declared inside the callee. Also incompatible with future npm trusted publishing (validator checks the caller workflow filename). |
| **Local composite action** | **Recommended** | Lives at `.github/actions/<name>/action.yml`, plugs into any job's `steps:`, inherits the caller's `permissions:` (id-token), supports `uses:` of marketplace actions natively. Secrets are passed as plain `inputs` and GitHub still masks them. |
| **Composite action + job-level matrix** | **Recommended for the matrix half** | Job-level `strategy.matrix` over a list of package objects, with the composite action invoked twice per matrix entry (once per registry). Snippets becomes one extra matrix entry with `github-packages: false`. |

**Key research outputs** (full memo on file; the decision-relevant points):

- `id-token: write` is granted at the **job** level and is inherited by composite-action steps. Provenance keeps working.
- `JS-DevTools/npm-publish@v4` invoked from inside a composite action is fully supported.
- Composite actions have **no `secrets:` context** — secrets must be passed as inputs (`with: npm-token: ${{ secrets.PUBLISH_TO_NPMJS }}`); GitHub still masks the value.
- `strategy.matrix` accepts a list of objects (`{ name, path }`) — `${{ matrix.pkg.path }}` resolves correctly.
- `fail-fast: false` is required so one transient publish failure doesn't cancel the other 13.

## Proposed approach

### File layout

```text
.github/
├── actions/
│   └── publish-npm-package/
│       └── action.yml           ← new, ~30 lines
└── workflows/
    ├── publish-master.yml       ← 27 publish steps → 1 matrix block (~20 lines)
    └── pull-request.yml         ← 9 dry-run steps → same matrix block, dry-run: true
```

### The composite action

`.github/actions/publish-npm-package/action.yml`:

```yaml
name: 'Publish npm package'
description: 'Publish a built package to NPM (and optionally GitHub Packages) via JS-DevTools/npm-publish.'
inputs:
  package:
    description: 'Path to the built package.json'
    required: true
  registry:
    description: 'Registry URL (https://registry.npmjs.org or https://npm.pkg.github.com)'
    required: true
  token:
    description: 'Auth token for the chosen registry'
    required: true
  access:
    description: 'npm access level'
    required: false
    default: 'public'
  provenance:
    description: 'Generate provenance statement (requires id-token: write on the job)'
    required: false
    default: 'true'
  dry-run:
    description: 'If true, run npm publish --dry-run instead of publishing'
    required: false
    default: 'false'
outputs:
  type:
    description: 'Publish result type from JS-DevTools/npm-publish (none|version)'
    value: ${{ steps.publish.outputs.type }}
runs:
  using: 'composite'
  steps:
    - id: publish
      uses: JS-DevTools/npm-publish@v4
      with:
        package: ${{ inputs.package }}
        registry: ${{ inputs.registry }}
        token: ${{ inputs.token }}
        access: ${{ inputs.access }}
        provenance: ${{ inputs.provenance }}
        dry-run: ${{ inputs.dry-run }}
```

The `outputs.type` passthrough preserves the existing `steps.publish_ng_bootstrap.outputs.type` contract that the commented-out FTP step depends on.

### The matrix in `publish-master.yml`

The `build` job grows a `publish` step block that replaces all 27 inline publish steps. We split the matrix into two distinct strategy lists rather than a single `registry × package` product, because the snippets package is a clean asymmetric case (NPM only, non-`dist/` path) and a registry × package product would need `include`/`exclude` gymnastics.

```yaml
    # ---- Publish all libraries to NPM ----
    - name: Publish to NPM
      id: publish-npm
      uses: ./.github/actions/publish-npm-package
      strategy:                       # NOTE: see "Step-level matrix" below
        fail-fast: false
        matrix:
          pkg:
            - { name: ng-animations,        path: dist/libs/mintplayer-ng-animations/package.json }
            - { name: ng-click-outside,     path: dist/libs/mintplayer-ng-click-outside/package.json }
            # … all 13 dist/libs/* entries
            - { name: ng-bootstrap-snippets, path: libs/mintplayer-ng-bootstrap-snippets/package.json }
      with:
        package: ${{ matrix.pkg.path }}
        registry: 'https://registry.npmjs.org'
        token: ${{ secrets.PUBLISH_TO_NPMJS }}
```

**Important constraint discovered during research.** GitHub Actions does **not** support `strategy:` on individual steps — only on jobs. The PRD-level shape above is therefore **not** what we ship; we ship one of these two concrete forms:

**Form A — split `publish` job with matrix (job-level matrix):**

```yaml
jobs:
  build:
    # … existing build job, but now uploads dist/ as an artifact at the end
    steps:
      # …
      - name: Upload dist artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  publish-npm:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    strategy:
      fail-fast: false
      max-parallel: 5         # be polite to npm registry
      matrix:
        pkg:
          - { name: ng-animations, path: dist/libs/mintplayer-ng-animations/package.json }
          # …
          - { name: ng-bootstrap-snippets, path: libs/mintplayer-ng-bootstrap-snippets/package.json }
    steps:
      - uses: actions/checkout@v4   # for the composite action's repo-local path
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - uses: ./.github/actions/publish-npm-package
        with:
          package: ${{ matrix.pkg.path }}
          registry: 'https://registry.npmjs.org'
          token: ${{ secrets.PUBLISH_TO_NPMJS }}

  publish-ghpkg:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write
    strategy:
      fail-fast: false
      matrix:
        pkg:
          # 13 dist/libs/* entries — snippets excluded
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - uses: ./.github/actions/publish-npm-package
        with:
          package: ${{ matrix.pkg.path }}
          registry: 'https://npm.pkg.github.com'
          token: ${{ github.token }}
```

**Form B — single job, no matrix, just the composite action:**

The existing `build` job keeps everything; the 27 inline blocks collapse into 27 calls of the composite action (each one line of `uses:` + a small `with:` block). Total step count is unchanged but each step shrinks from 8 lines to ~5 lines, and cross-cutting changes happen in one file.

**Recommendation: ship Form A.** It hits all five goals in [Goal](#goal). The artifact-passing cost is real but bounded (see Tradeoffs). It also unlocks `max-parallel` throttling which the inline form can't express.

### The matrix in `pull-request.yml`

The PR workflow stays a single job (no need for the artifact split — the dist/ is already on disk). It calls the composite action with `dry-run: true`:

```yaml
    - name: Dry-run publish (all packages)
      uses: ./.github/actions/publish-npm-package
      # would need to live in its own matrix job; same Form A pattern
      with:
        package: ${{ matrix.pkg.path }}
        registry: 'https://registry.npmjs.org'
        token: ${{ secrets.PUBLISH_TO_NPMJS }}
        dry-run: true
```

The PR matrix list should expand to the full 14-package set (the current PR workflow misses 5 packages — `web-components`, `react-bootstrap`, `vue-bootstrap`, `ng-bootstrap`, `ng-bootstrap-snippets`), so the dry-run covers exactly what master will publish.

**To avoid two copies of the package list**, factor the list into a single YAML anchor source. Two viable mechanisms:

1. **Reusable workflow** holding only the matrix — both workflows call it. Heaviest, but most idiomatic.
2. **Generated step** — a tiny `tools/scripts/list-publishable-packages.mjs` outputs a JSON array of `{ name, path }` from `nx show projects --withTarget=build --json` (or a static manifest), and a `set-output` step feeds it into `jobs.<x>.strategy.matrix.pkg`. This is the standard `fromJSON()` matrix pattern.
3. **Just keep two copies** and accept that the PR list and master list might drift by one entry at a time. Lowest engineering cost, highest drift risk.

**Recommendation: option 2 (generated matrix).** A 10-line Node script that reads from a single manifest file keeps both workflows in sync without the reusable-workflow overhead. The manifest can be checked in at `.github/publish-packages.json` and reviewed as part of any PR that adds a new library.

## Tradeoffs

### Form A's artifact-upload cost

Splitting into `publish-npm` / `publish-ghpkg` jobs means **uploading dist/ once** from `build` and **downloading it 14 + 13 = 27 times** (one per matrix entry). With v4 artifacts the per-download is ~2-10s for a small dist and the cost is wall-clock-additive only to the *slowest* matrix entry, not the sum (matrix entries run in parallel up to `max-parallel`).

- **dist/ size today**: roughly the sum of 14 built Angular libraries. Has not been measured for this PRD — should be measured during implementation. If it's > 200 MB the upload itself becomes the bottleneck and Form B should be reconsidered.
- **Runner-minute cost**: a single matrix runner spends ~15-25s on checkout + node setup + download before the actual publish. For 27 matrix entries that's ~7-12 extra runner-minutes per release. At GitHub's $0.008/min for Linux that's ~$0.10/release — negligible.
- **Wall-clock**: with `max-parallel: 5`, 14 packages publish in ~3 batches of 5; expected total ~60-90s vs current sequential ~90-120s. Mild speed-up.

### Form A's checkout

Each matrix job must `uses: actions/checkout@v4` so that `uses: ./.github/actions/publish-npm-package` resolves. A `sparse-checkout` of just `.github/actions/publish-npm-package` keeps it < 1s.

### Composite action vs reusable workflow

We choose composite because:
- The caller decides the matrix and permissions; the reusable form forces those into the callee.
- It plays nice with `id-token: write` inheritance.
- It keeps the door open for npm trusted publishing later (reusable workflows break that).

### Risks

- **Breaking provenance.** Mitigated by leaving the action version (`@v4`) unchanged and keeping `id-token: write` at the new publish job level.
- **Secret masking.** Mitigated — research confirmed GitHub masks secrets passed as composite-action inputs.
- **Snippets path drift.** The matrix entry for snippets uses `libs/...` not `dist/libs/...`; an early reviewer will likely "fix" this. Add an inline YAML comment on that matrix entry pinning the path.
- **The commented FTP step.** Its `steps.publish_ng_bootstrap.outputs.type` reference becomes `needs.publish-npm.outputs.<???>` if/when un-commented. The composite action exposes `outputs.type` so the wiring is recoverable, but the cross-job output path differs. Add a TODO comment alongside the commented FTP block noting the new path.

## Rollout plan

1. **Create the composite action** (`.github/actions/publish-npm-package/action.yml`) — pure addition, no behavioural change yet.
2. **Refactor `pull-request.yml` first.** Lower stakes (dry-run only). Verify on a draft PR: 14 dry-run matrix entries all pass, OIDC token threading still works for `provenance: true` even under dry-run.
3. **Refactor `publish-master.yml`.** Add `upload-artifact@v4` of `dist/` to the `build` job. Add `publish-npm` and `publish-ghpkg` matrix jobs with `needs: build`. Delete the 27 inline publish steps.
4. **Verify on master.** First production run: spot-check that all 14 NPM versions appear and all 13 GH Packages versions appear; verify provenance attestation on at least one package via `npm view <pkg> --json | jq .dist.signatures`.
5. **Bump `pull-request.yml` from `@v3` to `@v4`** (drive-by, captured in step 1 since the composite uses `@v4`).
6. **Add the manifest file** (`.github/publish-packages.json`) and the `tools/scripts/list-publishable-packages.mjs` matrix-feeder; switch both workflows to `fromJSON(needs.list.outputs.matrix)`.

Steps 1-5 are the core PRD scope. Step 6 is a follow-up that can ship in the same PR if it tests cleanly, otherwise as a fast-follow.

## Open questions

- Is the .NET API publish step in scope for any deduplication? (PRD says no — those steps differ meaningfully and aren't repeated.)
- Do we want `max-parallel: 5` or higher? Set conservatively to start; can raise once the NPM registry doesn't push back.
- Should `web-components`, `react-bootstrap`, `vue-bootstrap` keep their current ordering guarantee ("publish web-components first so wrappers resolve the peer dep")? In Form A, matrix entries are unordered; if install-time peer-dep resolution matters, that ordering needs to be modelled as a job-level dependency (`publish-wrappers needs: publish-core`). Spike during implementation.
