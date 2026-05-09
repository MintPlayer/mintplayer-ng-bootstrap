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

### Phase 1: Library scaffolding + WC skeleton
1. Create `libs/mintplayer-ng-bootstrap/multi-range/` directory tree mirroring `tile-manager/`.
2. Stub `MintMultiRangeElement extends LitElement` with `value`, `min`, `max`, `step`, `minDistance`, `orientation`, `disabled`, `formatValue` properties; `customElements.define('mint-multi-range', …)`.
3. Stub `.element.html` with track + N thumbs `repeat`-rendered + tooltip span + fill segments. Stub `.element.scss` importing Bootstrap variables (mirror `range.component.scss` imports).
4. Run `npm run postinstall` (or the codegen-wc Nx target) to verify `.element.template.ts` is generated.
5. Create `BsMultiRangeComponent` wrapper, side-effect import the WC element, expose `model<number[]>('value')`, signal inputs for the rest, sync via `effect()`.
6. Verify `npx nx build mintplayer-ng-bootstrap` passes with the empty component.

### Phase 2: Drag interaction (pointer + keyboard)
1. Implement pointer-drag on each thumb: `pointerdown` → `setPointerCapture`, `pointermove` → compute new value from coordinate, apply Block clamp + minDistance, dispatch `value-input` event (drag in progress), commit on `pointerup` with `value-change`.
2. Track-click jump: clicking the track moves the **nearest** thumb to that position.
3. Keyboard handler on each thumb (←/→/↑/↓/Home/End/PageUp/PageDown), respecting RTL inversion for ←/→.
4. `touch-action: none` on the track. No `preventDefault` on touch pointerdown.
5. `disabled` attribute disables pointer + keyboard handlers; thumbs lose `tabindex`.

### Phase 3: Visual polish
1. Track height + thumb size matching Bootstrap `form-range` defaults; CSS variables for theming (`--bs-multi-range-track-bg`, `--bs-multi-range-thumb-bg`, `--bs-multi-range-fill-bg`).
2. Fill segments: `(N-1)` absolutely-positioned divs between adjacent thumbs, recomputed via `value`-derived `computed()` styles.
3. Tooltip bubble per thumb, shown on `:hover, :focus-visible, :active`. Position above (horizontal) or right of (vertical) the thumb. Content = `formatValue(value)` if provided, else `value.toString()`.
4. Vertical orientation: rotate the track layout, thumbs stack, min at the bottom. Verify Firefox flex-shrink on the track + tooltips per memory `feedback_firefox_flex_shrink.md`.
5. Disabled state styling — match Bootstrap's `:disabled` form-range visuals.

### Phase 4: Value accessor + form integration
1. `BsMultiRangeValueAccessor` directive on `bs-multi-range`, `(value-change)` host listener, NG_VALUE_ACCESSOR provider.
2. `writeValue(value)`: sort ascending, clamp each to `[min, max]`, push to WC. If `value` is null/undefined/empty, push `[min, max]`.
3. `registerOnChange`, `registerOnTouched`, `setDisabledState(isDisabled)` toggling the `disabled` attribute on the WC.
4. Verify with template-driven (`[(ngModel)]`) and reactive (`new FormControl([3, 7])`) bindings in a scratch test.

### Phase 5: ARIA + RTL
1. Per-thumb `role="slider"`, `aria-valuemin/max/now`, `aria-orientation`, `aria-valuetext`. Host `role="group"`, accept `aria-label` attribute.
2. RTL: detect at gesture start, invert horizontal coordinate math. Verify thumb order matches visual order in RTL. Vertical mode unaffected.
3. Manual screen-reader smoke test (NVDA on Windows, VoiceOver if available) to confirm thumb announcements.

### Phase 6: Demo page
1. Scaffold `apps/ng-bootstrap-demo/src/app/pages/basic/forms/multi-range/`. Mirror `range/` shape (standalone, OnPush, no tabs, `BsGrid*` layout).
2. Eight examples in a feature grid:
   1. Basic 2-thumb with `[(ngModel)]` + a disabled toggle.
   2. 3-thumb (initial value `[2, 5, 8]`).
   3. `minDistance="2"` on a 0–100 range.
   4. `formatValue` producing currency strings (`$0.00`).
   5. Vertical orientation.
   6. RTL (wrap example in `<div dir="rtl">`).
   7. Disabled.
   8. **Reactive Forms**: `FormControl<number[]>([10, 40, 70])`, with a side panel showing the live `formControl.value` JSON.
3. Add route in `forms.routes.ts`.
4. Add navbar entry in `app.component.html` after the Range entry.
5. `multi-range.component.spec.ts` with a `should create` test mirroring `range.component.spec.ts`.

### Phase 7: Verification
1. `npx nx build mintplayer-ng-bootstrap` — clean compile.
2. `npx nx build ng-bootstrap-demo` — clean compile.
3. `npx nx test mintplayer-ng-bootstrap --testPathPattern=multi-range` — unit tests pass.
4. `npx nx test ng-bootstrap-demo --testPathPattern=multi-range` — demo spec passes.
5. `npx nx serve ng-bootstrap-demo` — visit `/basic/forms/multi-range` and walk every example.
6. Cross-browser smoke: Chromium + Firefox (flex-shrink memory), keyboard nav with screen reader.
7. Touch smoke: phone/tablet emulation in DevTools, confirm drag works without click being suppressed.

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
