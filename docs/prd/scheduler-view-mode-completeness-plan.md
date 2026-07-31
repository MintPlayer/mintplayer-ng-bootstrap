# Plan — Scheduler view-mode completeness

PRD: [scheduler-view-mode-completeness.md](./scheduler-view-mode-completeness.md)
Branch: `fix/scheduler-preview-z-order` → PR
[#395](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/395)
Status: **In progress.** Delivered: M1, M2, M3, M4, M5, M6, M7 (+ the dead-API deletions
and version bumps). Outstanding: M8 (timeline creation affordances), M9 (event-surface
cleanup), M10 (month popover), and the M11 items that need a browser/device.
Verification runs in CI on each push rather than as a long local sweep.

## Conventions

- After any `.styles.scss` edit: `npx nx run mintplayer-web-components:codegen-wc`. The
  generated `.styles.ts` is a gitignored build artifact — never stage it.
- Views build DOM imperatively and **tear down/rebuild all event nodes on every state
  change**; anything holding focus must be restored by stable key (four rAF call sites
  already do this).
- New strings go through `options.messages`; new colours/sizes through `--scheduler-*`
  custom properties; new z-index rungs through the `$z-*` ladder at the top of the SCSS.
- **Batch the suites**: verify milestones by reading + type-check, run the full sweep once
  at the end (M11). Commit per milestone.
- Nx is flaky on this machine: `NX_ISOLATE_PLUGINS=false NX_DAEMON=false`, vitest
  `--pool=threads`. A single "failed" build that prints bundle sizes is usually flake —
  re-run before believing it.

## Ordering rationale

M1 first because **B2/B22 silently corrupt output** for consumers who use business hours or
live west of UTC, and they're small. M2 (data model) must precede M4–M6, since timeline
creation, the bucket row and cross-view colour are all meaningless until the two event
sources are reconciled. M3 is independent CSS and can land any time. Permissions (M7) come
after the affordances they gate exist.

---

## M1 — Correctness bugs that corrupt output [B1, B2, B22, B21]

Small, high value, no API change. **Do these first.**

- [x] **B2 — `slotMinTime` offset.** Extract the top/height geometry from
      `week-view.createEventElement` / `day-view.createEventElement` /
      `renderPreviewEvent` into ONE `BaseView.partGeometry(part, options)` helper, and make
      it offset by `slotMinTime` and clip to `[slotMinTime, slotMaxTime]` per day. Reuse
      `parseTimeOnDay`'s `setSeconds` trick (`slotMaxTime` defaults to `'24:00:00'`, which
      `setHours` would wrap). Verify with the PRD's worked example: 09:00 event under
      `slotMinTime: '08:00'` must render at `top: 80px`, not `720px`.
- [x] **B1 — week-view last-slot end mis-stamp.** Stop rebuilding `slotEnd` from
      `slotTemplate.end.getHours()` (`week-view.ts:94-100`); use the raw slot object as
      day-view does (`day-view.ts:90-93`), or derive `end = start + slotDuration`.
- [x] **B22 — month-view UTC parse skew.** `dayKey` writes local components but readers do
      `new Date('YYYY-MM-DD')` (UTC). Either parse the key as local or carry a full ISO
      string like year view. Add a unit test that pins the round-trip **at a negative UTC
      offset** (the bug is invisible at UTC+0 and east — see the PRD table).
- [x] **B21 — `dayMaxEvents: false` silently means 3** (`month-view.ts:179-181`). Honour
      `false` as "show all", `true` as "auto", number as the cap.
- [x] Unit tests for each; B2 and B22 get explicit regression cases.

## M2 — Normalize the event/resource model [D4.1, D4.2, B5–B12]

The keystone. Nothing in M4–M6 works until this lands.

- [x] Internal store: `state.events` + derived `Map<string | null, SchedulerEvent[]>` index
      by `resourceId`, recomputed when `events` **or** `resources` is set. Flatten nested
      `resource.events` at set time, stamping `resourceId ??= owner.id`. Dev-warn on
      duplicate ids across both inputs.
