# Plan — a PR coverage gate for this workspace

PRD: [coverage-pr-gate.md](./coverage-pr-gate.md)
Parent: [test-coverage-plan.md](./test-coverage-plan.md) (this replaces its **M11**)
Status: **Redesigned 2026-08-19 after upstream shipped.** G1 done; G2 is now a blocker of our own
(the PR number is not comparable to the baseline) and needs a decision before G3 can be written.
No branch, no PR — awaiting permission.

| Milestone | Scope | Depends on |
|---|---|---|
| G1 | Upstream requirements issue on MintPlayer/CodeCoverage | — *(done 2026-08-17)* |
| G2 | ~~Read the figure in CI, observational~~ → **make the PR number comparable to the baseline** | a decision (below) |
| G3 | Project ratchet as a workflow step, non-blocking | G2 |
| G4 | Make it required | a week of G3 observation |
| G5 | Hand over to the upstream check runs, delete our step | upstream M11.3 |

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

## G2 — the blocker we have to resolve first: the PR number is not comparable

**This is the real work of the ratchet, and it is ours, not upstream's.**

`baseline-*` returns the latest finalized coverage on `master`. Our two workflows do not measure the
same thing:

| | Test command | Scope | Flag | `finish` |
|---|---|---|---|---|
| `publish-master.yml:63` | `nx run-many --target=test` | **whole workspace** | `unit` | `true` |
| `pull-request.yml:86` | `nx affected --target=test` | **only affected projects** | `pr` | `false` |

A PR touching one lib uploads that lib's coverage and nothing else. Compared against master's
whole-workspace baseline, **every PR reads as a catastrophic drop** — and the existing comment at
`pull-request.yml:97-100` already says exactly this, which is why the PR upload was given its own
flag and `finish: false` in the first place.

The service cannot fix this for us: `baseline` is per-repository-default-branch, not per-flag. Nor
should it — a partial number and a whole number are not comparable, whoever does the arithmetic.

**Options, and the trade is CI minutes against gate coverage:**

- **(a) PR runs the full suite** — switch `pull-request.yml` to `run-many --target=test`, matching
  master. The numbers become comparable and the gate is real. Costs the difference between affected
  and full unit tests on every PR. Precedent exists in the same file: the a11y gate is already
  `run-many`, "deliberately, NOT `affected`".
- **(b) Gate post-merge on master only** — no PR workflow change, zero added PR minutes, but it is an
  *alarm*, not a gate: it tells us coverage dropped after the drop has landed on `master`.
- **(c) Per-flag baselines** — would need upstream work. Not proposed; a partial number is a bad
  thing to ratchet on even with a matching baseline, because *which* projects are affected changes
  from PR to PR, so the denominator moves for reasons unrelated to test quality.

- **(d) Scope the baseline upstream** — have the service compare the partial upload against the base
  commit's coverage **restricted to the same file set**. Keeps `affected` on PRs at full value, needs
  no synthetic total and copies no documents. Written up in
  [coverage-partial-upload.md](./coverage-partial-upload.md) and filed as
  [CodeCoverage#11](https://github.com/MintPlayer/CodeCoverage/issues/11).

**Decision: (a). SP4 ran on 2026-08-19 and (d) is not worth building** — 20 of 22 merged PRs already
affect ≥99% of coverable lines, so switching `--target=test` to `run-many` costs approximately
nothing while making every PR comparable. Leave `nx affected` on e2e and every other target; that is
where its 5-10 minutes actually come from. Full results in
[coverage-partial-upload.md](./coverage-partial-upload.md) §4 and on
[CodeCoverage#11](https://github.com/MintPlayer/CodeCoverage/issues/11).

**SP3 also found something that applies to G3 as written:** a master commit has no coverage roughly
5% of the time, because `cancel-in-progress: true` kills a superseded run before its upload step. So
a null baseline is routine, not exceptional — G3's *skip, never fail* is load-bearing.

**The superseded reasoning:** a ratchet that reports after the merge (b) does not change the decision it exists to inform,
and (c) makes the number less trustworthy rather than more.

**A correction worth keeping:** an earlier reading here held that the affected set covers ~99% of
coverable lines, so (a) was nearly free. That was measured over *master merge commits*, which in this
repo are dominated by `web-components` work. The mean is the wrong statistic — the gate has to be
correct on a PR touching one small library, which is exactly the case where `affected` pays and the
naive comparison is most broken. SP4 in the linked document measures the real distribution, over PRs.

Exit criterion: the PR and master runs measure the same set of projects, verified by comparing the
`lines-coverable` of a PR run against master's for the same commit — they should match, not merely
be close.

## G3 — the project ratchet, non-blocking [PRD D1, D2, D3]

Depends on G2's answer. With (a), the whole milestone is action configuration plus one comparison
step — the polling, the baseline call and the terminal-state handling are all gone.

1. On the PR upload step: `wait-for-finalize: true`, `finish: true`, `id: coverage`. **`finish: true`
   is not optional** — without it the wait includes the server's ~2-minute debounce, which would
   dominate the whole job.
2. `fail-ci-if-error: true` on the upload, so `CompleteWithErrors` and a timeout fail the step rather
   than silently yielding an under-count. This is the one place we deliberately fail closed, because
   an under-count is a *wrong number*, not a missing one.
3. A comparison step guarded on `steps.coverage.outputs.baseline-line-rate != ''` — empty means first
   upload, where a ratchet must pass by definition. Empty `line-rate` (no coverable lines) likewise
   skips.
4. Tolerance band, not strict non-decrease. Line counts move by a line or two for reasons unrelated
   to test quality — and our own denominator moves with `coverage.include` edits (parent plan M1).
5. Emit to the step summary; name the check `coverage/project` (PRD D3).
6. Still `continue-on-error: true` on the *comparison*. Skip — never fail — on a missing result
   (PRD D5).
7. Keep the fork guard (`head.repo.full_name == github.repository`, PRD D4). Note OIDC is
   **unavailable to fork PRs** regardless, so this stays necessary.

Run for **one week of real PRs** before G4. Read the false-positive rate; a ratchet that cries wolf
gets disabled, which is worse than not having one.

## G4 — make it required

1. Drop `continue-on-error` from the comparison step.
2. Add `coverage/project` to branch protection on `master`.
3. Keep skip-don't-fail for a *missing* result (PRD D5) — this is the property that makes the gate
   safe to require, and it must survive this milestone. Note this is distinct from G3.2: a missing
   number skips, a wrong number fails.

A PR touching no source is never blocked, per the parent PRD's D2.

## G5 — hand over to upstream check runs [conditional]

Only once upstream M11.3 ships and the App's `checks: write` permission has been accepted for the
MintPlayer org (until accepted, the feature is silently absent — roadmap T2.1/M11.0):

1. Confirm `coverage/project` appears as a real check run on a PR.
2. Delete our comparison step and set `wait-for-finalize` back to `false` — once the server publishes
   the check itself, holding the job open buys nothing.
3. Add `coverage/patch` to branch protection once M11.1's patch number is trusted — separately, and
   non-blocking first, exactly as G3→G4 did.

The `coverage/project` name is fixed upstream, so branch protection survives this milestone
unchanged. If upstream resequences (PRD R2), G3–G4 stand on their own indefinitely. That is the
design intent, not a fallback.
