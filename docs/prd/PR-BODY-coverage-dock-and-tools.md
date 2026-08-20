# The second coverage pass: what the first map got wrong

Raises the dock element from **56.46% → 68.92%** lines and `tools/` from **25.82% → 58.00%**, and
starts publishing branch coverage — which had never been aggregated anywhere, and turned out to be
8.5 points under the project's own documented target.

But the number is not the point of this PR. The predecessor (#405) produced a *register of what is
permanently uncovered*, and that register is load-bearing: it is what stops the next person either
wasting a week on geometry jsdom cannot reach, or faking a `getBoundingClientRect` to clear a
target. Nobody had re-derived it since it was written.

**It was wrong in five places, and every error pointed the same way — toward declaring work
impossible that is not.** Nothing was found to be *harder* than recorded. That is a systematic bias
with an obvious mechanism: when a method resists a first attempt, "jsdom can't reach this" is a
satisfying and unfalsifiable place to stop.

## The five

**F11 — `debug-snap-markers` is dead code, filed as geometry.** `renderSnapMarkersForCorner` and
`clearSnapMarkers` both early-return on `showSnapMarkers`, whose only writer is the
`debug-snap-markers` branch of `attributeChangedCallback`. That attribute was never in
`observedAttributes`, so the branch never ran and the flag could never become true. 37 lines
unreachable behind a one-word omission, counted for years as an acceptable geometry loss. Deleted
rather than wired up (D11): making rect-reading debug rendering *reachable but still untestable* is
worse on every axis.

**F12 — `onIntersectionDoubleClick` was never blocked.** Its only rect call, `pushSizesToSplitter`,
self-guards at `containerSize <= 0`, so under jsdom it returns early and the other ~64 lines run
correctly. The register's test — *"terminates in a `getBoundingClientRect()`"* — is the flaw: it asks
whether a method **touches** geometry when the question is whether it **depends on the value**.

**F13 — the ceiling was mid-fifties; it is ~84%.**

**F14 — M17's `tools/` ranking never summed to its own measured total.** T1–T6 plus the accepted-0%
remainders account for 640 of 704 lines. The missing 64 are `refresh-flags.mjs`, the
second-largest uncovered file in the directory, ranked nowhere for three milestones.

**F15 — branch coverage is 65.83% and was reported nowhere.** Per the predecessor's own D8 it is
*the review metric*, and its M12 table says "not aggregated". The figure existed in every lcov the
workspace has ever produced. Nothing added it up.

Corrections land **in place, struck through, in the predecessor documents** — a register that has
been silently rewritten is worth less than one that shows its history. Every surviving entry is
rewritten in D12 form: it names the **specific** blocking call and line, so the next reader can
falsify it with one grep. "Geometry" is not a reason; `elementsFromPoint at :3540` is.

## Results

| target | baseline | final | |
|---|---:|---:|:--:|
| dock element lines | 56.46% | **68.92%** | ✅ ≥67% |
| dock element branches | 41.90% | **53.32%** | ✅ ≥50% |
| `tools` lines | 25.82% | **58.00%** | ✅ ≥55% |
| `tools` branches | 31.03% | **61.18%** | ✅ ≥50% |
| `tools` files at zero | 15 | **5** | ✅ ≤6 |
| `calendar-month` service | 2.1% | **100%** | ✅ ≥90% |
| `instance-of` | 0% | **98.7%** | ✅ ≥85% |

Workspace: **78.07% lines / 65.83% branches** over 1,405 files (78.31% / 66.43% excluding demo
apps). 14 projects green.

**The dock denominator fell 1842 → 1728.** 114 lines left the file — 37 unreachable, ~68 pure logic
lifted into `core/`, which was already at 100%. That is the honest direction, and the opposite of
what a coverage target usually incentivises.

## Two findings that outrank the percentages

**`refresh-flags.main()` was untestable by construction, and that hid a destructive path.**
`resolveSource` — the one dependency reaching the network and the `tar` binary — was called
unconditionally, so ~60 of the file's 64 lines could not run in a spec. Among them: the pruning
branch, which **unlinks committed SVGs**, with nothing guarding it. One defaulted parameter later,
the prune is exercised for the first time, including the ordering that makes the script safe (the
missing-flag refusal sits *above* the prune, so an upstream that returned nothing deletes nothing).

**`calendar-month.service.spec.ts` was the `should create` failure mode, committed and passing.**
Fourteen lines asserting `expect(service).toBeTruthy()` over 99 lines of pure date arithmetic,
measured at 1/48. It matters beyond the 47 lines: **a file with a spec looks tested**, which is why
no audit ever flagged it. Replaced wholesale (D15). `weekOfYear` is now verified against an
independent ISO-8601 implementation across every date from 2000 to 2040 — 14,976 dates, zero
mismatches.

## Things I got wrong, kept visible

- **A test of mine failed and was right to.** I asserted `extractDsdTemplate` handles a nested
  `<template>`; it does not — the quantifier is lazy, so the match ends at the *inner* close and
  returns unbalanced chrome. Latent (no shipped component does this) but a property of the regex,
  not of my fixture. Pinned as actual behaviour with the cause named.
- **A test of mine passed for the wrong reason.** `refresh-flags`' "leaves non-SVG files alone"
  never reached the prune: an empty fake upstream hits the missing-flag refusal first. Fixed by
  building a fake upstream carrying every dial-code flag.
- **M30 shipped a crash.** `const summaries = []` landed inside `rebaseLcov` instead of the CLI —
  both have an identical declaration block. All 33 specs passed, because the CLI sits behind the
  `isEntryPoint` guard precisely so tests don't import it. The guard that makes the module testable
  is what let it through; only a real invocation caught it.

## Safety of the refactors

`tools/` codegen and the chrome generators are what every other suite's inputs depend on, so both
were proven rather than assumed:

- All five `*-chrome.generated.ts` regenerate to the **same MD5** they had before M25's
  five-way deduplication. These artifacts are gitignored, so there is no diff to review — the hash
  comparison is the check that replaces one.
- `codegen-wc` regenerates **byte-identical** output with a generated file deleted first, so the
  *write* path is exercised and not only the skip path.
- Both bundle guards were run against the real `dist/`; output unchanged.

## Deliberately not done

Playwright → lcov (NG6) — the only thing that would reach the dock's residual ~266 rect-bound lines;
already scoped by the predecessor as its own PRD. The gate (NG7) belongs to `coverage-pr-gate.md`.
`scheduler` (577 uncovered), `ribbon` (281), `resizable` (132) and `color-picker` (118) are named as
successors rather than folded in (NG8).

**Open, deliberately unanswered:** 271 of the dock's remaining uncovered lines sit in members that
touch no geometry — but most are drag-flow tails reachable only *after* a rect-dependent gesture
starts. The recoverable remainder is materially smaller than 271 and larger than zero, and naming it
precisely needs work this PR did not do. Asserting a figure would repeat exactly the mistake the PR
is about.