- [x] Timeline reads `index.get(resource.id)` instead of `resource.events`
      (`timeline-view.ts:286`) — and stops destructuring `events` unused (`:255`).
- [x] **Delete the bridges**: `updateEvent`'s double-write + `updateResourceEvent` helper
      (`scheduler-state.ts`), the resource sweep in `getEventById` (`mp-scheduler.ts`).
      Fix `addEvent`/`removeEvent` to be correct for both worlds via the store.
- [x] Delete the five dead `resourceService` event mutators [B8].
- [x] Tighten `isResource` to `!('children' in item)` [B9]; add a unit test for the
      both-fields object that currently satisfies both guards.
- [x] Honour `ResourceGroup.collapsed` as the initial value of `state.collapsedGroups`
      [B10], or delete the field — decide and document; silently ignoring it is the one
      unacceptable outcome.
- [x] `resourceId` becomes authoritative [B12]; move-mode seeds from the index, not from a
      possibly-contradicting field.
- [ ] **"(No resource)" bucket row** + `requireEventResource` option + a real empty state
      when `resources` is empty [D4.2]. New `messages` keys.
- [x] Verify: an event created in week view now appears in timeline's bucket row (the
      user's R2, end to end).

## M3 — Timeline two-axis scrolling [D7.1, B16, B17, B19, B20]

Independent of everything else; pure CSS plus one markup wrap.

- [x] The nine SCSS changes in PRD §7.2 (single scroller, `min-width: fit-content` chain,
      sticky resource column with opaque background, `$z-sticky-column: 7`).
- [x] Wrap both timeline header rows in one sticky `.scheduler-timeline-head`; make the
      rows static (fixes the two-stickies-stacking latent bug).
- [x] AG-Grid-style guard: frozen column width capped at `container − 50px`.
- [x] Promote `slotWidth` (`timeline-view.ts:24`) to a `--scheduler-*` custom property.
- [x] Week/day: make `.scheduler-time-gutter` sticky-left too (same defect, same fix).
- [x] Delete the dead `.scheduler-body`/`.scheduler-sidebar`/`.scheduler-grid` rules.
- [x] Fix `clearContainer` so per-view classes don't accumulate on `.scheduler-content`.
- [x] ARIA drive-bys in the header being touched: the time-label row needs `role="row"`,
      its slots container `role="presentation"`, and `aria-rowcount` must count both
      header rows.
- [ ] **Still to verify on a real touch device** — `scroll-blocked` and pan-mode now target
      the element that actually scrolls. **Do not** raise `touchMoveThreshold` (see the retracted B18
      note: it's coupled to the browser's touch slop).

## M4 — Multi-day ghosts [D3.1–D3.8, B3, B4]

Depends on M1's shared geometry helper.

- [x] `renderPreviewEvent` (week + day) splits via
      `timelineService.splitInParts(previewEvent)` → one ghost per in-week part, appended
      last in each part's own container; out-of-week parts `continue`, never abort [B4].
- [x] `querySelectorAll(...).forEach(remove)` in all three views [D3.2].
- [x] Seam borders: suppress `border-bottom` on non-`isEnd`, `border-top` on non-`isStart`.
- [x] `updateGreyedSlots`: drop the start-or-end-day filter; the existing overlap test is
      already multi-day-correct [B3]. Day view: clamp instead of bailing.
- [x] Timeline: fix the create-drag ghost gap **introduced by my own z-order commit** —
      `if (!resourceId) return` can never pass for a create (`dragState.event` is null); and
      make `updateGreyedSlots` filter by resource so a create-drag stops greying every row.
- [ ] **Outstanding**: existing specs pin ghost count === 1, sibling-ness and last-child; they use a
      single-day fixture so they stay valid — add a multi-day case asserting one ghost per
      expected column.

## M5 — Timeline drag-create end to end [§5.1, B5]

