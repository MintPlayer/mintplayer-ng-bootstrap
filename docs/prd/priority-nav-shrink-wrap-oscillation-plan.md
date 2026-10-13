# Plan — Priority-nav shrink-wrap oscillation (#428)

**PRD:** [priority-nav-shrink-wrap-oscillation.md](./priority-nav-shrink-wrap-oscillation.md)
**Status:** Proposed (2026-10-13). Repro + fix spikes done (PRD §6); S1–S3 open.

| Milestone | Scope | PRD |
|---|---|---|
| G | Grill D1–D7 and record outcomes in the PRD | §4 |
| S | Spikes S1 (declarative host min-width), S2 (observe-size seed vs sticky-footer), S3 (Chromium + fractional DPR) | §7 |
| M1 | `overflow.ts`: `SUBPIXEL_TOLERANCE` in both comparisons (D5) + fixed-point unit harness | §4 D5, §8 |
| M2 | Measure row in normal flow + `:host { min-width: 0 }` (D1, D2); update the SCSS comment | §4 D1–D2 |
| M3 | Padded More clone in the measure strip; `moreWidth` reads it; drop the now-unused `#moreSize` sizer (D3) | §4 D3 |
| M4 | Host `min-width` floored at the measured More width, declaratively per S1 (D4) | §4 D4 |
| M5 | `BsObserveSizeDirective`: seed with the fractional content-box size (D6) + spec | §4 D6 |
| M6 | Demo: permanent "Inside a flex header" section (Spark header mirror) + block action-bar variant; snippets after demos | §8 |
| M7 | Specs: component spec (More clone, host min-width), e2e on chromium + firefox (zero mutations @1280/600/400, no clipping, collapse/recover, block bar stays start-aligned) | §8 |
| M8 | Batched sweep: `nx build mintplayer-ng-bootstrap`, `nx test mintplayer-ng-bootstrap`, ng demo e2e (both browsers); Firefox MCP re-check of the original repro labels | §8 |

## Conventions

- Branch `fix/priority-nav-shrink-wrap-428` off `master` — create only with permission.
- One PR for everything, including anything found on the way. Spark needs only a version bump after
  release (no code change, PRD §3).
- Commit per milestone; verify between milestones with `tsc --noEmit` and reading. **No test runs before
  M8** (spikes are measurements, not test runs).
- Push once, after M8 is green.

## Milestone notes

**M1.** `computeOverflowIds` stays pure. The harness models a shrink-wrapped host:
`strip(decision) = decision empty ? quantize60(Σ + gap·(n−1)) : Σvisible + more + gap·visible`.
Cases: the issue's numbers (63.733 / 59.3 / 75.733, More 76.017), the spike's
(63.69999695 / 48.53334045 / 67.73333740, More 76.0167), and a seeded randomized sweep of fractional
widths. Assert a fixed point within 2 iterations. Must fail without the tolerance (write it first,
confirm by reasoning, not by running).

**M2.** `.priority-nav-measure-wrapper`: remove `position/top/left/width`. Keep `height:0;
overflow:hidden; pointer-events:none`, `aria-hidden` + `inert`. `:host { display:block; min-width:0 }`.
Check the `position:relative` on `.priority-nav` is still needed (the overflow panel anchors to it — yes).

**M3.** A second `div.priority-nav-measure` row with
`<span #measureMore="bsObserveSize" bsObserveSize class="priority-nav-measure-item"><span class="priority-nav-more-toggle">…moreLabelTemplate ?? defaultMoreLabel, $implicit: false…</span></span>`.
The outer span has no padding, so its content box includes the toggle's padding. If the visible toggle's
styles are scoped to `button.priority-nav-more-toggle`, widen the selector so the clone gets identical
padding, border and font — the clone must be byte-for-byte the same box as the button.

**M4.** Start from S1's answer. Preferred: `host: { '[style.min-width.px]': 'moreMinWidth()' }`. Fallback:
`'[style.--priority-nav-more-width.px]'` + `:host { min-width: var(--priority-nav-more-width, 0) }`. No
imperative `style.minWidth` writes.

**M5.** Seed = `rect.width − paddingLeft − paddingRight − borderLeft − borderRight` (same for height).
Spec: an element with padding seeds the content-box value, fractional.

**M6/M7.** Labels `Refresh / Filter / Settings` reproduce at 1280 px in Firefox; keep them. The e2e
counts class mutations with a MutationObserver installed via `page.evaluate`, returns a number only.
Card-width sweep can be a handful of widths (e.g. 520 / 420 / 330 / 520), not the spike's 56.

## Risks

- **Shrink-to-fit ancestors** (inline-block, table cell, abs-pos) now see the host's max-content = Σ all
  items even while collapsed. That equals what they saw before when nothing overflowed; collapsing still
  requires a constrained slot. Acceptable; document in the demo.
- **D6 touches a shared directive.** sticky-footer only reads `height()`; S2 proves no visible change.
