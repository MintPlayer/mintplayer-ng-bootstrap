# Product Requirements Document: Dock cross-layer phantom intersection glyph

**Issue**: #326
**Title**: Dock places intersection glyph on intersections with other layers/floatingPanes
**Status**: Ready for review — implementation, unit tests, e2e (Chromium + Firefox), and CHANGELOG all landed
**Created**: 2026-05-13
**Last Updated**: 2026-05-13

---

## Overview

`mint-dock-manager` renders a small resize "grip" at every point where two splitters cross. The current implementation pairs every horizontal divider with every vertical divider in the shadow root by screen-space proximity, without checking that both belong to the same dock layer. Coincidental alignments between a divider in the docked root and a divider inside a floating pane (or between two floating panes) therefore produce **phantom** grips that don't sit on a real intersection.

This PRD covers the targeted fix: filter pair candidates by layer identity. Visual occlusion of *real* same-layer intersections by overlapping floating panes is **out of scope**.

---

## Goals & Objectives

### Primary Goals
- Eliminate phantom intersection grips caused by cross-layer divider pairing.
- Preserve all current behaviour (keyboard, pointer, double-click, arrow-resize) for real same-layer intersections.
- Keep the diff small and the fix isolated to `renderIntersectionHandles()` + one helper.

### Success Metrics
- Zero `.dock-intersection-handle` elements whose backing `(h, v)` pair spans different layers, in any layout the test fixtures or demo produce.
- No change in the count or `data-key` of intersection handles in layouts with no cross-layer coincidences (regression guard).
- New regression coverage: 1 vitest spec + 1 Playwright spec.

---

## Functional Requirements

### Must Have (P0)
- [x] **FR-1**: Each splitter divider collected in `renderIntersectionHandles()` carries a precomputed `layerKey` (`'d'` for the docked root, `'f:<N>'` for floating index N).
- [x] **FR-2**: A candidate `(h, v)` pair is rejected when `h.layerKey !== v.layerKey`, in addition to the existing 24 px proximity check.
- [x] **FR-3**: The corner-resize fast path (when `cornerResizeState` is set) is not touched by this change — it operates on a pre-validated pair and remains the same.
- [x] **FR-4**: A new helper `splitterLayerKey(splitter)` lives near `formatPath`/`parsePath`, deriving the layer from `splitter.closest('.dock-floating')?.dataset.path` (falls back to `'d'` for the docked layer). The `<mp-splitter data-path="…">` value does not carry a layer prefix — only the floating wrapper does — so DOM-ancestor lookup is the authoritative source.
- [x] **FR-5**: Vitest unit spec `mint-dock-manager.intersections.spec.ts` covers: docked↔floating phantom suppression, floating↔floating phantom suppression, and same-layer real-intersection preservation. Confirmed to fail without the filter (regression-positive test).
- [x] **FR-6**: Playwright e2e spec `dock-intersections.spec.ts` injects layouts that produce cross-layer alignments and asserts the post-fix handle counts (0 for pure cross-layer; 1 when paired with a real same-layer crossing).

### Should Have (P1)
- [x] **FR-7**: One-line CHANGELOG entry under the dock package's recent fix history, matching the format of `c514d9b8` / `4f1c3d63`. Added to `[Unreleased] / Fixed` section in root `CHANGELOG.md`.

### Out of Scope
- Hiding *real* same-layer intersection grips that happen to sit visually under a floating pane (z-index occlusion). Filed as a follow-up only if reported.
- Any change to the drag-time drop joystick — different code path, not what the screenshot shows.
- API-surface changes, new inputs/outputs, or DockPath schema changes.

---

## Timeline & Milestones

### Milestone 1: Filter implementation
- [x] Add `layerKeyForPath(pathStr)` helper.
- [x] Extend `DividerInfo` with `layerKey`.
- [x] Gate the pair loop on matching `layerKey`.

### Milestone 2: Tests
- [x] Vitest unit spec covering all three scenarios (FR-5).
- [x] Playwright e2e spec — uses `evaluate()` to inject a custom layout, since the default demo has no splitters inside its floating panes (FR-6).

### Milestone 3: Polish
- [x] CHANGELOG entry.
- [ ] PR description with before/after screenshot of the demo.

---

## Open Questions

> None. All decisions resolved during grilling; no escalations to the requester.

---

## Verification

- **Unit tests** (`mint-dock-manager.intersections.spec.ts`, 4 specs, vitest+jsdom): all pass. With the `if (h.layerKey !== v.layerKey) return;` guard temporarily commented out, the two phantom-suppression specs fail as expected — confirming the tests are regression-positive and not tautological.
- **E2e** (`dock-intersections.spec.ts`, 2 specs × Chromium + Firefox = 4 runs): all pass against the production-served demo with injected test layouts.
- **Lint**: pre-existing failure on master (invalid `"nowarn"` severity in `libs/mintplayer-ng-bootstrap/.eslintrc.json`); unrelated to this change.

---

## Technical Notes (Issue-Specific)

- The authoritative layer identifier inside the rendered shadow tree is the **floating wrapper element** itself. `renderFloatingPanes()` (line 545+) creates `<div class="dock-floating" data-path="f:N">` per floating pane (via `formatPath`), and splitters within that pane are nested DOM children. The docked-layer splitters have no `.dock-floating` ancestor. `splitterLayerKey()` reads this with one `closest()` call per splitter.
- A previous attempt used `splitter.dataset['path']` to derive the layer key. That doesn't work because `renderSplit()` (line 1521) stamps splitters with `path.join('/')` only — no `d:` / `f:N` prefix — so a docked-root splitter and a floating-root splitter both end up with `data-path=""`. The DOM-ancestor approach side-steps the path-encoding mismatch entirely.
- Cost is trivial: one `closest('.dock-floating')` per splitter (not per divider). With small splitter counts in any realistic layout, this is cheaper than allocating a `DockPath` object via `parsePath()` for each divider.
- Why a separate spec file instead of appending to `mint-dock-manager.element.spec.ts`: the existing spec is 763 lines and covers unrelated drag/touch/computeHeaderInsertIndex/layout-normalization concerns. A dedicated intersections spec keeps the fixture small and the regression discoverable.

---

## Related
- Issue #326
- Related commits (dock intersection glyph history): `d8029544` (keyboard resize), `c514d9b8` (defer past flex redistribution), `4f1c3d63` (initial visible glyphs).
- See `docs/issue_330_plan.md` for the workspace convention on WC + Angular-wrapper changes (this fix is purely WC-internal — no wrapper touch).
