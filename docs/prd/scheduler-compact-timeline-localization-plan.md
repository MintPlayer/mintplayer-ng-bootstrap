# Plan — Scheduler: compact timeline column, sticky day labels, real localization, a11y

PRD: [scheduler-compact-timeline-localization.md](./scheduler-compact-timeline-localization.md)
Status: **Implemented** on `feat/scheduler-compact-timeline-i18n`, base `master` @ `a66f4439`.
Twelve commits, one per milestone. Final sweep: **1599 unit tests**, all four library builds
and the Angular demo build clean, `tsconfig.lib.json` + `tsconfig.spec.json` both clean.
Not pushed, no PR opened. Milestone status below; deviations and open items in PRD §15.

| Milestone | State |
|---|---|
| S — spikes | done (PRD §14); throwaway files kept under `docs/prd/_spike-scheduler-*` |
| M0 — touch drag regression | done — **device verification still required**, CI cannot see the gesture |
| M1 — locale defaults | done |
| M1b — Sunday-start | done, incl. `mp-calendar`'s week-number defect |
| M2 — WCAG contrast helper | done |
| M3 — narrow add bar | done |
| M4 — sticky day label | done |
| M5 — row panel | done |
| M6 — demo language switch | done (Angular only; React/Vue open) |
| M7 — both keyboard paths | done, plus audit M12 |
| M8 — a11y blockers | A-B1 and A-B3 done; **A-B2 mitigated, not structurally fixed** (PRD §15) |
| M9 — audit majors | the cheap ones done (M5, M7, M8-audit); M2/M3/M4/M6/M9/M10/M11 open |
| M10 — spec coverage | done for everything shipped |
| M11 — batched sweep | done |
| M12 — scroll survives a rebuild (R10) | done — reproduced and re-verified in Chromium (PRD §16) |

**A note for whoever picks this up:** `tsc -p libs/mintplayer-web-components/tsconfig.json`
checks NOTHING — it is a solution-style config with empty `files`/`include`. Use
`tsconfig.lib.json` and `tsconfig.spec.json` directly. Several errors on this branch reached
the test run because of that.

**All four PRD §11 questions are decided** (2026-08-02): both keyboard paths, all three
locale defaults browser-derived, all three a11y blockers in this PR, panel unconditional.
Nothing is gated except **M1's `firstDayOfWeek` step**, which waits on the §12 Sunday-start
audit.

Commit granularity is deliberately free — the PR is squashed, so commit per milestone (or
more often) to keep the work reviewable and revertable.

## Conventions (these still bite)

- After any `.styles.scss` edit: `npx nx run mintplayer-web-components:codegen-wc`. The
  generated `.styles.ts` is a gitignored build artifact — **never stage it**.
- Message-table changes live in **`scheduler-core`**, a different entrypoint from
  `scheduler`; the views import `resolveMessages`/`formatMessage` from there.
- Views build DOM **imperatively and rebuild every node on state change**. Anything holding
  focus must be restored by stable key, and an overlay anchor must be resolved *lazily by
  id*, never captured.
- New strings → `options.messages`; new colours/sizes → `--scheduler-*` custom properties;
  new z-index rungs → the `$z-*` ladder.
- **Batch the suites.** Verify by reading + type-check; one sweep at the end (M11). Commit
  per milestone — commits are free, pushes are billed.
- Nx is flaky here: `NX_ISOLATE_PLUGINS=false NX_DAEMON=false`, vitest `--pool=threads`.
- Specs that assign `input.value` or call `.click()` programmatically are DOM-poking, not
  user simulation — they fire no `input` and no `mousedown`. That hid two real defects in
  phase 2. Dispatch real events.

## Ordering rationale

**M0 first** — it is a live regression (touch users cannot drag events at all), it is small,
and it depends on nothing. Everything else here is an improvement; M0 is a repair.
**M1 next** — the locale defaults are the most user-visible defect and touch no layout.
**M1b gates M1's B3 step only**, so the rest of M1 lands immediately and the Sunday-start work
proceeds in parallel. **M2 before M5** (the colour helper is a dependency of the trigger).
**M8's A-B3 alongside M5**, since its focus-restoration work is the same machinery D8 needs
and doing it twice is waste. **M7 after M5**, because both keyboard paths need the trigger to
exist first.

---

## S — Spikes (throwaway, before M0/M4/M5)

Three questions cannot be settled by reading code, and each can invalidate a design decision.
Following the `docs/prd/_spike-navbar-*` precedent these are **throwaway** minimal
reproductions, not component work — they answer browser-behaviour questions, so the standing
"verify WCs through the wrappers and demo apps" rule does not apply. Delete them once the
findings are recorded here.

**Spike A — `_spike-scheduler-sticky-overlay.html`** (answers S1 + S2; they share one scroller)

