# Product Requirements Document: OTP / Segmented-Code Input

**Issue**: #333
**Title**: OTP input
**Status**: Complete
**Created**: 2026-05-17
**Last Updated**: 2026-05-17

---

## Summary

Shipped a `bs-otp-input` Angular component backed by a `mp-otp-input` Lit web component, sharing the WC + Angular wrapper + `ControlValueAccessor` triangulation already used by `bs-multi-range`. One API (`groups: number[]`) covers classic 6-digit OTP (`[1,1,1,1,1,1]`, the default), 4-digit PIN, and non-uniform license keys (e.g. MS Office's `[6,6,4,4,6,6]`). 54 new tests pass — 35 WC unit + 7 ARIA + 12 wrapper integration.

**Load-bearing decisions, as built:**
- **One hidden full-width `<input autocomplete="one-time-code">` + decorative boxes**, not N real inputs. SMS autofill / paste / IME / screen readers route through the platform without per-box state machines. *Rejected*: N `<input>` array with focus-chain JS — leaks on Safari's autofill heuristics.
- **Value shape is `string`, streams partials**, with `valueChange` on every keystroke and `complete` once on the incomplete→complete transition via user interaction. *Rejected*: `string[]` (forces `.join('')` at every read) and `valueInput`+`valueChange` parity with multi-range (would carry identical info given partials stream).
- **`groups: number[]` with the array element = one visual box** (chars per box). *Rejected*: `length: number` (breaks for MS Office's non-uniform layout), `groupCount`+`groupSize` (same uniformity limit), `pattern: string` (reopens the separator question we scoped out).
- **Focus delegation via `Object.defineProperty(host, 'focus', …)` in the wrapper constructor** so the existing `FocusOnLoadDirective` (`*[autofocus]`) Just Works. *Rejected*: dedicated `[autofocus]` input on the component — duplicates an existing primitive.
- **Active-box highlight only while focused** (added in the post-review fix pass). Without focus tracking, every unfocused instance lit up its next-to-fill box, which made side-by-side demos look like every input was competing for input.

**Traps documented for a future reader:**
- Setting `target.value = normalised` in the input handler collapses the caret to the end. For non-uniform license keys (`[6,6,4,4,6,6]`), mid-string editing puts the user back at the end of the value, not the box they clicked. Acceptable per the hidden-input architecture; surfacing this would mean tracking `selectionStart` before mutation, which fights password masking.
- `complete` fires on user-interaction transitions only — programmatic `writeValue` with a complete string deliberately suppresses it. Auto-submit-on-complete with `effect()` over the model would re-fire on form rehydrate, so consumers should subscribe to the `(complete)` output, not derive completion from `value().length`.
- The `value-change` event is *not* `stopPropagation`'d; the CVA on the wrapper host depends on it bubbling. The `complete` event *is* stopped because the wrapper's Output named `complete` collides with the DOM event name and Angular's `(complete)` binding catches both channels.

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

- [x] **FR-1** Render a row of N visually distinct boxes where `N === groups.length` and box `i` displays `value.slice(boundary[i], boundary[i+1])`.
- [x] **FR-2** `groups: number[]` input is reactive; runtime changes truncate or pad the value and re-render boxes. Validation: each element ∈ [1, 10], `sum(groups)` ≤ 40, array non-empty. Out-of-range values clamp + `console.warn`.
- [x] **FR-3** `type: 'numeric' | 'alphanumeric' | 'password'` filters typed and pasted characters at entry; default `'numeric'`.
- [x] **FR-4** `case: 'upper' | 'lower' | 'preserve'` normalizes characters at entry for `alphanumeric` and `password` types; default `'upper'`. Numeric type ignores `case`.
- [x] **FR-5** Value shape is `string`. `valueChange` fires on *every* keystroke with the partial value (including empty string). CVA `onChange` is wired to `valueChange`.
- [x] **FR-6** `complete` fires exactly once per completion event — when the value transitions from `length < sum(groups)` to `length === sum(groups)` *via user interaction*. Re-fires on re-completion (after clearing). Does **not** fire on programmatic `writeValue` setting a complete value.
- [x] **FR-7** Permissive paste: strip characters that don't match `type`, normalize per `case`, truncate to `sum(groups)`, always fill starting from index 0 regardless of which box currently has focus. Single `valueChange` + `complete` (if appropriate) fires.
- [x] **FR-8** Backspace clears the most recent character and moves caret/active-box back by one position; standard single-`<input>` semantics suffice.
- [x] **FR-9** Render strategy: one hidden full-width `<input>` (`opacity:0`, `inset:0`) that receives focus + keystrokes + paste + autofill, plus decorative `<span>` boxes that visually display value slices. Boxes are `aria-hidden="true"`.
- [x] **FR-10** `autocomplete="one-time-code"` on hidden input set **only** when `groups.every(g => g === 1) && type === 'numeric'`; otherwise `autocomplete="off"`.
- [x] **FR-11** Password reveal: when `type === 'password'`, the most recently typed character is visible for ~700ms then becomes `•` (U+2022 BULLET). All earlier chars are masked immediately. On `complete` or `blur`, all chars mask immediately regardless of timer. Paste with `type === 'password'` masks all chars immediately (never reveals).
- [x] **FR-12** Active-box highlight (`::part(box-active)`) follows the hidden input's `selectionEnd` (which box would receive the next typed char).
- [x] **FR-13** `size: 'sm' | 'md' | 'lg'` controls box dimensions and font size; default `'md'`.
- [x] **FR-14** Bootstrap-flavored bordered box style by default. CSS parts exposed: `container`, `box`, `box-filled`, `box-active`, `box-invalid`. *Note*: the `group-separator` part was dropped during implementation — the architecture lands as one box per `groups` element (no within-group sub-boxes), so a per-group separator is moot. A consumer wanting a visible separator can `::part(box) ~ ::part(box) { content: "-" }` or wrap the host with their own directive.
- [x] **FR-15** Invalid state: when wrapped in an Angular form and the control is `invalid && touched`, all boxes apply `.is-invalid` styling (red border per Bootstrap convention).
- [x] **FR-16** Angular wrapper exposes `focus()` method that delegates to the hidden input. Constructor also overrides `elementRef.nativeElement.focus` so `FocusOnLoadDirective` (`*[autofocus]`) works against `<bs-otp-input autofocus>` directly.
- [x] **FR-17** Wrapper exposes `clear()` method that resets value to `""` and emits `valueChange('')`.
- [x] **FR-18** `setDisabledState` on the CVA toggles the WC's `disabled` attribute; disabled state prevents typing and paste, applies a visually-distinct style.
- [x] **FR-19** Demo page at `/enterprise/otp-input` covering: classic OTP (reactive forms), PIN, MS Office key, Windows key, all sizes, invalid state, autofocus.
- [x] **FR-20** ~~CI publish/dry-run pipelines updated to include the new package.~~ *Superseded by discovery during implementation*: the umbrella `@mintplayer/ng-bootstrap` workflow publishes a single npm package; secondary entries like `otp-input/` are auto-discovered by ng-packagr via the `ng-package.js` file. No `.github/workflows/` change is required; building the umbrella package with `nx build mintplayer-ng-bootstrap` produces the `dist/libs/mintplayer-ng-bootstrap/otp-input/` subpath, and `@mintplayer/ng-bootstrap/otp-input` resolves correctly post-install.

### Should Have (P1)

- [x] **FR-21** `label` input sets `aria-label` on the hidden input; falls back to a default `"One-time code"` label in English if unset.
- [x] **FR-22** RTL support inherited from ancestor `dir` (matches `multi-range` pattern); active-box highlight respects RTL. *As built*: the container uses `display: inline-flex` with `gap` and no explicit `flex-direction`, so under an `<html dir="rtl">` or `:dir(rtl)` ancestor, boxes flow right-to-left automatically via flex's native direction handling. The active-box index is computed from `selectionEnd` (a numeric position into the value string, direction-agnostic) and maps to the correct visual box. No CSS overrides were required.

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

- [x] Scaffold `libs/mintplayer-ng-bootstrap/otp-input/` package mirroring `multi-range`.
- [x] Implement `MintOtpInputElement` covering all FR-1 through FR-12, FR-14.
- [x] Vitest unit tests for all 10 test scenarios from the plan doc.
- [x] ARIA spec passes.

### Milestone 2: Angular wrapper + CVA

- [x] `BsOtpInputComponent` with signal inputs + outputs + `focus()`/`clear()`.
- [x] `BsOtpInputValueAccessor` directive applied via `hostDirectives`.
- [x] Wrapper spec mirroring multi-range structure (template-driven + reactive forms + disabled).
- [x] FR-15 (invalid state), FR-16 (focus delegation), FR-18 (disabled).

### Milestone 3: Demo + publish wiring

- [x] Demo page with all variants.
- [x] Route registered.
- [x] ~~Workflow files updated.~~ Superseded — secondary entries auto-discovered by ng-packagr.
- [x] Local `nx build` and `nx serve` smoke pass.

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
