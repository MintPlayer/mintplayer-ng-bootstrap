# Development Plan: Issue #326

**Issue**: #326
**Title**: Dock places intersection glyph on intersections with other layers/floatingPanes
**Type**: Bug Fix
**Priority**: Medium

## Executive Summary

`mint-dock-manager`'s `renderIntersectionHandles()` pairs every horizontal splitter divider with every vertical splitter divider across the entire shadow root, regardless of which dock layer (docked root vs. each floating pane) they belong to. When dividers from two **different** layers happen to align within the 24 px grouping tolerance, a phantom intersection grip is rendered between two splitters that don't actually cross.

Fix: gate the pair loop by layer identity. Each splitter already carries a layer-identifying `data-path` prefix (`d:` for the docked root, `f:N` for floating pane index N); precompute a `layerKey` per divider and only emit a pair when both keys match.

Out of scope: hiding *real* same-layer intersection glyphs that happen to sit visually under a floating pane (handled by z-index today). If that surfaces as a complaint, it gets its own issue.

---

## Problem Statement

### Current Behavior
`renderIntersectionHandles()` (`mint-dock-manager.element.ts:711-816`) builds two flat lists `hDividers` and `vDividers` from `shadowRoot.querySelectorAll('.dock-split')` (lines 756-768) — which picks up splitters from the docked root **and** from every floating pane's internal tree. The pair loop at lines 775-789 then forms `(h, v)` candidates by 2D rect proximity (24 px tolerance), with no check that `h` and `v` originate from the same dock layer. The result is a `.dock-intersection-handle` rendered at the visual coincidence point of two unrelated splitters — e.g. a horizontal divider inside the docked root and a vertical divider inside a floating pane that happens to align at the same screen y/x.

### Expected Behavior
An intersection handle is rendered only when an h-divider and a v-divider come from the **same dock layer**:

- both in the docked root (`d:` / `d:<segments>` paths), or
- both in the same floating pane (`f:N` / `f:N/<segments>` paths, same `N`).

Cross-layer coincidental alignments yield no handle.

