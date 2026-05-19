# Development Plan: Issue #347

**Issue**: #347
**Title**: fix: floating panes can be positioned or stranded out-of-bounds in DockManager
**Type**: Feature (filed under `fix:` because the user-visible trigger is a bug; work shape is constructive — a new invariant, not a regression repair)
**Priority**: Medium

## Executive Summary

Introduce a single render-time clamp (`clampBoundsToHost`) that keeps every floating pane fully inside the DockManager host at all times. `floating.bounds` is reframed as the user's **intended** position; the rendered position is derived from intent + current host. Passive forces (initial load, host resize) preserve intent and only re-derive render bounds, so shrink-then-grow restores original positions. Active gestures (drag, resize, drag-to-float) commit the clamped value into intent. Tiny hosts (< 192×128) drop the minimum-size floor and shrink the pane to fit.

Design rationale, algorithm, and full test plan are captured in `docs/prd/dock-floating-pane-bounds.md`. This plan tracks **what gets done**; the PRD tracks **what gets decided**.

---

## Problem Statement

### Current Behavior
Floating panes can be positioned, dragged, resized, or stranded out-of-bounds with no recovery. Concrete repro: at `/enterprise/dock` with viewport < 1000 px, **Panel 5** is invisible (hardcoded at `left:680, width:320`).

### Expected Behavior
Every floating pane stays fully inside the DockManager host across all triggers (load, drag, resize, drag-to-float, host resize). Shrink-then-grow restores original positions.

### Impact
User-visible: floating panes silently disappear and only re-appear by editing saved layout JSON by hand. Demo (`/enterprise/dock`) showcases the bug. The clamp restores visibility automatically.

---

## Technical Analysis

### Files to Modify

| File | Change |
|---|---|
| `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts` | Add `clampBoundsToHost` + `getHostSize`; route floating-layer DOM write through the clamp; commit clamped value at 4 gesture sites; schedule re-render from ResizeObserver. |
| `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.spec.ts` | Add unit tests for the clamp. |
| `apps/ng-bootstrap-demo-e2e/` (path TBC during implementation) | Add Playwright e2e tests for the 7 acceptance scenarios. |
| `apps/ng-bootstrap-demo/src/app/pages/enterprise/dock/dock.component.ts` | **No change** — Panel 5's `left:680` seed stays. The clamp visibly rescues it, doubling as a live regression demo. |

### Dependencies
- None. Self-contained inside the dock library.
- No codegen rerun expected (pure TS changes — no SCSS / template structure changes). If render-write structure shifts, re-run `nx run mintplayer-ng-bootstrap:codegen-wc`.

### Architecture Considerations
- **Design fan-out not run** — interface is a single pure function with one render call site; no plausible second shape. Recorded per the planning-gate audit requirement.
- **Public API unchanged.** `DockFloatingStackLayout` / `DockFloatingPaneBounds` shapes stay. `bounds` is reframed semantically as intent; existing saved layouts remain bit-compatible.
- **Render pipeline is the single source of truth.** All clamping flows through the floating-layer DOM write at `mint-dock-manager.element.ts:565-569`. No clamping is duplicated elsewhere.
- See `docs/prd/dock-floating-pane-bounds.md` §3 for the full decision table and §4 for the algorithm.

---

## Implementation Plan

### Phase 1: Clamp function + render integration

1. Add `private clampBoundsToHost(intent, host): DockFloatingPaneBounds` to `mint-dock-manager.element.ts`. Pure function, signature per PRD §4.1.
2. Add `private getHostSize(): { width: number; height: number }` reading `.dock-root` `clientWidth` / `clientHeight`.
3. Route the floating-layer DOM write (lines 565-569) through `clampBoundsToHost`. `floating.bounds` itself is **not** mutated by render.
4. **Manual verification gate** — at this point, narrowing the dev-server browser window should pull Panel 5 back into view from its `left:680` seed. Verify on `http://localhost:4200/enterprise/dock` before continuing.

### Phase 2: Active gesture clamping

5. `handleFloatingDragMove` (line 1251) — compute proposed `{ left, top, width, height }`, assign `floating.bounds = clampBoundsToHost(proposed, host)`.
6. Resize handler (line 1350) — apply existing min-size logic with tiny-host fallback (drop the 192×128 floor when host is smaller), then route final bounds through `clampBoundsToHost`. Direction-aware for left/top-edge resize.
7. `convertPendingTabDragToFloating` (line 2591) — clamp the computed initial bounds before assigning them to the new `DockFloatingStackLayout`.

### Phase 3: Passive re-flow

