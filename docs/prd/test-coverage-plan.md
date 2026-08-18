# Plan — raising and defending test coverage

PRD: [test-coverage.md](./test-coverage.md)
Status: **M1–M10 and M12–M14 done** (2026-08-18) on `feat/coverage-honest-denominator`, not pushed.
Workspace total **74.98% lines** (was 71.02% at M12).
M11 lives in [coverage-pr-gate-plan.md](./coverage-pr-gate-plan.md). Nine defects found and fixed
(tables in M12 and M13). The suites are green and the measured figures are recorded per milestone —
the headline number **still misses the PRD's 80% target, at 74.98%**, and what remains is enumerated
in M14 and M15 rather than rounded away.

M15 closed the dock's last non-geometry regions; what is left there is enumerated as **permanently
uncovered**, not as future work.

| Milestone | Scope | Uncovered lines addressed |
|---|---|---|
| M1 ✅ | `coverage.include` everywhere + demo apps out of the metric | denominator correction (~0 new coverage) |
| M2 ✅ | PR-side coverage measurement (no gate yet) | — |
| M3 ✅ | `tools/` project + test target; codegen helper specs | 3,438 currently untargeted lines |
| M4 ✅ | `apps/api` coverage collection + `TzDateMath` + controllers | ~2,183 untracked today |
| M5 ✅ | Free wins: ng pipes/directives with zero specs | ~120 |
| M6 ✅ | Ribbon family — wc elements + ng wrappers | ~286 + 32 invisible files |
| M7 ✅ | React/Vue behavioural specs | ~4,725 lines, currently 20 mounted components |
| M8 ✅ | Dock: extract pure logic, then test it | ~1081 |
| M9 ✅ | file-manager, timeline, splitter, tile-manager | ~766 |
| M10 ✅ | scheduler + scheduler-core + datatable branch coverage | ~988 |
| M11 | Turn on the ratchet gate | defends everything above |
| M12 ✅ | Single verification sweep | — |
| M13 ✅ | `mintplayer-qr-code` — the largest untested library | 725 lines at 0% |
| M14 ✅ | Deepen the dock and file-manager elements | the two biggest partial files |
| M15 ✅ | Dock — the last non-geometry regions | 116 of 1,311 uncovered |

## Ordering rationale

M1 comes first and alone, because it is the milestone that makes the number *drop* (PRD R1) — it
must not be entangled with any test-writing work or the drop and the gain cancel out and neither is
legible. M2 follows immediately so that every later milestone's effect is visible on its own PR.

M3 (`tools/`) comes early for a reason out of proportion to its size: `escapeForTemplateLiteral`
sits under every generated file in the workspace, and a silent regression there corrupts the inputs
to every other milestone's tests. Guard the codegen before leaning on it.

M4 is independent of everything else (different toolchain, different CI step) and is sequenced
early so it can proceed in parallel if the work is split.

M5 before M6–M10 is a deliberate cheap-first ordering: ~120 lines of pure pipes, no TestBed, no web
component, and it establishes the spec conventions the later milestones copy.

M6–M10 are ordered by uncovered-line mass per PRD D4, with two exceptions. The ribbon (M6) precedes
the larger dock (M8) because M6 is mostly *new files appearing in the report* (F2 — 32 invisible
files) and therefore has an outsized effect on the honesty of the number, which is G1. And M7
(React/Vue) is sequenced before the deep Angular/WC work because it addresses G5 — the
cross-framework assumption that has already shipped a bug once — and because M1 will have just
expanded those two denominators from 161 lines to ~4,725, making their absence loudly visible.

M11 (the gate) lands only after the substantive milestones, per PRD R2 — a gate turned on early
blocks unrelated PRs for no benefit. M12 is the single batched suite sweep at the very end.

## Conventions (these bite here specifically)

- **Batch the suites.** Verify milestones by reading + `tsc --noEmit`. One full sweep at M10.
  Do not run `nx test mintplayer-ng-bootstrap` (~2.5 min) per milestone.
- **Commit per milestone, push once.** Every push is billed and cancels any in-flight run.
- **In a wrapper spec, drive inputs from a `signal()`, never a mutable field.** A plain-field write
  notifies nothing, `detectChanges()` does not re-evaluate the binding, and the spec fails looking
  like a component bug.
- **Nx on Windows:** `NX_ISOLATE_PLUGINS=false NX_DAEMON=false`, vitest `--pool=threads`.
- **Never fake `getBoundingClientRect` to manufacture coverage** (PRD R3). If jsdom cannot reach it,
  extract it (D5) or leave it.
- **`should create` specs are not the goal** (NG1/D8) — read the branch delta, not the line delta.
- No new branch or PR without explicit permission.

---

## M1 — every valid file in the report [PRD D1, D3, F1]

Files: `libs/mintplayer-web-components/vite.config.mts:76`,
`libs/mintplayer-ng-bootstrap/vitest.config.ts:18`,
`libs/mintplayer-react-bootstrap/vite.config.mts:34`,
`libs/mintplayer-vue-bootstrap/vite.config.mts:43`, plus the micro-lib configs
(`mintplayer-dijkstra`, `mintplayer-encode-utf8`, `mintplayer-ng-animations`,
`mintplayer-ng-click-outside`, `mintplayer-ng-focus-on-load`, `mintplayer-ng-qr-code`,
`mintplayer-pagination`, `mintplayer-qr-code`) and `.github/workflows/publish-master.yml:63,71`.

1. Add `coverage.include` to every project with a `test` target. Web-components additionally
   excludes `**/*.styles.ts`, `**/*.element.template.ts`, `**/*.generated.ts` and
   `phone-core/src/metadata/**`. Several micro-libs have no `coverage` block at all — add one.
2. Drop `apps/*-demo` from the coverage upload globs (D3), leaving their `test` targets intact —
   they still run, they just stop counting toward the library metric.
3. Record the corrected baseline in the PR body: expected ≈68% lines against a denominator that
   grows by ~1,800 executable lines (F1) and shrinks by the 1,037 demo lines (D3).

Verify: `nx run-many --target=test --coverage` locally on two libs only, then read the emitted
`lcov.info` file lists — confirm the 62 F1 files now appear, and that no `*.styles.ts` or
`phone-core/src/metadata/*` file does. This is a config milestone, so a targeted local run is
justified here rather than deferred to M10.

**This milestone ships alone.** It changes no test and adds no coverage.

### What M1 actually found (2026-08-18)

Two corrections to the assumptions above, both discovered while applying it:

- **Every micro-lib already had a `coverage` block** — none was missing, they were all just missing
  `include`. The edit was uniform across all twelve configs.
- **Vitest 4's `coverageConfigDefaults.exclude` no longer carries `**/*.d.ts`.** With `coverage.all`
  gone, an explicit `include` is the only file selector, and ambient declaration files land in the
  denominator as 0%-covered source. Two of them (`dock/src/components/mint-dock-manager.element.d.ts`,
  `flags/src/raw-svg.d.ts`) appeared in the first web-components run and were caught only by diffing
  the emitted `SF:` list against disk. Every `exclude` here therefore names `'**/*.d.ts'` explicitly.

Verified by single-spec coverage runs per lib, reading the emitted `SF:` lists:

| Lib | Files now in the report | Leaks (generated/spec/d.ts/setup) |
|---|---|---|
| web-components | 357 | 0 |
| ng-bootstrap | 507 | 0 |
| react-bootstrap | 129 | 0 |
| vue-bootstrap | 130 (incl. **55 `.vue` SFCs**) | 0 |
| dijkstra | 8 — from a suite with **no spec files at all** | 0 |

`mintplayer-dijkstra` is the clearest demonstration of F1: it has zero tests, so its lcov was
previously empty and it contributed nothing to the headline number in either direction. It now
contributes 8 files at 0%.

## M2 — measure coverage on pull requests [PRD F3, D7, R5]

File: `.github/workflows/pull-request.yml:84`.

1. Add `--coverage` to the existing `nx affected --target=test` step.
2. Add an upload step using `MintPlayer/CodeCoverage/action@master` with a flag distinct from
   master's `unit`, **`finish: false`**, and **`fail-ci-if-error: false`** (R5).
3. Guard the step on `github.event.pull_request.head.repo.full_name == github.repository` — fork
   PRs get neither secrets nor an OIDC token (D7).

No gate yet. This milestone only makes the number visible to reviewers.

Applied 2026-08-18 with one addition the plan missed: **`--exclude=api` is needed on the PR run
too.** `nx affected` will pick up the API project whenever its files change, and `nx:run-commands`
forwards `--coverage` verbatim to `dotnet test`, which rejects it — so adding `--coverage` without
the exclusion turns any API-touching PR red. Master already carried the exclusion for the same
reason; the PR workflow did not need it until now. The separate `Test API (xUnit)` step still runs.

## M3 — a test target for `tools/` [PRD F9, D9]

3,438 lines with no project and no `test` target. This milestone creates the target and specs the
pure helpers — small in line count, but it guards the codegen every other milestone depends on.

1. Add a `tools` project with a vitest `test` target (and `coverage.include` per D1).
2. Spec `escapeForTemplateLiteral` (`tools/scripts/build-web-components.mjs:78-83`) **first**. The
   three replaces are order-dependent; assert each escape in isolation *and* in combination —
   a string containing a backslash, a backtick and a `${` together is the case that catches a
   reordering. This is the rule CLAUDE.md warns about and nothing currently tests it.
3. Spec `discoverEntries` / `generateSubpathExports` (`tools/vite/multi-entry.mts:25,76`),
   including the `charts/` namespaced-recursion case that was a known bugfix. These drive the
   web-components, React and Vue builds.
4. Convert the three existing hand-rolled assert scripts to specs:
   `dev-processes.check.mjs` (186 — already a PASS/FAIL harness over `lib/dev-processes.mjs`),
   `check-code-snippet-hljs-lazy.mjs` (102), `check-ribbon-bundle-size.mjs` (72). Near-free, and it
   turns three manual rituals into CI guarantees.
5. Spec the remaining pure helpers: `toCamelCase`, `buildElementTemplateModule`,
   `buildStylesModule`, `writeIfChanged`, and the loader-map output shapes from
   `build-hljs-loaders.mjs` / `build-flag-loaders.mjs`.

Out of scope: `tools/lit-ssr-utils/gen-*-chrome.mjs` (import the built `dist`, not unit-testable
without a build) and `tools/e2e-shared/` (test code, not subject).

### What M3 actually did (2026-08-18)

**124 tests across 5 spec files, ~1.8s.** Three deviations from the plan, all forced by the code:

- **The pure logic had to be extracted before it could be tested.** `build-web-components.mjs`
  validates argv and calls `process.exit(1)` at module scope, so importing it from a spec kills the
  runner. Its helpers now live in `tools/scripts/lib/wc-codegen.mjs`, and the two loader-map
  emitters in `tools/scripts/lib/loader-maps.mjs`. Both extractions were verified
  behaviour-preserving by re-running the generators: 49 codegen inputs and both loader maps
  regenerate **byte-identically** (`skipped` on every output).
- **Only one of the three check scripts converts to a spec.** `dev-processes.check.mjs` was already
  a fixture-driven PASS/FAIL harness over pure functions — it is now `dev-processes.spec.ts` (17
  tests) and the script is deleted. The other two read `dist/`, so they are build-artifact gates, not
  unit tests; converting them would produce specs that skip themselves whenever `dist/` is absent,
  which is most of the time. Instead their *judgement* moved into `tools/scripts/lib/bundle-audit.mjs`
  (`auditHljsImports`, `parseMaxBytes`) and is specced there, leaving each CLI as find-file →
  read → report.
- **`@nx/vitest:test` requires a `tsconfig.json` in the project root.** `tools/` had only
  `tsconfig.tools.json`, which nothing referenced; the executor fails with ENOENT before vitest runs.

**One real bug found and fixed while specifying it:** `check-ribbon-bundle-size.mjs` computed its
budget as `Number(args[maxIdx + 1])`, so `--max` with a typo, a negative number, or no value at all
produced `NaN` — and `size > NaN` is `false`, meaning the budget silently passed everything.
`parseMaxBytes` now falls back to the default instead, with a case per input shape.

Coverage output is `coverage/tools/lcov.info`, added to the upload globs in both workflows.

## M4 — `apps/api` coverage [PRD F5, D6]

Files: `.github/workflows/publish-master.yml:197`, `apps/api/Tests/`.

1. Add `--collect:"XPlat Code Coverage"` to the existing `dotnet test` step; glob the Cobertura
   output into the upload's `files:` list — note `disable-search: true` means an output written
   anywhere else is silently ignored. Leave `--exclude=api` on the Nx sweep; that workaround is
   load-bearing (VSTest rejects a forwarded `--coverage`).
2. **`TzDateMath.cs` (119 lines) first** — the highest-value untested unit in the repo. 15 relative
   -date operators dispatched from `QueryBuilderWalker.cs:97-110` with ~1 existing test. Pure and
   parameterised on `(now, tz)`, so table-drive it: each operator × a DST-transition zone × a
   year/month/week boundary. No fixtures, no database.
3. **Controller integration tests** — `Microsoft.AspNetCore.Mvc.Testing` and
   `Microsoft.EntityFrameworkCore.InMemory` are already referenced by `Api.Tests.csproj` and used by
   nothing. A `WebApplicationFactory` suite over `Orders` (71), `TreeItems` (124), `LineItems` (64)
   and `Customers` (64) needs zero new dependencies, and is the only thing that would prove the
   walker's expressions translate under EF rather than LINQ-to-Objects (today all 50 facts run
   against `List<Order>`).
4. Then `EntitySchema.cs` (103) and `OperatorCatalog.cs` (89) — the latter is never named by a test.

Target ≥60%. `Program.cs`, `DemoSeed.cs` and the `Models/` POCOs are explicitly not worth chasing.

### What M4 achieved (2026-08-18)

**50 tests → 164, and the API's 1,503 measurable lines went from absent to 92.1% lines / 53.7%
branches** (Cobertura, local Debug run). Target was ≥60%; the integration tests overshoot it because
booting the app covers `Program.cs`, the migrations and `DemoSeed` as a side effect of testing the
controllers.