Depends on M2.

- [x] Add `resourceId` to `TimeSlot`; have `getSlotFromElement` read `data-resource-id`.
- [x] Forward `slotElement`/`resourceId` through `activateDrag` into the `active` state and
      `DragCompletionResult`, so `preview.resourceId` is populated for pointer drags.
- [ ] Verify `event-create` from a timeline row drag carries the right `resourceId`, and the
      created event lands in that row (needs M2).
- [ ] **Outstanding**: first timeline e2e coverage — there is currently **none**.

## M6 — Resource colour across all views [D4.4, B11]

Depends on M2.

- [x] `resolveEventColor(event, resourceById, options)` in `scheduler-core/utils/color.ts`;
      replace the four duplicated hardcodes and promote `'#3788d8'` to
      `options.defaultEventColor`.
- [x] Settle `eventColor` = event fill, `color` = row-header tint; fall back
      `eventColor ?? color`.
- [x] **Test the dynamically-added-event path** — the exact case where FullCalendar,
      Bryntum and DevExpress each regressed.
- [ ] **Outstanding** (WCAG 1.4.1): optional per-resource `icon` (Outlook-"charm" idiom) + legend for WCAG 1.4.1, so
      resource identity isn't colour-only.
- [x] Colour edits in timeline emit `resource-update`; the WC never invents a colour
      (deterministic palette helper for consumers instead).

## M7 — Permission model [D6.1, D6.2, B13, B14]

After the affordances exist. **B13 is the highest-value item in this milestone.**

- [x] `options.permissions: boolean | Partial<SchedulerPermissions>` + `readonly` host
      attribute + one internal `can(cap, subject?)` resolver.
- [x] **Gate every keyboard mutation path** [B13]: `Enter`→create, `Delete`→delete,
      `M`/`Enter`→move-mode and its `Shift+Arrow` resize, `Shift+Arrow` range selection.
      Move-mode must also honour `event.draggable`/`resizable`, which it ignores entirely
      today.
- [x] Per-item flags become **tri-state** (`boolean | null`, `null` = inherit); fix the dead
      `event.editable`; honour `event.resizable`'s `{start, end}` form; add
      `resource.allowOperations`.
- [x] ~~`editable`/`selectable` become documented aliases~~ — **deleted outright**
      instead (user: no back-compat needed), together with the six dead flags and the
      five dead `resourceService` mutators. Versions bumped for the breaks.
- [x] Delete the six dead option flags (folding `eventStartEditable`/`eventDurationEditable`
      into `resizeEventStart`/`resizeEventEnd`) [B14].
- [x] One opt-in `permissions.canCreateAt?(range, resourceId)`, evaluated **only** at
      pointer-down, drag completion and Enter-commit. Documented as costly; greying is not
      driven by it.
- [x] **A11y**: compose the `aria-describedby` keymap text from per-capability fragments and
      drop the attribute when empty; check permission *before* announcing; keep grid cells
      focusable in read-only (gate commands, not navigation); gate the demo keymap prose.

## M8 — Timeline creation affordances [D5.1]

- [ ] Bottom "Add resource" row pinned in the frozen column; per-group overflow action for
      nested groups. Named `"Add resource to {group}"` etc. via `messages`.
- [ ] New request events `resource-create` / `group-create` / `resource-update` /
      `resource-delete`, `bubbles` + **`composed: true`** [D5.2].
- [ ] Default **off** (`createResource`/`createGroup` default `false`) — no peer library
      ships this, so the default stays "resources are data".
- [ ] `:focus-visible` for the new buttons **and** the existing `.expand-toggle`, which has
      none. Focus restored by stable key after add.

## M9 — Event-surface cleanup [D5.2, B15]

- [ ] Resolve `date-select`: emit it on range selection, or delete it and the live-but-dead
      Angular `dateSelect` output [B15].
- [ ] Collapse the duplicated type surfaces (`scheduler-core/models/events.ts` vs
      `scheduler/events/event-types.ts`) to one source.
