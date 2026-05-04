# PRD: Reliable tab-drag-to-undock on Android touch

**Status:** Implemented on branch `fix/dock-tab-drag-android-touch`, awaiting device validation + PR.
**Author:** Pieterjan
**Date:** 2026-05-04
**Library:** `@mintplayer/ng-bootstrap/dock`
**Component:** `<mint-dock-manager>` web component
**Reproduction:** https://bootstrap.mintplayer.com/advanced/dock on Android Chrome

---

## 1. Problem

On Android Chrome, dragging a tab header in the dock manager partially works and partially doesn't:

- **Tab undocks correctly.** Long-pressing a tab header and starting to drag does promote the tab into a floating pane at its original position.
- **Floating pane then does not follow the finger.** Subsequent finger movements scroll the page instead of repositioning the freshly-floated pane.
- **Other touch interactions in the same component work fine.** Splitter divider drag and intersection-handle resize both work reliably on the same device. Resize-while-scrolling occasionally still scrolls the page, but most of the time tracks correctly.

The asymmetry is the diagnostic clue: the working interactions all run on elements that have `touch-action: none` in CSS; the failing interaction does not.

## 2. Background — what the code does today

The tab-drag flow lives in `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts`:

1. **`pointerdown` on the slotted `.dock-tab` span** (`mint-dock-manager.element.ts:1529`) calls `captureTabDragMetrics` + `armPaneDragGesture` and `event.stopPropagation()`. **It does not call `event.preventDefault()` and it does not call `setPointerCapture(event.pointerId)`.**
2. **`armPaneDragGesture`** (`mint-dock-manager.element.ts:1716`) waits until the pointer moves >5 px. During this window, listeners are registered on `window` in capture phase for `pointermove` / `pointerup` / `pointercancel`. Once the threshold is crossed, `beginPaneDrag` runs.
3. **`convertPendingTabDragToFloating`** (`mint-dock-manager.element.ts:2285`) removes the pane from its docked stack and calls `renderLayout()` which rebuilds the affected DOM subtree. The original `.dock-tab` span is replaced (not just moved). The newly-rendered floating wrapper is then marked `data-dragging='true'` (CSS rule `.dock-floating[data-dragging='true']` sets `pointer-events: none` to let `elementsFromPoint` see the docked stacks underneath).
4. **`startDragPointerTracking`** (`mint-dock-manager.element.ts:2231`) attaches `pointermove`/`pointerup`/`pointercancel` listeners on `window` with `capture: true` to drive `onDragPointerMove` (`:2256`), which repositions the floating wrapper. A `pointercancel` from the OS calls `onDragPointerCancel` (`:2278`) → `handleDragPointerUpCommon` → `stopDragPointerTracking`, which kills the drag without committing a drop.

The splitter and scheduler web components use the same pointer-events architecture but additionally:

- **Splitter.** `libs/mintplayer-ng-bootstrap/web-components/splitter/src/styles/splitter.styles.scss:56` — `.divider { touch-action: none; }`.
- **Scheduler.** `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/styles/scheduler.styles.scss:236, 570, 619` — `touch-action: none` on the draggable event, on `.scheduler-container.touch-drag-mode`, and on `.scheduler-content.scroll-blocked`.

This same touch-action arbitration class of bug was previously root-caused for the carousel in `vertical-swipe-firefox-android.md`. The lesson there (§3.1, §6.1): `touch-action` is arbitrated by the browser **before** main-thread JS runs, so it must be set on every element along the gesture's ancestor chain that the user might touch — not just the leaf handler.

## 3. Root-cause analysis

Two factors compound. **3.1 is the dominant cause and is sufficient on its own to produce the observed behaviour.**

### 3.1 No `touch-action: none` on the tab-drag path

`.dock-tab` (`mint-dock-manager.element.ts.scss:267`) has `cursor: grab` but no `touch-action`, so it inherits the browser default `auto`. The slotted `<button class="nav-link">` it projects into (`tab-control.styles.scss:96`) also has no `touch-action`. The dock manager host (`:host`, `mint-dock-manager.element.ts.scss:1`) has none either. Nothing along the gesture's ancestor chain restricts touch arbitration.

On Android Chrome, when the finger first contacts a tab header:

