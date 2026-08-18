# Plan — a PR coverage gate for this workspace

PRD: [coverage-pr-gate.md](./coverage-pr-gate.md)
Parent: [test-coverage-plan.md](./test-coverage-plan.md) (this replaces its **M11**)
Status: **Not started** (2026-08-17). No branch, no PR — awaiting permission.

| Milestone | Scope | Depends on |
|---|---|---|
| G1 | Upstream requirements issue on MintPlayer/CodeCoverage | — *(done 2026-08-17)* |
| G2 | Read the coverage figure in CI (non-gating, observational) | parent M2 |
| G3 | Project ratchet as a workflow step, non-blocking | G2 |
| G4 | Make it required | a week of G3 observation |
| G5 | Hand over to the upstream check runs, delete our step | upstream M11.3 |

## Ordering rationale

G2 before G3 is the whole point of the sequence: the polling behaviour is the risky part (PRD R1 —
asynchronous parse, no terminal-state contract), so it runs in observation mode first, printing what
it sees and failing nothing. Only once its timing and terminal states are understood in practice does
G3 turn it into a comparison, and only after a week of that does G4 make it required — the same
non-blocking-first discipline the parent plan applies, and for the same reason (parent R2).

G5 is deliberately last and explicitly conditional. Per PRD R2 the upstream roadmap places patch
coverage at step 8 of 10, after five Tier 0/1 items, so nothing here may assume it lands soon.

## Conventions

- **Pushes are billed and cancel in-flight runs.** These milestones each touch a workflow, which
  means each one *must* be exercised on CI to be verified at all — that makes this the one area
  where the batching rule cannot apply. Batch as far as possible: land G2 and G3 as one push if G2's
  first run is clean.
- **Never fail closed on a missing result** (PRD D5). A service outage must not block merges.
- **Name the check `coverage/project`** (PRD D3) so branch protection survives G5 unchanged.
- No new branch or PR without explicit permission.

---

## G1 — upstream requirements issue ✅

Filed on MintPlayer/CodeCoverage 2026-08-17 as a consumer requirements statement against the
existing `docs/roadmap-2026-08.md` (T2.1, T1.5) rather than a competing design. Content per PRD §8.

Nothing here blocks on it: G2–G4 are built entirely on the service as it exists today.

## G2 — read the figure in CI, gate nothing [PRD R1, D5]

File: `.github/workflows/pull-request.yml` (after the coverage upload added by the parent plan's M2).

1. Add a step that polls
   `https://coverage.mintplayer.com/api/browse/repos/MintPlayer/mintplayer-ng-bootstrap/commits/{head_sha}`
   until the build finalizes, with a hard timeout (start at 5 minutes) and a fixed poll interval.
2. Print, every poll: `parseStatus`, `filesCount`, `finalizeReason` and the coverage totals — these
   are the fields the terminal-state contract is missing, so the log is the observation.
3. Print the master baseline from
   `/api/browse/repos/MintPlayer/mintplayer-ng-bootstrap/history?branch=master&take=5` — one call
   returning `(Sha, Timestamp, LinesCovered, LinesCoverable, Percent)` per point, which is a cleaner
   basis than composing the repo and commit endpoints. **Compare nothing yet.**
4. `continue-on-error: true`, unconditionally. This step cannot fail the build in G2.
5. Guard on `head.repo.full_name == github.repository` (PRD D4).

Exit criterion: across a handful of real PRs, we know how long finalize takes, which terminal states
actually occur, and whether `Pending` is ever indistinguishable from a fault in practice (it is
expected to be — see PRD §3).

## G3 — the project ratchet, non-blocking [PRD D1, D2, D3]

1. Turn G2's step into a comparison: head commit's line coverage vs the latest `/history` point on
   the default branch. **Compare against the default-branch figure, never `Commit.ParentSha`** —
   that field is clobbered between two different meanings and the service's own roadmap flags it as
   a live defect (PRD D2). It is not returned by any browse endpoint anyway, so the workflow would
   have to supply a base sha from its own GitHub context regardless.
2. Allow a small tolerance band rather than requiring strict non-decrease; a denominator that moves
   with `coverage.include` edits (parent plan M1) should not read as a regression.
3. Emit the result as a step summary, and name it `coverage/project` (PRD D3).
4. Still `continue-on-error: true`. Skip — never fail — on a missing, `Pending` or timed-out result
   (PRD D5).

Run for **one week of real PRs** before G4. Read the false-positive rate; a ratchet that cries wolf
gets disabled, which is worse than not having one.

## G4 — make it required

1. Drop `continue-on-error`.
2. Add `coverage/project` to branch protection on `master`.
3. Keep the skip-don't-fail behaviour for missing results (PRD D5) — this is the property that makes
   the gate safe to require, and it must survive this milestone.

A PR touching no source is never blocked, per the parent PRD's D2.

## G5 — hand over to upstream check runs [conditional]

Only once upstream M11.3 ships and the App's `checks: write` permission has been accepted for the
MintPlayer org (until accepted, the feature is silently absent — roadmap T2.1/M11.0):

1. Confirm `coverage/project` appears as a real check run on a PR.
2. Delete our workflow step and its polling logic.
3. Add `coverage/patch` to branch protection once M11.1's patch number is trusted — separately, and
   non-blocking first, exactly as G3→G4 did.

If upstream resequences (PRD R2), G2–G4 stand on their own indefinitely. That is the design
intent, not a fallback.
