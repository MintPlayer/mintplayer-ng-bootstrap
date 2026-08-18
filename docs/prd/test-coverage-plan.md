# Plan — raising and defending test coverage

PRD: [test-coverage.md](./test-coverage.md)
Status: **Not started** (2026-08-17). No branch, no PR — awaiting permission.

| Milestone | Scope | Uncovered lines addressed |
|---|---|---|
| M1 | `coverage.include` everywhere + demo apps out of the metric | denominator correction (~0 new coverage) |
| M2 | PR-side coverage measurement (no gate yet) | — |
| M3 | `tools/` project + test target; codegen helper specs | 3,438 currently untargeted lines |
| M4 | `apps/api` coverage collection + `TzDateMath` + controllers | ~2,183 untracked today |
| M5 | Free wins: ng pipes/directives with zero specs | ~120 |
| M6 | Ribbon family — wc elements + ng wrappers | ~286 + 32 invisible files |
| M7 | React/Vue behavioural specs | ~4,725 lines, currently 20 mounted components |
| M8 | Dock: extract pure logic, then test it | ~1081 |
| M9 | file-manager, timeline, splitter, tile-manager | ~766 |
| M10 | scheduler + scheduler-core + datatable branch coverage | ~988 |
| M11 | Turn on the ratchet gate | defends everything above |
| M12 | Single verification sweep | — |

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

## M2 — measure coverage on pull requests [PRD F3, D7, R5]

File: `.github/workflows/pull-request.yml:84`.

1. Add `--coverage` to the existing `nx affected --target=test` step.
2. Add an upload step using `MintPlayer/CodeCoverage/action@master` with a flag distinct from
   master's `unit`, **`finish: false`**, and **`fail-ci-if-error: false`** (R5).
3. Guard the step on `github.event.pull_request.head.repo.full_name == github.repository` — fork
   PRs get neither secrets nor an OIDC token (D7).

No gate yet. This milestone only makes the number visible to reviewers.

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

## M5 — the free wins [PRD F10]

~120 source lines, seven Angular entrypoints with zero specs and no TestBed requirement:
`slugify` (17), `linify` (17), `split-string` (13), `word-count` (20), `has-property` (10),
`has-id` (3), `viewport` (40).

Pure pipes and directives — call the transform, assert the output, including the edge cases
(empty string, null, unicode). These establish the spec conventions M5–M8 copy.

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

**Q2 is open:** at 32 files this may warrant its own PR. Decide before starting.

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

## M10 — scheduler, scheduler-core, datatable [PRD F4]

~988 uncovered lines, and the milestone most about **branch** coverage:

- `mp-scheduler.ts` — 81.7% by line but 262 uncovered; `input/input-handler.ts` at 43.6% (137);
  `views/day-view.ts` at 66.8%; `state/scheduler-state.ts` 45 uncovered; `drag/drag-manager.ts`
  at 36.4%.
- `scheduler-core` — 67.4%; `services/position.service.ts` at **2.3%** (42 uncovered) and
  `utils/dom.ts` at **0%** (28) are the two clearest pure-logic wins in the repo.
- `mp-datatable.ts` — 73.0%, 196 uncovered.

Start with `position.service.ts` and `utils/dom.ts` — pure, near-zero, and cheap.

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

Confirm against PRD §6: lines ≥80%, branches ≥72%, zero executable files absent from the report,
≤4 Angular entrypoints without specs, API collected at ≥60%, a `tools/` test target exists, and the
10 largest React and Vue wrappers each have a behavioural spec.

Then push, once, and read the single run.