8. ResizeObserver callback (line 327) — additionally schedule a floating-layer render (no state mutation). Use `ResizeObserverEntry.contentRect` to avoid a layout read.

### Phase 4: Tests

9. Unit tests (`mint-dock-manager.element.spec.ts`) — 10 cases per PRD §5.1.
10. Playwright e2e — 7 scenarios per PRD §5.2. Each test waits `networkidle` after `goto` per the destructive-bootstrap e2e convention.
11. Manual smoke: walk all 5 trigger sites at viewports 1400×900, 800×600, and 250×200.

---

## Test Scenarios

### Scenario 1: Panel 5 visible at narrow viewport
- **Given**: viewport at 800×600, dock page loaded.
- **When**: page finishes rendering.
- **Then**: Panel 5 is fully inside `.dock-root`.

### Scenario 2: Shrink-then-grow restores intent
- **Given**: viewport at 1400×900, Panel 5 at its seed position (left:680).
- **When**: shrink to 800×600 (Panel 5 clamps), then grow back to 1400×900.
- **Then**: Panel 5's `getBoundingClientRect()` matches the original (left:680).

### Scenario 3: Drag stops at the wall
- **Given**: floating pane mid-drag near right edge.
- **When**: user keeps dragging past the right edge.
- **Then**: pane's right edge stops at host's right edge; intermediate frames are clamped (no oscillation, no offscreen render).

### Scenario 4: Resize stops at the wall
- **Given**: floating pane being resized from bottom-right grip.
- **When**: user drags grip past host's right edge.
- **Then**: pane's width caps at `host.width - pane.left`.

### Scenario 5: Drag-to-float lands inside host
- **Given**: dock at 1400×900 with a tab near the right edge of its stack.
- **When**: user tears that tab into a new floating pane.
- **Then**: new pane is fully inside `.dock-root`.

### Scenario 6: Tiny host shrinks the pane below min
- **Given**: dock at viewport 250×200 (smaller than 192×128 minimum).
- **When**: a floating pane needs to render.
- **Then**: pane's width/height shrink to fit host; pane is at (0, 0); pane is fully visible.

### Scenario 7: Intent preserved across passive re-flow
- **Given**: `layout` setter called with `bounds={left:5000, top:5000, width:320, height:220}` at viewport 1200×800.
- **When**: layout renders, then `dock-layout-changed` event fires.
- **Then**: pane renders fully inside host; event payload's `bounds` is **still** `{left:5000, top:5000, ...}` (intent preserved, render is derived).

---

## Acceptance Criteria

- [ ] Panel 5 is visible at viewport 800×600 on `/enterprise/dock` without modifying its seed coordinates.
- [ ] Shrinking and re-growing the browser returns floating panes to their original positions.
- [ ] User cannot drag a floating pane past any host edge (live clamp).
- [ ] User cannot resize a floating pane past any host edge.
- [ ] Tearing a tab into a floating pane lands the new pane fully inside the host.
- [ ] Tiny host (< 192×128) shrinks the pane to fit without hiding it.
- [ ] Passive host resize emits no spurious `dock-layout-changed` events; `floating.bounds` is unchanged byte-for-byte.
- [ ] All 10 unit tests in `mint-dock-manager.element.spec.ts` pass.
- [ ] All 7 Playwright e2e scenarios pass headed and headless.
- [ ] Public type shapes (`DockFloatingStackLayout`, `DockFloatingPaneBounds`) unchanged.
- [ ] No codegen-wc rerun required (verified — no SCSS / template structure changes).

---

## Build & Test Commands

```bash
# Build the dock library
npx nx build mintplayer-ng-bootstrap

# Unit tests for dock
npx nx test mintplayer-ng-bootstrap --testPathPattern=dock

# Playwright e2e
npx nx e2e ng-bootstrap-demo-e2e

# Codegen-wc (only if SCSS/template structure changed — unlikely for this issue)
npx nx run mintplayer-ng-bootstrap:codegen-wc

# Dev server for manual verification
npx nx serve ng-bootstrap-demo
# → http://localhost:4200/enterprise/dock
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts` (lines 327, 565-569, 1251-1272, 1350, 2591-2695, 3639-3659)
- `libs/mintplayer-ng-bootstrap/dock/src/lib/types/dock-layout.ts` (lines 25-53 — type definitions, no change)
- `apps/ng-bootstrap-demo/src/app/pages/enterprise/dock/dock.component.ts` (lines 56-66 — Panel 5 seed, no change)
- `docs/prd/dock-floating-pane-bounds.md` — full PRD (problem, decisions, algorithm, test plan, implementation outline)
- `docs/prd/dock-layout-normalize.md` — sibling PRD covering the docked tree
