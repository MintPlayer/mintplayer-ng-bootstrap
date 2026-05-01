# PRD: Unify the bs-carousel template rendering paths

**Status:** Draft — awaiting review
**Author:** Pieterjan
**Date:** 2026-05-01
**Library:** `@mintplayer/ng-bootstrap/carousel` (+ minor work in `@mintplayer/ng-swiper`)

---

## 1. Problem

`libs/mintplayer-ng-bootstrap/carousel/src/carousel/carousel.component.html` renders the same logical pieces — slides, indicators, prev/next controls, `<div class="carousel">` wrapper — **four times** across mutually-exclusive `@if` / `@switch` branches:

1. **SSR branch** (lines 1-36) — radio-input + CSS `:checked` markup for no-JS.
2. **`@case ('slide')`** (lines 39-85) — `bsSwipeContainer` with all slides + 2 offside clones.
3. **`@case ('fade')`** (lines 87-121) — single active slide with `@fadeInOut` Angular animation.
4. **`@case ('none')`** (lines 122-156) — single active slide, no animation.

Branches 3 and 4 are **~99% identical** — they differ only by an `@fadeInOut` animation trigger on one element. Branches 2-4 share most of the wrapper boilerplate (carousel container, indicators, controls) but each rebuilds it from scratch. Net result: 156 lines of template that could be substantially smaller, with the per-image content (`<ng-container [ngTemplateOutlet]="image.itemTemplate">`) appearing in four separate places.

Cost is mostly maintainability — every change to the indicator markup, control markup, or wrapping container has to be made four times in lock-step. Bundle size is also affected (Angular compiles each branch to its own `TView`), but that's secondary.

## 2. Current state — hard numbers

Counted occurrences in `carousel.component.html` (current master):

| Element | SSR | Slide | Fade | None | **Total** |
|---|---|---|---|---|---|
| `<div class="carousel ...">` outer wrapper | 1 | 1 | 1 | 1 | **4** |
| `<div class="carousel-indicators">` block | 1 (inline per-slide) | 1 | 1 | 1 | **4** (in 3 patterns) |
| `<ng-container [ngTemplateOutlet]>` for slide content | 1 (in @for) | 3 (last + main @for + first) | 1 (active) | 1 (active) | **6** |
| Carousel control prev/next buttons | 2 (per-slide labels) | 2 | 2 | 2 | **8** (in 2 patterns) |

The slide branch's "3" comes from the offside-last clone (line 60-62), the main `@for` (63-67), and the offside-first clone (68-70), all of which call `*ngTemplateOutlet`.

