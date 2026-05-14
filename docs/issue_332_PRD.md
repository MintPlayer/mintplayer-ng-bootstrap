# Product Requirements Document: DateTime Picker

**Issue**: #332
**Title**: DateTime Picker
**Status**: Implemented — all 12 milestones landed on branch `issues/#332`. Foundation ports (mp-calendar / mp-time-list / mp-datepicker / mp-timepicker) + new mp-datetime-picker WC + `bs-datetime-picker` Angular wrapper + CVA on all four pickers + a11y polish + demo page + Playwright/axe specs shipped. Library builds clean; 901 unit tests pass; e2e specs await dev-server execution.
**Created**: 2026-05-14
**Last Updated**: 2026-05-14

---

## Overview

Add a combined date + time picker (`bs-datetime-picker`) to `libs/mintplayer-ng-bootstrap`. The component renders a single read-only input that displays a localized datetime, flanked in a Bootstrap input-group by two dropdown trigger buttons — a calendar icon (📅) opening a month grid, and a clock icon (🕐) opening a time list. Only one popup is open at a time. The selected value is a single `Date` (no ranges in v1).

Implementation is **Lit web component + Angular wrapper** (`mp-datetime-picker` + `bs-datetime-picker`), matching the precedent set by `dock` and `mp-scheduler`. **Same release also ports `bs-calendar`, `bs-datepicker`, and `bs-timepicker` to Lit**: each Angular component becomes a thin wrapper around its Lit counterpart, and the new `mp-datetime-picker` *composes* `mp-calendar` + `mp-time-list` internally rather than duplicating their logic. All four Angular wrappers gain `ControlValueAccessor` in the same release so the family has a consistent forms story.

After this PRD lands, the date/time family looks like:

| Lit element            | Angular wrapper       | Purpose                                              |
|------------------------|-----------------------|------------------------------------------------------|
| `mp-calendar`          | `bs-calendar`         | Month grid primitive — no overlay                    |
| `mp-time-list`         | *(internal)*          | Time-slot list primitive — no overlay                |
| `mp-datepicker`        | `bs-datepicker`       | Input + dropdown wrapping `mp-calendar`              |
| `mp-timepicker`        | `bs-timepicker`       | Input + dropdown wrapping `mp-time-list`             |
| `mp-datetime-picker`   | `bs-datetime-picker`  | Input-group + two triggers; reuses both primitives   |

