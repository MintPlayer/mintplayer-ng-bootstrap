# PRD — raising and defending test coverage

Status: **M1–M10 and M12–M14 implemented** (2026-08-18) on `feat/coverage-honest-denominator`; M11
(the gate) lives in [coverage-pr-gate.md](./coverage-pr-gate.md). The verified sweep lands at
**74.59% lines**, short of §6's 80% target — §7c records what remains and why it is concentrated
rather than diffuse.
Plan: [test-coverage-plan.md](./test-coverage-plan.md)

Grounded in a measured investigation of the workspace at `master@e01681ec`, using the live
coverage service (`coverage.mintplayer.com`, anonymous `/api/browse` endpoints) walked over all
804 reported files and reconciled against the filesystem, plus a static read of every vitest
config and both CI workflows, and a four-agent survey of the per-area test landscape. Every number
below is measured, not estimated; claims sourced from the survey were re-verified directly before
being recorded here.

## 1. Problem

The workspace reports **73.4% line coverage** and there is no mechanism that keeps it there. Three
separate weaknesses compound:

1. **The number is not defended.** No coverage threshold exists anywhere in the repo, and
   `pull-request.yml` does not collect coverage at all — so a PR can delete every test in a lib and
   nothing turns red. Coverage is measured once per push to `master`, after review has ended.
2. **The number is measured against an incomplete denominator.** Vitest 4 reports only files a test
   actually loaded. 62 files containing executable code are therefore absent from the report
   entirely rather than counted as 0% — they are invisible, not merely uncovered.
3. **Branch coverage is far weaker than line coverage** (59.1% vs 73.4%) and is not reported
   anywhere a human looks. The gap is where the untested behaviour actually lives: error paths,
   `?.` fallbacks, mode switches, keyboard branches.

## 2. Measured baseline (`master@e01681ec`)

```
lines    16184 / 22051   73.4%
branches  8795 / 14867   59.1%
files      804
```

Per project, ordered by uncovered lines:

| project | covered / coverable | % | uncovered | files reported |
|---|---|---|---|---|
| `libs/mintplayer-web-components` | 12199 / 16451 | 74.2% | 4252 | 214 |
| `libs/mintplayer-ng-bootstrap` | 2999 / 4215 | 71.2% | 1216 | 325 |
| `apps/ng-bootstrap-demo` | 751 / 1037 | 72.4% | 286 | 186 |
| `libs/mintplayer-ng-qr-code` | 41 / 76 | 53.9% | 35 | 3 |
| `libs/mintplayer-react-bootstrap` | 44 / 66 | 66.7% | 22 | 18 |
| `libs/mintplayer-vue-bootstrap` | 74 / 95 | 77.9% | 21 | 55 |
| `libs/mintplayer-encode-utf8` | 9 / 29 | 31.0% | 20 | 1 |
| `libs/mintplayer-ng-click-outside` | 55 / 69 | 79.7% | 14 | 1 |
| `libs/mintplayer-ng-focus-on-load` | 12 / 13 | 92.3% | 1 | 1 |
| `apps/api` | — | — | — | **not collected** |

Worst web-component directories by uncovered lines:

| dir | covered / coverable | % | uncovered |
|---|---|---|---|
| `dock` | 1011 / 2092 | 48.3% | 1081 |
| `scheduler` | 2589 / 3206 | 80.8% | 617 |
| `file-manager` | 286 / 620 | 46.1% | 334 |
| `ribbon` | 446 / 732 | 60.9% | 286 |
| `datatable` | 564 / 761 | 74.1% | 197 |
| `query-builder` | 851 / 1026 | 82.9% | 175 |
| `scheduler-core` | 359 / 533 | 67.4% | 174 |
| `timeline` | 214 / 376 | 56.9% | 162 |
| `charts` | 966 / 1125 | 85.9% | 159 |
| `splitter` | 234 / 370 | 63.2% | 136 |
| `tile-manager` | 386 / 520 | 74.2% | 134 |

Single worst files:

| file | % | uncovered |
|---|---|---|
| `web-components/dock/src/components/mint-dock-manager.element.ts` | 48.3% | **1081** |
| `web-components/file-manager/src/components/mp-file-manager.ts` | 46.2% | 327 |
| `web-components/scheduler/src/components/mp-scheduler.ts` | 81.7% | 262 |
| `web-components/ribbon/src/mp-ribbon.element.ts` | 54.8% | 241 |
| `web-components/datatable/src/components/mp-datatable.ts` | 73.0% | 196 |
| `web-components/scheduler/src/input/input-handler.ts` | 43.6% | 137 |
| `web-components/tile-manager/src/components/mint-tile-manager.element.ts` | 70.5% | 132 |

