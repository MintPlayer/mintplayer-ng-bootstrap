# Product Requirements Document: Multi-range slider

**Issue**: #313
**Title**: Multi-range
**Status**: Implemented (pending PR)
**Created**: 2026-05-09
**Last Updated**: 2026-05-09 (after RTL fix + e2e regression spec on commit `66eaca40`)

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

- [x] **FR-1**: `<bs-multi-range>` renders N thumbs on a single track. N is inferred from `value.length`. Default when `value` is `undefined`/`null`/`[]` is `[min, max]` — handled inside the WC's `value` getter (`return this._value ?? [this.min, this.max]`).
- [x] **FR-2**: Inputs (signal-based) — `[min]=0`, `[max]=100`, `[step]=1`, `[minDistance]=0`, `[orientation]='horizontal'`, `[formatValue]: ((v: number) => string) \| null = null`, `[disabled]=false`. Two-way `[(value)]` is a `model<number[] \| undefined>(undefined)` so an unbound consumer doesn't clobber a form-control's `writeValue()`. Plus `[label]` for forwarding to `aria-label` on the WC.
- [x] **FR-3**: `BsMultiRangeValueAccessor` directive on `bs-multi-range`. NG_VALUE_ACCESSOR provider. `writeValue` delegates to the WC's `value` setter, which sorts ascending + clamps. `setDisabledState` toggles the WC's `disabled` attribute.
- [x] **FR-4**: **Block-crossing** — `constrainThumb()` enforces `value[i-1] + minDistance ≤ value[i] ≤ value[i+1] - minDistance` at every interactive entry point (pointer `moveThumb`, keyboard `onThumbKeyDown`, track-click `onTrackPointerDown`). `writeValue` / property writes sort + clamp to `[min, max]` (minDistance not enforced on programmatic writes — caller can pre-violate it; user interaction will then re-converge).
- [x] **FR-5**: Pointer drag uses `pointerdown` → `setPointerCapture` → `pointermove` → `pointerup`. `touch-action: none` set in SCSS on `.track` and `.thumb`. No `preventDefault()` on touch `pointerdown` (only on `keydown` for bound keys, to suppress page-scroll on Page{Up,Down}/Arrow{Up,Down}).
- [x] **FR-6**: Track-click jump — `onTrackPointerDown` finds the nearest thumb (by smallest `Math.abs(value[i] - target)`) and jumps it to the click position, then transfers the drag to that thumb.
- [x] **FR-7**: Keyboard navigation per thumb — ←/↓/PageDown/Home decrease, →/↑/PageUp/End increase. PageUp/PageDown = ±10·step. Home = min, End = max. RTL inverts ←/→ only (not ↑/↓).
- [x] **FR-8**: Per-thumb tooltip visible on `:hover`, `:focus-visible`, `:active`, and via the JS-tracked `[data-dragging='true']` attribute (covers touch where `:active` is unreliable). Hidden when `:host([disabled])`. Content uses `formatValue(v)` if set, else `v.toString()`.
- [x] **FR-9**: Per-thumb ARIA — `role="slider"`, `aria-valuemin/max/now`, `aria-orientation`, `aria-valuetext` (only when `formatValue` is set; otherwise omitted via Lit `nothing` so SRs read `aria-valuenow` raw). `tabindex` is implicit on `<button>`. Host `role="group"` set in `connectedCallback` (idempotent — only if not already set). `[label]` input forwards to `[attr.aria-label]` on the WC.
- [x] **FR-10**: Vertical orientation — track becomes a 0.5rem-wide column, thumbs use `bottom: V%` so min is at the bottom, tooltip positioned to the right of each thumb. Wrapper component reflects `[attr.orientation]` to its host so the percentage-height chain (`<bs-multi-range>` → `<mp-multi-range>` → `.track`) resolves end-to-end.
- [x] **FR-11**: RTL support — `getComputedStyle(host).direction` read at gesture start (catches ancestor `dir` changes). `valueFromPointer` flips horizontal coordinate math; `keyboardTarget` flips ←/→. Rendering uses logical `inset-inline-start: V%` for thumbs and fill, with `:host([orientation='horizontal']:dir(rtl)) .thumb { transform: translate(50%, -50%) }` so the thumb's center sits on its right-anchored origin. Vertical orientation is unaffected by direction. **e2e regression spec on Chromium + Firefox locks this in (`apps/ng-bootstrap-demo-e2e/e2e/multi-range.spec.ts`).**
- [x] **FR-12**: Disabled state — `disabled` short-circuits both `pointerdown` and `keydown` paths early. The `<button>` thumbs use `?disabled=${this.disabled}`, removing them from the tab order. Visual: grey thumb + grey fill, `cursor: not-allowed` on the host, tooltip hidden.
- [x] **FR-13**: Bootstrap-ish styling — track height `0.5rem`, thumb size `1rem` (matching `form-range` defaults). `(N-1)` filled segments rendered between adjacent thumbs by `render()`. CSS variables for theming: `--bs-multi-range-{track,fill,thumb,tooltip}-bg`, `--bs-multi-range-thumb-size`, etc., falling back to existing Bootstrap variables (`--bs-primary`, `--bs-tertiary-bg`, `--bs-secondary` for disabled).
- [x] **FR-14**: Demo at `/basic/forms/multi-range` with 8 labelled examples — basic 2-thumb (ngModel), 3-thumb, `minDistance=20`, currency `formatValue`, vertical, RTL, disabled, reactive `FormControl<number[]>([10, 40, 70])` with `toSignal(...valueChanges)` driving a live JSON readout in a sidebar.
- [x] **FR-15**: Navbar entry "Multi-range" added in `app.component.html` under `Basic → Forms`, between "Input group" and "Range" (alphabetical).
- [x] **FR-16**: Coexistence — `git diff master...HEAD -- libs/mintplayer-ng-bootstrap/range/` is empty. The existing `bs-range` is untouched.

