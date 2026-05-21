# PRD: Whole-pane floating drag must be transparent to elementsFromPoint

**Status:** Proposed
**Author:** Pieterjan
**Date:** 2026-05-21
**Library:** `@mintplayer/ng-bootstrap/dock`
**Tracks:** _(issue TBD)_
**Related:** [PRD: Floating-pane bounds clamping](./dock-floating-pane-bounds.md) ([#347](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/347))

---

## 1. Problem

Drag a floating pane (the **whole window**, by its title chrome) over another floating pane. The drop-target joystick appears on the pane underneath, as long as the dragged pane's *render position* tracks the pointer one-to-one. The moment clamping (introduced by #347 / PR #348) decouples the dragged pane's render position from the pointer — i.e. the pane is pinned at a host edge while the pointer keeps moving — the joystick on the target pane stops activating.

### Concrete repro

At `http://localhost:4200/enterprise/dock`:

1. Resize **Panel 5** so its height is small (drag the bottom resize handle upward to ~80–100 px).
2. Drag Panel 5 by its title bar toward **Floating Utilities**. Hover the top half of Floating Utilities.
   - ✅ **Expected and observed:** the drop-indicator overlay + joystick appears centred on Floating Utilities.
3. Continue dragging Panel 5 in the same direction until its rendered position clamps against a host edge (Panel 5 stops following the pointer; the pointer continues).
4. With the pointer still over Floating Utilities, observe the joystick.
   - ❌ **Bug:** the joystick on Floating Utilities is gone and cannot be re-activated from over that pane while Panel 5 stays clamped.

The user's diagnosis matches the mechanism: *"there seems to be an offset not being taken into account when a pane is clamped to the edge."* The offset is the clamp delta — the gap between where the pane is and where the pointer is.

### Code-path audit

The drop target is decided in `updateFloatingDragDropTarget` via `findStackAtPoint(event.clientX, event.clientY)`, which calls `shadow.elementsFromPoint(clientX, clientY)` and walks the returned list looking for a `.dock-stack`. If the first `.dock-stack` it finds belongs to the dragged pane, line 1338 short-circuits and hides the indicator:

```ts
// mint-dock-manager.element.ts:1337-1344
const path = this.parsePath(stack.dataset['path']);
if (!path || (path.type === 'floating' && path.index === state.index)) {
  if (state.dropTarget) {
    delete state.dropTarget;
    this.hideDropIndicator();
  }
  return;
}
```

For the wrapper to be skipped by `elementsFromPoint`, the CSS rule already in place must apply:

```scss
// mint-dock-manager.element.scss:73-75
.dock-floating[data-dragging='true'] {
  pointer-events: none;
}
```

This rule is wired up for the **tab-drag** path: `markDraggedFloatingWrapper()` (lines 2769-2778) sets `data-dragging='true'` on the source wrapper, and the two call sites at lines 2190 (drag begin) and 2765 (tab-tear-off conversion) keep it in sync. The clearer is `clearDraggedFloatingWrapperMarkers()` at line 2780.

The **whole-pane drag** path — `beginFloatingDrag` / `handleFloatingDragMove` / `endFloatingDrag` (lines 1181-1320) — **never sets `data-dragging`**. So the dragged wrapper retains `pointer-events: auto` for the entire drag.

### Why the joystick used to appear at all (pre-clamp)

When the pointer is on the title chrome, `elementsFromPoint` returns the chrome first. The chrome is `.dock-floating__chrome`, not `.dock-stack`, so `findStackInTargets` walks past it. The next match in the z-ordered list is the **target** pane's `.dock-stack` underneath (the dragged pane's stack body sits below the chrome and isn't at the pointer's y-coordinate, so it isn't returned). The joystick appears on the target.

This works in steady state because, with no clamp, the chrome is always glued to the pointer (constant grab offset). The pointer never strays off the chrome onto the dragged pane's stack body.

### Why clamp breaks it

`handleFloatingDragMove` (line 1267) computes the would-be position from the pointer, clamps it against the host (PR #348), and writes the clamped value to both `wrapper.style.left/top` and `floating.bounds`. The pointer offset bookkeeping (`state.startX`, `state.startLeft`) is fixed at drag start, so when the clamp caps the pane's position at a host edge, the pointer continues moving relative to the pane. The pointer drifts off the chrome, and one of two things happens:

1. **Pointer over the dragged pane's stack body.** `elementsFromPoint` returns the dragged pane's `.dock-stack` first (z-promoted to the top by `promoteFloatingPane`). `findStackInTargets` returns it. Line 1338 hides the indicator. The joystick disappears.
2. **Pointer off the dragged pane and over the target's stack.** This case works correctly — but it's an unstable region of the host edge, and any drift back over the dragged pane's body re-triggers case 1.

The bug is asymmetric: tab-tear-off drags already pass through. Whole-pane drags don't.

---

## 2. Goals

1. **The dragged floating pane is transparent to `elementsFromPoint` for the entire whole-pane drag**, just as it is for tab drags today. The drop-target probe sees through to whatever is underneath.
2. **The clamped state is no longer special.** Pre-clamp and clamped behave identically — the drop-target lookup never returns the dragged pane.
3. **No public API change** and no change to `DockFloatingPaneBounds` semantics.
4. **No regression in the existing pointer-events arrangement:** the drag itself continues to receive `pointermove`/`pointerup` via pointer capture on the chrome (pointer capture is independent of CSS `pointer-events`, so disabling pointer-events on the wrapper does not break the gesture).
5. **Lock the behavior with a test.**

### Non-goals

- Re-architecting `findStackAtPoint` or the drop-target probe.
- Changing `beginFloatingDrag`'s clamp-to-rendered-bounds re-anchor (introduced by PR #348). That stays.
- Touching the tab-drag path. It already works.
- Snap-back / "release at edge" behavior or any animation when the pointer detaches from the pane during clamp.
- Adjusting `getFloatingPaneZIndex` / `promoteFloatingPane`. The z-promotion is correct; the fix is purely about `pointer-events`.

---

## 3. Design

### 3.1 Set `data-dragging` on the wrapper for whole-pane drags

Wire the same dataset marker used by the tab-drag path into `beginFloatingDrag` and `endFloatingDrag`:

| Site | Change |
|---|---|
| `beginFloatingDrag` (mint-dock-manager.element.ts:1208 area) | After `promoteFloatingPane(index, wrapper)`, set `wrapper.dataset['dragging'] = 'true'`. |
| `endFloatingDrag` (line 1296 area) | Before clearing `floatingDragState`, delete `wrapper.dataset['dragging']` from `state.wrapper`. Place this in the same try-block-adjacent location as `delete state.handle.dataset['resizing']` (line 1309) so a thrown `releasePointerCapture` doesn't strand the dataset. |

The CSS rule at `.dock-floating[data-dragging='true']` already does the rest.

**Why not call `markDraggedFloatingWrapper` directly?** That helper reads from `dragState?.floatingIndex`, which is the tab-drag state machine, not `floatingDragState`. The whole-pane drag has direct access to `wrapper` via `floatingDragState.wrapper`, so an inline set is simpler and avoids overloading the helper's contract.

### 3.2 Cleanup safety

`clearDraggedFloatingWrapperMarkers()` already exists and clears `data-dragging` from every wrapper in the floating layer. It is called from at least one tab-drag teardown path. Keep using the targeted `delete` in `endFloatingDrag` (mirrors how `state.handle.dataset['resizing']` is cleared), but the broad-sweep helper acts as a safety net if any unexpected path ends a drag without going through `endFloatingDrag` cleanly. No change needed there.

### 3.3 No data-model or render changes

`floating.bounds`, `clampBoundsToHost`, and the `handleFloatingDragMove` math stay byte-for-byte the same. The fix is two lines of dataset toggling.

---

## 4. Implementation phases

This is a single milestone — the fix is too small to phase usefully.

| Step | Touchpoints |
|---|---|
| 1. Toggle `data-dragging` in the whole-pane drag begin/end. | `mint-dock-manager.element.ts` (~2 lines added at lines 1208 / 1315 area). |
| 2. Verification gate (see §5). | Demo page + new unit / e2e test. |

---

## 5. Verification

### 5.1 Manual gate (repro from §1)

1. Open `http://localhost:4200/enterprise/dock`.
2. Shrink Panel 5's height.
3. Drag Panel 5 by its chrome over Floating Utilities — joystick appears.
4. Keep dragging until Panel 5 clamps to a host edge.
5. Move the pointer back over Floating Utilities while Panel 5 stays clamped.
6. **Expected:** the joystick re-appears on Floating Utilities; the four directional buttons + center button all activate on hover.
7. **Expected:** dropping releases Panel 5 into Floating Utilities at the chosen zone.

### 5.2 Unit test

`mint-dock-manager.element.spec.ts` — a focused test that:

1. Mounts the WC with two floating panes.
2. Calls `beginFloatingDrag` (via dispatched pointerdown on the chrome).
3. Asserts `wrapper.dataset['dragging'] === 'true'` on the source wrapper during the drag.
4. Calls `endFloatingDrag` and asserts the dataset key is gone.

This locks the contract independent of the pointer-events behavior of jsdom / happy-dom.

### 5.3 e2e test (optional, gated on Playwright permission)

A Playwright scenario that drives the §5.1 sequence in Chromium against `http://localhost:4200/enterprise/dock`. Asserts that after the clamp, hovering Floating Utilities produces `[data-visible='true']` on `.dock-drop-indicator` (or that one of the joystick buttons has `[data-active='true']`).

This e2e is dropped from the must-ship list if Playwright access in CI remains gated — the unit test + manual gate are sufficient.

### 5.4 Regression check

The existing tab-drag tests must continue to pass — the new `data-dragging` toggle on the whole-pane wrapper must not collide with the tab-drag path's own `data-dragging` toggle on the same wrapper (which can happen if a tab-tear-off lands in the floating layer and is then drag-floated whole). Worst case is double-set / double-delete, which is idempotent on `dataset.delete`. No code change for this; just verify in the unit test that running both flows back-to-back leaves the wrapper clean.

---

## 6. Decisions

- **Why not skip the dragged pane in `findStackInTargets` instead?** Adding a `dragState`-aware skip in the elements walk would duplicate the existing `data-dragging` mechanism and add a second source of truth. The CSS-based approach is already proven on the tab-drag path; reusing it costs two lines and is symmetrical.
- **Why not eager-recover at the clamp boundary** (e.g. teleport the chrome to the pointer when clamped)? That would change the gesture's visual semantics (the pane would "snap" toward the pointer when it had nowhere to clamp to), and the user explicitly described the clamp itself as desired behavior. The bug is purely a hit-test mismatch.
- **Why touch only `beginFloatingDrag` / `endFloatingDrag` and not the resize gesture?** Resize doesn't move the pane laterally past the pointer, and the resize gesture uses the *handle* (resizer) for pointer capture rather than the chrome. The pointer stays on the handle and never hit-tests against another stack. No fix needed there.

---

## 7. Risks

- **Tab-drag path collision.** Both code paths now toggle `data-dragging` on the same wrapper. The only legal sequence is begin → end → begin, never overlapping, because both gestures use pointer capture on different handles (chrome vs tab) and the WC doesn't multiplex two captures. Verified in §5.4.
- **Pointer capture interaction with `pointer-events: none`.** Setting `pointer-events: none` on an element that has captured the pointer does not release the capture; pointermove/pointerup continue to fire on the captured element. Already proven by the tab-drag path which uses the exact same arrangement.
- **Latent dependency on `elementsFromPoint` returning the chrome before the dragged stack.** Before this fix, the pre-clamp working case relied on the pointer being glued to the chrome (which isn't a `.dock-stack`). After this fix, that no longer matters — the dragged wrapper is fully transparent to `elementsFromPoint`. If someone later reverts `data-dragging` on the wrapper, the bug re-emerges. The unit test in §5.2 is the canary.

---

## 8. Out of scope (parking lot)

- **Behavior when the pointer leaves the host during clamp.** Today, `findStackAtPoint` returns null and `hideDropIndicator()` fires. That's fine.
- **Resizing the pane while it is clamped.** PR #348 already handles this; no change needed.
- **A11y / keyboard equivalents of whole-pane drag.** Tracked separately under the dock keyboard PRD.
