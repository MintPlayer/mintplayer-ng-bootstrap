# Plan — the second coverage pass (M19–M31)

Execution plan for `docs/prd/coverage-dock-and-tools.md`. Milestone numbering continues the
predecessor's (M1–M18 live in `docs/prd/test-coverage-plan.md`).

## Standing rules for this branch

- **Batch the suites.** Verify intermediate milestones by reading and `tsc --noEmit`. One baseline
  run (M19) and one sweep (M31). Commit per milestone regardless — PRs squash, so no intermediate
  commit has to be green.
- **`nx run-many -t test`, never root `npx vitest run`** — F19: the root config misses four
  projects including the web-components lib.
- **Windows:** `NX_ISOLATE_PLUGINS=false`, `NX_DAEMON=false`, vitest `--pool=threads`.
- **Path fixtures:** build with `join()` so each platform exercises its own separator; assert **only
  the posix-literal form** of derived output. Never write a backslash-literal fixture — on POSIX `\`
  is a legal filename character, and that test is green on Windows and red on Linux. (Proven in CI
  during M18; the M17 trap list's original advice was wrong and is annotated in place.)
- **`realpathSync` any `mkdtemp` path before comparing** — Windows returns a junction/short name.
- **Never `process.chdir()`** — process-wide under `pool: 'threads'`, corrupts sibling specs.

---

## M19 — Re-measure, and correct the register in place

**Why first:** every number in the PRD's §2 is either stale (predates M18) or arithmetic. And per
D12, the corrections must land before the work they justify, so the diff shows the reasoning.

1. `nx run-many -t test -p tools,mintplayer-web-components --coverage` for a true baseline; record
   `mint-dock-manager.element.ts` and `tools/` exactly. Resolve the 1,842-vs-2,606 coverable-line
   disagreement between the lcov and `test-coverage-plan.md` — one of them is wrong and the plan
   should say which.
2. Annotate `docs/prd/test-coverage.md` §7d and `docs/prd/test-coverage-plan.md`'s
   permanently-uncovered register **in place, with visible strikethrough**, for F11 (dead, not
   geometry), F12 (testable, not geometry) and F13 (ceiling ~84%, not mid-fifties).
3. Add `refresh-flags.mjs` to M17's ranking with the arithmetic that shows the breakdown did not sum
   (F14).
4. Rewrite the surviving register entries in D12 form: each names the **specific** platform call and
   line that blocks it, so the next reader can falsify it with one grep.

**Acceptance:** the two predecessor docs contain no uncorrected claim from F11–F14, and every
surviving "permanently uncovered" entry cites a call site.

---

## M20 — Dock: delete the dead feature, cover the barrels

**Files:** `mint-dock-manager.element.ts` (`:229`, `:236-286`, `:430-434`),
`mint-dock-manager.element.scss` (the `.dock-snap-marker` rules), `dock/**/index.ts`.

1. Remove `showSnapMarkers`, `renderSnapMarkersForCorner`, `clearSnapMarkers`, the
   `debug-snap-markers` branch, every call site, and the orphaned SCSS. Re-run `codegen-wc`.
2. Grep the demo apps and all three wrapper libraries to confirm nothing referenced it (already
   done once; repeat after the delete as the acceptance check).
3. Import the four `dock/**/index.ts` barrels from an existing spec so they leave 0%.

**Expected:** −37 from the denominator, +4 covered. **Acceptance:** `debug-snap-markers` returns
zero hits repo-wide outside `docs/`; the dock suite still passes.

---

## M21 — Dock: extract and test intersection sizing (F12, the big one)

**New:** `dock/src/core/intersection-sizing.ts` + `.spec.ts`.
**From:** `mint-dock-manager.element.ts:1165-1262`.

Move the pure half: pair parsing from `data-pairs` / `data-key`, the equalize closure, and the
store/restore bookkeeping. `pushSizesToSplitter` (`:1197-1210`) stays on the element — it is the only
part that touches a rect.

Spec against `node.sizes` only (D16). Branch coverage is the point (R6), so cover: stored vs
unstored restore, already-equal vs unequal, single-pair vs multi-pair, malformed `data-pairs`,
missing `data-key`, and a pair index out of range.

**Expected:** ~64 lines, ~14 cases. **Acceptance:** the new module is at 100%; the element's
double-click path is driven by at least one spec that goes through the element, so the wiring is
covered too and not just the extracted maths.

---

## M22 — Dock: lift the pure path/tree helpers

**Into:** `dock/src/core/layout-tree.ts` (100% today, 98-case spec).
**From:** `isOrIsAncestorOf` (`:3662-3678`), `countPanesInTree` (`:3680-3689`), `clonePath`
(`:3655-3660`), `resolveSplitNode` (`:3607-3620`, taking `rootLayout`/`floatingLayouts` as
parameters), `normalizeFloatingLayout` (`:3622-3642`).

**Expected:** ~68 lines relocated, ~20 of them newly covered. **Acceptance:** `layout-tree.spec.ts`
extended; no behaviour change (these are called from covered paths, so the existing dock suite is
the regression check).

---

## M23 — Dock: the geometry-free handlers

Specs only, no extraction. All of these touch no geometry whatsoever (F13's 376-line bucket):

| target | file:line | lines |
|---|---|---:|
| `onIntersectionKeyDown` — `data-pairs` parse + `resizeDividerBy` delegation | `:937-969` | 17 |
| `onFloatingResizeKeydown` | `:1333-1366` | 15 |
| `computeDropZone` sticky-zone branch | `:3276-3286` | 15 |
| `extractDropZoneFromEvent` composedPath branch | `:3296-3302` | 13 |
| `findDropZoneInTargets` / `findStackInTargets` | `:3555-3574` | 12 |
| `updateFloatingWindowTitle`, `activatePane`, `verifyProjectionSlots` | `:1669-1691`, `:3575-3606`, `:4160-4189` | 37 |
| `showDropIndicator` visibility half — assert `dataset['hidden']` | `:3459-3505` | ~46 |

The two keyboard handlers are APG paths, so they are an accessibility guarantee as well as coverage.
`verifyProjectionSlots` is reachable through the **already-observed** `debug-layout-integrity`
attribute.

**Expected:** ~155 lines. **Acceptance:** dock element ≥ 67%.

---

## M24 — `tools/`: the guard-and-parameterise pass (D13)

**No new specs. No coverage movement. This milestone exists to make the next four possible** (F17).

For each of `build-flag-loaders.mjs`, `build-hljs-loaders.mjs`, `build-phone-metadata.mjs`,
`build-web-components.mjs`, `refresh-flags.mjs`, `free-port.mjs`,
`check-code-snippet-hljs-lazy.mjs`, `check-ribbon-bundle-size.mjs`:

1. Hoist module-level `repoRoot` / path constants into function parameters, **defaulting to today's
   values** so every existing Nx target keeps working unchanged.
2. Put the body behind the guard, copied verbatim from `rebase-lcov-paths.mjs:97`:
   `import.meta.url === pathToFileURL(process.argv[1]).href`. Not an `endsWith` check — it breaks on
   drive letters and percent-escapes.
3. **`build-web-components.mjs:42-45` first** — its module-scope `process.exit(1)` kills the runner
   on import, so nothing in `tools/` can be safely imported until it moves inside `main()`.
4. Consolidate the four `writeIfChanged` copies (`build-flag-loaders.mjs:44`,
   `build-hljs-loaders.mjs:79`, `build-phone-metadata.mjs:125`, `refresh-flags.mjs:44`) onto the
   already-100% one in `lib/wc-codegen.mjs`.

The five `lit-ssr-utils/gen-*-chrome.mjs` are **not** in this milestone — a guard does not help them
(F17 grade 3); their extraction is M25.

**Acceptance:** `nx build mintplayer-web-components` still succeeds (it runs `codegen-wc`, i.e. the
riskiest script), and importing any touched script from a node REPL performs no work and exits 0.

---

## M25 — `tools/` T2: one chrome module instead of five copies

**New:** `tools/lit-ssr-utils/lib/chrome-module.mjs` + spec. **`.mjs`, inside an already-included
directory** — D14/F18. If it lands anywhere else the `coverage.include` widening ships in the same
commit.

Extract from all five generators: `extractDsdTemplate(html)` (the
`/<template[^>]*shadowrootmode[^>]*>[\s\S]*?<\/template>/` match, currently copied five times) and
`buildChromeModule(...)` (the `// AUTO-GENERATED` header plus either an array constant or named
`export const` lines), plus the `MAX_COUNT = 12` over-cap fallback.