- [ ] Fix the React wrapper's wrong `onSelectionChange` / `onEventDelete` types.
- [ ] Add `composed: true` to the emitter.

## M10 — Month day popover [D8.1, §8.3]

- [ ] `moreLinkBehavior: 'popover' | 'day' | fn` (default `'popover'`) and
      `dayClickAction: 'none' | 'popover'` (default `'none'`, preserving `date-click`).
- [ ] `OverlayController` panel, `role="dialog"`, `modal: false`, `dismissStack` Escape,
      `initialFocus: 'first'`, anchor resolved lazily by date key.
- [ ] Handle all four traps: local scroll listener on `.scheduler-content` (`scroll` is not
      composed, so reposition/close are otherwise dead); document the `position: fixed`
      containing-block constraint; anchor by stable key across rebuilds; gate the host
      `keydown` so Escape doesn't clear the selection before closing.
- [ ] Contents: date + count header, full event list reusing `formatEventAriaLabel`
      (activation → existing `event-selected`), "New event" → existing `event-create`,
      "Show day" → today's drill. **No new event types.**
- [ ] Year view: **no popover**; instead fix Enter emitting a month-spanning `event-create`
      (drill instead) and give `.has-events` a text equivalent.

## M11 — Batched verification sweep

- [ ] `nx run mintplayer-web-components:codegen-wc` then
      `nx build mintplayer-web-components`, the three wrapper builds, full vitest.
- [ ] New e2e: multi-day ghost (one box per column), timeline drag-create with resourceId,
      timeline two-axis scroll with pinned column, read-only mode (no affordances, cells
      still focusable, keymap text shortened), month popover open/escape/focus-return.
- [ ] axe sweep in all three demo apps; add `resources` bindings to the React/Vue demos so
      timeline is exercised at all [B7].
- [ ] Device check: touch scrolling in timeline (M3) and week (unchanged) on Android.
- [ ] Update all three demo pages' keymap docs + the wrapper surfaces.

---

## Explicitly rejected (do not resurrect without new evidence)

- **Per-group always-visible add buttons** — no peer library ships resource creation at all;
  planning tools derive groups from a field. Costs N duplicated names, N focus stops, and a
  dead disabled button per row under `createResource: false`.
- **Making timeline additionally read the flat `events` list** — hardens the two-source
  defect into the architecture; an event with a `resourceId` becomes renderable twice.
- **Deleting nested `resource.events` outright** — right destination, but breaks every
  consumer, demo and spec fixture now for no user-visible gain over normalizing internally.
- **Predicates as the primary permission API** — honest greying calls a consumer callback per
  cell (hundreds to thousands) and per pointer-move; unserializable, undiffable.
- **Year-view popover** — would require making ~500 mini-day cells focusable, reversing a
  deliberate documented a11y decision, for a case already covered in two activations.
- **Group creation from a month/year popup** — category error: `ResourceGroup` has no date
  dimension and those views don't render resources, so the popup can't say where in the tree
  it goes.
- **Split scroll panes for the timeline** — the industry norm, but week view already proves
  single-scroller + sticky works in this shadow root; revisit only if virtualization lands.
- **Raising `touchMoveThreshold`** — coupled to the browser's touch slop; see the retracted
  B18 note.

---

# Session handover — read this first if you are resuming

Everything needed to continue without the originating conversation, which was compacted.

## Where things stand