- **S1 (M4, R6)** — reproduce the real nesting: `.scheduler-content` (`overflow: auto`) >
  sticky head (`top: 0`) > flex row > sticky corner cell (`left: 0`) + a 2400px day header
  containing a label at `position: sticky; inset-inline-start:
  var(--scheduler-resource-column-width)`. Verify the label stays visible while scrolling
  horizontally, **stops at the day boundary** rather than running into the next day, and
  passes *under* the corner cell rather than over it. Sticky-inside-sticky on two different
  axes is the specific unknown.
- **S2 (M5, D2/D3)** — the highest design risk in this PR. Place a trigger inside the sticky
  row-header cell and a `position: fixed` panel at the root; position it from the trigger's
  `getBoundingClientRect()`. Verify it tracks during **horizontal** scroll (the case the day
  popover never exercises — its anchor is a static month cell), during vertical scroll, and
  that flip works near the viewport edge. **If a fixed panel cannot track a sticky anchor,
  D2/D3 need rethinking before M5 starts.**

**Spike B — `_spike-scheduler-contextmenu.html`** (answers S3, gates M0)

- Log the constructor and fields of the `contextmenu` event from a **mouse right-click** in
  each engine available: is it a `PointerEvent` with `pointerType`, or a bare `MouseEvent`?
  This decides whether the fast path in M0 is usable or whether tracked last-pointer-type is
  the only discriminator.
- Drive a synthesised **touch long-press** (CDP `Input.dispatchTouchEvent`, the same technique
  the dock PRD used to disprove its first design) and record the **full event order** —
  `touchstart` → … → `contextmenu` → `touchcancel`/`pointercancel`? — plus the timestamp of
  `contextmenu` relative to touch start. That settles **B5**: whether the 600 ms hold timer can
  still fire under an open editor, or whether the browser cancels the sequence first.
- Note upfront: Playwright's own `touchscreen` API may not synthesise a browser-internal
  long-press. If CDP cannot produce a real `contextmenu` from touch, **say so and leave B5 to
  M0's device-verification step** rather than inventing a result. A spike that reports "could
  not measure" is a successful spike.

Findings are recorded in PRD §14 and fold back into M0/M4/M5.

## M0 — Restore touch drag [R9, PRD §13, D17] — **do this first**

A live regression from #396: touch users cannot drag events at all. Independent of every
other milestone, small, and the only item here that fixes something users have today.

- [ ] **Scope `handleContextMenu` to non-touch input.** `mp-scheduler.ts:996-1010` inspects
      only the target. Return early for touch/pen, **after** `preventDefault()` so the native
      menu cannot appear mid-hold either.
      **Do not rely on `PointerEvent.pointerType` alone** — `contextmenu` is a `PointerEvent`
      in Chromium but a plain `MouseEvent` in Firefox and Safari. Track the last observed
      pointer type (or ask the `InputHandler`, which already owns `touchHoldTimer` /
      `isTouchDragMode` / `touchHoldTarget`) and use `pointerType` only as a fast path.
      `preventDefault()` on `contextmenu` is fine — the standing repo rule forbids it on touch
      `pointerdown`, which is a different event and a different failure.
- [ ] **Suppress on touch for the WHOLE gesture surface, not just events — with one
      exception.** The hold timer is armed for **every** touch target, not only events:
      `input-handler.ts:316-322` sets it unconditionally (the sole fast path above it is a
      resize handle on an already-selected event, `:303-310`). So a long-press on an empty
      grid slot also arms drag-to-create — and because today's handler returns early for
      non-event targets **without** `preventDefault` (`mp-scheduler.ts:1002`), Android shows
      its native menu *while* our drag arms underneath it. That is a second, pre-existing
      touch defect the same fix cures.
      **Exception — text-entry controls.** Blanket suppression would kill long-press-to-paste
      in the editor's title field. Leave the event completely alone (no `preventDefault`, no
      early return) when the target is inside an `<input>`, `<textarea>` or
      `[contenteditable]`. Today's handler comment already promises "the panel's own inputs
      stay untouched" (`mp-scheduler.ts:1006-1007`) — keep that promise on touch too.
- [ ] **Complete the CSS suppression set** on `.scheduler-event:not(.preview)` /
      `.scheduler-timeline-event:not(.preview)` (`scheduler.styles.scss:331-335`, currently
      `touch-action: none` only): add `user-select: none; -webkit-user-select: none;
      -webkit-touch-callout: none;` — the exact recipe `.dock-tab` uses to run the same 600 ms
      long-press successfully (`mint-dock-manager.element.scss:327-332`). Without it iOS can
      raise the selection magnifier during the hold. Then `codegen-wc`.
