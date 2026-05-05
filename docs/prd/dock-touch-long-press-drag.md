# PRD: Long-press to drag on touch — keep tabstrip scrollable

**Status:** Proposed.
**Author:** Pieterjan
**Date:** 2026-05-05
**Library:** `@mintplayer/ng-bootstrap/dock`
**Component:** `<mint-dock-manager>` web component
**Reproduction:** https://bootstrap.mintplayer.com/advanced/dock on any touchscreen device with a stack containing several panes whose combined headers overflow the strip width.
**Related prior PRDs:**
- `docs/prd/dock-tab-drag-android-touch.md` — added `touch-action: none` to drag surfaces so undock works at all on Android.
- `docs/prd/dock-splitter-tabcontrol-lit-composition.md` — composed the dock from `<mp-tab-control>` + `<mp-splitter>` (where the strip lives today).

---

## 1. Problem

On touch devices, every gesture that begins on a tab header is interpreted as a drag. After PR #305 added `touch-action: none` to `.dock-tab` to stop Android from arbitrating the gesture as a page scroll, the dock now reliably undocks panels — but it undocks them **always**. The user has no way to scroll the tabstrip with their thumb when the headers overflow the strip width: every contact on a tab pulls the panel out of its dock.

Concretely, on a stack with five panes whose combined header widths exceed the strip:

1. User wants to scroll the strip horizontally to reach a hidden tab.
2. Thumb lands on a visible tab header.
3. Thumb moves >5 px sideways.
4. The panel undocks into a floating window. The strip never scrolled.

On desktop (mouse + trackpad), the current 5 px-distance arming is correct and not in question — the user can scroll the strip with the mousewheel or by clicking the (separate) scroll affordance, and a click-drag on a header is unambiguously a drag intent. The issue is exclusive to direct-manipulation touch input.

## 2. Background — what the code does today

Pointer-only architecture lives in `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts`:

1. **Tab header creation** (`:1514–1538`). For each pane, the dock creates a `<span class="dock-tab" slot="${tabId}-header">` and projects it into `<mp-tab-control>`. A single `pointerdown` listener on that span (`:1529`) calls `captureTabDragMetrics` + `armPaneDragGesture` and `event.stopPropagation()`. Comment at `:1533–1537` records that `preventDefault()` is *not* called, on purpose — it would suppress the synthesized click that `<mp-tab-control>` uses to fire `tab-activate`.

2. **Gesture arming** (`armPaneDragGesture`, `:1721–1761`). Registers window-capture `pointermove` / `pointerup` / `pointercancel` listeners scoped to the originating `pointerId`. Cross 5 px of distance from the start point → `beginPaneDrag` (`:1763`). Release first → `clearPendingTabDragMetrics`. The only pointerType-aware branch is `if (startEvent.pointerType === 'mouse' && startEvent.button !== 0) return;` (`:1727`), which rejects right/middle-click on mouse but treats touch identically to a left-click.

3. **CSS** (`mint-dock-manager.element.scss:277–292`):
   ```scss
   .dock-tab {
     cursor: grab;
     padding: 0.5rem 1rem;
     margin: -0.5rem -1rem;
     touch-action: none;   // ← blocks browser scroll arbitration on the tab itself
   }
   ```
   The `<ul class="nav nav-tabs flex-nowrap overflow-x-auto">` *inside* `<mp-tab-control>`'s shadow (`tab-control.styles.scss:34, 157`) is horizontally scrollable on overflow — but only when the touch lands on the gaps between tabs, because every tab carries `touch-action: none`.

4. **No timer / hold logic exists.** The 5 px distance threshold and the 8 px header-bounds threshold (reorder → floating, `:1976`) are the only gesture gates today.

## 3. Goals / non-goals

**Goals**

- A tap-and-hold on a tab header (touch input only) for ~600 ms, then drag, behaves exactly like a desktop click-drag does today: reorder while inside the strip, undock to floating once the finger leaves header bounds.
- A horizontal swipe on a tab header (touch input only), without the hold, scrolls the strip natively. The panel does not undock.
- A short tap (touch input, <600 ms, no significant movement) activates the tab — same as today.
- Mouse and pen behavior is unchanged. 5 px-distance arming, immediate.
- All existing pointer-architecture properties survive: window-capture listeners, `pointercancel` cleanup, no HTML5 dnd, the `dock-pane-activated` event.
- No public API change to `<mint-dock-manager>`.
- One PR, one ship — gesture mechanics + supporting CSS + visual press-feedback + tests all together.

