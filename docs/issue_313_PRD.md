# Product Requirements Document: Multi-range slider

**Issue**: #313
**Title**: Multi-range
**Status**: Draft
**Created**: 2026-05-09
**Last Updated**: 2026-05-09

---

## Overview

A new N-thumb range-slider primitive `bs-multi-range` for `@mintplayer/ng-bootstrap`. Built as a Lit web component with an Angular wrapper (mirroring the `tile-manager` precedent), bound to forms via `ControlValueAccessor` over `number[]`. Coexists with the existing single-thumb `bs-range`. Demo page added at `Basic → Forms → Multi-range`.

---

## Goals & Objectives

### Primary Goals
- Ship a multi-thumb range slider that works as a form control in both template-driven and reactive forms.
- Match the look-and-feel of Bootstrap's `form-range` while supporting N thumbs (default 2), `minDistance`, custom value formatting, vertical orientation, and RTL.
- Surface every v1 input on a single feature-coverage demo page so it doubles as documentation.

### Success Metrics
- New library entry `@mintplayer/ng-bootstrap/multi-range` exports `BsMultiRangeComponent` + `BsMultiRangeValueAccessor`.
- A reactive `FormControl<number[]>` round-trips values without manual coercion; sort + clamp normalisation happens inside the component.
- Demo page reachable from the navbar at `/basic/forms/multi-range` and renders 8 working examples.
- `npx nx build mintplayer-ng-bootstrap` and `npx nx build ng-bootstrap-demo` pass.
- Pointer, touch, keyboard interaction all work; per-thumb ARIA announces correctly to NVDA.

---

## Functional Requirements

### Must Have (P0)

- [ ] **FR-1**: `<bs-multi-range>` renders N thumbs on a single track. N is inferred from `value.length`. Default when `value` is `undefined`/`null`/`[]` is `[min, max]` (2 thumbs spanning the range).
- [ ] **FR-2**: Inputs (signal-based) — `[min]: number = 0`, `[max]: number = 100`, `[step]: number = 1`, `[minDistance]: number = 0`, `[orientation]: 'horizontal' | 'vertical' = 'horizontal'`, `[formatValue]: (v: number) => string` (optional), `[disabled]: boolean`. Two-way `[(value)]: number[]`.
- [ ] **FR-3**: `BsMultiRangeValueAccessor` directive on the `bs-multi-range` selector. NG_VALUE_ACCESSOR provider. `writeValue` sorts ascending and clamps each entry to `[min, max]`. `setDisabledState` toggles the WC's `disabled` attribute.
- [ ] **FR-4**: **Block-crossing** — at every entry point (pointer drag, keyboard, `writeValue`, programmatic property write) the invariant `value[i-1] ≤ value[i] ≤ value[i+1]` holds, with `minDistance` respected.
- [ ] **FR-5**: Pointer + touch interaction via `pointerdown` / `setPointerCapture` / `pointermove` / `pointerup`. `touch-action: none` on the track. **No `preventDefault()` on touch pointerdown** (per memory `feedback_pointerdown_preventdefault.md`).
- [ ] **FR-6**: **Track-click jump** — clicking the track moves the *nearest* thumb to that position.
- [ ] **FR-7**: Keyboard navigation per thumb — ←/↓ = `-step`, →/↑ = `+step`, Home = `min`, End = `max`, PageUp = `+10·step`, PageDown = `-10·step`. RTL inverts ←/→.
- [ ] **FR-8**: Per-thumb tooltip bubble visible on `:hover`, `:focus-visible`, and during pointer drag. Hidden otherwise. Content = `formatValue(v)` if provided, else `v.toString()`.
- [ ] **FR-9**: Per-thumb ARIA — `role="slider"`, `tabindex="0"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-orientation`, `aria-valuetext`. Host `role="group"` with caller-supplied `aria-label`.
- [ ] **FR-10**: Vertical orientation — track is column, thumbs stack with min at the bottom (thermometer convention), tooltip appears to the right of each thumb.
- [ ] **FR-11**: RTL support — `getComputedStyle(host).direction === 'rtl'` inverts horizontal pointer math and ←/→ keyboard mapping. Vertical orientation is unaffected by direction.
- [ ] **FR-12**: Disabled state — pointer + keyboard handlers no-op, thumbs lose `tabindex`, visual matches Bootstrap's `:disabled` form-range.
- [ ] **FR-13**: Bootstrap-ish styling — track height + thumb size match `form-range` defaults; `(N-1)` filled segments between adjacent thumbs; CSS variables for theming (`--bs-multi-range-track-bg`, `--bs-multi-range-thumb-bg`, `--bs-multi-range-fill-bg`).
- [ ] **FR-14**: Demo page at `/basic/forms/multi-range` with 8 examples — basic 2-thumb (ngModel), 3-thumb, `minDistance`, `formatValue` (currency), vertical, RTL, disabled, **reactive form (FormControl<number[]>) with live JSON of the value**.
- [ ] **FR-15**: Navbar entry "Multi-range" under `Basic → Forms`, immediately after "Range".
- [ ] **FR-16**: Coexistence — no changes to `libs/mintplayer-ng-bootstrap/range/`. Existing `bs-range` callers unaffected.

