# PRD: BsTileManager — drag-and-resize grid of tiles

**Status:** Proposed.
**Author:** Pieterjan
**Date:** 2026-05-09
**Library:** `@mintplayer/ng-bootstrap/tile-manager` (new package)
**Reference UX:** [Infragistics Ignite UI Tile Manager](https://www.infragistics.com/products/ignite-ui-angular/angular/components/tile-manager) / [demo](https://www.infragistics.com/angular-demos/layouts/tile-manager-sample)
**Related prior PRDs:**
- `docs/prd/dock-touch-long-press-drag.md` — gesture model for pointer + long-press-on-touch (we mirror it here).
- `docs/prd/dock-splitter-tabcontrol-lit-composition.md` — Lit-element composition pattern this PRD follows.

---

## 1. Motivation

The library has a `BsDock` for hierarchical, splitter-divided panel docking, a `BsResizable` for free-floating resizable boxes, and a `BsGrid` Bootstrap-row/col wrapper. None of these covers the **dashboard / homepage tile** use case: a grid of self-similar, equally-weighted tiles that the end user can rearrange and resize at runtime, with neighbours sliding out of the way to keep the layout compact, and a stable typed snapshot the host app can persist and restore across reloads.

Customers who want this today either roll their own with CDK Drag-Drop (which we deliberately don't depend on; see `feedback_pointer_over_html5_dnd`) or pull in a heavier upstream alternative. The Infragistics Ignite UI Tile Manager is the canonical reference. We don't aim for feature parity — we ship a deep, focused module that does the dashboard-tile job well within the conventions already established by `BsDock`.

## 2. Goals / non-goals

**Goals**

- A `<bs-tile-manager>` container with `<bs-tile>` children, both standalone Angular components, packaged as `@mintplayer/ng-bootstrap/tile-manager`.
- All gesture mechanics, layout state, packing, and animation live in a framework-agnostic Lit web component (`<mp-tile-manager>`) bundled inside the package. The Angular layer is a thin marshalling shell. See §5.1.
- Tiles laid out on a CSS Grid: configurable column count or auto-fit to a minimum column width, auto-flow rows at a minimum row height, configurable gap.
- Per-tile placement via `position = { colStart, rowStart, colSpan, rowSpan }` with two-way binding.
- Drag a tile to a new grid cell. Drag arms immediately for mouse/pen, on 600 ms long-press for touch (mirrors dock).
- Resize a tile from the right edge, bottom edge, or bottom-right corner. Snap to whole grid units at the half-cell threshold.
- **Push-and-reflow with vertical compaction**: when the dragged/resized tile's target rect overlaps a neighbour, the neighbour is pushed down. After the push, every movable tile "falls up" into the highest row where it fits (top-down, left-to-right order). Locked tiles (`disableMove: true`) stay put and act as immovable obstacles; if no valid layout can be found that respects the locks, the move is rejected and tiles snap back.
- **Live reflow** during drag and during resize: as the user moves the pointer, neighbouring tiles slide to their reflowed positions in real time.
- **Animated reflow**: tiles whose `position` changes between two layout states animate via FLIP. ~150 ms ease-out. Honours `prefers-reduced-motion: reduce`.
- **Typed persistence**: `(layoutChange)` emits a stable `TileLayoutSnapshot` on every commit. The host app serializes with `JSON.stringify` and restores by re-binding `position` — no opaque blob, no proprietary format, no built-in storage hook.
- Per-tile `disableMove` and `disableResize` opt-outs. Manager-level `dragMode = 'tile' | 'header' | 'off'` (default `'header'` — drags only from the tile's `<bs-tile-header>` slot).
- Pointer-events only. No HTML5 drag-and-drop, no `@angular/cdk/drag-drop` dependency (see §6.6).
- Touch parity with desktop: 600 ms long-press to arm drag from a header. Resize handles arm immediately on touch.

**Non-goals**

- **Maximize / fullscreen.** Tiles do not have a built-in expand-to-manager-width or browser-fullscreen affordance. Callers can implement maximize themselves by re-binding `position`.
- **Opaque `saveLayout()` / `loadLayout()` API.** The two-way binding plus the `(layoutChange)` snapshot is the persistence story.
- **Custom adorner slots** for the resize handles or drag surface. Built-in handles only; styling via CSS variables.
- **Drag-from-arbitrary-content** mode (`dragMode: 'tile'`) on **touch**: header-only is enforced on touch regardless of the manager's `dragMode`.
- **Horizontal compaction or no-compaction modes** (`compactType: 'horizontal' | 'none'`). Vertical compact is the only mode in v1; the others can be added without breaking changes.
- **Standalone `@mintplayer/wc-tile-manager` npm package.** The web component lives inside `@mintplayer/ng-bootstrap/tile-manager` for now. Packaging it for direct non-Angular consumption is a follow-up.
- **RTL, virtualization, keyboard reorder shortcuts** beyond the minimal a11y story in §5.11.

## 3. Background — reference UX

From the Infragistics docs (skeptic-flagged where the API ref is silent):

- Layout: CSS Grid, auto-flow rows. Manager-level `columnCount`, `minColumnWidth` (default 200 px), `minRowHeight`, `gap`. If `columnCount` is unset, the grid auto-fits as many ≥`minColumnWidth` columns as possible.
- Tile placement: `colSpan`, `rowSpan`, `colStart`, `rowStart`. Auto-flow if start fields are unset.
- Drag: enabled via `dragMode: 'tile' | 'tile-header'`. Ghost element follows the pointer. Touch is undocumented.
- Resize: bottom/right/corner adorners. Snaps to whole grid units at the half-cell threshold. `resizeMode: 'none' | 'hover' | 'always'` controls adorner visibility.
- "Expanding a tile may push adjacent tiles into new positions, while shrinking creates gaps that other tiles may fill dynamically" — push-and-reflow with auto-packing.
- Per-tile: `disableMaximize`, `disableFullscreen`, `disableResize`. (No `disableDrag`.)
- Events / serialization format / a11y story: **not documented** anywhere we could find.

We keep the layout model, the resize-edge geometry, and the push-and-reflow behaviour. We diverge on:

- **Header-only drag is the default**, not opt-in.
- **Typed two-way binding over opaque `saveLayout()` blob.**
- **Long-press on touch.**
- **Live reflow during drag and resize.**

## 4. Package & file layout

New folder `libs/mintplayer-ng-bootstrap/tile-manager/`, mirroring `dock/`:

```
tile-manager/
├── index.ts                                        // re-exports ./src
├── ng-package.json                                 // entryFile: "index.ts"
├── README.md
├── project.json                                    // Nx project
└── src/
    ├── index.ts                                    // public API surface
    └── lib/
        ├── components/
        │   ├── tile-manager.component.ts           // Angular wrapper (BsTileManagerComponent)
        │   ├── tile.component.ts                   // Angular wrapper (BsTileComponent)
        │   └── tile-header.component.ts            // Angular wrapper (BsTileHeaderComponent)
        ├── web-components/
        │   ├── mint-tile-manager.element.ts        // LitElement; owns all logic
        │   ├── mint-tile-manager.element.html      // Lit template source (codegen input)
        │   ├── mint-tile-manager.element.scss      // styles
        │   ├── mint-tile-manager.element.template.ts  // codegen output (do not edit by hand)
        │   └── mint-tile-manager.element.spec.ts   // WC unit tests
        ├── utils/
        │   ├── pack.ts                             // pure: vertical-compact packer (used by the WC)
        │   └── pack.spec.ts
        └── types/
            ├── tile-position.ts
            ├── tile-layout-snapshot.ts
            └── grid-rect.ts
```

Public API (`tile-manager/src/index.ts`):

```ts
export * from './lib/components/tile-manager.component';
export * from './lib/components/tile.component';
export * from './lib/components/tile-header.component';
export * from './lib/web-components/mint-tile-manager.element';   // for direct WC consumers
export * from './lib/types/tile-position';
export * from './lib/types/tile-layout-snapshot';
```

Demo page: `apps/ng-bootstrap-demo/src/app/pages/advanced/tile-manager/...` plus a route entry alongside the existing `dock` page.

## 5. Design

### 5.1 Architecture: Lit web component + Angular wrapper

The component ships as two layers, mirroring `BsDockManagerComponent` / `mint-dock-manager.element.ts`:

1. **`<mp-tile-manager>`** — a LitElement web component that owns *all* gesture mechanics, the packer, FLIP animations, layout state, keyboard handlers, and shadow-DOM rendering. Pure DOM/Lit/TS, no Angular dependency. Tile *content* enters via named slots (`<slot name="<tile-id>-content">`, `<slot name="<tile-id>-header">`); tile *layout state* enters via the `tiles` reactive property.

2. **`<bs-tile-manager>` / `<bs-tile>` / `<bs-tile-header>`** — thin Angular wrappers that:
   - Marshal Angular inputs (`columnCount`, `dragMode`, `position`, …) onto the WC as properties / attributes.
   - Project each `<bs-tile>`'s content and header into named slots on the WC (one slot per tile id, two slots per tile).
   - Subscribe to WC `CustomEvent`s and re-emit them as Angular outputs (`(layoutChange)`, `(positionChange)`).
   - Enforce typed input shapes that the bare WC API can't.

This costs us the codegen-wc step (already in place for dock and scheduler) and a small Lit runtime (~5 KB gzipped, shared with dock if both are present). It buys: the packer, the FLIP animator, and the gesture state machine all live in framework-agnostic code, ready to be wrapped for React/Vue if and when we choose to. The WC remains a private export of `@mintplayer/ng-bootstrap/tile-manager` for now — extraction to `@mintplayer/wc-tile-manager` is a separate packaging concern (see §6.1 and §7).

Precedent in this workspace: `mint-dock-manager.element.ts` and `mp-scheduler` are already Lit WCs with Angular wrappers. The conventions, build pipeline, and `.element.template.ts` regen step are established.

### 5.2 The WC ↔ Angular boundary

**Tiles in.** Each `<bs-tile id="x" [(position)]="t.pos" [disableMove]="t.locked">` Angular instance contributes:

- An entry to the WC's `tiles` reactive property: `{ id: 'x', position: {...}, disableMove: true, disableResize: false }`. The Angular wrapper rebuilds this array (immutably) on any input change to any child tile.
- Two `<div slot="x-content">` and `<div slot="x-header">` projections inside the WC's light DOM. The WC's shadow template assigns each tile its own pair of named slots, so projection is keyed by id, not by DOM order.

**Events out.** The WC dispatches typed `CustomEvent`s:

| Event | Detail | Angular wrapper emits as |
| --- | --- | --- |
| `tilelayoutchange` | `TileLayoutSnapshot` | `(layoutChange)` on `<bs-tile-manager>` |
| `tilepositionchange` | `{ id: string; position: TilePosition }` | `(positionChange)` on the matching `<bs-tile>` (drives the two-way binding) |
| `tilegestureblocked` | `{ id: string; reason: 'locked-overlap' \| 'no-valid-layout' }` | `(gestureBlocked)` on `<bs-tile-manager>` (optional output, useful for analytics or custom feedback) |

**State direction.** The WC is the source of truth during a gesture; commits are pushed back into Angular state via `tilepositionchange`. Outside a gesture, Angular state is the source of truth; the wrapper pushes it into the WC's `tiles` property whenever an input changes.

The wrapper does *not* re-set `tiles` on the WC mid-gesture (that would clobber the in-flight `previewLayout`). A boolean flag on the WC (`isGestureActive`) is read by the wrapper before pushing updates.

### 5.3 Public Angular API

**Manager — `<bs-tile-manager>`**

| Member | Type | Default | Notes |
| --- | --- | --- | --- |
| `columnCount` (input) | `number \| null` | `null` | `null` → auto-fit. |
| `minColumnWidth` (input) | `string` | `'200px'` | Any CSS length. |
| `minRowHeight` (input) | `string` | `'8rem'` | Any CSS length. |
| `gap` (input) | `string` | `'0.5rem'` | Forwarded to grid `gap`. |
| `dragMode` (input) | `'tile' \| 'header' \| 'off'` | `'header'` | Touch always behaves as `'header'`. |
| `resizeMode` (input) | `'hover' \| 'always' \| 'off'` | `'hover'` | Adorner visibility, not whether resize is allowed. |
| `animateReflow` (input) | `boolean` | `true` | Auto-disabled under `prefers-reduced-motion: reduce`. |
| `label` (input) | `string \| null` | `null` | Forwarded to `aria-label` on the WC's `role="grid"` host. |
| `layoutChange` (output) | `EventEmitter<TileLayoutSnapshot>` | — | Fires once per committed move/resize. |
| `gestureBlocked` (output) | `EventEmitter<TileGestureBlocked>` | — | Optional; fires when a commit is rejected. |
| `captureLayout()` (method) | `() => TileLayoutSnapshot` | — | Mirrors `BsDockManagerComponent.captureLayout()`. |

**Tile — `<bs-tile>`**

| Member | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` (input, required) | `string` | — | Stable across re-renders; used in `TileLayoutSnapshot`. |
| `position` (input/output) | `TilePosition` | — | Two-way bindable. |
| `disableMove` (input) | `boolean` | `false` | Locks the tile (immovable obstacle for the packer). |
| `disableResize` (input) | `boolean` | `false` | No adorners render on this tile. |
| `label` (input) | `string \| null` | `null` | Forwarded to `aria-label` on the tile's `role="gridcell"` element in the WC. |

**Tile header — `<bs-tile-header>`**

Marker + presentational component. Provides the drag surface for `dragMode: 'header'` and consistent typography/spacing for the title bar. No inputs.

### 5.4 Web component API (`<mp-tile-manager>`)

The bare WC is consumable without Angular. Exposed for direct use and for future React/Vue wrappers.

**Reactive properties (Lit `@property`):**

| Property | Type | Default | Reflected attribute |
| --- | --- | --- | --- |
| `columnCount` | `number \| null` | `null` | `column-count` |
| `minColumnWidth` | `string` | `'200px'` | `min-column-width` |
| `minRowHeight` | `string` | `'8rem'` | `min-row-height` |
| `gap` | `string` | `'0.5rem'` | `gap` |
| `dragMode` | `'tile' \| 'header' \| 'off'` | `'header'` | `drag-mode` |
| `resizeMode` | `'hover' \| 'always' \| 'off'` | `'hover'` | `resize-mode` |
| `animateReflow` | `boolean` | `true` | `animate-reflow` |
| `tiles` | `MintTile[]` (see below) | `[]` | (no attribute — array property) |

```ts
export type MintTile = Readonly<{
  id: string;
  position: TilePosition;
  disableMove: boolean;
  disableResize: boolean;
  label: string | null;
}>;
```

**Custom events:** `tilelayoutchange`, `tilepositionchange`, `tilegestureblocked` — types per §5.2.

**Slots:** for each `tile.id` in `tiles`, two named slots: `${id}-header` and `${id}-content`. The WC renders one tile shell per `tiles` entry, each containing its `<slot name="${id}-header">` and `<slot name="${id}-content">`.

**Methods:** `captureLayout(): TileLayoutSnapshot`. (Exposed via the wrapper's `captureLayout()` method.)

**Static getter:** `static get observedAttributes()` returns the reflected attribute names. (Per `project_lit_migration.md` — observedAttributes must be a static getter for the codegen-wc pipeline to work.)

### 5.5 Internal model — what the WC tracks

The WC owns:

- `tiles: MintTile[]` reactive property (set by the host; mutated internally on commits).
- `gestureState: GestureState` private — `{ kind: 'idle' }` outside a gesture; `{ kind: 'drag', pointerId, tileId, startCell, pointerOffset, targetRect, previewLayout, blocked }` or `{ kind: 'resize', ... }` during a gesture.
- `previewLayout: TileLayoutSnapshot | null` — the packer's most recent output during a gesture. When non-null, tile shells render their grid placements from this; otherwise from `tiles`.
- The pointer-event listeners (window-capture, scoped to `pointerId`).
- The packer (pure function imported from `utils/pack.ts`).
- The FLIP animator (private class on the element).
- A `ResizeObserver` on the host to recompute `effectiveColumnCount` when `columnCount` is `null`.

The dragged/resized tile is the visual exception: it's rendered with `transform: translate(...)` overlaid on its grid cell, following the pointer pixel-by-pixel. Its grid cell *is* its `targetRect` so the rest of the layout flows around it correctly; the transform compensates for the snap so the visual position tracks the pointer smoothly.

### 5.6 Drag mechanics (lives in the WC)

**Arming.**
- Mouse / pen: `pointerdown` on a drag surface → register window-capture `pointermove` / `pointerup` / `pointercancel` listeners scoped to `pointerId`. Cross 5 px from start → `beginTileDrag`. Mirrors `armPaneDragGesture` in `mint-dock-manager.element.ts`.
- Touch: identical to `armPaneDragGestureTouch` in the dock — 600 ms long-press timer (`TOUCH_LONG_PRESS_MS = 600`, `TOUCH_LONG_PRESS_SLOP_PX = 10`), `data-pressing` feedback class at 150 ms, `navigator.vibrate(10)` on arm. Constants and state machine duplicated in this WC, not imported from the dock — ~60 lines, not the kind of thing to share across unrelated components.
- Pen treated as mouse. Right/middle mouse button rejects.

**Drag surface selection.** Driven by `dragMode`:

- `'header'` — only `pointerdown` events that originate inside the `${id}-header` slot's projected content arm a gesture. Implemented by checking `event.target.closest('[slot$="-header"]')` against the WC's host children.
- `'tile'` — any `pointerdown` inside a tile shell arms (excluding resize handles). Forced to `'header'` when `event.pointerType === 'touch'`.
- `'off'` — no arming.

**Live tracking.** On each `pointermove`:

1. Compute pointer position in WC-local coordinates.
2. Compute `targetRect` snapped to the cell containing `(pointerX - pointerOffset.dx, pointerY - pointerOffset.dy)`, with the tile's current `colSpan`/`rowSpan`. Clamp `colStart` to `[1, effectiveColumnCount - colSpan + 1]`, `rowStart` to `[1, ∞)`.
3. Run the packer (§5.8) with the dragged tile pinned at `targetRect`. Result: a fresh `TileLayoutSnapshot` and a `blocked` flag.
4. Update `gestureState`. Lit re-renders tile shells with their new grid placements from `previewLayout`. The FLIP animator (§5.10) inspects rect deltas and animates.
5. The dragged tile's `transform: translate(dx, dy)` is updated so its visual position tracks the pointer 1:1, regardless of the snap.

**Commit on `pointerup`.**
- If `!blocked`: replace the WC's `tiles` array with the committed positions. Dispatch `tilelayoutchange` (full snapshot) and `tilepositionchange` per tile whose position changed. Drop `gestureState`. The Angular wrapper updates each `<bs-tile>`'s signal in response.
- If `blocked`: discard `previewLayout`. The dragged tile shakes (CSS keyframe), tiles snap back, no events.

**Cancel on `pointercancel`** or `Escape` keydown: same as blocked-commit.

### 5.7 Resize mechanics (lives in the WC)

Adorners rendered inside each tile shell (in the WC's shadow DOM), only when `!disableResize` and `resizeMode !== 'off'`:

```scss
.tile__resize-side    { right: -2px; top: 25%; bottom: 25%; width: 6px; cursor: ew-resize; }
.tile__resize-bottom  { left: 25%; right: 25%; bottom: -2px; height: 6px; cursor: ns-resize; }
.tile__resize-corner  { right: -2px; bottom: -2px; width: 14px; height: 14px; cursor: nwse-resize; }
```

`resizeMode: 'hover'` keeps `opacity: 0` until `:hover` on the tile (and always `1` under `(pointer: coarse)`); `'always'` keeps them at 1; `'off'` removes them.

**Arming.** `pointerdown` on a handle → `beginTileResize`. Mouse/pen at 5 px; touch immediate.

**Live tracking.** Each `pointermove` recomputes:

- Side: `colSpan = round((pointerX - tile.left) / cellWidth)`, ≥ 1.
- Bottom: `rowSpan = round((pointerY - tile.top) / cellHeight)`, ≥ 1.
- Corner: both axes.

Half-cell-threshold rounding. Then runs the packer with the resized tile pinned at the new rect. Other tiles slide live.

**Commit / cancel:** identical to drag.

### 5.8 Push-and-reflow algorithm

Pure function in `utils/pack.ts`, imported by the WC:

```ts
export function pack(
  tiles: ReadonlyArray<{ id: string; position: TilePosition; locked: boolean }>,
  pinned: { id: string; rect: GridRect },
  columnCount: number,
): { layout: TileLayoutSnapshot; blocked: boolean };
```

Algorithm (vertical compact, top-down, left-to-right):

1. **Place pinned first.** The dragged/resized tile goes at `pinned.rect`. Non-negotiable — the user controls it.
2. **Place locked tiles.** Locked tiles (`disableMove: true`) keep their input positions. If a locked tile overlaps `pinned.rect`, return `blocked: true`.
3. **Place movable tiles** in current visual order (`(rowStart, colStart)` ascending). For each:
   - Try to keep it in place if it doesn't overlap any already-placed tile.
   - Otherwise, first-fit search: for `row = 1, 2, …`, for `col = 1` to `columnCount - colSpan + 1`, pick the first non-overlapping candidate.
4. **Compact upward.** For each movable tile in row order, slide it up to the smallest `rowStart` where it still fits. Repeat until stable (1–2 passes typically).
5. Return the snapshot.

**Complexity** `O(rows × cols × tiles)` per call; sub-millisecond for ≤50 tiles. Live invocation on every `pointermove` is fine. Per `feedback_no_imperative_iteration`, each pass uses `map`/`reduce`/`some`/`every`; the inner first-fit search returns from a labelled generator helper, no manual `for` loops.

**Tie-breaking.** Lower input `(rowStart, colStart)` wins. Deterministic and predictable.

`utils/pack.ts` is framework-agnostic and unit-tested in isolation (`pack.spec.ts`).

### 5.9 Persistence — store and restore the layout

The two-way binding plus `(layoutChange)` is the persistence mechanism. No manager-owned blob, no opaque format, no built-in storage hook.

**Save** — capture on every commit:

```ts
onLayout(snapshot: TileLayoutSnapshot) {
  localStorage.setItem('dashboard-layout', JSON.stringify(snapshot));
}
```

**Restore** — read on init, project back into per-tile `position`:

```ts
ngOnInit() {
  const saved = localStorage.getItem('dashboard-layout');
  if (saved) {
    const snapshot: TileLayoutSnapshot = JSON.parse(saved);
    const positionsById = new Map(snapshot.map(s => [s.id, s.position]));
    this.tiles.update(tiles => tiles.map(t => ({
      ...t,
      position: positionsById.get(t.id) ?? t.position,
    })));
  }
}
```

`id` is the stable key. Tiles whose id is in the snapshot get their position restored; new tiles keep their default position; tiles in the snapshot that aren't currently rendered are silently ignored. Forward- and backward-compatible across tile-set changes.

`TilePosition` is four bounded numbers — `JSON.stringify` round-trips losslessly.

The demo page (§5.11) wires this up to `localStorage` end-to-end. We don't ship a `[autoPersist]` input or a `BsTileManagerStorageService` — coupling persistence strategy to the component is the wrong layering.

### 5.10 Animations — FLIP on reflow

The FLIP animator is a private class on the WC. When `previewLayout` (during gesture) or `tiles` (after commit) changes, tiles whose grid placement moved animate from old to new:

1. **First** — before the change applies, capture each tile's `getBoundingClientRect()`.
2. **Last** — Lit's reactive update commits new `grid-column` / `grid-row` to the DOM. Tiles jump to new positions in one frame.
3. **Invert** — compute `(dx, dy) = oldRect - newRect` for each moved tile, apply `transform: translate(dx, dy)` synchronously, so the tile *visually* stays at its old position.
4. **Play** — on the next animation frame, remove the transform; the browser animates back to identity via `transition: transform 150ms cubic-bezier(0.2, 0, 0, 1)`.

The dragged/resized tile is excluded — its transform is owned by the gesture, not the animator. Its grid cell does change (target follows snap), but the FLIP animator skips it.

Disabled when `animateReflow === false` or `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

Lit gives us `firstUpdated` / `updated` lifecycle hooks for the "before" and "after" capture points. The animator hooks into `willUpdate` (for "first") and `updated` (for "last" and "invert"), schedules the "play" via `requestAnimationFrame`. We implement the small slice we need rather than depending on `@angular/animations` (which doesn't run inside the WC's shadow DOM anyway).

### 5.11 Demo page

`/advanced/tile-manager`. Layout:

- **Top:** description and toggle controls — `columnCount`, `minColumnWidth`, `gap`, `dragMode`, `resizeMode`, `animateReflow`, plus a "Locked" toggle on each tile.
- **Middle:** `<bs-tile-manager>` with six mock tiles ("Weather", "Inbox", "Stats", "Calendar", "Notes", "Activity"). Each tile has realistic content so push-reflow looks natural.
- **Bottom:** a `<pre>` showing live `JSON.stringify(layout, null, 2)`. Buttons: "Save to localStorage" (manual; auto-save is already wired) and "Reset" (clear localStorage + restore defaults).
- **Wired to `localStorage`:** auto-saves on every `(layoutChange)`, restores on init. Reload → layout persists.

Also the manual-test bed for §9.

### 5.12 Keyboard / a11y (lives in the WC)

The WC owns the keyboard model and the ARIA roles, since they're part of the shadow-DOM render:

- Host: `role="grid"`, `aria-label` from the `label` property.
- Each tile shell: `role="gridcell"`, `tabindex="0"`, `aria-label` from the per-tile `label` (or `aria-labelledby` pointing at the header slot's first text node).
- When a tile is focused:
  - `Space` toggles "keyboard-move" mode (announced via `aria-live` polite). Arrow keys step the tile by one cell — same packer call, same blocked semantics. `Enter` / `Escape` exits.
  - `Shift + Arrow` resizes the focused tile by one cell.
- `aria-live` polite region on the host announces "Tile X moved to row Y, column Z" on commit.

No `Tab`-cycle reorder, no global hotkeys. Future feature if asked.

## 6. Alternatives considered

### 6.1 Pure Angular component, no web component

Implement `<bs-tile-manager>` and `<bs-tile>` as standalone Angular components, with all logic (packer, FLIP, gestures) in TypeScript that imports from `@angular/core`. **Rejected.** Pure Angular is simpler in the short term, but every piece of logic — pointer event handling, the packer, the FLIP animator, the keyboard model — would be rewritten if we ever wanted a React or Vue version. The Lit WC + Angular wrapper pattern is already established for `BsDock` and `mp-scheduler`; following it here keeps the workspace consistent and future-proofs the component without committing to ship a non-Angular package right now. The codegen-wc pipeline and the `.element.template.ts` regen step are already part of the build and well-understood.

### 6.2 Empty-space-only gating instead of push-and-reflow

Drops/resizes that would overlap a neighbour are rejected (snap back). No reflow, no animation, no packer. **Rejected.** Predictable but actively user-hostile — once a layout is half-full, the user has to manually shuffle tiles to make room, exactly the busywork the component is supposed to eliminate. Push-and-reflow with vertical compaction is the dashboard-tile UX customers expect. The packer is ~80 lines and runs in well under a millisecond.

### 6.3 Data-driven API: layout array on the manager + `<ng-template>` for tile body

```html
<bs-tile-manager [(layout)]="layout">
  <ng-template #tile let-data>...</ng-template>
</bs-tile-manager>
```

**Rejected.** Doesn't compose with per-tile inputs (`disableMove`, `disableResize`, header slot). Forces the user to thread tile metadata through the layout array. Content-projection (`<bs-tile>` children) matches `BsDockPaneComponent` and the surrounding library convention.

### 6.4 Reuse `BsResizableComponent` for the resize handles

`BsResizableComponent` already has a pointer-driven resize implementation. **Rejected.** It targets free-positioned absolute boxes with px-precision sizing; tile manager needs grid-cell-precision sizing with manager-coordinated reflow. ~10% mechanical overlap, 90% different invariants.

### 6.5 HTML5 native drag-and-drop (`draggable="true"` + `dragstart` / `dragover` / `drop`)

**Rejected by precedent** — `feedback_pointer_over_html5_dnd`. HTML5 dnd cancels its gesture if the source DOM is removed during drag, gives no way to render a custom ghost on touch, and doesn't compose with our live-reflow model where neighbour tiles mutate on every pointermove. Pointer events with manual ghost rendering are the only model that holds across mouse/pen/touch consistently.

### 6.6 `cdk-drop-list` / `cdk-drag` from `@angular/cdk/drag-drop`

The library already depends on `@angular/cdk` for overlays — pulling in the drag-drop entry point would be a new sub-entry-point, not a new top-level dependency. **Still rejected.** The CDK's drop-list is a 1-D reorder primitive over a list, not a 2-D grid-snap-with-pack-and-reflow primitive. Wrapping it would either disable most of its built-in behaviour or layer reflow on top of its drop events — either way ~80 lines of packer code with extra indirection. Worse, the CDK ties us to Angular's runtime — the entire reason we picked the WC architecture is to avoid that. Pointer events at the WC layer are the right call.

### 6.7 Allow drag from anywhere on the tile by default (`dragMode: 'tile'`)

**Rejected as default**, kept as opt-in. Tile bodies typically contain links, buttons, scrollable text — every contact arming a drag means scrolling text inside a tile means moving the tile, the bug `dock-touch-long-press-drag` was filed against. Default to header-only; users who explicitly want whole-tile-grabs opt in. On touch, `'header'` is forced.

### 6.8 Corner drag-thumb (small "move" affordance in the top-right of each tile)

A small absolutely-positioned thumb with a 4-way move icon in the corner — Trello / react-grid-layout convention. **Rejected after consideration.** The header is a more discoverable drag affordance for our use case (visible UI strip with the title; the thumb is a small adorner that requires hover-discovery on desktop and is fiddly on touch). Header-as-drag-surface is also the precedent from `BsDockPaneComponent` — consistency.

### 6.9 Commit-only reflow instead of live reflow

Run the packer only on `pointerup`. **Rejected.** Live reflow is what makes the feature feel polished — the user sees the consequence before they release. With ≤50 tiles the packer cost per pointermove is negligible. Commit-only reflow combined with FLIP produces a "tiles teleport on release" effect that's noticeably worse, with no implementation savings.

### 6.10 Extract the WC to a standalone `@mintplayer/wc-tile-manager` package now

Ship the WC as its own npm package immediately, with `@mintplayer/ng-bootstrap/tile-manager` consuming it as a dependency. **Deferred.** Cleaner long-term layering (matches the dock's longer-term direction), but has no concrete consumer today and adds publish/version coupling we don't need. The WC sits in `web-components/` inside `@mintplayer/ng-bootstrap/tile-manager` and is exposed from the package's public API for direct use; extraction is purely a packaging move that can happen any time without API changes.

## 7. Out-of-scope follow-ups

- **`@mintplayer/wc-tile-manager` standalone package.** Move `web-components/` into its own publishable npm. Mechanical, no API changes.
- **React / Vue wrappers.** Once a real consumer surfaces, write `@mintplayer/react-tile-manager` and/or `@mintplayer/vue-tile-manager` over the same WC.
- **Maximize affordance** — header button toggling a tile to span the full grid width.
- **`compactType` input** — `'vertical' | 'horizontal' | 'none'`. v1 hard-codes vertical compact.
- **`view-transition` API** for animations once Firefox stable supports it. The CSS-Grid + FLIP approach in §5.10 produces visually similar results today.
- **Per-tile min/max span constraints** — `minColSpan`, `maxRowSpan`.
- **Drag-to-reorder header tabs inside a tile** ("tile group" sub-component).
- **Save/restore convenience helpers** — `[storageKey]="'…'"` auto-wiring localStorage.

## 8. Edge cases

- **Tiles with overlapping initial positions.** Consumer is allowed to provide colliding `position` inputs. Grid will visually overlap on first render. Packer does *not* run automatically on init — initial positions are the consumer's responsibility. On the first user-initiated drag/resize, the packer runs and resolves the collisions. `console.warn` once on init if a collision is detected, listing the colliding ids.
- **`columnCount` shrinks at runtime such that tiles overflow.** CSS Grid overflows horizontally. Packer doesn't auto-run. Consumer fixes by re-binding `position`.
- **Tile removed mid-gesture.** If the dragged tile is unmounted before `pointerup`, the WC's `pointermove` handler sees its id is no longer in `tiles`. Treat as cancellation: clear `gestureState`, no events.
- **Pointer leaves manager bounds during drag.** WC owns window-capture listeners (not host-bounded), so the drag continues. `targetRect` clamps.
- **Two simultaneous drags on multi-touch.** Each touch has its own `pointerId`; `gestureState` is single, so the second `pointerdown` overwrites the first. Concurrent drags are not in scope.
- **Resize handle on a 1×1 tile.** Side and bottom render at min size 1; clamp prevents going below 1.
- **Page becomes hidden during drag.** `visibilitychange` listener (added during gesture, removed on cleanup) → cancel.
- **iOS magnifier loupe / text selection on long-press.** Apply `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none` on the drag surface.
- **`disableMove` flips to `true` mid-drag.** Treat as cancellation.
- **All movable tiles are locked.** The packer can never reflow. Drags through space occupied by a locked tile → `blocked: true`.
- **Snapshot rebound at runtime mid-gesture.** The Angular wrapper checks `isGestureActive` on the WC and skips pushing updates while a gesture is in flight. If the consumer rebinds anyway (e.g. via `requestAnimationFrame`), the WC's `tiles` setter detects the in-flight gesture and queues the update for after `pointerup` — the in-flight `previewLayout` survives.
- **`prefers-reduced-motion: reduce`.** FLIP animator is bypassed; layout changes apply instantly. Live reflow still happens.
- **Direct WC consumer (no Angular wrapper).** They set `tiles` and listen for events themselves. `tiles` is a plain array property; `tilelayoutchange` is a standard `CustomEvent`. The WC API stands on its own.

## 9. Test plan

**WC unit tests** (`mint-tile-manager.element.spec.ts`, Vitest + jsdom)

- Layout: setting `columnCount = 6` and three `tiles` → each tile shell's `style.gridColumn` and `style.gridRow` matches its position.
- Layout: `columnCount = null` → host style contains `repeat(auto-fit, ...)`.
- Drag commit (mouse): dispatch `pointerdown` on a header → `pointermove` 5 px → repeated `pointermove`s → `pointerup`. Assert `tilelayoutchange` fired with the new snapshot, `tilepositionchange` fired for each moved tile.
- Drag commit (touch): `pointerdown` (`pointerType: 'touch'`) → fake-advance 600 ms → `pointermove` → `pointerup`. Variant: 200 ms `pointerup` → no events.
- Drag blocked: locked tile at (1,1), drag movable onto it → `tilegestureblocked` fired with `reason: 'locked-overlap'`, no `tilelayoutchange`.
- Resize commit: `pointerdown` on corner adorner → `pointermove` past half-cell → `pointerup`. Assert spans updated, neighbours reflowed.
- Resize blocked by lock.
- Cancel on `Escape` and on `pointercancel`.
- `disableMove` / `disableResize` true → `pointerdown` no-op.
- Reduced motion: with the matchMedia mock returning `matches: true`, no `transition` style applied during reflow.

**Packer unit tests** (`pack.spec.ts`, Vitest)

- Pin tile A overlapping B → B pushed down, then gravity-compacts to topmost free row. Verify against hand-computed expected output for a 5-tile fixture.
- Locked tile + pinned tile overlap → `blocked: true`.
- Vertical compact: gappy input layout converges to fully-packed.
- Tie-breaking: two tiles competing for the same cell → lower `(rowStart, colStart)` wins.

**Angular wrapper integration tests** (`tile-manager.component.spec.ts`, Vitest + AnalogJS)

- `<bs-tile [id]="x" [position]="p">` projects content into the matching `${id}-content` and `${id}-header` slots on the WC.
- WC `tilepositionchange` event drives the matching `<bs-tile>`'s `(positionChange)` → updates the consumer's bound model.
- WC `tilelayoutchange` event drives `<bs-tile-manager>`'s `(layoutChange)`.
- Persistence round-trip: capture snapshot → mutate → re-bind → tile positions match.
- Mid-gesture rebind: with `isGestureActive`, the wrapper does not clobber `previewLayout`.

**Manual** (https://bootstrap.mintplayer.com/advanced/tile-manager once shipped)

| Device | Gesture | Expected |
| --- | --- | --- |
| Desktop Chrome | Drag header onto empty cell | Tile moves, no neighbour reflow |
| Desktop Chrome | Drag header onto occupied cell | Neighbour pushed, gap filled by gravity, smooth animation |
| Desktop Chrome | Drag onto a locked tile | Red shake, snap back |
| Desktop Chrome | Drag corner handle | Live ghost, neighbours reflow live, half-cell snap |
| Desktop Chrome | Resize onto a locked tile | Blocked, no commit |
| Desktop Chrome | `Escape` mid-drag | Cancels, layout reverts |
| Desktop Chrome | Reload after rearranging | Layout restored from `localStorage` |
| Desktop Chrome | "Reset" demo button | Layout returns to defaults |
| Android Chrome | Tap header (<600 ms) | No drag |
| Android Chrome | Hold 600 ms → drag onto occupied | Push-and-reflow as on desktop |
| Android Chrome | Quick-tap resize handle and drag | Resize arms immediately |
| iOS Safari | Hold 600 ms | No magnifier loupe / text selection |
| Surface w/ pen | Pen tap-and-drag header | Immediate at 5 px |
| Keyboard | Focus tile, `Space` → arrows | Tile moves cell-by-cell with reflow; `aria-live` announces |
| Keyboard | Focus tile, `Shift + ArrowRight` | colSpan grows by 1 with reflow |
| Reduced-motion OS setting | Drag causing reflow | Tiles snap instantly, no transition |
| Direct WC use (test page) | Set `.tiles` property, listen for `tilelayoutchange` | Works without Angular |

## 10. Files touched

| Path | Change |
| --- | --- |
| `libs/mintplayer-ng-bootstrap/tile-manager/index.ts` | New — re-exports `./src`. |
| `libs/mintplayer-ng-bootstrap/tile-manager/ng-package.json` | New — `entryFile: "index.ts"`. |
| `libs/mintplayer-ng-bootstrap/tile-manager/README.md` | New — usage example with persistence pattern. |
| `libs/mintplayer-ng-bootstrap/tile-manager/project.json` | New — Nx project config (mirror dock's). Includes the codegen-wc target. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/index.ts` | New — public API exports. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/components/tile-manager.component.ts` | New — Angular wrapper. Marshals inputs to the WC's properties, projects child tiles into named slots, re-emits `tilelayoutchange` / `tilegestureblocked` as Angular outputs. `role="grid"` (forwarded to WC host). |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/components/tile.component.ts` | New — Angular wrapper. Projects header / content into `${id}-header` / `${id}-content` slots. Two-way binding for `position` driven by WC's `tilepositionchange` events. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/components/tile-header.component.ts` | New — drag-surface marker + presentational title bar styling. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/web-components/mint-tile-manager.element.ts` | New — LitElement. Owns the gesture state machine, packer invocation, FLIP animator, keyboard handlers, `ResizeObserver`, all rendering. Exposes `tiles` property + `tilelayoutchange` / `tilepositionchange` / `tilegestureblocked` events. `static get observedAttributes()`. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/web-components/mint-tile-manager.element.html` | New — Lit template source (codegen input). |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/web-components/mint-tile-manager.element.scss` | New — shadow-DOM styles. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/web-components/mint-tile-manager.element.template.ts` | New (generated) — codegen-wc output from `.html` + `.scss`. Regenerate via `nx run tile-manager:codegen-wc` whenever `.html` or `.scss` changes. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/web-components/mint-tile-manager.element.spec.ts` | New — WC unit tests (see §9). |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/utils/pack.ts` | New — pure vertical-compact packer. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/utils/pack.spec.ts` | New — packer unit tests. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/types/tile-position.ts` | New. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/types/tile-layout-snapshot.ts` | New. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/types/grid-rect.ts` | New. |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/components/tile-manager.component.spec.ts` | New — Angular wrapper integration tests. |
| `tsconfig.base.json` | Add path mapping `@mintplayer/ng-bootstrap/tile-manager` → `libs/mintplayer-ng-bootstrap/tile-manager/index.ts`. |
| `apps/ng-bootstrap-demo/src/app/pages/advanced/tile-manager/tile-manager.component.{ts,html,scss}` | New demo page with localStorage round-trip. |
| `apps/ng-bootstrap-demo/src/app/app.routes.ts` (or wherever advanced routes live) | Add `/advanced/tile-manager` route. |
| `apps/ng-bootstrap-demo/src/app/components/sidebar/...` | Add nav entry. |

No changes to `BsDock`, `BsResizable`, `BsGrid`, `mp-scheduler`, or any other existing component. The codegen-wc pipeline is reused, not modified. No new top-level runtime dependencies (Lit is already loaded by dock + scheduler).