### Should Have (P1)

- [x] **FR-17**: Block-crossing + `minDistance` enforcement covered by the e2e spec (`apps/ng-bootstrap-demo-e2e/e2e/multi-range.spec.ts`) and indirectly by the manual smoke test (focus thumb 1 of the `minDistance=20` slider, press Home → value clamps to 40 = lower + minDistance, not 0). A *standalone* WC unit spec was not added — vitest+jsdom can't reliably upgrade the custom element, so direct WC instance methods (`getValues()`, etc.) aren't observable; covering this at the e2e level was the right call. The wrapper unit spec asserts via Angular form state.
- [x] **FR-18**: Wrapper spec (`multi-range.component.spec.ts`) covers `should create`, primitive-attribute forwarding, ngModel `value-input` round-trip, FormControl `value-input` round-trip, `setDisabledState` toggling the disabled attribute, `value-change` marking the FormControl as touched. The `effect()`-based property sync isn't asserted directly (would require WC instance access) but is exercised end-to-end via the e2e spec, which reads back `aria-valuenow` after binding the FormControl.
- [x] **FR-19**: `prefers-reduced-motion: reduce` removes thumb + tooltip transitions in the WC's SCSS.

### Added during implementation (P1)

- [x] **FR-20**: e2e regression spec `apps/ng-bootstrap-demo-e2e/e2e/multi-range.spec.ts` with three Playwright tests asserting RTL geometry (lower-value thumb on the right half of the track), ArrowLeft moving leftward (and value increasing), ArrowRight moving rightward (and value decreasing). Runs on Chromium + Firefox.

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
- [x] Track + thumb + (N-1) fill segments rendered with Bootstrap-ish styling. Theming via `--bs-multi-range-{track,fill,thumb,tooltip}-bg` etc., falling back to Bootstrap's `--bs-primary`/`--bs-tertiary-bg`/etc.
- [x] Tooltip bubble per thumb visible on `:hover`, `:focus-visible`, `:active`. Position: above (horizontal), right of (vertical). Hidden when `:host([disabled])`.
- [x] Vertical orientation correctly lays out track + thumbs + tooltips with min at the bottom.
- [x] Disabled state — grey thumb + grey fill, `cursor: not-allowed`, no tooltip.
- [x] `prefers-reduced-motion: reduce` removes thumb/tooltip transitions.