**Non-goals**

- A configurable hold duration via attribute. Hard-code one constant; we can revisit if data comes back asking for it.
- Long-press on the floating window chrome (`.dock-floating__chrome`). Floating-pane chrome already implies "I am floating, drag me" — there's no scroll competing with it. Keep it on immediate arming.
- Long-press on splitter dividers / intersection handles / floating-resizers. Same rationale.
- Generalising long-press to other components (accordion, navbar, etc).

## 4. Design

### 4.1 Branch arming by `pointerType`

`armPaneDragGesture` (`mint-dock-manager.element.ts:1721`) gets a single new branch at the top:

```ts
if (startEvent.pointerType === 'touch') {
  this.armPaneDragGestureTouch(startEvent, path, pane, stackEl);
  return;
}
// existing mouse / pen path follows unchanged
```

Pen is treated as mouse — pen jitter is small and pen users expect direct-manipulation precision. If a future device class needs nuance, it gets its own branch.

### 4.2 Touch arming — long-press timer with movement slop

A new private method `armPaneDragGestureTouch` runs the touch-specific arming:

- **Constants** (top of file, near other class fields):
  ```ts
  private static readonly TOUCH_LONG_PRESS_MS = 600;
  private static readonly TOUCH_LONG_PRESS_SLOP_PX = 10;
  ```

- **State machine** (per-gesture, scoped to one pointerdown):
  | State | Entered when | Exit conditions |
  | --- | --- | --- |
  | `pending` | `pointerdown` on a tab header | timer fires → `armed`; movement >slop → `abandoned`; `pointerup` → `tap`; `pointercancel` → `abandoned` |
  | `armed` | hold timer fires while `pending` | `beginPaneDrag` runs synchronously with the most recent pointer position |
  | `tap` | `pointerup` arrived first | clear pending metrics; let browser-synthesized click drive `tab-activate` (no `preventDefault`) |
  | `abandoned` | movement >slop, or `pointercancel`, or visibility change | clear pending metrics; do nothing; native scroll proceeds |

- **Listeners** (registered on `window` with `capture: true`, mirroring the mouse path):
  - `pointermove` — track `latestClientX/Y`; if `Math.hypot(dx, dy) > SLOP` while `pending` → cancel timer, transition to `abandoned`, remove listeners.
  - `pointerup` — if `pending` → cancel timer, transition to `tap`, remove listeners.
  - `pointercancel` — if `pending` → cancel timer, transition to `abandoned`, remove listeners.

- **Timer firing path** (`pending` → `armed`):
  1. Call `setPointerCapture(pointerId)` on the dock host (`this`). This re-routes subsequent pointer events away from the browser's scroll arbitration to the dock element and is the key handshake that lets us start a drag mid-gesture without `pointercancel` hitting us.
  2. Synthesise the call to `beginPaneDrag` using the latest tracked `clientX/Y` and the same `pointerId`. `beginPaneDrag` already accepts a `PointerEvent`-shaped argument; we either pass the most recent move event we held a reference to, or construct a minimal `{ clientX, clientY, pointerId, pointerType: 'touch' }` shim — whichever is cleaner at implementation time.
  3. From here, the existing pipeline takes over: `dragState` is set, `startDragPointerTracking` runs (`:1813`), and the existing reorder-vs-undock 8 px header-bounds threshold (`:1976`) governs subsequent behavior. This is the part of the spec that matches "initially to reorder tabs within the tabstrip without undocking; when the tabstrip is exited by the thumb turn into a floating panel."

- **Self-cleanup** matches the mouse path: every exit path runs `cleanup()` which clears the timeout and removes all three window listeners.

### 4.3 CSS — let the strip scroll until the long-press fires

`mint-dock-manager.element.scss` change to `.dock-tab`:

