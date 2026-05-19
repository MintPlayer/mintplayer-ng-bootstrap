# PRD: Floating-pane bounds clamping in DockManager

**Status:** Draft
**Author:** Pieterjan
**Date:** 2026-05-19
**Library:** `@mintplayer/ng-bootstrap/dock`
**Tracks:** (GitHub issue to be created)

---

## 1. Problem

The dock manager (`libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts`) never constrains a floating pane to the DockManager host. A pane can be:

- **seeded** out-of-bounds by a consumer (saved layout, hardcoded demo state),
- **dragged** out-of-bounds by the user,
- **resized** past the host edge,
- **stranded** out-of-bounds when the host shrinks (browser resize, parent layout change).

In every case the pane stays at its stored coordinates and is partially or wholly invisible. There is no recovery path short of mutating the saved layout JSON by hand.

### Concrete repro

At `http://localhost:4200/enterprise/dock` (or `https://bootstrap.mintplayer.com/enterprise/dock`):

1. Narrow the browser window to ~900 px wide.
2. Observe that **Panel 5** is missing from view.

`apps/ng-bootstrap-demo/src/app/pages/enterprise/dock/dock.component.ts:56-66` hardcodes:

```ts
{
  id: 'floating-panel-5',
  root: { kind: 'stack', panes: ['panel-5'], activePane: 'panel-5' },
  activePane: 'panel-5',
  bounds: { left: 680, top: 96, width: 320, height: 220 },
}
```

Its right edge sits at `680 + 320 = 1000 px`. Anything narrower hides it; nothing in the dock pulls it back.

### Code-path audit

| Where the clamp is missing | Site |
|---|---|
| **Initial load** — `normalizeFloatingLayout` clamps width/height to minimums but never inspects `left`/`top` against host dimensions. | `mint-dock-manager.element.ts:3639-3659` |
| **Drag (pointermove)** — `newLeft = startLeft + deltaX` is committed straight to `floating.bounds`; no clamp. | `mint-dock-manager.element.ts:1251-1272` |
| **Resize (pointermove)** — enforces `minWidth=192`, `minHeight=128`; no upper bound against host. | `mint-dock-manager.element.ts:1350-1351` |
| **Drag-to-float conversion** — initial bounds derived from pointer/stack position; no clamp. | `mint-dock-manager.element.ts:2591-2695` (esp. 2635-2657) |
| **Host resize** — `ResizeObserver` on `.dock-root` only refreshes divider intersection glyphs; floating panes are not re-evaluated. | `mint-dock-manager.element.ts:327-328` |

### Data model recap

`libs/mintplayer-ng-bootstrap/dock/src/lib/types/dock-layout.ts:25-53`:

```ts
interface DockFloatingPaneBounds {
  left: number;   // CSS px, absolute within DockManager host
  top: number;
  width: number;
  height: number;
}
interface DockFloatingStackLayout {
  id?: string;
  bounds: DockFloatingPaneBounds;
  zIndex?: number;
  root: DockLayoutNode | null;
  activePane?: string;
}
```

The public type stays unchanged in this PRD. `bounds` is reframed semantically as the **user's intended bounds**; what gets rendered is a derived value (see §4).

---

## 2. Goals

1. **Every floating pane is fully inside the DockManager host at all times** — on load, during active gestures, after host resize, and after drag-to-float.
2. **Render is a pure function of intent + host.** `floating.bounds` is treated as the user's intended position; the clamped render bounds are derived at render time and never persisted separately.
3. **Active gestures commit clamped intent.** Drag, resize, and drag-to-float each commit a host-clamped value into `floating.bounds`. The user feels the wall push back; there is no phantom "I dragged here once" state.
4. **Passive forces preserve intent.** Host resize and initial load do **not** mutate `floating.bounds`; they only re-derive render bounds. Shrink-then-grow restores the original intent.
5. **Tiny host degrades gracefully.** When host is smaller than the `192 × 128` minimum, the minimum is dropped and the pane shrinks to fit. Intent is preserved so the pane restores its original size when the host grows back.
6. **No public API change.** `DockFloatingStackLayout` / `DockFloatingPaneBounds` shapes, events, and attributes are untouched.
7. **Lock the behavior with tests** — unit tests on the clamp function and Playwright e2e covering the five trigger points.

### Non-goals