### Should Have (P1)

- [ ] **FR-17**: WC unit spec covers `writeValue` normalisation, block-crossing under various drag deltas, and `minDistance` enforcement at each entry point.
- [ ] **FR-18**: Wrapper component spec covers input → property sync via `effect()`, output emission on `value-change` custom event, value-accessor `should create` and one round-trip case.
- [ ] **FR-19**: Honour `prefers-reduced-motion: reduce` for tooltip fade-in/out and any thumb hover transitions.

### Out of Scope (deferred — not v1)

- Tick marks (primary/secondary, labels, custom tick templates) — Infragistics has a whole sub-API for this; defer until a concrete caller asks.
- `[bubble]="'always' | 'auto' | 'never'"` knob — current behavior (auto) is locked; can ship later additively.
- Custom thumb / tooltip templates (slot projection from Angular into the WC's shadow DOM).
- Two-way binding on individual thumbs (`[(lowerValue)]`/`[(upperValue)]`-style API). Callers use the array.
- Push-on-collide and free-swap crossing behaviors (only Block is shipped).
- Per-segment fill colors for the (N-1) bands.

---

## Timeline & Milestones

### Milestone 1: Library scaffold + empty WC
- [x] `libs/mintplayer-ng-bootstrap/multi-range/` directory tree mirrors `tile-manager/`.
- [x] `MintMultiRangeElement extends LitElement` registered as `mp-multi-range`.
- [x] codegen-wc emits `.element.template.ts` from `.html`/`.scss` source.
- [x] `BsMultiRangeComponent` wrapper compiles, side-effect imports the WC.
- [x] `npx nx build mintplayer-ng-bootstrap` passes (entry point `@mintplayer/ng-bootstrap/multi-range` built without any tsconfig/package.json edits).

### Milestone 2: Drag + keyboard interaction
- [x] Pointer drag with `setPointerCapture`, Block-crossing + `minDistance` enforced via `constrainThumb()` (clamps to `[value[i-1] + minDistance, value[i+1] - minDistance]`).
- [x] Track-click jumps nearest thumb (chosen by smallest `Math.abs(value[i] - target)`); a continued press transfers drag to that thumb.
- [x] Keyboard handler — Arrow{Up,Down,Left,Right}, PageUp/PageDown (×10 step), Home/End. RTL inverts only horizontal Arrow{Left,Right}.
- [x] `disabled` short-circuits both `pointerdown` and `keydown` paths.
- [x] Events `value-input` (continuous, fires on every drag pointermove + keyboard step) and `value-change` (commit; pointerup, keyboard step) — both `bubbles: true, composed: true` so the Angular wrapper's host listeners pick them up across the shadow boundary.

### Milestone 3: Visual polish
- [ ] Track + thumb + (N-1) fill segments rendered with Bootstrap-ish styling and CSS variables for theming.
- [ ] Tooltip bubble per thumb on `:hover` / `:focus-visible` / `:active`.
- [ ] Vertical orientation (min at bottom).
- [ ] Disabled visual matches Bootstrap.

### Milestone 4: Forms integration
- [ ] `BsMultiRangeValueAccessor` directive: writeValue sorts + clamps; default = `[min, max]` when no value.
- [ ] Round-trip verified for `[(ngModel)]` and `FormControl<number[]>`.

### Milestone 5: ARIA + RTL + cross-browser
- [ ] Per-thumb ARIA attributes; NVDA smoke test.
- [ ] RTL pointer + keyboard math inverted; verified visually.
- [ ] Firefox flex-shrink check on track + tooltips.

### Milestone 6: Demo page
- [ ] 8 examples at `/basic/forms/multi-range` (incl. reactive-form example with live JSON).
- [ ] Route + navbar entry wired.
- [ ] Demo spec passes.

### Milestone 7: PR-ready
- [ ] All P0 acceptance criteria green.
- [ ] Manual smoke test on Chromium + Firefox + touch viewport.
- [ ] Screenshots / GIFs for the PR description.

---

## Open Questions

> None at PRD draft time. All design decisions resolved in the planning grill (architecture, thumb count, crossing, default value, tooltip visibility, v1 feature surface, demo coverage). The user is the requester, so no escalations.

---

## Technical Notes (Issue-Specific)

- **Most recent WC precedent is `tile-manager` (PR #321)** — the WC lives at `libs/mintplayer-ng-bootstrap/<name>/src/lib/web-components/mint-<name>.element.ts`, NOT under a top-level `libs/mp-<name>-wc/` directory and NOT under `libs/mintplayer-ng-bootstrap/web-components/<name>/` (that older path was used by `scheduler`). Match `tile-manager` exactly for the multi-range layout.
- **Element-name convention is split**: the source file + class use the `mint-` / `Mint` prefix (`mint-multi-range.element.ts`, `MintMultiRangeElement`), but the registered custom-element name uses `mp-` (`customElements.define('mp-multi-range', ...)`). This matches the tile-manager precedent exactly — the file/class follow the newer `mint-` convention while the rendered element keeps the `mp-` prefix used elsewhere in the project.
- **Codegen-wc is a postinstall step** — `tools/scripts/build-web-components.mjs` reads `<name>.element.html` + `<name>.element.scss` and writes `<name>.element.template.ts` (Lit `TemplateResult` + `CSSResult` exports). Hand-editing the generated file is wrong; edit `.html`/`.scss` and re-run.
- **Pointer events, not HTML5 dnd** — slider drag is a click-and-drag UI, the WC's source DOM is stable, but per memory `feedback_pointer_over_html5_dnd.md` the project's standing rule is to use `pointerdown` over HTML5 native drag-and-drop regardless. `setPointerCapture` to keep events flowing while the user drags off the thumb.
- **Touch correctness** — `touch-action: none` on the track at all times (per memory `feedback_touch_action_immutable.md`, can't be promoted mid-gesture). No `preventDefault()` on touch pointerdown (per memory `feedback_pointerdown_preventdefault.md`, suppresses the synthesized click on touch).
- **Firefox flex-shrink** — if the track or tooltips end up inside a flex parent in any demo example, set `flex: 0 0 auto` on the fixed-size visual elements (per memory `feedback_firefox_flex_shrink.md`). Smoke-test in Firefox before merging.
- **Computed signals over template expressions** — derived values (tooltip strings, fill segment styles, `aria-valuetext`) belong in `computed()` fields on the wrapper or inside the WC, not as inline template ternaries (per memory `feedback_computed_signals_in_template.md`).
- **No imperative iteration** — `map`/`filter`/`flatMap` for any thumb / segment iteration in TS or Lit `repeat()` for templates. No `forEach` accumulators, no `for (let i = ...)` (per memory `feedback_no_imperative_iteration.md`).
- **Breaking changes to `bs-range`** — none planned in v1. The `multi-range` is a separate component; `bs-range` is untouched. (Per memory `feedback_breaking_changes_ok.md`, BC isn't a default constraint, but there's no reason to disturb `range` here — its single-thumb API is correct for its callers.)
- **Default direction inference** — `getComputedStyle(host).direction` is the right call site, not `document.dir` (won't pick up an ancestor `dir="rtl"`). Read it at gesture start, not once at element-connected time, so direction changes mid-page are picked up.

---

## Related

- Issue #313 — https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/313
- Reference component (UX inspiration): https://www.infragistics.com/products/ignite-ui-angular/angular/components/slider/slider
- Existing single-thumb component: `libs/mintplayer-ng-bootstrap/range/`
- WC + wrapper precedent: `libs/mintplayer-ng-bootstrap/tile-manager/` (PR #321)
- Codegen tool: `tools/scripts/build-web-components.mjs`
- Demo precedent: `apps/ng-bootstrap-demo/src/app/pages/basic/forms/range/`
- Memory: `feedback_wc_plus_angular_wrapper.md`, `feedback_pointer_over_html5_dnd.md`, `feedback_pointerdown_preventdefault.md`, `feedback_touch_action_immutable.md`, `feedback_firefox_flex_shrink.md`, `feedback_computed_signals_in_template.md`, `feedback_no_imperative_iteration.md`, `feedback_breaking_changes_ok.md`, `feedback_prd_unified_scope.md`.