```scss
.dock-tab {
  cursor: grab;
  padding: 0.5rem 1rem;
  margin: -0.5rem -1rem;

  // Allow horizontal scroll on the tabstrip while the finger is "deciding"
  // (the long-press hasn't fired yet). The browser claims the gesture for
  // pan-x and fires pointercancel — armPaneDragGestureTouch interprets that
  // as "user is scrolling" and leaves the panel docked. Once the long-press
  // fires we call setPointerCapture on the host and the browser stops
  // arbitrating, so subsequent moves drive the drag normally.
  touch-action: pan-x;

  // Suppress iOS magnifier loupe / selection on long-press.
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
```

`pan-x` is the right policy because the strip itself is `overflow-x: auto`. If a stack ever ships with a vertical-scroll strip, this becomes `pan-y` — but that's not a current configuration.

The other `touch-action: none` declarations (`.dock-floating__chrome` `:82`, `.dock-floating__resizer` `:121`, `.dock-intersection-handle` `:218`) stay as-is. They guard surfaces that have no competing native gesture.

### 4.4 Press feedback during the hold

The user has no cursor on touch, so the only signal that "I'm being held" is visual. Without it, a 600 ms wait feels broken.

Add a `.dock-tab[data-pressing="true"]` class applied 150 ms into the hold and removed on any state transition out of `pending`:

```scss
.dock-tab[data-pressing='true'] {
  background-color: var(--bs-secondary-bg-subtle, rgba(0, 0, 0, 0.05));
  transform: scale(1.02);
  transition: background-color 100ms ease-out, transform 100ms ease-out;
}
```

The 150 ms delay before applying the class hides the effect for transient taps. The transform amount is small enough not to clip in the strip but large enough to be perceptible.

When the long-press fires (transition `pending` → `armed`), the dock fires a navigator vibration if available:

```ts
if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
  navigator.vibrate(10);
}
```

This matches iOS/Android native long-press conventions. It is a no-op on desktop and on devices without the vibration API.

### 4.5 Spec test — drive both code paths

The existing `mint-dock-manager.element.spec.ts` has tests for `pointerType: 'mouse'`. Add a parallel suite that:

1. Dispatches `PointerEvent('pointerdown', { pointerType: 'touch', clientX, clientY, pointerId, isPrimary: true })` on a tab header.
2. Asserts `dragState === null` immediately after, and after a `pointermove` 3 px away.
3. Advances fake timers by 600 ms.
4. Asserts `dragState !== null` and the pane has been removed from its source stack only after the 600 ms tick.
5. Separate test: dispatch `pointerdown` (touch) → `pointermove` 30 px → assert no drag was armed even after 600 ms.
6. Separate test: dispatch `pointerdown` (touch) → `pointerup` after 200 ms → assert `tab-activate` fires and no drag.

Use Vitest's `vi.useFakeTimers()` for the 600 ms wait; the existing spec already runs in jsdom with synthetic events.

## 5. Edge cases

- **Two-finger gestures.** `armPaneDragGestureTouch` keys all listeners on `pointerId`. A second finger landing on a different tab gets its own pointerdown and its own arming state; they do not interact. The pinch-zoom case is handled by the browser at the document level since `.dock-tab` is `pan-x`, not `none`.
- **Pointer leaves the tab during the hold.** Movement >slop transitions to `abandoned`. The thumb sliding off the tab onto the strip background is identical to "user is scrolling."
- **Pointer leaves the window during the hold.** `pointercancel` fires, transition to `abandoned`. No drag, nothing leaks.
- **Page becomes hidden during the hold** (tab switch, OS notification full-screen). Add a `visibilitychange` listener for the duration of `pending`; on hidden, `abandoned`. (Matches how `armPaneDragGesture` survives DOM teardown via window-level listeners — same pattern.)
- **Concurrent floating-pane drag and tab long-press.** They use different `pointerId`s and different state objects (`floatingDragState` vs `dragState`). No interaction.
- **Spec assertion re: tab-activate semantics.** Releasing during the hold must not call `event.preventDefault()` on the original `pointerdown`. The current code (`:1533`) already abstains; the new touch path keeps that abstention for the `tap` exit and adds it nowhere else. The synthesized click on `<button class="nav-link">` continues to drive `<mp-tab-control>`'s `tab-activate`.
- **Hold fires, but the original `.dock-tab` span has been removed by a re-render.** This is the same hazard that exists today (see `dock-tab-drag-android-touch.md` §3.2). Window-capture pointermove/pointerup listeners survive any DOM rebuild; `setPointerCapture` is on the dock host, which is stable. No regression.

