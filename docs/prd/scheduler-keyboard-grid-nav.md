# PRD: `mp-scheduler` keyboard grid navigation — pointer parity for cells, selections, and event move/resize

**Status:** **Implemented** — Phase A shipped `9ae72107`; Phase B (month/year arrow nav, inter-event arrow nav) shipped `ae8653da` via the [`scheduler-controlled-selection.md`](./scheduler-controlled-selection.md) follow-up PRD. Both on `feat/aria-accessibility`. Browser-verified end-to-end.
**Author:** Pieterjan (analysis by 4-agent ARIA team)
**Date:** 2026-05-10
**Library:** `@mintplayer/ng-bootstrap/web-components/scheduler`
**Branch:** `feat/aria-accessibility` (extends, not replaces)
**Companion PRDs:**
- [`wc-aria-accessibility.md`](./wc-aria-accessibility.md) §5.3 / Phase 5 / Phase 6 — established the grid roles, event labels, view-switcher `aria-pressed`, and the first cut of M-mode event move (`614fb0fe`).
- [`aria-accessibility-audit.md`](./aria-accessibility-audit.md) — Angular layer reference.

**Standards target:** [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) + [APG Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), conformance to **WCAG 2.2 AA** (2.1.1 Keyboard, 2.4.3 Focus Order, 4.1.2 Name/Role/Value).

---

## 1. Motivation

Phase 5/6 of `wc-aria-accessibility.md` shipped APG Grid roles, descriptive event labels, view-switcher pressed state, the shared `LiveAnnouncerController`, and a first cut of keyboard event-move (`M` + Arrow nudge, commit `614fb0fe`). That made the scheduler **announce-able**, but only partially **operable**.

The remaining gap, reported on `feat/aria-accessibility`:

> "I'm able to use the arrow keys to go to prev/next week, but I can't navigate through the timeslots in the scheduler body. Ideally I would be able to do the same as with a mouse — arrow to a timeslot, Shift+Arrow to grow/shrink the selection, Enter = mouseup/create an event. Include event divs in the tab order, Enter to move the event, Enter to drop."

In other words: **the grid body has roles but no focus model**, and **events are not yet reachable by Tab**. Drag-create, drag-move, and drag-resize — three of the four primary user actions — remain pointer-only.

This blocks WCAG 2.1.1 for any user who can't operate a pointer, and renders the demo at `/enterprise/scheduler` unusable to keyboard-only users beyond view switching.

## 2. Goals / non-goals

**Goals**

- **G1.** Every pointer interaction in `§5` of this PRD has a keyboard equivalent that produces the same emitted event with the same payload semantics.
- **G2.** Cell-level focus, range selection, and event focus follow library precedent established in this branch (calendar grid roving tabindex; dock/tile-manager move-mode; shared `LiveAnnouncerController`). No new patterns introduced unless precedent doesn't apply.
- **G3.** Existing pointer behaviour is unchanged. No regressions in `mp-scheduler.aria.spec.ts` or pointer-driven specs.
- **G4.** Discoverable: focused cell, selection range, focused event, and move-mode all have a visible focus ring + a polite live-region announcement on entry.
- **G5.** Works across `day`, `week`, and `timeline` views in v1 (the time-grid views). `month` / `year` get a tighter, navigation-only model in v2 (§9).

**Non-goals**

- A second activation key for legacy `M`-mode. The existing `M` event-move keymap is **replaced** by Enter-on-focused-event (§6.6); per memory `BC is not a default constraint`, document the breaking change in the changelog and move on.
- Roving inside a cell (multiple events per cell visited via sub-arrows). Events are siblings of cells in the Tab order — no nested roving.
- New mouse interactions. This PRD only adds keyboard equivalents.
- Visible help text inside the grid. Discoverability comes from live-region announcements + an `aria-describedby` instructions div (precedent: tile-manager Phase 3.4) — not on-screen UI.

## 3. Scope