`mint-dock-manager.element.ts` alone is **2092 coverable lines in one file** — 9.5% of the whole
workspace denominator, and the single largest lever available.

## 3. Findings

### F1 — `coverage.include` is unset, so untested files are invisible rather than zero

All four lib configs declare only a provider, a reporter and a directory, with no `include`:

- `libs/mintplayer-web-components/vite.config.mts:76`
- `libs/mintplayer-ng-bootstrap/vitest.config.ts:18`
- `libs/mintplayer-react-bootstrap/vite.config.mts:34`
- `libs/mintplayer-vue-bootstrap/vite.config.mts:43`

The workspace is on **vitest ~4.1 / @vitest/coverage-v8 ^4.0.16**. Vitest 4 removed the `all`
option; with `coverage.include` unset the report contains only files loaded during the run.

Reconciling the 804 reported files against the filesystem: of 1133 non-generated, non-spec source
files in the four libs, **600 are absent from the report**. Most of that absence is legitimate —
**449 are `index.ts` barrels** and **89 are type/interface-only files**, both of which have no
executable lines and correctly contribute nothing. The genuine gap is **62 files carrying
executable code, ~3,334 physical lines**:

| area | absent executable files |
|---|---|
| `mintplayer-ng-bootstrap/ribbon` | 18 |
| `mintplayer-web-components/ribbon` | 14 |
| `mintplayer-ng-bootstrap/instance-of` | 6 |
| `mintplayer-react-bootstrap` (8 dirs) | 8 |
| `web-components/navbar` (SSR injectors) | 3 |
| `web-components/datatable` | 2 |
| standalone ng pipes (`slugify`, `linify`, `split-string`, `word-count`, `has-property`, `viewport`, `code-snippet`) | 7 |
| remainder | 4 |

**Consequence to state plainly up front: fixing this makes the headline number go down, not up.**
Adding ~1,800 coverable lines to the denominator with no new tests moves 73.4% to roughly **68%**.
That is the honest baseline; every target in §6 is expressed against the corrected denominator.

### F2 — the ribbon family is the largest untested surface in the repo

32 files across both libs (18 Angular, 14 web-component) contain executable code that no test ever
loads. The whole `mp-ribbon-*` item family — split-button (219 lines), quick-access-toolbar (171),
dropdown-button (162), menu-item (119), group-button (105), toggle-button (97), color-picker (95),
gallery-item (91), combobox (79), checkbox (76) — is untested, and so is its Angular wrapper set.
The parent `mp-ribbon.element.ts` is separately at 54.8% with 241 uncovered lines.

The ribbon also has the worst spec-to-source ratio of any component: **4169 source lines against
638 spec lines across 4 spec files, for 19 elements.**

### F3 — coverage is never measured on a pull request, and no threshold exists anywhere

`pull-request.yml:84` runs `nx affected --target=test` **without `--coverage`**, and never uploads.
Coverage is collected only in `publish-master.yml:58-63` (`nx run-many --target=test --exclude=api
--coverage`) and uploaded at `:65-79`.

A repo-wide grep for `thresholds` / `coverageThreshold` returns exactly one hit, and it is
unrelated (`libs/mintplayer-web-components/src/test-setup.ts:25`, an IntersectionObserver stub
field). There is **no `codecov.yml`, no threshold, no status check**. Nothing can fail on coverage.

This is the finding that matters most: without it, any improvement made by this PRD decays.

### F4 — branch coverage (59.1%) trails line coverage (73.4%) by 14 points

8795 of 14867 branches are covered. Roughly 6,000 uncovered branches sit inside files that already
count as "covered" by line. Line coverage is flattering: it rewards a spec that instantiates an
element and asserts one render, which is exactly the shape of many existing specs.

### F5 — `apps/api` coverage is never collected

The API is excluded from the coverage sweep (`--exclude=api`, `publish-master.yml:63`) because
`nx:run-commands` forwards `--coverage` verbatim to VSTest, which rejects it. Its own step at
`publish-master.yml:197` runs `dotnet test apps/api/Tests/Api.Tests.csproj` with **no
`--collect:"XPlat Code Coverage"`**, so nothing is produced. The upload globs are
`coverage/apps/*/lcov.info` + `coverage/libs/*/lcov.info` with `disable-search: true`, so even a
coverlet run writing elsewhere would not be picked up.