Reference UI surface: SyncFusion EJ2 DateTimePicker (https://ej2.syncfusion.com/angular/documentation/datetimepicker/getting-started) — we mimic the feature menu, not the visual style. Visual style is pure Bootstrap 5 primitives (`form-control`, `input-group`, `dropdown-menu`, BS Icons).

---

## Goals & Objectives

### Primary Goals
- Ship a single-value datetime picker with an intuitive Bootstrap-styled input-group UX (input + 📅 + 🕐).
- **Consolidate the date/time family onto Lit**: port `bs-calendar`, `bs-datepicker`, `bs-timepicker` to Lit elements with thin Angular wrappers, so the new datetime picker can compose the same primitives rather than duplicating their logic.
- Preserve the existing Angular **public API surface** on the three ported components (`[(selectedDate)]`, `[(selectedTime)]`, `[(currentMonth)]`, `disableDateFn`) so consumer apps don't have to rewrite template usage.
- Land `ControlValueAccessor` on `bs-datetime-picker`, `bs-datepicker`, and `bs-timepicker` so all four wrappers (including `bs-calendar` where it makes sense) work with `[(ngModel)]` and `[formControl]` without consumer glue code.
- Full ARIA + keyboard parity on day one (no follow-up a11y pass) per the library's WC ARIA policy ([[project_wc_aria_decisions]]).

### Success Metrics
- Selecting a value via mouse, keyboard, or programmatic API round-trips through `[(value)]`, `[(ngModel)]`, and `[formControl]` without losing fidelity.
- Calendar + time-list popups pass axe-core with zero serious findings.
- Keyboard-only users can: open each popup, navigate, select, close, and tab away — without touching the mouse.
- New component adds < 12 kB gzipped to the umbrella library's tree-shakeable footprint.
- Smoke-tested on Chromium + Firefox (Firefox flex-shrink quirks documented in [[feedback_firefox_flex_shrink]]).

---

## Non-Goals / Out of Scope

- **Date range selection** — single instant only. A separate `bs-date-range-picker` is a future issue.
- **Seconds precision** — minute granularity only. `step` minutes is configurable (1/5/10/15/30/60); finer than 1 minute is out.
- **Typed editable input with mask** — v1 uses a read-only display input. Typed parsing is P2 (see below).
- **Inline / always-open variant** — v1 is dropdown-only. Inline is a future variant.
- **Time zones** — values are `Date` instants interpreted in the local browser timezone. No timezone selector.
- **Custom day-cell template** — v1 honours `disableDateFn` for blackout but does not expose per-cell rendering hooks.
- **Floating label variant** — input-group does not natively compose with floating labels; deferred.
- **Public API changes on the ported components** — the ports preserve `[(selectedDate)]` / `[(selectedTime)]` / `[(currentMonth)]` / `disableDateFn` signatures. New inputs (e.g. `firstDayOfWeek`, `hour12`) are *added*, but no existing input is removed or renamed.
- **`bs-calendar` extracted as a CVA host** — `mp-calendar` is a presentational primitive (no input field of its own), so `bs-calendar` does not implement `ControlValueAccessor`. Only `bs-datepicker` / `bs-timepicker` / `bs-datetime-picker` do.

---

## UX Specification

### Anatomy

```
┌─────────────────────────────────┬─────┬─────┐
│ 2026-05-14  09:30               │ 📅  │ 🕐  │
└─────────────────────────────────┴─────┴─────┘
   form-control (read-only)         calBtn  timeBtn
                                      │       │
                                      ▼       ▼
                            ┌──────────┐  ┌─────────┐
                            │ May 2026 │  │ 09:00   │
                            │ Mo Tu We │  │ 09:15   │
                            │  …grid…  │  │ 09:30 ✓ │
                            │ [Today]  │  │ 09:45   │
                            └──────────┘  │ [Now]   │
                                          └─────────┘
```

- **Display input**: `<input class="form-control" readonly>` shows the localized datetime via `toLocaleString` with `{ dateStyle: 'short', timeStyle: 'short' }`. Empty value → empty input + the `placeholder` attribute.
- **Calendar trigger**: `<button>` with BS Icons `bi-calendar` glyph; `[color]="colors.outlineSecondary"` from `BsButtonTypeDirective` ([[reference_button_api]]).
- **Time trigger**: `<button>` with BS Icons `bi-clock` glyph; same color treatment.
- **Optional clear button**: when a value is present and `[showClear]="true"`, a third button (`bi-x`) appears between the input and the date trigger.

### Mutual exclusion

The two dropdowns are mutually exclusive — opening the time popup while the calendar is open closes the calendar (and vice versa). Implemented as a single `openPopup: 'date' | 'time' | null` state on the WC. Click-outside / Esc closes whichever is open.

### Value flow

- Selecting a calendar day: updates the date portion, *keeps the existing time*, and **does not close** the popup if the user is in a "date-only edit" gesture (i.e. opened the calendar — they may want to also click Today). Closes on the **second** click of the same day, or on Esc. If no time has been chosen yet, the time defaults to `defaultTime` (input, default `00:00`).
- Selecting a time slot: updates the time portion, keeps the existing date, **closes** the popup. If no date has been chosen yet, the date defaults to today.
- Today button (calendar footer): selects today's date, keeps existing time (or `defaultTime`).
- Now button (time-list footer): selects the current minute (rounded down to `step`), keeps existing date.
- Clear button: sets value to `null`.

### Keyboard model

Per APG combobox + listbox patterns. Two listboxes (calendar grid, time list) hang off one combobox-ish input, but since the input is `readonly` and triggers are explicit buttons, we use **two independent dropdown buttons** instead of a true combobox — simpler and matches what the visual UX promises.

**Display input**: `Tab` moves to first trigger. (Read-only, no inline editing in v1.)

**Calendar trigger button**:
- `Enter` / `Space` / `ArrowDown` → open calendar popup, focus the currently-selected day (or today if none).
- `Esc` (when popup open) → close, return focus to trigger.

**Calendar popup** (matches existing `bs-calendar` APG keymap):
- Arrows → ±1 day / ±1 week
- `Home` / `End` → first / last day of week
- `PageUp` / `PageDown` → ±1 month
- `Ctrl+PageUp` / `Ctrl+PageDown` → ±1 year
- `Enter` / `Space` → select focused day
- `Esc` → close, focus calendar trigger

**Time trigger button**:
- `Enter` / `Space` / `ArrowDown` → open time popup, focus the currently-selected slot (or nearest to current time).
- `Esc` → close.

**Time popup**:
- `ArrowUp` / `ArrowDown` → prev / next slot
- `Home` / `End` → first / last slot
- `PageUp` / `PageDown` → ±1 hour
- `Enter` / `Space` → select focused slot, close popup, focus trigger
- `Esc` → close, focus trigger

### ARIA

Following [[project_wc_aria_decisions]]:
- Display input: `aria-readonly="true"`, `aria-describedby` pointing to the selected-value text (for screen readers that don't read readonly inputs verbatim).
- Calendar trigger: `aria-haspopup="dialog"` (the calendar grid is presented as a dialog, *not* a menu), `aria-expanded`, `aria-controls` pointing to popup id, `aria-label="Choose date"` (overridable via `[dateButtonLabel]`).
- Time trigger: same pattern, `aria-haspopup="listbox"`, `aria-label="Choose time"` (overridable via `[timeButtonLabel]`).
- Calendar popup: `role="dialog"`, `aria-modal="false"`, `aria-label="<Month Year>"`. Inner grid uses the same `role="grid"` model as the existing `bs-calendar`.
- Time popup: `role="listbox"`, `aria-label="Select time"`; each slot is `role="option"` with `aria-selected`.
- Live region: a polite `aria-live` region in the WC announces the current value on change ("May 14, 2026, 9:30 AM selected") for assistive-tech users. Uses `LiveAnnouncerController` from `@mintplayer/ng-bootstrap/web-components/a11y`.
- Demo page **must show the keymap** ([[project_wc_aria_decisions]]).

### Touch

- Triggers are sized to the BS form-control height (which is ≥38px) — meets touch-target minimums.
- Time-slot rows in the popup are ≥40px on coarse pointers (`@media (pointer: coarse)`).
- No drag gestures. Tap-only.

### RTL

- Input-group renders trigger buttons on the **inline-end** side (visual right in LTR, visual left in RTL).
- Calendar grid weekday headers reverse direction; arrow keys swap Left/Right per `getComputedStyle(host).direction` (same pattern as ribbon FR-14).

---

## Implementation Architecture

### Layered WC structure

```
mp-calendar          (primitive — month grid, no overlay)
mp-time-list         (primitive — slot list, no overlay)
   ↑          ↑
   │          │
mp-datepicker        (input + bsDropdown trigger; slots mp-calendar)
mp-timepicker        (input + bsDropdown trigger; slots mp-time-list)
   ↑          ↑
   │          │
mp-datetime-picker   (input-group + two triggers + two popups;
                      slots mp-calendar AND mp-time-list)
```

Each Lit element is paired with a thin Angular wrapper that adds `CUSTOM_ELEMENTS_SCHEMA`, signal-based inputs, outputs (via WC `CustomEvent` subscriptions), and (where applicable) `ControlValueAccessor`.

### Element + wrapper layout

```
libs/mintplayer-ng-bootstrap/calendar/
├── src/lib/
│   ├── web-components/
│   │   └── mp-calendar.element.ts            # NEW — Lit primitive
│   └── components/
│       └── calendar.component.ts             # bs-calendar (now a thin wrapper)
└── ng-package.json

libs/mintplayer-ng-bootstrap/datepicker/
├── src/lib/
│   ├── web-components/
│   │   └── mp-datepicker.element.ts          # NEW — Lit, slots mp-calendar
│   └── components/
│       └── datepicker.component.ts           # bs-datepicker (now wraps mp-datepicker)
└── ng-package.json

libs/mintplayer-ng-bootstrap/timepicker/
├── src/lib/
│   ├── web-components/
│   │   ├── mp-time-list.element.ts           # NEW — Lit primitive
│   │   └── mp-timepicker.element.ts          # NEW — Lit, slots mp-time-list
│   └── components/
│       └── timepicker.component.ts           # bs-timepicker (now wraps mp-timepicker)
└── ng-package.json

libs/mintplayer-ng-bootstrap/datetime-picker/  # NEW package
├── src/lib/
│   ├── web-components/
│   │   └── mp-datetime-picker.element.ts     # NEW — Lit, slots mp-calendar + mp-time-list
│   └── components/
│       └── datetime-picker.component.ts      # bs-datetime-picker wrapper
├── ng-package.json
└── README.md
```

Secondary entry points: `@mintplayer/ng-bootstrap/calendar`, `…/datepicker`, `…/timepicker` (existing — kept as-is), `…/datetime-picker` (new).

### Primitives: `mp-calendar` and `mp-time-list`

Both are pure presentational Lit elements with no overlay logic. They expose:

**`mp-calendar`** (preserves `bs-calendar` semantics):
- Properties: `selectedDate?: Date`, `currentMonth?: Date`, `disableDateFn?: (d: Date) => boolean`, `min?: Date`, `max?: Date`, `firstDayOfWeek?: 0..6` (new), `locale?: string` (new).
- Events: `selected-date-change`, `current-month-change`.
- Inner ARIA: `role="grid"`, `role="row"`, `role="gridcell"` per APG.
- Keyboard: same map as today's `bs-calendar` (arrows / Home / End / PageUp/Down / Ctrl+PageUp/Down / Enter / Space).

**`mp-time-list`** (extracted from today's `bs-timepicker` internals):
- Properties: `selectedTime?: Date`, `step?: 1|5|10|15|30|60` (default 15), `min?: Date`, `max?: Date`, `hour12?: boolean | 'auto'`, `locale?: string`.
- Events: `selected-time-change`.
- Inner ARIA: `role="listbox"`, options as `role="option"` with `aria-selected`.
- Keyboard: arrows / Home / End / PageUp/Down (±1h) / Enter / Space.

### Dropdown wrappers: `mp-datepicker` and `mp-timepicker`

Each is its own Lit element that renders an `<input class="form-control" readonly>` + trigger button + popup. The popup hosts the corresponding primitive via a default `<slot>` so consumers can override (advanced) or fall back to the bundled primitive (typical). Overlay logic uses the same shared `OverlayController` pattern as the ribbon — `position: fixed`, viewport-clamped, Esc-stack-aware, click-outside dismissal.

Angular wrappers (`bs-datepicker`, `bs-timepicker`) preserve the existing input surface:
- `selectedDate = model<Date>()` / `selectedTime = model<Date>()` — unchanged.
- `currentMonth = model<Date>()` — unchanged.
- `disableDateFn = input<(d: Date) => boolean | undefined>()` — unchanged.
- New: `min`, `max`, `firstDayOfWeek`, `step`, `hour12`, `locale` as `input()`s.
- New: implements `ControlValueAccessor` (additive — `[(selectedDate)]` / `[(selectedTime)]` still work).

### Top-level: `mp-datetime-picker`

A single Lit element rendering:
- The input-group shell (`<input readonly>` + optional clear button + calendar trigger + time trigger).
- Two internal popups (`position: fixed`, mutually-exclusive) — one slots `mp-calendar`, the other slots `mp-time-list`.
- Single `openPopup: 'date' | 'time' | null` state on the host.
- Value coordination: maintains an internal `{ datePart, timePart }` split so the two primitives never lose each other's half.

`bs-datetime-picker` Angular wrapper as previously specified, with `ControlValueAccessor`.

### Component API (Angular wrapper)

```ts
@Component({
  selector: 'bs-datetime-picker',
  // ...
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsDatetimePickerComponent), multi: true }],
})
export class BsDatetimePickerComponent implements ControlValueAccessor {
  // Value
  value = model<Date | null>(null);          // [(value)] two-way

  // Bounds
  min = input<Date | undefined>();
  max = input<Date | undefined>();
  disableDateFn = input<(date: Date) => boolean | undefined>();

  // Display
  placeholder = input<string>('');
  showClear = input<boolean>(false);
  hour12 = input<boolean | 'auto'>('auto');  // 'auto' = derive from locale
  locale = input<string | undefined>();      // overrides browser locale
  firstDayOfWeek = input<0 | 1 | 2 | 3 | 4 | 5 | 6>(1); // Mon default, matches existing

  // Time list shape
  step = input<1 | 5 | 10 | 15 | 30 | 60>(15);  // minutes per slot
  defaultTime = input<{ hour: number; minute: number }>({ hour: 0, minute: 0 });

  // Buttons / labels (i18n hooks)
  todayLabel = input<string>('Today');
  nowLabel = input<string>('Now');
  clearLabel = input<string>('Clear');
  dateButtonLabel = input<string>('Choose date');
  timeButtonLabel = input<string>('Choose time');

  // State
  disabled = input<boolean>(false);
  popupRole = input<'dialog' | 'menu'>('dialog');  // for the calendar popup

  // Events
  valueChange = output<Date | null>();  // mirrors model<>
  opened = output<'date' | 'time'>();
  closed = output<'date' | 'time'>();
}
```

The Lit WC (`mp-datetime-picker`) carries the same property surface as attributes/properties, and emits CustomEvents (`value-change`, `opened`, `closed`) the Angular wrapper subscribes to.

### Value semantics

- `Date | null`. `null` = unselected.
- Internally split into `dateOnly` (00:00 of selected day) + `timeOfDay` (minutes since midnight) so date and time can be edited independently without losing the other half.
- Out-of-bounds writes (less than `min`, greater than `max`) clamp to bounds. No throw.
- `disableDateFn` blackouts: cannot be selected via UI; programmatic writes are accepted but flagged via Angular's `Validators` (see CVA section).

### CVA retrofit on existing components

Same release ships `ControlValueAccessor` on:
- **`bs-datepicker`** — `writeValue` updates `selectedDate`; `registerOnChange` wires to model change emit; `registerOnTouched` fires on blur of trigger. Validator forwards `disableDateFn` to `Validators` as a returned `{ disabledDate: true }` error.
- **`bs-timepicker`** — `writeValue` updates `selectedTime`; ditto.
- **`bs-datetime-picker`** — same pattern, additionally validates against `min` / `max` (`{ min: ... }` / `{ max: ... }`).

Breaking-change note: these components were previously model-only ([[feedback_breaking_changes_ok]] — we don't preserve no-op shims). Existing `[(selectedDate)]` / `[(selectedTime)]` bindings keep working. Adding `[(ngModel)]` becomes possible alongside them. No deprecation needed since model-binding usage is unaffected.

### Dropdown / overlay

The Lit WC owns its own overlay rendering (mirrors ribbon's pattern) — `position: fixed`, anchored to the trigger via `getBoundingClientRect()`, viewport-clamped, click-outside + Esc + scroll-aware. Re-uses `OverlayController` semantics from the ribbon work.

We do **not** use `bs-dropdown` (Angular directive) inside the WC — the WC must stay framework-agnostic. The Angular wrapper does not need to compose `bs-dropdown` either; the WC's own overlay handles positioning and dismissal. Consumers who want a different dropdown shell are not the target audience.

### Conventions

- **Signal-based** inputs/outputs throughout ([[feedback_computed_signals_in_template]]).
- **No imperative iteration** — `for` / `forEach` replaced with `map` / `filter` / `flatMap` ([[feedback_no_imperative_iteration]]).
- **`bs-grid` / `[bsRow]`** if any layout needs grid — but the input-group + popup shouldn't need it ([[feedback_use_bs_grid_directives]]).
- **`BsButtonTypeDirective`** `[color]` for trigger buttons ([[reference_button_api]]).
- **`DestroyRef.destroyed`** getter for async-emit guards ([[reference_destroyref_destroyed]]).
- **Firefox flex-shrink**: trigger buttons (fixed-width icon containers) get `flex: 0 0 auto` ([[feedback_firefox_flex_shrink]]).

---

## Functional Requirements

### Foundation — Lit ports (P0, must land first)

- [ ] **FR-F1** — `mp-calendar` Lit element extracted from existing `bs-calendar`. Preserves keymap, ARIA grid model, and disable-date semantics. Adds `firstDayOfWeek`, `locale`, `min`, `max` as new inputs. Emits `selected-date-change` + `current-month-change` events.
- [ ] **FR-F2** — `bs-calendar` Angular wrapper now delegates to `mp-calendar` via `CUSTOM_ELEMENTS_SCHEMA`. Public API surface preserved: `selectedDate` model, `currentMonth` model, `disableDateFn` input. Existing tests / demos pass without changes.
- [ ] **FR-F3** — `mp-time-list` Lit element extracted from existing `bs-timepicker` slot logic. Pure presentational listbox; `step` / `min` / `max` / `hour12` / `locale` properties. Emits `selected-time-change`.
- [ ] **FR-F4** — `mp-datepicker` Lit element: input + dropdown trigger + popup hosting `mp-calendar` via `<slot>`. Reuses shared `OverlayController` for positioning + Esc-stack + click-outside.
- [ ] **FR-F5** — `bs-datepicker` Angular wrapper delegates to `mp-datepicker`. Public API surface preserved (`selectedDate`, `currentMonth`, `disableDateFn`). Adds `ControlValueAccessor` (additive).
- [ ] **FR-F6** — `mp-timepicker` Lit element: input + dropdown trigger + popup hosting `mp-time-list` via `<slot>`. Same overlay reuse as F4.
- [ ] **FR-F7** — `bs-timepicker` Angular wrapper delegates to `mp-timepicker`. Public API surface preserved (`selectedTime`, `isOpen`). Adds `ControlValueAccessor` (additive). Adds `step` / `hour12` / `locale` inputs.
- [ ] **FR-F8** — Existing demo pages for `/basic/calendar`, `/basic/datepicker`, `/basic/timepicker` continue to render and pass their existing Playwright specs after the port.
- [ ] **FR-F9** — Existing unit tests for `bs-calendar` / `bs-datepicker` / `bs-timepicker` continue to pass, ported where necessary to assert against the WC's emitted events instead of internal Angular state.

### Must Have (P0) — new datetime picker

- [ ] **FR-1** — Secondary entry point `@mintplayer/ng-bootstrap/datetime-picker` containing `mp-datetime-picker` Lit element + `bs-datetime-picker` Angular wrapper.
- [ ] **FR-2** — Input-group shell: read-only `<input class="form-control">` + calendar trigger button + time trigger button, optional clear button when `showClear` and value present.
- [ ] **FR-3** — Calendar popup: slots `mp-calendar` (from FR-F1), `Today` button rendered in the popup footer (outside the calendar primitive). Closes on Esc/outside-click; selecting a day fires `selected-date-change` from the primitive, which `mp-datetime-picker` consumes to update its `datePart`.
- [ ] **FR-4** — Time popup: slots `mp-time-list` (from FR-F3), `Now` button rendered in the popup footer. Selecting a slot closes the popup; closes on Esc/outside-click.
- [ ] **FR-5** — Mutual exclusion: opening one popup closes the other; `openPopup` state is single-valued.
- [ ] **FR-6** — Value semantics: `value: Date | null`, internal split into date + time so each can be edited independently; date selection preserves existing time; time selection preserves existing date.
- [ ] **FR-7** — Bounds: `min` / `max` clamp programmatic writes and disable out-of-range calendar days / time slots; `disableDateFn` disables specific days.
- [ ] **FR-8** — `ControlValueAccessor` on `bs-datetime-picker` — works with `[(ngModel)]`, `[formControl]`, `setDisabledState`, validators (`min` / `max` / `disabledDate`).
- [ ] **FR-9** — CVA retrofit on `bs-datepicker` and `bs-timepicker` — same release, same patterns.
- [ ] **FR-10** — Display formatting via `toLocaleString` with `{ dateStyle: 'short', timeStyle: 'short' }`; `locale` input overrides browser locale; `hour12` input overrides locale's hour cycle.
- [ ] **FR-11** — Disabled state: `[disabled]` (or form-disabled via CVA) gates triggers + clear button; popups cannot be opened.
- [ ] **FR-12** — ARIA: triggers carry `aria-haspopup` / `aria-expanded` / `aria-controls` / `aria-label`; calendar popup is `role="dialog"` with `aria-label="<Month Year>"`; time popup is `role="listbox"` with selected-state options; live region announces value changes.
- [ ] **FR-13** — Keyboard model per UX Specification — all keys handled, focus moves to popup on open, returns to trigger on close.
- [ ] **FR-14** — Touch targets ≥40px on coarse pointers via `@media (pointer: coarse)`.
- [ ] **FR-15** — RTL: input-group lays out correctly, arrow keys swap Left/Right via `getComputedStyle(host).direction`.
- [ ] **FR-16** — Demo route `/basic/datetime-picker` with usage examples, keymap legend, and `<bs-code-snippet>` code samples for: minimal usage, reactive form, min/max bounds, custom step, hour12 override, disableDateFn.
- [ ] **FR-17** — Vitest unit specs for: value semantics, mutual exclusion, CVA wiring, validator output, bounds clamping, keyboard model.
- [ ] **FR-18** — Playwright e2e spec covering: open calendar via click + keyboard, open time via click + keyboard, select date+time, clear, mutual exclusion, Esc dismissal, reactive form integration.
- [ ] **FR-19** — `ribbon.axe.spec.ts`-style axe-core a11y spec — zero serious findings on the demo page.

### Should Have (P1)

- [ ] **FR-20** — `firstDayOfWeek` input on the WC (calendar respects it; existing `bs-calendar` hard-codes Monday, so this is genuinely new).
- [ ] **FR-21** — `step` minute granularity (1/5/10/15/30/60). Default 15.
- [ ] **FR-22** — `defaultTime` input — what time to use when only a date has been selected.
- [ ] **FR-23** — i18n labels (`todayLabel`, `nowLabel`, `clearLabel`, `dateButtonLabel`, `timeButtonLabel`) — string inputs, no `@ngx-translate` dep.
- [ ] **FR-24** — Live-region announcements on value change (announces selected datetime in locale format).
- [ ] **FR-25** — `prefers-reduced-motion` honored — popup open/close animations replaced with instant show/hide.

### Could Have (P2)

- [ ] **FR-26** — `[editable]` input enabling typed editable input with parse-on-blur. Failing parse reverts to last valid value. Documented as best-effort; locale-aware parsing is hard.
- [ ] **FR-27** — Masked input mode (per-segment edit with arrow keys) — gated behind `[editable] + [mask]`. Highest-cost item; very nice when it works.
- [ ] **FR-28** — `minTime` / `maxTime` — time-of-day bounds that apply on every day (independent of full `min` / `max`).
- [ ] **FR-29** — Custom day-cell template via `<ng-template #dayCell let-date let-disabled>` for badges / holidays.
- [ ] **FR-30** — Inline (non-dropdown) display variant — `[mode]="'inline' | 'dropdown'"`.

### Will Not Have (deferred to future issues)

- Date range selection.
- Seconds precision (`step` < 1 minute).
- Time zone selector / non-local interpretation.
- Floating label variant.
- Lit port of `bs-calendar` / `bs-datepicker` / `bs-timepicker` (separate consolidation issue).

---

## Non-Functional Requirements

- **Bundle size**: < 12 kB gzipped for the secondary entry point.
- **No new third-party dependencies**: no flatpickr, no Tempus Dominus, no `date-fns`, no `dayjs`. All math via native `Date` + `Intl`.
- **Browser support**: matches library policy (latest 2 of Chrome, Firefox, Safari, Edge).
- **Smoke-tested on Firefox** — covers the flex-shrink class of regressions ([[feedback_firefox_flex_shrink]]).
- **SSR-safe** — guards against `document` / `window` access during construction. Existing demo SSR caveat ([[project_e2e_destructive_bootstrap]]) applies to Playwright specs.

---

## Risks & Trade-offs

1. **Behavioral drift during the Lit port**. Porting `bs-calendar` / `bs-datepicker` / `bs-timepicker` to Lit is a re-implementation, not a text-level migration. Risk: subtle differences in focus management, ARIA attribute timing, or change-detection cadence that existing consumer apps depend on. **Mitigation**: Playwright specs for the existing demo pages are kept as a regression gate (FR-F8); unit tests are ported to assert WC behaviour (FR-F9); the public Angular API surface stays byte-identical for `selectedDate` / `selectedTime` / `currentMonth` / `disableDateFn`. Consumer-visible breakage that cannot be avoided is documented in the release notes per [[feedback_breaking_changes_ok]] — no shims.

2. **CVA retrofit on existing date/time components**. Not strictly necessary for this PRD's scope, but bundled in to keep the family's forms story consistent — partially-CVA libraries are confusing. Risk: edge cases in existing usage that the retrofit perturbs. Mitigation: keep `[(selectedDate)]` / `[(selectedTime)]` model bindings untouched; CVA is additive.

3. **No editable input in v1**. Some users will expect to type `2026-05-14 09:30` directly. Read-only display is the simpler v1; FR-26 / FR-27 lift the restriction in a follow-up. PRD scope rule ([[feedback_prd_unified_scope]]) says multi-part *user-grouped* features ship together — editable input is genuinely a separate feature, not part of the core pick-a-datetime gesture, so deferral is principled.

4. **Two dropdowns vs one combobox**. We're treating the input-group as a passive display with two independent button-triggered popups, not a single combobox with two listboxes. This is simpler for screen readers and matches what the visual UX promises (two distinct icons = two distinct controls). The alternative — a true ARIA combobox with `aria-owns` to both listboxes — is over-engineered for v1.

5. **`hour12 = 'auto'` correctness**. `Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12` is the source of truth, and we trust it. Edge: `hourCycle: 'h24'` vs `'h23'` distinction is collapsed to 24h for the slot list (no `24:00` slot). Documented.

6. **Bootstrap 5 has no native datetime picker styling**. Confirmed by research — BS5 ships only the primitives. This means we own the calendar grid CSS, time-list CSS, and selected-state styling. No fallback to a "native BS look" exists; we ARE the native BS look.

---

## Open Questions

1. ~~**`bs-calendar` first-day-of-week**~~ — *Resolved by v2 scope expansion*. `mp-calendar` (FR-F1) takes `firstDayOfWeek` as a property; `bs-calendar` Angular wrapper exposes it. Default stays Monday for backward compatibility.

2. **Demo route — `/basic/datetime-picker` or `/advanced/datetime-picker`?** Existing `datepicker` lives under `basic`. *Recommendation: `/basic/datetime-picker` to match the family.*

3. **WC element name** — `mp-datetime-picker` (this PRD's choice, matches `mp-scheduler` / `mp-dock-manager`) vs `bs-datetime-picker` (matches the Angular selector). *Recommendation: keep `mp-` for the WC, `bs-` for the Angular wrapper — already-established convention.*

4. **`24:00` boundary** — should the last time slot in a 24-hour cycle be `23:45` or `23:59` (snap to end of day)? *Recommendation: `23:45` (last full `step` slot below 24:00). Selecting it produces a datetime at the start of the slot, not the end.*

---

## Test Strategy

- **Vitest** — value semantics, CVA round-trip, mutual exclusion, bounds clamping, validator output, keyboard model unit-level (key handlers in isolation).
- **Playwright e2e** — full demo page scenarios per FR-18; runs on Chromium + Firefox.
- **axe-core** — demo page audit per FR-19; zero serious findings.
- **Visual regression** — optional; not strictly required for v1 given the deterministic CSS, but a Chromium-only screenshot of the popup-open state is cheap.

---

## Milestones

**Foundation phase** (must land first — gates everything else):

1. **M1 — `mp-calendar` primitive** (FR-F1) + `bs-calendar` wrapper delegation (FR-F2). Existing calendar demo + tests pass.
2. **M2 — `mp-time-list` primitive** (FR-F3). No Angular wrapper at this layer (internal).
3. **M3 — `mp-datepicker` + `bs-datepicker` delegation** (FR-F4 / FR-F5) including CVA. Existing datepicker demo + tests pass.
4. **M4 — `mp-timepicker` + `bs-timepicker` delegation** (FR-F6 / FR-F7) including CVA. Existing timepicker demo + tests pass.

**New-component phase** (builds on the foundation):

5. **M5 — `mp-datetime-picker` scaffold + display input + triggers** (FR-1 / FR-2). No popups yet.
6. **M6 — Calendar popup** wires `mp-calendar` into the input-group via slot + overlay (FR-3) + date-portion of value flow.
7. **M7 — Time popup** wires `mp-time-list` (FR-4) + time-portion + mutual exclusion (FR-5).
8. **M8 — `bs-datetime-picker` Angular wrapper + CVA** (FR-8).
9. **M9 — ARIA + keyboard polish + live region** (FR-12 / FR-13 / FR-24).
10. **M10 — Demo page + code samples + keymap legend** (FR-16).
11. **M11 — Tests: Vitest + Playwright + axe** (FR-17 / FR-18 / FR-19).
12. **M12 — P1 items** (FR-20 through FR-25) — possibly folded into earlier milestones if cheap.

P2 items (FR-26 / FR-27 / FR-28 / FR-29 / FR-30) are explicitly deferred to follow-up issues unless they fall out cheaply.

**Sequencing note**: M1–M4 are independent enough to be split across multiple PRs, but the new `mp-datetime-picker` (M5+) cannot land before all four foundation milestones are merged, because it composes `mp-calendar` + `mp-time-list` directly.

---

## References

- Issue #332 — https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/332
- SyncFusion EJ2 DateTimePicker — https://ej2.syncfusion.com/angular/documentation/datetimepicker/getting-started
- Bootstrap 5.3 input-group — https://getbootstrap.com/docs/5.3/forms/input-group/
- Existing `bs-calendar`: `libs/mintplayer-ng-bootstrap/calendar/src/calendar.component.ts`
- Existing `bs-datepicker`: `libs/mintplayer-ng-bootstrap/datepicker/src/datepicker.component.ts`
- Existing `bs-timepicker`: `libs/mintplayer-ng-bootstrap/timepicker/src/timepicker.component.ts`
- WC + Angular wrapper precedent: `libs/mintplayer-ng-bootstrap/dock/`, `libs/mintplayer-ng-bootstrap/scheduler/`
- WC ARIA policy: `docs/prd/wc-aria-accessibility.md`
- APG Date Picker dialog pattern — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
- APG Listbox pattern — https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
