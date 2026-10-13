# Plan — Priority-nav shrink-wrap oscillation (#428)

**PRD:** [priority-nav-shrink-wrap-oscillation.md](./priority-nav-shrink-wrap-oscillation.md)
**Status:** Implemented (2026-10-13) on `fix/priority-nav-shrink-wrap-428`. D1–D7 adopted as
recommended without grilling (the user asked to start implementing). Local sweep results below; the
GitHub workflow is the final verdict.

| Milestone | Scope | PRD | Status |
|---|---|---|---|
| G | Grill D1–D7 | §4 | Skipped — adopted as recommended |
| S | S1 (declarative host min-width), S2 (sticky-footer), S3 (Chromium) | §7 | Resolved / reasoned, see PRD §7 |
| M1 | `overflow.ts`: `SUBPIXEL_TOLERANCE` in both comparisons (D5) + fixed-point unit harness | §4 D5, §8 | Done |
| M2 | Measure row in normal flow + `:host { min-width: 0 }` (D1, D2); SCSS comment updated | §4 D1–D2 | Done |
| M3 | Padded More clone (`.priority-nav-more-toggle-box`) in the measure strip; `moreWidth` reads it; `moreSizer` removed (D3) | §4 D3 | Done |
| M4 | Host `min-width` = measured More width via a host binding (D4) | §4 D4 | Done |
| M5 | `BsObserveSizeDirective`: `contentBoxSize` seed, skipped on the server (D6) + spec | §4 D6 | Done |
| M6 | Demo: "Inside a flex header" section (Spark header mirror, resizable) + block action-bar variant | §8 | Done |
| M7 | Specs: overflow harness, observe-size, component spec, e2e on chromium + firefox | §8 | Done |
| M8 | Batched sweep | §8 | Done locally — see below |

## Local sweep (M8)

- `nx build mintplayer-ng-bootstrap` — green.
- `nx test mintplayer-ng-bootstrap` — 1328 / 1329. The one failure was a 5 s import timeout in the
  untouched `_conformance/entrypoints.spec.ts` while the build ran alongside; alone it passes 101 / 101.
- `playwright test e2e/priority-nav.spec.ts` (production build, chromium + firefox, fully parallel):
  - Run 1 surfaced two real bugs, both fixed: the start-alignment assertion forgot the demo box's 1 px
    border (`clientLeft`), and the observe-size seed called `getComputedStyle` during SSR.
  - Run 2: Firefox all green. Chromium: the four settle/collapse tests counted 25–33 class mutations in
    the 1 s window (constant across widths, so a one-off burst, not a per-frame flip). Alone against the
    dev build the same test counted 0, and a manual Chromium check on the dev build counted 0; the user
    verified the behaviour by hand. Left for the CI run to confirm (PRD §7 S3).

## Conventions

- One PR for everything. Spark needs only a version bump after release (no code change, PRD §3).
- Commit per milestone; verify between milestones with `tsc --noEmit` and reading; test runs batched at
  the end.
- Push once.

## Implementation notes

**M1.** `computeOverflowIds` stays pure. The harness models a shrink-wrapped host:
`strip(decision) = decision empty ? quantize60(Σ + gap·(n−1)) : Σvisible + more + gap·visible`.
Cases: the issue's numbers, the spike's float32 numbers, and 500 seeded random fractional layouts. It
asserts the settled **state** (nothing overflows), because without the tolerance the loop can also
settle collapsed although everything fits.

**M3.** The clone must not carry `.priority-nav-more-toggle`: it precedes the button in DOM order and
would capture every query for the toggle. Box styles are shared by a selector list instead.

**M5.** `getComputedStyle` used size rather than `getBoundingClientRect` (transforms). Server: no seed,
size stays `undefined`.

**M6/M7.** Labels `Refresh / Filter / Settings` (they reproduce at 1280 px in Firefox). The e2e helper
waits 10 frames, then counts class mutations for 1 s and returns a number. The collapse test sets the
card to 330 px and back.

## Risks

- **Shrink-to-fit ancestors** (inline-block, table cell, abs-pos) now see the host's max-content = Σ all
  items even while collapsed. That equals what they saw before when nothing overflowed; collapsing still
  requires a constrained slot.
- **D6 touches a shared directive.** sticky-footer only reads `height()` and ignores `undefined`.
