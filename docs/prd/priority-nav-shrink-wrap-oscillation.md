# PRD — Priority-nav oscillates when its host shrink-wraps (#428)

**Issue:** [#428](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/428)
**Plan:** [priority-nav-shrink-wrap-oscillation-plan.md](./priority-nav-shrink-wrap-oscillation-plan.md)
**Status:** Implemented (2026-10-13). Reproduced in Firefox; fix spiked and measured (§6); D1–D7 adopted
as recommended. Results of the local sweep in the plan.
**Scope:** `@mintplayer/ng-bootstrap/priority-nav` (Angular only — there is no `mp-priority-nav` WC and no
React/Vue port) and, for one decision, `@mintplayer/ng-bootstrap/observe-size`.

## 1. Problem

A `bs-priority-nav` whose host is sized by its own content — a flex item at the default `flex: 0 1 auto`
with no definite width — never settles in Firefox. Every animation frame it alternates between "all items
inline" and "last item in the overflow, More toggle shown". In production (seotester, the Spark
`spark-query-card` "Sites" header) the whole card jumps 9 px per frame because the More toggle (40 px) is
taller than the `btn-sm` buttons (31 px). Version 22.22.0.

### 1.1 Root cause (confirmed in code and in Firefox)

`overflowingIds` (`priority-nav.component.ts:113-125`) feeds `computeOverflowIds` (`overflow.ts:47-67`) with
`stripWidth` read from the **visible** strip. When the host shrink-wraps, that width is the width of the
strip's *current content*, i.e. a function of the previous decision. The decision feeds its own input:

1. **All items visible** → strip width = Σ items, so "everything fits" is an exact-equality test decided by
   rounding. Measured: Σ measure widths `179.96667480` vs strip `179.96665955` (float32 noise, 1.5e-5 px) →
   "overflows".
2. **Two items + More** → strip = 188.25 > 179.97 → "everything fits" → back to 1. Forever.

Firefox's 1/60-px app units, separately-rounded measure widths and the integer `clientWidth` seed of
`BsObserveSizeDirective` decide which way step 1 falls; Chromium happens to fall on "fits". With integer
widths nothing oscillates (measured: 0 mutations) — the sub-pixel shortfall is what *enters* the loop, the
shrink-wrap is what *sustains* it.

### 1.2 Related defects found on the way (all in scope — one PR)

| # | Defect | Evidence |
|---|---|---|
| R1 | `moreWidth` comes from the **visible** More toggle: it is `0` while More is `display:none`, so the first overflow decision reserves no room for More — a second feedback path. | `component.ts:58,120`, `html:47-49` |
| R2 | `BsObserveSizeDirective` reports `contentRect` (content box), but seeds with `clientWidth` (integer, incl. padding). The More button has `padding: .5rem .75rem`, so `moreWidth` is ~24 px short after the first RO tick. | `observe-size.directive.ts:17-19,30`, scss `:60` |
| R3 | Consequence of R2, visible today in the **basic demo at 600 px**: 6 items + More need 562 px, the strip is 548 px — More is clipped. | spike measurement |
| R4 | A shrink-wrapped nav can **never collapse**: the host's `min-width: auto` resolves to all items (they are `flex-shrink: 0`), so in a 330 px card the header overflows by 103 px instead of the nav collapsing. | spike measurement |

## 2. Goals

- G1. The overflow decision reaches a fixed point within a couple of frames in every layout context, every
  engine, every zoom/DPR — no state whose own rendering contradicts it.
- G2. A shrink-wrapped nav collapses into More when its slot gets narrow, and recovers when it widens.
- G3. More is never clipped (correct reservation, also in the non-shrink-wrapped case — R3).
- G4. **No visual change for existing consumers**: Spark's card header keeps its actions right of the
  `me-auto` caption; Spark's two block-level action bars and the three demos stay start-aligned.
- G5. Regression coverage: a pure fixed-point unit test and a Firefox e2e test on a demo that mirrors the
  Spark header.

