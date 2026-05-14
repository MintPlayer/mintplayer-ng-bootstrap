# Development Plan: Issue #332

**Issue**: #332
**Title**: DateTime Picker
**Type**: Feature (new component) + refactor (port three existing components to Lit)
**Priority**: Medium
**PRD**: [`docs/issue_332_PRD.md`](./issue_332_PRD.md)

## Executive Summary

Add `bs-datetime-picker` to `libs/mintplayer-ng-bootstrap` — an input-group-styled single-value datetime picker with two mutually-exclusive dropdown popups (📅 calendar + 🕐 time list). Ship as a Lit web component (`mp-datetime-picker`) with a thin Angular wrapper, matching the precedent set by `dock` and `mp-scheduler`.

**Same release also ports `bs-calendar`, `bs-datepicker`, `bs-timepicker` to Lit** so the new component composes the same `mp-calendar` + `mp-time-list` primitives rather than duplicating their logic. All four Angular wrappers gain `ControlValueAccessor` (additive — existing `[(selectedDate)]` / `[(selectedTime)]` bindings keep working).

The foundation ports (Phases 1–4) must land before the new datetime picker (Phase 5+), because the new picker composes `mp-calendar` + `mp-time-list` directly. Each foundation phase is independently shippable.

---

## Problem Statement

### Current Behavior
No combined datetime picker exists in the library. Consumers wanting "pick a date AND a time" must compose `bs-datepicker` + `bs-timepicker` side-by-side in their templates, coordinate two model bindings, and accept two visually-disconnected dropdowns. Neither component implements `ControlValueAccessor`, so reactive-form consumers wire change handlers manually.

### Expected Behavior
A new secondary entry point `@mintplayer/ng-bootstrap/datetime-picker` exports `bs-datetime-picker` (Angular) backed by `mp-datetime-picker` (Lit). One read-only `form-control` displays the combined value; one 📅 button opens a calendar popup; one 🕐 button opens a time-slot listbox; popups are mutually exclusive. The component implements `ControlValueAccessor` for native reactive-form integration.

Additionally, the three existing date/time components migrate to Lit so the family shares a single rendering primitive per concern (`mp-calendar` for grids, `mp-time-list` for slot listboxes).

### Impact
- Closes the "no native datetime picker" gap relative to other Bootstrap-styled component libraries.
- First library-wide forms-integration pass on the date/time family — unblocks reactive-form consumers.
- Establishes the Lit-primitive-extraction pattern for future composite components (e.g. a future date-range picker can reuse `mp-calendar`).

---

## Technical Analysis

### New files (high level)

```
libs/mintplayer-ng-bootstrap/calendar/
└── src/lib/web-components/
    ├── mp-calendar.element.ts        NEW
    ├── mp-calendar.element.html      NEW
    └── mp-calendar.element.scss      NEW

libs/mintplayer-ng-bootstrap/timepicker/
└── src/lib/web-components/
    ├── mp-time-list.element.ts       NEW (extracted from existing slot logic)
    ├── mp-time-list.element.html     NEW
    ├── mp-time-list.element.scss     NEW
    ├── mp-timepicker.element.ts      NEW (input + overlay + slotted mp-time-list)
    ├── mp-timepicker.element.html    NEW
    └── mp-timepicker.element.scss    NEW

libs/mintplayer-ng-bootstrap/datepicker/
└── src/lib/web-components/
    ├── mp-datepicker.element.ts      NEW (input + overlay + slotted mp-calendar)
    ├── mp-datepicker.element.html    NEW
    └── mp-datepicker.element.scss    NEW

libs/mintplayer-ng-bootstrap/datetime-picker/                          NEW PACKAGE
├── src/
│   ├── index.ts
│   └── lib/
│       ├── web-components/
│       │   ├── mp-datetime-picker.element.ts
│       │   ├── mp-datetime-picker.element.html
│       │   └── mp-datetime-picker.element.scss
│       └── components/
│           └── datetime-picker.component.ts                          (bs-datetime-picker)
├── ng-package.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── vitest.config.ts
└── README.md

apps/ng-bootstrap-demo/src/app/pages/basic/datetime-picker/           NEW
├── datetime-picker.component.ts
├── datetime-picker.component.html
└── datetime-picker.component.scss
```