The test project is real but narrow: **50 `[Fact]`/`[Theory]` across 645 lines** in 3 files —
`WalkerTests.cs` (371, 26 facts), `ValidatorTests.cs` (156, 13), `SortApplierTests.cs` (118, 11).
All are pure unit tests of the query-builder against `List<Order>` in LINQ-to-Objects — **no HTTP
and no EF Core**, so nothing proves the built expressions translate to SQL.

Untested production code is ~2,183 lines outside `Migrations/`. Two items stand out:

- **`apps/api/QueryBuilder/TzDateMath.cs` (119 lines) is never named by any test.** It is reached
  only indirectly from `QueryBuilderWalker.cs:97-110`, which dispatches **15 relative-date
  operators** to it (today, yesterday, this/last/next week/month/year, last-n-days, next-n-days,
  year-to-date); `WalkerTests` has roughly one relative-date case. It is pure, deterministic,
  parameterised on `(now, tz)`, and timezone/DST-edge-prone — the single highest-value untested
  unit in the repo. *(Verified: the only references are three controllers and the walker.)*
- **`Microsoft.AspNetCore.Mvc.Testing` and `Microsoft.EntityFrameworkCore.InMemory` are already
  referenced by `Api.Tests.csproj` and used by nothing.** *(Verified: zero `WebApplicationFactory`
  or `UseInMemoryDatabase` usages in any `.cs` outside `bin`/`obj`.)* A `WebApplicationFactory`
  suite over the four controllers (`Orders` 71, `TreeItems` 124, `LineItems` 64, `Customers` 64)
  needs no new dependencies and would be the only thing proving the walker survives EF translation.

Also untested: `Data/DemoSeed.cs` (149), `Program.cs` (129), `QueryBuilder/EntitySchema.cs` (103),
`QueryBuilder/OperatorCatalog.cs` (89), `Data/DemoDbContext.cs` (46). There is no `.sln` in the
repo, and `Api.csproj` excludes the test folder via `<Compile Remove="Tests/**" />`.

### F6 — React and Vue wrapper numbers measure a spec's import graph, not the libraries

React reports 18 files / 66 coverable lines against **54 `Bs*.tsx` files, 2,065 lines**; Vue reports
55 files / 95 coverable lines against **55 `Bs*.vue` files, 2,660 lines**. Each lib has exactly one
spec, and what those numbers actually measure is that spec's module graph:

- **React's 18 files are the import closure of `_conformance/attribute-passthrough.spec.tsx`** (142
  lines) — 12 subpaths yielding 15 wrappers, plus barrels. The other ~39 wrapper files are never
  loaded. The spec asserts `aria-label` reaches the `mp-*` root and nothing else; its header
  documents why (`role`/`id`/`tabIndex` travel `@lit/react`'s element-property path, which jsdom
  cannot observe).
- **Vue's 55 files come from an eager glob, not from testing.**
  `_conformance/attribute-passthrough.spec.ts:40-41` does
  `import.meta.glob('../*/src/*.vue', { query: '?raw', import: 'default', eager: true })` (plus a
  two-level variant), pulling every SFC into the module graph. 55 instrumented files is exactly the
  55 SFCs on disk. **Only 5 are ever mounted.** Vue therefore scores *higher* than React from a
  *smaller* spec — the ranking between the two libs is an artifact.

The low coverable-line counts (66/95) are genuine: these wrappers are declarative
(`createComponent` calls, SFC templates), so few executable statements exist even when loaded.
Untested behaviour is the part that justifies hand-writing them: prop→attribute mapping, controlled
`value`/`onChange` round-trips, ref-assigned object/function props, `defineModel` v-model
round-trips, `watch`-driven object-prop assignment, named scoped slots.

One genuinely broad guard already exists and should be preserved: Vue's spec statically asserts
that every file declaring `inheritAttrs: false` also contains `v-bind="$attrs"`, sweeping all 55
SFCs. React has no equivalent runtime guard, but does have a compile-time half
(`attribute-passthrough.types.tsx`, 63 lines) run by a separate `typecheck-a11y` target. **Vue has
no `typecheck-a11y` counterpart** — an asymmetry worth closing.

Largest untested React wrappers: `BsRibbon.tsx` (182), `BsTimeline.tsx` (152), `BsAccordion.tsx`
(135), `BsCarousel.tsx` (93), `BsShell.tsx` (76).
Largest untested Vue: `BsTreeSelect.vue` (175), `BsTimeline.vue` (153), `BsDatatable.vue` (151),
`BsCarousel.vue` (90), `BsScheduler.vue` (89).

