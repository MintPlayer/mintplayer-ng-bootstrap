# PRD: ARIA + keyboard accessibility for `@mintplayer/ng-swiper`

**Status:** Draft — awaiting review
**Author:** Pieterjan (with research input from a Claude exploration team)
**Date:** 2026-05-11
**Library:** `@mintplayer/ng-swiper/swiper` (primary) + `@mintplayer/ng-bootstrap/carousel` (cleanup migration)
**Branch context:** follows the `feat/aria-accessibility` branch — same workstream, but the swiper directives were carved out as "consumer-gated" follow-up #1 in `project_aria_outstanding_followups.md`. This PRD reverses that deferral so the duplication can come out of `bs-carousel`.

---

## 1. Why now

`@mintplayer/ng-swiper`'s three directives — `bsSwipe`, `bsSwipeContainer`, `bsSwipeViewport` — handle pointer/touch gestures. **They contain zero ARIA attributes and zero keyboard handling.** Verified against `swipe.directive.ts`, `swipe-container.directive.ts:9-32`, `swipe-viewport.directive.ts:23-30` — none of them sets `role`, `aria-*`, or any `keydown` listener.

The accessibility currently lives one layer up, in `bs-carousel`'s template and component class:

| Carousel-owned a11y | File:line | Generic to swipe content? |
|---|---|---|
| Per-slide `role="group"`, `aria-roledescription="slide"`, `aria-label="N of M"` | `carousel.component.html:82-84` | **Yes** — every paginated swipe UI wants this |
| `aria-hidden="true"` on offside (clone) slides | `carousel.component.html:76, 90` | **Yes** — generic to looped swiper |
| `aria-live` toggling on the viewport | `carousel.component.html:67` + `slideAriaLive` computed at `carousel.component.ts:115-121` | **Half** — the attribute is generic; the gating logic is carousel-specific |
| Arrow-key handlers (`document:keydown.Arrow*` + `onKeyPress` method) | `carousel.component.ts:25-28, 123-158` | **Yes** — every swipe component wants prev/next on arrows |
| `role="region"` + `aria-roledescription="carousel"` on host | `carousel.component.html:46-48` (and `:3-5` SSR) | **No** — carousel-pattern-specific landmark |
| Indicators / play-pause / prev-next buttons | `carousel.component.html:52-66, 96-107, 115-121` | **No** — APG carousel-specific UI affordances |

The cost of the current split: **carousel is the only consumer of swiper today, and the moment a second consumer appears it has to re-implement four blocks of identical ARIA/keyboard wiring** — slide labelling, offside hiding, arrow keys, viewport announcement gating. The user has already signalled image-gallery and image-zoom-viewer use cases as plausible second consumers.

A secondary motivator: the ARIA branch (`feat/aria-accessibility`) deferred this item explicitly. With every Critical/Major audit row closed and the branch ready to ship, this is the natural next chunk — same conceptual workstream, same branch, no scope creep.

## 2. Goal

Push the **generic** half of carousel's a11y down into the swiper directives so any swiper-based UI gets it for free, while keeping the **carousel-pattern-specific** half (region landmark, play/pause, indicators) on `bs-carousel`.

After this PRD lands:

- A consumer that drops `<div bsSwipeViewport><div bsSwipeContainer><div bsSwipe>…</div></div></div>` into a template gets correct slide labelling, offside hiding, arrow-key navigation, and viewport announcement plumbing **without writing any ARIA**.
- `bs-carousel`'s template and component class shrink — six pieces of duplicated wiring disappear (the four "Yes" rows + the viewport `aria-live` attribute name + the `onKeyPress` method).
- `bs-carousel` keeps the carousel-pattern landmark, the play/pause control, the indicators, and the prev/next buttons — none of those belong in a generic swiper.

This is a **breaking change** to swiper's directive contract (it now writes ARIA attributes consumers may have already set). Per `feedback_breaking_changes_ok` it ships without a shim; the only in-repo consumer (`bs-carousel`) is updated in the same commit.

## 3. Scope

**In scope:**

