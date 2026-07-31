# Plan — Scheduler resize glyphs, touch resize, and blind-user completeness

PRD: [scheduler-resize-glyphs.md](./scheduler-resize-glyphs.md)
Status: **Not started**

Conventions that apply throughout:

- After any `.styles.scss` edit: `npx nx run mintplayer-web-components:codegen-wc`
  (generated `.styles.ts` is gitignored — never hand-edit or stage it).
- Views build DOM imperatively (`document.createElement` via `BaseView.createElement`),
  and **every view rebuild destroys all event DOM** — new chrome must be created inside
  `createEventElement`, and no new element may hold focus (D2 keeps glyphs decorative,
  so no new focus-restoration keys are needed).
- Commit per milestone; **run the suites once at the end** (milestone J), not per
  milestone. Verify intermediate milestones by reading + type-checking.
- No new branch/PR without explicit permission.

## Milestone A — Spike: straddling glyph geometry (throwaway, ~half day)

Goal: de-risk the one unknown before building — can a glyph straddle the event edge
(half outside the box) and can the enlarged hit strip extend outside the event without
being clipped or losing pointer events?

- [x] Clipping verified in code: `.scheduler-event` has `overflow: hidden`
      (scheduler.styles.scss:239) — the only clipping ancestor below the scroll
      container. `.scheduler-events-container` and day columns don't clip;
      `.scheduler-content` (`overflow: auto`) clips only at the first/last slot edge
      (same as Google Calendar — accepted).
- [x] **Outcome: straddle IS viable.** Fix = wrap title/time in a `.event-content`
      child (`height: 100%; overflow: hidden`, padding stays on the event — everything
      is `box-sizing: border-box`) and switch `.scheduler-event` to
      `overflow: visible`. Preview elements are built separately (bare) — unaffected.
      PRD D5 stands unchanged.
- [x] Stacking verified: events are absolutely-positioned siblings inside one
      per-column container (no z-index anywhere on events); `.selected { z-index: 2 }`
      suffices. Strips extend vertically only, so no cross-column contention; the
      now-indicator (z-index 5) is `pointer-events: none`.

## Milestone B — Glyphs + enlarged strips (week/day) [FR-1, FR-2, FR-3, FR-6, FR-7]

Files: `libs/mintplayer-web-components/scheduler/src/styles/scheduler.styles.scss`,
`src/views/week-view.ts`, `src/views/day-view.ts`.

- [ ] Reuse the existing `.resize-handle` divs as the anchor (they already carry
      `data-handle="start"|"end"`, respect `event.resizable` and multi-day
      `part.isStart/isEnd`, and are what `analyzeTarget`'s
      `closest('.resize-handle')` hit-testing targets — zero drag-machine changes).
- [ ] Add the glyph as a child span (`.resize-glyph`, `aria-hidden="true"`) or `::after`
      inside each handle; visible only under `.scheduler-event.selected`.
- [ ] SCSS: selected-state strip growth to 24px (44px under `@media (pointer: coarse)`),
      centered on the edge per the A outcome; `touch-action: none` on handles; round
      glyph (~14px, 2px border `var(--scheduler-resize-glyph-color, var(--bs-body-color))`,
      bg `var(--scheduler-resize-glyph-bg, var(--bs-body-bg))`, size
      `var(--scheduler-resize-glyph-size, 14px)`); reveal transition +
      `prefers-reduced-motion` kill; borders/background only (forced-colors-safe).
- [ ] Gate exactly like today: selected && `event.resizable !== false` && editable —
      verify the editable gate reaches the view (today handles render regardless of
      `options.editable`; align: suppress glyphs when not editable, per PRD D7).
- [ ] Verify: `npx nx run mintplayer-web-components:codegen-wc` + type-check + look at
      the ng demo (light + dark theme, Firefox too — flex-shrink trap on circular
      indicators: give the glyph `flex: 0 0 auto` if it lands in a flex context).

## Milestone C — Touch: immediate resize from the selected event's glyph [FR-4, FR-5]

Files: `src/input/input-handler.ts`, `src/drag/drag-state-machine.ts`,
`src/drag/drag-state-machine.spec.ts`.

