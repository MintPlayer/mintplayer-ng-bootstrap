# Development Plan: Issue #313

**Issue**: #313
**Title**: Multi-range
**Type**: Feature (new component + new demo page)
**Priority**: Medium

## Executive Summary

Add a new `multi-range` slider to `@mintplayer/ng-bootstrap` that lets a form bind to an `number[]` of N thumbs (default 2) along a single track. Implemented as a Lit web component with an Angular wrapper following the **tile-manager** precedent (`libs/mintplayer-ng-bootstrap/<name>/src/lib/web-components/`). Ships with a `ControlValueAccessor` for both template-driven (`[(ngModel)]`) and reactive forms (`FormControl`), plus a feature-coverage demo page at `Basic → Forms → Multi-range`. Coexists with the existing single-thumb `bs-range` — no replacement, no breaking change to that component.

---

## Problem Statement

### Current Behavior
The library exposes a single-thumb `bs-range` (native `<input type="range">` with `form-range` styling). There is no multi-thumb / "filter range" slider — callers wanting `[lower, upper]` price filters or N-band selectors must reach for a third-party slider (Infragistics, Material), losing the Bootstrap visual integration and the project's WC-based architecture.

### Expected Behavior
A new `bs-multi-range` component renders N thumbs on a single horizontal or vertical track, styled to match Bootstrap's `form-range` family (track, thumb, fill segments between adjacent thumbs). It binds bidirectionally as `number[]` to ngModel / FormControl. Each thumb is keyboard-navigable, focus-bubbled, ARIA-compliant, and respects `[disabled]`. The component is N-thumb capable (≥1, default 2), with thumbs blocked from crossing each other.

### Impact
Closes the most-requested missing form primitive in the library. Differentiates from Infragistics (which caps at 2 thumbs). No runtime impact on existing consumers of `bs-range`.

---

## Technical Analysis

### Files to Create

**Library (Lit WC + Angular wrapper, mirrors `tile-manager` layout):**
- `libs/mintplayer-ng-bootstrap/multi-range/index.ts` — re-exports `./src`.
- `libs/mintplayer-ng-bootstrap/multi-range/ng-package.json` — standard ng-packagr config (`entryFile: "index.ts"`).
- `libs/mintplayer-ng-bootstrap/multi-range/package.json` — secondary entry point.
- `libs/mintplayer-ng-bootstrap/multi-range/src/index.ts` — barrel: component + value accessor + types.
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/components/multi-range.component.ts` — `BsMultiRangeComponent` (Angular wrapper around `<mint-multi-range>`).
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/components/multi-range.component.html` — `<mint-multi-range #el …>`.
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/components/multi-range.component.scss` — empty / `:host { display: block; }` only.
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/value-accessor/multi-range-value-accessor.ts` — `BsMultiRangeValueAccessor` directive on `bs-multi-range`, NG_VALUE_ACCESSOR provider, listens to `(value-change)` host event, value type `number[]`.
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/types/multi-range-orientation.ts` — `export type MultiRangeOrientation = 'horizontal' | 'vertical';`
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/web-components/mint-multi-range.element.ts` — `MintMultiRangeElement extends LitElement`, `customElements.define('mint-multi-range', …)`.
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/web-components/mint-multi-range.element.html` — Lit template source (codegen-wc input).
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/web-components/mint-multi-range.element.scss` — Lit shadow-DOM styles (codegen-wc input). Imports Bootstrap track/thumb tokens.
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/web-components/mint-multi-range.element.template.ts` — **codegen output**, do not edit by hand.
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/web-components/mint-multi-range.element.spec.ts` — Lit-level unit tests (clamping, sort-on-write, block-crossing).
- `libs/mintplayer-ng-bootstrap/multi-range/src/lib/components/multi-range.component.spec.ts` — wrapper-level test (input → property sync, event → output, value accessor round-trip).