- [ ] **B5 — cancel any pending hold in the editor-open teardown.** `contextmenu` currently
      opens the editor without clearing `touchHoldTimer`, so the 600 ms timer can expire ~100 ms
      later and enter touch-drag mode *under* an open editor. Scoping the handler removes the
      trigger; cancel explicitly anyway rather than depending on the browser's `touchcancel`.
- [ ] **Verify the existing mobile route to the editor still works.** `registerEventActivation`
      (`mp-scheduler.ts:2018-2032`) is a synthetic 500 ms double-tap wired into the touch tap
      path (`:2177-2181`) — **double-tap already opens the editor on a phone.** No new gesture
      is needed; confirm it survives the change.
- [ ] **Add the haptic the dock already has.** `navigator.vibrate(10)` when the hold arms,
      guarded exactly as the dock guards it (`mint-dock-manager.element.ts:2294-2296`) — a
      no-op on desktop and where the API is absent. The scheduler has visual hold feedback
      only (`.touch-hold-pending`/`.touch-hold-active`, `scheduler.styles.scss:1418-1442`).
      Cheap, and it is what tells the user the 600 ms wait ended in *their* gesture winning.
- [ ] Spec it **at the level a spec can actually reach** (spike S3, PRD §14.3): the browser's
      long-press gesture is **not reproducible from CDP**, so no automated test can guard the
      gesture itself — only the handler's decision. Three unit cases, all verified to
      round-trip:
      `PointerEvent('contextmenu', {pointerType:'touch'})` → must be ignored;
      `{pointerType:'mouse'}` → must open the editor;
      bare `MouseEvent('contextmenu')` (`pointerType` **absent** — the Firefox/WebKit shape)
      → must fall through to the tracked last-pointer-type.
      Plus: a 600 ms hold still enters drag mode, and a long-press inside the editor's title
      input leaves the native menu alone. Use the dock's spec helper
      (`mint-dock-manager.element.spec.ts:39-47`) and `vi.useFakeTimers()` for the 600 ms wait.
- [ ] **Treat `pointerType` as an optimisation, never the sole signal.** S3 confirmed Chromium
      delivers `contextmenu` as a `PointerEvent` with `pointerType: "mouse"`, but Firefox and
      WebKit were not measurable here. The tracked value is the contract; `pointerType` is the
      fast path.
- [ ] **Device-verify on real hardware** (Android Chrome + iOS Safari) — now *required*, not
      belt-and-braces, because S3 proved CI cannot see this gesture at all. This is also the
      only way to settle **B5** (does `contextmenu` precede `touchcancel`). The dock's PRD
      reached its own conclusion only after a real-touch trace disproved the design it had
      specced ("Rejected after measurement").

The ⋯-on-a-selected-event affordance (PRD D17.3) is **not** in this milestone — it depends on
M5's panel work and lands there, so M0 stays a pure, cherry-pickable regression fix.

## M1 — Locale-derived defaults [R7, PRD B1–B4, D9–D14]

- [ ] `scheduler-core/src/models/options.ts:178-185` — `locale`, `timeFormat`,
      `firstDayOfWeek` → `undefined`; widen types to optional.
- [ ] `date.service.ts:247, 254, 261, 268` — `locale: string = 'en-US'` → `locale?: string`
      on `formatDate`, `formatDateWithWeekday`, `getMonthName`, `getDayName`. Passing
      `undefined` through is the whole fix; **do not** substitute `navigator.language`.
- [ ] **B1** — rewrite `formatTime` (`date.service.ts:231-242`) on `Intl.DateTimeFormat`,
      add a `locale` parameter, and **memoize** the formatter in a `Map` keyed by
      `locale|format`. Update all **13** production call sites: `week-view.ts:88,352`,
      `day-view.ts:71,261`, `timeline-view.ts:166`,
      `base-view.ts:28-29,89,108-109,132-133,153-154`, `mp-scheduler.ts:1274,1313,3155-3156`,
      `date.service.ts:175`.
- [ ] **B2** — route `timeFormat` through the dead-but-correct `detectTimeFormat`
      (`date.service.ts:217-226`) when the option is `undefined`.
- [ ] **B3 — gated on M1b.** `firstDayOfWeek` via `Intl.Locale(locale).getWeekInfo()`.
      **Firefox does not ship it**; feature-detect, handle the getter-vs-method split across
      engines, `try/catch`, fall back to `1`. **Normalise the value space first**:
      `getWeekInfo().firstDay` uses Sunday = **7**, `Date.getDay()` uses Sunday = **0**.
      Do not land this step until M1b's audit list is closed, or the scheduler will derive a
      Sunday start it cannot render correctly.
- [ ] **B4/D14** — delete `weekNumbers` + `weekText` (`options.ts:105,107,206,207`). Both are
      declared and never read; `weekText: 'W'` is an untranslatable literal. Confirm zero
      readers before deleting.