**Non-goals:** an alignment (`justify`) input — not needed once G4 holds without one (§4 D1).

## 3. Consumers (survey)

| Consumer | Parent | Host today |
|---|---|---|
| Demo ×3 (`apps/ng-bootstrap-demo/.../priority-nav`) | block `div.demo-box` | full width, items start |
| Spark `spark-query-card` header | `d-flex align-items-center gap-2`, `span.me-auto` caption, nav, optional search box `flex: 0 1 14rem` | **shrink-wrapped flex item — the bug** |
| Spark `spark-po-detail` action bar | block `div.spark-actionbar` | full width, Back/Edit/Delete start |
| Spark `spark-query-list` action bar | block `div.spark-actionbar` | full width, New/Edit/Delete start |

Spark lives in `C:\Repos\MintPlayer.Spark` (`libs/node_packages/ng-spark`). It needs **no code change**
for this fix — only the ng-bootstrap version bump; it applied no workaround.

## 4. Decisions

### D1 — Break the loop by making the host's *natural* width state-independent (not by filling the slot)

The issue suggests `:host { flex: 1 1 auto; min-width: 0 }` + strip `width: 100%` + items at the end.
**Rejected**, measured (spike A1): it still oscillates at 600 px (the grown size still depends on the
basis, which depends on the state), the buttons jump left next to the caption (`me-auto` loses its free
space), and "justify end" would move every start-aligned consumer (§3). An alignment input would be
needed to undo the damage.

**Adopted:** put the measure row back into **normal flow at height 0** (drop `position:absolute; top:0;
left:0; width:0` from `.priority-nav-measure-wrapper`, keep `height:0; overflow:hidden;
pointer-events:none`, the wrapper's `aria-hidden` + `inert` and the inner `visibility:hidden` as today;
`overflow:hidden` on the wrapper still keeps the measure row out of the document's `scrollWidth`, which
is what the absolute positioning was for — update that SCSS comment). Its max-content is Σ all items whatever the decision, so the
host's flex basis — and therefore the strip width the decision reads — no longer depends on the decision.
Block parents are unaffected (the host is already full width there).

### D2 — `:host { min-width: 0 }` (as built: the `0` fallback of D4's custom property)

Lets the shrink-wrapped host shrink below its content so the nav can collapse (R4). Alone (spike A2) it
oscillates and then gets *stuck* fully collapsed after widening; with D1 it collapses and recovers.

### D3 — Measure the real More button, padded, and never as 0

The spike measured a clone of the More toggle in the measure strip. **Revised after review:** a clone
is a `span` while the toggle is a `<button>`, so the browser's button styles and any consumer CSS on
`.priority-nav-more-toggle` reach only the real one — the measured width could silently drift from the
rendered one and clip More. (A clone carrying the toggle's own class would instead capture every
`querySelector('.priority-nav-more-toggle')`, since it comes first in DOM order.)

**As built:** no clone. The real button sits in a `span.priority-nav-more-slot` that carries
`bsObserveSize`; the slot has no padding, so its content box is the button's border box — padding,
button UA styles and consumer CSS all count. With nothing to show, the slot gets
`.priority-nav-more-slot-idle` (`position: absolute; visibility: hidden; pointer-events: none`) instead
of `display: none`: out of flow (no room in the strip, nothing added to the host's width), out of the
tab order and the accessibility tree, but still laid out, so `moreWidth` is never 0 (R1). The idle
slot's containing block is `.priority-nav` (the strip is not positioned), so it never adds to the
strip's scroll width. The width is measured with the button's real label, so a `moreLabelTemplate`
that renders differently when open is measured as rendered. The public `moreSizer` field is replaced
by a public `moreWidth` computed; the button's `priority-nav-hidden` class is replaced by the slot's
idle class.

### D4 — Host `min-width` = measured More width

With D2 the host may shrink below the More toggle and clip it. Floor the host at More's measured width.
The spike wrote `style.minWidth` from an `effect` because a `[style.min-width.px]` host binding "did not
update". A host binding does update (the first implementation used `[style.min-width.px]` and the
spec confirmed it). **Revised after review:** an inline `min-width` beats any consumer rule short of
`!important`. **As built:** the host binding sets only a custom property,
`'[style.--priority-nav-more-width]': 'hostMinWidth()'` (`"<n>px"`, or `null` without items), and the
stylesheet declares `:host { min-width: var(--priority-nav-more-width, 0) }`, so a consumer's own
`min-width` rule on `bs-priority-nav` can still compete in the cascade. The `0` fallback is D2.

