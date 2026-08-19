# Make the coverage denominator honest — then raise the number

Two things, in that order: **fix a measurement that was lying**, then raise what it measures. Along
the way, nine real defects fell out of writing tests for code nothing had tested.

Full record: [`docs/prd/test-coverage.md`](docs/prd/test-coverage.md) (PRD) and
[`docs/prd/test-coverage-plan.md`](docs/prd/test-coverage-plan.md) (M1–M15, each with what actually
happened). Commits get squashed away, so the reasoning lives there.

---

## Why this started: the number was wrong, and wrong in the flattering direction

**Vitest 4 removed `coverage.all`.** With `coverage.include` unset, a source file no test imports is
**absent from the report** rather than counted as 0%. So the workspace's headline number was computed
over "files somebody already tested" — the denominator excluded exactly the code most in need of
tests, and the metric got *better* the more untested code you added.

M1 set an explicit `include` on every project. The headline promptly fell from **73.4% to ~68%**,
which is the point: that drop is not a regression, it is the size of the lie. The 32 files of
`ribbon/` and the whole `mintplayer-qr-code` library were invisible before it.

A second, quieter case of the same bug: Vitest 4's `coverageConfigDefaults.exclude` no longer carries
`**/*.d.ts`, so ambient declaration files enter the denominator as 0% source. Caught by diffing the
emitted `SF:` list against disk, not by reading config.

## Where it ended up

| | before | after |
|---|---|---|
| Workspace lines | 73.4% *(over a false denominator)* | **76.23%** (19,423 / 25,478) |
| Files measured | 804 | **1,240** |
| `mintplayer-qr-code` | **0%** — 725 lines, invisible | **97.4%** |
| `ribbon/` | 32 files, no specs | 218 tests |
| `file-manager` | 56.7% | **84.1%** |
| dock element | 48.5% | **54.1%** — and exhausted, see below |
| Spec files added | | **63** |

The workspace still misses the PRD's 80% target. That is stated plainly in the docs rather than
rounded away, and §7d argues for **per-area expectations instead of one workspace number** — because
a uniform target applied to the dock would push someone into faking `getBoundingClientRect`, which is
the one thing the PRD's R3 forbids.

## Nine defects, found by writing the tests

Not incidental — this is the argument for the whole exercise. Five would have shipped to consumers.

| # | Where | Defect |
|---|---|---|
| 1 | `bsWordCount` | A newline or tab between two words counted as **one** word |
| 2 | `bsLinify` | Only the **first** CRLF normalized; later lines kept a trailing `\r` |
| 3 | `bsSlugify` | A non-Latin title slugified to the **empty string** |
| 4 | `mp-quick-access-toolbar` | Overwrote a consumer's `aria-label` before first paint |
| 5 | `mp-navbar` | `expanded` was a **silent no-op in React *and* Vue** — it closed the bar when asked to open it |
| 6 | Vue `BsScheduler` | Every Vue app shipped with the event editor **off**, against its documented default |
| 7 | `SplitterStateManager` | `getState()` spread shallowly; subscribers held the store's own array |
| 8 | `hex2rgba` | A CSS colour **name** passed the length checks, parsed as `NaN`, became transparent black |
| 9 | `BitMatrix` | `Array(n).map(() => false)` left the arrays **sparse**, so `xor` on an unwritten module turned it **on** |

\#5 and #6 are the ones worth pausing on: both were invisible in Angular and broken in the other two
frameworks, which is precisely the failure mode a multi-framework wrapper library should fear most.

\#9 is a genuine QR-encoder correctness bug. It surfaced only because ISO/IEC 18004 gave the tests an
authority independent of the implementation — where a specification exists, tests can *disagree* with
the code instead of restating it.

## Notable work

**`dock/src/core` extracted** (`refactor(dock)!`) — the layout algebra, path handling, sizing and
resize maths moved out of a 4,643-line element into pure modules, now at **99.55%**. The element
shrank by ~370 lines. This is the change that made the dock testable at all.