- New public API to read/write render bounds separately from intent.
- Animation / smooth motion when a pane is displaced by host shrink.
- Snap-to-edge or grid-snap behavior.
- Persistence format changes (saved layouts remain compatible byte-for-byte).
- Reconsidering the `192 × 128` minimum size for normal-sized hosts.
- Bounds for **docked** panes (docked layout already fills the host by construction).
- Constraining to the **viewport** rather than the host (host is the authoritative coordinate space; if the host overflows the viewport, that's the host's owner's problem).

---

## 3. Decisions made during grilling

| Decision | Choice | Rationale |
|---|---|---|
| What part of a floating pane must stay reachable | **Full pane inside host** | Strictest, simplest, no edge cases about "is the title bar reachable?". A pane that's fully inside is unambiguously usable. |
| When the clamp runs | **All five sites**: initial load, live during drag, host ResizeObserver, drag-to-float conversion, pane resize | A single missing site re-creates the bug. Ship them together (per the unified-scope rule). |
| Host shrinks below `192 × 128` | **Drop the minimum; shrink pane to fit** | Better than overflow (defeats the point) and better than hiding (loses user state). Min is preserved as intent so it restores on grow. |
| Persistence model | **Keep intent (`floating.bounds`), derive render position** | A user that shrinks-then-grows their window sees their panes return to where they put them. Passive resize must not destroy state. |
| Public type changes | **None** | `bounds` stays. Its semantics shift from "render coords" to "intended coords"; that's an internal interpretation change, not an API change. Existing saved layouts continue to load. |
| Intent committed during active gestures | **Yes — clamped value writes to `floating.bounds`** | If the user explicitly drags a pane to position X (clamped), X is their new intent. Phantom unclamped intent would be confusing on subsequent gestures. |
| Mutation on load | **No, except existing sanitization** (NaN / negative / sub-minimum sizes still get repaired) | The point of intent-preservation is that `setLayout(snapshot)` round-trips. Out-of-bounds is not malformed — it's just "host is currently small". |

---

## 4. Algorithm

### 4.1 The clamp function

```ts
function clampBoundsToHost(
  intent: DockFloatingPaneBounds,
  host: { width: number; height: number },
): DockFloatingPaneBounds {
  if (host.width <= 0 || host.height <= 0) return intent; // host not yet measured

  const width  = Math.min(intent.width,  host.width);
  const height = Math.min(intent.height, host.height);
  const left   = Math.min(Math.max(intent.left, 0), host.width  - width);
  const top    = Math.min(Math.max(intent.top,  0), host.height - height);

  return { left, top, width, height };
}
```

Properties:

- **Idempotent**: `clamp(clamp(x, h), h) === clamp(x, h)`.
- **Pure**: no mutation; returns a new object.
- **Tolerant of tiny hosts**: drops the `192 × 128` floor implicitly (the floor is only enforced at gesture commit time, see §4.3).

### 4.2 Render integration

`renderLayout` (and the floating-layer DOM write at `mint-dock-manager.element.ts:565-569`) currently writes `floating.bounds.left/top/width/height` straight to inline styles. Change this single site to:

```ts
const host = this.getHostSize(); // reads .dock-root clientWidth/clientHeight
const rendered = clampBoundsToHost(floating.bounds, host);
wrapper.style.left   = `${rendered.left}px`;
wrapper.style.top    = `${rendered.top}px`;
wrapper.style.width  = `${rendered.width}px`;
wrapper.style.height = `${rendered.height}px`;
```

The intent (`floating.bounds`) is never mutated by render. All five sites below funnel through the same render path, so the visible position is always clamped — passive triggers (load, host resize) need only fire a re-render, not a mutation.

### 4.3 Trigger sites

| Site | Today | After |
|---|---|---|
| **Initial load** (`normalizeFloatingLayout`, line 3639) | Clamps width/height ≥ 160/120; ignores left/top vs host. | **Unchanged.** Render derives clamped position from intent on first paint. (The width/height ≥ 160/120 sanitization stays — it repairs malformed input.) |
| **Drag pointermove** (`handleFloatingDragMove`, line 1251) | `newLeft = startLeft + deltaX`, write to `floating.bounds.left`. | Compute `proposed = { left: startLeft + deltaX, top: startTop + deltaY, width: bounds.width, height: bounds.height }`, then `floating.bounds = clampBoundsToHost(proposed, host)`. User feels the wall. |
| **Resize pointermove** (line 1350) | `newWidth = max(192, startWidth + deltaX)`; no host max. | Same min logic, plus clamp final result through `clampBoundsToHost`. When host < 192/128, the min is dropped — pane shrinks to fit. Direction-aware: when resizing from a left/top edge, `left`/`top` shifts accordingly and gets clamped to ≥ 0. |
| **Drag-to-float** (`convertPendingTabDragToFloating`, line 2591) | Initial bounds from pointer/stack metrics; no clamp. | Run the computed initial bounds through `clampBoundsToHost` before assigning to the new `DockFloatingStackLayout.bounds`. |
| **Host ResizeObserver** (line 327) | Re-renders divider glyphs only. | Additionally schedule a render of the floating layer. Since render derives clamped position from intent, the panes re-flow inward without state mutation. |

### 4.4 Host size source

`getHostSize()` reads `clientWidth` / `clientHeight` of the `.dock-root` element. During the ResizeObserver callback, the `ResizeObserverEntry.contentRect` is used directly to avoid a layout read.

### 4.5 Z-order interaction

Clamping does not affect `floatingPaneZIndex` ordering. Two clamped panes can overlap; the existing stacking order applies.

---

## 5. Test plan

### 5.1 Unit tests — `mint-dock-manager.element.spec.ts`

Each test calls `clampBoundsToHost(intent, host)` directly and asserts the returned bounds.

- **Already inside** — `intent={left:100, top:50, width:200, height:150}, host={width:1000, height:800}` → unchanged.
- **Right-overflow** — `intent={left:680, top:96, width:320, height:220}, host={width:900, height:600}` → `left=580` (= 900−320). (This is the Panel 5 repro.)
- **Bottom-overflow** — analogous on the y-axis.
- **Left-overflow** — `intent.left = -50` → `left = 0`.
- **Top-overflow** — `intent.top = -50` → `top = 0`.
- **Wider than host** — `intent.width=1200, host.width=900` → `width=900, left=0`.
- **Taller than host** — analogous on y-axis.
- **Smaller than min, smaller host** — `intent.width=192, host.width=100` → `width=100, left=0` (min dropped).
- **Zero host** — `host={width:0, height:0}` → returns intent unchanged.
- **Idempotency** — `clamp(clamp(x, h), h)` structurally equals `clamp(x, h)` for every above case.

### 5.2 Playwright e2e — `apps/ng-bootstrap-demo-e2e/`

Driven against the demo (`/enterprise/dock`). Each test waits for `networkidle` after `goto` (per the existing e2e convention). Tests assert `getBoundingClientRect()` against `.dock-root` bounds.

| # | Scenario | Trigger covered |
|---|---|---|
| 1 | Load page at viewport 800×600; assert Panel 5 is fully inside `.dock-root`. | Initial load + render |
| 2 | Load at 1400×900, then shrink window to 800×600; assert Panel 5 stays inside. Grow back to 1400×900; assert Panel 5 returns to original intent (`left=680`). | ResizeObserver + intent preservation |
| 3 | At 1400×900, drag a floating pane's title bar past the right edge; assert pane stops at the right edge during the drag (intermediate frames clamped). | Live drag |
| 4 | At 1400×900, resize a floating pane from its bottom-right grip past the host right edge; assert pane's right edge stops at host right edge. | Resize |
| 5 | At 1400×900, drag a tab out of a docked stack near the right edge to create a new floating pane; assert the new pane is fully inside. | Drag-to-float conversion |
| 6 | At 250×200 (smaller than min), assert any floating pane shrinks to fit and is fully visible. | Tiny-host degradation |
| 7 | State restoration — programmatically set `layout` to a JSON with `bounds={left:5000, top:5000, width:320, height:220}` at viewport 1200×800; assert pane renders inside. Read `dock-layout-changed` payload; assert `bounds` is **still** `{left:5000, top:5000, ...}` (intent preserved). | Intent vs render decoupling |

### 5.3 Acceptance gates

- All unit tests pass.
- All Playwright e2e tests pass headed and headless.
- At `http://localhost:4200/enterprise/dock` at viewport 800×600, Panel 5 is visible and fully inside the dock surface.
- Shrinking and re-growing the browser returns panes to their original positions.
- A `dock-layout-changed` event payload after a passive host resize is **identical** to the payload before (no spurious mutations).

---

## 6. Implementation outline

| Step | File | Description |
|---|---|---|
| 1 | `mint-dock-manager.element.ts` | Add `private clampBoundsToHost(intent, host): DockFloatingPaneBounds` and `private getHostSize(): {width, height}`. |
| 2 | `mint-dock-manager.element.ts` | Funnel the floating-layer DOM write (line 565-569) through `clampBoundsToHost`. |
| 3 | `mint-dock-manager.element.ts` | `handleFloatingDragMove` (1251) — compute proposed bounds, commit clamped value to `floating.bounds`. |
| 4 | `mint-dock-manager.element.ts` | Resize handler (1350) — compute proposed bounds, apply min-size logic with tiny-host fallback, commit clamped value. |
| 5 | `mint-dock-manager.element.ts` | `convertPendingTabDragToFloating` (2591) — clamp the computed initial bounds before assigning. |
| 6 | `mint-dock-manager.element.ts` | ResizeObserver callback (327) — additionally schedule a floating-layer render (no state mutation). |
| 7 | `mint-dock-manager.element.spec.ts` | Add unit tests from §5.1. |
| 8 | `apps/ng-bootstrap-demo-e2e/` | Add the seven Playwright e2e tests from §5.2. |
| 9 | Codegen | Run `nx run mintplayer-ng-bootstrap:codegen-wc` if any SCSS / template structure changed (none expected — this is pure TS). |

---

## 7. Open questions

None — all design decisions resolved during grilling.

---

## 8. Related

- PRD `docs/prd/dock-layout-normalize.md` — sibling normalization pass for the docked tree; this PRD is its floating-layer counterpart.
- PRD `docs/prd/dock-splitter-tabcontrol-lit-composition.md` — the Lit/WC composition architecture this PRD builds on.
- `mint-dock-manager.element.ts:3639` — `normalizeFloatingLayout` (existing minimum-size sanitization stays).
- `apps/ng-bootstrap-demo/src/app/pages/enterprise/dock/dock.component.ts:56-66` — Panel 5 demo seed (the repro source).
