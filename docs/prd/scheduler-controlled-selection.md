# PRD: `mp-scheduler` — controlled selection + Phase B keyboard nav (month/year/inter-event)

**Status:** **Implemented.** Both commits landed on `feat/aria-accessibility`: (1) `2b275e78` — controlled-selection refactor; (2) Phase B nav (this commit). Browser-verified end-to-end.
**Author:** Pieterjan (with research input from a Claude exploration team)
**Date:** 2026-05-11
**Library:** `@mintplayer/ng-bootstrap/web-components/scheduler` (Lit WC) + `@mintplayer/ng-bootstrap/scheduler` (Angular wrapper)
**Branch context:** follows `9ae72107` (Phase A keyboard grid nav). Replaces the deferred §8 Phase B in [`scheduler-keyboard-grid-nav.md`](./scheduler-keyboard-grid-nav.md) — the original Phase B framing assumed Enter on a cell auto-creates an event, which this PRD reverses.

---

## 1. Why now

Today the scheduler imposes default behaviour on two distinct gestures: pointer drag and `Enter` on a non-empty selection. Both paths internally call `stateManager.addEvent(...)` (defaulting `title: 'New Event'` and `color: '#3788d8'`), then emit `event-create`, then `clearSelection()`, then auto-focus the new event. The demo's `onEventCreate` mirrors the constructed event into its own `events` signal — so the same record is created twice (once internally, once by the consumer), and any consumer that wants a different default title or that needs to gate creation on a permission check has to fight the WC.

The user explicitly flagged this as imposing functionality that doesn't belong in the primitive: "creation of the event, and deselection should probably be done in the app demo-component. clicking / shift-key / arrow-keys can move the single-selected cell or expand the selection".

The keyboard side already works closer to the desired model — arrows + Shift+arrows update `selectionAnchor` / `selectionExtent` without creating anything. The pointer side is the inconsistent one. Fixing that consistency is also a precondition for Phase B (month/year nav): once `Enter` on a cell is "request creation" rather than "create", the same wiring extends naturally to `Enter` on a month-day or year-month — no view-specific drilling vs. creating logic to design.

## 2. Goal

Make `mp-scheduler` a **controlled primitive**: the WC owns selection and focus state and emits semantic events when the user moves either; the consumer owns the events array and decides when (and whether) to mutate it in response. Concretely:

- Pointer drag, keyboard arrows, and `Shift`+arrows all update the time-range selection — and only the selection.
- `selection-change` is the canonical "the selection just changed" event, with a payload that carries the new range.
- `event-create` becomes a **request** event: it fires when the user explicitly commits a selection (Enter, drag-end on a non-empty selection) and carries the selection range. It does **not** mutate scheduler state. The consumer wires it up, picks defaults, decides whether to actually create.
- `clearSelection()` is no longer auto-called after a commit — the consumer clears the selection if they want to.

This is a breaking change. Per `feedback_breaking_changes_ok` it ships without a shim; the demo and any downstream consumers update in the same commit.

## 3. Scope

**In scope:**

- The drag-end + `Enter` paths in `mp-scheduler.ts` (`finishDrag` `case 'create'` at ~`:607`; `createEventFromCellOrSelection` at `:1107`).
- `selection-change` payload extension to carry the time-range.
- `event-create` payload change from `{ event: SchedulerEvent }` to `{ range: TimeRange, resourceId?: string, originalEvent: Event }`.
- Demo updates (`scheduler.component.ts` + html) so the page still demonstrates create-on-drag, just wired in the consumer rather than the WC.
- Tests that asserted the WC's internal `addEvent` after a gesture (`mp-scheduler.keyboard.spec.ts` `'Enter on a focused cell with no selection emits event-create…'` and any drag-end equivalents) — rewritten to assert the request-only contract.
- Phase B (after the refactor lands): month-view + year-view arrow nav, inter-event arrow nav.

