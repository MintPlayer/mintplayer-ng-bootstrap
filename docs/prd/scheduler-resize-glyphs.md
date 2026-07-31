# PRD — Scheduler resize glyphs, touch resize, and blind-user completeness

Status: **Implemented** on `feat/scheduler-resize-glyphs` (2026-07-31) — see
"As-built notes" at the bottom for deviations decided during implementation.
Plan: [scheduler-resize-glyphs-plan.md](./scheduler-resize-glyphs-plan.md)

## 1. Problem

On mobile devices it is unclear where to tap to resize a scheduler event. The resize
affordance today is a pair of **invisible** 8px-tall, full-width strips at the top and
bottom of each resizable event (`.resize-handle.top/.bottom`,
`scheduler.styles.scss:278-292`) — discoverable on desktop only through the `ns-resize`
cursor, and on touch not discoverable at all. Worse, touch resize additionally requires a
600ms hold before the drag arms (`input-handler.ts:50-51,246-303`), so even a user who
knows where the strip is gets no immediate response.

A selected event already renders a highlight ring (`box-shadow: 0 0 0 3px
var(--bs-body-color)` on `.scheduler-event.selected` — white in dark theme, dark in light
theme). We will add visible resize glyphs to the selected event so the resize affordance
is discoverable, and make touch resize immediate from those glyphs.

Small screens also break the **header**: the period title ("Jul 27 - Aug 2, 2026")
word-wraps into a tall multi-line block that distorts the header layout, and the
view-switcher buttons overflow the viewport entirely, leaving controls the user cannot
reach (D9).

At the same time the scheduler must be **fully usable by blind users**. The PR #393 a11y
programme fixed the audit Criticals, but several scheduler items were decided or promised
and never shipped; this feature touches the same files and closes them.

## 2. Current state (investigated 2026-07-31, evidence in file:line refs)

| Aspect | Today |
|---|---|
| Pointer resize hit zone | invisible 8px strips, top/bottom, full width, always rendered when `event.resizable !== false` (`week-view.ts:344-355`, `day-view.ts:262-274`) |
| Views with pointer resize | week + day only; timeline/month/year none (`timeline-view.ts` renders no handles) |
| Mouse flow | mousedown on strip → 5px threshold → resize drag, slot-snapped, 30min min duration |
| Touch flow | 600ms hold anywhere on the event (strip included) → immediate drag; >10px move before hold expiry = pan; `touch-action: none` on events |
| Touch-resize gap | the immediate (post-hold) activation branch synthesizes a fallback start slot **only for `move`** — resize silently degrades if no slot is under the finger (`drag-state-machine.ts:167-174`) |
| Selection | single `selectedEvent`; `.selected` class + `aria-pressed="true"` on the `role="button"` event element; selection also happens on focus (Tab) via `handleFocusIn` |
| Keyboard resize | **already complete**: Enter on focused event → move-mode; bare arrows nudge; `Shift+Arrow` resizes end edge; `Alt+Shift+Arrow` resizes start edge; Enter commits, Escape reverts; keymap + every step announced via `LiveAnnouncerController` (`mp-scheduler.ts:1440-1442,1463-1527,1560-1576`) |
| Render model | every view **destroys and rebuilds all event DOM on every state change**; focus restored by `data-event-id` in `requestAnimationFrame` (4 call sites) |
| SSR | none — the scheduler has no `ssr/` dir, no DSD chrome; all chrome is JS-rendered |

## 3. Design decisions

### D1 — Hit zones: glyph is additive, the edge strip stays (per-pointer split)

- **Desktop (fine pointer):** click+drag on the top/bottom edge keeps working exactly as
  today, on selected *and* unselected events. The glyphs are a visual affordance that
  appears on selection; they sit inside the same hit strip, so grabbing the glyph is
  grabbing the strip.