### D5 — Sub-pixel tolerance in both comparisons

`overflow.ts:51` and `:55` compare with `<= stripWidth + SUBPIXEL_TOLERANCE` (exported const, `0.5`).
Not a band-aid here: D1–D4 without it are stable but **wrong** (spike "D4 without epsilon": 1 of 3 items +
More in a 179.97 px host, because float noise makes the fitting state read as overflowing). 0.5 px is
below one device pixel at DPR ≤ 2 and above every rounding source measured (≤ 1/60 px app units, float32,
integer seed ±0.5 is removed by D6).

### D6 — `BsObserveSizeDirective`: one box model for seed and updates

The integer `clientWidth` (padding-box) seed vs fractional `contentRect` (content-box) updates is a latent
inconsistency for every consumer (priority-nav, sticky-footer). Seed with the same quantity the
ResizeObserver reports: the fractional content-box size. Keeps the public meaning (content box) and
removes the ±0.5 px seed jitter.

**As built:** an exported `contentBoxSize(el)` reads the used `width`/`height` from `getComputedStyle`
(not `getBoundingClientRect`, which a CSS transform would scale while `contentRect` is not), subtracts
padding and border for `box-sizing: border-box`, and falls back to `clientWidth − padding` where the
used size is `auto` (non-replaced inline elements). The seed is **skipped on the server**:
`ngAfterViewInit` also runs during SSR, where there is no layout and no `getComputedStyle` (the first e2e
run logged `ReferenceError: getComputedStyle is not defined` from the SSR server). The server size now
stays `undefined` instead of `0`; priority-nav guards every read with `isServerSide`, and sticky-footer
already ignores `undefined`, so its server `marginBottom` stays unset (it was `0`).

### D7 — No hysteresis

