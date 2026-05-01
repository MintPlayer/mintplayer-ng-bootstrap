# PRD: Reliable vertical swipe on Firefox for Android

**Status:** Original fix shipped in [PR #291](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/291), validated on real Firefox Android device 2026-04-30. §11 follow-up (directive consolidation) shipping alongside this PRD in [PR #293](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/293).
**Author:** Pieterjan
**Date:** 2026-04-30
**Library:** `@mintplayer/ng-swiper` + `@mintplayer/ng-bootstrap/carousel`

---

## 1. Problem

On Firefox for Android, when `<bs-carousel>` (or the underlying `bsSwipeContainer` directive) is in `orientation="vertical"`, a downward finger drag intermittently triggers the browser's native **pull-to-refresh** (PTR) overlay instead of advancing the carousel slide.

The official swiper.js Vertical demo at https://swiperjs.com/demos succeeds ~9 out of 10 times on the same device/browser, while our custom directive fails noticeably more often. Both fail occasionally, which suggests a Firefox/GeckoView quirk rather than a fully solvable bug — but the gap between "9/10" and "much worse" is what this PRD targets.

## 2. Background — what the code already does

The directive at `libs/mintplayer-ng-swiper/swiper/src/directives/swipe/swipe.directive.ts` has clearly been iterated on for this exact issue:

- Non-passive `touchmove` listener registered manually via `addEventListener` rather than `@HostListener` (which would silently make it passive). `swipe.directive.ts:62-74`
- Conditional `preventDefault()` once the gesture exceeds a 10 px threshold. `swipe.directive.ts:122-124`
- Synchronous `touchStartPos` cache to bridge the 20 ms gap before the `startTouch` signal is set, so `preventDefault` can fire on early `touchmove` events. `swipe.directive.ts:32-35, 117-119`
- `[style.touch-action]` host binding that switches between `pan-y` (horizontal mode) and `pan-x` (vertical mode). `swipe.directive.ts:17, 44`

Despite all of that, vertical-mode PTR still wins regularly.

## 3. Root-cause analysis

Three converging factors explain the residual flakiness:

### 3.1 `touch-action` is set on the wrong element

`touch-action: pan-x` is applied only to the per-slide `[bsSwipe]` directive (`swipe.directive.ts:17`). The parent `[bsSwipeContainer]` (`swipe-container.directive.ts:13-18`) and the `.carousel-inner` wrapper (`carousel.component.html:52`) have no `touch-action` declaration — they default to `auto`.

`touch-action` arbitration intersects values along the ancestor chain, so in the common case the slide's `pan-x` wins. But:

- During slide transitions/animations, the touched element may briefly be the container or an absolutely-positioned sibling rather than a `[bsSwipe]` slide.
- swiper.js — the working reference — sets `touch-action: pan-x` on the **container** class `.swiper-vertical`, not on slides (`src/swiper.css:41-46` in `nolimits4web/swiper`). Putting it on the container guarantees the rule applies across the entire interactive surface, including any padding/gap regions.

### 3.2 Firefox APZ races the JS handler

Firefox Android's async pan-zoom (APZ) component arbitrates gestures on the compositor thread *before* main-thread JS handlers run. When `document.scrollingElement.scrollTop === 0` and the finger moves down, APZ can claim the gesture as PTR within the first few millimetres of movement. Our 10 px threshold (`swipe.directive.ts:30, 122`) means the *first 10 px* of a downward stroke pass uncontested — by which point APZ has already decided.

Mozilla bugs `Bugzilla 1807071`, `Fenix #16576`, `Fenix #16577` confirm this aggressiveness and the fact that `overscroll-behavior` is not honoured by GeckoView's PTR path.

### 3.3 Listener registration timing

The non-passive listeners are attached in `afterNextRender(...)` (`swipe.directive.ts:66`). On a fast first-paint interaction, a touchstart could fire on the very first frame before that callback has run, leaving the *passive default* listener in effect for one stroke.

### Net effect

Of the three, **3.1** is the dominant cause and the cheapest to fix. **3.2** and **3.3** are timing tightenings that buy the remaining margin.

## 4. Goals / non-goals

**Goals**
- Vertical-mode swipes on Firefox Android succeed at parity with swiper.js (subjective ~9/10).
- No regression in horizontal mode (Chrome/Safari/Firefox desktop and mobile).
- No new dependencies added or removed.
- No public API change to `<bs-carousel>` or `[bsSwipeContainer]`.

**Non-goals**
- 100% reliability — Firefox Android has documented quirks that even swiper.js does not fully resolve.
- Reworking the directive to use Pointer Events (`pointerdown`/`pointermove`). Worth considering later, but out of scope.
- Replacing the custom library with swiper.js (see §5).

## 5. Options considered

### Option A — Fix the custom library *(recommended)*
Apply the targeted changes in §6.

- ✅ Bundle stays small (current ng-swiper is a few kB; swiper.js minified is ~50 kB plus the Angular wrapper boilerplate).
- ✅ Full ownership of the gesture logic; no upstream breaking-change treadmill (swiper.js v8 → v9 → v10 → v11 each broke its API).
- ✅ Fix is small (estimated < 30 LOC) and isolated to two files.
- ⚠️ Will still be ~9/10 in absolute terms — same ceiling as swiper.js.

### Option B — Replace with swiper.js + Angular wrapper
- ✅ Battle-tested touch handling.
- ❌ Bundle size +~50 kB minified.
- ❌ Migration cost: every consumer of `[bsSwipe]`/`[bsSwipeContainer]`/`<bs-carousel>` needs adaptation; lose existing test coverage.
- ❌ swiper.js itself fails ~1/10 in this exact scenario per the user's own testing — switching does not raise the ceiling, just the cost.
- ❌ Couples the project to swiper.js's release cadence and license model.

### Option C — Disable PTR globally
Add `overscroll-behavior-y: contain` to `html`/`body` in the demo app.
- ❌ Firefox Android historically ignores this for PTR (Bugzilla 1829378, 1845264).
- ❌ Even if honoured, it would only fix the demo app — library consumers would still suffer.

**Recommendation: Option A.** Switching libraries does not solve the underlying browser quirk and forfeits a working asset. The fix is small, surgical, and mirrors what swiper.js already does — without the rest of swiper.js coming along.

## 6. Required changes

> **Implementation status (PR #291, merged 2026-04-30; validated on real Firefox Android device):**
> - §6.1 — ✅ shipped as proposed.
> - §6.2 — ✅ shipped as proposed (no code change, intentional).
> - §6.3 — ✅ shipped at 3 px, **plus an additional change during review**: the touchmove check is now orientation-aware with a directional dominance guard (`primary > threshold && primary >= perpendicular`), so off-axis jitter no longer triggers the swipe lock. See §6.3 below for the original proposal and the **Review amendment** note that follows it.
> - §6.4 — ❌ **reverted during review.** `afterNextRender` was retained for SSR safety; the "first-paint race" the eager attach was meant to close turned out to be theoretical. See the strikethrough below.
> - §6.5 — ✅ shipped, **but §11 follow-up identifies this as redundant** with the directive-level `overscroll-behavior` host binding. To be removed when §11 lands.
>
> Vertical swipe on Firefox Android currently works as expected on real devices.

### 6.1 Move `touch-action` onto the swipe container

**File:** `libs/mintplayer-ng-swiper/swiper/src/directives/swipe-container/swipe-container.directive.ts`

- Add a public `touchAction` field to the directive, computed from the existing `orientation` input:
  - `horizontal` → `pan-y`
  - `vertical` → `pan-x`
- Add `'[style.touch-action]': 'touchAction()'` to the host metadata block (lines 13-18).
- As defence-in-depth, also add `'[style.overscroll-behavior]': '"contain"'` (no-op on Firefox Android per Mozilla bug history, but corrects the behaviour on Chrome and on Firefox versions that do honour it).

### 6.2 Keep the per-slide `touch-action` *(no change to swipe.directive.ts:44)*

The per-slide `touch-action` is harmless and provides a fallback if a consumer ever uses `[bsSwipe]` outside a `[bsSwipeContainer]`. Leave it.

### 6.3 Lower the swipe threshold

**File:** `libs/mintplayer-ng-swiper/swiper/src/directives/swipe/swipe.directive.ts`
- Change `SWIPE_THRESHOLD = 10` → `SWIPE_THRESHOLD = 3` (line 30).
  - 10 px equates to several frames of finger travel on a 60-Hz device — long enough for APZ to arbitrate.
  - 3 px is small enough to fire `preventDefault` on the first or second `touchmove` while still being tap-tolerant (real taps stay below 3 px in practice; if it proves too sensitive in QA, fall back to 5 px).

> **Review amendment (shipped):** the original proposal kept the existing `dx > T || dy > T` condition. Gemini's review correctly flagged that at 3 px, an off-axis 4 px jitter would block native page scrolling. The shipped fix replaces the OR with an **orientation-aware directional lock**: `preventDefault` only fires when the primary axis exceeds the threshold *and* dominates the perpendicular axis (`primary > T && primary >= perpendicular`). Once locked in, `preventDefault` keeps firing for the rest of the stroke. This mirrors swiper.js's directional-lock semantics.

### 6.4 ~~Attach listeners eagerly~~ *(reverted during review — kept `afterNextRender`)*

> **Reverted.** The original proposal moved listener attachment out of `afterNextRender(...)` to close a hypothetical first-paint race. Gemini's review pointed out two problems:
> 1. **SSR safety.** Direct `nativeElement.addEventListener` in the constructor crashes during server-side rendering (`nativeElement` isn't a real DOM element on the server). `afterNextRender` is a no-op during SSR, which avoids the crash.
> 2. **The race wasn't real.** `afterNextRender` runs before the next browser paint. The user can't physically touch a slide before it's painted, so listeners are always attached before any possible touch.
>
> The shipped code keeps the `afterNextRender(...)` wrapper. The original §6.4 proposal below is preserved as historical record.
>
> ~~**File:** `libs/mintplayer-ng-swiper/swiper/src/directives/swipe/swipe.directive.ts`~~
> ~~Move the `addEventListener` calls out of `afterNextRender(...)` and into a normal lifecycle hook that runs as soon as the host element is available (e.g. directly in the constructor using the injected `ElementRef`, or `ngOnInit`). The listeners do not depend on anything that requires "next render" — only on the native element, which already exists. Removing the `afterNextRender` wrapper closes the first-paint race described in §3.3.~~

### 6.5 Carousel CSS — defence in depth

**File:** `libs/mintplayer-ng-bootstrap/carousel/src/carousel/carousel.component.scss` (or the SCSS file that defines `.carousel-vertical`)
- Add `overscroll-behavior: contain;` to `.carousel-vertical .carousel-inner`.
- This is harmless when `touch-action` is already doing the work, and provides a safety net for older Firefox builds.

> **Status:** shipped, but identified as redundant during the §11 follow-up review. The directive's host binding `'[style.overscroll-behavior]': '"contain"'` (added in §6.1) already covers every consumer, making this SCSS rule dead weight. Slated for removal as part of §11.

### 6.6 What is *not* required
- No browser sniffing — swiper.js does not sniff and neither should we.
- No change to the public input shape of `<bs-carousel>` or `[bsSwipeContainer]`.

## 7. Acceptance criteria

1. On Firefox for Android (latest stable, fresh profile, PTR enabled), with `<bs-carousel orientation="vertical">` at the top of the viewport (`scrollTop === 0`), 10 consecutive deliberate downward swipes advance the carousel ≥ 9 times without triggering the PTR overlay.
2. Same test on Chrome for Android: 10/10.
3. Same test on Firefox/Chrome/Safari desktop: 10/10 (mouse drag).
4. Horizontal mode regression test: 10 horizontal swipes work, **and** vertical page scroll on the surrounding page still works (i.e. `pan-y` is preserved on horizontal carousels — confirms §6.1's `touchAction()` value table).
5. Tap-to-navigate (where applicable) still fires — i.e. the lowered 3 px threshold does not turn taps into swipes.
6. The carousel demo at `apps/ng-bootstrap-demo/.../carousel/carousel.component.html` works in both orientations after the change.
7. Existing unit tests pass: `swipe.directive.spec.ts`, `swipe-container.directive.spec.ts`.

## 8. Test plan

- **Manual:** Galaxy / Pixel device (or a colleague's Android), Firefox stable. Test both at viewport top (PTR-eligible) and after scrolling down 100 px (PTR-ineligible) to confirm the fix is not just hiding the symptom.
- **Manual:** iOS Safari — confirm no rubber-band overscroll regression, since `touch-action: pan-x` also affects iOS.
- **Automated:** add a Playwright spec that programmatically dispatches `touchstart`/`touchmove`/`touchend` sequences in vertical mode and asserts that the slide index advances. This will not catch the APZ-arbitration class of bug (which is below the JS layer) but will catch regressions in the directional-lock logic.
- **Bundle size:** confirm no change in the ng-swiper library dist size beyond a few bytes.

## 9. Risks & open questions

- **Lowered threshold may surface tap-vs-swipe sensitivity issues.** *Resolved during review:* the touchmove check is now orientation-aware with a dominance guard (`primary > threshold && primary >= perpendicular`), so off-axis jitter no longer triggers the swipe lock and native page scroll is preserved.
- **`touch-action: pan-x` on the container affects nested scrollables.** If a slide ever contains its own vertically-scrollable content, that content will no longer scroll inside the slide. Mitigation: document this constraint; nested vertical scroll inside a vertical carousel is an unusual pattern.
- **SSR safety.** The listener-attach lives inside `afterNextRender(...)`, which is a no-op during SSR. The earlier "attach eagerly in the constructor" idea was reverted during review since `afterNextRender` runs before the next paint anyway — there is no real first-paint race, and constructor access to `nativeElement` would crash on the server.
- **Firefox Android future behaviour.** Pull-to-refresh was disabled by default starting Firefox 117 (Aug 2023). Users who explicitly re-enable it remain affected, and behaviour on older builds remains. The fix is forward-safe regardless.

## 10. Out of scope / follow-ups

- **§11 — Directive consolidation: hoist swipe-layout primitives into the `bsSwipeContainer` directive and merge two adjacent divs in the carousel template.** See dedicated section below.
- Migrating to Pointer Events (`pointerdown`/`pointermove`) like swiper.js does. Would consolidate touch + mouse + pen paths and may simplify the directive, but is a separate refactor.
- Adding `cssMode`-style CSS scroll-snap as an alternative animation path.
- A second carousel demo page that explicitly stress-tests vertical mode at the top of a long page (the current demo page is short so PTR rarely applies).

---

## 11. Follow-up: directive consolidation

> **Implementation status:** ✅ shipping in [PR #293](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/293) together with this PRD. One deviation from §11.3.3 — see the note in that section.

### 11.1 Motivation

After PR #291 landed, two structural smells became visible:

1. **Redundant `overscroll-behavior` declaration.** The fix added `overscroll-behavior: contain` both as a host binding on `bsSwipeContainer` (`swipe-container.directive.ts:19`) *and* on the carousel SCSS rule `.carousel-inner-vertical` (`carousel.component.scss:89`). The SCSS rule is dead weight — the host binding already covers every consumer of the directive.

2. **Two adjacent divs that could be one.** The carousel template currently nests an `<div bsSwipeContainer>` inside an `<div class="carousel-inner overflow-hidden pe-none ...">` (`carousel.component.html:52-55`). The outer div carries layout primitives that are essential for *any* swipe container — not just the carousel — yet they live in the carousel template, which means a hypothetical second consumer of `bsSwipeContainer` would have to re-implement them. They belong with the directive.

A monorepo-wide grep confirms the carousel is the **only** consumer of `bsSwipeContainer` / `bsSwipe` outside of test fixtures, so hoisting these styles into the directive is non-breaking by construction.

### 11.2 Style classification

For each style currently on the outer `.carousel-inner` div:

| Item | Purpose | Verdict |
|---|---|---|
| `class="carousel-inner"` | Bootstrap class — `position: relative; width: 100%; overflow: hidden;` | **Stays in template.** Bootstrap-specific; not the swiper's concern. |
| `overflow-hidden` (utility) | `overflow: hidden` | **Drop.** Already provided by `.carousel-inner`. |
| `pe-none` (utility) | `pointer-events: none` | **Move to directive.** Pairs with `bsSwipe`'s `[class.pe-auto]: 'true'` (`swipe.directive.ts:12`) — these two together form a coherent pattern. |
| `[class.text-nowrap]="orientation() === 'horizontal'"` | `white-space: nowrap` for inline-block slide layout | **Move to directive.** Essential for horizontal mode given `d-inline-block` on slides (`swipe.directive.ts:14`). |
| `[class.carousel-inner-vertical]` (parent rules: `display: flex; flex-direction: column;`) | Vertical-mode layout | **Move to directive** as a host style conditional on `orientation() === 'vertical'`. |
| `.carousel-inner-vertical .carousel-item` nested rules | Slide alignment within the vertical carousel | **Stays in carousel SCSS.** Carousel-specific; rescope under `.carousel.carousel-vertical .carousel-item` to drop dependency on the deleted class. |
| `#innerElement` template ref | Used by carousel to read scroll/measure on the inner element | **Stays.** Becomes a ref on the merged element instead. |
| `[style.height.px]="slideHeight()"` | Carousel-specific height pinning during animation | **Stays in template.** `slideHeight` is a carousel signal. |
| `bsSwipeContainer` and its inputs/outputs | The directive itself | **Stays.** |

### 11.3 Required changes

#### 11.3.1 `bsSwipeContainer` directive (`swipe-container.directive.ts`)

Add three host bindings alongside the existing ones:

- `'[style.pointer-events]': '"none"'` — replaces the `pe-none` class.
- `'[style.white-space]': 'orientation() === "horizontal" ? "nowrap" : null'` — replaces `text-nowrap` in horizontal mode.
- `'[style.display]': 'orientation() === "vertical" ? "flex" : null'`
- `'[style.flex-direction]': 'orientation() === "vertical" ? "column" : null'` — replaces `.carousel-inner-vertical`'s parent-level rules.

The existing `[style.touch-action]` and `[style.overscroll-behavior]` host bindings stay as-is.

#### 11.3.2 Carousel template (`carousel.component.html` lines 52-72)

Merge the two divs into one. Before:

```html
<div class="carousel-inner overflow-hidden pe-none"
     [class.text-nowrap]="orientation() === 'horizontal'"
     [class.carousel-inner-vertical]="orientation() === 'vertical'"
     #innerElement
     [style.height.px]="slideHeight()">
    <div bsSwipeContainer #container="bsSwipeContainer" [minimumOffset]="50"
         (imageIndexChange)="onImageIndexChange($event)"
         (animationStart)="onContainerAnimationStart()"
         (animationEnd)="onContainerAnimationEnd()"
         [orientation]="orientation()">
        <!-- slides -->
    </div>
</div>
```

After:

```html
<div bsSwipeContainer #container="bsSwipeContainer" #innerElement
     class="carousel-inner"
     [minimumOffset]="50"
     [orientation]="orientation()"
     [style.height.px]="slideHeight()"
     (imageIndexChange)="onImageIndexChange($event)"
     (animationStart)="onContainerAnimationStart()"
     (animationEnd)="onContainerAnimationEnd()">
    <!-- slides -->
</div>
```

Net: one fewer DOM node, the directive is self-sufficient, the bootstrap-specific class stays where it belongs.

#### 11.3.3 Carousel SCSS (`carousel.component.scss` lines 86-97)

Replace:

```scss
.carousel-inner-vertical {
    display: flex;
    flex-direction: column;
    overscroll-behavior: contain;

    .carousel-item {
        flex: 0 0 auto;
        display: flex !important;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
}
```

With (rescoped under `.carousel.carousel-vertical`, since the `.carousel-inner-vertical` class no longer exists):

```scss
.carousel.carousel-vertical .carousel-item {
    flex: 0 0 auto;
    display: flex !important;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
```

The parent-level `display: flex; flex-direction: column; overscroll-behavior: contain;` are gone — the directive provides them.

> **Implementation deviation (PR #293):** the shipped selector is narrowed to `.carousel.carousel-vertical [bsSwipeContainer] .carousel-item`. The PRD's prescription `.carousel.carousel-vertical .carousel-item` would also match `.carousel-item` elements in the `fade` and `none` animation branches (lines 99-107, 134-142 of the template), which previously did **not** receive these flex-centering rules — only the slide-animation branch's `[class.carousel-inner-vertical]` did. Adding `[bsSwipeContainer]` to the selector limits the rules to the slide-animation branch (the only branch that uses `bsSwipeContainer`), preserving the original scope exactly.

### 11.4 Acceptance criteria

1. Vertical and horizontal carousels render and behave identically to before, both visually and in terms of swipe response. Pixel-diff demo screenshots before/after. *(pending real-device smoke test)*
2. Original §7 acceptance criteria (Firefox Android PTR, regression tests) still pass. *(pending real-device smoke test)*
3. ✅ Generated DOM has one fewer `<div>` between `.carousel` and the slides.
4. ✅ `nx test mintplayer-ng-swiper` passes (verified in PR #293).
5. ✅ `nx build mintplayer-ng-swiper` and `nx build mintplayer-ng-bootstrap` pass (verified in PR #293).

### 11.5 Risks

- **Specificity changes from removing `.carousel-inner-vertical`.** If anything in the consuming app's CSS targets that class, those rules go dead. Mitigation: monorepo grep confirms no usages outside the carousel SCSS itself.
- **Inline `style.*` host bindings beat utility classes in specificity.** Moving from `class="pe-none"` to `[style.pointer-events]` raises specificity, which could clash if a consumer ever overrode pointer-events via class. Acceptable trade-off given the directive is purpose-built and consumers wanting to override should go via host class on the merged element.
- **Bundle size.** Negligible (a handful of host bindings) — the carousel SCSS shrinks by roughly the same amount.

### 11.6 Out of scope for this follow-up

- Reorganising the bootstrap-specific carousel SCSS beyond what's needed to drop the dead `.carousel-inner-vertical` selector.
- Refactoring the `fade` and `none` animation branches (lines 87-156 of `carousel.component.html`) — they don't use `bsSwipeContainer` and are unaffected.

---

## Appendix A — sources

- MDN, [`touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) — gesture-arbitration semantics.
- MDN, [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) — Firefox Android limited-availability note.
- swiper.js, [`src/swiper.css`](https://github.com/nolimits4web/swiper/blob/master/src/swiper.css) lines 41-46 — `.swiper-horizontal { touch-action: pan-y } .swiper-vertical { touch-action: pan-x }`.
- swiper.js, [`src/core/events/index.mjs`](https://github.com/nolimits4web/swiper/blob/master/src/core/events/index.mjs) — non-passive listener registration with `capture: true`.
- swiper.js, [`src/core/events/onTouchMove.mjs`](https://github.com/nolimits4web/swiper/blob/master/src/core/events/onTouchMove.mjs) — `e.cancelable && e.preventDefault()` on touchmove.
- Mozilla, [Bugzilla 1807071 — Meta: pull-to-refresh issues](https://bugzilla.mozilla.org/show_bug.cgi?id=1807071).
- Mozilla, [Bugzilla 1829378 / 1845264](https://bugzilla.mozilla.org/show_bug.cgi?id=1829378) — `overscroll-behavior` not honoured by PTR. Both closed without fix.
- Mozilla, [Fenix #16576](https://github.com/mozilla-mobile/fenix/issues/16576), [#16577](https://github.com/mozilla-mobile/fenix/issues/16577) — gesture-arbitration aggression.