- [ ] `drag-state-machine.ts:167-174`: extend the immediate-activation slot-less
      fallback (synthesize `startSlot` from the event's own times) from `move` to
      `resize-start`/`resize-end`. Unit-test both edges in
      `drag-state-machine.spec.ts` (immediate + no slot under pointer → active, correct
      preview).
- [ ] `input-handler.ts` touchstart path: when the touch target resolves to a
      `.resize-handle` **whose event is the currently-selected event**, skip the 600ms
      hold — apply scroll-blocking and call `onPointerDown` with `immediate=true`
      directly. All other touch paths unchanged (hold → move; quick swipe → pan).
      Needs the selected-event id available to the input handler (pass a
      `isSelectedEvent(eventId)` callback like the existing `isEditable()`).
- [ ] Do NOT `preventDefault()` the initial touch beyond what the current code already
      does (repo rule: `touch-action: none` does the job; preventDefault on touch start
      suppresses the synthesized click).
- [ ] Verify by reading + type-check; hands-on check via ng demo with devtools touch
      emulation.

## Milestone D — Timeline pointer resize + glyphs [FR-13]

Files: `src/views/timeline-view.ts`, `scheduler.styles.scss`.

- [ ] Restructure the timeline event element: replace the `textContent = event.title`
      assignment with a `.event-title` span (same ellipsis styling) so child nodes
      survive.
- [ ] Create left/right `.resize-handle` divs (`data-handle` start/end) with the same
      gates as week/day; horizontal strip geometry (width instead of height; 24/44px);
      glyphs on left/right edges; `cursor: ew-resize`.
- [ ] Confirm `analyzeTarget` + the state machine handle timeline resize end-to-end
      (investigation says the machinery is view-agnostic; the preview path
      `renderPreviewEvent` must render horizontal resize previews — verify, fix if not).
- [ ] Extend the existing keyboard-resize announcements — no change expected (keyboard
      resize already works on timeline); assert the aria-label of the restructured
      element is unchanged in `mp-scheduler.aria.spec.ts`.

## Milestone E — Keyboard + ARIA gap closure [FR-8..FR-11]

Files: `src/components/mp-scheduler.ts`, `src/views/base-view.ts` (applyGridRoles),
`src/views/month-view.ts`, `src/views/year-view.ts`, `scheduler.styles.scss`,
`src/components/mp-scheduler.keyboard.spec.ts`, `mp-scheduler.aria.spec.ts`.

- [ ] `handleEventKeyDown`: accept `m`/`M` (no modifiers) as move-mode entry alongside
      Enter (decision D4 of the screen-reader programme; keep Alt+M = month view —
      modifier-guarded, no conflict).
- [ ] Two hidden instructions divs in the shadow root (visually-hidden, ids, text from
      `options.messages`, milestone F): (1) grid navigation instructions, referenced by
      the grid container's `aria-describedby`; (2) a short per-event hint ("Press Enter
      or M to move or resize"), referenced by **every event element's**
      `aria-describedby` — descriptions on an ancestor are not announced while focus
      sits on a descendant, so the event-level hint is what makes move/resize
      discoverable. Grid container also gets `aria-multiselectable="true"`
      (week/day/timeline grids where Shift+Arrow range selection exists).
- [ ] `:focus-visible` rules (`outline: 2px solid var(--bs-primary); outline-offset:
      -2px`) for `.scheduler-event`, `.scheduler-timeline-event`,
      `.scheduler-month-event`, `.scheduler-month-day`, `.scheduler-year-month`.
- [ ] Month/year: stop writing `aria-selected` for focus position (roving tabindex
      already expresses focus).
- [ ] Spec coverage for each item (keyboard spec: M-entry parity; aria spec:
      describedby resolves non-empty, multiselectable, no aria-selected on month/year
      focus, glyph hidden/unselected + present/aria-hidden/selected, strip ≥24px
      selected).

## Milestone F — Localized strings: `options.messages` [FR-12]

Files: `src/types/` (SchedulerOptions), `src/components/mp-scheduler.ts`,
`src/views/base-view.ts`, all views' label call sites.

- [ ] Add `messages?: Partial<SchedulerMessages>` to `SchedulerOptions`: a flat typed
      table enumerating the ~20 existing strings (nav labels 'Previous period'/'Next
      period'/'Jump to today'/'Today', view-switcher labels, timeline grid label,
      move-mode keymap announcement, per-step announcement templates, commit/cancel,
      selection/loading announcements, instructions-div text, event aria-label
      template). English defaults inline; simple `{placeholder}` interpolation, no ICU.
- [ ] Route every announcer/label call site through the merged table.
- [ ] `base-view.ts` formatters: use `options.locale` instead of
      `toLocaleDateString(undefined, …)` (align with the header, which already uses
      `dateService.formatDate(date, options.locale)`).
- [ ] Aria spec: override one message via options and assert it lands in the announcer
      output and in an event aria-label.

## Milestone G — Responsive header [FR-16..FR-18, D9]

Files: `scheduler.styles.scss`, `src/components/mp-scheduler.ts`
(`populateHeader`/`updateTitle`).

- [ ] `.scheduler-title { white-space: nowrap; }` (+ `overflow: hidden;
      text-overflow: ellipsis` as last resort on the narrow row).
- [ ] `.scheduler-header { flex-wrap: wrap; }` narrow layout: nav + view switcher on
      row 1, title full-width row 2 (flex `order` + `flex-basis: 100%`), driven by a
      component-width condition (container query on the host if available in all
      supported engines, else the same ResizeObserver as the next item toggling a
      `data-narrow` attribute on the header).
- [ ] ResizeObserver on the header: below threshold set `data-narrow`; `updateTitle()`
      renders the compact format (week: short month + day, no year; day: no weekday) via
      `dateService.formatDate` + `options.locale`; full text (with year) kept in a
      visually-hidden span inside the `aria-live` title so AT reads the full period.
      Disconnect the observer in `disconnectedCallback` alongside `nowIndicatorTimer`.
- [ ] Sanity-check in the ng demo at 320px and inside a splitter pane.

## Milestone H — Wrapper two-way binding + parity [FR-14, D8]

Files: `src/components/mp-scheduler.ts` (event emission),
`libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/scheduler.component.ts`,
`libs/mintplayer-react-bootstrap/scheduler/src/BsScheduler.tsx`,
`libs/mintplayer-vue-bootstrap/scheduler/src/BsScheduler.vue`.

- [ ] WC: verify `view-change` fires on `next()/prev()/today()/gotoDate()` (pure date
      navigation). If it doesn't, emit a new `date-change` `{ date, view }` custom event
      from every internal date mutation (additive, non-breaking).
- [ ] Angular: `date` and `view` become `model()` signals; write back from the
      `view-change` (and `date-change` if added) listener — same pattern as
      `selectedEvent`/`selectedRange`. The stale `currentWeekStart`/`visibleEvents`
      computeds heal automatically once `date` tracks reality.
- [ ] Vue: add `v-model:date` (`defineModel`), expose `options` as an explicit synced
      prop (object props can't travel via `$attrs`).
- [ ] React: add `onDateChange` (if `date-change` ships) to the `createComponent`
      events map; nothing else needed.
- [ ] Extend `MpSchedulerElement` interface in the Angular wrapper for anything new.

## Milestone I — Demos, docs, axe interact [FR-15, D6]

Files: `apps/ng-bootstrap-demo/src/app/pages/enterprise/scheduler/scheduler.component.html`
(+ `.ts`), `apps/react-bootstrap-demo/src/app/pages/enterprise/SchedulerPage.tsx`,
`apps/vue-bootstrap-demo/src/views/enterprise/SchedulerView.vue`, the three
`a11y/axe.spec.ts` files.

- [ ] Update all three keymap `<details>` blocks: M/Enter move-mode entry, both resize
      edges, the touch gesture ("tap an event to select it, then drag the round handle
      at its top or bottom edge"), and the non-drag alternative note.
- [ ] Wire a minimal edit affordance in each demo on `event-dblclick` (start/end time
      fields — the SC 2.5.7 single-pointer non-drag path, demonstrated not just
      documented). Keep it small (use existing bs-* form controls; demo-then-snippet
      order).
- [ ] Add the `interact` step (select an event) to the scheduler route in all three axe
      specs so `wcag22aa` target-size audits the revealed glyphs.

## Milestone J — Test sweep (single batched run)

- [ ] New e2e in `apps/ng-bootstrap-demo-e2e`:
      - touch resize: `hasTouch` context (first in the workspace) — tap to select,
        glyphs visible, touch-drag bottom glyph one slot, assert `event-update`
        duration; `waitForLoadState('networkidle')` after goto per repo rule.
      - desktop regression: mouse edge-drag resizes an unselected event.
      - responsive header: 320×640 viewport — single-line title box, all header buttons
        clickable.
- [ ] Run: `npx nx build mintplayer-web-components && npx nx test
      mintplayer-web-components` (vitest: `--pool=threads`; if the plugin worker flakes:
      `NX_ISOLATE_PLUGINS=false NX_DAEMON=false`), then the three wrapper builds, then
      the e2e/axe suites.
- [ ] Fix fallout; re-run only what failed.

## Explicitly rejected (with reasons — do not resurrect casually)

- **Focusable glyphs** (PRD D2): ARIA nested-interactive violation inside the
  `role="button"` event; duplicates the existing announced move-mode keymap; fights the
  destroy-and-rebuild render path; contradicts every internal + external precedent.
- **Glyph-only hit zones**: regresses desktop edge-drag; dock PRD §6.2 precedent.
- **Built-in edit form / action menu in the WC** (PRD D6): event editing is the
  consumer's domain; demos show the pattern instead.
- **Pointer Events migration of the scheduler input pipeline**: separate tech-debt item;
  too much risk piggybacked on a UX feature.
- **Screen-reader-only help button in the header**: the passive `aria-describedby`
  descriptions deliver the same guidance in context with no extra tab stop and no
  discovery problem; SR-only interactive controls are an anti-pattern (sighted keyboard
  users need the same help but can't see the button; low-vision SR users are told about
  a control that isn't visually there). If in-component help is ever wanted, it must be
  a **visible-to-everyone** "?" keymap button (optional future enhancement, not an
  accessibility requirement).
