# PRD — Scheduler view-mode completeness

Status: **Phase 1 merged** as PR
[#395](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/395)
(squashed to `master` 2026-07-31, on top of #394's resize-glyph work; released
as web-components 2.5.0 / ng 22.9.0 / react 19.11.0 / vue 3.12.0). §1–§11
describe what phase 1 shipped. **Phase 2 (R11–R20, §12) is implemented** on
`feat/scheduler-phase2` (M18–M26, delivered 2026-08-01, single batched sweep
green — see the plan's phase-2 header for numbers). Phase 2 versions:
web-components 2.6.0, ng-bootstrap 22.10.0, react-bootstrap 19.12.0,
vue-bootstrap 3.13.0.
Branch (phase 1): `fix/scheduler-preview-z-order`; phase 2: `feat/scheduler-phase2`.
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
| R10 | Month day-name headers are far wider than the calendar columns | **fixed** (M17), §11.7 |
| R9 | No drag ghost when resizing a timeline event | **fixed** (M16), §11.6 |
| R8 | Timeline compresses overlapping event tracks into a fixed-height row | **fixed** (M12), §11.3 |
| R7 | Decide where resources/groups are relevant; resource colour used across all views, editable in timeline, random initial | **fixed**: colour resolves in every view (M6); in-timeline colour swatch emits `resource-update` (M8); initial colour stays the consumer's (demo ships a palette helper), §4 |
| R11 | "I cannot see buttons in the table to add resource-groups or resources" (post-merge) | **answered, not a defect** — the affordances shipped off by default by design (D5.1); §12.1 |
| R12 | Month/year date-click surface re-opened: "Doesn't necessarily need to be a popup, but the functionality should be provided by the scheduler" | **scoped** (M18) — year gains the panel, month's click opener becomes the default; one leak bug found (B23), §12.2 |
| R13 | Drag-move events between resources (timeline) | **scoped** (M19–M21) — the plumbing exists and drops the row in one function; four adjacent bugs found (B24–B27), §12.3 |
| R14 | No visible way for a user to remove an event when the developer allows it | **scoped** (M22) — `event-delete` shipped keyboard-only; pointer users have no delete path, §12.4 |
| R15 | The timeline's left (resource) column should be user-resizable | **scoped** (M24), §12.5 |
| R16 | Ellipsised resource labels need tooltips with the full text | **scoped** (M24), §12.5 |
| R17 | No way to change the text of a resource or group | **scoped** (M24) — was a deliberate §11.2 deferral, now due, §12.5 |
| R18 | Events don't get the colour of their resource, in any view | **answered + demo fix** (M25) — the WC resolution works; the demo's sample data defeats it, §12.6 |
| R19 | What happens when a resource/group is removed? Events should move to "(no resource)" | **scoped** (M19 + M25) — today they silently vanish from the timeline (B29), §12.7 |
| R20 | Ship a built-in event-edit popup (right-click / next to the event), on by default, with an input to disable | **scoped** (M23) — does not exist today; reverses §8.4 non-goal 3, §12.8 |

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

> **Implemented in full.** The bucket row and its localizable `unassignedResource` label
> shipped in M2; `options.requireEventResource` and the `resources: []` empty state (a
> `noResources` message row) followed in M15. The option warns **once per event id** — a
> drag re-renders every frame, and a per-frame console flood is its own defect — and it
> never hides the event: hiding data a consumer handed us is precisely the trap this whole
> decision exists to avoid.

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

**Year — do not build it.** *(Superseded in phase 2 — see §12.2. The user re-opened the
question after using the shipped month popover, and the costing below turned out to rest on
a false premise: a year surface does not require focusable mini-day cells if the panel
anchors on the month card.)* Clicking a month already drills to month view. A day-level
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
   in-WC form would need a save contract it cannot honour. *(Reversed in phase 2 by user
   decision — §12.8: `event-update` is that save contract; every drag commit already uses
   it.)*
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

### 11.5 M14 — a drag can reach off-screen time

Making the timeline scroll (M3) turned an awkwardness into an impossibility: with a grid
genuinely wider than the viewport (7 days x 48 slots), "drag this event to next Thursday"
could not be expressed at all, because a drag could only ever reach what was already
painted. Holding a drag inside 40px of a scroller edge now scrolls the grid, on both axes,
at a rate that ramps with depth into the zone (a constant rate is either too slow to be
useful or too fast to aim). Each frame re-feeds the unchanged pointer position to the drag
machine, so the preview keeps naming the slot under the cursor as the content moves beneath
it, and the loop stops on pointer-up, when the scroller hits its end, or when the drag ends.

Deliberately **not** an option. The deleted `dragScroll` flag was declared and unread; the
behaviour is what every consumer wants and a knob for it would only let someone switch off
the ability to reach half their own data.

### 11.6 M16 — the timeline ghost could not find its row (R9)

A resize preview carries no `resourceId` of its own — only a create-drag and a move-mode
resource nudge do — so the ghost's row had to come from the dragged event. That lookup read
`resource.events`, which **stopped being a live mirror when the model was normalized** in M2.
The consequence was sharply split and easy to miss: an event authored *nested* under its
resource still resolved (the demo's sample data is authored that way, so a casual check
passes), while every event supplied through the `events` input — i.e. everything a
drag-create, an `addEvent` call or a normal API response produces — resolved to `undefined`
and the ghost was dropped entirely.

The row now comes from the normalized store, and a resource-*less* event maps to the bucket
row instead of bailing out: it is legitimately in `(No resource)` and still deserves feedback.

On top in both selection states, which was the other half of the report: the ghost is
`$z-preview` (4) against a selected source's `$z-event-selected` (2) and an unselected
source's `auto`. Both states are now asserted in the browser at the centre of a real
overlap, using the `pointer-events` probe (the ghost is `pointer-events: none`, so
hit-testing skips it, while stacking is unaffected).

Three unit tests were verified to fail against the pre-fix code (`expected +0 to be 1`).

### 11.7 M17 — month columns and their headers share one minimum (R10)

Month view renders its day-name strip with week view's `.scheduler-day-headers`, whose cells
are `flex: 1 0 var(--scheduler-column-min-width)` (120px), while the calendar itself is a CSS
grid that was `repeat(7, 1fr)`. Two sizing systems over one set of columns: above ~840px they
agree, and below it the header row grows to its 840px minimum while the grid kept shrinking
to fit the panel. Measured at a 900px viewport: 120px headers over 75px cells.

The grid now carries the same per-column minimum
(`repeat(7, minmax(var(--scheduler-column-min-width), 1fr))` plus `min-width: fit-content`),
so both overflow together and the month view scrolls horizontally rather than squeezing a day
into illegibility — which is also what the report asked for. The sticky header pins only
vertically, so it travels with the columns while scrolled; verified at `scrollLeft: 250` with
the 4th header still exactly over the 4th column.

Guarded at three widths (1400 / 900 / 600) in the e2e: equal widths, equal offsets, and
horizontal overflow present only when narrow.

**Still outstanding** (deliberate follow-ups, none of them a reported defect):
the per-resource icon/legend for WCAG 1.4.1, `resource.allowOperations` per-item overrides,
month-view pointer create-drag, e2e coverage for the multi-day ghost and the timeline, and
the device re-check of timeline touch scrolling. See the plan's §"Outstanding work,
spelled out" for the implementation notes.

## 12. Phase 2 — post-merge review (R11–R20)

After #395 merged, the user reviewed against their original asks and reported four items
(R11–R14); a second review of the timeline added six more (R15–R20). A three-probe
investigation (each independent, all findings cited to code on `master`) established one
non-defect, one re-opened decision plus a leak bug, and one feature whose plumbing already
exists; the rest were verified directly. Executed as M18–M26 in the plan.

### 12.1 R11 — the add-resource/group buttons exist and are off by default (answered)

Not a defect: it is D5.1 working as designed. `createResource` / `createGroup` /
`updateResource` / `deleteResource` all default **false**
(`scheduler-core/src/models/permissions.ts:62-73`), `createAddBar()` returns `null` unless
one of the create capabilities is granted (`timeline-view.ts:512-515`), and a denied
capability renders *nothing*, not a disabled control. The demo starts at
`permissionMode: 'default'` with an **empty** resource list — so there are no rows, no
per-row buttons, and no add bar. Selecting **"Events + resource tree editable"** in the
demo's Permissions select (plus "Load Sample Data") reveals the full surface. The default
was deliberate: no surveyed peer library ships resource-creation UI at all (§5.2), so the
component's default behaviour stays "resources are data". The spec suite pins the default
(`mp-scheduler.keyboard.spec.ts` — "renders no creation UI by default").

Every other candidate cause was checked and ruled out: wrapper forwarding is correct,
permission toggles repaint (`rowsChanged` compares `resolvedPermissions` identity), all
message strings have defaults, nothing is CSS-clipped (the add bar is sticky
`bottom: 0` at `$z-sticky-column` with an opaque background), and codegen was not stale.

**Decisions:**

- **D12.1a — the WC defaults stay off.** D5.1's rationale is unchanged.
- **D12.1b — the demos become discoverable**: the Angular demo starts in
  `'resource-admin'` mode so the affordances are visible on first visit (the select still
  lets you switch back). The React/Vue demos get the same starting mode.
- **D12.1c — the crowding escape hatch is now due.** §11.2 said "revisit if a consumer
  grants all four capabilities and finds the column crowded" — the user is that consumer.
  With expand toggle + four 24px controls, a group title gets ≈50px of the 200px column.
  Rather than an overflow menu (a second popup surface inside a `rowheader`), widen the
  resource column when a row carries the full control set — the column is already
  `min(var(--scheduler-resource-column-width), 100% - 50px)`, so this is a CSS-only
  adjustment gated on the granted capabilities.
- **Noted, not built**: leaf rows in a *flat* resource list have no per-row add affordance
  (`timeline-view.ts:413` gates both add buttons on `isResourceGroup`); the root-level add
  bar covers that case, so nothing changes until a consumer reports otherwise.

### 12.2 R12 — the date-click surface: month by default, year by extension

#### As-built truth (month)

The M10 popover has three openers, all keyed by date: the `+N more` link (via
`moreLinkBehavior`, default `'popover'`), **Space** on a focused month cell (always on),
and a plain cell click — but only under `dayClickAction: 'popover'`, which defaults to
`'none'`. So the user's literal original ask — *"a popup that opens when a date is
clicked"* — shipped **opt-in and off**, and the demo ships it off too. A keyboard user
could reach the popover; a mouse user could not. That asymmetry is the real R12 complaint.

#### B23 — year mini-day clicks leak into the month-only popover path

Year mini-days carry `data-date` (`year-view.ts:108`), and the click handler's date branch
has **no view check** (`mp-scheduler.ts:1215`). Under `dayClickAction: 'popover'`, clicking
a year mini-day emits `date-click` (undocumented) and opens the popover — whose anchor
resolver only knows month cell ids (`#scheduler-cell-m-…`), so `OverlayController` finds
zero anchors, `position()` early-returns, and a `position: fixed` panel paints
**unpositioned** at its static position; focus-return dies the same way
(`resolveReturnTarget` → `trigger()` → `activeAnchor`, all null). Half-wired, not guarded.

#### Decision D12.2 — complete the leak instead of sealing it

- **D12.2a — year view gains the same panel, anchored on the month card.** A mini-day
  click opens the **day-scoped** panel anchored on its month card
  (`#scheduler-cell-y-YYYY-MM` — the card is a real focusable element, so positioning and
  focus-return both work). **Space on a focused month card** opens the **month-scoped**
  panel (that month's events grouped by day, "New event" for the first/focused day, "Show
  month" as the drill). Enter keeps drilling into the month, unchanged. This gives keyboard
  parity at panel granularity with zero new tab stops and no change to the year grid's
  roles.
- **D12.2b — REJECTED: `aria-activedescendant` mini-day sub-grid.** It looked like the
  cheap route to day-granular keyboard access, but activedescendant targets need real
  roles, and mini-days live *inside* a `role="gridcell"` — a grid-inside-a-gridcell is
  exactly the `aria-required-children` critical this component already hit (§11.4). Doing
  it properly means restructuring the year grid's roles (card → `row`, mini-days →
  `gridcell`), re-opening the roles the aria spec pins. Not worth it for day-vs-month
  panel granularity.
- **D12.2c — `dayClickAction` default flips to `'popover'`** (breaking behaviour change,
  documented): the user's original ask, verbatim, and it removes the mouse/keyboard
  asymmetry. `date-click` still emits first, unconditionally, so consumers keep their
  event; `'none'` remains for consumers who want the old behaviour. §8.4 non-goal 5 is
  hereby reversed — the concern it encoded (two meanings for one click) is answered by
  the emit-first ordering.
- **D12.2d — the panel's "New event" gains an optional resource picker** when resources
  exist: a `<select>` whose value rides on the existing `event-create.resourceId`. This is
  the honest serving of the "…or create a group" half of the ask — **group creation from a
  date surface stays rejected** (§8.4 non-goal 2 stands: a `ResourceGroup` is a node in the
  resource tree with no date dimension; a date-keyed surface cannot say where in the tree
  it goes; month/year views render no resources — confirmed, both views contain zero
  references to `Resource`/`ResourceGroup`).
- **D12.2e — the year `.has-events` text equivalent lands in the same change** (WCAG
  1.4.1, open since M10): the month card's accessible name gains its event count, and the
  panel is the interactive path to the detail. Any year surface without this announces as
  empty cells.

### 12.3 R13 — drag-move events between resources

#### The headline: ~15 lines of plumbing that were never connected

The row's resource id already reaches the drag machine on every pointer move:
`getSlotAtPosition` hit-tests through `shadowRoot.elementsFromPoint` and
`getSlotFromElement` reads `data-resource-id` (`mp-scheduler.ts:2407-2430`). Then
**`calculateMovePreview` throws it away** — it computes a time offset and returns
`{ start, end }` only (`drag-preview.ts:83-99`), and the commit path copies just those two
fields onto the event. Y influences nothing. (Contrast: `calculateCreatePreview` *pins* the
originating row **deliberately**, so a create-drag across rows extends time in its own row
— the asymmetry between the two is intentional and must survive the fix.)

**The keyboard half already ships**: on the timeline, move-mode's bare Up/Down steps
through resources, the preview mirrors it, the commit emits the new `resourceId`, and
`movedToResource` announces it. R13 is the pointer half plus the gaps below. Note
`event-update` carries `{ event, oldEvent, originalEvent }` — no `changes` field (that's
`resource-update`), so **no payload or wrapper changes** are needed: the new `resourceId`
rides on `event`, the old one on `oldEvent`.

#### Bugs found alongside (all on `master`)

- **B24 — pointer move-drag is not permission-gated.** `can('moveEvent', ev)` is consulted
  only by keyboard paths and inside `isEditable`'s OR-of-four; the pointer gesture checks
  nothing but `event.draggable === false`. So `permissions: { moveEvent: false,
  createEvent: true }` still allows a mouse move-drag today. Fix: per-gesture gate at
  pointer-down (`'event'` → `moveEvent`, `'resize-handle'` → the matching edge, `'slot'` →
  `createEvent || selectRange`) — also the natural future hook for
  `resource.allowOperations`.
- **B25 — the bucket row is unreachable by keyboard.** `adjacentResource`
  (`mp-scheduler.ts:2014-2024`) filters to real resources and overloads `null` as "no
  current resource", so neither plain cell navigation nor move-mode can reach
  `(No resource)`.
- **B26 — "move to unassigned" is dropped by truthiness.** `commitEventMoveMode` and
  `applyKeyboardMovePreview` both spread `...(workingResourceId ? { resourceId } : {})`,
  so a move *to* the bucket silently keeps the old `resourceId` and renders no ghost.
- **B27 — the demo doesn't re-parent.** `applyEventUpdate` rewrites the event in place
  inside its current resource's array; a cross-row move leaves an event carrying
  `resourceId: 'B'` stored under resource A. Renders correctly (resourceId wins), data is
  inconsistent.
- **B28 — the move-mode announcement lies on the timeline.** `moveModeEntered` says arrow
  keys nudge by N minutes; on the timeline Up/Down changes the resource. Needs a
  view-specific variant.

#### Decision D12.3 — the target row rides the preview, tri-state

- **D12.3a — `TimeSlot.resourceId` and `PreviewEvent.resourceId` widen to
  `string | null | undefined`**: `undefined` = this view has no resource axis (week/day),
  `null` = the unassigned bucket row. The bucket's slots get a distinguishable marker
  (`dataset` can't hold `null`, and an absent attribute is indistinguishable from week
  view's absent attribute — that ambiguity *is* the current bug). This matches the idiom
  already used by `eventsByResource: Map<string | null, …>`. **Every `??` on a resource id
  becomes suspect once `null` is meaningful — grep `resourceId ??` before finishing.**
- **D12.3b — `calculateMovePreview` carries the row**: target slot's `resourceId` when
  defined, else the original event's. Commit applies it (mapping `null` →
  `resourceId: undefined` on the emitted event, whose field stays `string | undefined`);
  resize commits never rewrite the row.
- **D12.3c — feedback**: the M16 ghost already relocates once the preview carries a row
  (its `rowKey` chain starts at `previewEvent.resourceId`); `updateGreyedSlots` gets scoped
  to the target row (today it greys the time band across every row — wrong feedback for a
  cross-row drag); the target row gains a `.drop-target` highlight (new rule, needs
  codegen). Vertical edge auto-scroll (M14) already reaches off-screen rows.
- **D12.3d — the row must come from hit-testing, never `y / rowHeight` arithmetic** — rows
  have unequal heights since M12 (track stacking). And **no pointer capture**: tracking is
  document-level with `elementsFromPoint`; `setPointerCapture` would retarget events to the
  dragged element and break row resolution.
- **D12.3e — known limitation, documented not fixed**: unassigning is not durable for
  events authored nested under `resource.events` — `collectNestedEvents` re-stamps
  `resourceId ??= owner.id` on the next `setResources`. Consumers who allow drops into the
  bucket should author events flat (the `events` input), which is already the recommended
  form post-D4.1.

Touch verification rides the existing open device check: `.scheduler-timeline-event` has
no `touch-action`, so a vertical cross-row touch drag depends on the 600ms-hold path — to
be verified on the same Android pass as M3's timeline scrolling.

### 12.4 R14 — a visible delete affordance for events

`event-delete` shipped **keyboard-only**: Delete/Backspace on the selected event, gated by
`can('deleteEvent', ev)` (`mp-scheduler.ts:1563-1567`, default `true`). There is no pointer
path anywhere — not in the day popover, not on a selected event. A mouse/touch user whose
developer granted `deleteEvent` still cannot remove an event. That inverts the usual state
of this component (M7 fixed keyboard paths *bypassing* gates that pointer paths enforced;
here the pointer path simply doesn't exist).

The placement constraint is structural: event boxes are `role="button"` in **all four**
event-rendering views (`week-view.ts:302`, `day-view.ts:215`, `month-view.ts:208`,
`timeline-view.ts:698`), so a focusable delete control *inside* an event box is a nested
interactive — invalid ARIA, and axe flags it.

**Decision D12.4:**

- **D12.4a — the day popover's event rows each gain a real delete `<button>`** as a
  *sibling* of the event button inside the row's `<li>` (no nesting problem), named
  `"Delete {event}"` via a new `messages` key, rendered only when
  `can('deleteEvent', event)`, emitting the existing `event-delete`. ≥24px target
  (SC 2.5.8). Focus after the emit moves to the next row's event button (the row is gone;
  focus must not fall to `<body>`), and the panel's count line re-renders.
- **D12.4b — REVISED by R20: the in-grid pointer delete lives in the built-in event
  editor** (§12.8), which carries a delete button gated on `can('deleteEvent', ev)`. The
  first draft of this decision was a pointer-only, `aria-hidden` × on the selected event
  (resize-handle idiom, to dodge the nested-interactive constraint); once the editor
  exists it is a strictly better surface — a real focusable `<button>` in a dialog, no
  aria-hidden pointer target, and it covers month chips too. The × is dropped.
- **Confirmation stays the consumer's job.** `event-delete` is a request like every other
  scheduler event; the WC does not own the data and must not own an "are you sure" dialog.
  Document this next to the permission table — a consumer who wants undo/confirm handles
  it in their `event-delete` listener.

### 12.5 R15–R17 — resource column UX: resize, tooltips, rename

Three reports about the same 200px column, solved together.

- **D12.5a — R15, the column becomes user-resizable.** A drag separator on the column's
  right edge, following the WAI-ARIA window-splitter pattern the repo's own splitter
  already implements: `role="separator"`, focusable, `aria-orientation="vertical"`,
  `aria-valuenow` as a percentage, arrow keys resize in steps. The separator writes
  `--scheduler-resource-column-width` on the host, so the consumer's own value stays the
  initial and the existing AG-Grid guard (`min(…, 100% - 50px)`) keeps binding both input
  channels. The separator lives outside the `role="grid"` (same reasoning as the add bar,
  §11.2 — no fake rowheader, no Tab stop inside a roving grid). This also retires D12.1c's
  capability-gated width tweak: when the granted-everything control set crowds a group
  title, the user can now just widen the column.
- **D12.5b — R16, full text on hover.** Every `.scheduler-resource-cell` /
  `.scheduler-resource-header` title span gets `title="{full text}"` — unconditionally,
  not "only when ellipsised" (measuring overflow per row per render buys nothing; a
  tooltip matching the visible text is harmless). The accessible name already carries the
  full title, so this is pointer-hover parity, not an a11y fix.
- **D12.5c — R17, rename ships, copying file-manager's proven idiom** (the §11.2 deferral
  is now due — a consumer asked). Trigger: **double-click the title** (double-tap on
  touch) or **F2** while the rowheader cell is focused — no new per-row button, the
  crowding budget is spent. The title swaps for an inline `<input class="rename-input">`
  seeded with the current title; Enter commits → `resource-update` with
  `changes: { title }` (typed wide for exactly this, §11.2); Escape cancels; blur commits
  (file-manager's semantics); result announced via the live announcer
  (`announceRenamed` idiom). Gated on `can('updateResource')`; under denial double-click
  and F2 do nothing (no dead affordance is rendered, consistent with the rest of the
  permission model). Focus returns to the rowheader cell by stable key after the rebuild.

### 12.6 R18 — resource colour: the resolution works; the demo defeats it (answered)

Verified on `master`: `resolveEventColor` (`event.color ?? resource.eventColor ??
resource.color ?? options.defaultEventColor ?? '#3788d8'`) is wired through
`base-view.ts:248` — the shared path **all** views' event boxes go through — plus the drag
ghost. The M6 feature is real and covered by specs, including the dynamically-added-event
path.

The demo never lets it fire: **every sample event carries an explicit `color`**
(`fillData`, e.g. `'#e83e8c'`), **the sample resources have no `color`/`eventColor` at
all**, and `onEventCreate` stamps `'#3788d8'` onto every created event. `event.color`
deliberately outranks the resource (the universal convention, §4.5) — so the resource
colour never has anything to do, and worse, recolouring a resource via the swatch changes
nothing visible, which reads exactly like the reported bug.

**D12.6 — fix the demo, not the WC**: sample resources get palette colours
(`nextPaletteColor` already exists for created resources); sample events drop their
explicit colours except one or two kept deliberately to demonstrate the override;
`onEventCreate` stops stamping a colour so created events inherit their row's. All three
demos. The WC changes not at all.

### 12.7 R19 — deleting a resource must not orphan its events invisibly

**B29 — events of a deleted resource silently vanish from the timeline.**
`indexByResource` keys strictly by `event.resourceId ?? null`
(`scheduler-state.ts:117-126`); timeline rows iterate the live resource tree plus the
`null` bucket. An event whose `resourceId` points at a resource that no longer exists sits
under a key no row reads: invisible in timeline, while week/day/month/year (flat store)
still render it. That is the D4.2 silent-data-trap in a new costume — the bucket-row
decision explicitly promised "never hide an event with no feedback".

**D12.7 — two layers, matching the request/consumer split:**

- **WC (render-time, M19)**: a `resourceId` that matches no known resource resolves to the
  bucket row — dangling ⇒ unassigned, the error defined out of existence. Dev-warn once
  per event id (the `requireEventResource` warn-once machinery already exists). This folds
  into M19 because it is the same file cluster and the same tri-state bucket semantics.
- **Demo (consumer behaviour, M25)**: `onResourceDelete` strips `resourceId` from all
  events under the deleted resource/group subtree — the user's proposal, and the
  behaviour the docs recommend to consumers. It stays the consumer's call (they may
  instead delete the events, or reassign them); the WC layer above guarantees the
  *default* outcome is visible-in-the-bucket rather than gone.

### 12.8 R20 — a built-in event editor, on by default

**As-is, stated plainly:** no built-in edit surface exists. The demo's double-click card
is app code (`scheduler.component.ts` — `onEventDblClick`/`openEditor`); the month day
popover lists and selects events but edits nothing. §8.4 non-goal 3 rejected an in-WC
editor on the argument "the WC owns no event data … a form would need a save contract it
cannot honour". **That argument was too strong and is hereby reversed by user decision:**
`event-update` *is* the save contract — every drag commit already uses it, the WC
pre-mutates internal state and the consumer applies the change. A form that emits the same
event honours the same contract.

There is also a compliance upside the demo comment already names: the editor is the
single-pointer, non-drag path to change an event's times (WCAG 2.5.7 Dragging Movements).
Built-in and on by default, the WC satisfies that itself instead of delegating it to every
consumer.

**Decision D12.8:**

- **D12.8a — surface**: an `OverlayController` popover anchored to the event's element
  (same mechanics, traps and z-rung as the day popover — anchor lazily by event id,
  `role="dialog"`, non-modal, Escape via the same host-level gate, focus back to the
  event box on close). Fields: title (text), start/end (`datetime-local`), colour
  (optional `<input type="color">`, same control as the resource swatch). Buttons: Save →
  the existing `event-update` (with `oldEvent`); Delete → the existing `event-delete`
  (this is D12.4b's revised home); Cancel.
- **D12.8b — openers**: **double-click** the event (double-tap on touch — the 600ms hold
  is drag on touch, so long-press is not available), **right-click** (`contextmenu`,
  `preventDefault()`d on event boxes only — the user's suggestion), and **F2** on the
  selected event (mirrors the resource rename key, M24). Enter stays move-mode; the
  keymap text gains the editor line, permission-gated like the rest (§6.4).
- **D12.8c — gating**: the editor opens when *any* of its fields is permitted, and each
  field individually respects the existing table — title/colour under a new
  `SchedulerPermissions.editEvent` (default `true`; the event caps were deliberately
  additive), start/end under `moveEvent`/`resizeEventStart`/`resizeEventEnd`, the delete
  button under `deleteEvent`. `readonly` kills it wholesale. Per-event `editable: false`
  is honoured.
- **D12.8d — the on/off input, as requested**: `options.eventEditor?: boolean`, default
  **`true`**, exposed as a first-class input on all three wrappers (Angular
  `[eventEditor]`, React `eventEditor`, Vue `:event-editor`) as well as through
  `options`. Consumers who own their editor (like the demo used to) set `false` and keep
  receiving `event-selected` double-click semantics unchanged.
- **D12.8e — the demo's own card is retired** in favour of the built-in editor, with one
  demo toggle showing `eventEditor: false` + a consumer-owned editor as the escape-hatch
  recipe. Validation stays minimal in the WC (end > start, required title trimmed
  non-empty) — anything richer is the consumer's `event-update` listener.
- **D12.8f — the colour field is TWO-STATE, owned by an "Inherit from resource"
  checkbox** (added after review, and it fixed a defect the first cut shipped with).
  `event.color` is either absent (inherit) or a string (override), but
  `<input type="color">` has no empty state and the field is seeded with the *resolved*
  colour — so reading the swatch unconditionally converted every inheriting event into an
  explicitly-coloured one on the **first Save, without the user touching anything**. Such
  an event then stops following its resource forever, most visibly after a cross-row move
  (§12.3): it keeps the old resource's colour while sitting in the new one's row. The
  checkbox reflects `!event.color`, disables the swatch while checked (so the inherited
  value is visible but not committable), and re-checking it CLEARS an existing override —
  the reset a colour input cannot express on its own.

  Rejected: inferring intent by dirty-checking the swatch against the resolved colour. It
  cannot distinguish "left alone" from "deliberately pinned to the resource's current
  colour so it stops following future changes", which is a legitimate thing to want.

  Note for consumers weighing this: where colour means resource IDENTITY, consider not
  offering the override at all (the timeline's per-resource swatch is the right place to
  change colours). Where colour is per-event decoration, the checkbox is the honest
  control. The field is not currently gated by its own option — say so if you want one.

  The control is an **`<mp-checkbox>`**, not a bare `<input type="checkbox">`: Bootstrap's
  `.form-check` styles do not cross a shadow boundary, so a native input in this panel
  renders unstyled, while the WC carries its own styling inside its own shadow root. Same
  reasoning as `mp-datatable`'s selection column, and the first cross-WC dependency the
  scheduler takes (a plain side-effect import, per that precedent). See §12.10 for how the
  panel's other controls were settled.

### 12.9a B30 — the editor refuses a start-only change instead of moving the event

Reported as "I pick another start/end date-time, but the event's timestamps aren't
updated". Reproduced in a real browser: the picker is innocent — it updates correctly
(`2026-07-29T10:00` → `2026-07-31T10:00`). **Save then refuses**, showing
*"End must be after start."*, because moving the start past the untouched end trips the
`end <= start` guard. Nothing is emitted, so the event does not move.

The bug is the *contract*, not the validation. **Every other path in this component that
changes an event's start preserves its duration** — a pointer move-drag
(`calculateMovePreview` applies one offset to both edges) and keyboard move-mode both do.
Only the editor demands that the user fix the end *first*, and hard-stops otherwise; and
since "start" is the field a user naturally edits first, it is a dead end on the most
obvious path. It also punishes the common intent ("same meeting, two days later") to
protect against one that is genuinely rare.

**Decision D12.10 — the editor moves the event, like every other surface.** Changing the
**start** shifts the **end** by the same delta, live, so the end field visibly follows and
the duration is preserved. Changing the **end** sets the end alone (that is a resize, and
the only way to express one here). An end explicitly placed before the start is still a
real error and still refused — the guard stays, it just stops firing on a gesture that
should never have reached it.

Live rather than at Save on purpose: the user must SEE the end follow, or the editor is
silently deciding something they cannot check before committing.

### 12.9b B31/B32 — the editor lost the edit when the panel re-rendered

Reported again after B30 shipped: "change the start-date, the event remains at the same
spot". B30 was real and fixed, but it was not the whole story — and the second half is the
more interesting bug, because **the tests that should have caught it all passed**.

Found by driving a real browser and tracing the picker's value at each stage:

```
PRE-SAVE        startPicker = Jul 30   ← the pick landed
MOUSEDOWN       startPicker = Jul 30   ← still right when the button goes down
CLICK(capture)  startPicker = Jul 28   ← RESET between mousedown and click
EMIT            start       = Jul 28   ← Save commits the stale value
```

**B31 — a re-render reset the controls, and Save read the DOM.** The editor's fields were
Lit bindings fed from the STORED event (`.value=${event.start}`), while the scheduler
re-renders on any state change — including the one a mousedown on Save itself provokes.
So the controls were reset to the stored values *between mousedown and click*, and
`saveEventEditor`, which scraped the DOM, committed those. The edit was discarded with no
error, which is exactly "nothing happened".

Why every existing test missed it: they all drove Save with a programmatic `.click()`,
which fires **no mousedown**, so the clobbering re-render never happened. They also set
`input.value = …` directly, which fires no `input` event. Both are DOM-poking rather than
user simulation, and both hid the defect. The specs now dispatch real events, and one
regression test forces a state change mid-edit deliberately.

**Decision D12.11 — the editor holds a working DRAFT.** `editorDraft` (title, start, end,
colour, inherit) is seeded when the editor opens, updated by each field's own handler, and
is the single authority for BOTH the render and the commit. A re-render therefore restores
what the user edited instead of overwriting it, and Save never touches the DOM. This is
the shape keyboard move-mode has always used (`keyboardMove`), and the same reasoning as
D12.8f: the component's state, not a control's DOM value, is what a commit reads.

**B32 — the selection kept a stale copy.** Surfaced by the same spec run.
`SchedulerStateManager.updateEvent` refreshed `events` and `flatEventsInput` but not
`state.selectedEvent`, which holds an event OBJECT rather than an id. After any commit —
editor Save, drag, keyboard move — the selection still pointed at the pre-edit record, so
`F2` (which opens the editor from `selectedEvent`) showed the OLD values, and a consumer
bound to `[(selectedEvent)]` was handed data it had just replaced. `updateEvent` now
re-points the selection when the ids match.

*Adjacent and NOT fixed here:* `removeEvent` leaves a deleted event in `selectedEvent`
the same way. It is the same class of bug, but changing it also changes when
`selection-change` fires, so it is a decision rather than a slip — flagged, not smuggled in.

### 12.10 Styling the in-shadow form controls (D12.9)

The editor and the day popover render form controls inside the scheduler's shadow root,
where **Bootstrap's page stylesheet cannot reach them** — the repo's most frequently
re-learned trap. Every one of them was rendering as an unstyled browser default. Two
different remedies apply, and which one is right turns on whether the control owns a popup:

- **D12.9a — swap for the `mp-*` WC when it is a plain control.** The day popover's
  resource picker is now an **`<mp-select>`**, which wraps a *native* `<select>` and owns
  **no OverlayController**, so nesting it inside a popover cannot interfere with that
  popover's dismissal, focus return or Escape handling. `value` becomes a host property;
  nothing else changes.
- **D12.9b — the time fields are `<mp-datetime-picker>`, once the arbitration was
  designed.** Initially deferred (see D12.9d): it runs **two** `OverlayController`s of its
  own, the editor is *itself* an overlay, and the scheduler's host-level `keydown` closed
  the whole editor on Escape whenever it was open — so an Escape meant for a nested
  calendar destroyed the editor and the user's unsaved edits. That is a real defect, not a
  reason to avoid the component, and the mechanism to fix it already existed.

  **The rule: a host that handles Escape itself must ask the dismiss stack whether the
  Escape is actually its own.** `OverlayController` already gates its *own* document-level
  handler on `isTopOfStack()`; the scheduler's handler bypassed the stack entirely. The
  private check is now exposed as **`OverlayController.isTopmost`**, and both scheduler
  gates consult it. When it is false the handler declines *silently* — no `preventDefault`,
  no `stopPropagation` — which is what lets the event continue to the document-level
  listener belonging to the layer that owns it. A host handler runs first precisely because
  it is on the element rather than the document, so this ordering is the whole problem.

  The outside-click half needed nothing: `OverlayController`'s dismissal tests
  `composedPath().includes(this.host)`, and the host is the *scheduler*, so no click
  anywhere inside it (popups included) can close the editor. The picker's own overlays use
  the same rule against *their* host, so clicking the editor around them closes them
  correctly.

  Wiring: `value` is a real `Date`, so the editor no longer round-trips times through
  strings — `toLocalInputValue` is deleted. `locale`, `first-day-of-week`, `hour12` (from
  `timeFormat`) and `step` (derived from `slotDuration`, clamped to the picker's supported
  steps) are passed through so the picker agrees with the grid it is editing. The popups
  are `position: fixed`, so the editor's `overflow-y: auto` cannot clip them — but that
  also means **nothing above them may gain `transform`/`filter`/`contain`**, the same
  constraint §8.3 records for the day popover.
- **D12.9d — sequencing note, kept deliberately.** D12.9b shipped as a *rejection* first,
  on the grounds that overlay-in-overlay arbitration is a design change and does not belong
  in a styling pass. That was the right call for a styling pass and the wrong end state:
  asked for directly, the arbitration turned out to be ~15 lines plus one public getter,
  because the dismiss stack was built for exactly this. Recorded rather than rewritten,
  because "the component is fine, the host's Escape handling was wrong" is the part worth
  remembering — and any future nested overlay in this component now works for free.

- **D12.9c — the remaining native inputs get the styles instead, not a new component.**
  New shared `_styles/form-control.styles.scss`, a pass-through to Bootstrap's
  `forms/form-control` module in the exact shape of the existing `form-check` and
  `form-select` sheets, added to the scheduler's `static styles` (FIRST, so the
  component's own rules win any specificity tie). The title field, the colour swatch
  (`.form-control-color`, whose `::-webkit-color-swatch` rules are otherwise unreachable)
  and the timeline's inline rename input now carry `.form-control`
  and get Bootstrap's border, focus ring and disabled appearance for free — with no new
  runtime dependency and no interaction risk. Every selector in the generated sheet is
  class-scoped, so it cannot affect anything in the grid that does not opt in.

  The sheet deliberately carries **no `:host` rule**, unlike its two siblings: its
  consumers are components that render inputs *among other content*, not components that
  *are* one control, so sizing the host would be wrong.

### 12.9 Phase-2 as-built API surface

One list, so consumers and the wrappers do not have to read nine commits.

**Added — `SchedulerOptions`**
- `eventEditor?: boolean` — default **`true`**. The built-in event editor (§12.8).

**Added — host attribute / property**
- `event-editor` attribute + `eventEditor` property, same dual-state shape as `readonly`.
  The ATTRIBUTE outranks `options.eventEditor`, and only the literal `"false"` disables, so
  a wrapper can render it unconditionally from a boolean.

**Added — `SchedulerPermissions`**
- `editEvent` (default **`true`**) — the editor's title/colour fields. Time fields follow
  `moveEvent` / `resizeEventStart` / `resizeEventEnd`; the delete button follows
  `deleteEvent`.

**Added — messages** (`options.messages`): `showMonth`, `newEventResource`,
`yearMonthCardLabel`, `deleteEventLabel`, `moveModeEnteredTimeline`,
`eventInstructionsWithEditor`, `resizeResourceColumn`, `renameResourceLabel`,
`resourceRenamed`, `eventEditorLabel`, `editorTitleLabel`, `editorStartLabel`,
`editorEndLabel`, `editorColorLabel`, `editorSave`, `editorCancel`, `editorDelete`,
`editorInvalidRange`, `editorTitleRequired`, `editorInheritColor`.

**Added — CSS**: `--scheduler-drop-target-bg` (the cross-row drag's target-row tint);
`.scheduler-timeline-row.drop-target`, `.scheduler-column-resizer`, `.rename-input`,
`.popover-event-delete`, `.popover-resource`, `.popover-day-groups`,
`.scheduler-event-editor` and its children.

**Changed (breaking)**
- **`options.dayClickAction` now defaults to `'popover'`** (was `'none'`). A day-cell click
  emits `date-click` first, exactly as before, and then opens the popover. Set `'none'` to
  keep the click purely an event for the consumer.
- **`TimeSlot.resourceId` and `PreviewEvent.resourceId` widen to `string | null | undefined`**
  (`undefined` = no resource axis, `null` = the unassigned bucket row). Consumers do not see
  these types; anything reading them internally must test `=== undefined`, not truthiness.
- **A pointer move-drag is now refused when `moveEvent` is denied** (it was allowed —
  B24). Same for each resize edge and for slot drags without `createEvent`/`selectRange`.
- **Timeline drag feedback is scoped to one row**: greying no longer spans every resource.

**Behavioural additions**
- Dragging an event vertically in the timeline **re-assigns its resource**; dropping it on
  `(No resource)` clears `resourceId`. `event-update` carries the new row on `event` and the
  old one on `oldEvent` — no payload change, so no wrapper change.
- Keyboard move-mode and plain cell navigation reach the bucket row (B25/B26).
- An event whose `resourceId` names no known resource renders in the bucket row with a
  once-per-event dev warning instead of vanishing from the timeline (B29).
- Year view: `Space` on a month card opens a month-scoped popover; a mini-day click opens a
  day-scoped one, both anchored on the card. Month cards announce their event count.
- The date popover's rows carry delete buttons; its create action carries a resource picker.
- The timeline resource column is resizable (drag or arrow keys), its titles carry
  full-text tooltips, and rows rename inline via double-click or `F2`.

**Wrappers**: Angular gains `[eventEditor]`; React `eventEditor`; Vue `:event-editor`.
Nothing else changed — every new surface reuses the existing event contracts.