## 6. Alternatives considered

### 6.1 Distance threshold only, no timer

Bump the touch threshold from 5 px to ~30 px so a "scroll-y" swipe doesn't undock. **Rejected.** The strip is `overflow-x: auto` — a horizontal swipe to scroll *is* the gesture we need to allow. A larger distance threshold delays the drag-undock by a similar amount but doesn't free the strip to scroll.

### 6.2 Dedicated drag handle (grip icon)

Add a `<span class="dock-tab__grip">⋮⋮</span>` to each tab header; only the grip arms a drag. **Rejected.** Doubles header width, fights the existing dense `.nav-link` padding, and is contrary to direct-manipulation expectations on touch (no other touch tab UI does this).

### 6.3 Direction-based arbitration (vertical move = drag, horizontal = scroll)

Inspect the first move's angle: vertical → arm drag, horizontal → release to scroll. **Rejected.** Tab strips are horizontal, so an undock-to-floating gesture *also* starts horizontal in many cases. Direction is not a clean signal here.

### 6.4 `touch-action: manipulation` instead of `pan-x`

`manipulation` allows pan + pinch but disables double-tap-to-zoom. **Rejected.** `pan-x` is the precise statement: this surface scrolls horizontally only. `manipulation` admits vertical pan, which we don't want from a horizontal strip.

## 7. Out-of-scope follow-ups

These are explicitly *not* in this PRD's scope. Logged here so we don't lose them.

- **Pen on hybrid touchscreens with no mouse fallback.** If a Surface/iPad-Pencil user reports the immediate-arm path feels too sensitive, revisit the pointerType branching to send pen down the touch path.
- **Long-press on splitter dividers** to expose a snap-to-grid mode. Distinct feature, not a gesture-mechanics question.
- **Drag affordance on hover** for desktop discoverability. Cosmetic, separate.

## 8. Test plan

**Manual matrix** (run on https://bootstrap.mintplayer.com/advanced/dock, configure layout to overflow the strip):

| Device | Gesture | Expected |
| --- | --- | --- |
| Android Chrome | Quick horizontal swipe on a tab header | Strip scrolls horizontally; no undock |
| Android Chrome | Hold tab ≥600 ms, then drag down | Pane undocks to floating, follows finger |
| Android Chrome | Hold tab ≥600 ms, then drag sideways within strip | Reorders tabs (existing behavior) |
| Android Chrome | Tap tab (release <600 ms) | Tab activates, no drag |
| iOS Safari | All four cases above | Same as Android |
| iOS Safari | Hold tab ≥600 ms | No magnifier loupe / text selection appears |
| Desktop Chrome (mouse) | Drag tab header | Immediate arm at 5 px (unchanged) |
| Desktop Chrome (mouse) | Click tab header | Tab activates (unchanged) |
| Surface w/ pen | Pen tap-and-drag tab header | Immediate arm at 5 px (treated as mouse) |

**Automated** (`mint-dock-manager.element.spec.ts`):

- New `describe('touch long-press arming', …)` block with the six cases listed in §4.5.
- Existing mouse tests continue to pass unchanged.

**Visual regression** — capture before/after screenshot of the tab strip on a desktop browser to confirm no layout shift from the new CSS (`pan-x` instead of `none` is invisible until interacted with; `user-select: none` is invisible).

## 9. Files touched

| File | Change |
| --- | --- |
| `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts` | Add `TOUCH_LONG_PRESS_MS` / `TOUCH_LONG_PRESS_SLOP_PX` constants; add `armPaneDragGestureTouch` private method; branch `armPaneDragGesture` (`:1727`) on `pointerType === 'touch'`; ensure `setPointerCapture` is called on `armed` transition; press-feedback `data-pressing` attribute toggling; navigator.vibrate ping. |
| `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.scss` | `.dock-tab` `touch-action: none` → `touch-action: pan-x`; add `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none`; add `.dock-tab[data-pressing='true']` press-feedback rule; comment update. |
| `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.spec.ts` | New `describe('touch long-press arming', …)` block, six cases. |

No template, demo app, public-API, or `<mp-tab-control>` changes.
