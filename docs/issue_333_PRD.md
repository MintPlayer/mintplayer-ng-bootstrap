# Product Requirements Document: OTP / Segmented-Code Input

**Issue**: #333
**Title**: OTP input
**Status**: Draft
**Created**: 2026-05-17
**Last Updated**: 2026-05-17

---

## Summary

A new `bs-otp-input` Angular component (backed by a Lit web component `mp-otp-input`) that renders a row of visually distinct boxes for entering a one-time password, PIN, or license key. One API covers both uniform OTP (e.g. 6 single-character boxes) and non-uniform license-key layouts (e.g. MS Office's `6-6-4-4-6-6`) via a single `groups: number[]` input. Built on a hidden-full-width-input + decorative-boxes architecture so OS-level autofill, paste, IME, and screen-reader semantics work without per-box state machines. Integrates with Angular forms via `ControlValueAccessor` with `string` value shape.

The load-bearing trade-off: **the hidden-input architecture means the visible "boxes" are not real inputs**. Users perceive 6 fields, but the platform sees one `<input>`. This is the right call because it makes SMS autofill, paste, and focus management Just Work; the cost is a small amount of CSS positioning + caret-tracking JS to render the boxes correctly.

---

## Overview

OTP / one-time-password / segmented-code inputs are a missing primitive in this library. Consumer flows that need them today either fall back to a plain `<input maxlength="6">` (no visual segmentation, ugly UX) or duplicate the component per-app.

The decision tree was walked end-to-end during planning (Step 3F of `issue_plan`); 13 questions were resolved with the developer. The PRD reflects only resolved decisions — no open questions.

---

## Goals & Objectives

### Primary Goals

- Ship a single component that handles classic OTP (numeric/alphanumeric/password), PIN entry, and license-key entry.
- Match the WC + Angular wrapper + CVA pattern set by `multi-range` so the library stays internally consistent.
- "User-friendly as possible": permissive paste handling, last-char-visible password reveal, mobile SMS autofill, Backspace-clears-then-jumps, reactive `groups`, focus delegation that works with the existing `FocusOnLoadDirective`.

### Success Metrics

- A consumer app can replace a hand-rolled OTP input with `<bs-otp-input>` and a `Validators.minLength(6)` form control, with no per-app CSS.
- iOS Safari SMS-code QuickType chip fills the boxes correctly on first attempt.
- Pasting `"Your code: 123-456 thanks"` from any focus position fills `"123456"` correctly.

---

## Chosen Design

**Design fan-out not run.** The interface follows the established WC + Angular wrapper + CVA pattern already proven by `multi-range`. The plausible second design (single Angular component, no WC split) is already rejected by repo convention (`feedback_wc_plus_angular_wrapper.md`). Alternative payload shapes (`string[]`, object envelope) were explored and rejected during grilling — captured below.

### Public API (Angular wrapper `bs-otp-input`)

```ts
@Component({
  selector: 'bs-otp-input',
  // ...
})
export class BsOtpInputComponent {
  // Layout
  readonly groups = input<number[]>([1, 1, 1, 1, 1, 1]);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  // Content
  readonly type = input<'numeric' | 'alphanumeric' | 'password'>('numeric');
  readonly case = input<'upper' | 'lower' | 'preserve'>('upper');

  // State
  readonly disabled = input(false);
  readonly label = input<string | null>(null);

  // Form binding
  readonly value = model<string | undefined>(undefined);

  // Events
  readonly valueChange = output<string>();   // every keystroke
  readonly complete = output<string>();      // fires once when value.length === sum(groups)

  // Imperative
  focus(): void;
  clear(): void;
}
```

### Usage examples

```html
<!-- Classic 6-digit OTP, reactive forms -->
<bs-otp-input [formControl]="code" (complete)="login($event)"></bs-otp-input>

<!-- 4-digit PIN -->
<bs-otp-input [groups]="[1,1,1,1]" type="password" autofocus></bs-otp-input>

<!-- MS Office product key -->
<bs-otp-input [groups]="[6,6,4,4,6,6]" type="alphanumeric" case="upper" size="lg"></bs-otp-input>
```

### Designs considered (and rejected)

- **Value shape `string[]` (array of single chars)** — rejected: forces `.join('')` on every read; can't `Validators.required` cleanly because the array is always defined.
- **Value shape `{ value, isComplete }` envelope** — rejected: `isComplete` is one line to derive at the call site (`value.length === sum(groups)`); the envelope buys nothing.
- **Separate `valueInput` + `valueChange` events (multi-range parity)** — rejected: with partials streaming on every keystroke, the two events would carry identical info. Replaced `valueInput` with a dedicated `complete` event that fires once per completion.
- **N real `<input>` elements with a per-box state machine** — rejected: leaks on Safari's `autocomplete="one-time-code"` heuristics; per-box focus chain is the entire complexity surface of every buggy OTP component in the wild.
- **`length: number` API only** — rejected after grilling because real-world license keys are non-uniform (MS Office is `6-6-4-4-6-6`). Replaced with `groups: number[]`.
- **`pattern: string` mask-style API** — rejected: reopens the separator question we resolved as out-of-scope.
- **`groupCount` + `groupSize` two-input API** — rejected: forces uniform groups, doesn't cover MS Office's layout.
- **Auto-mask password immediately (no reveal window)** — rejected: mobile users universally expect the iOS/Android "last char visible briefly" pattern.
- **Strict paste handling (reject any non-conforming paste)** — rejected: real-world SMS clipboard often contains `"Your code is 123-456"`-style noise; stripping is the user-friendly choice.
- **Dedicated `[autofocus]` input on the component** — rejected once the developer pointed out that `FocusOnLoadDirective` already provides this for any element with a working `.focus()` method.

---

## Functional Requirements

### Must Have (P0)

- [ ] **FR-1** Render a row of N visually distinct boxes where `N === groups.length` and box `i` displays `value.slice(boundary[i], boundary[i+1])`.
- [ ] **FR-2** `groups: number[]` input is reactive; runtime changes truncate or pad the value and re-render boxes. Validation: each element ∈ [1, 10], `sum(groups)` ≤ 40, array non-empty. Out-of-range values clamp + `console.warn`.
- [ ] **FR-3** `type: 'numeric' | 'alphanumeric' | 'password'` filters typed and pasted characters at entry; default `'numeric'`.
- [ ] **FR-4** `case: 'upper' | 'lower' | 'preserve'` normalizes characters at entry for `alphanumeric` and `password` types; default `'upper'`. Numeric type ignores `case`.
- [ ] **FR-5** Value shape is `string`. `valueChange` fires on *every* keystroke with the partial value (including empty string). CVA `onChange` is wired to `valueChange`.
- [ ] **FR-6** `complete` fires exactly once per completion event — when the value transitions from `length < sum(groups)` to `length === sum(groups)` *via user interaction*. Re-fires on re-completion (after clearing). Does **not** fire on programmatic `writeValue` setting a complete value.
- [ ] **FR-7** Permissive paste: strip characters that don't match `type`, normalize per `case`, truncate to `sum(groups)`, always fill starting from index 0 regardless of which box currently has focus. Single `valueChange` + `complete` (if appropriate) fires.
- [ ] **FR-8** Backspace clears the most recent character and moves caret/active-box back by one position; standard single-`<input>` semantics suffice.
- [ ] **FR-9** Render strategy: one hidden full-width `<input>` (`opacity:0`, `inset:0`) that receives focus + keystrokes + paste + autofill, plus decorative `<span>` boxes that visually display value slices. Boxes are `aria-hidden="true"`.
- [ ] **FR-10** `autocomplete="one-time-code"` on hidden input set **only** when `groups.every(g => g === 1) && type === 'numeric'`; otherwise `autocomplete="off"`.
- [ ] **FR-11** Password reveal: when `type === 'password'`, the most recently typed character is visible for ~700ms then becomes `•` (U+2022 BULLET). All earlier chars are masked immediately. On `complete` or `blur`, all chars mask immediately regardless of timer. Paste with `type === 'password'` masks all chars immediately (never reveals).
- [ ] **FR-12** Active-box highlight (`::part(box-active)`) follows the hidden input's `selectionEnd` (which box would receive the next typed char).
- [ ] **FR-13** `size: 'sm' | 'md' | 'lg'` controls box dimensions and font size; default `'md'`.
- [ ] **FR-14** Bootstrap-flavored bordered box style by default; visual gap doubled between groups (≈16px) vs within-group (≈8px); CSS parts exposed: `container`, `box`, `box-filled`, `box-active`, `box-invalid`, `group-separator`.
- [ ] **FR-15** Invalid state: when wrapped in an Angular form and the control is `invalid && touched`, all boxes apply `.is-invalid` styling (red border per Bootstrap convention).
- [ ] **FR-16** Angular wrapper exposes `focus()` method that delegates to the hidden input. Constructor also overrides `elementRef.nativeElement.focus` so `FocusOnLoadDirective` (`*[autofocus]`) works against `<bs-otp-input autofocus>` directly.
- [ ] **FR-17** Wrapper exposes `clear()` method that resets value to `""` and emits `valueChange('')`.
- [ ] **FR-18** `setDisabledState` on the CVA toggles the WC's `disabled` attribute; disabled state prevents typing and paste, applies a visually-distinct style.
- [ ] **FR-19** Demo page at `/enterprise/otp-input` covering: classic OTP (reactive forms), PIN, MS Office key, Windows key, all sizes, invalid state, autofocus.
- [ ] **FR-20** CI publish/dry-run pipelines updated to include the new package.

### Should Have (P1)

- [ ] **FR-21** `label` input sets `aria-label` on the hidden input; falls back to a default `"One-time code"` label in English if unset.
- [ ] **FR-22** RTL support inherited from ancestor `dir` (matches `multi-range` pattern); active-box highlight respects RTL.

### Out of scope for v1

The cut-off below reflects a deliberate design principle: **`bs-otp-input` is a focusable, value-bearing primitive. Consumer-specific behavior belongs in user-written directives composed onto the component**, not in additional inputs on the component itself. `FocusOnLoadDirective` + `[autofocus]` is the canonical example — the component exposes `.focus()`, the directive does the rest. Consumers needing custom input/paste processing, validation, separators, or reveal-timing write their own directive on `bs-otp-input` that listens to `valueChange` and mutates the bound model.

- Floating-label / `bs-form` integration — a consumer-written wrapper directive can compose this on top.
- Visible separator character (e.g. literal `"-"`) between groups — `::part(group-separator) ::before { content: "-" }` or a consumer directive.
- Animation on `groups` change.
- Per-character custom validation hooks (e.g. "the 3rd box must be a vowel") — use form-level validators or a directive that processes `valueChange`.
- Configurable reveal-window duration (`revealMs`) — 700ms hardcoded; if a real consumer needs different timing they write a directive that overrides the visible value, or we add the input then.
- Custom paste/input pre-processing (e.g. strip a known prefix like `"OTP: "`) — consumer directive subscribes to `paste`/`valueChange` and rewrites before re-emitting.

---

## Timeline & Milestones

### Milestone 1: WC + tests

- [ ] Scaffold `libs/mintplayer-ng-bootstrap/otp-input/` package mirroring `multi-range`.
- [ ] Implement `MintOtpInputElement` covering all FR-1 through FR-12, FR-14.
- [ ] Vitest unit tests for all 10 test scenarios from the plan doc.
- [ ] ARIA spec passes.

### Milestone 2: Angular wrapper + CVA

- [ ] `BsOtpInputComponent` with signal inputs + outputs + `focus()`/`clear()`.
- [ ] `BsOtpInputValueAccessor` directive applied via `hostDirectives`.
- [ ] Wrapper spec mirroring multi-range structure (template-driven + reactive forms + disabled).
- [ ] FR-15 (invalid state), FR-16 (focus delegation), FR-18 (disabled).

### Milestone 3: Demo + publish wiring

- [ ] Demo page with all variants.
- [ ] Route registered.
- [ ] Workflow files updated.
- [ ] Local `nx build` and `nx serve` smoke pass.

---

## Open Questions

> No escalated questions. The decision tree was resolved in-session with the developer.

---

## Technical Notes (Issue-Specific)

- **`autocomplete="one-time-code"` only works on the OTP-shaped configuration.** License-key shapes never trigger SMS autofill, which is correct: the OS has no idea what a Windows product key looks like.
- **The Angular wrapper must define `.focus` on its host DOM element** (not just expose a method on the component class). `FocusOnLoadDirective` accesses `_lContainer[0]` and calls `.focus()` on the resulting DOM element — without the constructor override, that would hit the no-op `HTMLElement.prototype.focus`.
- **Password reveal timing on paste**: when paste fills multiple boxes at once, none of them reveal — even if `type === 'password'`. The user already knows the value (they pasted it); showing it briefly is a shoulder-surf risk for no UX win.
- **Validating `groups` reactively**: clamp on every change, emit `console.warn` only when clamping actually happens (don't spam logs on valid changes).

---

## Related

- Issue #333
- Precedent: `libs/mintplayer-ng-bootstrap/multi-range/` (WC + wrapper + CVA pattern).
- Reused: `libs/mintplayer-ng-focus-on-load/` (FocusOnLoadDirective).
- See CLAUDE.md for: Lit WC conventions, Angular signal-input patterns, Bootstrap form-control styling rules, `bs-` selector convention.