**Demo:**
- `apps/ng-bootstrap-demo/src/app/pages/basic/forms/multi-range/multi-range.component.ts`
- `apps/ng-bootstrap-demo/src/app/pages/basic/forms/multi-range/multi-range.component.html`
- `apps/ng-bootstrap-demo/src/app/pages/basic/forms/multi-range/multi-range.component.scss`
- `apps/ng-bootstrap-demo/src/app/pages/basic/forms/multi-range/multi-range.component.spec.ts`

### Files to Modify
- `apps/ng-bootstrap-demo/src/app/pages/basic/forms/forms.routes.ts` — add `{ path: 'multi-range', loadComponent: () => import('./multi-range/multi-range.component').then(m => m.MultiRangeComponent) }` after the `range` route.
- `apps/ng-bootstrap-demo/src/app/app.component.html` — add a `<bs-navbar-item>` linking to `/basic/forms/multi-range` immediately after the existing `Range` entry inside the Forms submenu.
- (Possibly) `libs/mintplayer-ng-bootstrap/package.json` exports map / `tsconfig.base.json` paths, if the multi-range entry point isn't auto-resolved by the existing pattern. Cross-check against how `tile-manager` is wired.

### Dependencies
- `lit ^3.3.2` — already in root `package.json`.
- `@angular/forms` — already used by `range`.
- `@mintplayer/ng-bootstrap/grid`, `/form`, `/button-type` — already used by sibling demos; needed by the demo page.
- No new packages.