- **`TzDateMathTests`** — 81 tests. Table-driven over `(now, tz)` across six zones, including
  `Pacific/Kiritimati` (UTC+14) and `Pacific/Niue` (UTC-11) so "the local date is not the UTC date"
  is exercised in both directions, plus Brussels DST days asserted at 23h and 25h. Invariants run
  per zone: every range ordered and non-empty, today inside this week, and adjacent
  weeks/months/years abutting exactly (a gap loses rows, an overlap double-counts them).
- **`ControllerTests`** — 33 tests through `WebApplicationFactory` over all four controllers.

**The plan's step 3 named the wrong tool.** `Microsoft.EntityFrameworkCore.InMemory` was referenced
by nothing, and using it would have defeated the purpose: InMemory evaluates LINQ in process, so it
passes every expression the walker can build — including ones no relational provider can translate,
which is the exact failure these tests exist to catch. `ApiFactory` overrides the connection string
to a throwaway **SQLite file** instead (a file, not `:memory:`, because the app opens and closes
several connections and an in-memory SQLite database dies with the connection that created it). The
InMemory package reference is replaced by `coverlet.collector`.

**Two things the API's own rules forced, both found by a red test:**

- `Validator` requires every node `id` to be a **UUID v4**; `"root"`/`"c1"` are rejected with
  `INVALID_NODE_ID` before field validation runs. One test was passing for the wrong reason until
  the ids were made real.
- Enum fields take `equals`, not `eq` (`OperatorCatalog.cs:59`).

**Workflow ordering had to change.** The coverage upload is what finalizes the build, and it ran
*before* the API test step in both workflows — so a Cobertura report globbed there would never have
existed. The .NET steps now run ahead of the upload in `publish-master.yml`, and the upload moved
after the API test in `pull-request.yml`. `--exclude=api` stays on the Nx sweep as the plan says.

## M5 — the free wins [PRD F10]

~120 source lines, seven Angular entrypoints with zero specs and no TestBed requirement:
`slugify` (17), `linify` (17), `split-string` (13), `word-count` (20), `has-property` (10),
`has-id` (3), `viewport` (40).

Pure pipes and directives — call the transform, assert the output, including the edge cases
(empty string, null, unicode). These establish the spec conventions M5–M8 copy.

### What M5 found (2026-08-18)

**66 tests across 6 spec files.** Six of the seven entrypoints; `has-id` is a bare `interface`
with no executable line, so there is nothing to test and nothing to cover — it is correctly absent
from the report rather than a gap in it.