**Out of scope (deliberate):**

- `event-update` (drag-move + drag-resize). The same imposition pattern exists there (`stateManager.updateEvent` at `:631`), but updates are operationally different from creates: the consumer's events array already contains the record; the WC just signals where it should move to. Revisiting `event-update` symmetry is a separate PRD if alignment with the new create model becomes desirable. Flag in §7.
- `event-delete`. Already a notification only — the WC does not call `stateManager.removeEvent`; consumer mutates.
- The Angular wrapper API (`@mintplayer/ng-bootstrap/scheduler`). Output names stay (`(eventCreate)`, `(selectionChange)`); only payload shapes change.
- A "selection model" input that lets the consumer push selection back into the WC (controlled selection in the React sense). The WC stays the owner of selection state; the consumer just observes.

## 4. Refactor design (commit 1)

### 4.1 Selection-change payload

Extend the `'selection-change'` discriminated-union arm in `event-types.ts` (currently `:47–49`):

```ts
| {
    type: 'selection-change';
    /** The currently single-focused event, or null. Unchanged from before. */
    selectedEvent: SchedulerEvent | null;
    /**
     * The time-range selection (anchor → extent), or null when the user has
     * no active range selection (initial state, or after Esc / explicit
     * clear). Fires on every transition — including the transition to null,
     * so consumers can clear derived UI without polling.
     */
    range: TimeRange | null;
    /**
     * Resource the selection is pinned to, on timeline view. Undefined on
     * other views.
     */
    resourceId?: string;
    /** View that produced the selection (for view-conditional consumers). */
    view: ViewType;
  }
```

`TimeRange` is `{ start: Date; end: Date }`, the same shape returned by `selectionRange(state)` in `base-view.ts`. Add it to `event-types.ts` so consumers don't have to reach for an internal type.

The existing `selectedEvent` field stays — Tab-on-an-event still fires `selection-change` with `selectedEvent: <event>` and `range: null`, matching Phase A's D3 decision.

### 4.2 Event-create payload (BC)

Replace the current `{ event: SchedulerEvent; originalEvent: Event }` shape with the request shape:

```ts
| {
    type: 'event-create';
    /** Range the user committed (drag-end on a fresh range, or Enter). */
    range: TimeRange;
    /** Resource this commit targets, on timeline view. */
    resourceId?: string;
    /** View the gesture happened in. */
    view: ViewType;
    /** Underlying browser event for keyboard/pointer interop. */
    originalEvent: Event;
  }
```

Rationale: the WC can no longer construct a `SchedulerEvent` because it doesn't know the consumer's id-generation strategy, default title, default colour, or required custom fields. Handing the consumer the *range* instead of a half-baked event is the cleaner contract.

`emitEventCreate` in `scheduler-event-emitter.ts` updates accordingly. The Angular wrapper's `SchedulerEventCreateEvent` type is regenerated and re-exported.

### 4.3 Removed internal calls

Both `finishDrag.case 'create'` (mp-scheduler.ts:607) and `createEventFromCellOrSelection` (mp-scheduler.ts:1107) drop:

- `this.stateManager.addEvent(newEvent)` — no internal mutation.
- `this.stateManager.clearSelection()` — selection persists past commit; consumer clears.
- The `requestAnimationFrame(() => …el?.focus())` block — there is no new event to focus.

The methods become tight: derive the range, emit `event-create` with it, return.

The live-announcer line (`Event created: …`) changes to "Selection committed: …" or similar — it announces the gesture, not a creation that may not happen.

### 4.4 Demo updates (`scheduler.component.ts` + .html)

`onEventCreate` becomes the place that does what the WC used to do internally:

```ts
onEventCreate(event: SchedulerEventCreateEvent) {
  const newEvent: SchedulerEvent = {
    id: generateEventId(),
    title: 'New Event',
    color: '#3788d8',
    start: event.range.start,
    end: event.range.end,
    ...(event.resourceId ? { resourceId: event.resourceId } : {}),
  };
  this.events.update((events) => [...events, newEvent]);
  this.log(`Event created: …`);
}
```

