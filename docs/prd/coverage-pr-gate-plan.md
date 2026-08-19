# Plan — a PR coverage gate for this workspace

PRD: [coverage-pr-gate.md](./coverage-pr-gate.md)
Parent: [test-coverage-plan.md](./test-coverage-plan.md) (this replaces its **M11**)
Status: **Redesigned twice on 2026-08-19, as upstream shipped underneath it.** G1 and G2 are done.
G3–G5 collapsed into a single configuration step, because upstream
[PR #12](https://github.com/MintPlayer/CodeCoverage/pull/12) delivered the `coverage/project` and
`coverage/patch` **check runs** — the thing G5 was waiting for. **There is no workflow-side gate to
build, and therefore none to delete later.**

| Milestone | Scope | Depends on |
|---|---|---|
| G1 | Upstream requirements issue on MintPlayer/CodeCoverage | — *(done 2026-08-17)* |
| G2 ✅ | Make the PR number comparable — `partial: true` + `base-sha` | upstream #12 |
| G3 | Configure the gate, non-blocking; accept the App permissions | G2 + owner action |
| G4 | Make it required in branch protection | a week of G3 observation |
| ~~G5~~ | ~~Hand over to upstream check runs~~ | **shipped upstream; nothing to do** |

## Ordering rationale

**Rewritten 2026-08-19.** The original G2 existed to learn, by observation, what an undocumented API
would do — how long finalize takes, which terminal states occur, whether `Pending` was ever
indistinguishable from a fault. Upstream PR #10 documented all of it and fixed the fault-reporting
bug, so **that milestone no longer has a question to answer** and collapses into G3.

What took its place is a blocker of our own making, which the upstream work exposed rather than
caused: our PR workflow measures `nx affected` while master measures `nx run-many`, so the PR number
and the baseline are not the same quantity. No amount of upstream contract fixes that.

G4 still follows a week of non-blocking G3 — the same non-blocking-first discipline the parent plan
applies, and for the same reason (parent R2).

G5 is deliberately last and explicitly conditional. Per PRD R2 the upstream roadmap places patch
coverage at step 8 of 10, after five Tier 0/1 items, so nothing here may assume it lands soon.

## Conventions

- **Pushes are billed and cancel in-flight runs.** These milestones each touch a workflow, which
  means each one *must* be exercised on CI to be verified at all — that makes this the one area
  where the batching rule cannot apply. Land G2 and G3 as **one** push; the observation milestone
  that would have justified splitting them is gone.
- **Never fail closed on a missing result** (PRD D5). A service outage must not block merges. But
  **do** fail on a *wrong* result — `CompleteWithErrors` is a real number that under-counts, which is
  not the same thing as no number.
- **A `429` is not a pass.** Back off and keep waiting. The action does this; any hand-written poll
  must too.
- **Name the check `coverage/project`** (PRD D3) so branch protection survives G5 unchanged.
- No new branch or PR without explicit permission.

---

## G1 — upstream requirements issue ✅ — **and it shipped**

Filed on MintPlayer/CodeCoverage 2026-08-17 as a consumer requirements statement against the
existing `docs/roadmap-2026-08.md` (T2.1, T1.5) rather than a competing design. Consolidated
2026-08-18 into a single handover comment. **Closed by
[PR #10](https://github.com/MintPlayer/CodeCoverage/pull/10), merged and deployed 2026-08-19** —
verified live: `GET /api/uploads/status` returns `401` unauthenticated rather than falling through
to the SPA.

All five asks landed, plus the T0.3 hardening, deliberately sequenced *after* the token-authenticated
path so a CI gate was never collateral damage from bounding the anonymous surface.

**This rewrote G2–G4 rather than unblocking them.** The plan below is the post-#10 design; what it
replaced is recorded in the next section, because the reasons are worth keeping.

### What #10 changed for us

| Was going to | Now |
|---|---|
| Poll `/api/browse/.../commits/{sha}` on a timer, printing `parseStatus` to learn the terminal states empirically | `wait-for-finalize: true` on the action. The states are **documented and closed** — `InFlight` / `Complete` / `CompleteWithErrors`, with a guarantee that future states collapse into the third. |
| Call `/history?branch=master` for the baseline | `baseline-*` outputs. **No second call**, and the server excludes the polled commit from its own baseline. |
| Hand-write a poll loop with a guessed 5-minute timeout | The action polls. The correct timeout is **1800s** — the server's own ceiling, so it cannot expire before the server has decided. |
| Treat `Pending` as possibly-dead (the fault-reporting bug) | Fixed upstream. A crashed parse reports `Failed` with a message. |

**G2's entire exit criterion — "learn how long finalize takes and which terminal states occur" — is
now answered by documentation.** Observation of an undocumented API was the *only* reason that
milestone existed, so it collapses into G3.

Two things in the new contract that we must not get wrong, both called out explicitly upstream:

- **A `429` must never count as a pass.** A gate that reads "I couldn't get an answer" as "the answer
  was fine" fails open exactly when the service is under load.
- **`0/0` is no data, not 100%.** `line-rate` is empty when there are no coverable lines, and the
  workflow must treat empty as skip, never as success.

### And `/api/browse` is now explicitly off-limits

The PRD's §5 question is answered: `/api/uploads/*` is the public contract; `/api/browse` and
`/spark` explicitly are not. Browse is now **rate limited by client IP**, and GitHub-hosted runners
share egress addresses — a gate built on it could be throttled by traffic that isn't ours, on a
bucket we cannot claim. `/api/uploads/status` is metered per *token*.

Browse also *structurally* cannot serve a gate: it authorizes against a signed-in human's GitHub
access, and returns the same `404` for "no build yet" as for "not allowed" — the one distinction a
poller needs.

**So the G2/G3 design as originally written would have been wrong on three counts**, and only one of
them (the rate limit) would have shown up as a failure. The other two would have produced a gate that
looked like it worked.

---

## G2 — make the PR number comparable ✅

**Done on this branch.** The PR upload now declares what it is:

```yaml
partial: true
base-sha: ${{ github.event.pull_request.base.sha }}
finish: true
```

`partial: true` is load-bearing: `nx affected` measures only the projects the diff touched, and
without the declaration the server reads a subset as a whole-workspace total — a PR touching one
small library reports a ~98% collapse. `base-sha` is the same value already passed to
`nx affected --base`; omitted, the server falls back to the newest covered default-branch commit,
discloses that it did (`baseResolution`), and compares against a commit the affected-computation
never diffed against.

`finish: true` replaces the old `finish: false`. That flag existed only to stop a partial number
finalizing under master's flag and reading as a collapse — a concern `partial: true` now handles
properly. Finishing closes the build immediately instead of waiting out the ~2-minute debounce, so
the check runs appear while the PR is still being looked at.

**Why the alternative was rejected**: switching the PR to `run-many` would also have made the number
comparable, and per SP4 would have cost almost nothing in wall-clock. It was rejected because this
repo is partly a reference for Nx + GitHub Actions configuration — see
[coverage-partial-upload.md](./coverage-partial-upload.md) §4.5, and the constraint is recorded
upstream so nobody re-proposes it.

## G3 — configure the gate, non-blocking [PRD D1, D2, D3]

**No workflow changes.** The service publishes the checks itself; this milestone is configuration.

1. ~~**Accept the GitHub App permission upgrade**~~ — ✅ **done, and the checks are confirmed
   posting.** `coverage/project` and `coverage/patch` both appear on the PR head from
   `CoverageProduction`, conclusion `neutral` (correct: no gate policy configured yet, and #12
   specifies missing policy ⇒ neutral, never red).

   **This took a full debugging session for a reason worth recording.** Permissions had been accepted
   all along; the production server was running **the development App's private key**, so every
   App-authenticated call failed with `A JSON web token could not be decoded`. Nothing else broke —
   webhooks authenticate with the webhook *secret*, uploads with `covt_`/OIDC — so the service looked
   entirely healthy. Diagnosis needed container logs because `Build.FeedbackState` is exposed by no
   API. See the Upstream follow-ups (U1, U2) in
   [test-coverage-plan.md](./test-coverage-plan.md).

   Verify a key without printing it: `openssl rsa -in key.pem -pubout -outform DER | openssl sha256
   -binary | openssl base64`, and compare to the fingerprint GitHub shows on the App's General page.
2. Set the gate in the repository's **Coverage gate** panel, or commit a `coverage.yml`:

   ```yaml
   gate:
     projectMode: auto        # ratchet against the base
     projectThreshold: 1      # allowed drop in percentage points
     projectBasis: scoped     # judge a partial build on what it measured
     patchTarget: 80
     patchThreshold: 5
     blocking: false          # observe first
   ```

   `projectBasis: scoped` over `projection` deliberately: the scoped number is a measurement, the
   projection is an inference with a completeness verdict attached. Start by gating on the thing we
   actually measured, and read the projection alongside it.

   `blocking: false` is the upstream default and matches this plan's non-blocking-first discipline —
   the checks post real numbers with a neutral conclusion.
3. A tolerance band rather than strict non-decrease: our denominator moves with `coverage.include`
   edits (parent plan M1), and line counts drift for reasons unrelated to test quality.
4. `coverage.yml` is read from the **base ref**, so a PR cannot rewrite the policy it is judged by.
   Worth knowing before wondering why an edit did not take effect on its own PR.

Run for **one week of real PRs** before G4. Read the false-positive rate; a ratchet that cries wolf
gets disabled, which is worse than not having one.

## G4 — make it required

1. Flip `blocking: true`.
2. Add `coverage/project` to branch protection on `master`. Add `coverage/patch` separately and
   later, once its number has been watched for a while — same discipline, one gate at a time.
3. **Verify the abstain path before requiring anything.** Upstream states a missing baseline or diff
   is *neutral, never red*, and SP3 measured that a master commit lacks coverage ~5% of the time
   (`cancel-in-progress` kills a superseded run before its upload). A required check that goes red on
   abstain would block merges for a reason having nothing to do with coverage.

A PR touching no source is never blocked, per the parent PRD's D2.

## G5 — ~~hand over to upstream check runs~~ — **shipped upstream, nothing to do**

This milestone existed to delete a workflow-side gate once upstream published check runs. Upstream
published them in [PR #12](https://github.com/MintPlayer/CodeCoverage/pull/12) **before** that gate
was ever built, so there is nothing to hand over and nothing to delete.

The `coverage/project` and `coverage/patch` names are fixed upstream, which was the property this
plan wanted from the start: branch protection configured at G4 survives unchanged.

Patch coverage (M11.1) also shipped in the same PR, so the parent PRD's decision to wait for it is
resolved. It classifies added lines from the build's own per-line data — no base coverage needed —
and **skips diff files the run did not measure rather than zeroing them**, which is exactly the
`nx affected` case and avoids `0/0` reading as 100%.
