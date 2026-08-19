# PRD + plan — comparing a partial coverage upload honestly

Consumer-authored, for **MintPlayer/CodeCoverage**. Companion to
[coverage-pr-gate.md](./coverage-pr-gate.md) (the gate this unblocks) and
[test-coverage.md](./test-coverage.md) (the coverage programme it serves).

Status: **Investigated and NOT recommended** (2026-08-19). Filed upstream as
[CodeCoverage#11](https://github.com/MintPlayer/CodeCoverage/issues/11) and left open as a design
record rather than a request — SP4 measured that this consumer does not need it. **§4 carries the
spike results; read those before §2.** Written after upstream
[#9](https://github.com/MintPlayer/CodeCoverage/issues/9) /
[PR #10](https://github.com/MintPlayer/CodeCoverage/pull/10) shipped the status endpoint, which
made the gate buildable and immediately exposed the next problem.

Legend, matching the upstream house style: 🟦 Coverage repo · 🟪 `action/` · ⬜ consumer-side.

---

## 1. The problem

`mintplayer-ng-bootstrap` runs `nx affected --target=test` on pull requests, so a PR's coverage
report covers **only the projects Nx considers affected**. `master` runs `nx run-many`, so the
baseline is the whole workspace.

The two numbers are not the same quantity, and `GET /api/uploads/status` returns a `baseline` that
is whole-workspace by construction. A PR touching only `mintplayer-pagination` uploads ~350
coverable lines against a ~21,000-line baseline. **Every such PR reads as a 98% coverage collapse.**

The workspace's own workflow already knows this — `pull-request.yml:94-101` gives the PR upload a
separate flag and `finish: false` precisely so a partial number never finalizes under master's flag.
That was a workaround for display. A gate cannot work around it.

**This is the report the roadmap was waiting for.** `roadmap-2026-08.md:517-519` defers
carryforward flags with: *"Real problem, but only for teams already running path-filtered CI with
flags. Easy to get subtly wrong. Defer until someone reports it."* This document is that report —
and it argues for something smaller than carryforward.

### Why not just run the full suite

It is the obvious answer and it is not free. `nx affected` is worth 5–10 minutes per PR check run.
Nothing here proposes giving that up; the point of the feature is to keep it.

**SP4 later showed this framing was wrong in an important way** (§4): almost all of that saving comes
from targets other than `test`, so `run-many --target=test` alone gives up nearly none of it. The
argument below is preserved as it stood before the measurement.

*(An earlier draft of this analysis argued the saving was ~1% of coverable lines. That was measured
over recent* master *merge commits, which in this repo are dominated by `web-components` work, and
it is not the relevant statistic. The mean is irrelevant — the gate must be correct on the
cheap-PR case too, and that is exactly the case where `affected` pays and the naive comparison is
most broken. SP4 measures the real distribution.)*

---

## 2. The design: scope the baseline, do not synthesize a total

**The gate does not need a whole-workspace number. It needs a like-for-like comparison.**

> **`baseline` becomes the base commit's coverage restricted to the paths present in this build.**

A pagination-only PR compares pagination against pagination at base. A `web-components` PR compares
those 16,451 lines against the same 16,451. Both are honest, and the ratchet asks the right
question — *did the code this run actually measured get worse?* — rather than a question about code
the run never executed.

### Why this shape and not carryforward

Carryforward — seeding a commit's report from an ancestor so the total looks whole — is what
Codecov, Coveralls, Qlty and Datadog all implement. It was the obvious candidate and it is rejected
here, on evidence from this service's own source:

| | Carryforward | Scoped baseline |
|---|---|---|
| Documents written per PR push | **~804** (one `FileCoverage` per file per build), 3–5 MB | **0** |
| Passes through `CoverageMerger` | **yes — and it is max-only** | no |
| Deleted-file handling | needs `fileList` pruning; silent failure mode | **n/a** — only compares paths in this upload |
| Storage shape change | per-flag needs one (costed **L**, deferred) | none |
| Reads a base sha | yes | yes |

Two of those rows are disqualifying on their own:

- **`CoverageMerger` is max-only by construction** (`CoverageMerger.cs:24-25`), and max is the
  invariant that makes re-uploads and re-runs idempotent (class comment, `:6-14`). A carried-forward
  file written into `{buildId}/files/` before the partial upload parses would be max-merged with it,
  so a line going `Covered` → `NotCovered` **survives as `Covered`**. The ratchet could never detect
  a decrease in a re-tested file — the precise failure the feature exists to prevent.
- **The document multiplier is 10–40×** on a service that `roadmap-2026-08.md:89-102,480` describes
  as having no backups, no retention policy and no delete path. The precedent for how this fails is
  in the repo: request-budget exhaustion once made *every real upload parse zero files*.

`BuildTreeSummary` at `{buildId}/tree` — one ~50 KB document holding `Path`, `LinesCovered`,
`LinesCoverable` per file (`BuildTreeSummary.cs:16-32`) — is already exactly the input a scoped
baseline needs, on both sides of the comparison.

### What the cross-vendor evidence says

Five products implement carryforward and **all five converged on the same constraints**: the unit is
a named flag attached at upload time (never a path glob, never a project the server infers); the flag
set must be stable across runs; a full baseline upload is required first; carried data is labelled,
and Codecov hides it from the PR comment by default.

That last one is the tell. **A vendor that has built this feature deliberately declines to present
its output as fresh evidence.** Two others skip it entirely and gate on the changed code instead:
Qlty's `--selection` marks a run partial and reports *"Not computable for select coverage"* rather
than a misleading percentage; SonarQube refuses partial analysis outright and gates on New Code.

Scoped baseline sits with the second group. It reports a real number over a stated scope, instead of
a synthetic number over an implied one.

### The hazards it does not escape

Honesty about what remains, all confirmed:

- **A base sha is still required.** `Commit.ParentSha` is a weak foundation: PR #10's migration wiped
  every historical value, it is null until a fresh `opened`/`synchronize`, it exists only when the
  GitHub App is installed, it is not indexed, and its own code comment
  (`GitHubEventsRecipient.cs:174-176`) calls it *"only a hint for finding the PR"*. **The uploader
  should send the base sha explicitly** rather than the server promoting a hint to load-bearing —
  which is also the roadmap's standing instruction (`:372-374`, `:468`).
- **The base may have no coverage.** `publish-master.yml:7-9` sets `cancel-in-progress: true`, so two
  quick master merges cancel the first run and that commit never uploads. Behaviour must be *skip*,
  never *fail* (PRD D5 of the gate document). SP3 measures how often.
- **Nx's affected is not a coverage-stability oracle.** It earns "sources unchanged and no
  transitive dependency changed", which is the hard part. It earns nothing on: workspace-root config
  changes (`sharedGlobals` ships empty, so a root vitest/coverage config edit marks **nothing**
  affected while changing every project's denominator), globbing test files, or non-deterministic
  branches. Scoped baseline is *less* exposed than carryforward here — it never asserts anything
  about a project it did not measure — but a root-config change still makes the two sides
  incomparable. Treat instrumentation config as a global re-baseline trigger.
- **The Nx cache can silently drop a project** (nrwl/nx#4503: no coverage output for cached tasks).
  An affected-but-cached project vanishes from the upload and is indistinguishable from unaffected.
  Under scoped baseline this narrows the comparison rather than corrupting it — but it means the
  gate covers less than it appears to. SP1.

---

## 3. Decisions

**D1 — Scope the baseline; never synthesize a total.** A partial build reports the coverage of what
it measured, and says so. No document is copied forward.

**D2 — The scope is declared by the uploader, not inferred.** An upload states that it is partial.
The server does not guess from file counts — an upload that silently lost a report must not be
reinterpreted as a deliberate subset. This is the cross-vendor lesson (stable, explicit flag sets)
applied to a simpler mechanism.

**D3 — The base sha travels with the upload.** Explicit, not `ParentSha`. The server may fall back to
`ParentSha`, but the fallback is a convenience, not the contract.

**D4 — A partial build never becomes a repository's headline number.** `BuildFinalizer.cs:33-47`
promotes to `Repository.LatestCoverage*` only for default-branch commits, so today's PR flow is
already safe. Make it explicit rather than incidental: a build marked partial is ineligible,
whatever branch it is on.

**D5 — The response states its scope.** A consumer must be able to tell a scoped comparison from a
whole-workspace one, and log which files were in scope. A number whose denominator is implicit is
how this feature goes wrong.

**D6 — Additive only.** `baseline` keeps its current meaning for whole uploads. Existing consumers
see no change.

---

## 4. Spikes — run 2026-08-19

**Outcome: the feature is not worth building for this workspace.** SP1 cleared the premise, SP3
found a real but unrelated issue, and SP4 was decisive against.

### SP1 — Does the Nx cache drop coverage for cached tasks? ⬜ · **NEGATIVE**

13 of the 14 uploaded projects declare a coverage `outputs` entry on their `test` target
(`{workspaceRoot}/coverage/libs/<name>` for the nine Angular libs, `{options.reportsDirectory}` for
the four Vitest ones — and `reportsDirectory` is set in `project.json` `options`, so the token
resolves rather than expanding to nothing). Confirmed empirically: populate the cache, delete
`coverage/libs/mintplayer-dijkstra/`, re-run → `Cache: 1/1 hit (100%)` with `lcov.info` restored.

`api` is the exception (`nx:run-commands`, no `outputs`), but the workflow runs `dotnet test` as its
own unconditional step outside `nx affected`, so it is never cache-skipped.

**Keep as a standing invariant:** this holds *because* outputs are declared. A project added without
them would reintroduce nrwl/nx#4503 silently — coverage would vanish from uploads for a reason
having nothing to do with the diff.

### SP2 — Are normalized paths globally unique? 🟦 · not run

Needs the service; it is a server-side observation. Recorded upstream as the load-bearing question
if the design is ever built.

### SP3 — How often does the base commit lack coverage? ⬜ · **~5%, and it matters anyway**

Over the last 40 `publish-master.yml` runs: **2 cancelled (5%)**, both by `cancel-in-progress: true`
when a second merge landed mid-run. A cancelled run never reaches its upload, so that master commit
has no coverage. Sharper still: uploads only began at `67262d58` — and that commit is one of the two
cancelled, so of the three master commits since the feature existed, one has none.

**This is independent of everything else here and applies to the gate as designed today.** A null
baseline is not only a first-upload condition; it is routine at a few percent. G3's *skip, never
fail* is therefore load-bearing, not defensive decoration.

### SP4 — What does the affected set cover, per PR? ⬜ · **DECISIVE — 20 of 22 PRs ≥99%**

Last 22 merged PRs, `nx show projects --affected --with-target=test` between each PR's base and head,
weighted by coverable lines **as the service itself reports them** for `master@e01681ec` (21,014).

| | |
|---|---|
| n | 22 |
| mean / median | 90.4% / 99.1% |
| share ≥99% | **20 / 22** |
| share <10% | 2 / 22 — PR 379 (vue only, 0.5%), PR 368 (api only, 0.0%) |

`web-components` (16,451) + `ng-bootstrap` (4,215) are 98.3% of the denominator, and at least one is
affected in 20 of 22 PRs. **The distribution is bimodal and the mode is "everything".**

The two outliers are real, and a naive comparison would misfire catastrophically on them — but they
are also the only PRs where `run-many` costs anything, and there it costs one unit-test run.

**Limits, stated:** one repo, 22 PRs, work concentrated in `web-components`; a stretch of API-only or
small-library work would shift it. Weights come from `master@e01681ec`, whose tree omits `qr-code`,
`tools`, `pagination`, `dijkstra`, `ng-animations` and `api` (no coverage at that commit) — the
unpushed branch adds ~725 lines of `qr-code` plus the API's, which would make PR 368 non-zero.
Neither changes the shape.

### What this means

**Take the simple fix: `run-many` for `--target=test` only, leaving `nx affected` on e2e and every
other target.** On 20 of 22 PRs the expensive suites already run, so wall-clock barely moves; the
5-10 minutes `affected` saves this repo comes from targets this does not touch. Every PR becomes
comparable to `baseline` as it already exists, with zero upstream work.

The §2 design is still the right shape *if* a genuinely partitioned monorepo ever needs it, and the
§2 reasons not to build carryforward hold regardless. Both are preserved upstream for that reader.

---

## 5. Milestones *(not being pursued — see §4)*

### N1 — Declare partiality and the base sha 🟦🟪 · cost S

1. `UploadForm` (`UploadsController.cs:271-287`) gains `Partial` (bool) and `BaseSha` (string).
   Additive; absent means today's behaviour exactly.
2. `Build` records both, plus what the comparison resolved against — per the roadmap's own argument
   for `ConfigSnapshot` (`:275-279`), a base-dependent number needs its base stored or it is
   unexplainable later.
3. Action gains `partial` and `base-sha` inputs; `base-sha` defaults to
   `github.event.pull_request.base.sha` on PR events and is otherwise unset.

**Exit:** a partial upload is distinguishable from a whole one in storage, and states its base.

### N2 — Scoped baseline in `GET /api/uploads/status` 🟦 · cost S–M

`ResolveBaseline` (`UploadsController.cs:230-252`) currently takes the newest finalized
default-branch commit other than this one. Extend it:

1. If the build is partial and a base sha resolves to a finalized build, load that build's
   `BuildTreeSummary` and sum only entries whose `Path` is in **this** build's path set.
2. Return the scoped totals as `baseline`, plus a new `baselineScope` object stating `mode`
   (`"whole"` | `"scoped"`), the base sha, and `filesInScope`.
3. `baseline` stays null — meaning *skip* — when there is no base build. Never fail.

**Tests:** a partial upload scopes correctly; a whole upload is unchanged; a base with no build
yields null; a file present at base and absent from the upload is excluded from **both** sides; a
file new in the PR is in the head total and contributes nothing to the baseline.

### N3 — Surface it on the action 🟪 · cost S

Outputs `baseline-scope`, `baseline-files-in-scope`. Document that on a partial upload the rate is
over the measured subset, and that comparing it to the repository's headline number is wrong.

### N4 — Never let a partial build become the headline 🟦 · cost S

Make D4 explicit in `BuildFinalizer` (`:33-47`), and label partial builds in the UI so a human
reading a commit page is not told a subset is the whole.

### N5 — Document it 🟦 · cost S

`docs/upload-api.md` gains a section: what partial means, what scoped baseline compares, the four
hazards from §2, and the explicit statement that a scoped rate is not comparable to the repo total.

---

## 6. Out of scope

- **Carryforward, in any form.** §2 rejects it. If it is ever built, it should be flag-level with
  per-flag storage (costed **L**, `roadmap-2026-08.md:511-519`), and every vendor's manual reset
  ritual should be read first.
- **Patch coverage.** Unchanged and unchanged in priority — this is orthogonal, and remains the
  higher-value feature (M11.1).
- **Merge-base resolution.** Event-time base tip is what the uploader has; the roadmap already tracks
  the real merge base as a T2.1 concern.
