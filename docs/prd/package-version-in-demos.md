# PRD: the released package version in the demo apps

**Status:** implementing (branch `ci/demo-package-version`).
**Trigger:** d2b7dfcb (#445, "Set up MintPlayer package versioning").
**Upstream:** MintPlayer/MintPlayer.Spark#552, PR #553 (merged 2026-10-27): the versioning action's `plan` and `release` phases.

## 1. Problem

#445 replaced every `libs/*/package.json` version with `0.0.0-PLACEHOLDER`. The real version is now decided by the
versioning action (`MintPlayer/MintPlayer.Spark/apps/CodeCoverage/versioning-action`), and today that only happens
inside the publish jobs. The demos read the version from the **source** `package.json` at build time, so all three
deployed sites show `0.0.0-PLACEHOLDER`:

| Demo | Reads | Renders |
|---|---|---|
| ng | `apps/ng-bootstrap-demo/src/app/app.config.ts` (`BOOTSTRAP_VERSION`, from `@mintplayer/ng-bootstrap/package.json` → `libs/mintplayer-ng-bootstrap/package.ts`) | navbar `app.component.html`, home badge `home.component.html` |
| react | `apps/react-bootstrap-demo/src/app/shell/GithubLink.tsx` | same file |
| vue | `apps/vue-bootstrap-demo/src/app/App.vue` | same file |

All three resolve to the source `package.json` through tsconfig paths, not to `dist` or npm.

**A second, live bug** was found during the investigation (S1, §5). `publish-libs` and `publish-snippets` both call the
action, and the engine treats a tag already on HEAD as decided ("was released by an earlier run of this commit"), so
whichever call comes first decides every version.
- That is normally `publish-snippets`, which only waits for the tests. In run 40200311265 it reached the step 16 s
  earlier than `publish-libs`.
- It has no `dist`, so it logs "no .d.ts … Its API counts as changed" for every lib.
- **So every changed lib gets a minor bump where a patch was due.** #445 itself escaped only because the onboarding
  had already seeded the tags.

## 2. Owner constraints (2026-10-25)

- **C1. All repository code runs in GitHub Actions, never on the versioning server.** The server only ever receives
  data: a manifest, or a sealed plan. #553 keeps this.
- **C2. A master run takes 5 min or less.** The baseline is run 40200311265, 3:48 wall. Its critical path is
  build (2:27) ∥ tests (≤ 2:12) → docker (≤ 0:50) → deploy (0:21).

## 3. Facts that constrain the design

- **F1. The action needs the built `.d.ts` files.** They decide minor vs patch, so it can only run **after the
  library build**.
- **F2. Tags promise that a package ships**, so they must not be pushed **before the tests pass**.
- **F3. `phase: plan` (#553) decides and stamps without tagging.** It stamps every publishable package.json, both
  the source file and the build-output copy, with the version planned for that commit, and writes no tag. Its
  `plan` output goes through a job output to `phase: release`. Several jobs may release the same plan.
  `all-versions` gives every package's version.
- **F4. In server mode the plan step needs `id-token: write`.** Without an OIDC token it silently falls back to
  local mode.
- **F5. A demo build after stamping must not rebuild the libs.** Stamping changes the libs' inputs, so a plain
  `nx build <demo>` rebuilds every lib. `--exclude-task-dependencies` prevents that.
  - **But it also skips the demos' other dependency, `mintplayer-web-components:codegen-ssr-chrome`.** That target
    must run explicitly in the library step. A warm local checkout hides this: the generated files are already on
    disk.
- **F6. `@angular/core` contains the literal `0.0.0-PLACEHOLDER`** in its own docs-URL helper. A check that the
  placeholder is absent is therefore always a false alarm on the ng demo. The check must assert that the expected
  version is **present**.

## 4. Design

### 4.1 `publish-master.yml`

```
build:            build libs + codegen-ssr-chrome → versioning (phase: plan) → build demos (--exclude-task-dependencies)
                  → check-demo-versions → upload dist          [outputs: plan]
tests:            unchanged, parallel to build
publish-libs:     needs [build, tests] → versioning (phase: release, plan) → publish dist/libs
publish-snippets: needs [build, tests] → versioning (phase: release, plan) → publish snippets   (problem 1 fixed)
docker, deploy:   unchanged; dist/apps/* now carries the real version
```

- **`build`** gets `id-token: write` (F4) and exposes `outputs.plan`. It needs no `contents: write`: the plan writes
  no tag.
- **The release jobs keep `contents: write`.** That covers a local fallback, which pushes the tags with the
  checkout's credentials.
- **Only one version decision per run.** Both publish jobs release the same plan. The second finds the tags in
  place, so the S1 race is gone.
- **The action is pinned by SHA**, as before, to the first published commit that has the phases.

### 4.2 Guard: `tools/scripts/check-demo-versions.mjs`

The guard runs in `build` right after the demo build. For each demo it reads the version of its library from the
stamped source `package.json`:
- ng → `@mintplayer/ng-bootstrap`
- react → `@mintplayer/react-bootstrap`
- vue → `@mintplayer/vue-bootstrap`

It fails when:
- the version is still the placeholder (the plan did not stamp), or
- the demo's **client** bundle or its **server** bundle lacks the version as a quoted string literal.

Presence, not absence (F6). It is specced like the other `tools/scripts` guards.

### 4.3 The demos outside master

Locally and in pull-request runs nothing stamps, so the source still says `0.0.0-PLACEHOLDER`.
- **Each demo shows `dev` instead.**
- **The ng home badge shows `dev` rather than `vdev`.**
- The demo e2e suites assert that the navbar shows a version or `dev`, and never the placeholder.

### 4.4 Nx cache

- **The libs build before stamping,** so their cache keys are unchanged.
- **The demos build after it.** The lib `package.json` is in their `^production` inputs, so a stamped build and a
  placeholder build hash differently. A PR's or a local machine's cache entry can never be restored into a master
  build.

## 5. Spikes

| # | Question | Result |
|---|---|---|
| S1 | Does the double call misbehave? | **Yes**, see §1. Log of master run 40200311265. Fixed by the single plan (§4.1). |
| S2 | After stamping, does `nx run-many -t build build-ssr -p <demos> --exclude-task-dependencies` give bundles with the real version, without rebuilding the libs? | **Yes**, done locally on 2026-10-25. Stamped `22.99.1` / `19.99.2` / `3.99.3`; all 3 demos built in 140 s cold, with no lib task. Each value is present in its demo's client and SSR bundle. Found F6. F5's codegen trap was found afterwards, by reading the `dependsOn`. |
| S3 | Plan/release split in the action. | **Done upstream** (Spark #553): engine, action, server and tests. |
| S4 | End to end. | The first master run after merge. Its timing is checked against C2, and the deployed navbars must show the released versions. |

## 6. Out of scope

- **A dev tunnel (smee / WebSocket) that relays the action's server calls to a developer machine.** It is a Spark
  concern, and this change does not need it.