**The dock's ceiling is a finding, not a shortfall.** M14 added 54 behavioural tests and moved line
coverage 0.7 points. ~480 lines terminate in `getBoundingClientRect`, `elementsFromPoint` or pointer
capture, all of which jsdom reports as zero. They are **recorded as permanently uncovered**, method
by method, and covered by the four dock e2e specs against a real engine instead. Three further
regions are unreachable for non-geometry reasons — jsdom's missing `:scope`, `activeElement` through
nested shadow roots, one dead branch — each documented with why "fixing" it would be wrong.

**The React suite existed but could not run behaviourally.** `@lit/react` ships two builds, and its
`node` export condition compiles the property/event runtime away entirely; Vitest resolves deps
through the SSR pipeline and picks it even under `environment: 'jsdom'` (lit/lit#4446). One
`test.alias` pinning the browser build turned 79 failures into a working suite. The generalisable
lesson, recorded in the plan: **a limitation that applies to everything uniformly is more likely a
configuration fault than a platform fact** — a previous note in this repo had concluded the opposite
from the same symptom.

## CI and coverage reporting

- Coverage is uploaded from both workflows; the API is now measured too (`--collect:"XPlat Code Coverage"`).
- Demo apps run their tests but are **not** uploaded — their coverage is not a property of the
  published libraries, and counting them would let a demo page move the gated number.
- **PR uploads declare `partial: true` + `base-sha`.** PRs run `nx affected`, so they measure a
  subset; without the declaration the service reads a subset as a whole-workspace total and a PR
  touching one small library reports a ~98% collapse. This is new upstream capability
  ([CodeCoverage#11](https://github.com/MintPlayer/CodeCoverage/issues/11) →
  [PR #12](https://github.com/MintPlayer/CodeCoverage/pull/12)), filed and specified from this repo.

`nx affected` on PRs was deliberately **kept**, and the alternative — switching to `run-many`, which
measurement showed would cost almost nothing — was deliberately **rejected**: this repo is partly a
reference for Nx + GitHub Actions configuration, so weakening an Nx pattern to work around a
coverage-tool limitation would demonstrate the wrong thing. Recorded in
[`coverage-partial-upload.md`](docs/prd/coverage-partial-upload.md) §4.5.

## Versions

Minor bump across all 13 publishable packages. Inter-lib references are caret ranges, so no
peerDependency needed touching. Root `package.json` left at `0.0.0` — `private: true`, never
published.

## Not in this PR

- **The merge gate.** The service now publishes `coverage/project` and `coverage/patch` check runs
  itself, so there is no workflow step to write. Enabling it is configuration plus a **GitHub App
  permission upgrade that each installation must accept** — see
  [`coverage-pr-gate-plan.md`](docs/prd/coverage-pr-gate-plan.md) G3/G4. Deliberately separate: this
  branch makes the number honest; turning it into a merge blocker is a different change with a
  different risk profile.
- **Reaching 80%.** The remaining gap is enumerated per area rather than hidden.

## Verification

| | |
|---|---|
| Unit tests | `nx run-many --target=test --coverage` — **14 projects, green** (9m 44s) |
| API | `dotnet test` — **164 / 164 passed** |
| Library builds | `web-components`, `ng-bootstrap`, `react-bootstrap`, `vue-bootstrap` |
| API build | `dotnet build apps/api/Api.csproj` |

Per the repo convention, the suites were batched into one sweep at the end rather than run per
milestone; intermediate milestones were verified by reading and type-checking.

**One pre-existing diagnostic you will see, not introduced here.** The `vue-bootstrap` build logs
`BsAccordion.vue:39:24 - error TS2339: Property 'default' does not exist on type '{}'` during
declaration generation. `vite-plugin-dts` reports it without failing, the build exits 0, and the
emitted `BsAccordion.vue.d.ts` is complete and correct — props, emits and all. The cause is that the
component calls `useSlots()` without a `defineSlots<>()` declaration, so the slots type is `{}`; the
only consumer-visible effect is untyped slots on that one component. It dates from #392 and is
untouched by this branch. Worth fixing, separately.

## Review notes

- `refactor(dock)!` is marked breaking: `dock/src/core` is a new public surface and the element's
  internals moved.
- No test fakes geometry. Where a region needed rects, it is listed as uncovered instead — R3.
- Three spikes (SP1/SP3/SP4) were run against real data and are recorded with their limits, including
  one whose result argued against a decision that was taken anyway, and why.