Plus generated (codegen-wc): `*.element.template.ts` + `*.styles.ts` per element.

### Files to modify

- `libs/mintplayer-ng-bootstrap/calendar/src/lib/components/calendar.component.{ts,html}` — delegate rendering to `<mp-calendar>` via `CUSTOM_ELEMENTS_SCHEMA`; remove inline grid template; preserve `selectedDate` / `currentMonth` model + `disableDateFn` input surface.
- `libs/mintplayer-ng-bootstrap/datepicker/src/lib/components/datepicker.component.{ts,html}` — delegate to `<mp-datepicker>`; add `ControlValueAccessor`; preserve `selectedDate` / `currentMonth` model + `disableDateFn` input.
- `libs/mintplayer-ng-bootstrap/timepicker/src/lib/components/timepicker.component.{ts,html}` — delegate to `<mp-timepicker>`; add `ControlValueAccessor`; preserve `selectedTime` / `isOpen` model.
- `tsconfig.base.json` — add path alias `@mintplayer/ng-bootstrap/datetime-picker`.
- `libs/mintplayer-ng-bootstrap/ng-package.json` (umbrella) — register `datetime-picker` secondary entry point.
- `libs/mintplayer-ng-bootstrap/src/index.ts` — re-export the entry point.
- `apps/ng-bootstrap-demo/src/app/pages/basic/basic.routes.ts` — register `/datetime-picker` route.
- Demo sidebar / nav for basic category — add DateTimePicker link.

### Dependencies

- Lit 3 (already in monorepo).
- `OverlayController` reactive controller — reused/copied from `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/controllers/overlay-controller.ts` (or factored out to `@mintplayer/ng-bootstrap/web-components/a11y` if not already shared).
- `LiveAnnouncerController` from `@mintplayer/ng-bootstrap/web-components/a11y` — reused for value-change announcements.
- `BsIdService` (a11y) for stable `aria-controls` ids on triggers.
- Codegen tool `tools/scripts/build-web-components.mjs` — picks up new `.element.html` / `.element.scss` files automatically.
- No new npm dependencies. No `date-fns`, no `dayjs` — native `Date` + `Intl` only.

### Architecture considerations