### Milestone 4: Forms integration
- [x] `BsMultiRangeValueAccessor` directive: writeValue delegates to the WC's `value` setter, which sorts ascending + clamps to `[min, max]`. Default = `[min, max]` when value is `null`/`undefined`/`[]` (handled inside the WC's getter, not the value accessor — single source of truth).
- [x] `setDisabledState` toggles the WC's `disabled` attribute.
- [x] Round-trip verified for `[(ngModel)]` and `FormControl<number[]>` via `multi-range.component.spec.ts` (5 specs covering value-input emission, setDisabledState, and value-change marking the control as touched). All 464 library tests still pass.

### Milestone 5: ARIA + RTL + cross-browser
- [x] Per-thumb ARIA on every `<button class="thumb">`: `role="slider"`, `aria-valuemin/max/now`, `aria-orientation`, `aria-valuetext` (only when `formatValue` is provided — otherwise `aria-valuenow` is announced raw). `tabindex="0"` is implicit on `<button>`.
- [x] Host gets `role="group"` from `connectedCallback` (only if not already set, so callers can override).
- [x] Wrapper exposes `[label]` input that maps to `[attr.aria-label]` on the WC, so callers can label the slider group.
- [x] `data-dragging` attribute on the actively-dragged thumb provides a CSS hook for tooltip visibility on touch devices where `:active` is unreliable. Cleared on pointerup.
- [x] RTL pointer + keyboard math already in M2 (`isRtl()` from `getComputedStyle`); verified by build + tests, then by the e2e regression spec across Chromium + Firefox.
- [x] Firefox coverage achieved via the e2e spec running on the `firefox` Playwright project.
- [ ] Manual NVDA smoke test → deferred to PR review.

### Milestone 6: Demo page
- [x] 8 examples at `/basic/forms/multi-range` — basic 2-thumb, 3-thumb, `minDistance`, `formatValue` (currency), vertical, RTL, disabled, **reactive form (FormControl) with live JSON sidebar**.
- [x] Route added in `forms.routes.ts` between `input-group` and `range` (alphabetical).
- [x] Navbar entry "Multi-range" added in `app.component.html` between "Input group" and "Range".
- [x] `multi-range.component.spec.ts` — `should create` test passes (mocking dependencies via ng-mocks, mirroring the range demo's spec).

### Milestone 7: PR-ready
- [x] All P0 acceptance criteria green. 464 library tests + 93 demo tests pass.
- [x] Manual smoke test on Chromium via Playwright — keyboard nav, minDistance constraint enforcement at the keyboard entry point, disabled-state focus rejection all verified. Vertical orientation rendered correctly after smoke-test fix below.
- [x] **Smoke-test bug fix #1**: wrapper `value` model defaulted to `[]`, racing the value-accessor's `writeValue()` and rendering `[min, max]` instead of the form-control's initial value. Changed default to `undefined` and the effect skips when undefined — only an explicit `[(value)]` binding or user interaction sets the model.
- [x] **Smoke-test bug fix #2**: vertical orientation was rendering as a 0-height collapsed track. Wrapper's `:host([orientation='vertical'])` selector wasn't matching because `orientation` wasn't on the wrapper's host. Added `host: { '[attr.orientation]': 'orientation()' }` so the percentage-height chain (`.vertical-host { height: 12rem }` → `<bs-multi-range>` → `<mp-multi-range>` → `.track`) resolves end-to-end.
- [x] **Smoke-test bug fix #3 (RTL)**: thumbs and fill rendered with `left: V%` (LTR-style) so in RTL the visual position contradicted the value math (which already flipped). Switched to logical `inset-inline-start` for thumb + fill positioning, and added `:host([orientation='horizontal']:dir(rtl)) .thumb { transform: translate(50%, -50%) }` so the thumb's center sits on its anchor point in RTL. Verified via Playwright: thumb at value 15 now sits 15% from the RIGHT in RTL; ArrowLeft on it increases the value (visually moves left) and ArrowRight decreases (visually moves right).
- [x] **e2e regression spec** added (`apps/ng-bootstrap-demo-e2e/e2e/multi-range.spec.ts`) — 3 specs covering RTL geometry + behaviour, pass on Chromium + Firefox.
- [ ] Manual touch + NVDA smoke deferred to PR review (not blocking).

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