Three behaviours were not what the name promises. All three were pinned as defects first and then
**fixed on request** — see [Defects found and fixed](#defects-found-and-fixed) below.

- **`bsWordCount` counts a single newline or tab between two words as ONE word.** It collapses
  `s{2,}` to a space and then splits on a literal `' '`, so `'hello
big	world'` is 1 and
  `'hello 
 world'` is 2. Two or more whitespace characters happen to work, which is exactly what
  makes it hard to notice. Genuine defect.
- **`bsLinify` normalizes only the FIRST CRLF** — `.replace('
', '
')` has no `/g` flag, so
  every later line of Windows-authored text keeps a trailing `
`.
- **`bsSlugify` drops any script without a Latin decomposition** (its character class is ASCII
  `w`), so a non-Latin title slugifies to the empty string.

The viewport directive needed an `IntersectionObserver` stub — jsdom has none — which is the right
shape anyway: what is worth asserting is the contract with the observer (observes its own element,
forwards every entry, disconnects on destroy, never constructs one on the server), and none of that
needs a real intersection engine.

## M6 — the ribbon family [PRD F2, Q2]

The largest *invisible* surface: 32 executable files absent from the report (14 web-component,
18 Angular), plus `mp-ribbon.element.ts` at 54.8% (241 uncovered) and `mp-ribbon-tab.element.ts` at
61.7% (36 uncovered). Current ratio: 4,169 source lines against 638 spec lines for 19 elements.

1. Web-component item family: `mp-ribbon-split-button` (219), `mp-quick-access-toolbar` (171),
   `mp-ribbon-dropdown-button` (162), `mp-ribbon-menu-item` (119), `mp-ribbon-group-button` (105),
   `mp-ribbon-toggle-button` (97), `mp-ribbon-color-picker` (95), `mp-ribbon-gallery-item` (91),
   `mp-ribbon-combobox` (79), `mp-ribbon-checkbox` (76). Render, attribute reflection, event
   emission, disabled state, and the ARIA role/name/state assertions the repo requires.
2. Angular wrappers (18 files): input passthrough, output bridging, host attribute forwarding.
3. `mp-ribbon.element.ts` branch coverage — the 241 uncovered lines are mode/overflow branches.

**Q2 resolved: no.** It stays in this branch. Splitting would put the denominator correction (M1,
which makes the number *drop*) and the largest single fill in separate PRs whose numbers only make
sense read together — and the reviewability that a split buys is lost to the squash-merge anyway.
The per-milestone commits are where the review structure lives.

### What M6 delivered (2026-08-18)

**218 tests across 5 new spec files**, over 32 files that had no spec and were therefore *absent*
from the report rather than at 0%:

| Spec | Tests | Subject |
|---|---|---|
| `items/ribbon-items.element.spec.ts` | 73 | the eleven simple item elements |
| `items/ribbon-menus.element.spec.ts` | 25 | split-button + dropdown-button (overlay, ARIA state) |
| `mp-quick-access-toolbar.element.spec.ts` | 25 | APG toolbar keyboard pattern, RTL, wrapper drilling |
| `mp-ribbon.modes.spec.ts` | 42 | layout/theming/minimize/active-tab + reflow guards |
| `ribbon/src/lib/components/ribbon-wrappers.spec.ts` | 53 | all eighteen Angular wrappers |

**Step 3 was scoped down deliberately, and this is a judgement worth recording.** The 241 uncovered
lines in `mp-ribbon.element.ts` are mostly the overflow algorithm, which reads `offsetWidth` and
`clientWidth` — jsdom reports 0 for both. Faking those to reach the branches would manufacture
coverage over an algorithm whose entire subject is real geometry, and the green would mean nothing
(PRD R3, applied beyond `getBoundingClientRect`). Its **guard clauses** are reachable without layout
and are covered here; the measuring path stays with the Playwright suites, where it is already
exercised against a real engine.

**A second a11y defect found, and fixed** (see [Defects found and fixed](#defects-found-and-fixed)):
`mp-quick-access-toolbar` **overwrote a consumer-supplied `aria-label`.**
`connectedCallback` guards it with `if (!this.hasAttribute('aria-label'))`, but `updated()` then
writes it unconditionally whenever `label` is in the changed set — and a Lit property with a
class-field default IS in that set on the very first update. So the guard is dead code and a
consumer's own, typically localized, label is replaced with "Quick Access Toolbar" before the first
paint. `mp-ribbon` already got this right via `applyRegionLabel` + `lastAppliedRegionLabel`; the
toolbar now uses the same shape.

**One jsdom limit worth knowing:** it does not forward focus through a shadow root's
`delegatesFocus`, and the QAT sets no tabindex of its own (the roving index is `mp-ribbon-group`'s
job). `document.activeElement` therefore stays on `<body>` however correct the component is. The
toolbar specs assert **which item was asked to take focus** instead, which is the actual behaviour
under test and holds in every engine.

## Defects found and fixed

Writing a test for code nobody had tested found **seven** real bugs. Each was first pinned as a
test asserting the wrong-but-actual behaviour, then fixed, and the test turned into a regression
guard. Breaking changes are acceptable here per the workspace's standing rule — the cleanest
behaviour wins and the break is documented.

| # | Where | Was | Now |
|---|---|---|---|
| 1 | `bsWordCount` (M5) | A single newline or tab between two words counted as **one** word | Splits on `/s+/`; any whitespace run separates words |
| 2 | `bsLinify` (M5) | Only the **first** CRLF normalized — later lines kept a trailing `
` | `/
/g` |
| 3 | `bsSlugify` (M5) | A non-Latin title slugified to the **empty string** | Keeps `p{L}p{N}`; Latin diacritics still stripped |
| 4 | `mp-quick-access-toolbar` (M6) | Overwrote a consumer-supplied `aria-label` before first paint | `applyLabel()` + `lastAppliedLabel`, mirroring `mp-ribbon` |
| 5 | `mp-navbar` (M7) | `expanded` was a **silent no-op in React AND Vue** — it closed the bar when asked to open it | The setter takes `''` as ON, holds a pre-first-render value, and no longer announces a programmatic write |
| 6 | Vue `BsScheduler` (M7) | Every Vue app shipped with the built-in event editor **off**, against its documented default | `withDefaults(..., { eventEditor: undefined })` suppresses Vue's absent-Boolean cast |
| 7 | `SplitterStateManager` (M9) | `getState()` spread shallowly, so a subscriber held the store's own `panelSizes` array | The getter copies the arrays too, matching what every setter already did |

Notes on each:

1. **`bsWordCount`** collapsed only runs of *two or more* whitespace characters and then split on a
   literal `' '`, so `'hello
big	world'` was 1 and `'hello 
 world'` was 2. Two or more
   whitespace characters happened to work, which is exactly what made it hard to notice.
2. **`bsLinify`**'s `.replace('
', '
')` had no `/g` flag. Windows-authored text came back
   with a stray `
` on every line after the first, riding along into whatever the consumer
   rendered or compared.
3. **`bsSlugify`**'s `[^w-]+` is ASCII, so every character of a script with no Latin
   decomposition was removed. A Japanese or Cyrillic title produced `''` — a route segment that
   cannot work, not merely one that looks unfamiliar. **This changes emitted slugs for non-Latin
   input** (from empty to the script itself); Latin slugs, including accented ones, are unchanged.
4. **`mp-quick-access-toolbar`** guarded the consumer's label in `connectedCallback`, but
   `updated()` then wrote it unconditionally whenever `label` was in the changed set — and a Lit
   property with a class-field default **is** in that set on the very first update. The guard was
   dead code and a localized label was replaced with the English default before first paint.

5. **`mp-navbar`'s `expanded`** is the one that justifies M7 on its own. Both wrappers lower a
   `true` to the attribute *shape* `''` — correct, because the DSD chrome and the no-JS CSS select
   on attributes — but the element defines an `expanded` **accessor**, and both React and Vue route
   any name they find on an element's prototype through the property instead. `''` is falsy in
   JavaScript, so the setter called `toggle('')` and closed the bar. Angular was unaffected because
   it binds `[attr.expanded]`, which is exactly why nothing caught it: **two frameworks of three
   were broken and the one that worked was the one with the tests.** That is PRD G5 in one bug.
6. **Vue's `eventEditor`** is the same class of trap from the other side. Vue casts an ABSENT
   declared Boolean prop to `false`, not `undefined`, so the wrapper's careful "only write it when
   the consumer said something" test was true on every single mount. Invisible in practice: an app
   that ships its own editor looks identical either way, and one that expected the built-in editor
   just quietly did not have it.
7. **`SplitterStateManager.getState()`** copied the envelope and not the arrays inside it, while
   every setter copied on the way in. The asymmetry is the bug — a subscriber that sorted the
   `panelSizes` it was handed reordered the live panels, with no notification to anyone.

The general lesson, worth keeping: **five of the seven were invisible because a nearby shape
worked.** Whitespace counting worked at two spaces, CRLF worked on line one, the label guard worked
until the first update, `expanded` worked in Angular, the editor default worked for anyone who set
it explicitly. Tests that only exercise the happy shape would have passed on all of them.

## Does Playwright contribute to coverage? No.

Asked during M6, and the answer is [PRD F7](./test-coverage.md#f7--e2e-contributes-nothing-to-the-metric-and-is-wildly-asymmetric-across-frameworks)
— recorded here because it shapes several decisions in this plan:

- Coverage comes from the `test` target (vitest → lcov). E2E lives on a separate `e2e` target,
  emits no lcov, and Playwright coverage instrumentation is configured nowhere.
- So `ng-bootstrap-demo-e2e`'s 47 specs / ~5,900 lines prove behaviour but move **no number** —
  and the React and Vue suites (11 specs each, mostly 4–10 line re-exports of
  `tools/e2e-shared/*-suites.ts`) leave those frameworks unproven *and* unmeasured.
- Two consequences already applied: **NG2** (don't rewrite e2e as unit tests) and M6's decision to
  cover `mp-ribbon`'s overflow *guards* but not its measuring path — that path is already exercised
  by Playwright against a real engine, and faking `offsetWidth` in jsdom would add a number without
  adding a guarantee.

Wiring V8 coverage through Playwright (collect per browser, merge, convert to lcov) is a real
option and would fold that ~6,500 lines of proven behaviour into the metric. It is **not in this
plan**: it is a new subsystem with its own flakiness surface, and it would change what the headline
number means mid-programme — the same reason M1 ships alone. Worth its own PRD once the ratchet is
running.

## M7 — React and Vue behavioural specs [PRD F6, G5, D10]

Currently one spec per lib. React mounts 15 wrappers and asserts one attribute each; Vue mounts 5.
After M1 these two denominators go from 66 and 95 coverable lines to ~2,065 and ~2,660.

1. **Preserve and mirror the broad static guard.** Vue's spec asserts every `inheritAttrs: false`
   SFC also contains `v-bind="$attrs"`, sweeping all 55 files. Keep it. Add the missing
   `typecheck-a11y` target to the Vue project so it matches React's compile-time half.
2. **Behavioural specs for the 10 largest wrappers in each lib.** React: `BsRibbon` (182),
   `BsTimeline` (152), `BsAccordion` (135), `BsCarousel` (93), `BsShell` (76), `BsDropdownMenu` (75),
   `BsNavbar` (73), `BsNavbarItem` (56), `BsScheduler` (48), `BsDatatable` (46). Vue:
   `BsTreeSelect` (175), `BsTimeline` (153), `BsDatatable` (151), `BsCarousel` (90), `BsScheduler`
   (89), `BsHierarchyChart` (75), `BsTreeview` (74), `BsQueryBuilder` (73), `BsShell` (71),
   `BsNavbar` (68).
3. Assert the things that justify hand-writing these wrappers, which nothing currently tests:
   prop→attribute mapping; controlled `value` + `onChange` round-trip (React); `defineModel`
   v-model round-trip (Vue); object/function props assigned via the element ref
   (`onMounted`/`watch`); named scoped slots.
4. Known constraint, already documented in React's spec header: jsdom cannot observe `@lit/react`'s
   element-property path, so `role`/`id`/`tabIndex` passthrough is not assertable there — that
   half stays in `attribute-passthrough.types.tsx` and the e2e axe suites. Do not fake it.

Per D10 the exit criterion is a count of components with real behavioural specs, not a percentage.

### What M7 actually found (2026-08-18)

291 tests. The two libraries had one spec each and asserted one attribute per component.

**The enabling discovery: `@lit/react` ships two builds, and Vitest was resolving the wrong one.**
Its `node` export condition compiles the property/event runtime away entirely — that build exists
for `@lit-labs/ssr-react`, which sets element properties on the server instead. Vitest resolves
dependencies through the SSR pipeline, so it picked the node build even under `environment: 'jsdom'`,
and **no React wrapper received a property or fired an event, uniformly**. That uniformity is why it
had been recorded in `attribute-passthrough.spec.tsx` as a jsdom limitation, complete with a browser
spike that "confirmed" it (lit/lit#4446). It is not: `vite.config.mts` now pins the browser build
for tests, all 156 React tests run, and the existing passthrough guard was strengthened to assert
`role` / `id` / `tabIndex` at RUNTIME instead of only at the type level.

The lesson is worth more than the tests: **a limitation that applies to everything uniformly is
more likely to be a configuration fault than a platform fact.** The spike measured a real
difference (Chromium worked, jsdom did not) and drew the wrong conclusion from it, because both
observations are equally consistent with "the test runner resolves a different build".

Three defects, two of them the cross-framework asymmetry PRD G5 exists to catch — see the table
above. Also added: a `typecheck` target on the Vue project. It is deliberately **not** named
`typecheck-a11y` like React's: React's props types can *reject* `role`/`id`/`tabIndex`, so a
type-test that writes them is a real assertion, while Vue accepts any undeclared attribute as a
fallthrough attr and the same test would compile against literally any component. What `vue-tsc`
does buy is the SFC templates themselves — prop names, emit signatures and slot scopes, which
nothing checked, because vitest transpiles without type-checking.

## M8 — dock: extract, then test [PRD D5, R3]

`mint-dock-manager.element.ts` — **2,092 coverable lines in one file, 48.3%, 1,081 uncovered.**
The single largest lever in the workspace (9.5% of the whole denominator).

The uncovered mass is layout maths, hit-testing, drag state and tree normalisation, reachable today
only by driving the element in jsdom where geometry is all zeroes. Per D5, extract it:

1. Identify the pure functions inside the element — layout normalisation, split/merge tree ops,
   drop-zone hit-testing, bounds arithmetic. `libs/mintplayer-web-components/charts/core` is the
   in-repo precedent (44 pure-maths specs, zero dependencies, consuming element at 82–86%).
2. Move them to a `dock/src/core/` module taking plain geometry as arguments.
3. Spec the extracted module exhaustively — this is where the 1,081 lines are recovered.
4. Leave the element itself thin; its remaining uncovered lines are genuine DOM/pointer paths
   already exercised by the four dock e2e specs (`dock.spec.ts`, `dock-bounds.spec.ts`,
   `dock-intersections.spec.ts`, `dock-keyboard.spec.ts`).

This is a refactor, not only a test milestone. It is sequenced after M5 because it is the riskiest
change in the plan and benefits from the conventions settled earlier.

### What M8 delivered (2026-08-18)

`mint-dock-manager.element.ts` went from 4,643 lines to 4,324, with `dock/src/core/` taking the
layout algebra (`layout-tree.ts`), the split weights (`sizes.ts`), the floating-window arithmetic
(`geometry.ts`) and the resize maths (`resize.ts`). 256 dock tests, core at 100% lines / 98%
branches. **Dock lines 49.7% → 53.1%, branches 37.8% → 41.1%.**

The resize extraction is the one that earns its keep beyond coverage: the pointer path and the
keyboard path each carried their own copy of the same arithmetic, written in different terms (handle
movement vs window growth, with the sign inverted for a left or top edge). They now share one rule,
and `resize.spec.ts` pins the shared rule against the keyboard path's *original* formulation, so the
two cannot silently diverge again. A divergence there is the kind nobody reports, because a mouse
user and a keyboard user never compare results.

**The 1,081-line target was not met by extraction, and could not be.** ~970 lines remain uncovered
in the element and they are pointer, drag and hit-testing paths against a jsdom tree where every
rect measures zero. Per step 4 of the plan they are covered by the four dock e2e specs; per PRD R3
they are NOT faked with a stubbed `getBoundingClientRect`. What did move the number beyond the
extraction was a new `layout-api.spec.ts` covering the public surface a host actually programs
against: the `layout` property and attribute, snapshot copying in both directions, floating-window
normalization on intake, the mid-gesture write refusal, and the identical-layout rebuild guard.

## M9 — file-manager, timeline, splitter, tile-manager

~766 uncovered lines across four components with thin specs:

- `mp-file-manager.ts` — 46.2%, 327 uncovered, 1,774 src against 338 spec lines.
- `timeline` — 56.9% (`mp-timeline.ts` 99 uncovered, `mp-timeline-item.ts` at 33.7%), 958 src
  against 306 spec lines, 1 spec file. Angular `timeline` entrypoint has zero specs (276 lines).
- `splitter` — 63.2%, 1,075 src against 357 spec lines, 1 spec file; `managers/resize-manager.ts`
  is at 11.1%.
- `tile-manager` — 74.2%, `mint-tile-manager.element.ts` 132 uncovered.

Same D5 judgement per component: extract where the logic is pure, test through the element only
where the DOM genuinely is the behaviour.

### What M9 delivered (2026-08-18)

166 tests; the group went **59.0% → 72.3% lines, 52.1% → 63.0% branches**.

- **splitter** — its four already-separated modules needed no refactor, only tests:
  `resize-manager` (11% → covered), `splitter-state`, `input-handler`, `pointer-event`. Defect #7
  fell out of writing the state-store spec.
- **`mp-timeline-item`** — 33.7% → 100%. It is a two-way attribute/property mirror, which is what
  lets three frameworks drive it and also where an echo loop hides; the specs pin the bespoke id
  rule in particular, since an attribute is always a string and a numeric id round-tripping through
  one would silently become `"7"`.
- **`mp-file-manager`** — 46.2% → 56.7%, through its derivation surface: folder contents, sorting,
  search, breadcrumb ancestry, the three-layer permission model, selection pruning, and the upload
  flow driven through a real drop. Uploads are registered by a DROP and never by the progress API,
  and the specs pin that division of labour — a phantom progress row for a file nobody dropped
  would be worse than silence.
- **`mp-timeline`** data mode — sides, the visually-last row under `reverse`, and the desktop
  selection conventions (a plain click replaces even in multiple mode; the modifier adds).

The specs deliberately drive the file manager's **icon view**: its list view is a virtual-scrolling
datatable, which jsdom cannot exercise, while the decisions under test are the same in both.

## M10 — scheduler, scheduler-core, datatable [PRD F4]

~988 uncovered lines, and the milestone most about **branch** coverage:

- `mp-scheduler.ts` — 81.7% by line but 262 uncovered; `input/input-handler.ts` at 43.6% (137);
  `views/day-view.ts` at 66.8%; `state/scheduler-state.ts` 45 uncovered; `drag/drag-manager.ts`
  at 36.4%.
- `scheduler-core` — 67.4%; `services/position.service.ts` at **2.3%** (42 uncovered) and
  `utils/dom.ts` at **0%** (28) are the two clearest pure-logic wins in the repo.
- `mp-datatable.ts` — 73.0%, 196 uncovered.

Start with `position.service.ts` and `utils/dom.ts` — pure, near-zero, and cheap.

### What M10 delivered (2026-08-18)

215 tests; the group went **79.2% → 81.8% lines, 65.9% → 67.1% branches**. Both files the plan
singled out are done: `position.service.ts` 2.3% → covered, `utils/dom.ts` 0% → 100%.

Also covered, all previously at or near zero: `utils/id.ts`; `models/permissions.ts` — the
three-layer precedence chain whose one-way rule (a per-item flag may only ever DENY) is what stops
*data* widening a policy set in *code*; the half of `date.service.ts` the existing spec never
reached (grid builders, the slot rounding a drag snaps through, localized formatting); and the
scheduler state store (the flat/nested event merge, the derived indexes, per-view navigation, range
selection).

Two conventions established here that later milestones should copy:

- **Formatting specs assert structure and localization, never a literal English string.** `Intl`
  output differs across ICU versions and platforms, so a test pinning `"Mon, Jul 27"` fails on a
  different Node build without anything being wrong — while still not proving the locale was
  honoured. Asserting that two locales differ, and that a range elides what its ends share, tests
  what the code is actually responsible for.
- **Check for an existing spec before writing one.** `color.spec.ts` already existed and was
  briefly overwritten before being restored; its WCAG `getReadableTextColor` cases are preserved
  verbatim with the rest of the module covered around them.

## M11 — the ratchet [PRD D2, F3, R2] — **moved to its own document**

**Q3 is resolved** (PRD §9): the coverage service exposes no status-check API and none is close, so
the ratchet must be a workflow step comparing against the master figure, and patch coverage is not
computable client-side.

That turned out to need enough of its own design and sequencing to warrant separate documents:
**[coverage-pr-gate.md](./coverage-pr-gate.md)** and
**[coverage-pr-gate-plan.md](./coverage-pr-gate-plan.md)** (milestones G1–G5). They replace this
milestone in full. The essentials carried over unchanged: project check only for now, non-blocking
for a week before it is required, a PR touching no source is never blocked, and **no** per-file
vitest `thresholds` (NG1).

## M12 — verification sweep

The single batched run, once:

```bash
npx nx run-many --target=build --configuration=production
npx nx run-many --target=test --exclude=api --coverage --parallel=2
dotnet test apps/api/Tests/Api.Tests.csproj -c Release --collect:"XPlat Code Coverage"
npx nx run-many -t e2e --parallel=1
npx nx run-many -t e2e-a11y --parallel=1
```

### What M12 measured (2026-08-18)

Everything ran green: **16 build targets**, **14 test projects** (all passing), **164 API tests**,
and the 23 Chromium `navbar.spec.ts` e2e cases — run specifically because M8's `mp-navbar` fix is
the only behaviour change in the programme. The full cross-app e2e/e2e-a11y sweep is left to CI on
push, which is where it belongs: it is the longest job in the workspace and nothing in these
milestones touches a path it exercises that the navbar run did not.

**The headline figure, honestly:**

| Project | Lines | |
|---|---:|---|
| `mintplayer-web-components` | **77.60%** | 13,012 / 16,768 |
| `mintplayer-ng-bootstrap` | 67.11% | 3,287 / 4,898 |
| `mintplayer-qr-code` | **0.00%** | 0 / 725 |
| `tools` | 23.58% | 166 / 704 |
| `mintplayer-vue-bootstrap` | 89.22% | 331 / 371 |
| `mintplayer-react-bootstrap` | 46.19% | 91 / 197 |
| `mintplayer-ng-qr-code` | 51.25% | 41 / 80 |
| `mintplayer-ng-click-outside` | 77.46% | 55 / 71 |
| `mintplayer-dijkstra` | 0.00% | 0 / 56 |
| `mintplayer-encode-utf8` | 30.00% | 9 / 30 |
| `mintplayer-ng-focus-on-load` | 80.00% | 12 / 15 |
| `mintplayer-pagination` | 0.00% | 0 / 14 |
| `mintplayer-ng-animations` | 0.00% | 0 / 12 |
| **TOTAL (JS/TS)** | **71.02%** | **17,004 / 23,941** |
| `apps/api` | 92.47% | (branches 53.59%) |

Against PRD §6:

| Criterion | Target | Actual | |
|---|---|---|---|
| Lines | ≥80% | **71.02%** | ✗ |
| Branches | ≥72% | not aggregated | — |
| Executable files absent from the report | 0 | 0 | ✓ (M1) |
| Angular entrypoints with no spec | ≤4 | — | ✓ (M5) |
| API collected | ≥60% | 92.47% | ✓ |
| `tools/` test target exists | yes | yes | ✓ (M3) |
| 10 largest React and Vue wrappers spec'd | yes | yes | ✓ (M7) |

**The 80% target is missed by 9 points, and the shortfall is concentrated rather than diffuse.**
Four items account for essentially all of it:

1. **`mintplayer-qr-code` — 725 lines at 0%.** The single largest hole in the workspace after the
   dock, and no milestone ever scheduled it: M1 put it in the denominator (correctly) and nothing
   since has put a test on it. Alone it costs ~3 points of the total.
2. **`tools` — 538 uncovered lines.** M3 covered the pure helpers it extracted; what remains is the
   script *shells* (`build-web-components.mjs`, `serve-api.mjs`, `refresh-flags.mjs`, …), which are
   process orchestration rather than logic. Extracting more of them is possible but hits the same
   ceiling M8 did.
3. **`mintplayer-react-bootstrap` — 46%.** Now that the `@lit/react` resolution is fixed this is
   simply "wrappers no test imports". Cheap to move, since importing one covers its whole file.
4. **The micro-libs** (`dijkstra`, `pagination`, `ng-animations`, `encode-utf8`) — 112 lines, all
   at or near zero, all trivially testable.

None of that is a reason to restate 71% as anything else, and none of it is work this plan
scheduled. It is the content of a follow-up: **M13 would be qr-code + the micro-libs + a React
import sweep**, which on these numbers reaches ~78–80% without touching anything hard.

Then push, once, and read the single run.

## M13 — `mintplayer-qr-code`, the largest untested library ✅

Not in the original plan. It surfaced from M12's measurement as the biggest single hole left in the
workspace: **725 lines at 0%**, worth about 3 points of the total on its own, and never scheduled
because M1 put it in the denominator without anything following up.

**421 tests; 0% → 97.4% lines, 90.9% branches, 100% functions.**

### Why this library was worth doing properly rather than quickly

It is a QR encoder, so ISO/IEC 18004 fixes nearly every value in it. That turns the usual problem
of testing untested code — *what should this return?* — into a lookup, and it means the tests assert
the **standard** rather than whatever the implementation currently produces. A test that merely
pinned current behaviour would have preserved the two defects below rather than finding them.

What that bought, concretely:

- **Capacity against Table 7.** 41/25/17/10 characters at version 1-L, 7089/4296/2953/1817 at 40-L.
  Those four numbers exercise both large lookup tables end to end; a single mistyped entry changes
  them.
- **The eight mask formulas against Table 10**, mode and EC-level indicators against Tables 2 and
  12, alignment coordinates against Annex E — *including* the version-32 exception, which is the one
  row the general interval formula cannot express and which the code carries a special case for.
- **The BCH codes proved as codes.** Format information is asserted to have minimum Hamming distance
  7 across all 32 values (BCH(15,5)) and version information ≥ 8 (BCH(18,6)) — the properties that
  make them correctable — plus the canonical anchor version 7 = `0x07C94`.
- **Reed–Solomon proved by its defining property**: the codeword formed by appending the EC bytes to
  the data is exactly divisible by the generator polynomial. That needs no fixture at all and
  catches any error in the field tables, the generator, the division, or the left-padding. It is the
  strongest single test in the library.
- **`create` asserted on the structural invariants a scanner looks for** before it reads any data:
  three finder patterns in the right corners and none in the fourth, alternating timing patterns
  along row and column 6, the fixed dark module at `(4v + 9, 8)`, a version block only from version
  7.

### Two defects, both silent

| # | Where | Was | Now |
|---|---|---|---|
| 8 | `hex2rgba` (`renderer/utils.ts`) | A CSS colour NAME passed the length checks, parsed as `NaN`, and became fully transparent black | Characters validated as well as length; unparseable returns `null` |
| 9 | `BitMatrix` constructor | `Array(n).map(() => false)` left both arrays SPARSE, so `xor` on an unwritten module turned it ON | `new Array(n).fill(false)` |

Defect 8 is the more interesting one. `red` is three characters, so it sailed past the
short-form length test, expanded to `rreeddFF`, and `parseInt(…, 16)` returned `NaN` — after which
every shift produced 0. A consumer who wrote `color: { dark: 'red' }` got a **fully transparent**
dark colour and rendered an invisible QR code, with nothing logged anywhere. The function already
returned `null` for wrong *lengths*, so the intent was never in doubt; it simply never checked the
characters.

Defect 9 was latent — the encoder writes every module before masking runs — but `BitMatrix` is
exported, and `undefined !== false` is `true`.

### Two of my own expectations were wrong, and that is worth recording

Both are now comments in the specs rather than silent corrections, because both are easy traps when
reading the standard:

- **EC block counts are totals across both groups.** Table 9 lists version 40-L as "19 blocks of 118
  plus 6 blocks of 119"; the number the code returns is **25**, not 19. Taking the first group's
  count as the total gives blocks that are too large and the interleaving runs off the end.
- **Penalty rule N1 cannot be tested by comparing two partially-filled grids.** The light area
  *around* a short run scores too, and at 7×7 a five-run and a six-run both come to exactly 63. The
  rule is asserted on solid squares instead, where the whole score is computable by hand.

### What is left

Two barrel files (`index.ts`, `server.ts` — one re-export line each) and a handful of branches. The
canvas renderer is covered through a canvas API **double**: this package's vitest environment is
`node`, and what is under test is what the renderer asks the canvas to do — how big to be, what to
clear, what pixel data to write. No geometry is faked, so R3 is respected. The most valuable case
there is the one asserting the renderer does **nothing** without a `window`, which is what keeps the
package importable during SSR.

## M14 — deepening the dock and file-manager elements ✅

The two largest *partially* covered files in the workspace, and the two whose remaining uncovered
mass had been written off as "geometry" without anyone checking how much of it really was.

### file-manager: 56.7% → 76.3% lines, 53.4% → 71.7% branches

61 tests over the operations surface — new folder, rename, delete, cut/copy/paste, the context menu,
and the icon-grid keyboard. None of it needed geometry; it had simply never been driven.

The component **never mutates the consumer's data**: every operation is a request carried on
`mp-operation` that the application acts on, or does not. So the specs assert events rather than
state — there is no state to assert. Two consequences shape every case:

- **The negative cases are the important ones.** A cancelled dialog must emit *nothing*; an
  application that trusted the event would create the folder, or delete the files, that the user
  explicitly declined.
- **The two resolver hooks are load-bearing, not decorative.** `dialogResolver` replaces
  `window.prompt` / `window.confirm` — which an application needs for styling and a headless
  environment does not have at all — and `conflictResolver` is the only thing that can decide what
  a name clash means, because replace, skip and rename are all reasonable and it depends on the app.

One structural finding worth carrying forward: **the rename editor is a datatable cell renderer.**
It therefore exists only in the LIST view and renders one shadow boundary deeper than everything
else in the component. The icon view has no rename affordance of its own — `F2` there sets the
target and nothing appears until the user switches views.

### dock: `parsePath` and `pathsEqual` into core, and drop semantics tested

`parsePath` moved to `dock/src/core/types.ts` beside `formatPath`, which is the function it has to
agree with: the pointer drop path formats a path onto `data-path` and reads it back, so a round-trip
that loses anything sends a drop to the wrong node. That agreement is now a property test rather
than an assumption. `pathsEqual` went with it.

54 tests over what a drop *does*: which node moves where, the four split zones, tearing a pane off
to float, and — the one that would catch a regression in any of the tree functions — that the layout
stays **canonical** after every move and every sequence of moves (no empty stacks, no single-child
splits, no same-direction nesting, weights summing to 1).

They are driven through the keyboard move flow, which is deliberate. The dock has two ways to move a
pane and they converge on the same `handleDrop`; only the keyboard one is reachable here, because
the pointer one ends in hit-testing against rects jsdom reports as zero. **Arming move mode is
itself unreachable** — the dock reads the focused tab through `shadowRoot.activeElement` and jsdom
does not surface a button focused inside `mp-tab-control`'s nested shadow root, the same limitation
`mint-dock-manager.aria.spec.ts` already documents. So arming is set directly and everything after
it runs exactly as it does for a user.

**Element line coverage moved from 48.5% to 49.2%, and that is the honest result.** What remains is
`beginCornerResize`, `handleCornerResizeMove`, `preparePaneDragSource`, `showDropIndicator`,
`onIntersectionDoubleClick`, `renderSnapMarkersForCorner`, `updatePaneDragDropTargetFromPoint`,
`finalizeDropFromPoint`, `renderIntersectionHandles`, the three `findDropZone*` / `findStack*`
hit-testers, `beginFloatingResize`, `handleFloatingResizeMove`, `updateFloatingPanePositions` and
`ensureHeaderDragPlaceholder` — about 480 lines in the largest runs alone, every one of them reading
`getBoundingClientRect`, `elementsFromPoint`, or pointer capture. Per R3 they are not faked. **The
value of this milestone in the dock is behavioural, not numeric**, and pretending otherwise would be
the exact failure mode D8 warns about.

### Two behaviours recorded rather than "fixed"

- **Floating the LAST pane is allowed**, leaving the main area empty. That is deliberate:
  `handleDrop` carries an explicit branch for dropping onto a dock with no root, which is the path
  that brings the pane back. An empty main area is a state the dock recovers from, not one it
  prevents.
- **The empty-window placeholder in `renderFloatingPanes` is unreachable.** Normalization runs at
  the end of every mutation and drops any floating window whose root is null, so a window with
  nothing in it never survives to be rendered. Testing it would mean constructing a state the
  component does not allow.

### M14b — what two investigation agents found that the above had missed

Two agents mapped every uncovered region of both files and classified each as pure, DOM-drivable or
geometry-bound. Most of what they listed was already done; the remainder was real, and took
**file-manager 76.3% → 84.05% lines** (attribute configuration, the lazy-tree bridge, the size/date
formatters, shift-range selection) and **the dock element 49.2% → 51.8%** (the splitter's
resize-end → flex-weight conversion with its bubbling guard, dropping back into an empty main area,
moving a pane out of a floating window).

**Both reports contained a claim that did not survive checking, and both are worth recording as a
caution about delegated measurement:**

- The dock agent reported `dock/src/core/resize.ts` at **15%** line coverage and made it its
  top recommendation on coverage-per-effort grounds. It is at **99.55%** — the reading came from a
  filtered vitest run that loaded only some of the core spec files. Acting on it would have meant
  rewriting tests that already existed.
- Both agents classified the dock's `tab-activate` handler as DOM-drivable. It is not. The handler
  resolves a tab with `:scope > [data-tab-id=…]`, and **jsdom does not implement `:scope`**:
  measured, `querySelector(':scope > *')` returns null on an element with six children while the
  same selector without `:scope` finds them. The child combinator is load-bearing — without it a
  nested stack's tabs would match and activate the wrong pane — so the selector stays, the spec
  asserts the precondition instead, and activation remains covered by the dock e2e specs.

The general point: a delegated coverage map is a lead, not a result. Both errors were cheap to
catch by re-measuring, and expensive to act on.

### Where the workspace stands

**74.98% lines (17,953 / 23,944)**, up from 71.02% at M12. web-components 79.0%, qr-code 97.4%,
file-manager 84.1%, vue 89.2%, api 92.5%.

The remaining distance to the 80% target is now two blocks, not four:

| | Uncovered | Note |
|---|---:|---|
| `mintplayer-ng-bootstrap` | 1,611 | Angular wrappers; the largest block left |
| `tools` | 538 | script shells — process orchestration, not logic |
| `mintplayer-react-bootstrap` | 106 | wrappers no test imports; cheap, one import each |
| micro-libs | 142 | `dijkstra`, `pagination`, `ng-animations`, `encode-utf8`, `ng-qr-code` |

The last two rows are ~250 lines and about a point between them. The first is where the next real
milestone is.

## M15 — the dock's last non-geometry regions ✅

**Measured before: 51.79% lines / 38.57% branches, 1,311 uncovered.**
**Measured after: 54.12% lines / 41.90% branches, 1,195 uncovered.** 116 lines, 9 spec cases short
of doubling the estimate — and no geometry was faked to get them. `dock/src/core` was already at
99.55% and needed nothing.

Re-measure with:

```bash
cd libs/mintplayer-web-components
npx vitest run --pool=threads --coverage --coverage.reporter=json   --coverage.include='dock/src/components/mint-dock-manager.element.ts' dock
# then parse coverage/libs/mintplayer-web-components/coverage-final.json —
# the text reporter TRUNCATES the "Uncovered Line #s" column and is useless here
```

### What was covered, and why each was reachable

| Method | Lines | Why it was reachable |
|---|---:|---|
| `reorderPaneInLocation` | 14 | **Pure.** A centre drop whose source and target paths are the same stack. `handleDrop` guards this case ahead of the general remove-then-add path, because that path would remove the pane and let normalization collapse a stack that briefly held one fewer. |
| `handleFloatingStackDrop` | 39 | Takes `(sourceIndex, targetPath, zone)` and **reads no geometry** — verified before writing the specs, not assumed. The unit of the move is a whole subtree, so an edge zone splits the target against the window's own tree. |
| `reorderPaneInLocationAtIndex` | 18 | **Pure**, and the half of the third item that turned out not to need rects at all. |

That last row is the useful correction to the map this section originally carried. It listed
`reorderPaneInLocationAtIndex` and `finalizeDropFromPoint` together as one geometry-bound item and
called it a judgement call. Reading the code split them cleanly: working out *which* index a drop
lands on needs tab-button rects, but what that index *means* is array work with no DOM in it. The
pure half cost nothing and needed no stubs; only `finalizeDropFromPoint` stays uncovered.

**The judgement call was therefore never taken, and should stay untaken.** Precedent for stubbing
`elementsFromPoint` and button rects exists in `mint-dock-manager.element.spec.ts`, but R3 exists to
stop that becoming routine, and splitting the method was the better answer than reaching for it.

### What is permanently uncovered, and why

About **480 lines** in the largest runs alone. Every one terminates in a `getBoundingClientRect()`,
an `elementsFromPoint()` or a pointer capture, all of which jsdom reports as zero:

`beginCornerResize` (66) · `showDropIndicator` (77) · `onIntersectionDoubleClick` (68) ·
`handleCornerResizeMove` (41) · `preparePaneDragSource` (39) · `renderSnapMarkersForCorner` (33) ·
`updatePaneDragDropTargetFromPoint` (24) · `renderIntersectionHandles` (19) ·
`findDropZoneByPoint` (18) · `findStackInTargets` (14) · `beginFloatingResize` (13) ·
`findDropZoneInTargets` (12) · `handleFloatingResizeMove` (11) · `ensureHeaderDragPlaceholder` (11) ·
`computeHeaderInsertIndex` + `finalizeDropFromPoint` (20)

These are covered by the four dock e2e specs against a real engine. **Report them as permanently
uncovered, not as future work** — and per R3 do not fake rects to reach them.

Three more are unreachable for reasons that are NOT geometry, and each would be a mistake to "fix":

- **`renderStack`'s `tab-activate` handler (1887-1901, 15 lines)** — resolves the tab with
  `:scope > [data-tab-id=…]`, and **jsdom does not implement `:scope`**. Measured:
  `querySelector(':scope > *')` returns null on an element with six children while the same
  selector without `:scope` finds them. The child combinator is load-bearing — without it a nested
  stack's tabs would match and activate the wrong pane. **Do not rewrite the selector to suit the
  test runner.** The spec asserts the precondition (every tab carries the id and pane name the
  handler looks up, as a direct child of its stack) instead.
- **`onRootKeyDown`'s arm branch (3783-3794, 12 lines)** — reads the focused tab through
  `shadowRoot.activeElement`, which jsdom does not surface through `mp-tab-control`'s nested shadow
  root. Already documented in `mint-dock-manager.aria.spec.ts`; the specs set `paneMoveMode`
  directly and drive everything after it for real.
- **`renderFloatingPanes`'s empty-window placeholder (691-702, 12 lines)** — **dead code.**
  Normalization drops any floating window whose root is null before it can render, so the branch
  cannot be entered through the public API.

`updateFloatingPanePositions` (1586-1598) is reachable but **vacuous**: with a zero host,
`clampBoundsToHost` returns the intent unchanged, so the assertion would prove nothing. Its logic is
already covered in `core/geometry.spec.ts`.

### The honest framing to keep

The dock element ends at **54.12%**, and that is the number to report. M14 added 54 behavioural
tests and moved it 48.5% → 49.2%; M14b reached 51.8%; M15 reached 54.1% and exhausted everything
that does not require a layout engine. **That curve is the finding, not a shortfall.** More than a
third of the file is geometry whose correctness a jsdom assertion cannot establish, which is why
§7d of the PRD argues for per-area expectations rather than one workspace number. A uniform 80%
target applied here would push someone into faking rects — precisely R3's failure mode.
