# PRD — Scheduler view-mode completeness

Status: **Implemented.** M1–M10 delivered on this branch — every reported item is
now either fixed or answered-and-built (see the
[plan](./scheduler-view-mode-completeness-plan.md) for the item-level state and
the short list of deliberate follow-ups). Versions bumped for the breaking
changes: web-components 2.5.0, ng-bootstrap 22.9.0, react-bootstrap 19.11.0,
vue-bootstrap 3.12.0.
Branch: `fix/scheduler-preview-z-order` (folds into PR
[#395](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/395) per the
one-PR-per-workstream convention)
Plan: [scheduler-view-mode-completeness-plan.md](./scheduler-view-mode-completeness-plan.md)
Predecessors: [scheduler-resize-glyphs.md](./scheduler-resize-glyphs.md) (#394),
[scheduler-keyboard-grid-nav.md](./scheduler-keyboard-grid-nav.md),
[scheduler-controlled-selection.md](./scheduler-controlled-selection.md)

## 1. Goal

Close the functional gaps across all five scheduler view modes (year / month / week /
day / timeline) so each view is complete rather than partially wired: multi-day drag
feedback, a coherent resource/group model, creation affordances in timeline, a real
read-only story, two-axis timeline scrolling, and resource colour as a first-class
cross-view concept.

This PRD also carries the **already-committed z-order fix** on this branch (§9), so the
PR has a single narrative.

## 2. Reported issues (from the user)

| # | Report | Status |
|---|---|---|
| R1 | Creating an event across multiple days draws a dashed ghost only for the start day | **fixed** (M4), §3 |
| R2 | Events created in week view are invisible after switching to timeline (no events/resources/groups at all) | **fixed** (M2), §4 |
| R3 | Timeline needs affordances to add groups/nested groups, and events by dragging a resource row | **fixed**: drag-create carries its row (M5); add-resource/group bar + per-group add buttons (M8), §5 |
| R4 | Scheduler must be able to be read-only; granular create/move permissions | **fixed** (M7), §6 |
| R5 | Timeline cannot scroll horizontally | **fixed** (M3) — device re-check pending, §7 |
| R6 | Should month/year gain a day-click popup? (opinion requested) | **answered + built**: month yes (popover, M10) / year no — year Enter drills into the month instead, §8 |
| R8 | Timeline compresses overlapping event tracks into a fixed-height row | **fixed** (M12), §11.3 |
| R7 | Decide where resources/groups are relevant; resource colour used across all views, editable in timeline, random initial | **fixed**: colour resolves in every view (M6); in-timeline colour swatch emits `resource-update` (M8); initial colour stays the consumer's (demo ships a palette helper), §4 |

## 3. Multi-day drag feedback (R1) — and four bugs found underneath it

### 3.1 Root cause of R1

A create-drag genuinely spans days — `calculateCreatePreview` is a plain min/max over the
start and current slot (`drag/drag-preview.ts:59-70`), with no day clamping, and week
view stamps each column's slots with that column's own date
(`views/week-view.ts:84-112`). The ghost is single-box **by construction**:
`renderPreviewEvent` locates exactly one column via
`days.findIndex(isSameDay(d, previewEvent.start))` and measures `endMinutes` from the
*start day's* midnight (`views/week-view.ts:356-395`). A 3-day range therefore renders
as one ~2900px-tall box hanging out of the Monday column (the event box is deliberately
`overflow: visible` since #394).

`splitInParts` **already accepts a `PreviewEvent`** and emits one part per day with
`isStart`/`isEnd`/`dayIndex` flags, ids `preview-<n>`
(`scheduler-core/src/services/timeline.service.ts:19-88`) — the exact loop
`renderEvents` uses for committed multi-day events. So the fix is to reuse it, not to
invent a second layout path.

### 3.2 Bugs found in the same code paths (all confirmed by reading + citation)

- **B1 — week view mis-stamps the last slot of each day.** `slotEnd` is rebuilt as
  `new Date(day)` + `slotTemplate.end.getHours()` (`week-view.ts:94-100`). For the
  23:30→24:00 row the template end is *next-day* 00:00, so `getHours()` is `0` and the
  stamped `end` becomes **that day's midnight — 23½ h before its own start**. Any
  create-drag reaching the bottom row has its range collapsed by the `Math.max`. Day
  view uses the raw slot object (`day-view.ts:90-93`) and is immune. *Verified
  first-hand.*
- **B2 — `slotMinTime`/`slotMaxTime` offsets every event box.** Rendered rows start at
  `slotMinTime` (`date.service.ts:113-138`), but event `top` is computed from midnight
  (`week-view.ts:311-319`, `day-view.ts:391-400`). **Worked example** with
  `slotMinTime: '08:00:00'`, `slotMaxTime: '18:00:00'`, default 30-min slots at 40px: the
  grid is 20 rows = 800px tall, and a 09:00 event should sit at row 2 → `top: 80px`. The
  code computes `(540 min / 30) × 40 = 720px` — off by 640px, i.e. near the bottom of a
  grid it should be near the top of. Affects **committed events, not just ghosts**, in
  week and day views. Invisible in the demos only because they use the 00:00–24:00
  default. This is the most severe find in this PRD. *Verified first-hand.*
- **B3 — greyed-slot feedback skips middle days.** `updateGreyedSlots` filters to days
  that are the preview's start *or* end day (`week-view.ts:417-420`), so a 3+ day range
  greys nothing in between; day view bails outright on non-start days
  (`day-view.ts:354`).
- **B4 — ghost vanishes at the week edge.** `dayIndex === -1` returns from
  `renderPreviewEvent` entirely (`week-view.ts:368`), and day view bails unless the
  preview *starts* today (`day-view.ts:387`). Keyboard move-mode nudging past Sunday
  (`mp-scheduler.ts:1616-1634`) therefore loses all feedback instead of clipping.

### 3.2a Prior art: we would be ahead of the field here

Worth knowing before budgeting this: **no surveyed library documents a segmented multi-day
drag ghost.** They avoid the problem instead — FullCalendar's `selectMirror` defaults to
`false`, i.e. "the standard highlighting over each cell" (multi-box for free), and the
single event-shaped mirror is opt-in *and* "only applies to the TimeGrid views";
Syncfusion's drag API exposes one singular "clone" element; Bryntum documents no preview
visualization at all. Google's answer to multi-day in a time grid is to promote the event
out of the grid into the all-day row.

So D3.1 below is **original work with no reference implementation to copy** — justified
because `splitInParts` already does the hard part for committed events and already accepts a
`PreviewEvent`, so we get segmentation for ~free where others would have retrofitted it. But
it should be budgeted as original, and the cheap fallback (per-cell highlighting, which is
inherently multi-box) is the documented escape hatch if the ghost proves fiddly.

### 3.3 Decisions

- **D3.1** `renderPreviewEvent` splits via `timelineService.splitInParts(previewEvent)`
  and renders **one ghost per in-week day part**, appended last in each part's own
  `.scheduler-events-container` (preserving the `$z-preview` layering and the
  last-child invariant the existing specs pin).
- **D3.2** Remove ghosts with `querySelectorAll(...).forEach(remove)` — the current
  `querySelector` (`week-view.ts:358`, `day-view.ts:380`, `timeline-view.ts:420`)
  assumes one.
- **D3.3** Extract the top/height geometry into a single `BaseView` helper shared by
  `createEventElement` and `renderPreviewEvent`, so ghost and committed box can never
  drift again — and fix B2 inside that one helper (offset by `slotMinTime`, clip each
  part to `[slotMinTime, slotMaxTime]` on its own day, drop empty parts).
- **D3.4** Out-of-week parts `continue`, they don't abort the whole ghost (fixes B4).
- **D3.5** Seam borders: suppress `border-bottom` on non-`isEnd` parts and `border-top`
  on non-`isStart` parts so a 3-day range reads as one range, not three events.
- **D3.6** Ghosts never get resize handles (they're `pointer-events: none`).
- **D3.7** Move and resize previews get the same treatment — both can span days
  (pointer via `calculateMovePreview`/`calculateResize*Preview`, keyboard via the ±24h
  horizontal steps of PRD-D5), so this is not create-only.
- **D3.8** Month view has **no** pointer create-drag at all: `analyzeTarget` only
  recognises `.scheduler-time-slot, .scheduler-timeline-slot`
  (`input/input-handler.ts:192-200`), so a month-cell mousedown is `{type:'none'}`.
  Month create is keyboard-only today (Enter → whole-day request, no preview stage).
  Marquee-selecting across month cells is a genuinely different interaction (2-D,
  all-day granularity) — see §8 for the decision on whether it lands here.

## 4. Resource / group model and resource colour (R2, R7)

### 4.1 Root cause of R2 — two independent event sources, not a rendering bug

The hypothesis is confirmed and it's worse than "timeline needs a bucket row":

- **Flat `state.events`** (set via the `events` property, `mp-scheduler.ts:222-228`) is read
  by **week, day, month, year** (`week-view.ts:230`, `day-view.ts:169`,
  `month-view.ts:144`, `year-view.ts:50`).
- **Nested `resource.events`** (set via `resources`, `mp-scheduler.ts:230-236`) is read by
  **timeline only** — and `timeline-view.ts:255` destructures `events` from state then
  **never uses it**, pulling events exclusively from `resource.events`
  (`timeline-view.ts:286`).

So the two views render **disjoint event sets from the same component**. An event created
in week view has no `resourceId` (week view has no resource axis to supply one) and is
structurally unrenderable in timeline — and even *with* a `resourceId` it still wouldn't
show, because timeline never filters the flat list by resource.

Only two retrofits bridge the sources, and both are incomplete:
`getEventById` sweeps both (`mp-scheduler.ts:321-333`) and `updateEvent` double-writes
both (`scheduler-state.ts:210-218`) — but **`addEvent` appends to the flat list only,
even when the event carries a `resourceId`** (`scheduler-state.ts:201-205`), and
**`removeEvent` filters the flat list only**, so a timeline event removed via the public
API keeps rendering (`scheduler-state.ts:223-227`).

Contributing factors, each independently worth fixing:

- **B5 — `PreviewEvent.resourceId` is never set anywhere in `src/drag/`.**
  `mp-scheduler.ts:746-751` passes `result.preview.resourceId` into `emitEventCreate`, so
  **every pointer-drag create emits `resourceId: undefined`**; only the keyboard path
  supplies one (from `focusedResourceId`). Timeline drag-create is therefore broken at the
  data level even where the gesture works.
- **B6 — the demos compound it.** `fillData` populates the two sources *disjointly*
  (ng demo `scheduler.component.ts:114-171` vs `:174-182`), and `onEventCreate` pushes
  **only** to the flat array even when `resourceId` is present (`:198-215`).
- **B7 — React and Vue demos never bind `resources` at all**
  (`SchedulerPage.tsx:124`, `SchedulerView.vue:152-153`), so their timeline view is
  *unconditionally blank* — the feature has never been exercised there.
- **B8 — `resourceService`'s five event mutators are dead code**
  (`resource.service.ts:66,120,139,157,175`), referenced only by their own spec.
- **B9 — the type guards are unsound.** `isResource` is
  `'events' in item || !('children' in item)` (`resource.service.ts:44-53`), so an object
  with *both* `children` and `events` satisfies `isResource` **and** `isResourceGroup`;
  `flatten` dispatches on one and `getAllResources` on the other, silently dropping every
  descendant's events.
- **B10 — `ResourceGroup.collapsed` is never read.** The live source is
  `state.collapsedGroups` (`scheduler-state.ts:61`), so a consumer authoring
  `collapsed: true` is silently ignored.
- **B11 — `Resource.color` and `Resource.eventColor` are read by nothing.** They have
  existed in the model unused; all four views hardcode `event.color ?? '#3788d8'`
  (`week-view.ts:331`, `day-view.ts:250`, `timeline-view.ts:375`, `month-view.ts:199`),
  with a fifth copy of the literal in `drag-manager.ts:185`.
- **B12 — nesting is authoritative, `resourceId` is decorative.** Placement is decided
  purely by which `resource.events` array an object sits in; `resourceId` is read in
  exactly one place (`mp-scheduler.ts:1532`, move-mode seeding). On disagreement move-mode
  can start on the wrong row and commit a `resourceId` that contradicts the nesting.

### 4.2 Decision D4.1 — normalize internally; keep both inputs

Chosen over "make timeline also read flat events" (which hardens the defect: an event with
a `resourceId` becomes renderable twice, and the double-writes stay) and over "delete
nested `resource.events`" (right destination, but breaks every consumer, demo and spec
fixture now for no user-visible gain).

1. `resources` remains the authoring form for the **tree** and as optional **sugar** for
   events; at state-set time nested events are flattened and stamped
   `resourceId ??= owningResource.id`. Thereafter `resources` is pure structure.
2. One internal store: `state.events` plus a derived `Map<string | null, SchedulerEvent[]>`
   index keyed by `resourceId`, recomputed when either input is written. Duplicate ids
   across both inputs get a dev warning (silent consumer bug today).
3. Every view reads the one store. Timeline becomes `index.get(resource.id) ?? []`.
4. **`resourceId` becomes the authoritative link** (fixes B12), which also makes B5's fix
   meaningful.
5. Write paths collapse: the `updateEvent` double-write and its `updateResourceEvent`
   helper disappear, as does the resource sweep in `getEventById`; `addEvent`/`removeEvent`
   become correct for both worlds by construction. The five dead mutators (B8) are deleted.

### 4.3 Decision D4.2 — synthetic "(No resource)" row + real empty state

**Prior art says this must be an explicit option, not a quiet default.** Resource-less
events are the one question in this PRD with *no* industry convention — three mutually
incompatible documented behaviours: **hidden** (Syncfusion: "the event will not be
displayed"; Bryntum requires a sacrificial fake "Unassigned" resource), **belongs to every
resource** (DevExpress desktop: "if an appointment has no associated resource, it belongs to
all resources"; Mobiscroll: "will show up in every resource group"), and a **dedicated
bucket** (DHTMLX 2.0 `unassignedCol`, plus MUI X's explicit "No resource" option gated by
`shouldEventRequireResource`). Camps 1 and 2 are both silent data traps — invisible events,
or one event duplicated into N lanes where editing one edits "all".

So: the bucket row is the **default and visible** (camp 3, the only non-lossy option), with
an option for consumers who want the stricter contract:
`options.requireEventResource?: boolean` (default `false`) — when `true`, events without a
`resourceId` are reported via a dev warning rather than silently bucketed, mirroring MUI X.
Never hide an event with no feedback.

> **Not yet implemented:** the bucket row and its localizable `unassignedResource` label
> ship (M2), but `requireEventResource` and the dedicated empty state for
> `resources: []` do not. Left open in the plan rather than quietly dropped — the bucket
> row alone already resolves the reported symptom, since a resource-less consumer now gets
> a working single-row timeline instead of a blank panel.

- Events with `resourceId == null` render in a synthetic row rendered **last**, labelled
  via a new `SchedulerMessages` key (localizable per #394), suppressed when the bucket is
  empty *and* at least one real resource exists.
- When `resources` is empty, timeline currently draws only header rows — reading as broken
  rather than empty. With the bucket row a resource-less consumer gets a working
  single-row timeline, which alone resolves the reported symptom; plus a proper empty state
  when there is genuinely nothing.

### 4.4 Decision D4.3 — resource concept per view (answers R7)

| View | Resource axis | Rationale |
|---|---|---|
| timeline | **Yes** — rows *are* resources | the only view with a resource axis; gains the null bucket |
| week / day | **No** | cross-resource overlap in one column is a layout problem timeline already solves; week view shouldn't inherit it |
| month / year | **No** | coarse overviews |

### 4.5 Decision D4.4 — resource colour across all views

Infeasible today (week view has no route from event → resource), trivial under D4.1. Add
one helper beside `getContrastColor` in `scheduler-core/src/utils/color.ts`:

```
resolveEventColor(event, resourceById, options)
  = event.color ?? resource?.eventColor ?? resource?.color ?? options.defaultEventColor ?? '#3788d8'
```

- Replaces four identical hardcodes and promotes the `'#3788d8'` literal (duplicated in
  five files) into `SchedulerOptions.defaultEventColor`.
- Settles the two dead colour fields: **`eventColor` = event fill, `color` = row-header
  tint** (matching `ResourceGroup.color`, whose own comment says "background color for the
  group header"), falling back `eventColor ?? color`.
- `getContrastColor` keeps text contrast automatic on arbitrary resource colours — worth
  noting that **no surveyed library computes contrast at runtime**: FullCalendar's
  `eventContrastColor` is set manually, and the three strategies the field actually uses are
  all "constrain the input" (Bryntum/MUI X named palette tokens generated at build time;
  schedule-x's `{ main, container, onContainer }` triples; Google's global
  white-text/black-text switch). We already have the differentiating behaviour — keep it.
- **Precedence matches the universal convention** (event → resource → calendar default),
  and resource colour applying in *non-resource* views is documented practice, not an
  invention: FullCalendar states resource colours "will still take effect" on non-resource
  views. **But it is the most commonly broken promise in the field** — FullCalendar #5743
  (lost for events added via `addEvent`), Bryntum #4005 (lost in Month/Agenda), DevExpress
  T864922. **Requirement: explicitly test the dynamically-added-event path**, which is
  exactly where three separate libraries regressed.
- **WCAG 1.4.1 (Level A): resource identity must not be colour-only.** No surveyed component
  library offers a non-colour resource indicator or even a legend; the only precedent
  anywhere is Outlook's per-calendar **"charm"** icon. Add an optional per-resource
  `icon`/glyph rendered on the event chip plus a legend — a cheap, genuinely differentiating
  a11y win that also solves resource identity in dense month cells where colour chips are a
  few pixels wide. Colour alone stays available but is documented as not sufficient.
- **Initial random colour**: assigned by the *consumer*, not the WC — the component must
  stay a pure function of its inputs (a WC that invents colours would emit different
  output for identical input and desync SSR). The WC ships a deterministic palette helper
  the demos use, so "random initial colour" is one call for consumers without making the
  component stateful. Colour edits in timeline emit a `resource-update` **request**
  (§5), consistent with the events model.

## 5. Timeline creation affordances (R3)

### 5.1 Drag-create on a resource row: the gesture fires, the result is unusable

Three independent breaks in one gesture:

- **Break 1 — `preview.resourceId` is structurally unreachable** (this is B5, with the
  mechanism now pinned). Two severed links, both need repair: `getSlotFromElement` reads
  only `data-start`/`data-end` (`mp-scheduler.ts:1791-1801`) and `TimeSlot` has no
  resource field (`scheduler-core/src/models/time-slot.ts:4-9`), even though timeline
  slots *do* carry `data-resource-id` (`timeline-view.ts:230-234`); and `activateDrag`
  never forwards the `slotElement` it was handed into the `active` state
  (`drag-state-machine.ts:348-356`). No fallback exists — `startDrag`/`updateDrag` never
  touch `selectionResourceId`, which only the keyboard path writes.
- **Break 2 — no ghost renders for a create-drag, and the greying is actively
  misleading.** `renderPreviewEvent` bails on `if (!resourceId) return`
  (`timeline-view.ts:435`) — for a create-drag both `previewEvent.resourceId` *and*
  `draggedId` are undefined (`dragState.event` is `null` for create), so the ghost is
  skipped. **This is a gap in my own z-order commit on this branch** (§9): I fixed the
  move/resize ghost and didn't cover create. Meanwhile `updateGreyedSlots` does *not*
  filter by resource (`timeline-view.ts:509-527`), so a create-drag greys the time band
  across **every** resource row.
- **Break 3 — even a correct `resourceId` wouldn't render** until D4.1 lands (timeline
  reads `resource.events`; `addEvent` writes the flat list).

**Keyboard create is already correct** — it resolves
`selectionResourceId ?? focusedResourceId` (`mp-scheduler.ts:1481-1503`). The pointer path
is the outlier.

### 5.2 Decision D5.1 — creation UI: a bottom "add" row, not per-group buttons

**Revised after prior-art research, which pushed back on the first draft.** Among calendar
components the signal is unanimous: **none of FullCalendar, Syncfusion, DevExtreme,
Bryntum, Mobiscroll, Kendo or DHTMLX ships resource-creation UI** — resources are data the
app supplies. And among planning tools, *groups/lanes are derived from a field rather than
user-created*: Smartsheet states outright that lanes come from the group-by column and
"you cannot manually create additional grouping lanes"; Bryntum's sanctioned pattern for
unplanned work is an **external grid you drag from**, and even Bryntum Gantt has no
built-in add-row (an open support issue). The dominant inline-row affordance where it does
exist (Jira timeline, spreadsheets) is a **persistent "add" row at the bottom of the left
grid**.

So the original "two buttons next to every group" would have been both unprecedented and
the most expensive option: N duplicated accessible names, N focus stops, clutter in every
row, and a permanently-dead disabled button per row under `createResource: false`.

**Decision:**
- **Primary**: one persistent **"Add resource" row pinned at the bottom of the frozen
  resource column** (the Jira/spreadsheet idiom), emitting `resource-create`.
- **Nested groups**: reached from a **per-group overflow/context action**, not a pair of
  always-visible buttons — same target-disambiguation need query-builder has, without
  paying for it on every row. Named `"Add resource to {group}"` / `"Add nested group to
  {group}"` via `options.messages`, never a bare repeated "Add".
- **Events**: created by **dragging a resource row** (fixing §5.1), never a button —
  exactly as the user proposed, and consistent with week view.
- Because this is unprecedented in the field, it ships **behind permissions and off by
  default** (`createResource`/`createGroup` default `false`), so the component's default
  behaviour stays "resources are data" like every peer library.


There is no resource/group creation UI anywhere today; the only interactive element in the
timeline body is `.expand-toggle` (`timeline-view.ts:185-200`) — which also has **no
`:focus-visible` rule**, a mistake the new buttons must not copy.

The repo has one precedent each way and they split on *ambiguity of target*:
`mp-query-builder` puts add-buttons in **each group header** because "which group?" is
ambiguous (`mp-query-group.element.ts:205-240`); `mp-file-manager` uses a **single
toolbar** where the target is unambiguous (`mp-file-manager.ts:812-862`). The scheduler's
group tree has query-builder's ambiguity, so:

- **Per-group-row**: "Add resource" / "Add nested group" on each group row.
- **One footer/toolbar**: "Add group" at the top level, where there's no ambiguity.
- Events are **not** created by a button — drag on a resource row (fixing §5.1), matching
  week view, exactly as the user proposed.

Copy query-builder's *ARIA* and file-manager's *event contract*, not the reverse:
query-builder's root mutates its own model, which contradicts this repo's
primitive-emits-requests rule; file-manager emits a request and lets the consumer mutate
(`mp-file-manager.ts:1291-1308`).

New request events (all `bubbles`, and **`composed: true`** — see D5.3):
`resource-create` `{ parentId?, view }`, `group-create` `{ parentId?, view }`,
`resource-update` `{ resource, changes }` (carries colour edits, R7),
`resource-delete` `{ resource }`.

Naming must disambiguate: N buttons named "Add" are N identical accessible names — use
`"Add resource to {group}"` via `options.messages`. Depth goes in the **accessible name**,
never `aria-level` (invalid on these roles; axe `aria-allowed-attr` serious —
`mp-query-group.element.ts:176-187`).

### 5.3 Decision D5.2 — clean up the event surface before extending it

- **`date-select` is declared, typed, and wired as a live Angular output
  (`scheduler.component.ts:171,296`) but never emitted by anything.** Either emit it on
  range selection or delete it; a dead output is worse than a missing one.
- The type surface is **duplicated and drifting**: `scheduler-core/src/models/events.ts`
  (9 entries) vs `scheduler/src/events/event-types.ts` (8 arms). Collapse to one source.
- **React wrapper types are wrong**: `onSelectionChange` is missing `selectedEvent` and
  `resourceId` and invents a `slots` field (`BsScheduler.tsx:36`); `event-delete` declares
  a required `originalEvent` the emitter never sends (`:30`).
- Events set `bubbles: true` but **not `composed`** (`scheduler-event-emitter.ts:15-23`),
  so they cannot escape a nesting shadow root — file-manager uses `composed: true`.
  Decision: **`composed: true`** for all scheduler events, since these are consumer-facing
  requests and the component is designed to be nested inside other WCs.

## 6. Permission / read-only model (R4)

### 6.1 The headline finding: read-only is currently impossible

`options.editable` and `options.selectable` are enforced in exactly three pointer sites
(`input-handler.ts:206,253,215,268`, `base-view.ts:243`). **Every keyboard mutation path
bypasses them:**

| Path | Location | Gate |
|---|---|---|
| `Enter` on cell → `event-create` | `mp-scheduler.ts:1083` → `:1481` | none |
| `Delete`/`Backspace` → `event-delete` | `:991-995` | none |
| `M`/`Enter` → move mode → `Enter` commits `event-update` | `:981-990`, `:1720-1744` | none |
| `Shift+Arrow` in move mode → resize | `:1670-1686` | none |
| `Shift+Arrow` range selection | `scheduler-state.ts:426-435` | ignores `selectable` |

Move mode additionally ignores `event.draggable` and `event.resizable` entirely (those are
checked only in the pointer state machine and the handle renderer), so a
`draggable: false` event is freely keyboard-movable. **Gating the keyboard paths is the
highest-value fix in this section** — without it "read-only" is decorative.

Also dead and to be removed or folded in: `eventDurationEditable`, `eventStartEditable`,
`selectMirror`, `dragRevertDuration`, `dragScroll`, `snapDuration`
(`scheduler-core/src/models/options.ts`), plus `event.editable` (never read) and
`event.resizable`'s `{start, end}` object form (declared, only the boolean branch checked).

### 6.2 Decision D6.1 — `permissions` object + `readonly` attribute, one resolver

```
SchedulerOptions.permissions?: boolean | Partial<SchedulerPermissions>
SchedulerPermissions = {
  createEvent, moveEvent, resizeEventStart, resizeEventEnd, deleteEvent,
  createResource, updateResource, deleteResource, createGroup, reorderResources,
}
```

Precedence through one internal `can(capability, subject?)`: host `readonly` attribute →
`permissions === false` → `permissions[cap]` → per-item flag → default `true`.

- **Rejected: flat top-level booleans.** That's what exists, and it produced six dead
  flags and a four-way-ambiguous `editable`; ten more would make `SchedulerOptions`
  (already 30 fields) unreadable and still couldn't express "everything off".
  `permissions: false` gives the single most common request for free. Survives
  `setOptions`' shallow merge (`scheduler-state.ts:323-327`).
- **`readonly` host attribute retained as the coarse layer** because it's the only form
  reachable from plain HTML and from a template without an object literal, matching the
  existing `editable`/`selectable` attributes.
- **Rejected: predicates as the primary API.** Honest greying would call a consumer
  callback per cell (`resources × 7 × slotsPerDay` — hundreds to thousands, re-evaluated
  on every unconditional `renderEvents`) and per `pointermove`; it's also unserializable
  and undiffable. **One** narrow escape hatch is kept: `permissions.canCreateAt?(range,
  resourceId)`, documented as costly and evaluated **only** at pointer-down, drag
  completion and `Enter` commit — never per cell, never per pointer-move. Greying is
  explicitly not driven by it.
- **Per-item flags stay on the data** (file-manager's third layer): fix the dead
  `event.editable`, honour `event.resizable`'s per-edge object form, add
  `resource.allowOperations?`. **These must be tri-state (`boolean | null`, default
  `null` = inherit)** — FullCalendar's per-event `editable`/`startEditable`/
  `durationEditable`/`resourceEditable` are each "Boolean … or `null`. The value overriding
  the [X] setting for this specific event", and a two-state flag cannot express "inherit"
  distinctly from "deny", which is what makes a global `permissions` layer usable.
- **Prior art validates the chosen shape.** `Boolean | Object` is the dominant coarse idiom
  — DevExtreme `editing: Boolean | Object` (`allowAdding`/`allowUpdating`/`allowDeleting`/
  `allowDragging`/`allowResizing`) and Kendo `editable: Boolean | Object`
  (`create`/`update`/`destroy`/`move`/`resize`) — narrowly ahead of FullCalendar's flat
  booleans. Syncfusion's `readonly` global flag is the precedent for our `readonly`
  attribute. Predicates exist in only two of seven libraries (FullCalendar
  `eventAllow`/`selectAllow`, Bryntum `validatorFn`), and FullCalendar documents the cost in
  the same words we reached independently: it "will be called for every new potential
  droppable position as the user is dragging" — which is why ours stays opt-in and
  off the render path.
- **Cheaper than a predicate for the common case: put permission on the *resource*.**
  FullCalendar allows `eventAllow`/`eventOverlap`/`eventConstraint` on a Resource object, and
  for a resource timeline "this row is locked" is far more naturally a resource field than a
  callback. Adopt that: `resource.allowOperations` covers the row-locking case with an O(1)
  lookup, leaving `canCreateAt` for genuinely dynamic rules (past dates, quotas).
- **`editable`/`selectable` were DELETED, not aliased.** The first draft kept them as
  deprecated aliases; the decision changed to no back-compat, so they and their host
  attributes are gone along with the six dead flags (`selectMirror`,
  `eventDurationEditable`, `eventStartEditable`, `dragRevertDuration`, `dragScroll`,
  `snapDuration`) and the five dead `resourceService` event mutators. `eventStartEditable`
  / `eventDurationEditable` live on as `resizeEventStart` / `resizeEventEnd`. Versions
  bumped accordingly.

**Semantics (file-manager's rule verbatim):** permission denied ⇒ **do not render** the
affordance; permitted but contextually unavailable ⇒ render `disabled`; every handler
*and every keyboard shortcut* re-checks the same predicate. Denial does not propagate
re-enablement — a group-level denial can't be overridden by a child resource flag
(query-builder's OR-down-the-tree `disabledContext`).

### 6.3 Decision D6.2 — this is an honesty API, not a security boundary

The WC already cannot mutate consumer data (`event-create` is a request, `event-delete` a
notification; `event-update` pre-mutates internal state only so a committed drag doesn't
snap back). So permissions exist to (1) not render impossible affordances, (2) refuse
gestures before they start rather than emit-then-hope, (3) not *announce or document*
blocked keymaps. **This must be documented explicitly**, or consumers will treat it as
enforcement.

### 6.4 A11y consequences (each is a requirement, not a nicety)

- **The keymap instruction nodes must become conditional.** `#scheduler-kbd-grid` and
  `#scheduler-kbd-event` render unconditionally (`mp-scheduler.ts:367-368`) and are
  referenced from every grid and every event; their text promises *"press Enter to request
  a new event"* and *"Press Enter or M to move or resize… Delete removes the event"*
  (`messages.ts:114-117`). Under `readonly` those are lies read aloud on every focus.
  Compose the description from per-capability message fragments and drop
  `aria-describedby` entirely when the result is empty (a describedby pointing at an empty
  node is its own defect). The demo keymap prose must be gated the same way.
- **Announcements must not confirm refused actions.** `selectionCommitted` fires
  immediately after emitting, with no permission check (`mp-scheduler.ts:1504`). Check
  first, announce only what was attempted, and give denial its own polite message —
  silence on a keypress reads as a broken widget.
- **Cells stay focusable in read-only mode.** Reading a schedule is a legitimate keyboard
  task; gate the *commands*, never the grid navigation.
- **Focus after add, by stable key.** The views tear down and rebuild imperatively, and the
  code already compensates with rAF re-focus in four places; an add-button that is itself
  removed by the re-render must define where focus lands. (Query-builder specified this
  and never built it — a precedent to not repeat.)
- **New buttons need a `:focus-visible` rule** — `.expand-toggle` has none.

## 7. Timeline two-axis scrolling (R5)

### 7.1 Root cause — five defects, and the horizontal overflow is trapped

A default week is **336 slots × 50px = 16,800px** wide (`slotWidth` is hard-coded at
`timeline-view.ts:24`) in a ~700px column, so ~96% is off-screen. Nothing can reach it:

- **B16 — the header strips clip and never sync.**
  `.scheduler-timeline-slots-header { flex: 1; overflow: hidden }`
  (`scheduler.styles.scss:628-632`). `overflow: hidden` also zeroes the automatic minimum
  size, so the strip shrinks to `container − 200px` and hard-clips 16,800px of day/time
  labels. There is **no `scrollLeft` sync anywhere** in the codebase. In the default demo
  state `resources` is empty, so the body has no rows, nothing else overflows, and
  **literally nothing scrolls horizontally** — exactly the reported symptom.
- **B17 — the overflow is trapped in a nested scroller the component doesn't know about.**
  `.scheduler-timeline-body { overflow: auto }` (`:642-647`) creates a second scroller
  inside `.scheduler-content`, but every piece of scroll machinery targets the outer one:
  `getScrollContainer()` returns `.scheduler-content` (`mp-scheduler.ts:395`), so **touch
  pan is a no-op in timeline on both axes**; `.scroll-blocked` is applied to the wrong
  element, so the body still scrolls during a drag; and the styled scrollbars
  (`:866-882`) don't apply. Keyboard nav *does* scroll it, because `scrollIntoView` walks
  all scroll ancestors — which is how you get the incoherent state where arrow-right moves
  the grid while the header stays frozen.
- **~~B18 — touch scrolling is dead in every view~~ — RETRACTED.** An investigation agent
  claimed this from code reading; it is **wrong**, and device testing on Android (week
  view, `master`) disproved it. Recorded here because the retraction is the useful part.
  The actual behaviour: `preventDefault()` runs **only while the finger is within the 10px
  hold threshold** (`input-handler.ts:355-369`). Past 10px, `cancelTouchHold()` clears the
  timer and — for a slot — no `preventDefault` is called; every later `touchmove` then
  skips that block entirely (`touchHoldTimer` is null) and falls through to a no-op. So the
  cancellation window is only the first ≤10px, which sits inside Chrome's ~8px touch slop,
  i.e. before the browser would have started scrolling anyway. Slots also never get
  `touch-action: none` — only `.scheduler-event:not(.preview)`,
  `.scheduler-timeline-event:not(.preview)`, the resize handles, and the drag-mode
  container do (`scheduler.styles.scss:328,387,748,810-862`) — so the browser is free to
  scroll them. Native touch scroll therefore works, as observed.

  What survives as a *real* (if narrow) risk, worth a comment rather than a fix: the design
  couples `touchMoveThreshold` to the browser's touch slop. Raise the threshold much above
  ~8-10px and the cancel window would start extending past the point where Chrome wants to
  begin scrolling, and touch scroll on slots would begin to stutter or fail. Leave the
  threshold alone, and document why it can't grow freely.

  Note this retraction does **not** affect B17: pan-mode writing `scrollLeft` to
  `.scheduler-content` is a no-op in timeline view regardless, because that element has no
  scrollable overflow there (the nested body owns it). Blocked-touch-scroll and
  wrong-pan-target were independent claims; only the former was false.
- **B19 — no `min-width: fit-content` anywhere in the timeline chain**, so rows, borders,
  `.group` backgrounds and `.selected` highlights all stop at the viewport width.
- **B20 — the resource column is not sticky.** `.scheduler-resource-cell` /
  `.scheduler-resource-header` have no `position: sticky`, `left`, or background, so the
  moment scrolling works the `role="rowheader"` cells scroll away and rows become
  anonymous.

> **Evidence discipline note.** B18 above was reported by an investigation agent from code
> reading and retracted after the user tested week-view scrolling on an Android device. Two
> lessons for the rest of this PRD: (1) claims about *browser gesture arbitration* are not
> decidable by reading source — the interaction between our thresholds and the engine's
> touch slop only shows up on a device; (2) where a claim below is code-certain (a property
> written to a non-scrollable element, a value never read) it is marked as such, and where
> it needs a device it says so. B2, B22 and the z-order regression were each verified by
> execution or measurement, not by reading.

Adjacent finds: `.scheduler-body`/`.scheduler-sidebar`/`.scheduler-grid` in the SCSS
(`:157-180`) have **no producer — dead CSS**; both timeline header rows carry
`position: sticky; top: 0` and will stack on each other once vertical scrolling works;
`options.dragScroll` is declared and never read (expect "no auto-scroll at the edge" as
the very next complaint); and `clearContainer()` only clears `innerHTML`, so per-view
classes (`scheduler-timeline-view`, …) **accumulate on `.scheduler-content` forever** —
never write view-scoped CSS keyed on them.

### 7.2 Decision D7.1 — one scroller, two-axis sticky (copy the week-view pattern)

Make `.scheduler-content` the single scroller, exactly as week view already does — then
`getScrollContainer()`, `.scroll-blocked` and the scrollbar styling all become correct with
no TS change:

1. `.scheduler-timeline`: `height: 100%` → `min-height: 100%`; add `min-width: fit-content`.
2. `.scheduler-timeline-slots-header`: **drop `overflow: hidden`**; `flex: 1` → `0 0 auto`.
3. `.scheduler-timeline-header`: add `min-width: fit-content`.
4. `.scheduler-timeline-body`: **drop `overflow: auto`**; `flex: 1` → `0 0 auto`; add
   `min-width: fit-content`.
5. `.scheduler-timeline-row`: add `min-width: fit-content` — required, it is the sticky
   column's containing block.
6. `.scheduler-timeline-slots`: `flex: 1` → `0 0 auto` (explicit, not relying on
   `min-width: auto`).
7. Resource header + cell: `position: sticky; left: 0` **plus an opaque background** — a
   transparent sticky cell shows slots sliding under it.
8. One new rung on the §9 ladder: `$z-sticky-column: 7` — above `$z-slot-focus: 6` so a
   focused slot's outline passes under the pinned column, below `$z-sticky-header: 10`.
   The corner needs nothing extra: the sticky header row is already a stacking context.
9. **Markup**: wrap both header rows in one `.scheduler-timeline-head` that is the sticky
   element, and make the two rows static (fixes the stacking latent bug).

Week view gets the same treatment for its time gutter (`.scheduler-time-gutter` is not
sticky, so time labels scroll away horizontally) — same fix shape, same pass.

**Prior art disagrees with this choice, and the disagreement is worth stating.** The
dominant architecture for a frozen column + sticky time header is **synchronized scroll
panes** — Bryntum ("a grid consists of one or more subgrids, each with its own horizontal
scroller, while all subgrids share a vertical scroller"), AG Grid's left-pinned/centre/right
sections, and FullCalendar's ScrollGrid — *not* pure CSS `position: sticky`. FullCalendar
paywalls its multi-column ScrollGrid, which tells you what the general case costs.

We choose single-scroller + two-axis sticky anyway, for two specific reasons:
1. **Week view already does exactly this, in this shadow root, and works** —
   `min-width: fit-content` + a sticky header (`scheduler.styles.scss:182-190`). That retires
   the research report's highest-flagged unknown ("spike `position: sticky` across the shadow
   boundary") with existing in-repo evidence rather than a spike.
2. It's a CSS-only change to a working sibling pattern, versus building a pane-sync layer.

Adopted from the prior art regardless: **AG Grid's guard that the frozen column may never
exceed `container − 50px`** (AG Grid auto-unpins columns that would breach it) — without it a
200px resource column on a narrow phone leaves no timeline. And documented pitfalls that
apply to us: sticky cells are transparent by default (hence the opaque background in step 7),
a three-tier z-index is mandatory for two-axis sticky (hence `$z-sticky-column: 7`), and an
`overflow` on the wrong ancestor defeats sticky entirely (hence dropping the nested
`overflow: auto` in step 4 rather than layering on top of it). If virtualization is ever
needed, split panes become the migration path — noted, not built.

**Rejected**: keeping the nested scroller and JS-syncing `scrollLeft` header←body. It needs
a scroll listener per render, lags a frame (visible header jitter), still needs the sticky
column, and leaves `.scheduler-content` a dead second scroller that pan-mode keeps writing
to. **Deferred**: rebuilding timeline as one CSS grid with two-axis sticky — cleanest, but
every event's `left`/`width` is computed against `totalWidth` inside a per-row positioned
overlay, so the rewrite must preserve that overlay. Not part of a bug fix.

Also promote `slotWidth` to a CSS custom property so consumers can shorten a 16,800px week.

## 8. Month / year enrichment (R6) — recommendation

### 8.1 Answer: yes for month, no for year

**Month — build it, as an upgrade of `+N more` rather than a new layer.** Today the only
way to see a day's hidden events is the `+N more` link, which mutates `view` + `date`,
emits `view-change` and discards the month context — a destructive answer to "what else is
on the 14th?". A popover answers in place, and it's the FullCalendar-standard behaviour
(`moreLinkClick: 'popover'`). It is also the only cheap way to serve "create an event for
this day", because **month view has no drag-to-create at all** (`analyzeTarget` only knows
`.scheduler-time-slot, .scheduler-timeline-slot`); the alternative is teaching the drag
machine about day cells — a much larger feature. Not redundant with the drill-down,
provided the drill survives *inside* the popover as a secondary "Show day →" action.

**Year — do not build it.** Clicking a month already drills to month view. A day-level
popup there would require making 12 × 42 mini-day cells focusable, reversing a deliberate
a11y decision documented in the code (`year-view.ts:52-55`: screen readers should describe
months, not days) and adding a ~500-cell roving grid, to serve a case already covered in
two activations. Instead fix year's two real defects: **Enter on a card emits a
month-spanning `event-create`** (`mp-scheduler.ts:1244-1246`) which is dubious — it should
drill into the month like the header button; and the `.has-events` dot needs a text
equivalent.

### 8.2 Decision D8.1 — scope of the month popover

- **The overflow behaviour is a configured strategy, not a hardcoded popover** — this is
  FullCalendar's proven shape (`moreLinkClick: 'popover' | <viewName> | fn`, defaulting to
  `'popover'`), and it's necessary because the field genuinely disagrees: **Kendo
  deliberately navigates to the day view instead** (`views.eventsPerDay` → "will navigate
  to the day view if clicked"), and Kendo Angular's newer answer avoids the choice entirely
  by growing the row. So: `options.moreLinkBehavior?: 'popover' | 'day' | fn`. Default
  `'popover'` (the dominant default), with `'day'` preserving today's exact drill.
- **Day-*number* click stays separate from day-*cell* click** (FullCalendar's
  `navLinks`/`dateClick` split). Conflating them is what makes empty-cell create
  impossible. Day number → drill to day view (opt-in, `navLinks` idiom); cell click →
  today's `date-click`, unchanged.
- **Openers for the popover**, all keyed by date: the existing `+N more` (when
  `moreLinkBehavior: 'popover'`), and **Space** on the focused cell — currently unbound, so
  Enter keeps meaning "create for this day" and nothing regresses.
- **Click-a-date-to-open-the-popup**, which the user asked for, is available as
  `options.dayClickAction?: 'none' | 'popover'`, **default `'none'`** so today's
  `date-click` contract is preserved for existing consumers (see non-goal 5). Opt in and a
  plain cell click opens the popover.
- **Contents**: header (full localized date + count); the day's complete event list as
  `role="button"` items reusing `formatEventAriaLabel`, activation emitting the **existing**
  `event-selected`; one primary "New event" emitting the **existing** `event-create` with
  the same range Enter produces; one secondary "Show day" performing today's drill.
  **No new event types.**
- **Mechanics**: `OverlayController` (`libs/mintplayer-web-components/overlay`) with a
  Lit-rendered `role="dialog"` panel in `mp-scheduler.render()`, `initialFocus: 'first'`,
  `modal: false`, `dismissStack` for Escape, focus return to the opener by date key.

### 8.3 Traps that must be handled (all identified, all real)

1. **`scroll` is not a composed event.** `OverlayController` listens on `document` with
   capture, so a scroll of `.scheduler-content` *inside the shadow root* never reaches it —
   both `'reposition'` and `'close'` strategies are silently dead for a panel anchored to a
   cell in an internal scroller. Register a local listener on `.scheduler-content` (and
   consider generalising the controller to walk shadow scroll-ancestors — a win for every
   WC with an internal scroller).
2. **`position: fixed` containing block** — document that nothing may add
   `transform`/`filter`/`contain` to `.scheduler-content` or `.scheduler-month-grid`.
3. **The anchor is imperative DOM destroyed on every render** — hold popover identity by
   date key and resolve the anchor lazily (`anchor: () => root.getElementById(...)`), the
   same stable-key rule the repo already uses for focus restoration.
4. **Escape collides**: the host-level `keydown` (Escape clears selection) fires *before*
   the controller's document listener. Gate `handleKeyDown` on "popover open" and let
   `dismissStack` arbitrate.
5. IDREFs are fine here — panel and cells share one shadow root.

### 8.4 Non-goals

1. No year popover; no focusable mini-day cells.
2. **No group/resource creation in a date popup** — a category error: `ResourceGroup` is a
   node in the *resource tree* with no date dimension, rendered only by timeline, so the
   popup couldn't say where in the tree it goes. That belongs in the timeline resource
   column (§5).
3. No inline edit form in the popover — the WC owns no event data; it emits requests. An
   in-WC form would need a save contract it cannot honour.
4. No modal dialog / focus trap / `aria-modal`.
5. Plain `click` on a day cell keeps emitting `date-click` and must **not** open the
   popover — two meanings for one click would break existing consumers.
6. Not drag-to-create in month view (separate, larger feature; the popover is the cheap
   substitute).

### 8.5 Two bugs to fix in the same code (they'd be inherited by the popover)

- **B21 — `dayMaxEvents: false` silently means 3.** `month-view.ts:179-181` does
  `typeof … === 'number' ? … : 3`, so the documented "show all" value caps at 3.
- **B22 — UTC-parse skew makes month view land on the wrong day in every timezone west of
  UTC.** `MonthView.dayKey` writes **local** components (`month-view.ts:68-76`) but readers
  parse `new Date('YYYY-MM-DD')` as **UTC** midnight (`mp-scheduler.ts:798`, `:1148-1154`).
  *Verified empirically* — `new Date('2026-07-31')` is `2026-07-31T00:00:00Z`, so the local
  calendar day the reader derives is:

  | UTC offset | local day derived | result |
  |---|---|---|
  | +14, +2, 0 | 2026-07-31 | ok |
  | −4, −5, −8, −11 | **2026-07-30** | `event-create` fires for the **previous day** |

  So pressing Enter on Jul 31 in New York creates an event on Jul 30, and focus restoration
  rebuilds the id from local components and lands on the wrong cell, breaking arrow nav.
  It round-trips only at UTC+0 and east, which is why it has never been seen here (CET).
  Year view uses full ISO strings and is unaffected — month is the outlier. **This silently
  corrupts consumer data**, so it ranks with B2 in priority despite being a one-line fix
  (parse the key as local, or carry a full ISO string like year view does).

## 9. Already committed on this branch: drag-ghost z-order + named z-index ladder

Recorded here so the PR has one narrative; full detail in
[scheduler-resize-glyphs.md §9](./scheduler-resize-glyphs.md).

The `z-index: 2` added to `.scheduler-event.selected` in #394 (so straddling resize
handles win pointer hits) silently defeated the drag ghost, which declared no z-index —
the unselected case only worked because equal z-indexes fall back to DOM order and the
ghost is appended last. Fixed by naming the whole ladder in SCSS variables
(`selected 2 → dragging 3 → preview 4 → now-indicator 5 → slot-focus 6 →
sticky-header 10`) rather than adding another magic number. Two further layering bugs
fell out: `.touch-hold-active` at `z-index: 100` painted over the sticky header, and the
selected event occluded the focus ring of the slot beneath it (an a11y regression from
#394, since that ring sat at `z-index: 1` specifically to clear event boxes). Timeline
ghost defects from #394 were fixed at the same time: gated on `dragState` so keyboard
move-mode rendered no ghost, ignored `previewEvent.resourceId`, and spanned the whole
row instead of the source's track.

Test lesson carried into this PRD: the resize e2e only observed `event-update` payloads,
and its touch case selects before dragging — it drove the broken visual state and passed
green. Visual/structural regressions need assertions about the DOM and paint order, not
just emitted events.

## 10. Non-goals (running list)

- Recurrence, timezones, event overlap policies — untouched.
- DST-correct column heights (pre-existing; geometry is `getTime()` deltas against
  local midnight). The new shared geometry helper should express clipping against
  `parseTimeOnDay` so it degrades sanely, without claiming DST correctness.
- No new i18n framework: new strings extend `options.messages` (#394).

## 11. As-built API surface

New/changed public surface, so consumers and the wrappers have one list.

**Added — `SchedulerOptions`**
- `permissions?: boolean | Partial<SchedulerPermissions>` — `false` = read-only.
- `defaultEventColor?: string` — replaces the `'#3788d8'` literal that was duplicated
  across five files.

**Added — host attribute**
- `readonly` — coarse read-only, reachable from plain HTML/SSR. `readonly="false"` opts out.

**Added — `SchedulerPermissions`** (`createEvent`, `moveEvent`, `resizeEventStart`,
`resizeEventEnd`, `deleteEvent`, `selectRange`, `createResource`, `updateResource`,
`deleteResource`, `createGroup`, plus the opt-in `canCreateAt` predicate). Resource/group
capabilities default **false**; event capabilities default **true**.

**Added — `TimeSlot.resourceId?`** so a pointer create-drag can report its row.

**Added — messages** (`options.messages`): `unassignedResource`, `actionNotAllowed`,
`gridInstructionsReadOnly`, `eventInstructionsReadOnly`.

**Added — CSS custom properties**: `--scheduler-slot-width` (was a hard-coded 50px, i.e.
a 16,800px default week), `--scheduler-resource-column-width` (capped
`min(200px, 100% - 50px)`), `--scheduler-resize-glyph-*` (from #394).

**Added — SCSS z-index rung**: `$z-sticky-column: 7`, between slot-focus and sticky-header.

**Added — state (internal, but views rely on it)**: `events` is now the merged store;
`eventsByResource` and `resourceById` are derived indexes; `resolvedPermissions` carries
the folded table.

**Removed (breaking)**
- `options.editable`, `options.selectable` and their host attributes → `permissions` /
  `readonly`.
- `options.selectMirror`, `eventDurationEditable`, `eventStartEditable`,
  `dragRevertDuration`, `dragScroll`, `snapDuration` — declared and read by nothing.
  The two editable flags live on as `resizeEventStart` / `resizeEventEnd`.
- `resourceService.getAllEvents`, `addEventToResource`, `updateEventInResource`,
  `removeEvent`, `moveEventToResource` — dead once the model was normalized.

**Behavioural changes worth calling out**
- Week/day/month/year now also render events authored under `resources` (the R2 fix).
- `resource.events` is authoring sugar, no longer a live mirror: mutating it in place
  requires reassigning the `resources` input.
- `resourceId` is authoritative for placement; nesting only seeds it.
- `event.editable` and `event.resizable: { start, end }` are honoured at last (both were
  declared and ignored).
- `dayMaxEvents: false` now really means "show all" instead of capping at 3.
- Month view emits the correct day west of UTC.

### 11.1 Added in M8–M10

**Added — `SchedulerOptions`**
- `moreLinkBehavior?: 'popover' | 'day' | ((info: { date, events }) => void)` — default
  `'popover'` (FullCalendar's default too). `'day'` is the previous drill-to-day.
- `dayClickAction?: 'none' | 'popover'` — default **`'none'`**, so the existing
  `date-click` contract is untouched. This is how "click a date to open a popup" ships
  without changing behaviour for consumers who already handle `date-click`.

**Added — element property**
- `readonly` (property, mirroring the attribute) so React/Vue can bind a boolean rather
  than fake an attribute. Attribute and property are the same state.

**Added — request events** (all `bubbles` **and** `composed`)
- `resource-create` / `group-create` — `{ parentId?, view, originalEvent }`
- `resource-update` — `{ resource, changes, originalEvent }`, `changes` carrying only the
  fields the scheduler asks to change
- `resource-delete` — `{ resource, originalEvent }`

Angular exposes them as `(resourceCreate)`, `(groupCreate)`, `(resourceUpdate)`,
`(resourceDelete)`; React as `onResourceCreate`/`onGroupCreate`/`onResourceUpdate`/
`onResourceDelete`; Vue through the ordinary `@resource-create` … listeners.

**Added — messages**: `addResourceBarLabel`, `addResource`, `addGroup`,
`addResourceToGroup`, `addGroupToGroup`, `removeResource`, `resourceColor`,
`dayPopoverLabel`, `dayPopoverCount`, `eventSingular`, `eventPlural`,
`dayPopoverEmpty`, `newEvent`, `showDay`, `closePopover`.

**Added — SCSS z-index rung**: `$z-day-popover: 20`, above the sticky header, because the
popover is a fixed-position dialog over the whole grid.

**Removed (breaking, M9)**
- `date-select` (WC) and the Angular `dateSelect` output — declared, typed and wired, and
  emitted by nothing. A dead output is worse than a missing one.
- `SchedulerEventMap`'s hand-written detail interfaces (`EventSelectedDetail`,
  `EventCreateDetail`, `EventUpdateDetail`, `EventDeleteDetail`, `DateClickDetail`,
  `DateSelectDetail`, `ViewChangeDetail`, `SelectionChangeDetail`, `BaseEventDetail`) and
  the scheduler lib's parallel `event-types.ts`. There is now ONE discriminated union,
  `SchedulerCustomEvent`, in `scheduler-core`; `EventDetail<T>` and `SchedulerEventMap`
  are derived from it. The two tables had already drifted — that is how the dead
  `date-select` entry and a `date-click` `resource` field nothing sends survived.
- Angular's `DateSelectEvent` interface.

**Changed**
- Vue's `resources` prop widens from `Resource[]` to `(Resource | ResourceGroup)[]`.
- React's event payload types now come from `SchedulerEventMap` instead of hand-copied
  shapes (`onSelectionChange` had invented a `slots` field and omitted `selectedEvent`;
  `event-delete` declared a required `originalEvent` the emitter never sends).
- Year view: `Enter` on a month drills into that month. It used to emit a
  **month-spanning** `event-create`, which no consumer could sensibly act on. The
  existing test was rewritten to assert the new contract.
- Month view: the `+N more` link opens the popover by default; clicking the day **number**
  drills into the day view; `Space` on a focused day cell opens the popover (`Enter` stays
  "create for this day", the only keyboard create path in that view).

**Two bugs found while building M8**
- `syncPermissions()` sat inside the `if (this.inputHandler)` guard in
  `connectedCallback`, so on the FIRST connect — the render it exists to seed — it never
  ran.
- `TimelineView.update()` only rebuilt on a date/options change, so a resource added
  after first paint never appeared. It now rebuilds whenever the row set can change: the
  tree identity, collapse state, bucket-row presence, or the permission table.

### 11.2 Deliberate deviations from the plan's decisions

- **D5.1's per-group overflow menu** ships as up-to-two permission-gated buttons per group
  row instead of an overflow menu. Both capabilities are off by default, so a row shows at
  most what the consumer explicitly granted; an overflow menu would add a second popup
  surface (and a nested-interactive risk inside a `rowheader`) to save a button that is
  usually not rendered at all. Revisit if a consumer grants all four capabilities and finds
  the column crowded.
- **Resource rename** is not in the timeline. The colour swatch is (R7 asked for colour);
  rename needs an inline text field with its own commit/cancel semantics, and the consumer
  already has the resource in hand from `resource-update`. `changes` is deliberately typed
  wide enough (`Partial<Resource & ResourceGroup>`) that adding `title` later is not a
  breaking change.
- **The add bar sits outside the `role="grid"`**, as a sticky footer of the resource
  column rather than a grid row. A row whose only content is buttons has to fake a
  rowheader, inflates `aria-rowcount`, and puts Tab stops inside a roving-tabindex grid.
- **Initial resource colour stays the consumer's job.** The WC must remain a pure function
  of its inputs; a component that invents a colour on render is not idempotent and would
  fight SSR. The Angular demo ships a deterministic palette rotation to show the intended
  shape.

### 11.3 M12 — timeline tracks stack instead of dividing the row (R8)

Reported after M10: two events overlapping on one resource each rendered as a thin sliver,
because the timeline reused the time-grid rule that a track is a *fraction* of the row
(`top: trackIndex/totalTracks%`, `height: colspan/totalTracks%`).

That rule is correct for week and day, where the vertical axis IS time and the row height
therefore means duration. It is wrong for the timeline, where time runs **horizontally** and
the panel scrolls: vertical space is free, so an event's height carries no information at
all. Tracks now stack at a constant height and the resource row grows to fit them —
`min-height`, so an empty row keeps its 40px baseline.

Geometry lives in three custom properties (`--scheduler-timeline-event-height: 28px`,
`--scheduler-timeline-track-gap: 2px`, `--scheduler-timeline-row-padding: 2px`) read by
`TimelineView.trackMetrics`, so density is tunable without forking the view.

`colspan` no longer stretches an event over its neighbours' empty tracks: with growth
semantics that stretch is decoration, and a constant height is exactly what makes a
multi-track row readable.

### 11.4 Two a11y defects found by pointing axe at the new states

The shared axe gate audits page load plus one interaction, which on this page means the
default state — week view, permissions off, popover closed. Auditing the states this PR adds
surfaced two failures that predate it:

- **`aria-required-children` (critical)** — `clearContainer` reset the per-view *classes* but
  not the per-view *ARIA*, so `role="grid"` (set on the scroller by week/day/month/year)
  survived a switch into the timeline, whose grid lives on an inner element. The result was a
  grid owning a grid, only ever reachable after a view switch. `clearContainer` now strips
  `role`, `aria-label`, `aria-describedby`, `aria-multiselectable` and `aria-rowcount` too.
- **`target-size` (serious, WCAG 2.2 SC 2.5.8)** — month event chips were 20.5px tall with a
  20.6px safe-click diameter, and the `+N more` link the same. Both are now ≥24px with 24px
  of clear spacing, and month rows grew from 100px to 120px so three chips plus the link
  still fit without clipping.

**Still outstanding** (deliberate follow-ups, none of them a reported defect):
`options.requireEventResource`, a dedicated `resources: []` empty state, the per-resource
icon/legend for WCAG 1.4.1, `resource.allowOperations` per-item overrides,
`options.dragScroll` (still declared and unread — no auto-scroll at the viewport edge),
month-view pointer create-drag, e2e coverage for the multi-day ghost and the timeline, and
the device re-check of timeline touch scrolling. See the plan's §"Outstanding work,
spelled out" for the implementation notes.