**Two separate index-tracking paths** also exist:
- Slide mode: `swipeContainer()?.imageIndex()` (read from the directive's `model<number>`)
- Fade/None modes: `currentImageIndex()` (signal owned by the carousel component)

The `next()`, `previous()`, and `goto()` methods on the carousel already branch on `animation()` to call the right path (`carousel.component.ts:168-253`), so the *method* layer is animation-agnostic. Only the *template* still hard-codes which path to follow.

## 3. Goals / non-goals

**Goals**
- Render slide content (`<ng-container [ngTemplateOutlet]="image.itemTemplate">`) in **at most 2 places** total: one for SSR, one for client-side.
- Render carousel indicators and prev/next controls in at most 2 places (one for SSR, one for client-side).
- Functional parity with current behaviour across all four modes — no visual regressions, no swipe regressions.
- No public API change to `<bs-carousel>` (inputs, outputs, `*bsCarouselImage`).

**Non-goals**
- Unifying SSR with client-side (covered in §4 option C — rejected).
- Replacing Angular animations with pure CSS for fade — covered in §4 option B-alt — possible but not required.
- Rewriting the auto-advance / pause logic.
- Touching `bsSwipeContainer`'s public API surface.

## 4. Options considered

### Option A — minimal: merge fade and none branches

Combine `@case ('fade')` and `@case ('none')` since they're 99% identical. Drop the `@fadeInOut` trigger conditionally:

```html
@case ('fade') @case ('none') { ... [class.@fadeInOut] ... }
```

Angular's control flow doesn't support multi-`@case` blocks directly, so this becomes `@default` plus an `@if` guard. The slide branch stays separate.

- ✅ Smallest possible change (~30 lines deleted).
- ✅ Risk-free.
- ❌ Slide branch still duplicates wrapper / indicators / controls. The user's "render at most 2 times" target is missed — slides still render in 3 places (SSR + slide + merged fade-none).

### Option B — full client-side unification *(recommended)*

Collapse all three client-side branches into one. Always wrap slides in `bsSwipeContainer`, always render every slide (no `@if (currentImageIndex() === i)` guard), and let the directive + CSS handle mode-specific behaviour:

- **Slide mode**: directive applies margins to its host; offside clones still render (gated by `@if (animation() === 'slide')`).
- **Fade mode**: all slides rendered; CSS opacity controls visibility based on `[class.active]`. The Angular `@fadeInOut` trigger is replaced by a CSS transition.
- **None mode**: all slides rendered; CSS `display: none` on inactive slides.

Index tracking unifies on `currentImageIndex()` — the directive's `imageIndex` model two-way binds to it via `[(imageIndex)]="currentImageIndex"`.

- ✅ Slides, indicators, controls each appear in 1 client-side location (+ 1 SSR location = 2 total). Hits the user's target.
- ✅ Indicator and control click handlers consolidate to `(click)="goto(i)"`, `previous()`, `next()` — no more `swipeContainer()?.goto(i)` vs `goto(i)` split.
- ✅ One state machine: `currentImageIndex()` is the single source of truth.
- ⚠️ Requires the directive to gain a `'fade'` mode in `animateToIndex()` (currently fades fall through to slide-style margin animation — see `swipe-container.directive.ts:243+`). Modest amount of work in the directive.
- ⚠️ Fade and None modes now render N slides instead of 1. DOM grows by O(N-1) — for typical carousels (<20 images) this is negligible, especially with OnPush change detection (already in place at `carousel.component.ts:20`).
- ⚠️ The `@fadeInOut` Angular animation no longer fires `:leave` (because slides aren't removed). If the carousel emits `animationStart`/`animationEnd` and consumers depend on those for fade mode, we need the directive to emit them via the existing `animationStart`/`animationEnd` outputs (it already does for slide and none).

### Option C — full unification including SSR

Wire up component-driven state for SSR too — drop the radio inputs, use `currentImageIndex` everywhere.

- ❌ Defeats the entire SSR-without-JS premise. The radio + `:checked` pattern is what makes the SSR markup work without JS hydration; replacing it with component state would mean the no-JS user gets a frozen carousel.
- **Rejected.**

### Recommendation: **Option B.**

Option A is too timid — leaves the slide branch's full duplication in place. Option C breaks the SSR contract. Option B hits the user's "at most 2 places" goal cleanly. The directive change is small and self-contained.

## 5. Required changes (Option B)

### 5.1 `bsSwipeContainer` directive — add fade mode

**File:** `libs/mintplayer-ng-swiper/swiper/src/directives/swipe-container/swipe-container.directive.ts`

In `animateToIndex(...)` (currently around lines 215-310), add a third branch alongside the existing `slide` and `none` paths:

```typescript
} else if (animation === 'fade') {
  // No margin animation. Just update imageIndex synchronously and emit
  // animationStart/animationEnd so consumers can track transitions.
  // The opacity transition itself is driven by CSS in the carousel component.
  this.animationStart.emit();
  if (newIndex === -1) {
    this.imageIndex.set(totalSlides - 1);
  } else if (newIndex === totalSlides) {
    this.imageIndex.set(0);
  } else {
    this.imageIndex.set(newIndex);
  }
  this.startTouch.set(null);
  this.lastTouch.set(null);
  // Defer animationEnd to roughly match CSS transition duration so consumers
  // that wait on it for auto-advance pacing still work. Use 500ms to match
  // the existing `@fadeInOut` timing (fade-in-out.animation.ts).
  setTimeout(() => {
    if (!this.isDestroyed) this.animationEnd.emit();
  }, 500);
  return;
}
```

The `'slide'` path stays as the default fallthrough.

Also: in fade mode, the directive should **not** apply margin offsets (those would shift the inner layer instead of fading). The host bindings for `[style.margin-left.%]` etc. need to return `null` when `animation === 'fade'`:

```typescript
offsetLeft = signal<number | null>(null);
// ...become orientation+animation-aware computed signals:
offsetLeft = computed(() => this.animation() === 'fade' ? null : this._offsetLeft());
// etc.
```

(Or guard the existing effect at lines 151-194 with `if (this.animation() === 'fade') return;`.)

### 5.2 Carousel component — single source of truth for index

**File:** `libs/mintplayer-ng-bootstrap/carousel/src/carousel/carousel.component.ts`

- Drop the separate `currentImageIndex` vs `swipeContainer()?.imageIndex()` paths. Use one signal.
- Two-way bind that signal to the directive's `imageIndex` model: `[(imageIndex)]="currentImageIndex"`.
- Simplify `next()`, `previous()`, `goto()` (lines 168-253) — no more `@switch (animation())` branching at the component level. Always delegate to `swipeContainer()?.next()` / `.previous()` / `.goto(i)`. The directive's `animateToIndex` already handles the per-mode behaviour.
- `slideHeight()` computation (lines 60-66) keeps working — it reads from `swipeContainer()?.currentSlideHeight()`, which is mode-agnostic.

### 5.3 Carousel template — unify the client-side `@else` branch

**File:** `libs/mintplayer-ng-bootstrap/carousel/src/carousel/carousel.component.html`

Replace the entire `@else { @switch (animation()) { ... } }` block (lines 37-157) with a single rendering path:

```html
@else {
    <div class="carousel mx-auto" #innerElement
         [class.slide]="animation() === 'slide'"
         [class.fade]="animation() === 'fade'"
         [class.carousel-vertical]="orientation() === 'vertical'"
         [style.height.px]="slideHeight()">

        @if (indicators()) {
            <div class="carousel-indicators"
                 [class.carousel-indicators-vertical]="orientation() === 'vertical'">
                @for (image of images(); track image.id; let i = $index) {
                    <button type="button" (click)="goto(i)"
                            [class.active]="currentImageIndex() === i" data-bs-target
                            [attr.aria-current]="currentImageIndex() === i ? true : null"
                            [attr.aria-label]="'Slide ' + i"></button>
                }
            </div>
        }

        <div class="carousel-inner" [style.height.px]="slideHeight()">
            <div bsSwipeContainer #container="bsSwipeContainer"
                 [minimumOffset]="50"
                 [animation]="animation()"
                 [orientation]="orientation()"
                 [(imageIndex)]="currentImageIndex"
                 (animationStart)="onContainerAnimationStart()"
                 (animationEnd)="onContainerAnimationEnd()">

                @if (animation() === 'slide') {
                    <div class="carousel-item" bsSwipe [offside]="true">
                        <ng-container *ngTemplateOutlet="lastImageTemplate()"></ng-container>
                    </div>
                }

                @for (image of images(); track image.id; let i = $index) {
                    <div class="carousel-item" bsSwipe
                         [class.active]="currentImageIndex() === i">
                        <ng-container *ngTemplateOutlet="image.itemTemplate"></ng-container>
                    </div>
                }

                @if (animation() === 'slide') {
                    <div class="carousel-item" bsSwipe [offside]="true">
                        <ng-container *ngTemplateOutlet="firstImageTemplate()"></ng-container>
                    </div>
                }
            </div>
        </div>

        <button class="carousel-control-prev" type="button" (click)="previous()"
                [class.carousel-control-vertical]="orientation() === 'vertical'"
                aria-label="Previous slide">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" (click)="next()"
                [class.carousel-control-vertical]="orientation() === 'vertical'"
                aria-label="Next slide">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Next</span>
        </button>
    </div>
}
```

**Per-element occurrence count after the refactor:**

| Element | SSR | Client (unified) | **Total** | (was) |
|---|---|---|---|---|
| Carousel wrapper `<div class="carousel">` | 1 | 1 | **2** | 4 |
| Indicators block | 1 | 1 | **2** | 4 |
| `<ng-container *ngTemplateOutlet>` for slide content | 1 | 1 *(+ 2 conditional offside clones for slide mode)* | **2 + 2 conditional** | 6 |
| Prev/next controls | 2 | 2 | **4** | 8 |

The slide-content `<ng-container>` for the user's per-image template lives in **one** client-side `@for` loop. The two extra conditional `*ngTemplateOutlet`s are the offside clones (last/first), which are not "the same content rendered again" — they're explicitly the wraparound copies, and only render when `animation() === 'slide'`.

### 5.4 SCSS — fade mode visibility rules

**File:** `libs/mintplayer-ng-bootstrap/carousel/src/carousel/carousel.component.scss`

Bootstrap's `.carousel-item` already has CSS for `display: none` (inactive) / `display: block` (`.active`) when the parent has `.carousel.slide` or `.carousel.fade`. With our render-all-slides approach, we need to make sure that:

- **Slide mode**: every `.carousel-item` is rendered AND visible (positioned by margin offsets); we set `[class.active]` on the current one for indicator-binding semantics, but the visual is driven by margins. Need to override bootstrap's `display: none` for inactive items in slide mode.
- **Fade mode**: only the `.active` item is opaque; others have `opacity: 0; pointer-events: none;` with a `transition: opacity 500ms`.
- **None mode**: only the `.active` item is `display: block`; others `display: none`.

Add to the SCSS:

```scss
.carousel.slide {
    .carousel-item {
        display: block !important;  // override bootstrap's display: none for inactive
    }
}

.carousel.fade {
    .carousel-item {
        display: block !important;
        opacity: 0;
        transition: opacity 500ms ease;
        pointer-events: none;
        &.active {
            opacity: 1;
            pointer-events: auto;
        }
    }
}

// 'none' mode: bootstrap's default (display: none on inactive, display: block on .active)
// works as-is. No additional rules needed.
```

The exact `!important`-vs-specificity strategy needs verification against bootstrap's selectors; this can be tuned during implementation.

### 5.5 What is *not* required

- No changes to `bsSwipe` directive.
- No changes to public component inputs/outputs.
- No changes to the SSR branch (lines 1-36).
- No changes to the auto-advance interval logic.

## 6. Acceptance criteria

1. **Slide mode**: identical visual + interaction behaviour to current. Swipe gestures work on Firefox Android (preserving the §6+§11 fixes from PRDs prior). Wraparound (swipe past last → first) still works via offside clones.
2. **Fade mode**: visual fade transition between slides, ~500 ms duration, matching current `@fadeInOut` behaviour. `animationStart` / `animationEnd` outputs still fire.
3. **None mode**: instant slide change, no animation. `animationStart` / `animationEnd` outputs still fire (synchronously, as today).
4. **SSR**: unchanged. Smoke-test by serving the carousel demo with JS disabled in the browser.
5. **Demo app** at `/basic/carousel` works in all three client-side modes (toggle the `animation` input).
6. **Indicators**: clicking the Nth indicator advances to slide N in all three modes.
7. **Controls**: prev / next buttons work in all three modes.
8. **Auto-advance**: if used, still ticks correctly in all modes.
9. `nx test mintplayer-ng-swiper` and `nx test mintplayer-ng-bootstrap` pass.
10. `nx build mintplayer-ng-swiper` and `nx build mintplayer-ng-bootstrap` pass.
11. Bundle size of the compiled carousel component decreases (smaller template = smaller `TView`).
12. Real-device smoke test on Firefox Android — pull-to-refresh still suppressed, vertical swipe still works.

## 7. Risks & open questions

- **Render-all-slides DOM cost in fade/none modes.** Goes from 1 active slide to N rendered items. For carousels with heavy content (e.g. video players, complex templates), this might delay first paint or increase memory. Mitigation: OnPush change detection is already on; consumers should already lazy-load heavy content per-slide.
- **CSS specificity vs bootstrap's `.carousel-item` defaults.** Bootstrap's stylesheet uses `display: none` for inactive items. Overriding with `!important` is ugly; using a more-specific selector is preferred. To be tuned during implementation.
- **`@fadeInOut` removal might be observed externally.** If any consumer hooks into Angular's animation system (e.g., `[@.disabled]` overrides), removing the trigger could surprise them. Mitigation: announce in changelog; the `animationStart`/`animationEnd` outputs are the documented contract and stay intact.
- **Two-way binding `[(imageIndex)]`** between the carousel signal and the directive's model needs careful initialisation order. If the carousel sets `currentImageIndex` before `bsSwipeContainer` exists, the binding silently no-ops on first run. Mitigation: initialise both to 0; the model binding picks up subsequent changes.
- **Vertical fade mode** is currently almost-degenerate (orientation only affects indicator/control placement; fade itself is opacity). Worth confirming this still renders sensibly under unified rendering.

## 8. Out of scope

- Unifying SSR with client-side (option C — rejected).
- Replacing Angular animations entirely with CSS for slide mode (the directive's margin-based approach is fine).
- Refactoring the `bsCarouselImage` structural directive or the `imageTemplate` plumbing.
- Splitting the carousel component into smaller subcomponents.
- Adding new animation modes beyond `slide | fade | none`.

## 9. Implementation order

1. Land §5.1 (directive fade mode) on its own — verifiable in isolation by adding a unit test that calls `animateToIndex` with `animation === 'fade'` and asserts no margin animation runs.
2. Land §5.2 + §5.3 + §5.4 together (component + template + SCSS) since they form one coherent change.
3. Validate with §6 acceptance criteria, including real-device Android smoke test.
4. Bump versions:
   - `@mintplayer/ng-swiper` patch (directive gains an internal mode handler — no API change).
   - `@mintplayer/ng-bootstrap` patch (carousel internal refactor — no API change).