### Architecture Considerations
- **WC + wrapper precedent**: follow `tile-manager` (PR #321) byte-for-byte for directory layout. Element name `mint-multi-range`, NOT `mp-multi-range` — match the most recent precedent.
- **Codegen-wc**: place `.element.html` and `.element.scss` next to the `.element.ts`. The `tools/scripts/build-web-components.mjs` postinstall script will emit `.element.template.ts`. Do not hand-edit the generated file.
- **Wrapper bridging**: the wrapper component takes Angular input signals (`min`, `max`, `step`, `minDistance`, `orientation`, `value`, `formatValue`) and uses `effect()` to write each onto the WC element's property. Outputs (`valueChange`, `valueInput`) come from listeners on the WC's custom events (`value-change`, `value-input`). `CUSTOM_ELEMENTS_SCHEMA` on the component.
- **Value accessor**: a `@Directive` on `bs-multi-range` selector with `(value-change)` host listener that calls the registered `onChange(detail)`. `writeValue(arr)` pushes to the WC's `value` property. `setDisabledState` toggles the `disabled` attribute. Same shape as `BsRangeValueAccessor` but value type `number[]` instead of `number`.
- **Block-crossing**: enforced inside the WC during pointer/keyboard input — `clamp(newValue, value[i-1] ?? min, value[i+1] ?? max)` then `clamp(_, _, _ - minDistance | _ + minDistance)`. `writeValue` normalises with `[...arr].sort((a, b) => a - b).map(v => clamp(v, min, max))`.
- **Default value**: `writeValue(undefined | null | [])` renders `[min, max]` (2 thumbs). Thumb count = `value.length`. No `[thumbs]` input.
- **Tooltip visibility**: per-thumb bubble visible on `:hover`, `:focus-visible`, and during pointer drag (`:active` on the thumb). Implemented in CSS in the WC's shadow root.
- **Pointer events, not HTML5 dnd**: per memory `feedback_pointer_over_html5_dnd.md` and `feedback_pointerdown_preventdefault.md` — `pointerdown` to start drag, `setPointerCapture`, no `preventDefault()` on touch pointerdown, `touch-action: none` on the track per `feedback_touch_action_immutable.md`.
- **Keyboard map**: ←/↓ = `-step`, →/↑ = `+step`, Home = `min`, End = `max`, PageDown = `-10·step`, PageUp = `+10·step`. In RTL or vertical, the visual mapping flips but the value semantics stay (Home is always min).
- **ARIA**: each thumb has `role="slider"`, `tabindex="0"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-orientation`, `aria-valuetext` (computed from `formatValue` if provided, else the raw number). The host element has `role="group"` with an `aria-label` (callers can set via attribute).
- **RTL**: detected via `getComputedStyle(host).direction === 'rtl'` at gesture start. Drag math uses `(rect.right - clientX) / rect.width` instead of `(clientX - rect.left) / rect.width` in RTL horizontal. Vertical orientation always has min at the bottom (thermometer convention).
- **Computed signals over template expressions**: per memory `feedback_computed_signals_in_template.md`, any derived UI values (e.g. tooltip strings, fill-segment styles) the wrapper or demo passes to the template should live in `computed()` fields, not inline.

---

## Implementation Plan

### Phase 1: Library scaffolding + WC skeleton ✅
1. [x] Create `libs/mintplayer-ng-bootstrap/multi-range/` directory tree mirroring `tile-manager/`.
2. [x] Stub `MintMultiRangeElement extends LitElement` with `value`, `min`, `max`, `step`, `minDistance`, `orientation`, `disabled`, `formatValue` properties; `customElements.define('mp-multi-range', …)` (registered name uses `mp-` prefix per tile-manager precedent).
3. [x] `.element.html` is the codegen stub (template unused — render() draws the tree). `.element.scss` defines all CSS custom properties + visual structure for track / fill / thumb / tooltip / orientations. No Bootstrap SCSS imports — Lit shadow DOM is isolated, so theming is via `--bs-*` CSS variables that pierce shadow boundaries.
4. [x] Codegen-wc target run via `npx nx run-many --target=codegen-wc`; `.element.template.ts` generated.
5. [x] Wrapper component `BsMultiRangeComponent` with signal inputs, `model<number[]>('value')`, `effect()` syncing `value` and `formatValue` (function — must go via property, not attribute). Listens for `(value-input)` and `(value-change)` events.
6. [x] Value accessor scaffolded: `(value-input)` host listener for live updates, `(value-change)` for touched. `writeValue` pushes to the WC's `value` property; `setDisabledState` toggles the `disabled` attribute.
7. [x] `npx nx build mintplayer-ng-bootstrap` passes; `dist/libs/mintplayer-ng-bootstrap/fesm2022/mintplayer-ng-bootstrap-multi-range.mjs` emitted.

### Phase 2: Drag interaction (pointer + keyboard) ✅
1. [x] Pointer-drag on each thumb: `pointerdown` → `setPointerCapture` + focus thumb, `pointermove` → `valueFromPointer` + `moveThumb`, `pointerup` → `releasePointerCapture` + dispatch `value-change`.
2. [x] Track-click jump: `onTrackPointerDown` finds the nearest thumb, jumps it, then transfers drag to that thumb so press-and-drag keeps moving it.
3. [x] Keyboard handler on each thumb covering Arrow{Left,Right,Up,Down}, Home, End, PageUp, PageDown. `keyboardTarget()` computes the absolute target value; RTL inverts Arrow{Left,Right} only when not vertical.
4. [x] `touch-action: none` already set on `.track` and `.thumb` in M1's SCSS. No `preventDefault` on pointerdown (only on the keyboard handler — and only when a key is bound, to suppress page-scroll on Page{Up,Down}/Arrow{Up,Down}).
5. [x] `disabled` short-circuits both pointer and keyboard paths early. Thumbs use `?disabled=${this.disabled}` on the `<button>`, which removes them from the tab order.
6. [x] Step snapping via `snapToStep(v) = min + Math.round((v - min) / step) * step` then clamp to `[min, max]`.

### Phase 3: Visual polish ✅
1. [x] Track + thumb sizing already in M1 via `--bs-multi-range-track-thickness: 0.5rem` and `--bs-multi-range-thumb-size: 1rem` (matches Bootstrap form-range defaults). All theming colors fall back to existing Bootstrap CSS variables (`--bs-primary`, `--bs-tertiary-bg`, etc.) so dark-mode / theme overrides flow through automatically.
2. [x] Fill segments rendered in `render()`: `values.slice(0, -1).map(...)` produces `(N-1)` divs, each positioned via inline `left`+`width` (horizontal) or `bottom`+`height` (vertical).
3. [x] Tooltip — fixed the broken centering math from M1 (vertical was `translateY(50%)` instead of `translateY(-50%)`; horizontal had a stale `bottom` calc). Now horizontal is `bottom: calc(100% + 0.5rem); left: 50%; transform: translateX(-50%)`; vertical is `left: calc(100% + 0.5rem); top: 50%; transform: translateY(-50%)`. Visibility driven by parent thumb state (`:hover`, `:focus-visible`, `:active`, `[data-dragging='true']`) — no JS class toggle.
4. [x] Vertical orientation tested via the sibling-attribute selectors (`:host([orientation='vertical'])`).
5. [x] Disabled visual: grey thumb + grey fill, `cursor: not-allowed` on the host, tooltip hidden via `display: none`.
6. [x] `prefers-reduced-motion` honoured — transitions removed.

### Phase 4: Value accessor + form integration ✅
1. [x] `BsMultiRangeValueAccessor` directive — `(value-input)` for live updates, `(value-change)` to mark touched. NG_VALUE_ACCESSOR provider via `forwardRef`.
2. [x] `writeValue(value)` pushes through to the WC's `value` setter, which is the single source of normalisation (sort ascending + clamp). The default `[min, max]` fallback lives in the WC's getter — value accessor stays stateless.
3. [x] `registerOnChange`, `registerOnTouched`, `setDisabledState(isDisabled)` — disabled toggles the `disabled` attribute on the WC (which the WC reflects to its visual disabled state via `:host([disabled])` selectors).
4. [x] `multi-range.component.spec.ts` covers: `should create`, basic attribute forwarding, ngModel round-trip via `value-input`, FormControl round-trip via `value-input`, `setDisabledState` toggling the attribute, `value-change` marking the control as touched. All 464 library tests pass after this milestone.

**Test-environment note**: jsdom + vitest don't reliably upgrade the `mp-multi-range` custom element, so the spec asserts against Angular form state (`control.value`, `host.value()`, `control.touched`) and DOM attributes — not against WC instance methods. This is the right level for value-accessor tests and matches the testing-tile-manager spec's approach when WC internals aren't stable in the env.

### Phase 5: ARIA + RTL ✅ (NVDA smoke deferred to M7)
1. [x] Per-thumb ARIA on every thumb button: `role="slider"`, `aria-valuemin/max/now`, `aria-orientation`, `aria-valuetext` (only when `formatValue` is provided — uses Lit `nothing` to omit the attribute when not formatted, so SRs fall back to numeric `aria-valuenow`).
2. [x] Host `role="group"` set in `connectedCallback` (idempotent — only if not already set, so callers can override). Wrapper-level `[label]` input maps to `[attr.aria-label]` on the WC.
3. [x] `data-dragging="true|false"` data attribute on the actively-dragged thumb. Lit `requestUpdate()` triggered on `startDrag` and `onPointerUp` so the attribute reflects state changes. Used by SCSS to show the tooltip on touch where `:active` may not engage.
4. [x] RTL coordinate-math + keyboard inversion already landed in M2.
5. [ ] **Manual: Firefox flex-shrink check on track/tooltips** — deferred to M7 smoke pass.
6. [ ] **Manual: NVDA smoke test** — deferred to M7 smoke pass.

### Phase 6: Demo page ✅
1. [x] `apps/ng-bootstrap-demo/src/app/pages/basic/forms/multi-range/` scaffolded — standalone, OnPush, `JsonPipe` import, FormsModule + ReactiveFormsModule both present.
2. [x] All 8 examples implemented: basic 2-thumb (with disabled toggle), 3-thumb (`[2, 5, 8]` over `[0, 10]` step `0.5`), `minDistance=20`, currency `formatValue`, vertical (in a 12rem-tall host div so the track has room), RTL (wrapped in `dir="rtl"`), disabled, reactive `FormControl<number[]>([10, 40, 70])` with `toSignal(...valueChanges)` driving a `computed()` JSON readout.
3. [x] Route added between `input-group` and `range` (alphabetical) in `forms.routes.ts`.
4. [x] Navbar entry inserted between "Input group" and "Range" in `app.component.html`.
5. [x] `multi-range.component.spec.ts` — `should create` test, dependencies mocked via `ng-mocks` (mirrors `range.component.spec.ts`).

### Phase 7: Verification ✅
1. [x] `npx nx build mintplayer-ng-bootstrap` — clean compile.
2. [x] `npx nx build ng-bootstrap-demo` — clean compile.
3. [x] `npx nx test mintplayer-ng-bootstrap --testPathPattern=multi-range` — 464 tests pass.
4. [x] `npx nx test ng-bootstrap-demo --testPathPattern=multi-range` — 93 tests pass.
5. [x] `npx nx serve ng-bootstrap-demo` + Playwright smoke at `/basic/forms/multi-range` — all 8 examples render correctly with right thumb counts and values; keyboard nav + minDistance + disabled-focus-rejection verified.
6. [ ] Manual Firefox + NVDA smoke deferred to PR review.
7. [ ] Manual touch smoke deferred to PR review.

### Bug fixes discovered during smoke test
- **Wrapper `value` model default raced `writeValue()`**: a `model<number[]>([])` default ran the wrapper's effect and pushed `[]` to the WC, clobbering the form-control's initial value pushed by the value accessor. Fixed by defaulting to `undefined` and skipping the effect when undefined. Confirmed the FormControl example at `/basic/forms/multi-range` now renders 3 thumbs at `[10, 40, 70]`.
- **Vertical orientation collapsed to 0 height**: wrapper's `:host([orientation='vertical']) { height: 100% }` rule wasn't matching because the wrapper's host had no `orientation` attribute. Fixed by adding `host: { '[attr.orientation]': 'orientation()' }` to the wrapper component, so the percentage-height chain from `.vertical-host` → `<bs-multi-range>` → `<mp-multi-range>` → `.track` now resolves end-to-end.
- **RTL rendered LTR-style with flipped value math**: thumbs and fill used inline `left: V%` so in RTL the visual position was opposite to the value math (which already flipped via `getComputedStyle.direction`). Result: dragging a thumb LEFT made the value increase but the thumb visually moved RIGHT. Fixed by switching the inline style to logical `inset-inline-start: V%` for both thumbs and fill segments, and adding a `:host([orientation='horizontal']:dir(rtl)) .thumb { transform: translate(50%, -50%) }` rule so the thumb's center continues to sit on its anchor point in RTL (where the anchor is the right edge instead of the left). Verified via Playwright at `/basic/forms/multi-range`: thumb at value 15 now sits 15% from the RIGHT in RTL; ArrowLeft on it increases the value and visually moves it left; ArrowRight decreases the value and visually moves it right.

### PR #325 review feedback (gemini-code-assist)

Four review comments on `mint-multi-range.element.ts` addressed in a follow-up commit:

1. **`value` setter — equality check** (line 70): the wrapper's `effect` re-pushes the value on every `value-input` event during a drag, so each pointermove queued a redundant Lit update. Added a shallow array equality check in the setter; identical writes now early-return without a `requestUpdate`.
2. **Cache RTL direction at gesture start** (line 107): `isRtl()` was calling `getComputedStyle(this).direction` on every pointermove via `valueFromPointer`. Now cached in `rtlDuringGesture` set in `startDrag()` / `onTrackPointerDown` and cleared on `pointerup`. Keyboard reads stay fresh (rare events).
3. **Cache `.track` reference** (line 121): `valueFromPointer` was calling `renderRoot.querySelector('.track')` on every pointermove. Now stored in `trackEl` set in `firstUpdated()`, with a querySelector fallback for environments where `firstUpdated` hasn't run yet (test envs).
4. **Tie-breaking in `nearestThumbIndex`** (line 195): when multiple thumbs share a value (a stack), the old code always picked index 0, which is then blocked by its higher-indexed neighbours and can't move toward the click target — so nothing happened. Now ties break by direction: clicks to the right of the stack pick the highest-index thumb, clicks to the left pick the lowest. The chosen thumb has room to move toward the target.

E2E regression spec (`apps/ng-bootstrap-demo-e2e/e2e/multi-range.spec.ts`) still passes after these changes.

---

## Test Scenarios

### Scenario 1: Two-thumb ngModel round-trip
- **Given**: `<bs-multi-range [min]="0" [max]="100" [(ngModel)]="value">` with `value = signal([20, 80])`.
- **When**: User drags the right thumb to value 60.
- **Then**: Component fires `value-change` with `[20, 60]`; the model signal updates to `[20, 60]`; re-rendering with the new value keeps thumbs at 20 and 60.

### Scenario 2: Block-crossing
- **Given**: Slider with `value = [30, 50]`.
- **When**: User drags the left thumb rightward past 50.
- **Then**: Left thumb stops at 50; emitted value is `[50, 50]` (or `[50 - minDistance, 50]` if `minDistance > 0`).

### Scenario 3: writeValue normalisation
- **Given**: A reactive form with `FormControl([])`.
- **When**: `formControl.setValue([90, 10, 50])`.
- **Then**: Slider renders 3 thumbs at 10, 50, 90 (sorted). On next emission, the form value is `[10, 50, 90]`.

### Scenario 4: Default value when undefined
- **Given**: `<bs-multi-range [min]="0" [max]="100">` with no value bound and `ngModel` left untouched.
- **When**: Page renders.
- **Then**: Two thumbs appear at 0 and 100 (covering the full range). No emission yet.

### Scenario 5: Keyboard navigation respects RTL
- **Given**: `<div dir="rtl"><bs-multi-range [min]="0" [max]="100" [(ngModel)]="v"></bs-multi-range></div>` with `v = [30, 70]`, focus on the rightmost-visual thumb (which is value 30).
- **When**: User presses ArrowLeft.
- **Then**: Visually, the focused thumb moves left; emitted value increases by `step` (since RTL inverts the horizontal mapping). Home still goes to 0, End still goes to 100.

### Scenario 6: minDistance enforced at all entry points
- **Given**: `[minDistance]="5"`, `value = [10, 20]`, focus on the right thumb.
- **When**: User presses ArrowLeft repeatedly.
- **Then**: Right thumb stops at 15 (not at 10). Same constraint applies during pointer drag and `writeValue`.

### Scenario 7: formatValue drives tooltip and aria-valuetext
- **Given**: `[formatValue]="v => '$' + v.toFixed(2)"`, `value = [10, 40]`, hover over the left thumb.
- **When**: Tooltip becomes visible.
- **Then**: Tooltip content reads `$10.00`. Reading the thumb with a screen reader announces `$10.00` (via `aria-valuetext`).

### Scenario 8: Disabled state
- **Given**: `[disabled]="true"`.
- **When**: User attempts to drag any thumb or press an arrow key with focus on a thumb.
- **Then**: No movement, no event emitted. Thumbs are not focusable (no `tabindex`). Visual matches Bootstrap's `:disabled` `form-range`.

### Scenario 9: Vertical orientation
- **Given**: `[orientation]="'vertical'"`, `value = [25, 75]`.
- **When**: Page renders.
- **Then**: Track is vertical, min at bottom; lower-value thumb (25) sits below higher-value thumb (75). ArrowDown decreases value, ArrowUp increases. Tooltip appears to the right of the thumb.

### Scenario 10: Track-click jumps nearest thumb
- **Given**: `value = [10, 90]`.
- **When**: User clicks the track at value ≈ 30.
- **Then**: Left thumb (closer of the two) moves to 30; emitted value is `[30, 90]`.

---

## Acceptance Criteria

- [ ] New library `libs/mintplayer-ng-bootstrap/multi-range/` exists with WC + wrapper + value accessor.
- [ ] Custom element `mint-multi-range` registered; codegen-wc emits `.element.template.ts` and `.styles.ts`.
- [ ] `BsMultiRangeComponent` exposes signal inputs `[min] [max] [step] [minDistance] [orientation] [formatValue] [disabled]` and a `[value]` model.
- [ ] `BsMultiRangeValueAccessor` round-trips values for both template-driven and reactive forms; default value when unbound is `[min, max]`; `writeValue` sorts + clamps.
- [ ] Block-crossing enforced; `minDistance` respected at pointer, keyboard, and `writeValue` entry points.
- [ ] Tooltip per thumb visible on `:hover`, `:focus-visible`, `:active`; uses `formatValue` if provided.
- [ ] Per-thumb ARIA: `role="slider"`, `aria-valuemin/max/now`, `aria-orientation`, `aria-valuetext`. Host `role="group"`.
- [ ] Vertical orientation works (min at bottom).
- [ ] RTL inverts horizontal pointer + keyboard math; vertical unaffected.
- [ ] Pointer + touch + keyboard all functional. `touch-action: none` on the track. No `preventDefault` on touch pointerdown.
- [ ] Demo page at `/basic/forms/multi-range` renders 8 examples (basic 2-thumb, 3-thumb, minDistance, formatValue, vertical, RTL, disabled, reactive form). Navbar entry under Forms.
- [ ] `npx nx build mintplayer-ng-bootstrap` and `npx nx build ng-bootstrap-demo` pass.
- [ ] WC unit spec covers clamping / sort-on-write / block-crossing. Wrapper spec covers `should create` + form value round-trip. Demo spec covers `should create`.
- [ ] Manual smoke test on Chromium + Firefox + a touch viewport — drag, keyboard, screen-reader announcements, tooltip, disabled state.

---

## Build & Test Commands

```bash
# Generate WC template/style modules (runs automatically on postinstall)
npm run postinstall

# Build library
npx nx build mintplayer-ng-bootstrap

# Build demo
npx nx build ng-bootstrap-demo

# Serve demo
npx nx serve ng-bootstrap-demo

# Run unit tests
npx nx test mintplayer-ng-bootstrap --testPathPattern=multi-range
npx nx test ng-bootstrap-demo --testPathPattern=multi-range
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/tile-manager/` — most recent WC + wrapper precedent (PR #321). **Mirror this layout exactly.**
- `libs/mintplayer-ng-bootstrap/range/` — existing single-thumb slider, value-accessor shape to mirror.
- `libs/mintplayer-ng-bootstrap/scheduler/` — earlier WC + wrapper pattern for cross-reference.
- `tools/scripts/build-web-components.mjs` — codegen-wc that emits `.element.template.ts` / `.styles.ts`.
- `apps/ng-bootstrap-demo/src/app/pages/basic/forms/range/` — demo-page shape reference.
- `apps/ng-bootstrap-demo/src/app/pages/basic/forms/forms.routes.ts` — route registration.
- `apps/ng-bootstrap-demo/src/app/app.component.html` — navbar Forms submenu (where to add the entry).
- Memory: `feedback_wc_plus_angular_wrapper.md`, `feedback_pointer_over_html5_dnd.md`, `feedback_pointerdown_preventdefault.md`, `feedback_touch_action_immutable.md`, `feedback_firefox_flex_shrink.md`, `feedback_computed_signals_in_template.md`, `feedback_no_imperative_iteration.md`, `feedback_breaking_changes_ok.md`.
