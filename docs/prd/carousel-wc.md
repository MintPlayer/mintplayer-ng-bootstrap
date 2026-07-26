# PRD — `mp-carousel` web component + cross-framework wrappers (v2)

Status: **as built (2026-07-26)** — Phase 0 spikes passed 18/18 (Chromium + Firefox, verdicts in §8);
implementation landed on `feat/carousel-wc`. Two deviations discovered during implementation:

1. **DSD handoff is always destructive** (also under React/Vue's `lit-element-hydrate-support`):
   unlike navbar/shell's static branch-free chrome, the carousel's `render()` is legitimately
   state-dependent (count-dependent parts, the play/pause branch, interactive viewport
   attributes), so lit's true hydration throws structural mismatches. `createRenderRoot`
   reads the checked-radio index, clears the inert chrome, adopts styles manually, and returns
   the root directly (bypassing hydrate-support's hydrate flag). Verified live: zero console
   errors, no duplicated chrome, pre-upgrade slide preserved.
2. **Config is attribute-only on purpose — no prototype properties** (except `interval`/`paused`
   + the `index` accessor): `@lit/react` strips prototype-matching props from server HTML to set
   them as client properties, which erased exactly the attributes the no-JS CSS and injector
   select on. Framework property bridges flow through attributes instead (React facade emits
   attribute-shaped props; Vue's in-element check falls through to attributes).
Branch: `feat/carousel-wc` (fresh from `master`; supersedes the abandoned `feat/carousel-web-component` / PR #388)
Companion plan: `docs/prd/carousel-wc-plan.md`

## 1. Problem

The carousel is the last swipe-driven component still implemented purely in Angular
(`libs/mintplayer-ng-bootstrap/carousel` + `@mintplayer/ng-swiper`). A first migration attempt
(PR #388) built a working `mp-carousel` but accumulated structural debt — a margin-animated flex
track, a hand-written DSD string builder diverging from `render()`, `cloneNode(true)` loop clones,
ARIA regressions — and was abandoned. Meanwhile the navbar/shell/dropdown-menu migrations (PRs
#390/#391) established a cleaner house pattern (generated attribute-independent DSD chrome,
CSS-state-machine no-JS tier, shell's "CSS is the single source of truth" discipline) that the
old branch predates.

This PRD restarts the migration from scratch on that newer pattern.

## 2. Goals

1. **`<mp-carousel>`** — one framework-agnostic Lit element supporting `animation="slide|fade|none"`
   × `orientation="horizontal|vertical"`, autoplay with pause, indicators, prev/next, touch swipe,
   keyboard navigation, and consumer-authored slides as plain light-DOM children.
2. **Height contract (established, user-confirmed):**
   - horizontal + fade → `.carousel-inner` height = height of the **current** slide;
   - vertical → `.carousel-inner` height = height of the **largest** slide, always
     (ResizeObserver stores all slide heights; further computation derives from that set).
3. **Interactive no-JS tier (Tier 1), radio-driven** — the carousel keeps *functioning* with
   JavaScript disabled: prev/next (with wrap-around), indicators, and keyboard slide selection,
   via visually-hidden radios + `<label for>` + `:checked` CSS, as master's `isServerSide` branch
   does today — but inside the shadow root, without a second template.
4. **Full screen-reader compliance** (APG carousel pattern), meeting or exceeding master's
   tested ARIA contract (§7).
5. **Minimal code duplication** — the successor to master's template-unification refactor
   (`e8c96856`): slide content, indicators, and controls are each authored in **exactly one**
   place (§5.6).
6. **Reusable swipe logic** — a framework-agnostic `@mintplayer/web-components/swiper-core`
   designed for two consumers: this carousel and a future **fullpage** component. No swipe code
   hard-coded into `mp-carousel`.
7. **Delete `@mintplayer/ng-swiper`** from the workspace and deprecate it on npmjs.com.
   `observe-size` relocates to a new `@mintplayer/ng-bootstrap/observe-size` entry (its only
   remaining consumers, `priority-nav` and `sticky-footer`, are Angular components).
8. **Wrappers + demos + e2e** in all three frameworks (Angular reclaims `bs-carousel`; React and
   Vue get their first carousel), following the navbar deletion doctrine: breaking change, no
   shims, same PR.

## 3. Non-goals

- **The fullpage component itself.** It ships as a follow-up; here it is a named second consumer
  that shapes the swiper-core API (§6). The wheel/trackpad arbiter it needs is *designed for*
  (intent-based input API) but implemented with fullpage.
- **No-JS touch swipe.** Master's no-JS tier has none either; the radio machine covers
  pointer + keyboard.
- Fixing the pre-existing packaging gaps found during investigation (react/vue published subpath
  exports expose only `.`; `<name>/ssr` sub-entries aren't published). Tracked, not in scope.
- A standalone verification harness — verification happens through wrappers + demo apps
  (established feedback).

## 4. Locked decisions (confirmed with the user this session)

| # | Decision |
|---|----------|
| 1 | Fresh branch `feat/carousel-wc` from master; PR #388 is reference material only. |
| 2 | Modes: fade + slide (horizontal and vertical). `none` is kept (cheap: a zero-duration slide). |
| 3 | Height contract as in Goals §2.2. |
| 4 | `@mintplayer/ng-swiper` is deleted + npm-deprecated; swipe logic lives in `web-components/swiper-core`, reusable by a future fullpage component (delegated decision, made). |
| 5 | No-JS support is a hard requirement and is radio-driven (as on master). |
| 6 | Code duplication to an absolute minimum (successor to commit `e8c96856`). |
| 7 | Phase 0 spikes before implementation, specifically for projecting slides into the right places across shadow/light DOM (throwaway proofs, Chromium + Firefox). |
| 8 | Full ARIA / screen-reader compliance is a must. |

## 5. Core architecture

### 5.1 One element, slides as light DOM

`<mp-carousel>` is a single element (no `mp-carousel-slide` child element). Slides are the
consumer's direct children — an `<img>`, a `<div>`, anything:

```html
<mp-carousel animation="slide" orientation="horizontal" interval="4000" indicators aria-label="Animal photos">
  <img src="/assets/resized/deer.png" alt="A deer">
  <img src="/assets/resized/duck.png" alt="A duck">
</mp-carousel>
```

Inside the shadow root, **each slide gets its own wrapper cell** (`.carousel-item`) — the single
highest-leverage reversal of the old branch's design. The wrapper cell:

- restores styling control over slide *contents* (`::slotted` reaches only one level; the old
  branch's bare-slot design made `<div><img></div>` slides unstylable);
- is where the WC owns per-slide ARIA (`role="group"`, `aria-roledescription="slide"`,
  `aria-label="N of M"`, `aria-hidden` on non-visible slides) without mutating consumer DOM;
- re-establishes master's `.carousel-item > * { width: 100% }` sizing mechanism that makes
  image heights resolve from intrinsic aspect ratio.

**How slides reach their cells is the Phase 0 spike S1** (§8): imperative slot assignment
(`attachShadow({ slotAssignment: 'manual' })` + `slot.assign()`) vs. stamping `slot="s0…sN"`
attributes onto light-DOM children. Constraint that rules the choice: with manual assignment,
**unassigned children render nothing**, and DSD cannot express manual assignment — so the no-JS
tier must work through a default slot and the upgraded element must take over without flash or
duplication (spike S2). If both mechanisms fail the constraint, the fallback is the old branch's
bare default slot + a documented "slides must be single elements" contract (losing nested-content
styling, keeping ARIA via stamped attributes on the slotted elements themselves).

### 5.2 Track mechanics: transform, not margins; grid, not absolute

The autopsy traced most of PR #388's band-aids to two mechanisms. Both are replaced:

- **Slide mode: `transform: translate3d()` on a `.carousel-track`.** Compositor-accelerated, no
  layout thrash, no secondary margin, no %/px unit swap mid-transition. The engine emits a
  unit-free `offsetRatio`; the element maps it to `translateX(-ratio * 100%)` (horizontal) or
  `translateY` against the fixed cell height (vertical).
- **Fade mode: CSS grid stacking** (`grid-row: 1; grid-column: 1` for every cell, opacity
  transition on the active one) — master's own noscript technique. No `position: absolute`,
  no promote-active-to-relative, and the container stays sized by its content.
- **`none`: the slide path with duration 0.**

Mode and orientation are **host attributes selected by CSS** (`:host([animation="fade"])`,
`:host([orientation="vertical"])`) over one shadow template — never parallel markup. This is
also what makes the DSD chrome generatable (§5.5).

**Wrap-around** renders two offside clone cells (last-before-first, first-after-last) so a
wrapping slide animation has something to slide onto. Clones are **shadow-side duplicate cells,
not `cloneNode(true)` of consumer DOM** — spike S3 decides between duplicate slot projection and
reorder-on-commit; `cloneNode` is explicitly rejected (drops listeners, duplicates ids).
Clone cells are `aria-hidden="true"` and unlabelled, per master's contract.

### 5.3 Height: one custom property, no feedback loops

- One ResizeObserver observes **the slotted slide elements only** — never `.carousel-inner` or
  anything whose size the component writes (the old branch's ratchet bug came from observing
  written-to elements). Image late-loads are covered because a decoding `<img>` resizes its slide.
- Measured heights feed two published CSS custom properties on the host:
  `--mp-carousel-viewport-height` (current-slide for horizontal/fade, max for vertical) and
  `--mp-carousel-slide-height` (vertical only; pins every cell to the max).
- **The same measured height is the vertical distance unit** for drag deltas and transition
  distances (master's §2e coupling, made explicit): engine math and layout read one value, so
  they cannot disagree.
- Fallback floor (`200px` until a valid ≥10px measurement exists) is kept from master.
- The no-JS tier cannot measure; it sizes intrinsically (grid-stack = tallest slide). The
  height discontinuity on upgrade in horizontal mode **exists on master today** and is accepted
  and documented, not "fixed" by holding the no-JS tier to a contract CSS can't meet.

### 5.4 No-JS tier: the radio machine, in-shadow, same markup as the JS path

Master's mechanism is ported into the shadow root and de-duplicated:

- N visually-hidden radios (**`visually-hidden` clip pattern, not `d-none`** — this makes the
  radio group focusable, and native radiogroup arrow-key behavior gives no-JS keyboard slide
  selection for free; master's tier is keyboard-dead and that is treated as a bug, not behavior
  to preserve).
- Indicator labels and prev/next labels (`<label for>` with modulo wrap-around) — rendered
  **once**, not per-slide: master needed the O(n²) per-slide indicator duplication because
  `:checked` only reaches *following* siblings; placing radios first among siblings inside the
  shadow root removes that constraint.
- Visual treatment with JS off: fade → grid-stack crossfade (as master). Slide → radio-driven
  `transform` on the track via per-index rules (`#r2:checked ~ .carousel-inner .carousel-track
  { transform: translateX(-200%) }`), which CSS-transitions into an actual slide animation —
  spike S4 validates this, with **crossfade-for-all-modes as the fallback** (that is exactly
  master's behavior: its noscript branch never reads `animation`).
- Radio-group name and label ids need no instance scoping — the shadow root scopes both. This
  silently fixes master's two-carousels-on-one-page collision; a two-carousel e2e pins it.
- `wrap` remains always-on in the no-JS tier (modulo labels; master parity). The `wrap`
  attribute governs the JS tier only.
- Autoplay, `interval`, `paused`, swipe are inert with JS off (impossible without script).
- **Takeover:** `connectedCallback` sets `data-js`; every no-JS-only rule is gated on
  `:host(:not([data-js]))`. The radios/labels are the *same nodes* the upgraded component keeps
  using (indicator clicks check the radio; the element listens to `change`), following shell's
  "the CSS lever is the single source of truth, JS reads it back" discipline — the element's
  `index` getter derives from the checked radio, not from a parallel JS state machine.

Unlike master, the tier does not require SSR to exist: a CSR page with JS disabled still shows
the slides (light DOM + default slot in the DSD chrome), and with SSR + DSD it is fully
interactive. Master's `@if (isServerSide)` fork — which renders *nothing* on a no-JS CSR page
and structurally conflicts with `provideClientHydration` — is deleted, along with the
`bsNoNoscript` gymnastics for the carousel's case.

### 5.5 SSR chrome: generated, not hand-written — with one open question

House pattern (navbar/shell/dropdown-menu): build-time `@lit-labs/ssr` render of the element →
`mp-carousel-chrome.generated.ts` (gitignored) → regex injector `injectMpCarouselDsd()` composed
into all three demo SSR entries. `createRenderRoot` uses the shared DSD-handoff base; no
hand-written parallel markup (PR #388's divergent string builder is the anti-pattern).

**The open question (spike S2): the radio machine is slide-count-dependent, but the house chrome
is a count-independent constant generated from an empty element.** Candidate resolutions, to be
settled by the spike:

1. **Injector counts and splices.** The chrome constant is the count-independent skeleton; the
   injector counts the element's light-DOM children *in the HTML string it already processes*
   (like navbar's `markSubmenus` structural scan) and splices N radios/labels + per-index rules
   into designated marker positions. No `slide-count` attribute, no wrapper-side slide counting
   (the old branch needed three framework-specific implementations of "count the slides" — all
   deleted).
2. **Pre-rendered count variants.** The generator renders the element at counts 1…12 via lit-ssr
   (keeping `render()` as the single source of truth) and the injector picks by counted children,
   falling back to inert chrome above the cap.

Either way the *source of truth stays `render()`*; option 1's splice fragments must be derived
from the same template (generated at build time alongside the chrome), not hand-authored.

### 5.6 Code-duplication budget (hard rule)

Successor to `e8c96856` ("1 client-side location + 1 SSR location = 2 total"): the WC targets
**1 total** per concern.

| Concern | Authored in | Count |
|---|---|---|
| Slide content | consumer's light DOM | 1 |
| Shadow template (all modes × orientations) | `render()` (modes are CSS-selected host attributes) | 1 |
| Indicators / prev/next / radios / play-pause | `render()` — the DSD chrome is *generated from it*; the JS path *adopts the same nodes* | 1 |
| Index state | the checked radio (CSS lever), read back by JS | 1 |
| Height | measured set → two custom properties consumed by both layout and motion | 1 |

Any change that reintroduces a parallel template (per-mode branches, a hand-written DSD, a
JS-side index shadowing the radio state) fails review against this table.

## 6. `swiper-core` — designed for two consumers

**Build-vs-buy (user raised swiper.js, decision delegated + made): hand-rolled.** The carousel's
actual need is ~300 dependency-free lines (pointer arbiter + index machine, fully unit-tested).
swiper.js is itself a full carousel (wrapping it inside `mp-carousel` doubles the abstraction),
ships far more code than is ever exercised here, has no DSD/no-JS story (it would fight the
radio machine and slot-projected cells head-on), and doesn't encode the Firefox-Android PTR
defence this repo already paid for. Leanness is an explicit user requirement.

`libs/mintplayer-web-components/swiper-core/` (naming precedent: `scheduler-core`,
`timeline-core`). Two composable pieces, **not** one engine class — the autopsy's 60/40 verdict
made the monolith shape the root cause of the old API's carousel leakage:

1. **Input arbiters** emit semantic intents (`next`, `previous`, `dragBy(ratio)`, `commit`,
   `cancel`) and never touch DOM events directly (coordinates in, "you should preventDefault"
   out):
   - **Pointer arbiter** — salvaged near-verbatim from the old branch's `SwipeEngine` input half:
     the 3px orientation-dominance lock (Firefox Android APZ/pull-to-refresh fix), tap-vs-swipe
     discrimination, synchronous start-point shadow copy. Ships now, with its ported vitest spec.
   - **Wheel arbiter** — *interface defined now, implemented with fullpage* (momentum-delta
     accumulation → one advance, cooldown, deceleration rejection).
2. **Index/transition machine** (optional piece): `previous/next/goto(i, {animate})/setIndex`
   over a plain `count`, **`wrap` clamping inside the machine** (the old branch enforced wrap
   outside it and silently lost it for keyboard + swipe — a real bug), unit-free **`offsetRatio`**
   as the only positional output (what a transform track wants and what any second consumer can
   use), configurable `durationMs`, reduced-motion → duration 0 inside the machine, the
   `runAnimation → {finish, cancel}` interruption contract, and a data-table keymap (orientation-
   aware arrows + Home/End; `preventDefault` only for handled keys).

Explicitly **not** in swiper-core (carousel-specific, lives in `mp-carousel`): offside-clone
bookkeeping, the per-slide height apparatus, fade choreography, the 20ms programmatic-navigation
delay (deleted outright), `aria-keyshortcuts` string building.

Also carried over from master's four-layer pull-to-refresh defence (PRs #291/#293/#297):
`touch-action: pan-y|pan-x` per orientation on the track, `overscroll-behavior: contain` on
track + viewport, manual non-passive `touchmove` listeners, and the directional lock. These are
documented as a unit — no single layer was sufficient.

## 7. ARIA contract (hard requirement)

Meets or exceeds master's unit-tested contract; APG carousel pattern:

- Host/region: `role="region"`, `aria-roledescription="carousel"`, `aria-label` passthrough.
- Viewport (`.carousel-inner`): `tabindex="0"`, `aria-orientation`, `aria-keyshortcuts`
  (`ArrowLeft ArrowRight Home End` / `ArrowUp ArrowDown Home End`; omitted when
  `keyboard-events` is off), `aria-live` computed `off` while auto-rotating and `polite`
  otherwise (no interval / paused / reduced-motion), `aria-busy` while animating.
- Per slide cell: `role="group"`, `aria-roledescription="slide"`, `aria-label="N of M"` over the
  non-clone ordinal; clone cells `aria-hidden="true"` with label/roledescription suppressed;
  non-visible slides hidden from the accessibility tree.
- Keyboard: orientation-aware arrows, Home/End, only-consumed keys `preventDefault`; keydown
  target guard (APG) so focusable slide content doesn't trigger navigation.
- Autoplay: APG-mandated pause control — default icon button in shadow (`aria-pressed`,
  visible whenever `interval > 0`), overridable via a named `play-pause` slot; rotation stops on
  `prefers-reduced-motion` and while paused. Closes the "carousel play/pause" item on the ARIA
  follow-ups list.
- First slide's image gets `fetchpriority="high"`, the rest `low` (restores master's LCP
  behavior the old branch dropped).
- No-JS tier keeps region + per-slide group semantics (they're in the generated chrome) and adds
  the focusable radiogroup.

## 8. #1 risk — read before implementing

**Slide projection & DSD handover (spikes S1/S2).** Everything else in §5 has a proven precedent
in this repo; per-slide shadow cells over slotted light DOM combined with a count-dependent
interactive DSD does not. The four spikes (throwaway, under `docs/prd/_spike-carousel-*`,
verified Chromium + Firefox, deleted before merge — only conclusions flow back into this PRD):

| Spike | Question | Verdict (2026-07-26, 18/18 green Chromium + Firefox) |
|---|---|---|
| S1 — projection | Manual slot assignment vs `slot`-attribute stamping | **PASS — both work**, incl. reactive add/remove (MutationObserver → re-stamp). **Stamping chosen** (symmetric pre/post upgrade, DSD-compatible); manual assignment is the proven fallback. Its "unassigned children render nothing" hazard confirmed — reinforces default-slot DSD. |
| S2 — DSD handover | Default-slot DSD chrome (with radios) upgrading into per-slide cells | **PASS.** No-JS tier fully interactive pre-upgrade: crossfade, indicators, prev/next with wrap-around (per-index reveal of a linear label set — no O(n²)), and **native radiogroup arrow keys work with JS off** (they even wrap). Upgrade: checked-radio index read before `replaceChildren`, restored after; exactly one chrome; same radios drive the transformed track post-upgrade. `::slotted(:nth-child(i))` per-index reveal confirmed in both browsers. |
| S3 — wrap clones | Wrap without `cloneNode` | **PASS — slot reassignment.** Slide 0's light node teleports into the after-last cell for the wrap animation, snaps home on commit; light DOM untouched (still N children), wrap cell empty afterwards. |
| S4 — no-JS slide translate | Radio-driven `transform` per-index rules with JS off | **PASS horizontal** (track width = viewport width, so `translateX(-i*100%)` is exact). **Vertical: fallback to crossfade** — `grid-auto-rows: 1fr` + `translateY(calc(-i*100%/N))` moves exactly one cell, but the viewport's own clip height (= one cell) cannot be derived without measurement, and a CSS-only tier cannot measure. Crossfade ≥ master (master crossfades *every* mode with JS off). |

Risk table for everything else:

| Risk | Mitigation |
|---|---|
| `animation`/`orientation` hot-swap on a live instance (the ng demo binds both to selects) | attribute-driven CSS + reactive clone add/remove; e2e exercises all four combos on one instance |
| Vertical measurement error desyncing motion (height = distance unit) | single custom property consumed by both; vitest on the machine's ratio math |
| Bootstrap utilities absent in shadow (`d-grid` et al.) | every utility used by master's templates gets an explicit rule in `carousel.styles.scss` (inventoried in the plan) |
| Firefox flex-shrink on indicators | `flex: 0 0 auto`; Firefox in every e2e project |
| Old branch's unresolved review findings (reconnect re-init; injector regex breaking on `>` in attribute values) | engine re-init on `connectedCallback`; hardened injector regex; both pinned by tests |
| `paused-change` echo on programmatic writes | single write path with an `emit` flag (navbar's `#setExpanded` pattern) |

## 9. Public API

### `<mp-carousel>`

| Surface | Name | Notes |
|---|---|---|
| attr | `animation` = `slide` (default) \| `fade` \| `none` | CSS-selected |
| attr | `orientation` = `horizontal` (default) \| `vertical` | CSS-selected |
| attr | `interval` (ms) | absent/0 = no autoplay |
| attr | `wrap` (default true; `wrap="false"` opts out) | JS tier only; enforced in the index machine |
| attr | `indicators` (presence) | |
| attr | `keyboard-events` (default true) | |
| attr | `paused` (presence) | reflected |
| attr | `aria-label` | region label |
| prop | `index` (get/set; setter = `goto(i, {animate: false})`) | getter reads the checked radio |
| methods | `previous() next() goto(i, opts?) play() pause() togglePaused()` | |
| events | `slide-change {index}`, `paused-change {paused}` (user intent only), `animation-start`, `animation-end` | `bubbles: true, composed: true`, typed details |
| slots | default (slides), `play-pause` (custom pause control) | |

### Wrappers

- **Angular `bs-carousel`** (reclaims the selector): attribute-bridging wrapper — `input()`s →
  `computed()` attr signals → `[attr.x]` bindings; `afterNextRender(() => import(...))` client-only
  registration (SSR emits a bare tag for the injector); `(slide-change)` etc. re-emitted with
  `stopPropagation()`; `paused` as a `model()`. Slides are plain children (`<img>` directly inside
  `<bs-carousel>` — **`*bsCarouselImage` is deleted**, no structural directive needed);
  `*bsCarouselPlayPause`, `BsCarouselImgDirective`, and the carousel's `bsNoNoscript` usage are
  deleted with it.
- **React `BsCarousel`**: `@lit/react` `createComponent` + `forwardRef` facade mapping booleans
  to attribute presence (navbar/shell idiom — the old branch's hand-rolled wrapper is obsolete).
- **Vue `BsCarousel.vue`**: `inheritAttrs: false` + `v-bind="$attrs"`, boolean presence attrs
  (`x ? '' : undefined`), CustomEvents wired in `onMounted`/`onBeforeUnmount`,
  `defineModel` for `paused`.

### `@mintplayer/ng-bootstrap/observe-size` (relocation)

`BsObserveSizeDirective` + `Size` move verbatim from `@mintplayer/ng-swiper/observe-size`;
**selector and `exportAs` stay `bsObserveSize`** (priority-nav and sticky-footer bind by
`exportAs` template refs). Only import paths change.

## 10. Deletion & deprecation scope

- `libs/mintplayer-ng-swiper/` — entire library. npm: `npm deprecate @mintplayer/ng-swiper`
  pointing at `@mintplayer/web-components` (swiper-core) and
  `@mintplayer/ng-bootstrap/observe-size` (release-time step).
- Legacy Angular carousel internals: swiper-driven component body + template fork,
  `carousel-image`, `carousel-img`, `carousel-play-pause` directives and their specs
  (external-contract assertions re-expressed against the WC per §11).
- `tsconfig.base.json` ng-swiper mappings; `@mintplayer/ng-swiper` peerDependency.
- The `/additional-samples/swiper` demo page (it demos the deleted package through the carousel);
  its nav entry; touch support is demonstrated on the carousel page instead.
- Untracked ghost dirs `libs/mintplayer-web-components/{carousel,accordion,dropdown}/`
  (orphaned generated artifacts from the abandoned branch) — removed from disk before first
  codegen run.
- Stale docs marked superseded-by-this-PRD where they described ng-swiper behavior now owned by
  swiper-core (`docs/prd/carousel*.md`, `vertical-swipe-firefox-android.md`, `swiper-aria.md`
  stay as historical design record; this PRD links them).
- CLAUDE.md corrections (investigation findings): generated `*.styles.ts` /
  `*.element.template.ts` are **gitignored**, not committed; note that WC-side `ng-package.js`
  shims are inert.

## 11. Testing

- **vitest (WC lib):** swiper-core arbiter + index machine (ported spec + wrap/clamp/duration
  cases); `mp-carousel` ARIA contract re-expressing master's spec assertions (per-slide
  group/label, clone hiding, viewport orientation/keyshortcuts/tabindex, `aria-live` matrix,
  play/pause default + `aria-pressed`); height-contract unit tests against a fake measurement
  source (new coverage — master had none).
- **Playwright, all three demo apps:**
  - `carousel.spec.ts` (JS): all four `animation`×`orientation` combos hot-swapped on one
    instance; swipe (touch), keyboard, indicators, wrap on/off, autoplay pause via
    `aria-pressed`; deterministic readiness predicate (shadow rendered + `data-js`), not
    `networkidle`, per navbar precedent; "click, never focus".
  - `carousel-nojs.spec.ts` (`test.use({ javaScriptEnabled: false })`): DSD attached
    (locator finds shadow chrome), slide reveal via indicator/prev/next labels incl. wrap-around
    (native-state proxy: `toBeChecked()` on the radios), keyboard arrow navigation on the
    radiogroup, **two carousels on one page stay independent**.
  - Angular page unit spec keeps the demo compiling (ng-mocks over the wrapper).
- Shared spec factory for the three nearly-identical e2e files (the old branch shipped three
  byte-identical copies; dedupe them).

## 12. References

- Investigation inputs (this session): autopsy of PR #388; master carousel/swiper map; WC
  migration playbook (navbar/shell/tree-select precedents).
- `docs/prd/carousel.md`, `docs/prd/carousel-template-unification.md` (the unify-to-one-path
  refactor this PRD extends to 1 authored location), `docs/prd/carousel-vertical-propagation.md`,
  `docs/prd/vertical-swipe-firefox-android.md` (PTR defence layers), `docs/prd/swiper-aria.md`.
- `docs/prd/navbar-dropdown-menu-wc.md` + `-plan.md` (deletion doctrine, spike-gate process),
  `docs/prd/shell-wc-ssr.md` (CSS-lever state discipline), `docs/prd/navbar-noscript.md`
  (two-tier doctrine, "click, never focus").
- Commit `e8c96856` (template unification — the code-duplication bar this PRD raises).
