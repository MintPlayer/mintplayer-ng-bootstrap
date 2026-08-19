# PRD + plan — comparing a partial coverage upload honestly

Consumer-authored, for **MintPlayer/CodeCoverage**. Companion to
[coverage-pr-gate.md](./coverage-pr-gate.md) (the gate this unblocks) and
[test-coverage.md](./test-coverage.md) (the coverage programme it serves).

Status: **Proposed** (2026-08-19). Written after upstream
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

## 4. Spikes

Each is cheap and each could change the design. **SP1 and SP2 should run before any code.**

### SP1 — Does the Nx cache drop coverage for cached tasks? ⬜ · cost S

nrwl/nx#4503 reports that `nx affected --codeCoverage` produces no coverage output for a task served
from cache. If true here, an affected project can be absent from the upload for a reason that has
nothing to do with the diff — and no server-side design can distinguish that from "not affected".

**Method:** run the PR test command twice on an unchanged tree; diff the emitted lcov file set.
**Changes what:** if confirmed, the consumer must disable the cache for coverage runs, or the gate's
scope is non-deterministic. This is a consumer-side bug, not a service one, and it invalidates the
feature's premise if unaddressed.

### SP2 — Are normalized paths globally unique? 🟦 · cost S

Eight of this workspace's uploaded lcov files contain an identical `SF:src/index.ts`, because each
project's paths are relative to its own vitest root and no `rootDir` is passed. `PathNormalizer`
(`PathNormalizer.cs:21-22,46-67`) resolves paths against `rootDir`, `sourceRoots` and the `fileList`
via exact, case-insensitive and longest-suffix matching.

**The whole design is a set intersection on paths, so this is load-bearing.** If two projects'
files can normalize to the same key, the scoped baseline is wrong in a way that will not look wrong.

**Method:** upload this workspace's real reports; assert the resulting `FileCoverage` path set has no
duplicates and matches `git ls-files` entries 1:1. **Changes what:** if collisions are possible, the
uploader must send `rootDir` per report, and that becomes a prerequisite milestone.

### SP3 — How often does the base commit lack coverage? ⬜🟦 · cost S

`cancel-in-progress: true` on the master workflow means a superseded run never uploads. Also
`pull_request.base.sha` is the base-branch **tip at event time**, not the merge base, and goes stale
while a PR sits open.

**Method:** over the last N master commits, count how many have a finalized build.
**Changes what:** if the miss rate is material, the server should walk back to the nearest ancestor
*with* coverage — which is what Codecov does (10-hop parent walk) and where much of its reported
pain comes from. Prefer *skip* over *walk* unless the data says otherwise.

### SP4 — What does the affected set actually cover, per PR? ⬜ · cost S

Measure over **pull requests**, not master merge commits — the earlier attempt used the latter and
got a badly skewed answer.

**Method:** for the last N merged PRs, compute affected-set coverable lines ÷ whole-workspace
coverable lines. Report the distribution, not the mean.
**Changes what:** the cost/benefit of the whole feature versus simply running `run-many` for
`--target=test` while leaving e2e affected-gated. If the distribution is overwhelmingly near 100%,
the feature is not worth building and the consumer should take the simpler fix.

---

## 5. Milestones

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