- [ ] **D13** — `Intl.DateTimeFormat.prototype.formatRange()` for the week/timeline title
      (`mp-scheduler.ts:1685-1692`); normalise the hyphen-vs-en-dash split between
      `week-view.ts:352`/`day-view.ts:261` and `base-view.ts:31`.
- [ ] Type-check. No spec run yet.

## M1b — Sunday-start compatibility [PRD §12] — **audited 2026-08-02**

**Prerequisite for M1's B3 step.** The arithmetic is safe; the breakage is in the
type/validation layer, in *where* the derivation runs, and in one live defect in `mp-calendar`.
Verified findings:

**Already safe — no work needed** (evidence in PRD §12):

- `getWeekStart` (`date.service.ts:11-18`) is correct for **every** input 0-6 *and* for `7`:
  the `(day < firstDayOfWeek ? 7 : 0)` clamp happens to handle the out-of-range value.
  Verified across the full 4 × 7 matrix.
- **No weekday-header desync** — the classic failure mode does not exist here. All three
  views derive their headers from the actual first week of the generated data, not a fixed
  sequence: `month-view.ts:27-33` and `year-view.ts:81-88` both iterate `weeks[0]` from
  `getMonthWeeks(date, options.firstDayOfWeek)`; `week-view.ts:61-62` iterates the days from
  `getWeekDays`. Headers follow the week start automatically.
- **No weekend detection anywhere** — zero hits for `isWeekend` / `getDay() === 0|6` in the
  scheduler. Nothing to break. The two `nth-child` rules
  (`scheduler.styles.scss:274, 523`) are "every 2nd time slot" (striping) and "last column"
  (border removal) — both position-based by intent, correct at any week start.
- **Month grid row count already varies today.** `getMonthWeeks` returns **4, 5 or 6** rows
  under the current Monday default depending on the month, and the CSS uses
  `grid-auto-rows` (`scheduler.styles.scss:517`), not a fixed count. Sunday-start changes
  *which* months get which count (15 of 48 months over 2024-2027) but introduces no new
  behaviour. The `weeks.length >= 4` early exit is correct: a 28-day February starting on the
  week's first day genuinely is 4 rows.
- **The embedded pickers tolerate it.** `mp-calendar` uses proper modular arithmetic
  (`(day - firstDayOfWeek + 7) % 7`, `mp-calendar.element.ts:146, 152, 175, 312, 317`), which
  is correct for 0-6 and also for 7.

**Actually needs doing — in this order:**

- [ ] **1. Fix the attribute guard.** `mp-scheduler.ts:312-321` —
      `if (day >= 0 && day <= 6)` **silently discards** anything else, including the `7` the
      derivation will produce. **Nothing downstream works until this changes.** Normalise
      (`day % 7`) rather than widening the range, per the next item.
- [ ] **2. Normalise at the derivation site; do NOT widen `DayOfWeek`.**
      `scheduler-core/src/models/types.ts:19` is shared by `firstDayOfWeek` (`options.ts:45`)
      **and** `BusinessHours.daysOfWeek` (`options.ts:11-12`, documented `getDay()` domain,
      "0 = Sunday"). Widening to `0..7` admits a meaningless `7` into `businessHours`.
      Keep the public API at 0-6 and convert `Intl`'s 1-7 output with `% 7` in one place.
      This leaves `date.service.ts`, `mp-calendar`, the three Angular wrappers
      (`calendar.component.ts:31`, `datepicker.component.ts:49`,
      `datetime-picker.component.ts:55`) and the existing `firstDayOfWeek = 0` calendar specs
      untouched.
- [ ] **3. Derive from the resolved locale, not `DEFAULT_OPTIONS.locale`.** That constant is
      the hardcoded `'en-US'` (`options.ts:178`), so a naive `derive(options.locale)` gives
      **every user Sunday**, Europe included. Run it at state creation
      (`scheduler-state.ts:222-225`) against `locale || navigator.language`, mirroring
      `detectTimeFormat` (`date.service.ts:218`). D9 makes the default `undefined`, which
      `Intl.Locale` rejects — so the fallback is required, not defensive.
- [ ] **4. Fix `mp-calendar`'s week-number column.** `weekOfYear`
      (`mp-calendar.element.ts:162-167`) is ISO-only, feeds `week.number` (`:136`) and renders
      as `<th scope="row" role="rowheader">` (`:389`). Under a Sunday start January 2026
      renders **"week 1" on two consecutive rows**, then off-by-one — reproduced. Visible
      inside the scheduler's own editor via `mp-scheduler.ts:1097, 1114`. Either make it
      `minimalDays`-aware (`getWeekInfo()`: ISO = 4, US = 1) or hide the column when the week
      does not start on Monday. **This is a cross-library edit** — `mp-calendar` has other
      consumers, so call it out in the PR description.