- **Mobile (coarse pointer):** the glyph (and its enlarged strip) on the **selected**
  event is the resize target. Sequencing: tap the event → it selects and shows glyphs →
  touch-drag a glyph resizes immediately (D4). Unselected events keep today's behavior.

Rationale: the dock PRD explicitly rejected glyph-only hit zones on touch
(`dock-touch-long-press-drag.md §6.2`); Google Calendar Android (the canonical prior art:
circular handles at top/bottom, shown in selected state) keeps a generous invisible hit
area around the visible circle, matching Material's visual-bounds-vs-touch-target
guidance. Exclusivity buys nothing: either way it's a drag under WCAG 2.5.7 (D6).

### D2 — Glyphs are decorative; keyboard resize stays on the event (NOT focusable glyphs)

The original ask was "the glyph needs to be focusable somehow so the user can use the
tab-key". That *requirement* — full keyboard resize without a mouse — is **already
satisfied** by move-mode (`Enter`, then `Shift+Arrow` / `Alt+Shift+Arrow` per edge, all
live-announced). Making the glyphs themselves tab stops is rejected because:

1. **ARIA violation**: the event element is `role="button"`; a button may not contain
   focusable descendants (nested-interactive). Restructuring the event's role to permit
   child separators would ripple through the whole grid pattern for no user gain.