If the demo wants the old auto-clear-on-commit behaviour, it explicitly toggles a "selection cleared after commit" flag or calls a public `clearSelection()` API on the WC. The keymap legend (`scheduler.component.html:10`) updates from "emits `event-create` spanning the range" to "fires `event-create` request — the demo turns it into a stored event".

### 4.5 Tests (commit 1)

Rewrite the impacted cases in `mp-scheduler.keyboard.spec.ts`:

- `'Enter on a focused cell … emits event-create spanning that single cell'` — assert the *event* fires with `{ range: { start, end } }`. Drop the assertion that `stateManager.events` grew by one (no longer true).
- Add `'Enter on a focused cell does NOT mutate the WC's events array'` — pin the new contract.
- Add `'drag-end on a fresh range emits event-create with the range payload, leaves selection intact'`.

`mp-scheduler.aria.spec.ts` is unaffected (ARIA roles + tab reachability don't depend on creation behaviour). The Playwright e2e (no scheduler e2e currently) is unaffected.

## 5. Phase B nav (commit 2 — built on the refactored selection model)

Phase B has three pieces; they all become trivial layers on top of commit 1.

### 5.1 Month-view arrow nav (`views/month-view.ts`)

Cell rendering today (`:51–78`) emits a plain `.scheduler-month-day` div with no role / tabindex / id. Change to:

```ts
cell.setAttribute('role', 'gridcell');
cell.setAttribute('tabindex', '-1');                 // roving
cell.setAttribute('aria-selected', 'false');
cell.id = `${this.instanceId}-cell-month-${isoDate(date)}`;
```

State (`scheduler-state.ts`): add `focusedDate: Date | null`. Used by month + year (year tracks the focused month's first day).

Arrow handling lands in `mp-scheduler.handleCellKeyDown` — when `state.view === 'month'`:

- **ArrowLeft / ArrowRight** → focusedDate ± 1 day.
- **ArrowUp / ArrowDown** → focusedDate ± 7 days.
- **Home / End** → first / last day of the displayed month (or week, TBD §7).
- **Crossing the displayed month** → the focused date moves into the previous/next month, the host's `state.currentDate` mutates so the view re-renders, and focus is restored on the new cell. Per the user's confirmed answer in this conversation: arrow keys auto-advance the view (APG Date Picker pattern).
- **Shift+arrow** → no day-range selection in this PRD (per user's third answer in this conversation: navigation-only). Reconsider in a follow-up if requested.
- **Enter** → fires `event-create` with `range: { start: dayStart, end: dayEnd }` per §4.2. Consumer decides what creating "an all-day event for that date" looks like. No drilling-down to day-view; if the consumer wants that, they can switch view in their `onEventCreate` handler.

### 5.2 Year-view arrow nav (`views/year-view.ts`)

Year-view today (`:70–91`) renders a `.scheduler-mini-day` per day inside each `.scheduler-mini-month` card. The Phase B focus model is per *month*, not per day — pressing arrows in year-view walks months, not individual days.

- ArrowLeft / ArrowRight → focusedMonth ± 1 month.
- ArrowUp / ArrowDown → focusedMonth ± 3 months (visual grid is 4×3 / 3×4 — match the layout).
- Crossing the displayed year → auto-advance.
- **Enter** → fires `event-create` with `range: { start: monthStart, end: monthEnd }`. Consumer decides.

The roving target is the `.scheduler-mini-month` card, not the day cells. Day cells stay non-tabbable in year-view.

### 5.3 Inter-event arrow nav (events list)

Phase A made every event a Tab stop (`tabindex="0"`, doc order). Phase B adds ArrowLeft / ArrowRight to walk to the previous / next event in the same view's natural sort order (start time, then track). No wrap at the ends — matches list / feed pattern (APG). Tab order is unchanged.

Wire in `mp-scheduler.handleEventKeyDown` (`:802–821`). `state.events` is sorted via `timelineService.filterByRange()` per view; expose a small helper `getEventOrderForView(view): SchedulerEvent[]` so the dispatcher can find the focused event's index and pick the next.

### 5.4 Demo + keymap

Add three lines to the keymap legend (`scheduler.component.html:3–16`):

- "**Month nav**: arrow keys walk days; crossing month boundary auto-advances the view."
- "**Year nav**: arrow keys walk months; crossing year boundary auto-advances."
- "**Event nav**: with focus on an event, ArrowLeft / ArrowRight walks to the previous / next event."

### 5.5 Tests (commit 2)

New cases in `mp-scheduler.keyboard.spec.ts`:

- Month: ArrowLeft on day-1 advances to previous month and refocuses last day; ArrowDown on a mid-month day moves to same weekday next week.
- Year: ArrowRight on December advances to next year, focuses January; ArrowDown moves three months forward.
- Inter-event: focus event A → ArrowRight → focus on event B (the next event in start-time order); ArrowLeft on the first event is a no-op.
- Enter on month-day fires `event-create` with the day's full-day range.

## 6. Acceptance criteria

For commit 1:

1. Pointer drag-create on week / day / timeline does **not** mutate `mp-scheduler`'s internal events list, does **not** clear the selection, does **not** focus a new event. It fires `event-create` with the dragged range.
2. Keyboard `Enter` on a non-empty selection: same — fires `event-create`, leaves selection intact. Same for `Enter` on a focused cell with no active selection (single-cell range).
3. `selection-change` fires with `range: TimeRange | null` on every selection transition, including the transition to null on `Esc`.
4. The demo's `/enterprise/scheduler` page can still create events on drag and on `Enter` — but only because the *demo's* `onEventCreate` handler now does what the WC used to do.
5. All Phase A keyboard tests still pass after their assertions are updated to the new contract; no Phase A behavioural regressions in browser smoke (cell ARIA, move-mode, Shift+arrow selection).

For commit 2 (Phase B):

6. Month-view: ArrowLeft / Right / Up / Down walk days; arrow off the displayed month re-renders the view to the new month. `Enter` on a day fires `event-create` with the day-long range.
7. Year-view: ArrowLeft / Right walk months, ArrowUp / Down ± 3 months. Cross-year auto-advances. `Enter` on a month fires `event-create` with the month-long range.
8. Inter-event ArrowLeft / Right walks events in the view's sorted order; ends are no-ops (no wrap). Tab order is unchanged.
9. Keymap legend in the demo lists all three new behaviours.

## 7. Open questions

1. **Month-view `Home` / `End` semantics.** First/last day of the displayed month, or first/last day of the focused week? APG Date Picker says day-of-week-row. Pick one before commit 2 and document.
2. **Inter-event arrow on a focused event during move-mode.** Probably no-op — the user is moving the event, not navigating to others. Confirm in commit 2's tests.
3. **`event-update` symmetry follow-up.** With the create path decoupled, drag-move and drag-resize remain the only paths where the WC mutates state internally (`stateManager.updateEvent` at mp-scheduler.ts:~631). If consumer-controlled updates are desired (e.g., to validate or reject moves before they apply), draft a follow-up PRD. Out of scope here.

## 8. References

- [`scheduler-keyboard-grid-nav.md`](./scheduler-keyboard-grid-nav.md) — Phase A. This PRD supersedes its §8 Phase B subsection.
- Phase A commit `9ae72107`.
- Live-announcer rollout `7d922135` — selection-change consumers (typeahead, searchbox, etc.) follow the same "scheduler is a primitive that emits, consumer wires" model that this PRD generalises.
- WAI-ARIA Date Picker Dialog pattern (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) for month/year arrow conventions.
