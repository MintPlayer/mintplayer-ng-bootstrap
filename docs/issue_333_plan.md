# Development Plan: Issue #333

**Issue**: #333
**Title**: OTP input
**Type**: Feature (new component)
**Priority**: Medium

## Executive Summary

Add a Bootstrap-flavored OTP / segmented-code input component. The same component covers two flows with one API: classic numeric one-time-passwords (6-digit MFA) and segmented license-key entry (e.g. MS Office's `6-6-4-4-6-6` layout). Ships as a Lit web component (`mp-otp-input`) with an Angular wrapper (`bs-otp-input`) and a `ControlValueAccessor`, matching the established `multi-range` precedent. Architecture is *one hidden full-width `<input>` + decorative box divs* — not N real inputs — so OS-level autofill (`autocomplete="one-time-code"`), paste handling, and IME work without per-box state machines.

---

## Problem Statement

### Current Behavior

No OTP-shaped input exists. Consumers wanting an OTP field today either fall back to a plain `<input maxlength="6">` (no per-digit visual segmentation, no SMS autofill semantics beyond the native attribute, ugly UX) or roll their own component per app.

### Expected Behavior

A single `bs-otp-input` that:

- Renders N visually distinct boxes grouped by a `groups: number[]` API. `[1,1,1,1,1,1]` (default) = classic 6-digit OTP; `[6,6,4,4,6,6]` = MS Office license key.
- Accepts numeric / alphanumeric / password content per `type` input.
- Supports SMS auto-fill via `autocomplete="one-time-code"` automatically (only when `groups.every(g === 1) && type === 'numeric'` — the OTP case).
- Permissive paste: strips non-matching characters, fills from box 0, ignores overflow.
- Backspace clears the current character then jumps to the previous box.
- Integrates with Angular forms via CVA; value shape is `string` (full concatenated code).
- Fires `valueChange` on every keystroke (partial values stream), `complete` once when `value.length === sum(groups)`.

### Impact

Unblocks MFA / 2FA / license-key entry flows in Angular apps built on this lib without per-app component duplication. Sets the precedent for future input-shaped WCs that need `.focus()` delegation.

---

## Technical Analysis

### Files to Create

- `libs/mintplayer-ng-bootstrap/otp-input/` — new library package (mirror `multi-range/` structure).
  - `index.ts`, `ng-package.js`, `package.json` (mirroring `multi-range`).
  - `src/index.ts`.
  - `src/lib/web-components/mint-otp-input.element.ts` — Lit WC `MintOtpInputElement`, registers `mp-otp-input`.
  - `src/lib/web-components/mint-otp-input.element.template.ts` — extracted Lit `css` styles (mirrors `mint-multi-range.element.template.ts`).
  - `src/lib/web-components/mint-otp-input.element.spec.ts` — Vitest unit tests for input/paste/backspace/complete/group-aware behavior.
  - `src/lib/web-components/mint-otp-input.aria.spec.ts` — ARIA contract tests (hidden input has all ARIA; boxes `aria-hidden="true"`).
  - `src/lib/components/otp-input.component.ts` — Angular wrapper `BsOtpInputComponent`, selector `bs-otp-input`.
  - `src/lib/components/otp-input.component.spec.ts` — wrapper integration tests (CVA, template-driven, reactive forms).
  - `src/lib/value-accessor/otp-input-value-accessor.ts` — `BsOtpInputValueAccessor` directive applied via `hostDirectives`.
  - `src/lib/types/otp-input-type.ts` — string-literal union for `type`.
  - `src/lib/types/otp-input-case.ts` — string-literal union for `case`.
  - `src/lib/types/otp-input-size.ts` — string-literal union for `size`.

### Files to Modify

- `apps/ng-bootstrap-demo/src/app/pages/enterprise/enterprise.routes.ts` — register `otp-input` route.
- `apps/ng-bootstrap-demo/src/app/pages/enterprise/otp-input/otp-input.component.ts|html` — new demo page with classic OTP, license-key, all `type` variants, all `size` variants, invalid state, autofocus, reactive vs template-driven examples.
- `apps/ng-bootstrap-demo/src/app/app.component.html` — add navigation link if other enterprise demos are listed there.
- `.github/workflows/publish-master.yml` and `.github/workflows/pull-request.yml` — add `mintplayer-ng-bootstrap-otp-input` to publish/dry-run matrix.

### Dependencies

- `lit` (already used by other WCs in the repo).
- `@angular/forms` (for CVA).
- Existing `FocusOnLoadDirective` at `libs/mintplayer-ng-focus-on-load/` — reused via `[autofocus]` once `bs-otp-input` exposes a working `.focus()` on its host element.

### Architecture Considerations

**Single hidden `<input>` + decorative boxes.** The WC's render output is roughly:

```html
<div class="container" part="container">
  <input class="hidden-input" autocomplete="one-time-code" inputmode="numeric"
         aria-label="One-time code">
  <div class="boxes" aria-hidden="true">
    <span class="box" part="box">1</span>
    <span class="box" part="box">2</span>
    <span class="box box-active" part="box box-active"></span>
    ...
  </div>
</div>
```

- Hidden input is `position: absolute; inset: 0; opacity: 0; color: transparent;` — actually focusable, receives keystrokes, paste, autofill. Caret position drives which decorative box gets `box-active`.
- Decorative boxes render the value sliced according to `groups`: box `i` shows `value.slice(boundaries[i], boundaries[i+1])` where `boundaries` is the cumulative-sum of `groups`.
- Focus delegation: the WC overrides its own `focus()` to delegate to the hidden input. The Angular wrapper does the same on its host DOM element so `FocusOnLoadDirective` works against `<bs-otp-input>` directly.

**ARIA**: the hidden input carries `role="textbox"` (implicit), `aria-label` (from `[label]` input), `aria-invalid` (from form state), `aria-describedby` (passthrough). All decorative DOM is `aria-hidden="true"` — screen readers see one text input.

**Password masking**: per-character timer. State per index in `value`: `revealedUntil: number[]` (epoch ms). On keystroke at index `i`, set `revealedUntil[i] = performance.now() + 700`. Render: if `type === 'password' && performance.now() < revealedUntil[i]`, show char else show `•`. A single `setTimeout(700)` triggers a re-render to mask after the window. On `complete` or `blur`, clear all `revealedUntil` and re-render.

**Paste handling**: bind to `paste` on the hidden input. `preventDefault()`, read `clipboardData.getData('text')`, filter to allowed chars per `type`, uppercase/lowercase per `case`, truncate to `sum(groups)`, set `value`, advance caret to end-of-filled-content. Always fills from index 0 — focus position is ignored (a real-world Safari gotcha).

**Backspace**: on `keydown` with `key === 'Backspace'`, if caret is at index N > 0 and the char at N-1 is non-empty, splice it out. The hidden input's natural backspace handles this; we don't need to override unless the user's caret position is at index 0 (no-op).

**Auto-advance**: the hidden input handles this natively because the value is one long string. The visual "advance to next box" is purely a re-render of which decorative box has the active class, driven by the input's `selectionEnd`.

**Group boundaries in value**: the canonical `value` is a *flat* string with no separator. `groups` only affects rendering and visual gap. Paste of `"6688AAAACCC123"` (12 chars) into `groups: [6, 6]` → `value = "6688AAAACCC123".slice(0, 12)` → box 0 shows first 6, box 1 shows next 6. Box 1 fills only when box 0 is "full" because the value is contiguous.

**Focus delegation pattern** (reusable):

```ts
// In BsOtpInputComponent constructor:
constructor() {
  const host = inject(ElementRef).nativeElement as HTMLElement;
  Object.defineProperty(host, 'focus', {
    value: () => this.elementRef()?.nativeElement.focus(),
    configurable: true,
  });
}
```

This lets `FocusOnLoadDirective` (`*[autofocus]`) call `.focus()` on `<bs-otp-input>` and have it land in the hidden input.

---

## Implementation Plan

### Phase 1: Web component (no Angular)

1. Scaffold `libs/mintplayer-ng-bootstrap/otp-input/` mirroring `multi-range/` (package.json, ng-package.js, src dirs, project.json registration).
2. Implement `MintOtpInputElement` (Lit) with `groups`, `type`, `case`, `size`, `disabled`, `label` properties, `value` getter/setter, `value-change` and `complete` events.
3. Render hidden input + decorative boxes with cumulative-boundary slicing.
4. Wire input filter (allowed chars per `type`), case normalization, paste handler, caret-driven active-box highlight.
5. Implement password-mask timer state.
6. Override `focus()` to delegate to hidden input.
7. Set `autocomplete="one-time-code"` only when `groups.every(g => g === 1) && type === 'numeric'`.
8. Register `mp-otp-input` custom element.
9. Vitest unit tests covering all decisions from grilling (paste filter, paste-from-any-focus, complete semantics, password reveal window, group boundary math, length validation/clamp).
10. ARIA spec: hidden input has `role=textbox`, `aria-label`, `aria-invalid`; decorative boxes `aria-hidden=true`.

### Phase 2: Angular wrapper

1. `BsOtpInputComponent` with signal inputs (`groups`, `type`, `case`, `size`, `disabled`, `label`, `value` model). `CUSTOM_ELEMENTS_SCHEMA`, `OnPush`.
2. Template renders `<mp-otp-input #el>` with attribute bindings.
3. Subscribe to `value-change` and `complete` via host listeners, expose as `valueChange` / `complete` outputs.
4. Effects: forward `value` model writes to WC; forward `disabled` to WC `disabled` attr.
5. Override `elementRef.nativeElement.focus` in constructor to delegate to WC (enables `FocusOnLoadDirective`).
6. Public methods: `focus()` and `clear()`.
7. `BsOtpInputValueAccessor` directive (`hostDirectives`) implementing `ControlValueAccessor`. `writeValue` does not fire `complete`. `setDisabledState` toggles WC attr.
8. Wrapper spec mirroring multi-range's: basic render, template-driven `[(ngModel)]`, reactive `formControl`, `setDisabledState`, `touched` on `value-change`.

### Phase 3: Demo + docs

1. Create `apps/ng-bootstrap-demo/src/app/pages/enterprise/otp-input/otp-input.component.{ts,html,scss}`.
2. Sections in the demo:
   - Classic 6-digit OTP with reactive forms + completion toast.
   - 4-digit PIN (`groups: [1,1,1,1]`, `type: password`).
   - MS Office key (`groups: [6,6,4,4,6,6]`, `type: alphanumeric`).
   - Windows product key (`groups: [5,5,5,5,5]`, `type: alphanumeric`).
   - Size variants (`sm`/`md`/`lg`).
   - Invalid state via `Validators.required` + `Validators.minLength(sum)`.
   - `[autofocus]` example.
3. Register route in `enterprise.routes.ts`.
4. Add nav entry to demo home/landing if convention exists.

### Phase 4: CI / publish

1. Add `mintplayer-ng-bootstrap-otp-input` package to `.github/workflows/publish-master.yml` (publish step) and `.github/workflows/pull-request.yml` (dry-run step), mirroring the entries for other component packages.
2. Verify `nx build mintplayer-ng-bootstrap-otp-input` succeeds locally.

---

## Test Scenarios

### Scenario 1: Classic 6-digit OTP typed digit-by-digit

- **Given**: `<bs-otp-input [(value)]="code">` with default `groups: [1,1,1,1,1,1]`, `type: numeric`.
- **When**: user types `1`, `2`, `3`, `4`, `5`, `6`.
- **Then**: `valueChange` fires 6 times with `"1"`, `"12"`, ..., `"123456"`. `complete` fires once at the last keystroke with `"123456"`. Boxes show one digit each.

### Scenario 2: Paste with separator-junk into OTP

- **Given**: same setup.
- **When**: user pastes `"Your code: 123-456 thanks"` while focus is on the third box.
- **Then**: paste is stripped to `"123456"`, fills boxes 0–5 (ignoring focus position), `valueChange` fires once with `"123456"`, `complete` fires once.

### Scenario 3: License key with non-uniform groups

- **Given**: `<bs-otp-input [groups]="[6,6,4,4,6,6]" type="alphanumeric" case="upper">`.
- **When**: user pastes `"abc123-def456-7890-asdf-zxcvbn-qwerty"`.
- **Then**: paste is filtered to alphanumeric uppercase `"ABC123DEF4567890ASDFZXCVBNQWERTY"`, truncated to 32 chars (sum of groups), boxes fill respecting the group boundaries visually. `complete` fires with the 32-char value.

### Scenario 4: Backspace clears current then jumps

- **Given**: classic OTP with value `"123"`, caret after box 2.
- **When**: user presses Backspace.
- **Then**: value becomes `"12"`, box 2 empties, caret moves to box 2 (about to overwrite). Press Backspace again: value `"1"`, caret moves to box 1.

### Scenario 5: Password mask reveal window

- **Given**: `[type]="'password'"`, current value `""`.
- **When**: user types `1`.
- **Then**: box 0 shows `1` for 700ms then `•`. User types `2`: box 1 shows `2` briefly, box 0 already shows `•`. On `complete` or `blur`, all boxes show `•` immediately.

### Scenario 6: Mobile SMS autofill

- **Given**: classic numeric OTP rendered on iOS Safari with an active SMS code.
- **When**: user taps the input; QuickType chip appears; user taps it.
- **Then**: hidden input receives the full `"123456"` via a single `input` event; boxes render filled; `complete` fires.

### Scenario 7: Reactive forms invalid state

- **Given**: `FormControl('', [Validators.required, Validators.minLength(6)])` bound to `bs-otp-input`.
- **When**: user types `"123"` then blurs.
- **Then**: control is `invalid`, `touched`. Component renders boxes with `.is-invalid` border. Setting `groups` to `[1,1,1,1]` updates validation expectations (consumer adjusts `Validators.minLength` themselves).

### Scenario 8: Autofocus via directive

- **Given**: `<bs-otp-input autofocus>` placed on a page.
- **When**: page mounts.
- **Then**: hidden input has focus, first box has `box-active` styling, keyboard input works immediately.

### Scenario 9: Reactive `groups` change

- **Given**: component with `groups: [1,1,1,1,1,1]` and value `"123456"`.
- **When**: consumer changes input to `groups: [1,1,1,1]`.
- **Then**: value truncates to `"1234"`, `valueChange` fires, boxes re-render to 4. `complete` fires because new value length matches new sum.

### Scenario 10: Length clamping

- **Given**: `<bs-otp-input [groups]="[15]">`.
- **When**: component initializes.
- **Then**: `console.warn` is emitted, `groups` clamps to `[10]` (per-element max), behavior continues with the clamped value.

---

## Acceptance Criteria

- [ ] `bs-otp-input` renders with default `groups: [1,1,1,1,1,1]`, looks like a 6-box Bootstrap-styled input row.
- [ ] All 13 grilled decisions are implemented as specified in the PRD.
- [ ] Hidden-input architecture: only one `<input>` element, decorative boxes are `aria-hidden`, hidden input has `autocomplete="one-time-code"` exactly when `groups.every(g => g === 1) && type === 'numeric'`.
- [ ] CVA contract: `string` value, `valueChange` streams partials, `complete` fires once when `value.length === sum(groups)`.
- [ ] `FocusOnLoadDirective` works against `<bs-otp-input autofocus>` (i.e. host element's `.focus()` delegates).
- [ ] All test scenarios pass.
- [ ] Demo page exists at `/enterprise/otp-input` with all variants.
- [ ] Lib builds: `npx nx build mintplayer-ng-bootstrap-otp-input` succeeds.
- [ ] Demo builds and runs: `npx nx serve ng-bootstrap-demo` shows the new page.
- [ ] No regressions in existing component specs (`npx nx run-many -t test --projects=tag:component`).

---

## Build & Test Commands

```bash
# Build the new lib
npx nx build mintplayer-ng-bootstrap-otp-input

# Test the new lib
npx nx test mintplayer-ng-bootstrap-otp-input

# Serve the demo and visit /enterprise/otp-input
npx nx serve ng-bootstrap-demo

# Full check before PR
npx nx run-many -t build
npx nx run-many -t test
```

---

## Related Files

- `libs/mintplayer-ng-bootstrap/multi-range/` — closest precedent for WC + wrapper + CVA.
- `libs/mintplayer-ng-focus-on-load/src/lib/directives/focus-on-load/focus-on-load.directive.ts` — reused for `[autofocus]`.
- `apps/ng-bootstrap-demo/src/app/pages/enterprise/enterprise.routes.ts` — demo route registration.
- `docs/issue_333_PRD.md` — this issue's PRD with full decision rationale.