- **Lit primitive at the bottom, dropdown wrappers in the middle, composite at the top.** `mp-calendar` and `mp-time-list` know nothing about overlays. `mp-datepicker` / `mp-timepicker` embed them via `<slot>`. `mp-datetime-picker` embeds *both* via two `<slot>`s, one per popup body.
- **Public Angular API surface frozen.** `[(selectedDate)]`, `[(selectedTime)]`, `[(currentMonth)]`, `disableDateFn` keep their exact signatures. New inputs are added (`firstDayOfWeek`, `hour12`, `locale`, `step`, `min`, `max`); none are removed. Per [[feedback_breaking_changes_ok]], we don't carry shims for hypothetical compat issues that don't exist.
- **CVA is additive.** A component implementing `ControlValueAccessor` can still be used with model binding. The change is purely "now `[(ngModel)]` and `[formControl]` also work."
- **Value semantics — internal split.** `mp-datetime-picker` stores `{ datePart: Date | null, timePart: { hour: number, minute: number } | null }` and assembles a `Date` on output. This lets either popup edit its half without losing the other.
- **Mutual exclusion is a single state value.** `openPopup: 'date' | 'time' | null` on the host. Opening the other auto-closes the current — no inter-popup messaging needed.
- **Overlay positioning.** `position: fixed`, anchored to trigger via `getBoundingClientRect()`, viewport-clamped, click-outside + Esc + scroll-aware. Same shared `OverlayController` semantics as the ribbon. We do NOT use the Angular `bsDropdown` directive inside the WC.
- **ARIA model** (per [[project_wc_aria_decisions]]):
  - Display input: `readonly`, `aria-readonly="true"`, `aria-describedby` to a visually-hidden value-text element.
  - Calendar trigger: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` to popup id, `aria-label="Choose date"`.
  - Time trigger: `aria-haspopup="listbox"`, same wiring.
  - Calendar popup: `role="dialog"`, `aria-modal="false"`, `aria-label="<Month Year>"`. Inner grid keeps `role="grid"` from `mp-calendar`.
  - Time popup: `role="listbox"`, `aria-label="Select time"`. Slots are `role="option"` with `aria-selected`.
  - Value changes announced via `LiveAnnouncerController` (polite).
  - Demo page **must show keymap** ([[project_wc_aria_decisions]]).
- **Keyboard model** (full spec in PRD):
  - Display input → `Tab` to first trigger.
  - Trigger → `Enter` / `Space` / `ArrowDown` opens popup; `Esc` closes.
  - Calendar popup → matches existing `bs-calendar` (arrows / Home / End / PageUp/Down / Ctrl+PageUp/Down / Enter / Space). Esc closes, focus to trigger.
  - Time popup → ArrowUp/Down, Home/End, PageUp/Down (±1h), Enter/Space selects + closes. Esc closes.
- **RTL.** All Left/Right key branches read `getComputedStyle(host).direction` and swap. Input-group buttons use `inset-inline-end` for positioning.
- **Touch targets** ≥40px on coarse pointers via `@media (pointer: coarse)`.

---

## Implementation Plan

### Phase 1 — Foundation: `mp-calendar` primitive

1. Create `libs/mintplayer-ng-bootstrap/calendar/src/lib/web-components/mp-calendar.element.{ts,html,scss}`.
2. Port grid-rendering logic from existing `calendar.component.ts` + `BsCalendarMonthService` to Lit. Same `role="grid"` ARIA + same keyboard map.
3. Properties: `selectedDate?`, `currentMonth?`, `disableDateFn?`, `min?`, `max?`, `firstDayOfWeek?` (default 1 = Monday), `locale?`.
4. Events: `selected-date-change`, `current-month-change` (both `bubbles + composed`).
5. Rewrite `bs-calendar` Angular component to delegate: `CUSTOM_ELEMENTS_SCHEMA`, `@ViewChild` to the WC, signal-based `input()` → property bindings, subscribe to WC events to emit `model.set(...)`.
6. Vitest specs: grid generation, disable-date callback wiring, keyboard navigation contracts, event emission shape.
7. Regression gate: existing `/basic/calendar` demo loads identically; existing Playwright spec passes.

**Exit criteria**: `bs-calendar` renders + behaves identically from the consumer's perspective. The internal rendering is now a WC.

### Phase 2 — Foundation: `mp-time-list` primitive

1. Create `libs/mintplayer-ng-bootstrap/timepicker/src/lib/web-components/mp-time-list.element.{ts,html,scss}`.
2. Extract slot-list rendering from existing `timepicker.component.ts` to a standalone Lit element. No Angular wrapper at this layer (internal-only).
3. Properties: `selectedTime?`, `step?` (default 15), `min?`, `max?`, `hour12?` (default `'auto'`), `locale?`.
4. Inner ARIA: `role="listbox"`, options `role="option"` with `aria-selected`.
5. Keyboard: ArrowUp/Down (prev/next), Home/End, PageUp/Down (±1h), Enter/Space (selects + dispatches event).
6. Event: `selected-time-change`.
7. Vitest: slot generation (per step), hour12 derivation from locale, keyboard contracts, min/max clamping.

**Exit criteria**: `mp-time-list` is independently usable as a primitive; renders a slot listbox; emits selection events.

### Phase 3 — Foundation: `mp-datepicker` + `bs-datepicker` delegation

1. Create `libs/mintplayer-ng-bootstrap/datepicker/src/lib/web-components/mp-datepicker.element.{ts,html,scss}`.
2. Render: `<input readonly class="form-control">` + trigger button (📅 BS Icon) + popup container; popup default-slots an `<mp-calendar>` so consumers can override.
3. Integrate shared `OverlayController` for popup positioning + Esc-stack + click-outside.
4. Properties forward to `mp-calendar`: `selectedDate`, `currentMonth`, `disableDateFn`, `min`, `max`, `firstDayOfWeek`, `locale`.
5. Display formatting: `selectedDate.toLocaleDateString(locale, { dateStyle: 'short' })`.
6. Rewrite `bs-datepicker` Angular component to delegate to `<mp-datepicker>`. Public API: `selectedDate`, `currentMonth`, `disableDateFn` unchanged. Add `ControlValueAccessor`:
   - `writeValue(value: Date | null)` → set `selectedDate` model.
   - `registerOnChange(fn)` → call fn on `selected-date-change`.
   - `registerOnTouched(fn)` → call fn on trigger blur.
   - `setDisabledState(disabled)` → forward to WC.
   - Validator: `min` / `max` / `disabledDate` → `{ min: ..., max: ..., disabledDate: true }`.
7. Vitest: CVA round-trip via `FormControl`, validator outputs, disabled propagation, model + CVA coexistence.
8. Regression gate: existing `/basic/datepicker` demo + Playwright spec pass unchanged.

**Exit criteria**: `bs-datepicker` works with `[(selectedDate)]` AND `[(ngModel)]` AND `[formControl]`.

### Phase 4 — Foundation: `mp-timepicker` + `bs-timepicker` delegation

1. Create `libs/mintplayer-ng-bootstrap/timepicker/src/lib/web-components/mp-timepicker.element.{ts,html,scss}` (sibling to `mp-time-list.element.ts` from Phase 2).
2. Render: `<input readonly class="form-control">` + trigger button (🕐 BS Icon) + popup with default-slotted `<mp-time-list>`.
3. Reuse same `OverlayController` as Phase 3.
4. Properties forward to `mp-time-list`: `selectedTime`, `step`, `min`, `max`, `hour12`, `locale`.
5. Rewrite `bs-timepicker` Angular component to delegate. Public API: `selectedTime`, `isOpen` unchanged. Add `ControlValueAccessor` (same pattern as Phase 3).
6. New Angular inputs: `step`, `hour12`, `locale`.
7. Vitest: CVA round-trip, step changes, hour12 toggling.
8. Regression gate: existing `/basic/timepicker` demo + Playwright spec pass unchanged.

**Exit criteria**: `bs-timepicker` works with both model and CVA bindings; existing consumers see no breakage.

### Phase 5 — `mp-datetime-picker` scaffold

1. Create package `libs/mintplayer-ng-bootstrap/datetime-picker/` with `ng-package.json`, `tsconfig.lib.json`, `vitest.config.ts`, `src/index.ts`.
2. Add path alias `@mintplayer/ng-bootstrap/datetime-picker` in `tsconfig.base.json`.
3. Register secondary entry point in umbrella `ng-package.json`.
4. Implement `mp-datetime-picker.element.{ts,html,scss}` shell:
   - Input-group layout: `<input readonly class="form-control">` + (optional) clear button + calendar trigger + time trigger.
   - State: `value: Date | null`, internal `datePart`, `timePart`; `openPopup: 'date' | 'time' | null` (always `null` in this phase — no popups yet).
   - `showClear`, `placeholder`, `disabled` properties.
   - Disabled state: gates all triggers + clear.
5. Vitest: scaffold renders, triggers fire (event-only — no popup yet), disabled wiring.

**Exit criteria**: WC renders, triggers click and emit `request-open-date` / `request-open-time` events (no-op listeners), value flow can be driven by setting `value` directly.

### Phase 6 — Datetime popups

1. Implement two `<slot>` regions in `mp-datetime-picker` template: `slot="date-popup"` default-filled with `<mp-calendar>`; `slot="time-popup"` default-filled with `<mp-time-list>`.
2. Wire `OverlayController` to manage both popups; on trigger click set `openPopup`, position popup; on outside-click/Esc set `openPopup = null`.
3. Mutual exclusion: setting `openPopup = 'date'` while `'time'` is open closes time first.
4. Footers in each popup:
   - Calendar popup footer: `Today` button (uses `BsButtonTypeDirective` color shape inside the WC styled to match).
   - Time popup footer: `Now` button.
5. Value flow:
   - `selected-date-change` from `mp-calendar` → update `datePart`; if `timePart === null` apply `defaultTime`. Do NOT close popup on first click; close on Esc or second-click of same day.
   - `selected-time-change` from `mp-time-list` → update `timePart`; if `datePart === null` apply today. Close popup.
   - `Today` button → set `datePart` to today, preserve `timePart` (or `defaultTime`).
   - `Now` button → set `timePart` to rounded-down current minute, preserve `datePart` (or today).
   - Clear button → `value = null`.
6. Mouse + keyboard open/close for both popups; focus returns to trigger on close.
7. Vitest specs for: mutual exclusion, value preservation across edits, Today/Now/Clear behavior, defaultTime fallback.

**Exit criteria**: WC is fully interactive end-to-end. Both popups work, value round-trips, mutual exclusion verified.

### Phase 7 — `bs-datetime-picker` Angular wrapper + CVA

1. Create `datetime-picker.component.{ts,html,scss}` in the new package.
2. Signal-based inputs/outputs per PRD `Component API` section.
3. `ControlValueAccessor` implementation:
   - `writeValue(v: Date | null)` → set WC `value` property.
   - `registerOnChange` → fire on WC `value-change` event.
   - `registerOnTouched` → fire on input blur (when popup closes without selection, or focus leaves the input-group).
   - `setDisabledState(d)` → forward to WC `disabled`.
   - Built-in validator: returns `{ min: ... } | { max: ... } | { disabledDate: true }` from `disableDateFn`.
4. Wrapper exposes `opened` / `closed` outputs by mapping WC `opened` / `closed` CustomEvents.
5. Vitest: CVA round-trip with `FormControl`, validator output, `setDisabledState`, model + CVA coexistence.

**Exit criteria**: `bs-datetime-picker` works in reactive forms, template-driven forms (`[(ngModel)]`), and direct `[(value)]` model binding.

### Phase 8 — Accessibility polish

1. ARIA wiring per Architecture above:
   - Triggers: `aria-haspopup` (`'dialog'` for date, `'listbox'` for time), `aria-expanded`, `aria-controls` pointing to popup id via `BsIdService`.
   - Popups: `role="dialog"` / `role="listbox"` with `aria-label` (Month Year / "Select time").
   - Display input: `aria-readonly`, `aria-describedby` to a `.visually-hidden` value-text element.
2. `LiveAnnouncerController` integration:
   - Announce value changes ("May 14, 2026, 9:30 AM selected") in user's locale.
   - First-render announcements suppressed (only on actual changes).
3. Touch targets: ≥40px height on coarse pointers via `@media (pointer: coarse)` CSS.
4. RTL: every Left/Right keyboard branch checks `getComputedStyle(host).direction === 'rtl'` and swaps. Input-group uses `inset-inline-end` for trigger positioning.
5. `prefers-reduced-motion`: popup open/close transitions disabled via `@media (prefers-reduced-motion: reduce)`.
6. Firefox flex-shrink: trigger buttons get `flex: 0 0 auto` ([[feedback_firefox_flex_shrink]]).
7. ARIA spec file `mp-datetime-picker.aria.spec.ts` asserting all roles, attributes, and live-region wiring.

**Exit criteria**: All ARIA assertions pass; manual keyboard-only smoke confirms full operability; RTL demo route renders correctly.

### Phase 9 — Demo page

1. Create `apps/ng-bootstrap-demo/src/app/pages/basic/datetime-picker/datetime-picker.component.{ts,html,scss}`.
2. Demo content:
   - Minimal usage example.
   - Reactive form example (`[formControl]`).
   - `min` / `max` bounds example.
   - `disableDateFn` (weekends-disabled) example.
   - Custom `step` (5-min, 30-min) examples.
   - `hour12` toggle.
   - RTL toggle.
   - Locale switcher (en-US, nl-BE, ja-JP).
3. Keymap legend (`<bs-code-snippet>` block listing all keys).
4. Six `<bs-code-snippet>` code samples covering the above patterns.
5. Register route in `basic.routes.ts`; add sidebar link.

**Exit criteria**: Demo route loads, all examples interactive, keymap legend visible.

### Phase 10 — Tests

1. Vitest specs across the new files (referenced in earlier phases — consolidated here as a gate).
2. Playwright `datetime-picker.spec.ts`:
   - Open calendar via click + keyboard.
   - Open time via click + keyboard.
   - Select date+time + assert combined value.
   - Mutual exclusion (open time while date open → date closes).
   - Esc dismissal from both popups.
   - Today / Now / Clear buttons.
   - Reactive-form integration (`[formControl].value` after selection).
   - Min/max clamping.
   - RTL demo route layout sanity.
3. Playwright runs on Chromium + Firefox.
4. `datetime-picker.axe.spec.ts` runs `@axe-core/playwright` on demo page — zero serious/critical findings.

**Exit criteria**: All test suites green on CI for Chromium + Firefox; axe-core reports clean.

### Phase 11 — P1 items (defaults & polish)

Most P1 items fall out of earlier phases (`firstDayOfWeek` lands in Phase 1; `step` lands in Phase 2; `hour12` / `locale` land in Phases 2–4). What remains:

1. `defaultTime` input on `mp-datetime-picker` + Angular wrapper (used when only a date has been chosen).
2. i18n label inputs (`todayLabel`, `nowLabel`, `clearLabel`, `dateButtonLabel`, `timeButtonLabel`) — string inputs, no `@ngx-translate` dep.
3. Confirm `prefers-reduced-motion` honored end-to-end (defensive sweep).
4. Confirm live-region announcements fire on every value change (Phase 8 work — gate here).

**Exit criteria**: PRD FR-20 through FR-25 all checked.

### Phase 12 — Plumbing + smoke

1. Verify codegen-wc target picks up new `.element.html` / `.element.scss` files across all four packages.
2. Confirm secondary entry point in umbrella `ng-package.json` is correct; `npm run build` produces the expected FESM2022 output for `@mintplayer/ng-bootstrap/datetime-picker`.
3. Run `npm test` (full suite) — no regressions in any package.
4. Run `npm start` smoke test in Chromium + Firefox manually:
   - Each of `/basic/calendar`, `/basic/datepicker`, `/basic/timepicker`, `/basic/datetime-picker` loads and the picker is interactive.
   - Form-integration example on the datetime page round-trips through `FormControl`.
   - Firefox-specific check: trigger buttons don't collapse in the input-group ([[feedback_firefox_flex_shrink]]).

**Exit criteria**: Build green, all tests pass, manual smoke clean in both browsers.

---

## Test Scenarios

### Scenario 1: Calendar primitive port — zero behavioral drift
- **Given**: existing `bs-calendar` demo + Playwright spec from before this work.
- **When**: Phase 1 ships and the demo is reloaded.
- **Then**: every existing assertion in the Playwright spec passes unchanged; keyboard navigation produces identical outcomes.

### Scenario 2: Datepicker CVA round-trip
- **Given**: `<bs-datepicker [formControl]="ctl">` in a reactive form, `ctl = new FormControl<Date | null>(null)`.
- **When**: user selects May 14, 2026 via the popup.
- **Then**: `ctl.value` equals `new Date(2026, 4, 14)`; `ctl.dirty` is `true`; `ctl.valueChanges` emitted once.

### Scenario 3: Datetime picker — value semantics preserve halves
- **Given**: `bs-datetime-picker` with `value = new Date(2026, 4, 14, 9, 30)`.
- **When**: user opens the calendar popup and clicks May 15.
- **Then**: `value` becomes `new Date(2026, 4, 15, 9, 30)` — time portion unchanged.

### Scenario 4: Datetime picker — mutual exclusion
- **Given**: calendar popup is open.
- **When**: user clicks the time trigger.
- **Then**: calendar popup closes; time popup opens; `openPopup === 'time'`; `aria-expanded` is `false` on the date trigger, `true` on the time trigger.

### Scenario 5: Datetime picker — defaultTime fallback
- **Given**: `bs-datetime-picker` with `value = null`, `defaultTime = { hour: 8, minute: 0 }`.
- **When**: user picks a date (May 14, 2026) before picking a time.
- **Then**: `value` becomes `new Date(2026, 4, 14, 8, 0)`.

### Scenario 6: Datetime picker — Now button
- **Given**: `bs-datetime-picker` with `value = null`, current time = 09:37:42, `step = 15`.
- **When**: user opens the time popup and clicks `Now`.
- **Then**: `value` is `new Date(today, 9, 30)` (rounded down to the previous 15-min slot, date = today).

### Scenario 7: Datetime picker — keyboard open + select
- **Given**: focus on the calendar trigger.
- **When**: user presses `ArrowDown` (opens popup, focus to currently-selected day or today) → `ArrowRight` (focus + 1 day) → `Enter`.
- **Then**: popup closed; date portion of `value` updated; focus returned to calendar trigger; `aria-expanded` flipped to `false`.

### Scenario 8: Datetime picker — validator output
- **Given**: `<bs-datetime-picker [formControl]="ctl" [min]="floor" [max]="ceil">` where `floor = new Date(2026, 0, 1)` and `ceil = new Date(2026, 11, 31)`.
- **When**: programmatic `ctl.setValue(new Date(2025, 11, 31))`.
- **Then**: `ctl.errors` contains `{ min: { min: floor, actual: ... } }`; `ctl.invalid === true`.

### Scenario 9: Datetime picker — disabled state via form
- **Given**: `<bs-datetime-picker [formControl]="ctl">`, `ctl.enable()`.
- **When**: code calls `ctl.disable()`.
- **Then**: all triggers gain `disabled` attribute; clicking them does nothing; popups cannot be opened.

### Scenario 10: Live-region announces value changes
- **Given**: ARIA live region is in the DOM.
- **When**: user selects a date and a time.
- **Then**: live region content becomes the localized datetime string (e.g. "May 14, 2026, 9:30 AM selected") — observable via `MutationObserver` in the test.

### Scenario 11: RTL — arrow direction swaps
- **Given**: demo `Direction` picker set to `rtl`; focus inside calendar popup on May 14.
- **When**: user presses `ArrowLeft` once.
- **Then**: focus moves to May 15 (next day in RTL visual order), not May 13.

### Scenario 12: Reduced motion — no popup transitions
- **Given**: browser with `prefers-reduced-motion: reduce`.
- **When**: user opens the calendar popup.
- **Then**: popup is visible immediately (no opacity/transform transition); test asserts `getComputedStyle(popup).transitionDuration === '0s'`.

---

## Acceptance Criteria

- [ ] `@mintplayer/ng-bootstrap/datetime-picker` entry point builds via `npm run build` with no warnings.
- [ ] `bs-calendar`, `bs-datepicker`, `bs-timepicker` now delegate to Lit elements while preserving their existing public Angular API surface (`selectedDate` / `selectedTime` / `currentMonth` / `disableDateFn` work identically).
- [ ] `bs-datetime-picker`, `bs-datepicker`, `bs-timepicker` all implement `ControlValueAccessor` and work with `[(ngModel)]` + `[formControl]`.
- [ ] `bs-datetime-picker` provides built-in `min` / `max` / `disabledDate` validators that surface through `FormControl.errors`.
- [ ] Input-group UX matches the PRD layout: read-only input + optional clear + 📅 + 🕐, both triggers styled via `BsButtonTypeDirective` `[color]`.
- [ ] Both popups are mutually exclusive (`openPopup` state).
- [ ] Value semantics preserve date + time halves independently across consecutive edits.
- [ ] Keyboard model fully implemented per PRD: arrows / Home / End / PageUp/Down / Ctrl+PageUp/Down / Enter / Space / Esc on both popups; ArrowDown on triggers opens popups; focus returns to trigger on close.
- [ ] ARIA: `role="dialog"` on calendar popup, `role="listbox"` on time popup, `aria-haspopup` / `aria-expanded` / `aria-controls` on both triggers; `aria-readonly` on display input.
- [ ] `LiveAnnouncerController` announces value changes via polite live region.
- [ ] Touch targets ≥40px on coarse pointers.
- [ ] RTL layout + arrow-key direction swap verified.
- [ ] `prefers-reduced-motion` honored — no popup transitions.
- [ ] Demo route `/basic/datetime-picker` registered, exposes all P0 features with keymap legend + six code snippets.
- [ ] Vitest, Playwright (Chromium + Firefox), and axe-core CI gates all green.
- [ ] Bundle size for the new package < 12 kB gzipped.
- [ ] Manual smoke confirms `/basic/calendar`, `/basic/datepicker`, `/basic/timepicker`, `/basic/datetime-picker` all interactive in Chromium + Firefox after the foundation ports.

---

## Risks & Mitigations

1. **Behavioral drift during the Lit port** — see PRD Risks §1. Mitigation: existing Playwright specs + ported unit tests as regression gates (FR-F8 / FR-F9). Exit each foundation phase only when the existing demo passes unchanged.

2. **OverlayController re-use vs. duplication** — if the ribbon's `OverlayController` is tightly coupled to ribbon types, lifting it into a shared `@mintplayer/ng-bootstrap/web-components/a11y` module may be a side-quest. Mitigation: investigate during Phase 3; if extraction is more than ~half a day, copy-paste and file a follow-up consolidation issue.

3. **Codegen-wc behavior on new packages** — the datetime-picker package is the first new package added in a while; codegen may need a target tweak in `libs/mintplayer-ng-bootstrap/project.json`. Mitigation: verify at the start of Phase 5; budget half a day for plumbing if needed.

4. **CVA + model coexistence corner cases** — setting `value` via `writeValue` should NOT re-emit `selected-date-change` (would loop). Mitigation: WC distinguishes "external write" vs. "user action" via an internal `suppressNextEmit` flag set during `writeValue`. Verified in vitest Scenario 2.

5. **Locale-driven hour12 inconsistencies** — `Intl.DateTimeFormat.resolvedOptions().hour12` can return `undefined` in some locales; we treat `undefined` as `true` for en-US-like locales, `false` otherwise. Mitigation: explicit `hour12={true|false}` override always wins. Documented.

6. **Firefox flex-shrink on trigger buttons** — known class of regressions ([[feedback_firefox_flex_shrink]]). Mitigation: `flex: 0 0 auto` on every fixed-width trigger; Firefox manual smoke in Phase 12.

---

## Rollout & Release Notes

This is a single PR series; each foundation phase (1–4) is independently mergeable behind no feature flag (the API surface stays stable). The new component (Phase 5+) is gated by the foundation phases landing first.

Release notes should mention:
- **New**: `bs-datetime-picker` — single-value datetime picker with input-group UX and dual mutually-exclusive popups.
- **New**: `firstDayOfWeek`, `hour12`, `locale`, `step`, `min`, `max` inputs on the date/time family.
- **New**: `ControlValueAccessor` on `bs-datepicker`, `bs-timepicker`, `bs-datetime-picker` — they now work natively with reactive forms and `[(ngModel)]`. Existing `[(selectedDate)]` / `[(selectedTime)]` model bindings are unchanged.
- **Internal**: `bs-calendar`, `bs-datepicker`, `bs-timepicker` re-implemented on Lit web components for consistency with the rest of the library. Public Angular API surface unchanged; rendering internals changed.

No deprecations, no removals, no required consumer code changes.

---

## References

- PRD: [`docs/issue_332_PRD.md`](./issue_332_PRD.md)
- Issue #332 — https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/332
- Existing `bs-calendar`: `libs/mintplayer-ng-bootstrap/calendar/src/calendar.component.ts`
- Existing `bs-datepicker`: `libs/mintplayer-ng-bootstrap/datepicker/src/datepicker.component.ts`
- Existing `bs-timepicker`: `libs/mintplayer-ng-bootstrap/timepicker/src/timepicker.component.ts`
- WC + Angular wrapper precedent: `libs/mintplayer-ng-bootstrap/dock/`, `libs/mintplayer-ng-bootstrap/scheduler/`, `libs/mintplayer-ng-bootstrap/ribbon/`
- Overlay controller precedent: `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/controllers/overlay-controller.ts`
- WC ARIA policy: `docs/prd/wc-aria-accessibility.md`
- APG Date Picker dialog pattern — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
- APG Listbox pattern — https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
