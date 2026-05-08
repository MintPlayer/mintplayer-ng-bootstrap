# PRD — Color Picker Wheel Redesign

**Component:** `@mintplayer/ng-bootstrap/color-picker`
**Status:** Proposal
**Author:** Pieterjan
**Date:** 2026-05-08

---

## 1. Problem

The current color wheel lets the user pick any color in sRGB but **looks pale**. The center of the wheel is mid-gray (`#808080`); only the rim is vibrant. Side-by-side with [iro.js](https://iro.js.org), the difference is immediate: iro.js's wheel has a white center and a saturated rim — it reads as "candy", ours reads as "dingy".

This is not a polish bug. It's structural:

- The wheel uses **HSL** with **angle = Hue, radius = Saturation (0→100)**, and luminosity on a separate slider.
- The canvas is rendered at a fixed `hsl(h, s%, 50%)` for every pixel (`color-wheel.component.ts:120-121`). HSL geometry forces the center (S=0, L=50) to be pure 50%-gray. There is no parameter we can tweak to make HSL with S-as-radius look vibrant — the gray center is a property of the model.
- An earlier version put **lightness (50→100) on the radius** with saturation on a slider. The wheel was vibrant (white center → pure rim), but lightness 0→50 (every dark color) was unreachable. Half the spectrum dropped out. That regression is why we're here.

**We need a wheel that is vibrant *and* covers the entire sRGB gamut.**

## 2. Goals

- **G1.** The wheel reads as vibrant at typical usage (pure rim, white center) — at parity with iro.js for first-impression feel.
- **G2.** Every color in sRGB is reachable through the wheel + slider(s).
- **G3.** Public hex `ControlValueAccessor` contract on `<bs-color-picker [(ngModel)]>` is preserved. Forms-driven consumers do not need to change a line.
- **G4.** The redesign ships in a single release. No v1/v2 phased rollout.
- **G5.** The reverse-lookup (canvas pixel → color) is replaced with closed-form math, so future restyling cannot silently break picking.

## 3. Non-goals

- OKLCh, HSLuv, Display-P3 support. (Mentioned for completeness in §5; out of scope for this release.)
- Eyedropper, palette presets, recent-colors strip.
- Replacing the wheel shape with a Photoshop-style square. The wheel is part of the component's identity in this library.

## 4. Current state (background)

| Concern | Today |
|---|---|
| Color model | HSL |
| 2D surface | Wheel: angle = H, radius = S (0→100) |
| Wheel render | Fixed at L=50%, gray-to-pure radial gradient per integer hue |
| Slider 1 | Luminosity (0→100), strip rendered with current H/S |
| Slider 2 | Alpha (0→1), strip rendered with current H/S/L |
| Public API (wheel) | `hs: HS = {hue, saturation}` model, `luminosity: number` model, `hsChange` output |
| Public API (picker) | `size`, `disabled`, `allowAlpha`, `alpha` model |
| Forms contract | Hex string via `BsColorPickerValueAccessor` (alpha kept separate) |
| Pick math | `position2color()` reverse-looks-up via `getImageData()` — assumes wheel is rendered at L=50% |

### Defects observed in passing (to fix during the redesign, not after)

- **D1.** `rgb2Hsl` is duplicated in `color-wheel.component.ts:254` and `color-picker-value-accessor.directive.ts:89`. One source of truth is needed.
- **D2.** `isInsideCircle` returns `angle` in radians but is `% 360`'d as if degrees (lines 206, 225). Works by accident.
- **D3.** `onPointerDown` calls `ev.preventDefault()` for touch events (`color-wheel.component.ts:148`). Per project convention this suppresses the synthesized click on touch — should be replaced with `touch-action: none` on the canvas.
- **D4.** All `.spec.ts` files are scaffolds — no math, no integration, no UX assertions.
- **D5.** `diameterRatio` (annular-wheel knob) exists on the wheel API but is not exposed via `<bs-color-picker>` and is not used by the demo. Dead weight — drop it.
- **D6.** The canvas pixel buffer is sized 1:1 with the CSS box (`[width]="width()"` etc.). No `devicePixelRatio` scaling. On high-DPI screens the wheel is upscaled by the browser and looks fuzzy. Easy fix during the redesign: render the canvas at `size · devicePixelRatio` and CSS-scale it down.

### Size flow today (informational)

- `<bs-color-picker [size]="200">` → picker template plumbs `size()` to both `[width]` and `[height]` of the wheel and to `[style.width.px]` on each strip. So via the picker, the wheel is always square.
- `<bs-color-wheel>` accepts independent `width` / `height` model signals (defaults 150) and centers the inscribed disc via computed `shiftX` / `shiftY`. Disc geometry derives from `squareSize = min(width, height)` (`color-wheel.component.ts:38-45`).
- No caller currently uses non-square dimensions, but the capability exists. Keep it — it costs nothing and supports `<bs-color-wheel>` standalone.

## 5. Design space considered

### Option A — HSV wheel (iro.js parity) ★ recommended

| | |
|---|---|
| Model | HSV |
| Surface | angle = H, radius = S (0→100) |
| Slider | V (0→100), plus alpha |
| Wheel render | Drawn **once** at V=100. Conic hue gradient × radial white→transparent (saturation). The V slider darkens by overlaying a black layer with `opacity = 1 − V/100` — the wheel itself does not re-render |
| Center / rim | White / pure spectral colors |
| Gamut | Full sRGB |
| Feel | Vibrant at any V > ~30 |

This is exactly the iro.js recipe (`Wheel.tsx`, master). It's also what macOS `NSColorPanel`, Adobe Color/Kuler outer ring, and most modern circular pickers use.

**Pros**

- Solves the "pale center" cleanly and permanently.
- Closed-form pick math — no `getImageData` reverse-lookup needed (D5 inherently fixed).
- The wheel image is static; only the overlay opacity changes when V moves. Cheaper than the current per-frame redraw.

**Cons**

- HSV ≠ HSL. The internal model and the strip semantics change. Forms consumers (hex) are unaffected; direct `<bs-color-wheel>` consumers break.

### Option B — HSL, decoupled wheel rendering

Keep HSL on the API. Render the wheel always at L=50 (current behavior), but add a radial white overlay when L > 50 and a radial black overlay when L < 50, opacity `|L−50|/50`.

**Cons:** doesn't fix the cosmetic complaint at L=50, which is the typical first-paint state. The gray center is still gray when the user opens the picker. **Rejected.**

### Option C — Hue ring + inner SV square (Photoshop / Adobe Color)

Outer thin annulus = H, inner inscribed square = S × V. No color sliders.

**Cons:** Different component shape — breaks visual layout for every consumer; ng-bootstrap-demo and any embedding app have to re-style. Largest migration. The wheel-with-slider shape is part of this library's identity. **Rejected for this release; revisit if we ever build a "compact" variant.**

### Option D — HSL split-hemisphere wheel

`hsl(θ, S_current, 50 ± (r/R)·50)` — top hemisphere lightens to white, bottom darkens to black, mid-circle is the pure-color band. S on a slider.

**Cons:** Novel UX users have to learn ("up = light, down = dark"). Solves the gamut problem on the wheel itself but trades familiarity for it. **Considered, rejected** in favor of A's industry-standard mental model.

### Option E — OKLCh

Perceptually uniform lightness; would arguably solve the "pale" feel at a deeper level. But OKLCh→sRGB gamut isn't a cylinder — clipping or gamut-mapping renders dead zones at the rim. **Out of scope; revisit.**

## 6. Decision

**Adopt Option A — HSV wheel with iro.js-style three-layer rendering.**

Rationale: only design that simultaneously hits G1 (vibrant), G2 (full gamut), and keeps the component's external shape (disc + sliders) so consuming apps don't restyle. The hex `ControlValueAccessor` contract (G3) is preserved because hex is a model-agnostic string format.

## 7. Public API changes

Per the project convention that BC is not a default constraint, these are the cleanest signatures — not the ones that minimize churn.

### `BsColorPickerComponent` (the consumer-facing one)

| Member | Before | After |
|---|---|---|
| `[(ngModel)]` (hex) | `string` | `string` — **unchanged** |
| `alpha` model | `number` | `number` — **unchanged** |
| `size`, `disabled`, `allowAlpha` | | unchanged |

→ **No breaking change for the 95% case (`<bs-color-picker [(ngModel)]>`).**

### `BsColorWheelComponent` (advanced / direct use)

| Member | Before | After |
|---|---|---|
| `hs: HS = {hue, saturation}` | HSL saturation | **HSV saturation** (semantics change; same shape) |
| `luminosity: number` | HSL luminosity 0–1 | **renamed** to `brightness: number` 0–1 (HSV value) |
| `hsChange` output | HSL `HS` | HSV `HS` |
| `diameterRatio` | annular hole ratio | **removed** (dead — see D5) |
| `width` / `height` | independent dimensions | **unchanged** — keep so `<bs-color-wheel>` standalone supports non-square boxes |

→ **Clean break, no shims, no soft migration window.** Callers feeding HSL must convert at the boundary.

### Strips

- `BsLuminosityStripComponent` is misnamed today (HSL's third channel is *lightness*, not luminosity). Rename to `BsBrightnessStripComponent` (the HSV name — Adobe / Photoshop convention) **using `git mv`** so file history is preserved across the rename. The HTML/SCSS files rename in lockstep. Selector flips `bs-luminosity-strip` → `bs-brightness-strip`.
- Gradient runs from black (V=0) to pure-hue-at-current-saturation (V=100). The current 0→50→100 (black → mid → white) gradient goes away — that mapping was HSL-specific.
- `BsAlphaStripComponent` keeps its shape; reads V instead of L.

### Interfaces

- `HS` shape unchanged but its semantics flip to HSV. Add JSDoc.
- New `HsvColor { hue, saturation, value }` and existing `HslColor` both stay; conversions live in **a new `color-math.ts`** that subsumes the duplicated `rgb2Hsl` / `hsl2Rgb` from D1.

## 8. Implementation plan

Single PR, single release. (Per project convention: multi-part features ship together.)

1. **`color-math.ts`** — single source of truth for `rgb⇄hsl`, `rgb⇄hsv`, `hex⇄rgb`. Delete the duplicates in `color-wheel.component.ts:254` and `color-picker-value-accessor.directive.ts:89`.
2. **Rename `luminosity-strip` → `brightness-strip`** via `git mv` (preserves history). Rename selector, class, inputs/outputs, demo bindings.
3. **Rewrite `color-wheel.component.ts` rendering**:
   - Draw the static base wheel once: per-hue radial gradient `hsv(h, 0→100, 100)` (white at center, pure at rim). The CSS-friendly equivalent is conic hue + radial-gradient overlay; doing it on canvas keeps the marker hit-testing math simple.
   - Add a black overlay layer (a second canvas or a positioned `<div>`) with opacity bound to `1 − brightness()`.
   - Replace `position2color` with closed-form polar math: `S = clamp(r/R, 0, 1)`, `H = atan2(...)·180/π`. **No more `getImageData`.** Fixes D2 and the hidden coupling.
   - Render the canvas at `size · devicePixelRatio` and CSS-scale down (D6).
4. **Strips**: repaint the brightness strip (black→pure-hue gradient at current saturation); update the alpha strip to read V instead of L.
5. **Value accessor**: read hex → RGB → HSV → write to `hs` + `brightness`; emit RGB → hex on change. The hex round-trip continues to work; alpha stays separate.
6. **Pointer code**: drop the touch `preventDefault`; add `touch-action: none` to the canvas (D3).
7. **Demo**: update binding names, add a `brightness` readout next to the existing `luminosity` one.
8. **Tests** (D4): `color-math.ts` round-trips (hex → rgb → hsv → rgb → hex) are a high-leverage first test bed. Add wheel hit-test math tests using fake `getBoundingClientRect()`.

## 9. Validation

- **Visual parity:** screenshot the redesigned picker at V=100, V=50, V=0 and compare against iro.js reference at the same values. The center should be white at V=100, ~50% gray at V=50, black at V=0.
- **Gamut coverage:** programmatic test — for a sample of 1000 random sRGB hex values, round-trip hex → HSV(set on component) → emitted hex; assert per-channel diff ≤ 1.
- **Forms contract preserved:** existing demo with `[(ngModel)]="selectedColor"` still works without code change.
- **Touch:** verify the wheel is draggable on Android, with the synthesized click still firing if the user taps without dragging.

## 10. Resolved decisions

1. **`diameterRatio`** — **dropped**. Not exposed on the picker, not used by the demo, not exercised by any test. Reintroduce on demand.
2. **Strip naming** — **`BsBrightnessStripComponent`** (Adobe / Photoshop convention). Renamed via `git mv` to preserve file history. Inputs/outputs renamed in lockstep.
3. **Soft migration aid** — **no**. Clean break in a single release. The CHANGELOG entry covers the migration.
4. **`[mode]` input for HSL/HSV display labels** — **no**. The picker is HSV throughout. Numeric-input panels can be added later as separate components without affecting this redesign.