1. `pointerdown` fires synchronously and `armPaneDragGesture` registers window-level pointermove listeners.
2. As the finger starts to move, the browser arbitrates between "scroll the page" and "deliver pointermove to JS." With `touch-action: auto` and no `event.preventDefault()` in the pointerdown handler, the browser is free to claim the gesture for scroll at any point in the first few millimetres.
3. **In some strokes the first pointermove fires before arbitration completes.** That single move crosses the 5 px threshold, `beginPaneDrag` runs, the floating wrapper is created, and the user sees the tab undock. This matches the user's observation that undocking *does* succeed.
4. **Immediately after,** the browser finalises arbitration and decides the gesture is a scroll. It fires `pointercancel` on the window listeners. `onDragPointerCancel` (`:2278`) calls `stopDragPointerTracking`, and from this point the page scrolls. The floating pane is left where it was placed at the moment of detach.

### 3.2 No `setPointerCapture` on the tab header

The resize handlers all call `setPointerCapture(event.pointerId)` on pointerdown (`:781, :1061, :1098`). The tab-header pointerdown (`:1529`) does not.

This matters because when `convertPendingTabDragToFloating` calls `renderLayout()` (`:2374`), the original `.dock-tab` span is replaced, not moved. With explicit pointer capture on the original span, the browser would still route pointer events to that element until release — but the element is gone, so capture would have to be transferred, which is non-trivial.

In practice, **3.2 is a non-issue once 3.1 is fixed**: the window-level capture-phase listeners in `startDragPointerTracking` (`:2237-2239`) survive any DOM rebuild and continue receiving events as long as the browser doesn't claim the gesture for scroll. `setPointerCapture` is a redundant defence here, not the primary fix.

### Net effect

The browser's gesture arbitration claims the touch as a page scroll *after* the 5 px threshold has already been crossed. The dock sees the threshold cross (so the pane undocks visually), then sees `pointercancel` (so subsequent moves don't reach the drag handler). The user sees a half-completed drag.

## 4. Goals / non-goals

**Goals**
- Tab-drag-to-undock works end-to-end on Android Chrome and Mobile Safari (undock + reposition + drop).
- No regression on desktop (mouse + trackpad) or on the splitter/intersection drag paths.
- Floating-pane chrome drag (already-floating panes) is also fixed in the same change, since it has the same root cause.
- No public API change to `<mint-dock-manager>`.

**Non-goals**
- Long-press / haptic affordances. The current threshold-based gesture stays.
- Native mobile drop-shadow / drag-image styling.
- Generalising tab-control buttons to `touch-action: none` outside the dock context — that would block normal page scroll on tab strips that don't host draggable content.

## 5. Proposed fix

### 5.1 Primary: `touch-action: none` on every dock-owned drag surface

In `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.scss`, four selectors gain `touch-action: none`:

- `.dock-tab` — the originally-reported issue (tab undocks then floating pane stops following the finger).
- `.dock-floating__chrome` — chrome-drag of an already-floating pane has the same root cause.
- `.dock-intersection-handle` — corner-resize already calls `event.preventDefault()` + `setPointerCapture()`, but the user observed it "sometimes still scrolls the page while resizing" on Android. `preventDefault` alone doesn't beat the compositor-thread scroll-claim; `touch-action: none` does.
- `.dock-floating__resizer` — same reasoning as the intersection handle, for the floating pane's edge/corner resizers.

This is **scoped to the dock**: only the elements the dock owns are touch-action restricted. The mp-tab-control's own `.nav-link` styling is unchanged, so tab strips outside the dock continue to allow native scroll.

The `.dock-tab` span has `display: block` + `padding: 0.5rem 1rem` + `margin: -0.5rem -1rem`, which makes it cover the entire `.nav-link` button it's slotted into. The user's finger lands on the span, not on the button's padding, so `touch-action` on `.dock-tab` is effective in practice. Slotted elements participate in the rendered tree for touch-action arbitration, so this works across the shadow-DOM boundary.

### 5.2 Secondary: pointerdown hardening

In `mint-dock-manager.element.ts:1529`, augment the tab-header pointerdown to:

```ts
headerSpan.addEventListener('pointerdown', (event) => {
  this.captureTabDragMetrics(event, stack);
  this.armPaneDragGesture(event, this.clonePath(location), paneName, stack);
  event.stopPropagation();
  // Belt-and-braces: even with touch-action: none, calling preventDefault
  // on the pointerdown removes any residual arbitration window where the
  // browser might still treat the touch as a candidate scroll.
  if (event.pointerType !== 'mouse') {
    event.preventDefault();
  }
});
```

Skipping `preventDefault` for mouse preserves text-selection and click semantics on desktop. On touch, `preventDefault` is harmless (it only prevents the implicit mouse-event synthesis and any default scroll-claim).

### 5.3 No change to pointercancel handling

`onDragPointerCancel` (`:2278`) currently aborts the drag without committing — that is the correct behaviour for OS-level cancels (incoming phone call, etc.) and stays as-is. Once 5.1 is in place, `pointercancel` will only fire for genuine OS interruptions, not for browser scroll arbitration.

## 6. Test plan

**Manual — primary**
- Android Chrome on `https://bootstrap.mintplayer.com/advanced/dock` after deploy:
  - Long-press a tab → drag → confirm undock + finger-tracking + drop into another stack.
  - Long-press the floating chrome of an already-floating pane → drag → confirm tracking.
  - Vertical and horizontal drags both work; page does not scroll while dragging.
- Mobile Safari (iOS): same checklist. iOS WebKit's gesture arbitration is less aggressive than Android Chrome's APZ, but `touch-action: none` is the same standard.
- Desktop Chrome / Firefox: confirm mouse drag still works, tab activation on click still works (the click after a no-move pointerdown should still fire — `armPaneDragGesture` resolves on `pointerup` without promoting if the threshold isn't crossed).

**Automated**
- Existing `mint-dock-manager.element.spec.ts` already exercises the threshold→drag→drop flow with synthetic PointerEvents (`spec.ts:101-120`). Add a regression test that asserts `.dock-tab` has `touch-action: none` in computed style after render. This is a cheap structural test — it doesn't need a real touch event.

**Visual / non-regression**
- Splitter divider drag on touch: unchanged.
- Intersection handle drag on touch: unchanged.
- Tab activation by click (no drag) on desktop: unchanged.
- Tab strip horizontal scroll (when the strip overflows) outside the dock: unchanged, because the touch-action change is scoped to `.dock-tab` (not `.nav-link`).

## 7. Risks / things to watch

- **Tab strip horizontal overflow scroll inside the dock.** When a dock has many tabs and the strip overflows, swiping the strip to scroll horizontally would now be blocked on the `.dock-tab` spans (the user's finger would land on a span and `touch-action: none` would prevent the scroll). The buttons' padding outside the spans (~0 px after the negative margin) is too small to use as a scroll gutter. Mitigation: this is a **theoretical** regression — tab strips inside the dock don't currently support horizontal overflow scroll on touch anyway (the scrollbar is hidden via `overflow: hidden` on `.tsc`). No real loss. Worth noting in case strip-scroll is added later.
- **Finger landing on the button's padding rather than the span.** With the negative-margin trick the span covers the button's text padding, but if a future change to `.nav-link` padding outpaces `.dock-tab`'s margin, a few pixels of `.nav-link` would become reachable and would not have `touch-action: none`. Mitigation: keep `.dock-tab`'s padding/margin in sync with `.nav-link`'s padding, as the existing comment at `mint-dock-manager.element.scss:262-266` already documents.
- **`event.preventDefault()` on pointerdown may suppress synthetic mousedown** on the slotted button. mp-tab-control's tab activation listens for `click`, not `mousedown`, so the click still fires on `pointerup` if the threshold isn't crossed. Verify this in the existing spec.

## 8. Decision

**Yes, this is fixable**, and cheaply. The fix is two CSS lines + a small pointerdown guard, all scoped to the dock manager. It mirrors the pattern already proven in the splitter and scheduler in this same workspace, and the same gesture-arbitration principle established in `vertical-swipe-firefox-android.md`.

Estimated change: ~5 lines of CSS, ~3 lines of TS, plus one assertion in the existing spec. Single PR, no API surface change.

## 9. References

- `vertical-swipe-firefox-android.md` — earlier analysis of the same `touch-action` arbitration class of bug for the carousel.
- MDN, [`touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) — gesture-arbitration semantics.
- W3C, [Pointer Events Level 3 §10.1](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property) — `touch-action` interaction with pointer events.
