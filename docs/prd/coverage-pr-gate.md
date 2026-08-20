# PRD — a PR coverage gate for this workspace

Status: **Superseded in part, 2026-08-19.** Consumer-side companion to
[test-coverage.md](./test-coverage.md) §D2 / M11 and its open question **Q3**.
Upstream issue: [MintPlayer/CodeCoverage#9](https://github.com/MintPlayer/CodeCoverage/issues/9)
(filed 2026-08-17), **closed by [PR #10](https://github.com/MintPlayer/CodeCoverage/pull/10), merged
and deployed 2026-08-19**.

> **Read §2a first.** Everything asked for upstream shipped, which retires most of §3's interim
> design. §2's evidence is kept as the record of what was true when the question was asked — it is
> history now, not guidance. The live plan is
> [coverage-pr-gate-plan.md](./coverage-pr-gate-plan.md).

Grounded in a read of the coverage service's own source at `C:\Repos\Coverage` (ASP.NET Core +
MintPlayer.Spark + RavenDB), its uploader action at `C:\Repos\Coverage\action`, and its existing
roadmap `docs/roadmap-2026-08.md`. A three-agent survey ran alongside; every claim recorded here was
verified directly against the source.

## 1. Why this document exists

[test-coverage.md](./test-coverage.md) proposes a coverage ratchet (D2) and leaves **Q3** open:
*does coverage.mintplayer.com expose a status-check API GitHub can gate on, or must the ratchet be a
workflow step comparing against the master figure?*

**Q3 is now answered: no such API exists, and none is close to shipping.** This document records the
answer, the evidence, what this workspace should therefore do in the meantime, and what was asked of
the service upstream.

## 2. Answer to Q3, with evidence

**Nothing in the service today produces a pass/fail verdict, a threshold, or a commit-graph
comparison.** Measured and read directly:

- `/api/browse/repos/{owner}/{name}/status`, `/pulls`, `/compare` all return **404** (probed live).
  Anything outside `/api`, `/spark` and `/badge` falls through to the Angular SPA, which is why
  those probes 404 rather than 405 — they never reach a controller.
- There is **no checks or commit-status code anywhere** in the service. The service's own roadmap
  states this in as many words (`docs/roadmap-2026-08.md`, T2.1: *"Nothing exists — no checks or
  statuses code anywhere"*).
- The only delta that exists is `Commit.CoverageDelta`
  (`Coverage.Library/Entities/Commit.cs:64-65`) — computed per request against *the chronologically
  previous commit in the list being rendered*, explicitly `[JsonIgnore]`d and never persisted. Its
  own doc-comment says a commit-graph delta would need an explicit base sha. It is a display
  affordance, not a gate input.
- Thresholds do not exist. `RepoSettingsController` (`Coverage/Controllers/RepoSettingsController.cs`)
  currently has exactly one endpoint — badge-token rotation.

### The full anonymous read surface (11 browse endpoints, not the 4 I first found)

`Coverage/Controllers/BrowseController.cs`. Visibility is gated by `ResolveVisibleRepository`
(`:410-418`) — public repos to anyone, private ones 404 rather than 403, so existence never leaks.

| Endpoint | Line | Returns |
|---|---|---|
| `/accounts/{login}` · `/accounts/{login}/repos` · `/sparklines` | `:183,36,125` | account, repo list, ≤20-point series |
| `/repos/{o}/{n}` | `:52` | `RepoInfo(… LatestCoverage, LatestCoverageSha, CanManage, BadgeToken, BaseUrl)` |
| `/repos/{o}/{n}/commits?branch=&withCoverageOnly=&skip=&take=` | `:61` | `CommitInfo[]`, take capped 200 |
| **`/repos/{o}/{n}/history?branch=&take=`** | `:93` | **`HistoryPoint(Sha, Timestamp, LinesCovered, LinesCoverable, Percent)`**, ascending, take clamped 1–500 |
| `/repos/{o}/{n}/branches` | `:160` | `string[]`, default branch first |
| `/commits/{sha}` | `:195` | commit + `Builds[]` + per-session `ParseStatus`/`Error`/`FilesCount` |
| `/commits/{sha}/tree?path=` | `:242` | `TreeEntry[]` + `UnmatchedFiles` (root only, capped 50) |
| `/commits/{sha}/hierarchy` | `:292` | `HierarchyNodeDto` tree |
| **`/commits/{sha}/file?path=`** | `:350` | **`{Path, Source, Lines, Branches}` — per-line hit data** |

Percentages are never stored; `CoverageSummary` holds counts and consumers derive the rate
(`Coverage.Library/Entities/CoverageSummary.cs:3-14`).

There is also a **second anonymous read surface**: `/spark/*` (`Program.cs:218`) exposes Spark's
generic query API over Accounts/Repositories/Commits/Builds, with `security.json` granting QueryRead
to Everyone including anonymous — the only gate being row filters in `Coverage/Actions/*.cs`. It is
read-only (no Edit/New/Delete right exists). We do not build on it, but it is worth knowing it is there.

### What *does* already exist (and is better than expected)

The gap is narrower than the absence of endpoints suggests. Four load-bearing pieces are in place:

1. **Per-line hit data is persisted.** `FileCoverage.Lines` carries `{Number, Hits, Status}` and
   `Branches` carries `{Line, BlockId, BranchId, Taken}`
   (`Coverage.Library/Entities/FileCoverage.cs:31,33,45-67`). Patch coverage is therefore computable
   server-side — the hardest prerequisite is met.
2. **Document ids are content-addressed**, so a changed file is a point-load:
   `FileCoverage.DocumentId(buildId, path)` (`:35-36`).
3. **A real GitHub App exists**, with webhooks (`Coverage/Recipients/GitHubEventsRecipient.cs`
   handling installation / installation_repositories / repository / push / pull_request), a
   persisted `Account.InstallationId`, and — decisively — an **App private key and App ID**
   (`Coverage/Program.cs:95,103`). Posting a check run is an addition to an existing integration,
   not a new subsystem.
4. **The uploader already sends full PR context**: `repository`, `commitSha`, `branch`,
   `pullRequestNumber`, `parentSha`, `runId`, `runAttempt`, `jobName`, `workflow`, `eventName`,
   `flags`, `rootDir`, `fileList` (`action/src/main.ts:45-58`), and correctly attaches to the PR
   **head** sha rather than the ephemeral merge commit (`action/src/context.ts:19-26`).

### And it is already designed

The service's roadmap contains **T2.1 — "PR feedback: patch coverage, then checks"** (cost L,
splittable, milestones M11.0–M11.6) and **T1.5 — per-repo config including thresholds** (cost M,
marked ⚠️ decision required). Both are more detailed than anything this workspace would have
specified, including verified traps. **This PRD therefore does not propose a design.** It records a
consumer's requirements against work that is already scoped, and the upstream issue is framed the
same way.

Two decisions are pending upstream and block the parts we care about
(`docs/roadmap-2026-08.md` §7): whether to reverse the PRD non-goal on repo config files (§7.1,
gates thresholds and `ignore`), and whether to grant the App `checks: write` + `pull requests:
read → write` (§7.2, gates the check-run half). Patch coverage itself needs **no** permission change.

## 2a. Resolution — what shipped, and what it retires

Upstream PR #10 landed all four asks from §8 plus the T0.3 hardening. Verified live: `GET
/api/uploads/status` returns `401` unauthenticated rather than falling through to the SPA.

**Q3 has a second, better answer.** The original was *"no status API exists, so the ratchet must be
a workflow step comparing against the master figure."* It is now: **`GET /api/uploads/status` is a
documented, versioned, token-metered contract**, and the ratchet is still a workflow step — but it
compares against a `baseline` the server computes, not one we assemble.

| §3 said | Now |
|---|---|
| Poll `/api/browse/.../commits/{sha}`, guessing terminal states | `wait-for-finalize: true` on the action; states documented and **closed** (`InFlight` / `Complete` / `CompleteWithErrors`) |
| `/history?branch=master` for the baseline | `baseline-*` outputs — no second call, and the polled commit is excluded server-side |
| `Pending` means "in flight, or dead, indistinguishably" | Fixed; a crashed parse reports `Failed` with a message |
| Guess a timeout | `1800s`, the server's own ceiling, so it cannot expire early |

**Three §3 decisions are now actively wrong**, and only one would have failed loudly:

1. **`/api/browse` is explicitly *not* a contract** — it is the web UI's internal API, and is being
   reshaped onto the generic query surface. §5's question is answered: build on `/api/uploads/*`.
2. **Browse is rate limited by client IP.** GitHub-hosted runners share egress addresses, so a gate
   there could be throttled by traffic that is not ours, on a bucket we cannot claim. This is the one
   that would have failed loudly — eventually, and confusingly. `/api/uploads/status` meters per
   *token*.
3. **Browse authorizes against a signed-in human's GitHub access** and returns the same `404` for
   "no build yet" as for "not allowed". It structurally cannot answer a poller's question. This would
   have produced a gate that *looked* like it worked.

The upstream ordering request from §3's blocker paragraph was honoured: N5 bounds the anonymous
surfaces, and shipped **with** N2 rather than before it, so the token-authenticated path existed
before the anonymous one was bounded.

**What did not change:** patch coverage still waits for M11.1 (§3's reasoning stands — a single
server-side implementation is the only way to match GitHub's diff), and `Commit.ParentSha` is no
longer a trap for us because #10 gave it one writer and one meaning and dropped the unclassifiable
values via the repo's first Spark migration. D2's "compare against the default branch, never
`ParentSha`" survives anyway, since that is what `baseline` does.

**What #10 did not and could not fix — see the plan's G2.** Our PR workflow measures `nx affected`
while master measures `nx run-many`, so the PR number is a subset and the baseline is the whole
workspace. `baseline` is per-repository-default-branch, not per-flag. That comparability problem is
ours, and it is now the only thing between us and a working ratchet.

## 3. What this workspace does in the meantime *(superseded — see §2a)*

**Decision: implement the M11 ratchet as a workflow step against the browse API, and treat the
upstream check run as a later replacement rather than a dependency.**

The browse API is anonymous for this public repo and returns everything a ratchet needs. **Use
`/history?branch=master&take=…`** — one call returning `(Sha, Timestamp, LinesCovered,
LinesCoverable, Percent)` per point — rather than composing `/repos/{o}/{n}` with `/commits/{sha}`.

**Patch coverage is computable client-side, and we are still not doing it.** *(Corrected 2026-08-17
— an earlier draft of this document, and the first version of the upstream issue, claimed the browse
API exposed no per-line data. It does: `/commits/{sha}/file?path=` returns
`lines[{number, hits, status}]` and `branches[{line, blockId, branchId, taken}]`, verified live.)*

So a workflow could read its own PR diff, point-load each changed file, and intersect. We decline
because doing it correctly means re-implementing every trap upstream has already enumerated in
T2.1: resolving the real merge base instead of an event-time base tip, the 300-file compare cap,
`0/0` reading as 100% on an uninstrumented new file, renames via `previous_filename`, and
re-resolving when the base advances. The result would be a number that disagrees with GitHub's own
*Files changed* tab in ways nobody could explain. **Possible is not the same as sensible** — patch
coverage waits for upstream M11.1 (see D6).

So the ratchet ships in two stages:

- **Stage 1 (now, ours):** project-level no-decrease check as a workflow step. Blocking only after a
  week of observation, per the parent plan's M11.
- **Stage 2 (later, theirs):** replace it with the `coverage/project` and `coverage/patch` check runs
  once M11.3 lands, and delete our workflow step.

### Blocker for stage 1, and the one thing we must ask for

**The upload is asynchronous and the action returns before parsing completes.** `/api/uploads`
responds `{buildId, sessionId}` and the action logs *"the build finalizes once parsing completes"*
(`action/src/main.ts:66-70,84`). The action's only outputs are `build-id` and `session-id` — **no
coverage figure and no verdict** (`:69-70`).

A workflow step therefore cannot read its own result. It must poll the browse API until the commit's
build finalizes, with no documented terminal-state contract to poll against — and this repo has
already been bitten by exactly that opacity: a first-ever upload sat at `parseStatus: "Pending"`
forever with `error: null`, and a separate defect means *any* fault also reports as `Pending`
(`ParseSessionRecipient.cs:95-102` saves `ParseStatus="Failed"` on the same faulted session, losing
the diagnosis).

That is the additive ask upstream: **action outputs and a documented terminal-state contract**, which
T2.1 does not cover because it solves the problem GitHub-side only.

## 4. Goals

- **G1** Answer Q3 in the parent PRD and unblock its M11. *(Done by §2.)*
- **G2** Ship a project-level ratchet that works against the service **as it exists today**.
- **G3** Ask upstream only for what is genuinely missing, and defer to the existing roadmap for
  everything it already specifies.
- **G4** Ensure the eventual upstream check run can replace our workflow step without a rewrite —
  same two check names, same semantics.

## 5. Non-goals

- **NG1** Not implementing patch coverage client-side — a *choice*, not a blocker. The data is
  available (`/commits/{sha}/file?path=`); the correctness surface is not worth owning. See D6.
- **NG2** Not proposing a design for check runs, patch coverage, thresholds or config. T2.1 and T1.5
  already specify these in more detail, with verified traps.
- **NG3** Not blocking merges on coverage until the ratchet has run non-blocking for a week
  (parent plan M11).
- **NG4** Not asking upstream to prioritise our needs over their Tier 0 work (backups, token expiry,
  bounding the front door). Our ask is Tier 2 and should stay there.

## 6. Decisions

- **D1 — Poll the browse API; do not wait on the upload response.** Parsing is asynchronous by
  design and the roadmap's own outbox architecture keeps it that way. A gate that assumed synchrony
  would be wrong even if the response carried a number.
- **D2 — Compare against `latestCoverage` on the default branch, not against a base commit.** The
  service cannot resolve a merge base today (§2), and `Commit.ParentSha` is unusable for this: the
  push webhook writes `evt.Before` (the previous ref tip) while the upload writes
  `pull_request.base.sha`, and because the upload uses `??=` while the webhook uses `=`, a later push
  **clobbers** a PR base with a ref tip. The service's roadmap flags this as a live field defect, not
  a gap. Do not build on that field.
- **D3 — Name our stage-1 check `coverage/project`,** matching the name T2.1 will publish, so the
  branch-protection rule survives the handover unchanged.
- **D4 — Guard the PR-side upload on `head.repo.full_name == github.repository`.** Fork PRs get
  neither a secret nor an OIDC token, so they cannot upload at all; without the guard the step fails
  noisily on every fork PR. *(Already carried in the parent plan's M2.)*
- **D6 — Decline patch coverage client-side even though the data is there.** The endpoint exists and
  is anonymous, so this is a deliberate scope decision. Owning it means owning merge-base resolution,
  the 300-file cap, the `0/0` trap and rename handling — and getting any of them subtly wrong
  produces a confidently wrong number in a merge gate, which is worse than no number. One
  server-side implementation that matches GitHub's own diff is the right shape; that is upstream
  M11.1. Revisit only if M11.1 is abandoned rather than merely delayed.

- **D5 — Treat a missing or `Pending` coverage result as "skip", never as "fail".** Until the
  terminal-state contract exists (§3), an unparseable result is indistinguishable from a service
  fault. Failing closed on that would block merges on an outage — the exact behaviour the parent
  PRD's R5 already flags.

## 7. Risks

- **R1 — Polling with no terminal-state contract can hang or pass spuriously.** Mitigated by D5 and
  a hard timeout; properly fixed only by the upstream ask.
- **R2 — The upstream roadmap may resequence.** T2.1's own §10 places patch coverage at step 8, after
  five Tier 0/1 items. Stage 1 must therefore be genuinely usable on its own, not a stopgap that
  assumes replacement within a quarter.
- **R3 — Our stage-1 step and a later check run could both gate, double-reporting.** D3 keeps the
  names aligned so one replaces the other; the removal is an explicit step, not an assumption.
- **R4 — Upstream may decline §7.1 (config files).** Thresholds still work as per-repo settings in
  that case; only a *blocking patch* check is lost. Our stage-1 project ratchet is unaffected.

## 8. What was asked upstream

Filed on MintPlayer/CodeCoverage as a consumer requirements statement, deliberately **not** a design
proposal. In priority order:

1. **Action outputs + a documented terminal-state contract** — the only genuinely additive ask, not
   covered by T2.1 (which solves the GitHub surface, not the workflow surface).
2. **A vote for T2.1/M11.1 (patch coverage, display-only)** as the highest-value next feature,
   noting it needs no permission change. *(Corrected in a follow-up comment: the first version
   argued M11.1 was **unblocking** because patch coverage was impossible client-side. It is not
   impossible — see §3 — so the corrected argument is that a single server-side implementation is
   the only way to get a number that matches GitHub's diff and is stable enough to cite in a check.
   Highest-value, not unblocking.)*
3. **A concrete data point for the §7.1 decision** — this workspace wants targets as repo settings
   and `ignore` versioned with the code, which is exactly the resolution the roadmap already
   proposes.
4. **A note on the `ParentSha` clobbering defect**, confirming it from a consumer's reading.

## 9. Open questions

- **Q1** Should stage 1 gate on branch coverage as well as lines? The parent PRD's D8 makes branch
  the review metric, and the browse API exposes `branchesCovered`/`branchesTotal` — so it is
  available. Deferred until the line ratchet has run non-blocking for a week.
- **Q2** Does the service intend `/api/browse` to remain a stable public contract? It is currently
  undocumented and anonymous for public repos. Building a gate on it makes us dependent on its
  shape; worth confirming upstream before stage 1 hardens.
- **Q3** Will there be a machine-callable read path once browse is hardened? `BrowseController` has
  neither `[Authorize]` nor `[EnableRateLimiting]` today (only the `uploads` and `badges` policies
  exist, `Coverage/Program.cs:170,181`), and the service's own roadmap T0.3 wants that fixed. Our
  gate polls anonymously from CI, which is precisely the automated traffic shape a rate limit is
  meant to catch — so the fix for the abuse case would break the legitimate one. Raised upstream on
  issue #9 (addendum comment, 2026-08-17) asking for a token-authenticated read path or a higher
  bucket. **If the answer is no, G4 must not be made required** — a gate that 429s is worse than no
  gate, per D5.