Branch `fix/scheduler-preview-z-order`, folding into PR
[#395](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/395) (base `master`).
Commits, oldest first:

```
22d956f5 fix(scheduler): keep the drag ghost above its source event; name the z-index ladder
213f8392 docs(scheduler): PRD + plan for view-mode completeness (22 defects, all decisions made)
3691390b fix(scheduler): honour slotMinTime, fix last-slot stamping, split multi-day ghosts (M1+M4)
ba3fcf78 feat(scheduler)!: normalize the event/resource model into one store (M2, fixes R2)
d4792213 fix(scheduler): timeline scrolls on both axes with a pinned resource column (M3, fixes R5)
de98e097 feat(scheduler): timeline drag-create carries its resource; resource colour in every view (M5, M6)
5f9b8c50 feat(scheduler): real read-only support via a permissions model (M7, fixes R4)
0a4b45ce feat(scheduler)!: delete dead API, fix month UTC skew and dayMaxEvents:false; bump libs
22ff1f34 docs(scheduler): mark the plan against what is actually delivered
4fcfb775 docs(scheduler): bring the PRD in line with what shipped
```

Versions were already bumped in `0a4b45ce` — do **not** bump again for M8-M10 unless
another break lands: web-components **2.5.0**, ng-bootstrap **22.9.0**, react-bootstrap
**19.11.0**, vue-bootstrap **3.12.0**. Repo convention: majors track framework majors, so
breaking changes ride the minor (precedent #390/#392/#393/#394).

## Working agreements established with the user

1. **Push and let CI run the suites.** Do not make the user sit through a full local sweep;
   they interrupted one to say exactly this. Keep locally: targeted specs while iterating
   (`-t "<name>"`), a build for type-checking, and the pre-fix check that a new test really
   fails without its fix. Everything else goes to CI on push.
2. **No back-compat shims.** Dead or superseded API gets deleted plus a version bump, not
   deprecated. This reversed an in-flight decision to keep `editable`/`selectable` as
   aliases.
3. **Keep the PRD and plan current** — the conversation is compacted, so these files are
   the durable record. Never tick a checklist item you did not do; an inaccurate plan is
   worse than no plan.
4. **Work stays on this branch and this PR.** No new branch or PR without explicit
   permission (standing repo rule).
5. The user reviews as they go and pushes back with device evidence — see the retracted
   B18 in the PRD. Prefer verified claims over plausible ones.

## Environment gotchas (these will otherwise waste time)

- Always `NX_ISOLATE_PLUGINS=false NX_DAEMON=false`; the Nx plugin worker dies
  intermittently on this machine. Vitest additionally needs `--pool=threads`.
- Nx sometimes reports a **false build failure** and even prints "Nx detected a flaky task".
  If the run printed bundle sizes and `built in …`, re-run before believing it.
- **Every push cancels the previous CI run** (concurrency group), so a `cancelled`
  conclusion on an older SHA is normal rather than a failure. Batch pushes when you want a
  run to survive to completion.
- `TZ=… node` does **not** take effect in Git Bash here. To exercise timezone behaviour, do
  the UTC-offset arithmetic explicitly instead of relying on `process.env.TZ`.
- `git add` prints CRLF→LF warnings constantly on Windows. Harmless.

## How to verify scheduler behaviour by hand

- Serve the demo with `npx nx serve ng-bootstrap-demo` (dev, fast) or
  `--configuration=production --port=4200` (what the e2e config uses). The production build
  takes 2-3 minutes and Playwright's own `webServer` gives up at 180s, so start it yourself
  and let `reuseExistingServer` adopt it.
- The demo scheduler page is **empty until you click "Load Sample Data"**. Several
  "nothing renders" observations trace back to this, including part of R2.
- Sample data the tests and e2e rely on: `Lunch & Learn` (12:00-13:00 Wednesday),
  `All Hands Meeting`, five `Team Standup`s; timeline resources Alice / Bob / Diana under
  nested groups.
- Playwright MCP is available for interactive checks. **The drag ghost is
  `pointer-events: none`, so `elementsFromPoint` can never return it** — set
  `preview.style.pointerEvents = 'auto'` for the probe only. `pointer-events` plays no part
  in the stacking algorithm, so the reported order is still true paint order.
- To prove a regression test is meaningful: copy the fixed file aside,
  `git checkout -- <file>`, run the test, confirm it fails with the expected value, restore.
  Done for the geometry and timeline-ghost tests.

## Test inventory

`libs/mintplayer-web-components/scheduler/src/components/mp-scheduler.keyboard.spec.ts`
carries the new suites, appended in this order:

- **`drag preview ghost (DOM)`** — ghost count, sibling-ness, last-child DOM order, removal
  on Escape, and the timeline keyboard ghost. Verified to fail pre-fix (`expected +0 to be 1`).
- **`time-grid geometry`** — the `slotMinTime` offset (pre-fix `720px` where `80px` is
  correct) and that every slot's `end > start`.
- **`normalized event/resource model`** — the R2 acceptance test, the bucket row, nested →
  flat visibility, `resourceId` stamping, and an authored `collapsed` group.
- **`resource colour across views`** — resource inheritance, event-colour-wins,
  `defaultEventColor`, and the **dynamically-added-event** path, which is exactly where
  FullCalendar #5743, Bryntum #4005 and DevExpress T864922 each regressed.
- **`permissions`** — 9 cases, including that read-only still allows grid navigation, the
  conditional keymap text, per-edge `resizable`, and granular tables.

`apps/ng-bootstrap-demo-e2e/e2e/scheduler-resize.spec.ts` holds the browser-level checks
from #394 plus the ghost-above-source stacking guard. Its `loadSampleWeek` helper uses
**deterministic readiness** (custom element upgraded + grid rendered, then confirm the seed
click took effect) instead of `waitForLoadState('networkidle')`, which flaked in Firefox
under four parallel workers; the file also carries a 60s timeout for the same reason.

## Landmarks in the code (post-change)

- `views/base-view.ts` — `partGeometry` (the single geometry source; fixes B2),
  `applyEventColors`, `appendResizeHandles` (per-edge and permission-gated),
  `clearContainer` (also strips the per-view class).
- `state/scheduler-state.ts` — `mergeEventSources` / `collectNestedEvents` (the one store),
  `indexByResource`, `indexResourcesById`, `seedCollapsedGroups`. `setState` rebuilds the
  derived indexes only when their source identity changes, so drag frames stay cheap.
- `components/mp-scheduler.ts` — `can()` / `effectivePermissions()` / `syncPermissions()`,
  `allowsCreateAt()`, `parseDayKey()` (the UTC fix), `tryEnterEventMoveMode()`,
  `announceDenied()`.
- `scheduler-core/src/models/permissions.ts` — `resolveCapability` is the ONE resolver used
  by pointer gating, keyboard gating and affordance rendering. Keep it that way; three
  copies of this logic is how the original `editable` flag ended up mouse-only.
- `styles/scheduler.styles.scss` — the `$z-*` ladder is at the top of the file. Add rungs
  there, never a bare number; a bare number is what caused the ghost z-order regression.
- `views/timeline-view.ts` — `UNASSIGNED_ROW_ID`, `createUnassignedRow`, and the `slotWidth`
  getter reading `--scheduler-slot-width`.

## Traps already hit — do not rediscover them

- Putting a populated `DEFAULT_PERMISSIONS` into `DEFAULT_OPTIONS` made every capability
  count as "explicitly specified", silently defeating the alias folding.
  `DEFAULT_OPTIONS.permissions` must stay `{}` and let `resolveCapability` apply
  per-capability defaults.
- A module-level `Set` for "groups already seeded from `collapsed`" leaked across component
  instances. It is now a per-instance field.
- `this.state` inside a view is the plain state object, not the manager, so derived data has
  to live *on* the state — that is why `eventsByResource`, `resourceById` and
  `resolvedPermissions` are state fields.
- `timeline-view.renderEvents` iterates row keys (`string | null`) now, so `resource` is no
  longer in scope; anything needing the row title must carry it alongside the id.
- `splitInParts` deliberately emits no trailing part when a range ends exactly at midnight.
  Do not "fix" that by adding a zero-height ghost.

---

# Outstanding work, spelled out

M1-M7 are delivered. What follows is everything still open, with enough context to execute
without the originating conversation. Decisions are already made in the PRD — these are
implementation notes, not open questions.

## M8 — Timeline creation affordances (PRD D5.1) — the largest remaining piece

Decision recap: a persistent **"Add resource" row pinned at the bottom of the frozen
resource column** (the Jira/spreadsheet idiom), with **nested-group creation behind a
per-group overflow action** rather than two always-visible buttons per row, and events
created only by **dragging a resource row** (already working, M5). All of it **default-off**
via permissions, because no surveyed calendar component ships resource-creation UI.

To build:
1. New request events in `scheduler/src/events/` + `scheduler-core/src/models/events.ts`:
   `resource-create {parentId?, view}`, `group-create {parentId?, view}`,
   `resource-update {resource, changes}`, `resource-delete {resource}`. All `bubbles: true`
   **and `composed: true`** (see M9 — the emitter currently omits `composed`, so events
   cannot escape a nesting shadow root).
2. Gate every affordance on `can('createResource' | 'createGroup' | 'updateResource' |
   'deleteResource')`. **Not rendered** when denied, not rendered-and-disabled — the
   file-manager rule (`mp-file-manager.ts:813-862`). Contextually-unavailable-but-permitted
   uses a native `disabled` button.
3. Accessible names must disambiguate: `"Add resource to {group}"`, never N buttons all
   named "Add". Route through `options.messages` (new keys). Depth goes in the accessible
   **name**, never `aria-level` — that is an axe `aria-allowed-attr` serious violation on
   these roles; `mp-query-group.element.ts:176-187` is the in-repo precedent.
4. Add a `:focus-visible` rule for the new buttons **and** for the existing
   `.expand-toggle`, which has none.
5. Restore focus **by stable key** after an add — the views tear down and rebuild
   imperatively, and there are already four rAF re-focus call sites to copy. Decide where
   focus lands when the pressed button is itself removed by the re-render.
6. In-timeline **resource recolouring** rides here (the rest of R7): a colour control on the
   resource row emitting `resource-update`. The WC must not invent colours — it stays a pure
   function of its inputs, so consumers assign the initial colour (ship a deterministic
   palette helper for them). `resolveEventColor` already consumes `Resource.eventColor ??
   Resource.color`.

Structural note: `mp-scheduler.render()` is a fixed two-slot template (header + content), so
a footer add-bar needs a new node there.

## M9 — Event-surface cleanup

1. **`date-select` is declared, typed, and wired as a live Angular output
   (`scheduler.component.ts` `dateSelect`) that NOTHING ever emits.** Either emit it on
   range-selection commit or delete it plus the wrapper output. A dead output is worse than
   a missing one.
2. **Two duplicated, drifting type surfaces**: `scheduler-core/src/models/events.ts`
   (`SchedulerEventMap`, 9 entries) versus `scheduler/src/events/event-types.ts`
   (`SchedulerCustomEvent`, 8 arms). Collapse to one.
3. **React wrapper types are wrong** (`libs/mintplayer-react-bootstrap/scheduler/src/BsScheduler.tsx`):
   `onSelectionChange` omits `selectedEvent` and `resourceId` and invents a `slots` field;
   `event-delete` declares a required `originalEvent` the emitter never sends.
4. Add `composed: true` in `scheduler-event-emitter.ts` so events escape a nesting shadow
   root (file-manager already does this).
5. Wrappers need the M1-M7 surface reflected: `permissions` and `defaultEventColor` ride
   inside the existing `options` object (no wrapper change strictly needed), but the
   `readonly` **attribute** must not be swallowed by any wrapper host, and Vue's
   `resources?: Resource[]` should become `(Resource | ResourceGroup)[]` (pre-existing type
   gap).

## M10 — Month day popover (PRD D8.1-D8.4)

Decision recap: **month yes, year no.** Configurable strategy, not a hardcoded popover.

1. `options.moreLinkBehavior?: 'popover' | 'day' | fn`, default `'popover'` (FullCalendar's
   default); `'day'` preserves today's exact drill-to-day behaviour.
2. `options.dayClickAction?: 'none' | 'popover'`, default **`'none'`** so the existing
   `date-click` contract is untouched. This is how the user's "click a date to open a popup"
   ask ships without breaking consumers.
3. Keep day-**number** click (drill to day view, `navLinks` idiom) separate from
   day-**cell** click. Conflating them makes empty-cell create impossible.
4. Openers for the popover: the existing `+N more`, and **Space** on the focused month cell
   (currently unbound, so `Enter` keeps meaning "create for this day").
5. Contents: date + count header; the day's full event list as `role="button"` items reusing
   `formatEventAriaLabel`, activation emitting the existing `event-selected`; a primary
   "New event" emitting the existing `event-create`; a secondary "Show day" performing
   today's drill. **No new event types.**
6. Build on `OverlayController` (`libs/mintplayer-web-components/overlay`) with a
   Lit-rendered `role="dialog"` panel, `modal: false`, `initialFocus: 'first'`,
   `dismissStack` for Escape, focus return to the opener by date key.
7. **Four traps, all real:**
   - `scroll` is not a composed event, so the controller's `document` capture listener never
     sees `.scheduler-content` scrolling inside the shadow root — both `'reposition'` and
     `'close'` are silently dead. Register a local listener on `.scheduler-content`.
   - `position: fixed` containing block: document that nothing may add
     `transform`/`filter`/`contain` to `.scheduler-content` or `.scheduler-month-grid`.
   - The anchor is imperative DOM destroyed on every render — hold popover identity by date
     key and resolve the anchor lazily.
   - Escape collides: the host `keydown` (which clears the selection) fires before the
     controller's document listener. Gate `handleKeyDown` on "popover open".
8. Year view instead gets two fixes, no popover: `Enter` on a month card currently emits a
   **month-spanning** `event-create`, which should drill into the month like the header
   button does; and the `.has-events` dot needs a text equivalent.

Non-goals, explicitly: no year popover; no focusable mini-day cells; no group/resource
creation in a date popup (a `ResourceGroup` has no date dimension, so the popup could not
say where in the tree it goes); no inline edit form in the popover (the WC owns no event
data); no modal/focus-trap/`aria-modal`; plain cell click keeps emitting `date-click`.

## Smaller items still open

- `options.requireEventResource` (PRD D4.2) and a dedicated empty state for
  `resources: []`. The bucket row alone already resolves the reported symptom, so these are
  polish.
- Per-resource **icon/glyph** plus a legend, for WCAG 1.4.1 — resource identity must not be
  colour-only. No surveyed component library has this (Outlook "charms" are the only
  precedent anywhere), so it is a cheap differentiator as well as a compliance item.
- `resource.allowOperations` per-item override (the file-manager three-layer pattern).
- Multi-day ghost e2e: assert one ghost box **per expected column** for a 3-day create.
- **First timeline e2e coverage of any kind** — there is currently none, in any framework.
- React/Vue demos must bind `resources` so their timeline is exercised at all; it has been
  permanently blank since it shipped (B7).
- Device re-check of timeline touch scrolling after M3 (`scroll-blocked` and pan-mode now
  target the element that actually scrolls). **Do not raise `touchMoveThreshold`** — see the
  retracted B18 note in the PRD; it is coupled to the browser's touch slop.
- Demo keymap `<details>` blocks in all three apps need the new/changed keys, and the keymap
  prose must be gated the same way the `aria-describedby` text now is (read-only must not
  document blocked gestures).
- `options.dragScroll` remains declared and unread: there is no auto-scroll when a drag
  reaches the viewport edge. Expect this as the next complaint now that scrolling works.
- Month view still has **no pointer create-drag at all** (`analyzeTarget` only recognises
  `.scheduler-time-slot, .scheduler-timeline-slot`). The popover is the cheap substitute;
  marquee-selecting across month cells is a separate, larger feature.