### F7 — e2e contributes nothing to the metric, and is wildly asymmetric across frameworks

`ng-bootstrap-demo-e2e` has **47 specs, ~5,900 lines** and is genuinely strong: `scheduler-views`
(1,266 lines), `navbar` (445), `otp-input` (393), `scheduler-resize` (348), `dock-bounds` (324),
`keyboard-walkthrough` (269), plus axe gates over 29 routes with and without JS.

`react-bootstrap-demo-e2e` and `vue-bootstrap-demo-e2e` have **11 specs, ~318 and ~298 lines** — and
most of those are 4–10 line re-exports of `tools/e2e-shared/*-suites.ts`. The only substantial
framework-specific spec in either is `tree-select.spec.ts` (87 React / 64 Vue). Both apps' axe
suites do cover ~33 routes, but the gate's contract is load plus at most one interaction.

So **behaviour proven in Angular is assumed in React and Vue.** Per the repo's own
`::slotted(mp-*)` incident — where a tag-named selector worked in two frameworks and silently
collapsed a control to 0px in the third — that assumption has already shipped a bug once.
Components with no behavioural spec in React/Vue include datatable, dock, file-manager,
query-builder, ribbon, scheduler, tile-manager, timeline, navbar, select, treeview, otp-input,
signature-pad and splitter.

None of this is instrumented — coverage comes from the `test` target, e2e lives on a separate `e2e`
target, emits no lcov, and Playwright coverage is configured nowhere. This is a reason to weight the
§6 targets toward unit-testable logic rather than chase percentage on e2e-covered interaction code.

### F8 — the React and Vue demo apps have no `test` target at all

`apps/react-bootstrap-demo/project.json` and `apps/vue-bootstrap-demo/project.json` define no `test`
target *(verified)*, so both are absent from the coverage report entirely — not at 0%, absent. Only
`apps/ng-bootstrap-demo` has one. Under D3 the demo apps leave the metric anyway, so this is
recorded as a fact rather than a defect to fix.

### F9 — `tools/` is 3,438 lines with no test target, including the escaping rule CLAUDE.md warns about

There is no project or `test` target covering `tools/`. The repo says so in its own source:
`tools/scripts/dev-processes.check.mjs:9` — *"There is no test target covering tools/, so this is a
standalone script rather than a spec."* That file (186 lines) is a hand-rolled PASS/FAIL assert
harness run manually with `node` — a test suite in everything but wiring.