Spike C (stay overflowed unless everything fits with More's width freed) stops the loop but is stuck at
2/3 + More at 1280 px — wrong final state. D1 removes the cause, so no state is needed; `computeOverflowIds`
stays a pure function.

## 5. API / behaviour changes

- No new inputs/outputs. Visual change only where the old output was wrong: More no longer clipped (the
  basic demo at 600 px now shows 5/8 inline instead of 6/8 with a clipped More), and shrink-wrapped navs
  now collapse instead of overflowing their parent.
- `computeOverflowIds` gains tolerance; `SUBPIXEL_TOLERANCE` exported alongside it.
- `BsPriorityNavComponent.moreSizer` (public field) is gone; `moreWidth` (computed) replaces it. An idle More button is no longer `.priority-nav-hidden`; its new wrapper `.priority-nav-more-slot` gets `.priority-nav-more-slot-idle`.
- The host's floor comes from `--priority-nav-more-width` in the stylesheet, so a consumer `min-width` rule can override it.
- `@mintplayer/ng-bootstrap/observe-size` exports `contentBoxSize`; the directive no longer seeds a size
  on the server.
- Release as a **patch/minor fix** of `@mintplayer/ng-bootstrap`; Spark bumps the dependency.

## 6. Spike results (Firefox, DPR 1)

Repro: Spark header copy, labels `Refresh/Filter/Settings` → ~270 class mutations in 1.5 s at 1280 px.

| Spike | Oscillates | Final state | Narrow header |
|---|---|---|---|
| Baseline | yes | — | never collapses, header overflows |
| A1 fill slot `flex:1 1 auto; min-width:0` | yes @600 | buttons jump left | collapses, More clipped |
| A2 `min-width:0` only | yes @1280 | — | collapses, stuck collapsed after widening |
| B epsilon only | no | correct | never collapses |
| C hysteresis | no | **wrong** (2/3 + More @1280) | — |
| D1 measure row in flow + `min-width:0` | yes | — | collapses + recovers |
| D2 = D1 + epsilon | no | correct | More clipped |
| D3 = D2 + padded More clone | no | correct | clipped only below More's width |
| **D4 = D3 + host min-width = More** | **no** | **correct** | **collapses, never clips, recovers** |
| D4 without epsilon | no | **wrong** (1/3 + More) | — |

D4: 12 label sets × 56 card widths (300–520 px, 4 px steps) + 1280→600→400→1280 sweep: 0 mutations, card
header actions stay right of the caption, block action bar stays start-aligned.

## 7. Follow-up checks

- **S1 (host binding)** — resolved: the declarative host binding works (D4 "as built").
- **S2 (sticky-footer)** — reasoned rather than measured: `.footer` has no padding or border of its own,
  so the content-box seed differs from the old `clientHeight` seed only by sub-pixel rounding, and the
  first ResizeObserver tick already reported the content box before. Server: see D6.
- **S3 (Chromium)** — checked by hand on the dev build: 0 class mutations in the flex-header demo after a
  1280 px resize. Checked by hand by the maintainer in the browser as well. One observation stays open
  (§8): in a local run of the whole e2e file against the **production** build, with every test in
  parallel, the Chromium settle tests counted 25 class mutations (33 in the collapse test) in the 1 s
  window, constant across widths — a one-off burst, not a per-frame flip (that would be ~60). The same
  test alone against the dev build counted 0, and Firefox passed in that same run. CI decides.

## 8. Testing

- **Unit (`overflow.spec.ts`)** — a fixed-point harness: `stripWidth(decision)` modelling a shrink-wrapped
  host (no overflow → quantize60(Σ + gaps); overflow → visible Σ + More + gaps), iterate
  `computeOverflowIds`, assert a fixed point within 2 steps for the issue's numbers and the spike's
  numbers, plus a randomized sweep of fractional widths. Fails on master, passes with D5 (the layout parts,
  D1–D4, are covered by e2e).
  **As built:** the harness asserts the *settled state* (nothing overflows — the host is unconstrained),
  not only that it settles: without the tolerance the loop can also settle in the wrong state, collapsed
  although everything fits, which a settle-count assertion would pass.
- **Unit (`observe-size`)** — `contentBoxSize` keeps the fractional used size of a content-box element
  and subtracts padding + border for a border-box one (D6).
- **Component spec** — the real More button is measured through its slot, which idles (never
  `priority-nav-hidden` / `display:none`) when nothing overflows; the host's
  `--priority-nav-more-width` follows the measured width and no inline `min-width` is written.
- **e2e (`priority-nav.spec.ts`, runs on chromium + firefox)** — on the new "Inside a flex header" demo
  section: zero class mutations over 1 s at 1280 / 600 / 400 px; the strip + More never exceed the host
  (no clipping); narrowing the card collapses into More and widening restores all items; the block action
  bar's first item stays at the bar's left edge.
- **Demo** — permanent section mirroring the Spark header (this is where the repro lives)
  plus the block action-bar variant, demo-then-snippet order.

## 9. Accessibility

An idle More toggle is `visibility: hidden` (via its slot) instead of `display: none`: both remove it
from the tab order and the accessibility tree, so nothing changes for assistive technology or
keyboard users. No change to the disclosure pattern, roles, names or keyboard behaviour.

Known, out of scope: the More toggle (`padding: .5rem .75rem`) is taller than `btn-sm` items, so a
header like Spark's grows by ~9 px when something overflows. That is now a one-time change instead of
per-frame jitter; consumers can size the toggle through `.priority-nav-more-toggle`. The stabilised layout removes a WCAG 2.3.x-adjacent
problem (content moving every frame) for the affected consumers.