- [ ] **5. Give `year-view` the `optionsRequireRerender` check** the other three views have
      (`year-view.ts:171-181` vs `month-view.ts:249-253`, `week-view.ts:234`,
      `timeline-view.ts:1044`). It watches `firstDayOfWeek` **and `locale`**, so without it a
      runtime change leaves the twelve mini-calendars stale — **which would make M6's
      locale-switch demo appear broken on the year view.**
- [ ] **6. Decide the scheduler's own `getWeekNumber`.** Dead (only
      `date.service.spec.ts:283-291`, which asserts merely `1 ≤ n ≤ 53` — vacuous under any
      convention). Delete it with `weekNumbers`/`weekText` (M1's B4). Distinct from item 4.
- [ ] **7. Extend the specs.** `date.service.spec.ts` **already covers `getWeekStart` both
      ways** (`:12-26`) and every call passes `firstDayOfWeek` explicitly, so changing the
      default breaks nothing there. But `getWeekDays` asserts Monday-first (`:55-56`) and
      `getMonthWeeks` is only called with `1` (`:109, :117`), and both assert only loose
      bounds (`4 ≤ weeks.length ≤ 6`) so a row-count change goes unnoticed. Parameterise both.
      `mp-calendar.element.aria.spec.ts:150-181, 244-250` is the only existing Sunday
      coverage in the workspace; nothing covers `7`.
- [ ] **8. Fix the stale comments** in `mp-scheduler.keyboard.spec.ts:12, 78` ("Tue",
      "Mon-start week"). The assertions read values back out of the DOM so they pass either
      way — the prose is what lies.
- [ ] Picker *defaults* stay `1` — making them locale-derived is out of scope; the scheduler
      forwards its own value into them already.

**Out of scope, but found here and worth an issue:** `year-view.ts:117, 136` build date keys
with `toISOString().split('T')[0]` (UTC) while `month-view.ts:74-76` deliberately uses local
components with a comment explaining why. The year view's `has-events` dots land on the wrong
mini-day in non-UTC timezones. Pre-existing, unrelated to week start.

## M2 — A WCAG-correct contrast helper, added alongside [PRD D5]

**Do not edit `getContrastColor` in place.** It is live: `base-view.ts:255` sets **every
event's text colour** with it, and four views import it.

- [ ] Add `getReadableTextColor(background: string): string | null` to
      `scheduler-core/src/utils/color.ts`: sRGB-linearized relative luminance, contrast ratio
      computed against **both** black and white, returns the winner — and `null` (not
      `#000000`) when the input cannot be parsed, so callers fall back to the neutral surface.
      Accept `#rgb` and `#rrggbb`.
- [ ] Unit-test the **ratio**, not the branch: assert ≥4.5:1 across `DEFAULT_COLORS` plus the
      mid-tones where YIQ and WCAG disagree (`#767676`, `#808080`, `#0074d9`), and `null` for
      `rgb(…)` / named colours.
- [ ] Leave every existing `getContrastColor` caller untouched (PRD non-goal 6). Note the
      migration as a follow-up in the PR description.

## M3 — Narrow signal hoisted [R2, D6]

- [ ] `mp-scheduler.ts:1709-1734` — observe the **host** (or the shadow root container)
      rather than only `.scheduler-header`; write `[data-narrow]` on the container as well.
      Keep the single `NARROW_HEADER_WIDTH = 560`, the `headerIsNarrow` dedupe, the
      `requestAnimationFrame` wrapper (mutating layout in the RO callback trips the
      undelivered-notifications guard) and the `typeof ResizeObserver === 'undefined'` guard.
- [ ] SCSS: `.scheduler-timeline-addbar` → `flex-direction: column` under `[data-narrow]`,
      replacing the accidental `flex-wrap: wrap` (`scheduler.styles.scss:1233-1245`).
- [ ] **Do not use a container query.** `container-type: inline-size` implies
      `contain: layout style inline-size`, which would make the element the containing block
      for M5's `position: fixed` panel. Written down so nobody "simplifies" it later.
- [ ] `codegen-wc`.

## M4 — Sticky day label [R6, PRD §5]

- [ ] `timeline-view.ts:113-129` — wrap the text in a child element carrying a **new class**
      (e.g. `.day-label`) instead of setting `textContent` on the cell.
      **Validated by spike S1** (PRD §14.1): the label pins at the column edge, hands off
      cleanly to the next day, never bleeds outside its own cell, and passes *under* the
      pinned corner column. Build it exactly as specced.
- [ ] **The trap**: `.scheduler-timeline-slot-header` is shared by the 7 day headers (`:123`)
      **and** the 336 per-slot time labels (`:163`) — distinguished only by an inline
      `fontSize` at `:167`. The sticky rule must key off the new class, or all 336 time
      labels pin too.
- [ ] SCSS: on the new class, drop `text-align: center`, `display: inline-block`,
      `position: sticky`, `inset-inline-start: var(--scheduler-resource-column-width)` —
      **not `0`**, or the label slides under the pinned corner cell
      (`scheduler.styles.scss:1029-1032`). Using the custom property keeps it in sync with a
      dragged column for free (`timeline-view.ts:490-493`).
- [ ] Check z-order against `$z-sticky-column`: the label passes *under* the corner header.
- [ ] `codegen-wc`.

## M5 — The row panel [R1, R3, R4, R5, D1–D5, D8]

- [ ] **Messages first**: add `rowMenuLabel` (`'Actions for {title}'`) to
      `scheduler-core/src/models/messages.ts`; reuse the existing `addResourceToGroup` /
      `addGroupToGroup` / `removeResource` / `resourceColor`, which already carry `{title}`.
- [ ] **State**: `rowMenuResourceId: string | null` on `MpScheduler`, mirroring
      `editorEventId`.
- [ ] **Use `OverlayController` as-is — do not re-implement positioning.** Spike S2 (PRD
      §14.2) proved a fixed panel *does* track a sticky anchor (`deltaX` exactly 0 across a
      9,000px horizontal scroll), but it also showed that a naive implementation follows the
      anchor **off-screen**. The real controller already clamps to the viewport edge when the
      anchor scrolls out (`overlay-controller.ts:382-385`) — that behaviour is load-bearing
      here, and re-deriving it is how M5 would ship a panel floating above the header.
- [ ] **Controller**: a third `OverlayController` beside the two existing ones
      (`mp-scheduler.ts:153-215`). Copy their shape —
      `anchor: () => this.rowMenuTriggerById(this.rowMenuResourceId)`, `trigger:` the same,
      `panel: () => shadowRoot.querySelector('.scheduler-row-panel')`, `initialFocus:` the
      first control, `modal: false`, and an `onClose` that nulls the state and calls
      `requestUpdate()` — **without the `onClose` mirror the panel stays rendered after an
      outside-click dismiss.**
- [ ] **Trigger** in `timeline-view.ts`: replace the `appendResourceActions` call at `:344`
      with one `.scheduler-row-menu-button`. `aria-haspopup="dialog"` (**not `menu`** — D4),
      `aria-expanded`, `aria-controls`, `aria-label` from `rowMenuLabel`, glyph `⋯`
      `aria-hidden`. **`data-action="row-menu"` + `data-resource-id` are mandatory** — that is
      what makes `captureActionFocus`/`restoreActionFocus` (`:233-263`) cover it. Omitting it
      reproduces the expand toggle's live bug (A-B3).
- [ ] Background = the resolved resource/group colour, foreground = M2's helper, neutral
      surface when absent or unparseable. This is the first time a group's stored `color` is
      painted in the left column at all.
- [ ] **Cell order** → trigger, expander, title (R3/R5).
- [ ] **Panel**: rendered by `mp-scheduler`'s `render()` as a **top-level sibling** of
      `.scheduler-day-popover` — never inside the grid subtree (D3: containing-block *and*
      owned-children contract). `role="dialog"` with an accessible name; contents built from
      the same permission gates as `appendResourceActions`, so a denied action is **absent**
      and **no trigger renders at all** when nothing is permitted (mirror
      `if (actions.childElementCount > 0)`, `:580`).
- [ ] Colour stays a native `<input type="color">` (`:615-630`), which is legal here
      precisely because the panel is a dialog.
- [ ] Focus: Escape returns to the trigger (the controller captures at `open()`); extend the
      post-delete fallback chain — next row's trigger → the grid's roving cell → **never
      `<body>`**.
- [ ] SCSS `.scheduler-row-panel` mirroring `.scheduler-day-popover` (`:580-596`):
      `position: fixed`, a new `$z-*` rung, and the same "no transform/filter/contain above
      me" comment. Narrow the column default toward `min(140px, calc(100% - 50px))`.
- [ ] `codegen-wc`.

## M6 — Keymap and demo documentation [D7, D16, M6-audit]

- [ ] Add the panel's keymap to `gridInstructions` (`messages.ts:258-259`) — and while there,
      fix audit **M6**: the text promises Enter creates an event (false in year view) and
      Page Up/Down change the period (false in month/year), and never mentions **Space**, the
      only keyboard route to the day popover. Per-view instruction variants, alongside the
      existing read-only/editor ones.
- [ ] Demo pages document the keymap (repo rule).
- [ ] **Locale demo (D16)**: an English ⇄ Dutch toggle setting `locale="nl-BE"` + a partial
      `messages` table, in all three demos. **No demo passes `locale` or `messages` today** —
      this is the milestone that proves R7 rather than asserting it. Also fix the demo's own
      hardcoded `toLocaleString('en-US', …)` at
      `apps/ng-bootstrap-demo/.../scheduler.component.ts:527`.
      **Depends on M1b item 5**: `year-view` re-renders only on a year change, so without that
      fix the toggle appears to do nothing while the year view is showing. Exercise the toggle
      on all five views when verifying, not just the default one.
      Note the Angular demo pins `firstDayOfWeek = signal<0|1>(1)`
      (`scheduler.component.ts:76, 82, 582`) while the React and Vue demos set nothing — so
      those two are where a derived week start actually becomes visible.
- [ ] Verify `locale`/`messages` pass through all three wrappers. `messages` is an **object**,
      so React assigns via the element ref and Vue via `onMounted`/`watch`, not as an
      attribute. Confirm rather than assume.
- [ ] Demo layout stays `bs-grid` + `[bsRow]` + `[md]/[lg]`.

## M7 — Both keyboard paths to the panel [D7, D7a]

- [ ] **Roving path.** Extend the roving pass (`timeline-view.ts:266-293`) so the row's ⋯
      trigger participates: ArrowLeft from a row's first slot focuses it, ArrowRight returns
      to the slots, Enter/Space opens. The trigger stays `tabindex="-1"`, so the grid keeps
      exactly one Tab stop.
- [ ] **`contextmenu` path.** Add a branch to the **existing** `handleContextMenu`
      (`mp-scheduler.ts:996-1010`) — do **not** add a `Shift+F10` key listener, which would be
      a Windows-only affordance. The existing handler already reads the composed path, claims
      the event only when it recognises the target, and leaves the native menu alone
      otherwise; follow that shape exactly. Focus the trigger, then open.
      This covers Windows `Shift+F10` + Menu key, macOS `Control`-click, macOS VoiceOver
      `VO+Shift+M`, and right-click everywhere — and gives desktop users right-click-a-row
      for free.
- [ ] Order matters inside the handler: the event-editor branch must keep winning for a
      right-click **on an event**, since an event can sit over a resource row.
- [ ] Update `aria-colindex` bookkeeping if the rowheader becomes column 1.
- [ ] Read `mp-scheduler.keyboard.spec.ts` before touching the grid handler — this is the
      milestone most likely to regress navigation.

## M8 — Accessibility blockers [R8: A-B1, A-B2, A-B3]

All three ship in this PR. A-B3 shares M5's focus machinery, so do it adjacent to M5.

- [ ] **A-B1** — add a `label` property/attribute to `MpScheduler`, defaulted per view from a
      new `gridLabel`-family message and passed through `applyGridRoles`
      (`base-view.ts:392`); a host `aria-label` overrides (the `mp-select` `input-label`
      precedence is the house pattern). Today the wrappers forward `aria-label` faithfully and
      it is then discarded.
- [ ] **A-B2** — write explicit `aria-colindex`/`aria-rowindex` per cell in week and day view,
      decoupled from DOM order, so a focused cell resolves to its real weekday
      (`week-view.ts:150-167`, `day-view.ts:118-135`). Also resolves audit **M4** and **M2**
      (rowindex off by one; second header row unindexed).
- [ ] **A-B3** — capture a stable focus key before `renderView()` and restore after; give the
      expand toggle a `data-action` so the existing mechanism covers it
      (`timeline-view.ts:313-325`). Covers Alt+view-switch and group toggle.
- [ ] Same-render rule: any ARIA state written here must land in the render that changes the
      visuals, not in an event handler.

## M9 — Remaining audit majors (opportunistic, cheap ones only)

Take the ones adjacent to code this PR already touches; defer the rest to a follow-up PRD and
**say which** in the PR description.

- [ ] **M1** — write the existing `formatCellAnnouncement` string as a gridcell `aria-label`
      at render time (`base-view.ts:79-93`); today the row/time context exists only on an
      arrow key, so Tab-in, click and focus restoration all announce "blank".
- [ ] **M8-audit** — pass `input-label` to the day popover's `mp-select`
      (`mp-scheduler.ts:626-634`); the editor already does it 470 lines later.
- [ ] **M12** — gate `handleKeyDown`'s early return on whether the composed path is inside the
      open panel, not on `isOpen` (`mp-scheduler.ts:2306-2335`) — both dialogs are non-modal,
      which invites Shift+Tab back into a grid whose keys are all dead.
- [ ] **M11** — move the column resizer out of the grid subtree, or give it the ARIA it needs;
      its own comment claims it is outside and it is not (`timeline-view.ts:423-434`).
- [ ] **M5-audit** — month-view events get `aria-pressed` + `aria-describedby` like every
      other view (`month-view.ts:206-212`).
- [ ] **M7-audit** — Page Up/Down cases in month/year, with `preventDefault` so the page stops
      scrolling off the widget.

## M10 — Spec coverage

- [ ] Assert the §8 guards — several are true but unasserted, which is how they regress.
- [ ] New: panel `aria-haspopup="dialog"` / `-expanded` / `-controls`; `role="dialog"` + name;
      focus returned to the trigger on Escape; focus **restored by key** after an action
      rebuilds the row; the colour chip not being the sole carrier of meaning.
- [ ] Close the audit's coverage gaps for whatever M8/M9 land — **A-B1, A-B2, A-B3, M1, M2,
      M5 and M6 all pass the current suites**, so each fix needs a new assertion or it is
      unguarded.
- [ ] Update `mp-scheduler.keyboard.spec.ts:1140-1163` — those selectors target
      `.scheduler-resource-action` and **will fail** after M5. Expected breakage, recorded in
      PRD §9.
- [ ] Extend the axe sweep (`apps/ng-bootstrap-demo-e2e/a11y/axe.spec.ts:53-64`) to open both
      dialogs and visit all five views; today it never leaves the default view.

## M11 — Batched verification sweep

Only now. One pass.

```bash
npx nx run mintplayer-web-components:codegen-wc
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components --pool=threads
# e2e: scheduler-views + scheduler-resize + a11y/axe, Chromium AND Firefox
```

- [ ] Portrait e2e project (390×844): title unclipped, add bar stacked, day label surviving a
      horizontal scroll.
- [ ] Manual keyboard-only pass through the timeline: every control reachable, visible focus,
      no trap, Escape closes.
- [ ] Versions: web-components **2.7.0**, ng **22.11.0**, react **19.13.0**, vue **3.14.0**.
- [ ] Push **once**, then read the single CI run.

## Risks

| Risk | Mitigation |
|---|---|
| Panel clipped or mispositioned | `position: fixed` + top-level-shadow-child is proven twice in this component. The danger is a later `container-type`/`transform` edit — M3 and M5 both carry the comment. |
| Focus lost after a panel action rebuilds the row | `data-action="row-menu"` + `data-resource-id` (M5) rides the existing capture/restore; this is exactly the bug A-B3 documents in the expand toggle. |
| Locale defaults change output for every consumer | Documented breaking change with a named opt-out per option. This is the point of R7, not a side effect. |
| `getWeekInfo` absent in Firefox / shaped differently | Feature-detect + `try/catch` + fallback; unit-test both branches. |
| **A Sunday start renders wrongly** — the component has only ever run Monday-first | M1b is a hard prerequisite for B3, and its item order matters: the attribute guard drops a `7` before any other fix can be observed. A spec that keeps passing while asserting Monday expectations is the real risk, so specs must run both ways. |
| **Every user gets a Sunday start, Europe included** | The subtlest trap in this PR: `DEFAULT_OPTIONS.locale` is the literal `'en-US'`, so deriving from it hands everyone `firstDay = 7`. M1b item 3 pins the derivation to the resolved locale at state creation. Assert a `nl-BE` browser yields Monday. |
| A cross-library edit to `mp-calendar` | M1b item 4 touches a component with consumers beyond the scheduler. Flag it in the PR description and keep the change behind `minimalDays` rather than reshaping the API. |
| Changing `getContrastColor` recolours every event label | M2 **adds** a sibling instead; migration is an explicit non-goal. |
| M7 regresses grid navigation | Comes after M5, so the panel works by Tab/click before the navigation rework starts; read the keyboard spec first. |
| The `contextmenu` branch steals right-click from the event editor | An event can overlap a resource row, so the existing event branch must be evaluated first. Assert both orders in a spec. |
| A-B2's index rework breaks specs asserting today's indices | Expected; those assertions encode the bug. Update them deliberately, not by loosening. |

## M12 — Scroll position survives a rebuild [R10, PRD §16]

Reported as "the scheduler scrolls back to (0,0) when data changes". Measured in Chromium
first: it is **resource** changes only — event edits already take `update()`, which leaves the
scroller alone. See PRD §16 for the table.

- [x] `BaseView.clearContainer()` captures `scrollLeft`/`scrollTop` before `innerHTML = ''` and
      restores them in a `requestAnimationFrame`. The container IS `.scheduler-content`, so
      emptying it collapses `scrollWidth` and the browser clamps the offset to 0.
- [x] Capture only when no restore is pending — two rebuilds in one frame would otherwise have
      the second capture the 0 the first caused.
- [x] `renderView` zeroes the scroller when the view TYPE changed, so a genuine view switch
      still lands at the top-left. One rule, in one place.
- [x] Specs assert capture/restore, the view-switch reset, and the same-frame double rebuild.
      **jsdom does not lay out**, so it never clamps `scrollLeft` on its own — the specs pin the
      contract, and the clamp itself was verified in a real browser.
- [ ] **Not covered anywhere automated:** that the restore is invisible to the eye (no flash of
      offset-0 content before the rAF lands). Worth a look during the device pass.
