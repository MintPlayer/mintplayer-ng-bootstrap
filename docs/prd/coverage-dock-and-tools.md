# PRD — the second coverage pass: what the first map got wrong

**Status:** Proposed · 2026-08-20
**Predecessor:** `docs/prd/test-coverage.md` + `docs/prd/test-coverage-plan.md` (M1–M18, merged as PR #405 / `d7ffc768`)
**Sibling:** `docs/prd/coverage-pr-gate.md` (the ratchet; not in scope here)

## 0. How this document numbers things

This PRD **continues the predecessor's registers rather than restarting them**. Findings begin at
**F11**, decisions at **D11**, risks at **R6**, goals at **G6**, non-goals at **NG6**, milestones at
**M19**. There is exactly one F7, one D5, one R3 across both documents, and a citation never needs to
say which file it came from. Where this document contradicts the predecessor, it says so explicitly
and the predecessor is annotated in place — corrections are not made silently.

---

## 1. Problem

The predecessor took the workspace from an invisible ~73% to a measured **76.23%** and, more
importantly, made the denominator honest. It also produced a *map*: a per-area register of what was
covered, what was cheap, and — the part this PRD is about — what was declared **permanently
uncovered**.

That register is load-bearing. It is what stops the next person from either wasting a week on
geometry jsdom cannot reach, or faking a `getBoundingClientRect` to clear a target (R3). But a
register of impossibilities is only as good as its accuracy, and **nobody had re-derived it since it
was written.**

Four parallel investigations re-derived it. The map is wrong in five places, and — this is the
finding that motivated the whole document — **every single error points the same way: toward
declaring work impossible that is not.** Nothing was found to be *harder* than recorded. Five things
were found to be easier, dead, or simply missing from the ranking.

That is a systematic bias, not five coincidences, and it has an obvious mechanism: when a method
resists a first attempt, "jsdom can't reach this" is a satisfying and unfalsifiable place to stop.
The predecessor already caught one instance of exactly this and wrote the lesson down (§7c, on
`@lit/react`): *"a limitation that applies to everything uniformly is more likely a configuration
fault than a platform fact."* The lesson was recorded and then not re-applied to the register it was
derived next to.

## 2. Baseline

`dock` and `tools` were **re-measured on this branch** (`feat/coverage-dock-and-tools`, from
`d7ffc768`). Figures marked *(stale)* come from the committed `coverage/` tree, which predates M18
and understates three libraries by construction; they are shown only where nothing better exists.

| area | lines | % | branches | uncovered lines | note |
|---|---|---:|---:|---:|---|
| workspace, excl. demo apps | 18,039 / 23,940 | 75.35% | — | 5,901 | *(stale)* service reports 76.23% over a different file set |
| **workspace branches** | — | — | **63.54%** | — | **never before aggregated — see F15** |
| `mintplayer-web-components` | 13,338 / 16,768 | 79.54% | 66.51% | 3,430 | measured |
| `dock` (whole area) | 1,264 / 2,070 | 61.1% | — | 806 | `core/` is 100%; the gap is one file |
| ⤷ `mint-dock-manager.element.ts` | 1,040 / 1,842 | **56.46%** | **41.90%** | **802** | measured |
| `tools` | 189 / 732 | **25.82%** | 31.03% | 543 | measured, post-T1/T5 |
| `ng-bootstrap` (Angular wrappers) | 3,287 / 4,894 | 67.2% | 48.2% | **1,607** | *(stale)* worst branch coverage of any real library |

**A denominator disagreement, resolved.** `test-coverage-plan.md` records the dock element at
**54.12% / 1,195 uncovered of ~2,606**; the lcov says **56.46% / 802 of 1,842**. The lcov is
authoritative — it is what the upload and the service consume. The plan's larger figure is most
likely a v8 *statement* count taken from `coverage-final.json` rather than an lcov *line* count
(v8's statement map is consistently denser than its line map), but that is an inference and the
original measurement cannot be reproduced. It is annotated as unreproducible rather than quietly
replaced.

The two areas the request names — the dock element and `tools/` — are the #1 and #3 uncovered-line
masses in the workspace. They are also the two areas where the map is most wrong, in opposite
directions: the dock's ceiling is *lower* than a naive reading suggests and its recoverable half is
*larger*; `tools/` has no ceiling at all and a missing entry.

---

## 3. Findings

### F11 — `debug-snap-markers` is dead code, filed as geometry

`renderSnapMarkersForCorner` (`mint-dock-manager.element.ts:236-279`) and `clearSnapMarkers`
(`:281-286`) both begin `if (!this.showSnapMarkers) return;`. `showSnapMarkers` is private
(`:229`) and has exactly one writer: the `debug-snap-markers` branch of `attributeChangedCallback`
at `:430-434`. But `observedAttributes` (`:87-89`) returns
`[...super.observedAttributes, 'layout', 'debug-layout-integrity']`.

**`debug-snap-markers` is not observed, so that branch never executes, so the flag can never become
true.** Verified repo-wide: outside those five lines the attribute name appears nowhere — not in a
demo page, not in a wrapper, not in a spec, not in the SCSS's authoring comments. Contrast
`debug-layout-integrity`, which *is* observed and *is* wired through the Angular wrapper
(`dock-manager.component.ts:45-47`).

The predecessor's permanently-uncovered register lists `renderSnapMarkersForCorner` (33 lines) under
"geometry". It is not geometry. It is 37 lines of unreachable code behind a one-word typo, and it
has been sitting in the denominator being counted as an acceptable loss.

### F12 — `onIntersectionDoubleClick` is testable today, and is the largest single misfiling

Registered as permanently uncovered (68 lines, "geometry"). Its only geometry contact is
`pushSizesToSplitter` (`:1197-1210`), which **self-guards at `containerSize <= 0` (`:1204`)**. In
jsdom that guard is taken, `pushSizesToSplitter` returns early, and the rest of the method — pair
parsing from `data-pairs`/`data-key` (`:1167-1192`), the equalize closure, the store/restore
bookkeeping (`:1212-1258`) — runs correctly and mutates `node.sizes`.

So roughly **64 of the 69 lines execute under jsdom's real zeros**, and asserting on `node.sizes`
asserts on the actual output, not on invented geometry. Only `:1205-1209` stays dark. This is not an
R3 exception; R3 is not engaged at all, because nothing is faked.

The same shape recovers ~46 lines of `showDropIndicator`'s visibility half (assert
`dataset['hidden']`) and ~15 of `handleCornerResizeMove`.

### F13 — the dock's real ceiling is ~84%, not "mid-fifties"

Bucketing all 802 uncovered lines by whether the enclosing method's body touches
`getBoundingClientRect` / `elementsFromPoint` / `offset*` / `client*` / pointer capture:

- **376 lines touch no geometry at all** — plain dataset parsing, delegation, state updates.
- **426 lines touch geometry**, but ~125 of those *execute correctly on zeros* (F12).

That leaves **~300 lines — about 16% of the file — genuinely e2e-only**: the `beginCornerResize`
cluster, `ensureHeaderDragPlaceholder`, `updatePaneDragDropTargetFromPoint`, `findDropZoneByPoint`
(`elementsFromPoint`), `preparePaneDragSource`, `beginFloatingResize`, and the drag-gesture tails.
Those stay uncovered and this PRD does not touch them.

The predecessor's "real ceiling in the mid-fifties" (§7d) was measured against the wrong
classification. The honest ceiling is **~84%**; a pragmatic target is **~68%**.

### F14 — M17's `tools/` breakdown does not sum to its own total

M17 measured `tools/` at 166/704 and ranked T1–T6. Adding it up: 166 hit + T2 (98) + T3 (104) +
T4 (96) + T6 (51) + T5 (18) + the two declared-0% remainders (`serve-api` 66, `dev-processes` 41)
= **640 of 704**.

The missing **64 lines are `tools/scripts/refresh-flags.mjs`** — 205 physical lines, 0% covered, the
second-largest uncovered file in the directory, larger than any single T3 item, and ranked nowhere.
Its only mention in the plan is a passing list of "script shells" (`test-coverage-plan.md:674`).

### F15 — branch coverage is 63.54% and is reported nowhere

The predecessor's D8 says branch coverage is *the review metric* and §6 targets **72%**. Its M12
table records branches as "not aggregated", and no workflow, no config and no document has
aggregated them since. Summing all 14 lcov files gives **10,201 / 16,054 = 63.54%** — an **8.5-point
miss against the document's own target, invisible because nobody added it up.**

`ng-bootstrap` is the concentration: **48.2% branches** against 67.2% lines. Within it,
`offcanvas` (5.2%), `context-menu` (0%) and `tooltip` (13.6%) are the floor.

### F16 — the `should create` failure mode is already in the tree

`calendar-month/src/service/calendar-month.service.spec.ts` is fourteen lines: a `TestBed.inject`
and `expect(service).toBeTruthy()`. Behind it sits **99 lines of pure, dependency-free date
arithmetic** — `getWeeks`, `weekOfYear` (an ISO-week implementation with a UTC round-trip),
`getMondayBefore`, `getSundayAfter`, `dateDiff`, `chunk` — measured at **1/48 lines, 2.1%**.

This is precisely what NG1 forbids and R4 predicts, committed and passing. It matters beyond the 47
lines: the spec's existence is why no audit flagged the file. **A file with a spec looks tested.**
The predecessor's own §6 scorecard marks "Angular entrypoints with zero specs: 18 → ≤4" as met — but
eight `ng-bootstrap` entrypoints have zero spec files today (`tree-select`, `scheduler`, `timeline`,
`code-snippet`, `file-manager`, `navbar`, `dock`, `carousel`), and `instance-of` — 13 files, 82
lines, pure structural directives and a pipe, no geometry, no web component — has never been
scheduled by any milestone despite being named in both F1 and F10.

### F17 — fifteen of sixteen uncovered `tools/` files run work at import time

Only `rebase-lcov-paths.mjs:97` and `serve-api.mjs:229` carry the ESM entrypoint guard. Every other
uncovered file executes its body on import, and three grades of severity exist:

1. **Merely unguarded** — `main().catch()` at module scope (all three T3 scripts, `refresh-flags`).
2. **Destructive** — `build-web-components.mjs:42-45` calls **`process.exit(1)` at module scope**
   when argv is empty. Importing it from a spec kills the test runner. (`lib/wc-codegen.mjs:4-7`
   exists because of this and says so.)
3. **Structurally unimportable** — all five `lit-ssr-utils/gen-*-chrome.mjs` do a *top-level `await
   import()` of a built `dist/` bundle* plus `install-global-dom-shim.js`, which mutates globals
   process-wide. No guard fixes these; the pure logic must be lifted out before a spec can exist.

**This is a milestone, not a per-spec footnote.** The predecessor's T2/T3/T4 estimates price the
specs and not the refactor that has to precede them.

### F18 — the include glob makes extraction a trap

`tools/vitest.config.ts:24` scopes `coverage.include` by extension *and* directory:
`['scripts/**/*.mjs', 'vite/**/*.mts', 'lit-ssr-utils/**/*.mjs']`.

Extracting logic into a `lib/chrome-module.ts` moves those lines **out of the denominator**.
Coverage would rise, and nothing would have been tested. This is the same class of error the
predecessor's entire F1 was about, and it is aimed squarely at the one milestone whose design is
"extract a shared module".

### F19 — root `npx vitest run` silently skips four of fourteen projects

`vitest.config.ts:13-20` globs `apps/*/vitest.config.ts` and `libs/*/vitest.config.ts`. But
`mintplayer-web-components`, `mintplayer-react-bootstrap` and `mintplayer-vue-bootstrap` keep their
test config in `vite.config.mts`, and `tools/` is under neither `apps/` nor `libs/`. A root vitest
run therefore excludes the largest source of coverage in the repo. Nx `run-many -t test` is
unaffected and is the only correct invocation.

---

## 4. Goals

- **G6 — Correct the map, in place.** Every misfiling in F11–F14 is fixed in the predecessor
  documents where it was written, with the correction visible rather than edited away. A register of
  impossibilities that has been silently rewritten is worth less than one that shows its history.
- **G7 — Recover the dock's misfiled lines** without faking geometry, taking
  `mint-dock-manager.element.ts` from 56.5% toward ~68%.
- **G8 — Land the open `tools/` items** (T2, T3, T4, T6) plus F14's missing `refresh-flags.mjs`,
  taking `tools/` from ~26% to ~55–60%.
- **G9 — Report branch coverage**, and fix the worst concentration of it that is cheap to fix.
- **G10 — Delete what is dead** rather than covering it. F11's 37 lines leave the denominator as
  removed code, not as tested code.

## 5. Non-goals

- **NG6 — Not building the Playwright→lcov path.** ~6,500 lines of proven e2e behaviour sit outside
  the metric and the predecessor already scoped this as its own PRD
  (`test-coverage-plan.md:431-436`). It is the only thing that would reach F13's residual ~300
  lines. Out of scope here, and this PRD does not pretend those lines are recoverable without it.
- **NG7 — Not touching the gate.** `coverage-pr-gate.md` owns it, and it is blocked upstream.
- **NG8 — Not chasing the remaining large areas.** `scheduler` (577 uncovered), `ribbon` (281),
  `resizable` (132), `color-picker` (118) are real and are named in §9 as successors. Folding them
  in would make this PRD unreviewable.
- **NG9 — No new test framework, no browser mode, no per-file threshold.** Inherited unchanged from
  NG1/NG3.

## 6. Targets

| metric | baseline | target |
|---|---:|---:|
| `mint-dock-manager.element.ts` lines | 56.46% | **≥ 67%** |
| `mint-dock-manager.element.ts` **branches** | 41.90% | **≥ 50%** |
| `tools` lines | 25.82% | **≥ 55%** |
| `tools` **branches** | 31.03% | **≥ 50%** |
| `tools` files with zero coverage | 15 | **≤ 6** |
| `calendar-month` service lines | 2.1% | **≥ 90%** |
| `instance-of` lines | 0% | **≥ 85%** |
| workspace branch coverage, **published** | not reported | **reported every run** |
| misfilings in the permanently-uncovered register | 5 | **0** |

No workspace-percentage target is set. Per §7d of the predecessor, one number across areas with
different physical ceilings rewards the wrong work; the per-area figures above are the commitment.

---

## 7. Decisions

- **D11 — Delete dead code; never cover it.** F11's `debug-snap-markers` feature is removed, not
  wired up. Wiring it up would mean adding an unobserved attribute to `observedAttributes` so that
  37 lines of rect-reading debug rendering become *reachable but still untestable* — strictly worse
  than today on every axis. If the feature is wanted later, it returns as a deliberate change with a
  demo page and an e2e, not as a coverage artifact.

- **D12 — Re-derive a "permanently uncovered" claim before trusting it, and record the method.**
  F11–F13 all survived years of review because the register was prose. Each entry in the corrected
  register names the *specific* platform call that blocks it, so the next reader can falsify it in
  one grep. "Geometry" is not a reason; `elementsFromPoint at :3540` is.

- **D13 — The `tools/` guard-and-parameterise refactor is its own milestone, landing before any
  `tools/` spec.** F17 makes it a prerequisite for all four remaining items, it touches sixteen
  files uniformly, and mixing it into per-item spec commits would make each one unreviewable. It
  moves no coverage number by itself, and that is expected.

- **D14 — Extracted `tools/` helpers land as `.mjs` inside an already-included directory.** F18.
  Where that is not natural, the `coverage.include` widening lands **in the same commit** as the
  extraction, never after.

- **D15 — Prefer deleting a `should create` spec's file over leaving it.** F16's spec is replaced,
  not extended. A truthiness assertion next to real ones is a false signal about what the suite
  checks, and it is the reason the file was never audited.

- **D16 — Assert on the non-geometric output of a geometry-adjacent method.** F12's method runs
  correctly under jsdom's zeros; the spec asserts `node.sizes` and `dataset['hidden']`. This is
  **not** an R3 exception and must not be cited as precedent for one: R3 forbids *inventing* a rect,
  not *executing* a method that reads a real zero. The distinction is that the assertion never
  mentions geometry.

- **D17 — Extract from the element only where the logic is already pure.** D5 inherited. F12's
  intersection sizing and the four path/tree helpers move to `core/`, which is at 100% and has a
  standing spec. Nothing that reads `this.` beyond a plain field moves.

- **D18 — Publish branch coverage in the same step that publishes lines.** F15 exists because the
  number had no home. A figure nobody prints is a figure nobody defends.

---

## 8. Risks

- **R6 — The recovered dock lines are shallow.** F12's method is 69 lines of bookkeeping; a spec
  that drives it end-to-end and asserts one array could move 64 lines while checking little.
  *Mitigation:* D8 inherited — the review metric is the branch delta, and the equalize/restore pair
  has real branching (stored vs unstored, equal vs unequal, single vs multi-pair) that a lazy spec
  will not move.
- **R7 — The `tools/` refactor changes behaviour of scripts that CI depends on.** These are the
  codegen and bundle-audit scripts; a broken `build-web-components.mjs` breaks every downstream
  suite's inputs, and a broken `rebase-lcov-paths.mjs` silently corrupts the coverage upload.
  *Mitigation:* the refactor is mechanical (hoist constants to parameters with the existing values
  as defaults, add the guard) and every touched script is exercised by an existing Nx target; the
  final sweep runs a real WC build, not only the unit suites.
- **R8 — Deleting `debug-snap-markers` removes a debugging aid someone uses.** *Mitigation:* it has
  never worked. There is no version of this repo in which it functioned, since the attribute was
  never observed.
- **R9 — This PRD's own map is wrong the same way the last one was.** It is the same method — four
  agents, one document — that produced the register being corrected. *Mitigation:* the predecessor's
  own rule, M14b: **"a delegated coverage map is a lead, not a result."** F11 and F16 were re-derived
  by hand against the source before being written here; F13's ~300-line residual is the number most
  likely to be wrong, and it is stated as an estimate. The final sweep measures rather than asserts.
- **R10 — Correcting five errors in a predecessor document reads as criticism of it.** It is the
  opposite: the register was worth having, which is why it was worth checking. A map nobody could
  falsify would have produced no findings at all.

## 9. Successors, named rather than implied

In descending uncovered mass, and explicitly not in this PRD: `scheduler`'s input/drag layer (577,
`input-handler.ts` and `drag-manager.ts` are state machines and D5 applies cleanly);
`ng-bootstrap`'s overlay trio `offcanvas`/`context-menu`/`tooltip` (187, and the worst branch
coverage in the repo); `resizable` (132, absent from both documents); `color-picker` (118, part
canvas); `ribbon`'s remaining overflow algorithm (281, mostly a genuine `offsetWidth` ceiling); and
the eight zero-spec Angular entrypoints from F16. Plus the one that would move everything:
**Playwright → lcov** (NG6).

## 10. Open questions

- **Q4 — Should `refresh-flags.mjs`'s fetch half be declared permanently uncovered?** It shells out
  to fetch a pinned `country-flag-icons` tarball. Its shape matches `serve-api.mjs`, which *is* so
  declared. This PRD covers the pure half (argv parsing, `buildReadme`) and **proposes** declaring
  the rest 0% by intent — flagged rather than assumed, because F14 is a caution against registers
  written without re-derivation.