2. **Every credible precedent keeps handles out of the tab order**: FullCalendar's
   accepted a11y design (issue #2535: menu commands on the focused event), React Aria
   (Enter on the focused item), Atlassian Pragmatic DnD ("directional arrow movement…
   menu commands", visible handle kept as pointer affordance), Salesforce's 4 DnD
   patterns (slider semantics on the element), and in-repo `mint-tile-manager` (handles
   are non-focusable divs; `M` on the tile enters move/resize mode).
3. **Mechanical cost**: the render path destroys all event DOM on every state change;
   selection happens *on focus*; two extra tab stops per selected event would need their
   own rAF focus-restoration keys and `handleFocusIn` filter changes — complexity that
   duplicates an existing, announced keyboard path.

Therefore: glyphs get `aria-hidden="true"` and no tabindex. Discoverability of the
keyboard path is fixed properly by D3.

### D3 — Close the unshipped scheduler a11y gaps in the same release

These were decided/promised in prior PRDs and never shipped; the same files are being
touched, and "fully usable by blind users" is an explicit goal of this feature:

1. **`M` enters move-mode alongside Enter** (decision D4 of the screen-reader programme:
   "accept both; M is canonical" — recorded resolved, never implemented; tile-manager and
   dock use M). Enter keeps working (BC).
2. **`aria-describedby` keymap instructions div**: hidden div in the shadow root
   describing the keymap (grid nav + move-mode incl. resize), referenced from the grid
   container (`scheduler-keyboard-grid-nav.md §6.8`, flagged "marked Done and not
   shipped"). This is also where a blind user *discovers* that resize exists at all.
3. **`aria-multiselectable="true"`** on the grid container (Shift+Arrow extends a
   multi-cell selection today; promised in §6.8, absent).
4. **`:focus-visible` rules** for `.scheduler-event`, `.scheduler-timeline-event`,
   `.scheduler-month-event`, `.scheduler-month-day`, `.scheduler-year-month` (audit
   MAJOR: events rely on the `.selected` box-shadow as the only focus signal, which
   breaks when a consumer drives `selectedEvent` externally). Follow the in-repo
   convention: `outline: 2px solid var(--bs-primary); outline-offset: -2px`.
5. **month/year `aria-selected` misuse**: both views write `aria-selected` to express
   *focus* position, not selection (audit MAJOR; `month-view.ts:124-125`,
   `year-view.ts:143-144`). Remove it there (roving tabindex already expresses focus).
6. **Localized strings**: every announcer string, nav-button label, grid label and event
   `aria-label` is hard-coded English, violating the repo rule "accessible names are
   localized strings"; `base-view.ts` formatters even use `toLocaleDateString(undefined,…)`
   (browser locale) instead of `options.locale`. Introduce `options.messages` — a typed,
   partial message table with the current English strings as defaults — route all
   announcer/label strings through it, and fix the formatters to use `options.locale`.
   No new i18n framework; a plain object, same pattern as `SchedulerOptions`.

### D4 — Touch arming: immediate resize from a selected event's glyph

A `touchstart` that lands on a `.resize-handle` of the **selected** event arms the resize
drag immediately (the `immediate=true` path that today is only reached after the 600ms
hold): no hold, scroll-blocking applied from frame 1, `touch-action: none` on the handle
elements. Everything else keeps the hold model (touch on the event body: 600ms hold →
move; quick swipe: pan).

Prerequisite fix: extend the immediate-activation slot fallback in
`drag-state-machine.ts:167-174` to cover `resize-start`/`resize-end` (synthesize the
start slot from the event's own start/end times, as `move` already does) so glyph-drag
resize cannot silently no-op when `elementsFromPoint` misses a slot.

Feedback: keep the existing `.touch-hold-pending`/`.touch-hold-active` visuals for the
hold path; the glyph path needs none (it responds instantly).

### D5 — Geometry and target size

- **Visible glyph**: a circle (Google Calendar precedent; also the user's stated
  preference space "round or square" — round chosen), ~14px diameter, 2px border using
  the selection-ring color (`var(--bs-body-color)`), filled with the event color /
  `var(--bs-body-bg)`; horizontally centered; vertically **straddling** the event edge
  (half outside), like Google Calendar. Exposed as CSS custom properties
  `--scheduler-resize-glyph-size`, `--scheduler-resize-glyph-color`,
  `--scheduler-resize-glyph-bg`.
- **Hit strip on the selected event**: grows from 8px to **24px** effective height (WCAG
  2.5.8 AA floor, the file-manager precedent), and **44px** under
  `@media (pointer: coarse)` (ribbon FR-37/38 and splitter touch-mode precedents),
  centered on the event edge so roughly half extends *outside* the event box — short
  events keep a grabbable middle for `move`, and the top/bottom zones never overlap each
  other regardless of event height.
- **Layering**: while selected, the event (and thus its handles) gets a raised z-index so
  the outside-the-box halves of the hit strips win over neighboring events. At most one
  event is selected, and selection is a deliberate act — occluding a neighbor's first
  ~22px while selected is acceptable and self-healing (tap elsewhere deselects).
- **Overflow**: verify the event box doesn't clip the straddling glyph
  (`overflow: visible` on the selected event or render handles un-clipped); this is a
  plan-level verification task.
- **Unselected events (all pointers)**: strip stays 8px, invisible — unchanged.
- **Reduced motion**: the glyph reveal transition (if any) dies under
  `@media (prefers-reduced-motion: reduce)` in the same stylesheet. Glyph drawn with
  borders/background (forced-colors-safe), not images.

### D6 — WCAG 2.5.7 Dragging Movements (single-pointer non-drag alternative)

A tap-drag on a glyph is still a *dragging movement* under SC 2.5.7 (AA); the keyboard
path does **not** satisfy it (the SC requires a single-*pointer* alternative: buttons,
menus, or form fields). Position, consistent with the whole field (Google Calendar,
Outlook — whose mobile app has *only* the form path):

- The scheduler emits `event-update` / `event-create` as *requests*; the **consumer's
  edit UI (form with start/end fields) is the non-drag alternative**, exactly as in every
  mainstream calendar. The WC cannot own it (it doesn't own event editing at all).
- This PRD documents that conformance responsibility in the demo pages, and the demo apps
  gain a minimal edit affordance (double-click/`event-dblclick` already exists as the
  hook) demonstrating the pattern.
- A built-in per-event action menu ("Extend end 15 min" etc., the FullCalendar #2535
  shape) is explicitly **out of scope** — noted as a possible future component.

### D7 — View coverage

- **Week + day**: full feature (glyphs, enlarged strips, immediate touch resize).
- **Timeline**: gains pointer resize for the first time — left/right handles + glyphs on
  the selected event (the drag machine already supports `resize-start/resize-end` there;
  keyboard resize already works there). The timeline event element must stop assigning
  `textContent` (which precludes child nodes) and render a title span + handle children
  like week/day do.
- **Month/year**: no resize concept — no glyphs. (Month/year only receive the D3.5
  `aria-selected` fix and D3.4 focus-visible rules.)
- Multi-day split events: glyph/strip follows the existing `part.isStart`/`part.isEnd`
  gating (start handle only on the first part, end handle only on the last).
- Gating: glyphs render only when selected **and** `event.resizable !== false` **and**
  `options.editable` is not false (same gates as the strips today; `draggable === false`
  already blocks the state machine).

### D8 — Companion scope: wrapper two-way binding for `date` (and `view`)

The displayed date changes from *within* the WC (`next()/prev()/today()/gotoDate()`, and
`view-change` already delivers `{view, date}`), but the Angular wrapper declares `date`
(and `view`) as one-way `input()`s — so the consumer's binding and the wrapper's own
`currentWeekStart/currentWeekEnd/visibleEvents` computeds go stale after any internal
navigation. In scope:

- **WC**: guarantee a change event fires for every internal date change (verify
  `view-change` fires on pure date navigation; if not, emit a new `date-change`
  `{ date, view }` custom event — additive, non-breaking).
- **Angular**: `date` and `view` become `model()` signals, written back from the
  change listener (same pattern as `selectedEvent`/`selectedRange`).
- **Vue**: add `v-model:date` via `defineModel` next to the existing `v-model:view`;
  close the parity gap by also exposing `options` (object props can't travel via
  `$attrs`).
- **React**: add the `onDateChange`/`onViewChange` event mapping entries (properties
  already flow through `@lit/react`).

### D9 — Responsive header: no wrapped title, no unreachable buttons

On small screens the header breaks down ("Jul 27 - Aug 2, 2026" wraps to five lines and
distorts the whole header; view-switcher buttons overflow the viewport and become
unreachable). Root cause: `.scheduler-header` is a single `display:flex;
justify-content: space-between` row with **no** `flex-wrap`, no responsive rules, and no
`white-space` handling on `.scheduler-title` (`scheduler.styles.scss:34-90`); the three
groups (nav ‹ › Today, title, 5-button view switcher) have a min-content width that
easily exceeds a phone viewport (`mp-scheduler.ts:357-425`).

Fix, in three layers (all component-internal, no API change):

1. **Title never multi-line wraps**: `white-space: nowrap` on `.scheduler-title`
   (ellipsis as last-resort overflow guard).
2. **Header wraps as groups, not words**: `flex-wrap: wrap` on `.scheduler-header` with
   an explicit narrow layout — nav and view switcher share the first row, the title takes
   a full-width second row (order via flex `order`), so every button stays in reach.
   Driven by a container/width condition, not viewport media queries (the scheduler may
   sit in a pane narrower than the viewport — e.g. inside a splitter/dock).
3. **Compact title format when narrow**: text content is JS-generated, so a
   `ResizeObserver` on the header sets a `data-narrow` state and `updateTitle()` switches
   to a compact interval format (week view: `"Jul 27 – Aug 2"` — drop the year, keep
   short month; day view: drop the weekday), still via `dateService.formatDate` +
   `options.locale`. The `aria-live` title region keeps exposing the full text (year
   included) to AT via a visually-hidden span so screen-reader users lose nothing.

Acceptance reference: every header control reachable and clickable at 320px width (the
WCAG 1.4.10 reflow reference), and inside a narrow dock/splitter pane.

## 4. Functional requirements

- **FR-1** Selected, resizable events in week/day views render a round glyph centered on
  the top and on the bottom edge (per D5 geometry); timeline: left/right edges.
- **FR-2** Glyphs and enlarged strips appear/disappear in the same render as the
  `.selected` class and `aria-pressed` (state on the role, same-render rule).
- **FR-3** Desktop: edge-drag resize keeps working on selected and unselected events,
  5px threshold, unchanged.
- **FR-4** Touch on a selected event's handle arms resize immediately (no 600ms hold);
  touch elsewhere on the event keeps the hold-to-move model; quick swipe still pans.
- **FR-5** The immediate-activation slot fallback covers resize operations
  (`drag-state-machine.ts:167-174` fix).
- **FR-6** Hit strip ≥24px on the selected event, ≥44px under `pointer: coarse`;
  straddles the edge; selected event raised above neighbors.
- **FR-7** Glyphs are `aria-hidden="true"`, non-focusable, drawn with
  forced-colors-safe CSS; reveal honours `prefers-reduced-motion`.
- **FR-8** `M` (no modifiers) on a focused event enters move-mode, equivalent to Enter.
- **FR-9** Discoverability via `aria-describedby`, two levels (localized via
  `options.messages`): the grid container references a hidden instructions div covering
  grid navigation; **each event element** references a short hint ("Press Enter or M to
  move or resize") — a description on the grid ancestor is not announced while focus
  sits on an event, and the per-event description is the React Aria / tile-manager
  pattern. Grid also gains `aria-multiselectable="true"`. No screen-reader-only help
  button (rejected — see plan).
- **FR-10** `:focus-visible` outline on all event/cell focusables listed in D3.4.
- **FR-11** Month/year stop writing `aria-selected` for focus position.
- **FR-12** All announcer strings, nav/grid labels, event `aria-label` formatters and the
  instructions div route through `options.messages` (English defaults); date formatting
  in `base-view.ts` uses `options.locale`.
- **FR-13** Timeline view gains pointer resize with the same gates, snapping and
  min-duration behavior as week/day.
- **FR-14** Wrapper two-way binding per D8 in all three frameworks.
- **FR-15** All three demo keymap `<details>` blocks document: M/Enter, both resize
  edges, the touch gesture (tap to select, drag a circle to resize), and the note that
  the edit form is the non-drag alternative; demo apps wire a minimal edit affordance.
- **FR-16** The header title never renders on more than one line, at any width.
- **FR-17** At 320px component width, all header controls (prev/next/today + all five
  view buttons) are visible, reachable and clickable; the header wraps as groups per D9.
- **FR-18** Below the narrow threshold the title uses the compact format (per D9.3,
  locale-aware); the full text (incl. year) remains exposed to AT.

## 5. Testing requirements

- **Unit (vitest/jsdom)**:
  - `mp-scheduler.aria.spec.ts`: glyph absent when unselected, present + `aria-hidden`
    when selected; strip height ≥24px when selected; `aria-describedby` resolves to a
    non-empty instructions div; `aria-multiselectable` present; month/year
    `aria-selected` absent; messages override reflected in announcer output and labels.
  - `mp-scheduler.keyboard.spec.ts`: `M` enters move-mode (parity with Enter assertions).
  - `drag-state-machine.spec.ts`: immediate-activation resize with no slot under pointer
    synthesizes the start slot (both edges).
- **axe sweep**: add the one allowed `interact` step to the scheduler route in all three
  `axe.spec.ts` files — select an event so `wcag22aa` target-size audits the revealed
  glyphs in the selected state.
- **e2e**: first touch-emulation coverage in the workspace — a Playwright `hasTouch`
  context test on the ng demo: tap event → glyphs visible → `touchscreen` drag on the
  bottom glyph → `event-update` with a longer duration. Desktop e2e: mouse edge-drag still resizes an *unselected* event (regression guard
  for D1).
- **e2e (responsive header)**: at a 320×640 viewport on the ng demo scheduler page —
  title bounding box is single-line-height; every header button is inside the viewport
  and receives a click (Playwright refuses clicks on out-of-viewport/covered targets,
  which is exactly the assertion we want).
- Full suite sweep batched at the end per repo rule (no per-milestone runs).

## 6. Out of scope

- Built-in event action menu / built-in edit form (D6 — consumer responsibility,
  possible future component).
- Migrating the scheduler's mouse/touch listener pipeline to Pointer Events (standing
  preference for *new* drag UIs; a rewrite of a working pipeline is its own risk — noted
  as tech-debt follow-up).
- SSR/no-JS chrome for the scheduler (none exists; unchanged).
- Multi-select of events; resize on month/year views.
- Full i18n framework — `options.messages` is a plain typed object.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Straddling glyphs clipped by event `overflow` or events-container clipping | plan task verifies early (milestone A spike); fallback = render glyphs inside the edge |
| Enlarged outside-the-box strips steal taps from neighboring events | only ever on the single selected event; z-index raised only while selected |
| Immediate touch-resize misfires during scroll-intent swipes that start on a glyph | glyphs exist only on the already-selected event; `touch-action: none` on the handle makes the browser never claim it; Escape/revert unchanged |
| `textContent` → child-nodes restructure of timeline events regresses styling | timeline title moves into a span with identical class/ellipsis rules; aria spec pins the label |
| Messages API balloons | table is flat, keys enumerated from the ~20 existing strings, defaults inline — no pluralization/ICU |

## 8. Open questions (non-blocking, verify during implementation)

1. Whether Google Calendar Android's circles are additive with body-edge drag is
   undocumented publicly — our D1 answer doesn't depend on it.
2. `view-change` emission on pure date navigation (D8) — verify in code; add
   `date-change` if absent.
3. Exact glyph diameter (14px proposed) — tune visually in the demo against 30-min
   (20px-tall) events.

## 9. As-built notes (deviations & discoveries, 2026-07-31)

- **BREAKING (Angular wrapper):** the explicit `viewChange = output<ViewChangeEvent>()`
  is removed. `view` and `date` are `model()` signals; their implicit
  `viewChange: OutputEmitterRef<ViewType>` / `dateChange: OutputEmitterRef<Date>`
  outputs replace it (keeping both was impossible — NG1054 name collision).
  Consumers migrate from `(viewChange)="onViewChange($event.view)"` to
  `[(view)]` / `[(date)]` (+ the implicit change outputs if they need the hook).
- **`view-change` already fires on pure date navigation** (`viewChanged || dateChanged`),
  so no new `date-change` WC event was needed (open question 2 resolved).
- **`event-dblclick` was dead on arrival and is now synthesized**: the first click's
  selection re-render replaces the event node, which resets the browser's native
  double-click tracking — so the WC now emits `event-dblclick` from two activations of
  the same event within 500 ms. This also gives touch users a double-tap path to the
  demo edit form (the SC 2.5.7 non-drag alternative).
- **D9 title compaction dropped**: with the narrow header giving the title its own
  full-width centered row (rows centered per review), the full title incl. year fits in
  every view at 320px — FR-18's compact format is unnecessary and not implemented; the
  title is `white-space: nowrap` + ellipsis-guarded instead. Narrow rows are centered.
- **Two bug fixes surfaced by D7 (timeline pointer resize)**: `getEventById` never
  resolved resource-owned events (hit-testing could not start any timeline drag), and
  `stateManager.updateEvent` didn't update events nested in the resource tree (commits
  snapped back). Both fixed; the timeline also gained the drag preview ghost.
- **Touch-drag e2e** uses synthetic `TouchEvent`s (engine-agnostic) rather than a
  CDP-only touchscreen drag; hasTouch context asserts the no-hold immediate arm.