**In scope:**
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/components/mp-scheduler.ts` — keydown router, focus state, move-mode state, auto-scroll-on-arrow-nav (D6).
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/state/scheduler-state.ts` — add `focusedCell` + `selectionAnchor`/`selectionExtent` (linear `Date` range, D1) + `selectionResourceId` reactive state.
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/views/{day,week,timeline}-view.ts` — cell render (`tabindex` + `id` + `aria-selected`), event render (full Tab order, not roving — D3-aligned).
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/views/base-view.ts` — shared cell-coordinate helpers + ARIA label formatters.
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/events/scheduler-event-emitter.ts` + `event-types.ts` — rename `event-click` → `event-selected` (D3).
- `libs/mintplayer-ng-bootstrap/scheduler/` — Angular wrapper `bs-scheduler` output rename `(eventClick)` → `(eventSelected)`.
- Demo page `apps/ng-bootstrap-demo/src/app/pages/enterprise/scheduler/scheduler.component.{ts,html,scss}` — rename binding, show the new keymap including `Alt+letter` shortcuts (precedent: `wc_aria_decisions.md` memory — *demo pages must show keymap*).
- Tests: extend `mp-scheduler.aria.spec.ts` and add `mp-scheduler.keyboard.spec.ts`.

**Out of scope:**
- `month-view.ts`, `year-view.ts` — no in-cell time selection; arrow nav between days/months only (see §9 for the v2 plan).
- Resource-group expand/collapse keyboard wiring — already tracked under `wc-aria-accessibility.md` Phase 5.4. Not blocking this PRD.
- The Angular wrapper `bs-scheduler` — wrapper stays thin; no template work required (per memory: *ARIA work lives in the Lit WC, not the Angular wrapper*).
- Touch-equivalents. Touch is already pointer-based and works.

## 4. Current state (synthesis from agent reports)

| Aspect | State today | File:line |
|---|---|---|
| Keydown router attached at root | Yes | `mp-scheduler.ts:101` (connectedCallback) → `:687–751` (handleKeyDown) |
| ArrowLeft/Right | Prev/next period (week/day depending on view) | `mp-scheduler.ts:707–713` |
| ArrowUp/Down, Home/End, PageUp/Down, Shift+Arrow | **Unconsumed** | — |
| Enter (outside move-mode) | **Unconsumed** | — |
| `M` | Enter event-move mode if event focused & selected; else switch to month view | `mp-scheduler.ts:700–703, 725–728` |
| Move-mode state | `keyboardMove: { eventId, originalStart, originalEnd, workingStart, workingEnd } \| null` | `mp-scheduler.ts:759–765` |
| Move-mode keymap | Arrow Left/Right → nudge by `slotDuration`; Enter → commit; Escape → cancel | `mp-scheduler.ts:776–843` |
| Move-mode arrow Up/Down | **Unconsumed** (no resource-row navigation in timeline view yet) | — |
| Cells in DOM | Day/week: `<div class="scheduler-time-slot">` with `data-dayIndex`/`data-slotIndex`/`data-start`/`data-end` — **no role, no tabindex**. Timeline: `role="gridcell"` + `tabindex="-1"` (lines 174–176). Month/year: no role/tabindex. | `views/week-view.ts:102`, `views/day-view.ts:85`, `views/timeline-view.ts:174–176`, `views/month-view.ts:53` |
| Events in DOM | `role="button"`, `aria-label` from `formatEventAriaLabel()`, roving `tabindex` (selected = 0, others = -1) | `views/{week,day,timeline}-view.ts` event-render loops; `views/base-view.ts:9–19` |
| State manager | Tracks `selectedEvent`, `hoveredSlot` (pointer-only), `previewEvent` (transient drag), `dragState`. **No `focusedCell`. No `selectedRange` outside drag preview.** | `src/state/scheduler-state.ts:16–43` |
| Live announcer | `LiveAnnouncerController` instantiated at `:76`; called on view change (`:256`), event add/update/remove (`:261, 266, 272`), move-mode enter (`:784–786`), nudge (`:821`), commit/cancel (`:835, 842`) | — |

## 5. Pointer → keyboard parity

Every pointer interaction the scheduler currently handles, mapped to its proposed keyboard equivalent. **No new emitted events**; keyboard takes the same code paths.

| # | Pointer action | Today (file:line) | Emits | Keyboard equivalent (this PRD) |
|---|---|---|---|---|
| 1 | Click empty cell | `input-handler.ts:193`, state machine POINTER_UP wasClick | `date-click` | Tab into grid, arrow to cell, Enter (with no selection extent) |
| 2 | Drag empty cells (create event) | `drag-state-machine.ts:152–205` (`operation='create'`); slot resolver `drag-manager.ts:59–78` | `event-create` (id, title="New Event", start/end from preview) | Arrow to start cell → Shift+Arrow to extend → Enter |
| 3 | Click existing event | `input-handler.ts:183–190`; selection in `mp-scheduler.ts:580–581` | `event-click` today → **renamed to `event-selected`** (D3) + `selection-change` | Tab to event (events tabbable, §6.5). Tab fires both `selection-change` and `event-selected` for full mouse parity. Event `Enter` is **reserved for move-mode entry** (§6.6). |
| 4 | Drag event body (move) | `drag-state-machine.ts:363` (`operation='move'`); pixel-to-slot via `elementsFromPoint` (`mp-scheduler.ts:867–874`) | `event-update` (event, oldEvent, originalEvent) | Tab to event → Enter → Arrow keys nudge → Enter to commit |
| 5 | Drag top/bottom edge (resize) | Resize handle `data-handle` (`day-view.ts:211–216`, `week-view.ts:280–285`); `drag-state-machine.ts:360–361` (`resize-start` / `resize-end`) | `event-update` | In move-mode: **Shift+Arrow** resizes (Shift+ArrowUp shrinks end / Shift+ArrowDown grows end on a vertical-time view); Alt+Shift+Arrow resizes start edge instead of end (§6.6) |
| 6 | Drag across resources (timeline view) | `views/timeline-view.ts:131–196`; resourceId from row | `event-update` | In move-mode on timeline: Arrow Up/Down moves to prev/next resource row |
| 7 | Cross-day drag (week/month) | `elementsFromPoint` finds slot in any day | `event-update` | In move-mode on week/day: Arrow Left/Right moves event by 1 day; Up/Down moves by `slotDuration` |
| 8 | Double-click event | (out of pointer inventory but emits `event-dblclick`) | `event-dblclick` | Out of scope; users use Enter on cell + Enter on event for the same outcomes |

Cancel parity: Escape always reverts to drag-start state (already implemented for current `M`-mode at `:746–749, 840–843`).

## 6. Design

### 6.1 Tab order — top to bottom

When the user Tabs through `mp-scheduler`:

1. **Header** — prev / today / next buttons (1 stop each, exists today).
2. **View switcher** — first toggle button is the only Tab stop; ArrowLeft/Right between view buttons (precedent: `mp-tab-control` Tabs pattern). *Existing roving on view switcher to be added in this PRD if not present.*
3. **Grid body** — exactly **one** Tab stop, lands on the focused cell (`tabindex="0"`). Arrow keys then navigate cells *within* the grid; they do not exit it. Tab from the grid moves to the next region (the events list).
4. **Events list** — each event is a Tab stop in document order (document order = sort by start time within view). Roving is **not** used here — the user explicitly asked for events to be in the regular Tab order. (Arrow keys on a focused event do nothing in v1; future work could add inter-event arrows, but Tab is sufficient.)
5. **Out** — focus leaves the component.

This means: Tab into grid → arrow around cells → Tab → first event → Tab → next event → ... → Tab out. Exiting the grid mid-arrow-nav is one Tab. Returning to the grid restores the previously focused cell.

### 6.2 Cell focus model

**State changes:**

```ts
// scheduler-state.ts — add to SchedulerState
focusedCell: CellRef | null;     // null until grid first focused
selectionAnchor: CellRef | null; // null when no selection
selectionExtent: CellRef | null; // === focusedCell while selection active
```

```ts
// new type in scheduler-state.ts (or co-located with view types)
type CellRef = {
  view: 'day' | 'week' | 'timeline';
  dayIndex: number;        // 0..6 for week; 0 for day; ignored for timeline
  slotIndex: number;       // 0..(slotsPerDay-1)
  resourceId?: string;     // timeline only
};
```

Stable IDs per cell — required so Lit re-renders don't drop focus (precedent: calendar `cellId()` at `calendar.component.ts:55`). Format: `{instanceId}-cell-{view}-{day}-{slot}[-{resource}]`.

**Render — each view's slot loop:**

```ts
const isFocused = cellEquals(state.focusedCell, ref);
const inSelection = isInSelection(state.selectionAnchor, state.selectionExtent, ref);
return html`
  <div
    id=${cellId(ref)}
    class="scheduler-time-slot${inSelection ? ' selected' : ''}"
    role="gridcell"
    tabindex=${isFocused ? 0 : -1}
    aria-selected=${inSelection ? 'true' : 'false'}
    data-dayIndex=${ref.dayIndex}
    data-slotIndex=${ref.slotIndex}
    data-start=${ref.start.toISOString()}
    data-end=${ref.end.toISOString()}
  ></div>`;