Cases: match, no-match, nested templates, attribute-order variation, both emission shapes,
over-cap fallback.

**Expected:** ~58–68 lines (the honest band; M17's 60–70 slightly understates the per-file residue —
each generator keeps ~6–8 lines of import block, `dist` import, loop shell and `writeFile`).
**Acceptance:** all five generators import the shared module; `codegen-ssr-chrome` still produces
byte-identical output.

---

## M26 — `tools/` T3: the three codegen entrypoints

Depends on M24. Drive from `mkdtemp` (realpath'd) with injected paths.

- **`build-phone-metadata.mjs`** — richest seam and the only correctness-critical branch in T2–T6:
  `sliceFor` (`:69-79`), `chunkName` (`:82`), `blockModule` (`:84-96`), `loaderModule` (`:98-122`)
  are pure functions of a JSON object; test against a 3-country synthetic fixture with no filesystem
  at all. Then the **`SUPPORTED_FORMAT_VERSION` guard (`:136-143`)** — the only thing between a
  libphonenumber bump and silently wrong validation rules — the `'001'` pseudo-country filter
  (`:147-151`), and stale-chunk pruning (`:164-166`, which unlinks, so use a real temp dir).
- **`build-flag-loaders.mjs`** — missing-`assets` refusal (`:51-56`), empty-corpus refusal
  (`:63-66`), code derivation (`:58-61`), the posix-normalising `report()` (`:78-79`).
- **`build-hljs-loaders.mjs`** — `readCommonIds` (`:49-53`) as a pure regex over injected text,
  `collectAliases` failure collection (`:61-77`), and the **fail-loud-on-registration-failure**
  branch (`:98-102`), whose own comment explains that a silently-vanished grammar degrades to
  auto-detect at runtime. Note its header: aliases must come from the real `lib/core` — a mocked
  hljs throws `hljs.COMMENT is not a function`.

**Expected:** ~64–78 lines, ~30 cases.

---

## M27 — `tools/` T4: `build-web-components.mjs`

Depends on M24 (step 3 especially). Testable: `walk()` (`:47-64`, including the ENOENT-swallow
branch at `:52`), `findFiles` (`:66-73`), the `isElementHtml`/`isStylesScss` predicates (`:80,82`),
the posix normalisation in `processElement`/`processStyles` (`:128-129`, `:144`) and `runOnce`'s
reporting (`:168`, `:174`), the missing-sibling-`.scss` error (`:117-121`), the no-inputs early
return (`:160-163`), and `runOnce`'s changed/skipped accounting (`:165-183`) against a realpath'd
temp tree.

**Out:** `compileScss` (`:97-109`, runs real `sass` with three `loadPaths`) and `startWatchers`
(`:186-235`, chokidar + a 150 ms debounce with `inFlight`/`dirty` re-entrancy). The debounce state
machine is worth testing but needs an injected fake watcher and fake timers — record it as a
successor, do not attempt it here.

**Expected:** ~50–62 lines, ~15 cases.

---

## M28 — `tools/` T6 and the missing file (F14)

- Extract a shared `resolveBuiltEntry(candidates, repoRoot)` and `reportBundle(...)` into
  **`lib/bundle-audit.mjs`** (already 100%), covering `check-code-snippet-hljs-lazy.mjs` and
  `check-ribbon-bundle-size.mjs` at once. ~22–28 lines.
- `free-port.mjs`: export `parsePortArgs(argv)`; cover the
  `!Number.isInteger(port) || port <= 0` branch. ~4 lines, but it is a `dependsOn` of the demo's
  serve — cover it, do not exclude it.
- **`refresh-flags.mjs`** (F14): the `--only=` parser and `buildReadme` are pure, ~15–22 lines,
  ~8 cases. Its `execFileSync` tarball fetch is proposed as declared-0% (Q4) — record the decision
  in the register in D12 form, naming the call.

---

## M29 — The two Angular files the audits missed (F16)

- **`calendar-month.service.ts`** — 99 lines of pure date arithmetic at 2.1%. **Replace** the
  `should create` spec (D15), do not extend it. `weekOfYear` is an ISO-8601 week number with a UTC
  round-trip: test the year boundaries that break naive implementations (2026-01-01 is week 1;
  2021-01-01 is week 53 of 2020; 2020-12-31 is week 53). Then `getWeeks` across a month starting on
  a Sunday, a month starting on a Monday, a leap February, and a 6-row month; `getMondayBefore` /
  `getSundayAfter` when the date already is a Monday/Sunday; `dateDiff` across a DST boundary.
- **`instance-of`** — 13 files, 82 lines, 0%, zero specs. Structural directives plus a pipe; plain
  TestBed, no geometry, no web component. Cover `instanceof.directive.ts`, `instanceof-case`,
  `instanceof-default`, `switch-view.ts` and `instance-of.pipe.ts`.

**Expected:** ~130 lines. Both are the cheapest lines in the workspace and neither is in either
predecessor document's plan.

---

## M30 — Publish branch coverage (F15, D18)

The number exists in every lcov and is aggregated nowhere. Extend the existing rebase step's summary
(`tools/scripts/rebase-lcov-paths.mjs` already parses every report) to print per-project and total
**line and branch** figures, so both workflows surface it in the log. No gate, no threshold — F15 is
that the figure had no home, not that it needs enforcement.

**Acceptance:** a workflow run prints a branch total; the PRD's §2 table can be filled from CI
output rather than by hand-summing lcov files.

---

## M31 — Sweep, measure, and write down what moved

1. `nx run-many -t test --exclude=api --coverage --parallel=2` (all 14 projects).
2. `nx build mintplayer-web-components` — M24 and M27 touch the codegen every other suite's inputs
   depend on; the unit suites do not prove that path.
3. `node tools/scripts/rebase-lcov-paths.mjs` — must report all-rooted and exit 0.
4. Record final per-area numbers against §6's targets, including **branch coverage**, and note
   anything that missed and why.
5. Update this plan's milestone table with what actually happened, in the predecessor's style:
   corrections visible, failed guesses left in with the correction next to them.

---

## Milestone table

| M | scope | expected |
|---|---|---|
| M19 | Re-measure; correct the register in place | doc-only |
| M20 | Dock: delete `debug-snap-markers`; barrels | −37 denom, +4 |
| M21 | Dock: extract + test intersection sizing | +~64 |
| M22 | Dock: lift pure path/tree helpers to `core/` | +~20 |
| M23 | Dock: geometry-free handlers | +~155 |
| M24 | `tools/`: guard-and-parameterise | 0 (enabler) |
| M25 | `tools/` T2: shared chrome module | +~58–68 |
| M26 | `tools/` T3: three codegen entrypoints | +~64–78 |
| M27 | `tools/` T4: `build-web-components.mjs` | +~50–62 |
| M28 | `tools/` T6 + `refresh-flags.mjs` | +~40–54 |
| M29 | `calendar-month` service + `instance-of` | +~130 |
| M30 | Publish branch coverage | reporting |
| M31 | Sweep, measure, record | — |