### Impact
- Visually confusing UI: users see resize grips at positions that don't correspond to a real splitter intersection, leading them to expect a resize affordance that doesn't behave as expected (the grip's pointerdown handler is wired to two unrelated splitters via `data-pairs`, which can produce unexpected resize behaviour or no-ops).
- Demo regression visible at default layout: the `Floating Utilities` and `Panel 5 / Panel 2` floats in the dock demo currently produce phantom grips against the docked layout's splitters (issue screenshot).

---

## Technical Analysis

### Files to Modify
- `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts`
  - `renderIntersectionHandles()` at lines 711-816 — add `layerKey` derivation on each `DividerInfo` and gate the pair loop.
  - Add a small private helper `splitterLayerKey(splitter: HTMLElement): string` colocated near `formatPath`/`parsePath` (around lines 3647-3700). It returns `'d'` for docked-layer splitters and `'f:N'` for splitters inside the floating wrapper at index N, derived via `splitter.closest('.dock-floating')?.dataset.path`.

### Files to Add
- `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.intersections.spec.ts` *(new)* — vitest unit spec dedicated to `renderIntersectionHandles()` layer-isolation. Kept separate from `mint-dock-manager.element.spec.ts` (already 763 lines) for readability.
- `apps/ng-bootstrap-demo-e2e/e2e/dock-intersections.spec.ts` *(new)* — Playwright spec asserting no `.dock-intersection-handle` in the default demo layout has a `data-key` whose `h` and `v` halves span different layer prefixes.

### Dependencies
None. Pure rendering-side change, no public API surface, no type-level changes, no migration.

### Architecture Considerations
- Layer identity for **splitters specifically** is *not* on the splitter's own `data-path` attribute — `renderSplit()` (line 1521) stamps that as `path.join('/')` without any `d:` / `f:N` prefix, so docked-root and floating-root splitters both have `data-path=""`.
- The **floating wrapper** is what carries the `f:N` identifier: `renderFloatingPanes()` (line 545+) creates `<div class="dock-floating" data-path="f:N">` per floating pane, and the splitter is a nested DOM descendant of that wrapper. Docked splitters live under `.dock-docked` with no `.dock-floating` ancestor.
- The helper therefore reads the layer via `splitter.closest('.dock-floating')?.dataset.path ?? 'd'`. One `closest()` call per splitter (small N, called outside the O(H·V) pair loop), result is stashed on `DividerInfo`, and the pair loop is a cheap string compare per pair.
- The helper deliberately does not call `parsePath()` — that's geared toward the `data-path` strings on splitters (segment-only) and floating wrappers (prefixed), not the layer-key abstraction. Using `closest()` keeps the layer-identity concern in one tight helper.

---

## Implementation Plan

### Phase 1: Filter cross-layer pairs in `renderIntersectionHandles()`
1. Add `private splitterLayerKey(splitter: HTMLElement): string` near `formatPath`/`parsePath`. Returns `'d'` for docked splitters and `'f:N'` for splitters inside the floating wrapper at index N (via `closest('.dock-floating')?.dataset.path`).
2. Extend the `DividerInfo` type (line 748) with a `layerKey: string` field; populate it at line 763 alongside `rect`, `pathStr`, `index`. Compute the layer key once per splitter (before the inner divider loop) so it's only one `closest()` call per splitter.
3. In the pair loop at lines 775-789, add `if (h.layerKey !== v.layerKey) return;` as the first check (before the `dx/dy` proximity test) so cross-layer pairs reject without doing the rect math.
4. Leave the corner-resize fast path (lines 720-740) untouched — it operates on an already-validated pair from a prior render and doesn't need re-gating.

### Phase 2: Unit test
1. Create `mint-dock-manager.intersections.spec.ts` with a `describe('mint-dock-manager — renderIntersectionHandles layer isolation')` block.
2. Mount a `<mint-dock-manager>` with a layout that produces a cross-layer alignment:
   - docked root: a vertical split with two columns (one vertical divider).
   - one floating pane: a horizontal split with two rows (one horizontal divider), positioned so the floating pane's horizontal divider falls within 24 px of the docked vertical divider's x-axis.
3. After `await scheduleRenderIntersectionHandles()` resolves (or via the test util that flushes the `setTimeout(5)` scheduler), query `.dock-intersection-handle` in the shadow root.
4. Assert:
   - exactly one handle exists *only if* there is a real same-layer crossing (else zero);
   - no handle's `data-key` mixes `d:`/`f:` prefixes between its `h` and `v` halves;
   - the docked root's real intersections (if any) and each float's real intersections (if any) are present, untouched.
5. Add a second test: two floats whose internal splitters cross-align. Assert no handle bridges them.

### Phase 3: E2E test
1. Create `dock-intersections.spec.ts` next to the existing `dock.spec.ts` in `apps/ng-bootstrap-demo-e2e/e2e/`.
2. Navigate to `/advanced/dock` (default demo layout with two floats already covering the docked splitter zones — reproduces the screenshot).
3. Wait for `networkidle` (per the workspace convention for destructive bootstrap demo pages — see `docs/...` history).
4. Evaluate inside `mint-dock-manager`'s shadow root: enumerate every `.dock-intersection-handle`, parse `data-key` (format `<hPath>:<hIdx>|<vPath>:<vIdx>` — see line 800), and assert for every handle that `layerKey(hPath) === layerKey(vPath)`.
5. Assert at least one same-layer handle still renders (regression guard against accidentally over-filtering).

### Phase 4: Documentation
1. Append a one-line entry to the dock package's relevant history section (root `CHANGELOG.md` or wherever recent dock fixes like `c514d9b8` and `4f1c3d63` are recorded — match the existing format).

---

## Test Scenarios

### Scenario 1: Cross-layer phantom suppressed (docked ↔ floating)
- **Given** a dock manager with a docked vertical split and one floating pane containing a horizontal split, positioned so the floating's horizontal divider visually crosses the docked's vertical divider on screen.
- **When** the intersection handles are rendered.
- **Then** no `.dock-intersection-handle` is created at that cross-layer coincidence; only real same-layer intersections (if any) appear.

### Scenario 2: Cross-layer phantom suppressed (floating ↔ floating)
- **Given** two floating panes whose internal splitters coincidentally align on screen.
- **When** the intersection handles are rendered.
- **Then** no handle bridges the two floats.

### Scenario 3: Real same-layer intersections preserved
- **Given** a docked layout with an outer vertical split whose child is a horizontal split (a real crossing inside the docked root).
- **When** the intersection handles are rendered.
- **Then** the real crossing is rendered exactly as before — same handle, same `data-key`, same keyboard/pointer behaviour.

### Scenario 4: Re-render on floating pane movement
- **Given** a floating pane that previously triggered a phantom intersection.
- **When** the user drags the floating pane to a position where no cross-layer coincidence remains.
- **Then** the existing mutation-observer-driven re-schedule fires `renderIntersectionHandles()`, and the resulting set of handles reflects the new layout (no stale phantoms; any newly emerging real intersections do appear).

### Scenario 5: Corner-resize fast path unaffected
- **Given** an active corner resize (pointer captured on an intersection handle, `cornerResizeState` set).
- **When** another render is scheduled mid-gesture.
- **Then** the early-return fast path (lines 720-740) executes as before — the held handle survives and its position updates from current divider rects. (The cross-layer filter is in the rebuild path only.)

---

## Acceptance Criteria

- [ ] AC-1: `renderIntersectionHandles()` never emits a `.dock-intersection-handle` whose backing `(h, v)` divider pair comes from different dock layers (docked vs. floating, or floating-N vs. floating-M, N ≠ M).
- [ ] AC-2: All pre-existing same-layer intersection handles remain — the count and `data-key` of handles in a layout with no cross-layer coincidences are unchanged.
- [ ] AC-3: The default `/advanced/dock` demo layout shown in the issue screenshot no longer renders any phantom grips between the floats and the docked splitters.
- [ ] AC-4: Keyboard reachability (`tabindex=0`), arrow-key resize, double-click distribute, and pointer-drag corner resize on remaining (real) handles behave identically to current behaviour.
- [ ] AC-5: New vitest spec (`mint-dock-manager.intersections.spec.ts`) covers Scenarios 1, 2, 3 and passes.
- [ ] AC-6: New Playwright spec (`dock-intersections.spec.ts`) covers the demo regression (Scenario 1 via real layout) and passes locally.
- [ ] AC-7: No new lint, type, or test regressions in the dock package or demo app.

---

## Build & Test Commands

```bash
# Unit tests for the dock package
nx test mintplayer-ng-bootstrap-dock

# Lint + typecheck for the dock package
nx lint mintplayer-ng-bootstrap-dock

# Build the demo app
nx build ng-bootstrap-demo

# Playwright e2e — dock specs only
nx e2e ng-bootstrap-demo-e2e --grep "dock"
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts:711-816` — `renderIntersectionHandles()` (primary fix site)
- `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts:3647-3700` — `formatPath` / `parsePath` (where `layerKeyForPath` will live)
- `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.html:4` — `.dock-intersections-layer` host
- `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.scss:230-267` — handle styles (no change)
- `libs/mintplayer-ng-bootstrap/dock/src/lib/types/dock-layout.ts:22-23` — `DockPath` discriminated union (the layer-identity source of truth)
- `apps/ng-bootstrap-demo/src/app/pages/advanced/dock/dock.component.ts` — demo reproducer
- `apps/ng-bootstrap-demo-e2e/e2e/dock.spec.ts` — existing dock e2e, neighbour for the new spec