```

**Focus restoration after re-render:** in `mp-scheduler.updated()`, after a state change that moved `focusedCell`, run `this.shadowRoot.getElementById(cellId(state.focusedCell))?.focus({preventScroll: false})`. Scroll-into-view is desirable when the focused cell is off-screen (auto-pan parity with mouse drag).

**Initial focus when grid first Tabbed into:** `focusedCell` falls back (in order):
1. The cell containing `selectedEvent.start`, if any.
2. The cell at "now" if `now` lies within the view.
3. The first cell of the view (top-left).

### 6.3 Selection model — linear time-range (resolved D1)

A selection is a **contiguous time-range** `[start, end)` represented by two `Date` instants. It does **not** track columns directly; it spans whatever cells lie inside that range, possibly crossing day boundaries (week view) or staying within one resource row (timeline).

```ts
// scheduler-state.ts (refined)
selectionAnchor: Date | null;   // the time the user first held Shift
selectionExtent: Date | null;   // the time the user has navigated to
// derived: selection start = min(anchor, extent), end = max(anchor, extent)
// On timeline view, also: selectionResourceId: string | null  // pinned at anchor
```

| Operation | Semantics |
|---|---|
| `Arrow*` (no Shift) | Move `focusedCell`. **Clears** any selection (`selectionAnchor = selectionExtent = null`). |
| `Shift+Arrow*` | If no selection: set `selectionAnchor = focusedCell.start` (and pin `selectionResourceId` on timeline). Then move `focusedCell` and set `selectionExtent = focusedCell.start`. If selection exists: just move `focusedCell` and update `selectionExtent`. |
| `Shift+ArrowRight` at right-most column (week view, Friday 14:00) | Extent jumps to **Saturday 14:00**; the selection now spans `[Fri 14:00, Sat 14:00)` — every slot in between, *across the day boundary*, gets highlighted. Matches mouse-drag behaviour today (a drag from Fri 14:00 → Sat 14:00 paints the same continuous range). |
| `Shift+ArrowLeft` at left-most column (week view, Sunday 14:00) | Symmetric: extent jumps to Saturday-prior 14:00; range expands backwards across the boundary. |
| `Shift+ArrowRight/Left` on timeline view | **Ignored.** Timeline columns are resource (categorical), not time. Cross-resource selection has no mouse equivalent and would emit ambiguous `event-create` payloads. |
| `Shift+ArrowRight/Left` on day view | N/A — day view has no horizontal column axis. |
| `Escape` (with selection, not in move-mode) | Clear selection. Keep `focusedCell`. |

**Selection rendering:** for each cell, compute `inSelection(start, end, cellRef)` by intersecting the cell's `[start, end)` with the selection range. If overlap > 0, the cell gets `.selected` + `aria-selected="true"`. CSS already has `.scheduler-time-slot.selected` styling for the drag preview — reuse it. On week view this naturally lights up Friday 14:00 → 23:30 plus Saturday 00:00 → 14:00 when the selection crosses Friday→Saturday.

**Enter on a multi-day selection:** emits `event-create` with `start = selectionStart`, `end = selectionEnd`, identical to dragging across the same range. The new event's resource (timeline) is taken from `selectionResourceId`.

### 6.4 Cell keymap (focus is on a cell)

| Key | Action | Live announcement |
|---|---|---|
| `ArrowDown` | Move focus 1 slot later in time | `"{day}, {time}"` |
| `ArrowUp` | Move focus 1 slot earlier | same |
| `ArrowRight` (week/timeline) | Move focus to next column (next day / next resource) | `"{day}/resource, {time}"` |
| `ArrowLeft` (week/timeline) | Previous column | same |
| `Home` | First slot of the day at the same column | `"{day}, start of day"` |
| `End` | Last slot | `"{day}, end of day"` |
| `PageDown` | Same time of day, +1 day (week)/+1 resource (timeline) | `"{day}/resource, {time}"` |
| `PageUp` | -1 day / -1 resource | same |
| `Ctrl+Home` | First cell of the view (Sun 00:00 on week) | `"{day}, start of week"` |
| `Ctrl+End` | Last cell | `"{day}, end of week"` |
| `Shift+<any of the above>` | Same movement, but extend `selectionExtent` instead of clearing | `"Selection: {start time}–{end time}, {N} slots"` |
| `Enter` | If selection: emit `event-create` with `start = selectionStart`, `end = selectionEnd`. Then clear selection, focus the newly-created event. If no selection: emit `event-create` with `start = focusedCell.start`, `end = focusedCell.end` (1-slot event), same focus follow-through. (Parity with click-empty-cell + drag-1-slot.) | `"Event created: {start time}–{end time}, {date}"` |
| `Escape` | Clear selection if any; otherwise no-op (don't unfocus the grid) | (silent if no-op) |
| `Delete` / `Backspace` | No-op on a cell | — |
| `Alt+T` / `Alt+Y` / `Alt+W` / `Alt+D` | Switch to today / year / week / day view (resolved D2). **Replaces** the current bare-letter bindings at `mp-scheduler.ts:715–738`; bare T/Y/W/D become available for future surfaces. Breaking change. | `"View changed to {view}."` (existing announcer call site) |

ArrowLeft/Right's current binding (prev/next period) **is reassigned** to PageUp/PageDown for view-level navigation (which APG calendars already use). Keep PageUp/PageDown unbound today; this PRD claims them. The previous `M` shortcut for switching to month view (also at `:725–728`) is removed entirely — `M` no longer has any meaning on a focused cell or event (resolved D2 + D4); month view is reached via `Alt+M`? — *no*: only T/Y/W/D get Alt-shortcuts in v1. Month and year views switch only via the header view-switcher, since they're less time-critical than today/this-week. (Confirm in implementation review if Alt+M / Alt+Y are wanted; D2's resolution covers T/Y/W/D verbatim — Y already covers year, so M-for-month is the only one missing from the Alt set. Adding `Alt+M` is a trivial extension.)

### 6.5 Event keymap (focus is on an event)

**Custom event rename — `event-click` → `event-selected` (resolved D3).** The existing `event-click` custom event is renamed library-wide to `event-selected`. Reason: with keyboard Tab now firing the same notification, "click" no longer describes the trigger. `event-dblclick` is *not* renamed (still pointer-only). Affects:

- `src/events/scheduler-event-emitter.ts` (emitter method + dispatched event name)
- `src/events/event-types.ts` (type definitions)
- `mp-scheduler.ts` Lit reflection (any `@event` JSDoc)
- Angular wrapper `bs-scheduler` — `(eventClick)` → `(eventSelected)` output
- Demo: `apps/ng-bootstrap-demo/src/app/pages/enterprise/scheduler/scheduler.component.{ts,html}`
- Tests: `mp-scheduler.aria.spec.ts`, any pointer-driven specs that listen for `event-click`

Public API breaking change. Per memory *BC is not a default constraint*, no shim — single changelog line.

When Tab lands on an event block:

- The event becomes the `selectedEvent` automatically (Tab = select). **Both** `selection-change` and `event-selected` fire, with the same payload mouse-click would have produced (resolved D3). Mouse and keyboard reach parity.
- Visible focus ring (existing `.selected` style + browser default `:focus-visible`).
- Live announcer: full event aria-label is read by SR via `aria-label` already; no explicit announce needed on Tab.

| Key | Action | Live announcement |
|---|---|---|
| `Enter` | Enter move-mode (§6.6). Replaces today's `M` binding. | `"Move mode: {title}, {start}–{end}. Arrows nudge by {slotDuration} minutes; Shift+Arrow resizes; Enter commits; Escape cancels."` |
| `Delete` / `Backspace` | Emit `event-delete` (already implemented at `:740–744`). | `"Event deleted: {title}"` |
| `Escape` | Tab-out of events list, restore focus to grid's last `focusedCell`. | (silent) |
| `M` | **Removed** (resolved D4 — no alias). | — |
| Arrow keys | No-op in v1. (Future work: ArrowLeft/Right between events.) | — |

### 6.6 Move-mode keymap (focus is on an event, mode active)

Replaces the current `M`-entry path with `Enter`. Internal state remains `keyboardMove` at `mp-scheduler.ts:759–765`. The existing implementation (nudge ± `slotDuration`, commit, cancel, live announce) is preserved — the new keys are layered on top.

| Key | Action |
|---|---|
| `ArrowUp` / `ArrowDown` | Move event ± `slotDuration` along the time axis (day/week/timeline). Live: `"Moved to {newStart}–{newEnd}"`. |
| `ArrowLeft` / `ArrowRight` | Day view: ignored. Week view: ± 1 day. Timeline view: ± 1 resource. Live: `"Moved to {date}/{resource}, {time}"`. |
| `Shift+ArrowDown` | Grow end edge by 1 slot (later). Live: `"Resized to {start}–{newEnd}"`. |
| `Shift+ArrowUp` | Shrink end edge by 1 slot (earlier; clamped to start + minDuration). |
| `Shift+ArrowRight` (week view only — resolved D5) | Push event end edge **across the day boundary** into the next day's same time-of-day. E.g. an event ending Fri 16:00 → ends Sat 16:00. Spans the days in between. Symmetric with Shift+ArrowDown but along the column axis. Live: `"Resized to {start}–{newEnd}"`. |
| `Shift+ArrowLeft` (week view only — resolved D5) | Pull event end edge back across the day boundary. Clamped to start + minDuration. |
| `Shift+ArrowLeft/Right` (day view) | N/A — no horizontal axis. |
| `Shift+ArrowLeft/Right` (timeline view) | Ignored. Resource axis is categorical, not temporal. |
| `Alt+Shift+ArrowDown` | Move start edge later (shrink from start). Same clamping. |
| `Alt+Shift+ArrowUp` | Move start edge earlier (grow from start). |
| `Alt+Shift+ArrowLeft/Right` (week view) | Move start edge across the day boundary, mirror of Shift+ArrowLeft/Right. |
| `Enter` | Commit. Emits `event-update` with the same payload shape as drag commit (`event`, `oldEvent`, `originalEvent: KeyboardEvent`). Exit move-mode. Live: `"Move committed."` |
| `Escape` | Revert to original start/end. Exit move-mode. Live: `"Move cancelled."` |
| Any other key | Pass through to the cell-keymap router (so e.g. `Alt+T`-for-today still works). |

### 6.7 Live announcer messages

Centralise in `views/base-view.ts` next to existing `formatEventAriaLabel()`:

```ts
formatCellAnnouncement(ref: CellRef): string;
formatSelectionAnnouncement(anchor: CellRef, extent: CellRef): string;
formatMoveModeEnter(event: SchedulerEvent, slotMinutes: number): string;
formatMoveAnnouncement(event: SchedulerEvent): string;
formatResizeAnnouncement(event: SchedulerEvent, edge: 'start' | 'end'): string;
```

Reuse the existing `LiveAnnouncerController.announce()` (no new infra). Politeness stays `polite` throughout — no `assertive` here; the user is driving every change.

### 6.8 ARIA attribute updates

| Element | New attributes |
|---|---|
| Grid container (existing `role="grid"` in timeline; add to week/day) | `aria-multiselectable="true"` (Shift+arrow extends a multi-cell selection); `aria-activedescendant` *not* used — real `tabindex="0"` on focused cell instead (precedent: calendar). |
| Cell (`role="gridcell"`, retrofit on week/day) | `tabindex="0"` if focused, else `-1`; `aria-selected="true"` if in selection range, else `"false"`; deterministic `id` (§6.2). |
| Event block (existing `role="button"`) | `aria-pressed="true"` while in move-mode (precedent: tile-manager M-mode); deterministic `id` for focus restoration after re-render. |
| Hidden instructions div in shadow root | `<div id="{instanceId}-keymap" hidden>Press Arrow keys to navigate cells, Shift+Arrow to extend selection, Enter to create or move, Escape to cancel.</div>`; grid carries `aria-describedby="{instanceId}-keymap"`. (Precedent: tile-manager Phase 3.4.) |

## 7. Precedent table

Every key binding in §6 ties back to an existing pattern on this branch. Cited so reviewers don't have to dig.

| Concern | Source pattern | File:line |
|---|---|---|
| Roving tabindex on a 2D grid (single `tabindex=0`, others -1, restore via `id` after re-render) | `bs-calendar` APG Date Picker (commit `4d442375`) | `libs/.../calendar/src/calendar.component.ts:45–57, 124–149, 199–219` |
| Arrow keys + Home/End + PageUp/Down keymap on a grid | same | `calendar.component.ts:157–197` |
| Shift+arrow to extend a range selection (anchor + extent) | (no precedent in this repo — APG Grid pattern, multi-select section) | n/a — new |
| Move-mode state object (`{ original, working }` pattern) | `mp-scheduler.ts` (commit `614fb0fe`) and `mint-tile-manager.element.ts` (commit `0d2f25b1`) | `mp-scheduler.ts:759–765`; `tile-manager:847–880` |
| Enter to commit / Escape to cancel move-mode | scheduler M-mode (`614fb0fe`), tile-manager (`0d2f25b1`), dock pane (`32ca12b7`) | as above + `mint-dock-manager.element.ts:3836–3871` |
| Shift+arrow to resize (edge nudge) | tile-manager (`0d2f25b1`) — Shift+arrow nudges colSpan/rowSpan | `tile-manager.element.ts:847–880` |
| `aria-pressed` on a button entering a transient mode | tile-manager M-mode | same |
| Live announcer template + `announce()` API | `LiveAnnouncerController` (`e1e85bf3`) | `libs/.../web-components/a11y/src/live-announcer.ts:44–61, 64–72` |
| `aria-describedby` for keymap discoverability | tile-manager Phase 3.4 (`wc-aria-accessibility.md` §7) | `wc-aria-accessibility.md:220` |
| Demo page shows keymap | memory: *demo pages must show keymap* | `wc_aria_decisions.md` |

What's **new** with this PRD (no precedent on this branch): cell-level Shift+arrow range-selection on a 2D grid, and the `selectionAnchor`/`selectionExtent` state shape. APG Grid pattern's "selectable cells" section is the external reference.

## 8. Phased plan — 1–2 PRs

**Phase A (this PRD's primary PR):**
1. Add `focusedCell`, `selectionAnchor`/`selectionExtent` (linear `Date` instants per D1), and on timeline `selectionResourceId` to `SchedulerStateManager`.
2. Retrofit `role="gridcell"` + roving `tabindex` + deterministic `id` on cells in `week-view.ts` and `day-view.ts`. (`timeline-view.ts` already has the role + `tabindex="-1"`; just add `id` and toggle to `0` on the focused cell.)
3. New `handleGridKeyDown()` branch in `mp-scheduler.ts` covering §6.4 cell keymap. Hook focus restoration in `updated()`. Reassign T/Y/W/D to `Alt+T/Y/W/D` (D2). Remove the bare `M`-for-month-view shortcut.
4. Selection rendering: extend existing `.selected` CSS to cover `aria-selected="true"` cells; ensure cross-day spans (D1) light up correctly across the day-boundary divider.
5. Tab-into-events: change events' roving `tabindex` to **all events `tabindex="0"`**. Update `mp-scheduler.aria.spec.ts:127–142` (tabindex assertion needs to flip).
6. **Rename `event-click` custom event to `event-selected` library-wide (D3).** Update emitter, types, Lit `@event` JSDoc, Angular wrapper output binding, demo page, and existing tests. Tab on event fires both `selection-change` and `event-selected`.
7. Replace `M`-on-event with `Enter`-on-event for move-mode entry (D4 — no alias). Update existing tests at `mp-scheduler.ts:700–703` and the spec assertions.
8. Extend move-mode with §6.6 ArrowUp/Down (time nudge), Shift+ArrowDown/Up (end-edge resize), Alt+Shift+ArrowDown/Up (start-edge resize), week-view Shift+ArrowLeft/Right (D5 — end edge across day), Alt+Shift+ArrowLeft/Right (start edge across day), timeline ArrowUp/Down (resource shift).
9. **Auto-scroll on off-screen arrow-nav (D6).** When arrow movement (cell focus or move-mode nudge) places the focused element outside the scroll viewport, scroll the scheduler's scrollable container so it's visible. Reuse the existing pan logic from `scheduler-improve-pan.md` — both pointer drag-near-edge auto-pan and arrow-key off-screen scroll route to the same helper.
10. Live-announcer additions (formatters in `base-view.ts`).
11. Demo page: keymap legend below the scheduler, matching memory rule.
12. Tests: `mp-scheduler.keyboard.spec.ts` covering each row of §5's parity table — assert keyboard path emits the same custom event with the same payload as the pointer path. Includes a cross-day-Shift+Arrow case (D1) and a cross-day-resize case (D5).

**Phase B** ✓ shipped `ae8653da` via [`scheduler-controlled-selection.md`](./scheduler-controlled-selection.md):
- ✓ `month-view` ArrowLeft/Right ±1 day, ArrowUp/Down ±7 days, cross-month auto-advance (APG date-picker pattern).
- ✓ `year-view` ArrowLeft/Right ±1 month, ArrowUp/Down ±3 months, cross-year auto-advance.
- ✓ ArrowLeft/Right between focused events — walks events in start-time order, no wrap.

## 9. Acceptance criteria

A keyboard-only user must be able to:

1. Tab into the scheduler, reach the grid body in ≤3 Tabs.
2. Arrow to any cell in the current view; the focused cell has a visible focus ring and a live-region announcement on each move.
3. Shift+Arrow to grow a selection to N adjacent slots, **including across day boundaries on week view** (D1); the live region announces total range.
4. Enter to create an event from the selection (or single cell); selection clears, focus moves to the new event, `event-create` fires with `start`/`end` matching mouse-drag-create for the same slots — including a multi-day drag.
5. Tab through every existing event in the view in document order; each event gets a focus ring + reads its `aria-label`. Tab fires both `selection-change` and `event-selected` (D3).
6. On a focused event: Enter to enter move-mode; Arrow keys move; Shift+Arrow resizes (including cross-day end-edge resize on week view, D5); Alt+Shift+Arrow resizes the start edge; Enter commits; Escape cancels. `event-update` payload identical to pointer-drag-move/resize for the same delta.
7. Delete / Backspace on a focused event emits `event-delete`.
8. Escape from move-mode reverts working state; Escape from selection clears it; Escape from a focused event tabs back to the cell grid.
9. **Arrow nav off the visible viewport scrolls the scheduler's scrollable container so the focused cell stays in view** (D6).
10. `Alt+T` jumps to today; `Alt+W/D/Y` switch view (D2). Bare T/Y/W/D no longer fire shortcuts.
11. Demo page shows the keymap legend including the new `Alt+letter` bindings.
12. All Phase 5/6 tests in `mp-scheduler.aria.spec.ts` still pass after the `event-click` → `event-selected` rename and tabindex flip.
13. `axe-core` reports no new violations on `/enterprise/scheduler`.
14. **Public API breaking changes documented in CHANGELOG:** `event-click` → `event-selected`; `M`-on-event removed; bare T/Y/W/D removed; `event-click` Angular output renamed to `event-selected`.

## 10. Decisions (resolved 2026-05-10)

- **D1 — Cross-column Shift+Arrow:** Selection is a **linear time-range, not a 2D rectangle**. Shift+ArrowRight at the right-most slot of a column (week-view Friday 14:00, or last resource in timeline) extends the selection's `end` to the equivalent slot in the next column; *all slots in between get highlighted*, matching the way a mouse drag from Fri 14:00 → Sat 14:00 paints a continuous range across the day boundary today. See §6.3 for the revised model. Cross-column is allowed in week view only; timeline columns are categorical (resource), not temporal — Shift+ArrowDown across resources stays a same-row time extension; Shift+ArrowRight across resources is ignored (Open question previously about timeline resolved here as well).
- **D2 — Letter shortcuts require Alt:** `T`/`Y`/`W`/`D` (today / year / week / day) become **`Alt+T` / `Alt+Y` / `Alt+W` / `Alt+D`**. Frees single letters for any future surface inside the scheduler (event search, inline title edit) and removes the modal awkwardness of a bare letter changing the view while a cell is focused. Breaking change; document in changelog.
- **D3 — Tab on event emits both selection-change and event-selected, and `event-click` is renamed to `event-selected` library-wide:** keyboard reaches mouse-parity (focus-then-click semantics rolled into one). The custom event `event-click` is renamed to `event-selected` because the new behaviour fires on Tab focus too — "click" no longer describes it. See §6.5 and §11. Public API breaking change; document. `event-dblclick` is *not* renamed (still pointer-only, double-click semantics).
- **D4 — No `M` alias:** clean break per *BC is not a default constraint* memory. Single changelog line.
- **D5 — Shift+ArrowLeft/Right in move-mode (week view):** extends the event's **end edge across the day boundary**. Shift+ArrowRight = end edge into next day; Shift+ArrowLeft = end edge into previous day (clamped to start + minDuration). Symmetric with Shift+ArrowDown (which grows the end by one slot in time). `Alt+Shift+ArrowLeft/Right` does the same to the **start** edge. Day view: ignored (no horizontal). Timeline view: ignored (horizontal is resource axis).
- **D6 — Auto-scroll on arrow-nav off-screen ships in Phase A:** keyboard-only users get a fully usable scheduler in the same PR. Reuse the existing pan logic from `scheduler-improve-pan.md` — both pointer drag-near-edge auto-pan and arrow-key off-screen scroll route to the same `scrollIntoView`-style helper.

## 11. Related files

**Scheduler WC core:**
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/components/mp-scheduler.ts` — keydown router, move-mode, focus restore.
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/state/scheduler-state.ts` — new state fields.
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/views/base-view.ts` — coordinate helpers, announcer formatters.
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/views/{day,week,timeline}-view.ts` — cell + event render.
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/styles/scheduler.styles.ts` — `:focus-visible` ring on cells, selection outline.
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/components/mp-scheduler.aria.spec.ts` — existing tests; rewrite tabindex assertions for events.
- New: `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/components/mp-scheduler.keyboard.spec.ts`.

**Demo:**
- `apps/ng-bootstrap-demo/src/app/pages/enterprise/scheduler/scheduler.component.{ts,html,scss}` — keymap legend block.

**Precedent (read-only references):**
- `libs/mintplayer-ng-bootstrap/calendar/src/calendar.component.ts` — grid roving + keymap.
- `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/web-components/mint-tile-manager.element.ts` — M-mode state, Shift+arrow resize, `aria-describedby` keymap.
- `libs/mintplayer-ng-bootstrap/web-components/a11y/src/live-announcer.ts` — `LiveAnnouncerController`.

**Companion PRD updates:**
- After this PRD is implemented, fold a 1-line "Phase 5/6 extension landed in `scheduler-keyboard-grid-nav.md`" note into `wc-aria-accessibility.md` §7 so the master tracker stays current.