- `BsSwipeDirective` — host bindings for `role="group"`, `aria-roledescription`, `aria-label`, `aria-hidden`. New inputs `ariaRoledescription` and `ariaLabel` for consumer overrides. Auto-computed "N of M" label.
- `BsSwipeContainerDirective` — `document:keydown` handlers for ArrowLeft / ArrowRight / ArrowUp / ArrowDown / Home / End, gated on a new `keyboardEvents` input (default `true`). Orientation-aware (matches current carousel logic). Plus `aria-orientation` and `aria-keyshortcuts` host attributes computed from existing state.
- `BsSwipeViewportDirective` — new inputs `ariaLive` (default `'off'`), `ariaAtomic` (default `false`), `ariaRelevant` (default `null`), `ariaBusy` (default `null`), each becoming a host attribute binding.
- `bs-carousel` — strip the migrated attributes from `carousel.component.html` (lines 67, 76, 82-84, 90) and the `onKeyPress` machinery from `carousel.component.ts` (lines 25-28, 123-158). Pass `slideAriaLive()` through to the viewport via the new input. Wire `[ariaBusy]="container.isAnimating()"` for the mid-transition polish. The `keyboardEvents` input on `bs-carousel` becomes a thin pass-through to swiper (BC for consumers; same default).
- Unit-test coverage on the swiper directives for the new ARIA + keyboard surface (matching the existing per-component spec convention — no new `.aria.spec.ts` files; assertions live alongside the directives' existing specs).
- Update `carousel.component.spec.ts` to verify the carousel still renders the expected ARIA, *now via swiper* (test the externally-visible attribute set, not which directive emits it).

**Out of scope (deliberate):**

- **Fixing the multi-carousel-on-page keyboard bug.** Today, all carousels on a page respond to a single ArrowLeft because the listener is on `document`. This PRD preserves that behaviour by binding to `document:keydown` on the swipe-container too (matching the user's chosen design call). A separate follow-up — "scope swiper keyboard listeners to host + focus-within" — is logged in §10 as a future PRD.
- **Adding `tabindex` to the viewport.** APG suggests the rotation region should be programmatically focusable; today carousel relies on its prev/next buttons + indicators carrying tab stops. Adding `tabindex="0"` on `bsSwipeViewport` would change the tab order on every existing consumer. Defer to the same follow-up as the keyboard-scope fix (they're conceptually one piece of work: "make swiper focusable as a unit and stop relying on document-level capture").
- **Moving carousel's `role="region"` / `aria-roledescription="carousel"` down to swiper.** Those are the APG carousel pattern's landmark — a generic image gallery would want different terms (`region` + `aria-roledescription="image gallery"` or just no roledescription). Carousel keeps them on its own host.
- **The carousel's SSR branch** (`carousel.component.html:1-43`). The radio-input markup for no-JS doesn't compose swiper at all — the directives don't run on the server in that path. The SSR branch keeps its current inline ARIA. Only the `@else` (JS) branch changes.
- **`@mintplayer/ng-swiper/observe-size`**. That sub-entrypoint is consumed by `priority-nav` and `sticky-footer` for size measurement only — no swipe semantics, no ARIA implications. Untouched.
- **A `slide-changed` live-region announcer.** The carousel doesn't have one today (`aria-live` on the viewport is the closest thing). Adding one would be a separate ARIA enhancement, not part of this duplication-removal pass.

## 4. Design

### 4.1 `BsSwipeDirective` — slide ARIA

Each `[bsSwipe]` element in the moving track represents one logical slide. The directive is the natural owner of slide ARIA semantics.

**New host bindings:**

```ts
host: {
  // … existing class/style/touch-action bindings stay …
  '[attr.role]': '"group"',
  '[attr.aria-roledescription]': 'ariaRoledescription()',
  '[attr.aria-label]': 'effectiveAriaLabel()',
  '[attr.aria-hidden]': 'offside() ? "true" : null',
}
```

**New inputs:**

```ts
/** Word read by SR after the position label. Default 'slide' matches APG
 *  carousel pattern; consumers building image galleries / step wizards can
 *  override to 'image', 'step', etc. */
ariaRoledescription = input<string>('slide');

/** Override the auto-computed "N of M" label. When null (the default),
 *  the directive computes it from this slide's index among non-offside
 *  siblings and the total non-offside count. */
ariaLabel = input<string | null>(null);
```

**Auto-computed default label:**

```ts
private readonly indexAmongVisible = computed(() => {
  const visible = this.container.actualSwipes();   // existing — non-offside
  return visible.indexOf(this);                    // -1 if this is offside
});

readonly effectiveAriaLabel = computed(() => {
  const explicit = this.ariaLabel();
  if (explicit !== null) return explicit;
  if (this.offside()) return null;                 // offside → aria-hidden, no label needed
  const i = this.indexAmongVisible();
  if (i < 0) return null;
  const total = this.container.actualSwipes().length;
  return `${i + 1} of ${total}`;
});
```

Why "N of M" computed from `actualSwipes()` rather than DOM ordinal: it matches what carousel does today (`(i + 1) + ' of ' + imageCount()`, where `imageCount()` excludes offside clones because it's based on `<bs-carousel>`'s `contentChildren` of `BsCarouselImageDirective`). Slides marked `[offside]="true"` are looping clones — they should not advertise themselves as "slide 1 of 6" because there are only 4 real slides; instead they get `aria-hidden`.

**Consumer override path:** any consumer template can do `<div bsSwipe [ariaLabel]="'Sunset over Mt. Rainier, slide 3 of 6'">` to provide rich, per-slide labels. The carousel component doesn't need this — its current label is index-based — but a richer image gallery would.

### 4.2 `BsSwipeContainerDirective` — keyboard nav + container-level ARIA

Current carousel keyboard logic (`carousel.component.ts:25-28, 123-158`) is orientation-aware: `ArrowLeft`/`ArrowRight` navigate when `orientation === 'horizontal'`; `ArrowUp`/`ArrowDown` navigate when vertical. It calls `preventDefault()` on the keys it handles to avoid scrolling the page.

This logic moves to the container with three changes:

1. **Listener stays on `document`.** Per design call (§3 out-of-scope): preserve current behaviour now, fix as a separate PRD.
2. **Gate via a new `keyboardEvents` input** (default `true`), matching the carousel's existing API surface.
3. **Add Home / End** (jump to first / last slide), per APG Carousel pattern §3.2.2. Carousel doesn't have these today; adding them in the swiper layer means every consumer gets them for free without churn in the carousel.

The container also picks up two new host attributes that derive from existing state — `aria-orientation` and `aria-keyshortcuts`. They're not in the carousel today, but they're defensibly true (the directive owns both pieces of state) and SR-useful.

```ts
// --- New inputs on BsSwipeContainerDirective ---

keyboardEvents = input(true);

// --- New computed signals ---

readonly ariaOrientation = computed(() => this.orientation());

readonly ariaKeyshortcuts = computed(() => {
  if (!this.keyboardEvents()) return null;
  return this.orientation() === 'horizontal'
    ? 'ArrowLeft ArrowRight Home End'
    : 'ArrowUp ArrowDown Home End';
});

// --- New host bindings ---

host: {
  // … existing bindings stay …
  '[attr.aria-orientation]': 'ariaOrientation()',
  '[attr.aria-keyshortcuts]': 'ariaKeyshortcuts()',
  '(document:keydown.ArrowLeft)': 'onKeyPress($event)',
  '(document:keydown.ArrowRight)': 'onKeyPress($event)',
  '(document:keydown.ArrowUp)': 'onKeyPress($event)',
  '(document:keydown.ArrowDown)': 'onKeyPress($event)',
  '(document:keydown.Home)': 'onKeyPress($event)',
  '(document:keydown.End)': 'onKeyPress($event)',
}

// --- New method (lifted + extended from carousel.component.ts:123-158) ---

onKeyPress(event: KeyboardEvent) {
  if (!this.keyboardEvents()) return;
  const orientation = this.orientation();
  let handled = false;
  switch (event.key) {
    case 'ArrowLeft':  if (orientation === 'horizontal') { this.previous(); handled = true; } break;
    case 'ArrowRight': if (orientation === 'horizontal') { this.next();     handled = true; } break;
    case 'ArrowUp':    if (orientation === 'vertical')   { this.previous(); handled = true; } break;
    case 'ArrowDown':  if (orientation === 'vertical')   { this.next();     handled = true; } break;
    case 'Home':       this.goto(0);                                              handled = true; break;
    case 'End':        this.goto(Math.max(0, this.actualSwipes().length - 1));    handled = true; break;
  }
  if (handled) event.preventDefault();
}
```

**Rationale for `aria-orientation`:** mirrors the directive's `orientation` input. Helps SR users understand which axis the arrow keys move on. APG uses it on tablist, slider, scrollbar, separator — analogous to a swipe container.

**Rationale for `aria-keyshortcuts`:** Modern SRs (NVDA 2020+, VoiceOver) read this to advertise available shortcuts. Computed from the same state that drives the keyboard handler so it can never drift from reality. Returns `null` when `keyboardEvents` is off so the attribute disappears entirely.

### 4.3 `BsSwipeViewportDirective` — viewport-level ARIA

The viewport directive currently has only style host bindings. It gains four inputs + four host attribute bindings:

```ts
@Directive({
  selector: '[bsSwipeViewport]',
  host: {
    '[style.overscroll-behavior]': '"contain"',
    '[style.pointer-events]': '"none"',
    '[attr.aria-live]': 'ariaLive()',
    '[attr.aria-atomic]': 'ariaAtomic()',
    '[attr.aria-relevant]': 'ariaRelevant()',
    '[attr.aria-busy]': 'ariaBusy()',
  },
})
export class BsSwipeViewportDirective {
  /** Drives the `aria-live` host attribute. Consumers that auto-advance
   *  can pass a computed signal that flips between 'off' (during rotation)
   *  and 'polite' (when paused / no auto-advance / reduced motion).
   *  Default 'off' — matches the carousel's "do not announce on every
   *  rotation tick" baseline. */
  ariaLive = input<'off' | 'polite' | 'assertive'>('off');

  /** Whether SRs should re-read the entire region on change (true) or only
   *  the diff (false). Default false — matches typical slide content where
   *  only the active slide is meaningful. */
  ariaAtomic = input<boolean | null>(false);

  /** Which kinds of mutations should fire the live announcement. Default
   *  `'additions text'` — covers the common case where slide content is
   *  swapped or text changes. */
  ariaRelevant = input<string | null>(null);

  /** Hide the region from announcements while a transition is in flight,
   *  so the SR only reads the *final* slide. Default null (not busy);
   *  consumers that want the polish wire it to the swipe container's
   *  `isAnimating` signal. */
  ariaBusy = input<boolean | null>(null);
}
```

**Rationale for keeping the gating logic on carousel:** deciding when to be `'off'` vs `'polite'` requires knowledge of `interval`, `paused`, and `prefers-reduced-motion` — three signals that are part of the carousel pattern (auto-advancing slideshow), not the swiper primitive. A static image gallery using swiper would just leave `ariaLive` at default `'off'` and pass `'polite'` if/when it announces something explicitly.

**Rationale for the live-region siblings (`aria-atomic` / `aria-relevant` / `aria-busy`):** they're the standard tuple that goes alongside `aria-live`. Having them as inputs lets consumers fine-tune SR behaviour (e.g., a step wizard that wants `aria-atomic="true"` so the whole step gets re-read on change) without touching template ARIA. Defaults err on "least announcement noise" so the carousel's current behaviour doesn't change.

**Carousel can opt into `aria-busy` for free:** the swipe container already exposes `isAnimating` (`swipe-container.directive.ts:58`). Carousel can pass `[ariaBusy]="container.isAnimating()"` so SRs don't read mid-transition slide labels. (Optional polish — not required for the migration to be complete.)

### 4.4 `bs-carousel` — what comes out, what stays, what's added

**Template (`carousel.component.html`) — JS branch only (lines 44-108):**

| Line | Before | After |
|---|---|---|
| 67 | `…bsSwipeViewport … [attr.aria-live]="slideAriaLive()"` | `…bsSwipeViewport … [ariaLive]="slideAriaLive()" [ariaBusy]="container.isAnimating()"` (inputs, not attrs; `ariaBusy` is the polish noted in §4.3) |
| 76 | `<div class="carousel-item" bsSwipe [offside]="true" aria-hidden="true">` | `<div class="carousel-item" bsSwipe [offside]="true">` (aria-hidden auto-set by directive) |
| 82-84 | `role="group" aria-roledescription="slide" [attr.aria-label]="(i + 1) + ' of ' + imageCount()"` | (deleted — directive owns all three) |
| 90 | `<div class="carousel-item" bsSwipe [offside]="true" aria-hidden="true">` | `<div class="carousel-item" bsSwipe [offside]="true">` |

**New attributes that appear on the rendered DOM** (carousel didn't have them before, swiper directives now contribute them):

| Attribute | Element | Source |
|---|---|---|
| `aria-orientation="horizontal"` (or `"vertical"`) | `[bsSwipeContainer]` host | computed from `orientation` input |
| `aria-keyshortcuts="ArrowLeft ArrowRight Home End"` | `[bsSwipeContainer]` host | computed from `orientation` + `keyboardEvents` |
| Home / End handling | `[bsSwipeContainer]` host listener | new keyboard handler |
| `aria-busy="true"` mid-transition | `[bsSwipeViewport]` host | wired by carousel from `container.isAnimating()` |

**Component class (`carousel.component.ts`):**

- Lines 25-28: delete the four `(document:keydown.*)` host bindings.
- Lines 123-158: delete the `onKeyPress` method.
- Line 46 `keyboardEvents = input(true)`: keep — but its only consumer becomes the swiper `[keyboardEvents]` binding in the template (~line 68 of the migrated template).

**Template wiring change at the swipe container (`carousel.component.html:68-74`):**

```html
<div bsSwipeContainer #container="bsSwipeContainer"
     [minimumOffset]="50"
     [animation]="animation()"
     [orientation]="orientation()"
     [keyboardEvents]="keyboardEvents()"   <!-- NEW -->
     [(imageIndex)]="currentImageIndex"
     (animationStart)="onContainerAnimationStart()"
     (animationEnd)="onContainerAnimationEnd()">
```

The `slideAriaLive` computed (lines 115-121) and the `keyboardEvents` carousel input both stay — they're correct, just consumed differently.

### 4.5 What stays on `bs-carousel` — and why these can't move

Three attributes look like candidates to push down but genuinely belong on the carousel host:

| Attribute | Carousel host (line 46-48 + SSR 3-5) | Why it stays |
|---|---|---|
| `role="region"` | yes | The landmark must encompass the *controls* (prev/next, play/pause, indicators) — those live as siblings of `bsSwipeViewport`, outside it. Moving the role to the viewport would shrink the landmark to exclude the controls, which violates APG Carousel pattern §1. |
| `aria-roledescription="carousel"` | yes | Pattern-specific terminology. A generic swiper used for a card grid is *not* a carousel; defaulting it on the swipe directives would mislabel non-carousel consumers. |
| `aria-label` (consumer-supplied name) | yes | Must label the same element that carries the `region` role — same reason. |

These are not duplication — they belong only on the carousel. The PRD doesn't move them.

The **prev / next buttons** and **indicators** also stay on carousel. They're carousel-pattern UI affordances, not swiper primitives. A scrollable card list using swiper directly wouldn't render either.

### 4.6 SSR branch is untouched

`carousel.component.html:1-43` (the `@if (isServerSide)` branch) renders radio-input markup for no-JS users. The swipe directives are not in that branch — they're not server-rendered, and even on hydration they don't activate before the client-side branch swaps in. The SSR branch's inline ARIA (lines 13-15: `role="group" aria-roledescription="slide" [attr.aria-label]="(i + 1) + ' of ' + imageCount"`) stays on the template.

Note this means the SSR branch and the JS branch will continue to *produce* the same DOM-level ARIA, just via different mechanisms (inline template vs. directive host bindings). That's fine: the test surface asserts the rendered attribute set, not the source of truth.

## 5. Testing

### 5.1 Swiper directives

Add to existing spec files (no new `.aria.spec.ts` — match the carousel/scheduler convention):

- `swipe.directive.spec.ts`:
  - Renders `role="group"` + `aria-roledescription="slide"` by default.
  - `aria-label` defaults to `"N of M"` based on position among non-offside siblings.
  - `[offside]="true"` → `aria-hidden="true"` and no `aria-label`.
  - `[ariaRoledescription]="'image'"` overrides the default word.
  - `[ariaLabel]="'…'"` overrides the auto-computed string.
  - Adding/removing offside slides recomputes the visible count + ordinals correctly.

- `swipe-container.directive.spec.ts`:
  - `keyboardEvents` default `true`.
  - ArrowLeft/Right calls `previous()`/`next()` in horizontal orientation; calls them via ArrowUp/Down in vertical orientation.
  - Off-axis arrows are no-ops (don't `preventDefault`).
  - Home jumps to first slide; End jumps to last slide (in either orientation).
  - `keyboardEvents=false` suppresses all six.
  - Listener attached on `document` (assert via spy or direct event dispatch).
  - `aria-orientation` host attribute matches the `orientation` input.
  - `aria-keyshortcuts` reflects the keys that will fire — `'ArrowLeft ArrowRight Home End'` horizontal, `'ArrowUp ArrowDown Home End'` vertical, absent when `keyboardEvents=false`.

- `swipe-viewport.directive.spec.ts`:
  - `aria-live` default `'off'`; input flips host attribute to `'polite'` / `'assertive'`.
  - `aria-atomic` default `false`; can be set `true`.
  - `aria-relevant` defaults absent; consumer-supplied string becomes the host attribute.
  - `aria-busy` defaults absent; consumer-supplied boolean becomes the host attribute.

### 5.2 Carousel — externally visible parity

Update `carousel.component.spec.ts` (and any aria assertions in existing suites): assert the **rendered** carousel still has the same attribute set on slides, offside clones, and the viewport. The tests should not care which directive emitted them.

Specifically, verify:
- Each visible slide still has `role="group"`, `aria-roledescription="slide"`, `aria-label` matching `"N of M"`.
- Offside (slide-mode clone) slides still have `aria-hidden="true"`.
- The viewport `aria-live` still flips between `'off'` and `'polite'` per the existing rules (no-interval / paused / reduced-motion → polite; otherwise off).
- ArrowLeft / ArrowRight still call `previous()` / `next()` end-to-end.
- `keyboardEvents=false` still disables them (now via the swiper input pass-through).

If any current carousel test asserts on the *source* (e.g. checks `onKeyPress` is on the component class, or checks that `(document:keydown)` is on the carousel host), rewrite it to assert on the resulting DOM behaviour instead.

### 5.3 Demo verification

The carousel demo page at `apps/mintplayer-bootstrap-demo/.../carousel/*` is the smoke test target:

- Navigate, focus a slide-adjacent element, press ArrowLeft / ArrowRight — the carousel still rotates.
- VoiceOver / NVDA / Narrator: announces "slide 2 of 4" when slide changes.
- DevTools accessibility tree: each slide shows `role="group"`, `aria-roledescription="slide"`, expected label.
- No regression in touch swipe, mouse drag, or play/pause.
- No regression in vertical-orientation behaviour.

## 6. Migration ordering

Single commit on `feat/aria-accessibility`:

1. Add inputs + host bindings + `onKeyPress` to the three swiper directives.
2. Strip the now-redundant template attributes + `onKeyPress` from `bs-carousel`; wire the `[keyboardEvents]` and `[ariaLive]` inputs.
3. Update `carousel.component.spec.ts` for the new attribute source.
4. Add the new swiper-side specs.
5. Browser-verify the demo page (touch + mouse + keyboard + SR readout).

Why one commit, not two: the swiper directives' new ARIA would *double-set* with carousel's own template attributes if landed in isolation (e.g., `role="group"` from both swiper's host and the carousel's inline `role="group"`). Browser dedup behaviour for duplicated attributes is well-defined (last-write-wins for inline, host bindings overwrite), but it's noise we don't need in the diff.

## 7. Risks

- **Other repos depending on `@mintplayer/ng-swiper` directly.** Public package; consumers outside this monorepo may compose the directives without `bs-carousel`. Adding `role="group"`, `aria-roledescription="slide"`, `aria-label="N of M"`, `aria-hidden` to every `bsSwipe` element changes their ARIA surface. **Mitigation:** the new inputs (`ariaRoledescription`, `ariaLabel`) are the override path. Document the change in the package CHANGELOG. Not a blocker per `feedback_breaking_changes_ok`.
- **Slide ARIA may be wrong for non-paginated swipe UIs.** A horizontal scrolling card list with `bsSwipe` per card isn't really a "slide N of M" — it's just a scrollable list. **Mitigation:** the consumer sets `[ariaRoledescription]="''"` (empty string suppresses the attribute) or supplies their own `[ariaLabel]`. Document this idiom in the package README.
- **Tests asserting on `document:keydown` listener attachment may be flaky.** The existing carousel keyboard tests likely use `dispatchEvent(new KeyboardEvent('keydown'))` on document. Same approach works for swiper — but JSDOM event ordering with multiple instances on a page is the kind of thing the muti-carousel bug interacts with. **Mitigation:** test one instance at a time per test case; keep the multi-instance bug fix to its own follow-up so it gets its own dedicated tests.
- **The auto-computed `"N of M"` label depends on `actualSwipes()` settling.** During initial render, `swipes()` is empty, then becomes populated; the computed label briefly evaluates to `null` (no label) before settling. **Mitigation:** matches carousel's current behaviour (its `imageCount()` has the same shape). Browser-verify nothing reads "0 of 0" mid-render.

## 8. Open questions for review

None blocking — the two design calls (keyboard scope, slide ARIA ownership) are settled. Document scoping is preserved as a deliberate parity decision; the tighter scope is queued as a separate PRD per §10.

## 9. Implementation checklist

- [ ] `BsSwipeDirective`: `ariaRoledescription` input, `ariaLabel` input, `effectiveAriaLabel` computed, host bindings for `role`/`aria-roledescription`/`aria-label`/`aria-hidden`.
- [ ] `BsSwipeContainerDirective`: `keyboardEvents` input, `ariaOrientation` + `ariaKeyshortcuts` computeds, `onKeyPress` method (with Home/End), six `document:keydown` host bindings, `[attr.aria-orientation]` + `[attr.aria-keyshortcuts]` host bindings.
- [ ] `BsSwipeViewportDirective`: `ariaLive` / `ariaAtomic` / `ariaRelevant` / `ariaBusy` inputs, four `[attr.aria-*]` host bindings.
- [ ] `bs-carousel` template: strip the migrated attributes (lines 67, 76, 82-84, 90); add `[keyboardEvents]` to the swiper container; add `[ariaLive]="slideAriaLive()"` and `[ariaBusy]="container.isAnimating()"` to the viewport.
- [ ] `bs-carousel` component: delete `host:keydown.*` bindings (lines 25-28) and `onKeyPress` method (lines 123-158).
- [ ] Specs: add ARIA + keyboard assertions to the three swiper specs; update carousel specs to assert the externally-visible attribute set rather than the source.
- [ ] Browser-verify the carousel demo (touch + mouse + keyboard + SR readout, both orientations, both animation modes; Home / End jumps; mid-transition aria-busy not announced).
- [ ] Update `aria-accessibility-audit.md` §13 row #1 ("`mintplayer-ng-swiper` keyboard story") to ✓ closed.
- [ ] Update `project_aria_outstanding_followups.md` to mark item #4 done.

## 10. Future follow-ups (out-of-scope for this PRD)

- **Scope swiper keyboard listeners to host + focus-within.** Replace `document:keydown` with `host:keydown` on the swipe container, and add `tabindex="0"` to the viewport so the swiper is a single keyboard-focusable region. Closes the latent multi-instance bug. Separate PRD.
- **`slide-changed` live announcer.** A dedicated `BsLiveAnnouncerService` consumer for slide transitions (rather than relying on `aria-live` on the viewport with all slide content inside it). Could land as part of swiper or stay on carousel.
- **Slide content roles.** APG suggests slide *content* (images, text) doesn't need any extra ARIA, but a swiper used for tab-control content would want `role="tabpanel"`. If a third consumer surfaces, expose a `role` override input on `bsSwipe` (today: hardcoded `"group"`).