The sharpest gap: **`escapeForTemplateLiteral` (`tools/scripts/build-web-components.mjs:78-83`) has
no spec anywhere** *(verified — the only references are its definition and three call sites at
`:124`, `:125`, `:138`)*. It is three **ordered** replaces (`\\` → `` ` `` → `${`), and the order is
load-bearing: escaping backslashes last would double-escape the other two. This is exactly the rule
CLAUDE.md calls out, and a regression silently corrupts every generated `.styles.ts` and
`.element.template.ts` in the workspace — with no test anywhere that would notice.

Also pure and untested: `tools/vite/multi-entry.mts` `discoverEntries` (:25) and
`generateSubpathExports` (:76), which drive the web-components, React **and** Vue builds and whose
`charts/` namespaced-recursion case was a known M0 bugfix; `toCamelCase`, `buildElementTemplateModule`,
`buildStylesModule`, `writeIfChanged` in the same build script; and
`tools/scripts/lib/dev-processes.mjs` (270 lines, side-effect-free on import by design).
`build-hljs-loaders.mjs` (159) and `build-flag-loaders.mjs` (134) generate the static import maps
that exist *because* dynamic specifiers must be literals — output-shape assertions would guard
another rule this repo has been bitten by.

### F10 — 18 Angular entrypoints of 95 have zero specs

3,639 source lines with no spec file at all:

`ribbon` (931), `scheduler` (479), `navbar` (351), `tree-select` (341), `file-manager` (311),
`timeline` (276), `dropdown-menu` (198), `instance-of` (192), `dock` (167), `carousel` (139),
`code-snippet` (134), `viewport` (40), `word-count` (20), `slugify` (17), `linify` (17),
`split-string` (13), `has-property` (10), `has-id` (3).

The last seven are pure pipes and directives totalling ~120 lines — the cheapest coverage in the
repo, testable with no TestBed and no web component.

## 4. Goals

- **G1** Make the reported number honest: every source file with executable code appears in the
  report, uncovered or not.
- **G2** Make coverage impossible to regress silently: measured on every PR, with a gate.
- **G3** Raise real coverage, prioritising branch coverage over line coverage, concentrated in the
  files where the uncovered mass actually is.
- **G4** Close the structural blind spots — `apps/api`, the ribbon family, and `tools/` (which has
  no test target at all).
- **G5** Stop assuming that behaviour proven in Angular holds in React and Vue (F7).

## 5. Non-goals

- **NG1** No 100% target, and no per-file threshold. A blanket high bar produces assertion-free
  tests written to satisfy the tool.
- **NG2** Not rewriting the e2e suites as unit tests. Interaction behaviour already covered by
  Playwright stays there (F7).
- **NG3** No new test framework. vitest + jsdom for units, Playwright for e2e, xunit for the API —
  as today.
- **NG4** Not testing generated artifacts (`*.styles.ts`, `*.element.template.ts`,
  `*.generated.ts`, `phone-core` metadata) — these stay excluded.
- **NG5** Not chasing coverage in `apps/*-demo`. Demo pages are documentation, not library code
  (see D3).

## 6. Targets

Expressed against the **corrected** denominator from F1 (~68% starting point), so that the ratchet
never rewards a denominator change:

| metric | now (corrected) | target |
|---|---|---|
| workspace lines | ~68% | **80%** |
| workspace branches | ~59% | **72%** |
| files with executable code absent from report | 62 | **0** |
| Angular entrypoints with zero specs | 18 | **≤4** |
| `apps/api` line coverage | not collected | **collected, ≥60%** |
| PR coverage gate | none | **project + patch status checks** |
| `tools/` test target | none | **exists, covering the pure codegen helpers** |
| React/Vue wrappers with a behavioural spec | 0 | **the 10 largest in each** |

Note the React/Vue line targets are deliberately absent: at 66 and 95 coverable lines their
percentage is noise, and D1 will expand those denominators to ~2,065 and ~2,660 lines. The
meaningful target for those libs is a count of components with real behavioural specs, not a
percentage (F6).

## 7. Decisions

- **D1 — Every valid source file appears in the report; `coverage.include` is set per lib.**
  *(Confirmed by the user, 2026-08-17.)* No file with executable code may be absent from the
  denominator — absence must never be the reason a number looks good. `include` is set per lib
  rather than as a root-level glob because each lib already owns its vitest config and its own
  exclusion needs (web-components must exclude three generated patterns; the Angular lib none); a
  root config would have to encode every lib's generated-file conventions in one place, which is
  exactly the coupling the per-lib configs avoid today.

  This applies to **every** project with a `test` target, including the standalone micro-libs
  (`encode-utf8`, `ng-qr-code`, `dijkstra`, `pagination`, `qr-code`, `ng-animations`,
  `ng-click-outside`, `ng-focus-on-load`) — each needs its own `coverage.include`, and several
  currently emit no coverage block at all. "Valid" excludes only the generated artifacts and
  type-only declarations named in NG4; a barrel or a `.d`-shaped file with zero executable lines is
  not a coverage loss, but it is also not a reason to skip a config.

- **D2 — Gate on a ratchet (patch coverage + no-decrease), not an absolute floor.** An absolute
  floor set at today's number blocks nothing until it is nearly met, then blocks everything. Patch
  coverage — "lines this PR added must be covered" — is the mechanism that actually holds a number
  in place, and it costs nothing on PRs that touch no source.

- **D3 — Exclude `apps/*-demo` from the coverage metric.** 1,037 coverable lines of demo pages
  currently sit in the denominator at 72.4%. Demo pages exist to be read and to be driven by e2e;
  unit-testing them produces `should create` specs, which is the failure mode NG1 exists to
  prevent. Their e2e coverage is the real guarantee. *(This lowers the denominator — combined with
  D1's increase, the corrected baseline lands near 68%.)*

- **D4 — Prioritise by uncovered-line mass, not by percentage.** `mint-dock-manager.element.ts` at
  48.3% is worth 1081 lines; `mintplayer-encode-utf8` at 31.0% is worth 20. Percentage alone would
  invert that ordering. The plan sequences strictly by absolute uncovered lines.

- **D5 — Prefer extracting pure logic over testing through the element.** The uncovered mass in
  dock, scheduler and file-manager is layout maths, hit-testing, drag state machines and tree
  walking — logic currently reachable only by driving a custom element in jsdom, where
  `getBoundingClientRect` returns zeroes. `charts/core` is the in-repo precedent: 44 pure-maths
  specs, zero dependencies, and the element that consumes it sits at 82–86%. Extraction buys
  testability *and* better design; testing through the element buys a brittle spec.

- **D6 — Collect `apps/api` coverage in its existing step, not the Nx sweep.** The `--exclude=api`
  workaround exists for a real reason (VSTest rejects the forwarded `--coverage`). Adding
  `--collect:"XPlat Code Coverage"` to the `dotnet test` step at `publish-master.yml:197` and
  globbing its Cobertura output into the upload keeps the workaround intact.

- **D7 — Coverage on PRs uses `affected`, uploads with a distinguishing flag, and never sets
  `finish: true`.** `run-many` on every PR would be prohibitively slow, but a partial upload is
  recorded server-side as a coverage collapse. Uploading `affected` results under a separate flag
  keeps the master `unit` flag authoritative while still giving reviewers a patch number.
  Fork PRs get neither secrets nor an OIDC token, so the upload step must be guarded on
  `head.repo.full_name == github.repository`.

- **D9 — Give `tools/` a project with a `test` target rather than leaving assert-scripts.** Three
  scripts (`dev-processes.check.mjs`, `check-code-snippet-hljs-lazy.mjs`,
  `check-ribbon-bundle-size.mjs`) are already assertion harnesses that nothing runs automatically.
  Converting them to vitest specs under a real target costs little and turns three manual rituals
  into CI guarantees — and is the only way a spec for `escapeForTemplateLiteral` (F9) would ever
  execute.

- **D10 — React/Vue targets are counts of behavioural specs, not percentages.** Their coverable-line
  totals are too small for a percentage to mean anything, and F6 shows the current percentages
  already rank the two libs backwards. Measuring "does this wrapper have a spec that round-trips its
  model" is the honest question.

- **D8 — Branch coverage is the review metric; line coverage is the headline.** Targets are set for
  both (§6), but reviewers should read the branch delta. F4 is the finding that says line coverage
  can be raised without testing anything new.

## 7b. What the first six milestones actually changed

Recorded here because the plan's per-milestone notes are long, and because two of these outcomes
were not predicted by this document. §7c covers M7–M12.

**Measured effect.** M1 corrects the denominator: web-components 357 files, ng-bootstrap 507,
react 129, vue 130 (55 of them `.vue` SFCs), tools 20, dijkstra 8 — the last from a suite with no
spec files at all, which is F1 in miniature. `apps/api` enters the report for the first time at
**92.1% lines / 53.7% branches** over 1,503 lines. Test counts: tools 0 → 124, api 50 → 164,
ng pipes 0 → 66, ribbon 0 → 218.

**Two mechanisms this PRD did not know about:**

- **Vitest 4's `coverageConfigDefaults.exclude` no longer carries `**/*.d.ts`.** With
  `coverage.all` gone, `include` is the only file selector, so ambient declaration files land in
  the denominator as 0%-covered "source". Two leaked into the first web-components run and were
  caught only by diffing the emitted `SF:` list against disk. Every `exclude` now names it.
- **The coverage upload is what finalizes the build, and it ran *before* the API test step in both
  workflows.** A Cobertura report globbed there could never have existed. F5 identified the missing
  collection but not the ordering; the .NET steps now run ahead of the upload.

**Testing found bugs, which is the point.** Four defects, all in code no test had ever loaded, all
now fixed with regression guards: `bsWordCount` counted a newline-separated pair as one word;
`bsLinify` normalized only the first CRLF; `bsSlugify` emitted an empty slug for any non-Latin
title; `mp-quick-access-toolbar` overwrote a consumer's `aria-label` before first paint. A fifth,
in `check-ribbon-bundle-size.mjs`, silently disabled the bundle budget on a malformed `--max`
(`size > NaN` is `false`). Three of the four were invisible because a nearby input shape worked —
two spaces, the first line, the first update — which is the argument for edge-case assertions over
`should create`, i.e. NG1 and D8, arrived at empirically. Full table in the plan.

## 7c. What M7–M12 changed, and where the number actually landed

**The programme found seven defects, not four.** The three from M7–M9 are the ones this PRD's G5
predicted in the abstract and had no example of:

- **`mp-navbar`'s `expanded` was a silent no-op in React AND Vue.** Both wrappers lower a `true` to
  the attribute shape `''`, which is right — the DSD chrome and the no-JS CSS select on attributes.
  But the element defines an `expanded` *accessor*, and both frameworks route any name found on an
  element's prototype through the property instead; `''` is falsy, so the setter closed the bar when
  asked to open it. Angular escaped because it binds `[attr.expanded]`. **Two frameworks of three
  were broken, and the one that worked was the one with the tests** — G5, demonstrated.
- **Vue shipped every app with the scheduler's built-in event editor off**, because Vue casts an
  absent declared Boolean prop to `false` rather than `undefined`, defeating the wrapper's "only
  write it when the consumer said something" guard on every mount.
- **`SplitterStateManager.getState()` leaked its arrays** while every setter copied on the way in.

**One mechanism this PRD did not know about, and it invalidated a prior finding.** `@lit/react`
publishes two builds, and its `node` export condition compiles the property/event runtime away
entirely (it exists for `@lit-labs/ssr-react`). Vitest resolves dependencies through the SSR
pipeline, so it picked that build even under `environment: 'jsdom'` — meaning **no React wrapper
received a property or fired an event, uniformly** (lit/lit#4446). That uniformity is exactly why it
had been recorded as a jsdom platform limitation, with a browser spike that appeared to confirm it.
It was a resolution fault. Pinning the browser build in the test config makes the React library
testable at all and let the existing passthrough guard be strengthened from type-level to runtime.
Worth generalising: **a limitation that applies to everything uniformly is more likely a
configuration fault than a platform fact.**

**Measured outcome against §6.** Full table in the plan's M12 section; the summary is:

| Criterion | Target | Actual |
|---|---|---|
| Lines | ≥80% | **71.02%** (17,004 / 23,941) |
| Executable files absent from the report | 0 | 0 |
| API collected | ≥60% | 92.47% |
| `tools/` test target | exists | exists |
| 10 largest React and Vue wrappers spec'd | yes | yes |

Per-area: web-components **77.6%**, ng-bootstrap 67.1%, vue 89.2%, api 92.5%.

**The 9-point shortfall is concentrated in four items this plan never scheduled**, not spread
across the components it did: `mintplayer-qr-code` at 0% over 725 lines (~3 points on its own),
`tools` script shells (538 lines of process orchestration), React wrappers no test imports (46%),
and four micro-libs at zero (112 lines). A follow-up covering exactly those reaches ~78–80% without
touching anything hard — which is a better description of the remaining work than "the target was
missed".

**The first of those four is now done (M13).** `mintplayer-qr-code` went **0% → 97.4% lines / 90.9%
branches** on 421 tests, and turned up two more silent defects — a CSS colour name parsing to fully
transparent black (an invisible QR code, logged nowhere), and a sparse-array `BitMatrix` whose `xor`
switched unwritten modules ON.

It also demonstrated something worth generalising from, because it is the opposite of the dock's
situation: **where a specification exists, testing untested code stops being guesswork.** Asserting
ISO/IEC 18004's own numbers — capacity Table 7, the mask formulas, the BCH minimum distances, and
Reed–Solomon's defining divisibility property — meant the tests could *disagree* with the
implementation, which is how the two defects surfaced. A suite that pinned current behaviour would
have frozen both of them in place. Where no such external truth exists, D8's "read the branch delta,
not the line delta" is doing much weaker work, and that difference should inform how much a coverage
number is worth per area.

**Two limits are structural rather than pending.** The dock element keeps ~950 uncovered lines that
are pointer and hit-testing paths against a jsdom tree where every rect is zero; per R3 they are not
faked, and they are covered by the four dock e2e specs instead. And e2e still contributes nothing to
the metric (F7), so ~6,500 lines of proven behaviour remain invisible to it.

## 7d. M14, and what the dock's ceiling actually is

M13 and M14 took the workspace to **74.59% lines** (17,860 / 23,944). The file-manager went
56.7% → 76.3% on its operations surface — new folder, rename, delete, clipboard, the context menu
and the icon-grid keyboard — none of which needed geometry; it had simply never been driven.

**The dock is the case worth generalising from, because its number barely moved.** 54 new tests over
what a drop DOES — which node moves where, the four split zones, tearing off to float, and that the
tree stays canonical after any sequence of moves — lifted the element from 48.5% to 49.2%. That is
not a failure of the tests. What remains uncovered is ~480 lines across `beginCornerResize`,
`handleCornerResizeMove`, `preparePaneDragSource`, `showDropIndicator`, `onIntersectionDoubleClick`,
`renderSnapMarkersForCorner`, the three hit-testers and the floating-resize handlers — every one of
them reading `getBoundingClientRect`, `elementsFromPoint` or pointer capture, all of which jsdom
reports as zero.

So the dock has a **real ceiling in the mid-fifties**, and a coverage target applied uniformly across
the workspace would push someone into faking rects to clear it. That is precisely R3's failure mode,
and it argues for something this PRD did not anticipate: **per-area expectations, not one number.**
A library with an external specification (qr-code: 97%) and a library that is mostly pointer
geometry (the dock: ~50%) are not measuring the same thing, and holding them to the same figure
rewards the wrong work in one of them.

Two dock behaviours were recorded rather than "fixed", both discovered by writing the tests:
floating the LAST pane is allowed and leaves an empty main area, which `handleDrop` has an explicit
branch to recover from; and the empty-window placeholder in `renderFloatingPanes` is unreachable,
because normalization drops any floating window whose root is null before it can render.

The distance to 80% is now two blocks rather than four: `mintplayer-ng-bootstrap` (1,611 uncovered,
the Angular wrappers) and `tools` (538, script shells). React wrappers (106) and the micro-libs
(142) are together about a point and cost an import each.

## 8. Risks

- **R1 — The number drops when D1/D3 land, and looks like a regression.** It is a denominator
  correction, not a loss. Land it as its own commit with the corrected baseline recorded in the PR
  body, before any test-writing milestone, so the drop is never entangled with real work.
- **R2 — A gate lands before the tests do, and blocks unrelated PRs.** The plan sequences the gate
  after the first substantive coverage milestones, and D2's patch-coverage rule means a PR touching
  no source is never blocked.
- **R3 — jsdom cannot exercise the layout code that holds the most uncovered lines.** Mitigated by
  D5 (extract pure logic); where extraction is not viable the lines stay uncovered and the target
  in §6 absorbs it. Do not fake `getBoundingClientRect` to manufacture coverage — a spec asserting
  against invented geometry tests nothing. **Applied in M6** beyond `getBoundingClientRect`: the
  ribbon's overflow algorithm reads `offsetWidth`/`clientWidth`, which jsdom reports as 0, so only
  its guard clauses are unit-tested and the measuring path stays with Playwright, against a real
  engine (see F7 — that path is already proven there, it simply moves no number).
- **R4 — Coverage targets incentivise assertion-free tests.** NG1 and D8 are the guard: review reads
  the branch delta, and `should create` specs move line coverage without moving branch coverage.
- **R5 — The upload's `fail-ci-if-error: true` makes a coverage-service outage block `deploy`.**
  Already flagged in the workflow's own comment (`publish-master.yml:78`). Adding a PR-side upload
  doubles the exposure; the PR step should be `fail-ci-if-error: false`.

## 9. Open questions

- ~~**Q1** Should the standalone micro-libs be in the ratchet at all?~~ **Resolved 2026-08-17 by
  the user: yes — all valid files are included.** Folded into D1. They are ~200 uncovered lines of
  mass, so they change the workspace percentage very little, but each needs its own
  `coverage.include` and several need a coverage block added from scratch (M1).
- ~~**Q2** Is the ribbon family (F2) worth a dedicated PR of its own?~~ **Resolved 2026-08-18: no.**
  Splitting would put the denominator correction (M1, which makes the number *drop*) and the largest
  single fill in separate PRs whose numbers only make sense read together, and the reviewability a
  split buys is discarded by the squash-merge anyway. Per-milestone commits carry the review
  structure instead.
- ~~**Q3** Does the coverage service support a patch/status-check API that GitHub can gate on?~~
  **Resolved 2026-08-17 by reading the service's source: no, and none is close.** There is no
  checks/status code anywhere in it, `/status`, `/pulls` and `/compare` all 404, and the only delta
  that exists is a per-request, never-persisted, list-relative display field. A check-run integration
  *is* designed in the service's own roadmap (T2.1, milestones M11.0–M11.6) but is gated behind two
  pending decisions and sequenced after five Tier 0/1 items.

  **Consequence for M11: the ratchet must be a workflow step comparing against the master figure**,
  built on the anonymous `/api/browse` endpoints. Patch coverage is not computable client-side and
  waits for upstream. This is specified in its own consumer-side document —
  [coverage-pr-gate.md](./coverage-pr-gate.md) and
  [coverage-pr-gate-plan.md](./coverage-pr-gate-plan.md) — which **replaces M11** of the plan.
