# Plan — Scheduler view-mode completeness

PRD: [scheduler-view-mode-completeness.md](./scheduler-view-mode-completeness.md)
Branch: `fix/scheduler-preview-z-order` → PR
[#395](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/395)
Status: **Delivered.** M1–M10 are all in, plus the dead-API deletions and the version
bumps; the full unit sweep is green (1463 tests). What remains open is listed per milestone
below and in "Outstanding work, spelled out" — the browser/device verification items, the
missing e2e coverage, and four deliberate polish items (`requireEventResource`, the empty
state, the per-resource icon for WCAG 1.4.1, `resource.allowOperations`). None of them is a
reported defect. Verification runs in CI on each push rather than as a long local sweep.

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

- [x] "Add resource" / "Add group" bar pinned to the foot of the frozen column, plus
      per-group add buttons named `"Add resource to {group}"` / `"Add subgroup to {group}"`
      via `messages`. **Deviation**: two permission-gated buttons per group rather than an
      overflow menu — see PRD §11.2 for why.
- [x] New request events `resource-create` / `group-create` / `resource-update` /
      `resource-delete`, `bubbles` + **`composed: true`** [D5.2], surfaced in all three
      wrappers.
- [x] Default **off** (`createResource`/`createGroup`/`updateResource`/`deleteResource` all
      default `false`) — a denied capability renders NOTHING, not a disabled control.
- [x] `:focus-visible` for the new buttons **and** the existing `.expand-toggle`, which had
      none. Focus restored by stable key after a rebuild, falling back to the add bar when
      the control's row is gone.
- [x] In-timeline recolouring (the rest of R7): a native `<input type="color">` per row
      emitting `resource-update`, editing whichever of `eventColor`/`color` actually drives
      the rendered events. The WC never invents a colour — the demo ships a deterministic
      palette rotation to show the consumer's half.
- [ ] Resource **rename** in the timeline — deliberately not built; `changes` is typed wide
      enough that adding `title` later is not a breaking change (PRD §11.2).

## M9 — Event-surface cleanup [D5.2, B15]

- [x] `date-select` **deleted**, together with the live-but-dead Angular `dateSelect`
      output [B15]. Nothing emitted it.
- [x] Collapsed the duplicated type surfaces into ONE discriminated union in
      `scheduler-core/models/events.ts`; `EventDetail<T>` and `SchedulerEventMap` are now
      derived from it, so they cannot drift again. `scheduler/events/event-types.ts` is gone.
- [x] React wrapper types now come from `SchedulerEventMap` instead of hand-copied shapes.
- [x] `composed: true` in the emitter, with a regression test that a scheduler nested in
      another shadow root still reaches a `document` listener.
- [x] Vue's `resources` prop widened to `(Resource | ResourceGroup)[]`; `readonly` exposed
      as an element property so React/Vue can bind a boolean.

## M10 — Month day popover [D8.1, §8.3]

- [x] `moreLinkBehavior: 'popover' | 'day' | fn` (default `'popover'`) and
      `dayClickAction: 'none' | 'popover'` (default `'none'`, preserving `date-click`).
- [x] `OverlayController` panel, `role="dialog"`, `modal: false`, `dismissStack` Escape,
      `initialFocus: 'first'`, anchor resolved lazily by date key.
- [x] All four traps handled and documented at the call sites: a local scroll listener on
      `.scheduler-content`; the `position: fixed` containing-block constraint noted in both
      the SCSS and the render comment; anchor by stable key; the host `keydown` yields while
      open so Escape closes instead of clearing the selection.
- [x] Contents: date + count header, full event list reusing `formatEventAriaLabel`
      (activation → existing `event-selected`), "New event" → existing `event-create`,
      "Show day" → the drill. **No new event types.**
- [x] Day **number** click drills into the day view (navLinks idiom), kept separate from the
      cell click; `Space` on a focused month cell opens the popover, `Enter` still creates.
- [x] Year view: no popover; `Enter` on a month now drills into it instead of emitting a
      month-spanning `event-create` (the existing test was rewritten, not deleted).
- [ ] `.has-events` text equivalent in year view — still colour/dot only (WCAG 1.4.1),
      tracked with the per-resource icon item below.

## M12 — Timeline tracks stack, they do not divide the row [R8]

- [x] Constant-height tracks stacked top-to-bottom, with the resource row growing via
      `min-height` (empty rows keep the 40px baseline). Week/day keep dividing — there the
      height IS the duration.
- [x] Geometry through `--scheduler-timeline-event-height` / `--scheduler-timeline-track-gap`
      / `--scheduler-timeline-row-padding`, read by `TimelineView.trackMetrics`.
- [x] `colspan` no longer stretches an event across empty neighbouring tracks.
- [x] Unit test: three overlapping events keep ONE px height, get distinct evenly-spaced
      tops, and grow the row past both the 40px baseline and three bands.

## M13 — a11y defects surfaced by auditing the NEW states [found in M11]

- [x] `clearContainer` strips the per-view ARIA (`role`, `aria-label`, `aria-describedby`,
      `aria-multiselectable`, `aria-rowcount`), not just the per-view classes: `role="grid"`
      leaked onto the scroller across a view switch, making the timeline a grid inside a
      grid (axe `aria-required-children`, critical — reachable only after switching views,
      which is why the load-time gate never saw it).
- [x] Month event chips and the `+N more` link are ≥24px with 24px clear spacing
      (`target-size`, serious, WCAG 2.2 SC 2.5.8); month rows grew 100px → 120px so three
      chips plus the link still fit unclipped.
- [x] The new e2e runs axe over both new states (resource affordances granted, popover open)
      because the shared gate only ever audits the default one.

## M14 — Edge auto-scroll during a drag

- [x] Holding a drag within 40px of a `.scheduler-content` edge scrolls it, both axes, at a
      rate ramping with depth; each frame re-feeds the pointer so the preview tracks the slot
      under the cursor. Stops on pointer-up, at the scroll end, and on disconnect.
- [x] e2e: hold a drag at the bottom edge, assert `scrollTop` advances, then assert it stops
      moving after release. Green on Chromium and Firefox.
- [x] No option for it: the old `dragScroll` flag was deleted as dead in M7, and a knob here
      would only let a consumer switch off reaching their own data.

## M15 — The rest of D4.2: strict mode + empty state

- [x] `options.requireEventResource` (default `false`): warns once per event id and never
      hides the event — a signal for development, not a filter.
- [x] `resources: []` **and** no events now renders a `noResources` message row instead of
      two header rows over a void. With events it still shows the bucket row, which is what
      resolves the original report.
- [x] Three specs: warn-once-and-still-rendered, the empty state, and the bucket row winning
      over the empty state.

## M16 — The timeline drag ghost finds its row [R9]

- [x] Resolve the ghost's row from the NORMALIZED event store, not the dead
      `resource.events` mirror. Nested-authored events resolved fine, which is exactly why
      this hid: the demo seeds events nested, so a casual check passes while every event
      from the `events` input lost its ghost.
- [x] A resource-less event maps to the bucket row rather than bailing out.
- [x] Three unit tests (flat event, bucket event, ghost on the source's track and last in
      DOM order), all verified to FAIL pre-fix.
- [x] Browser guard for both selection states, over a real overlap, using the
      `pointer-events` probe: ghost is topmost against `auto` and against `$z-event-selected`.

## M11 — Batched verification sweep

- [x] `nx build mintplayer-web-components` (which runs `codegen-wc`), the three wrapper
      builds, all three demo builds, and the full vitest suite: **1463 tests green**,
      including 14 new ones for M8/M9/M10.
- [x] `resources` bound in the React and Vue demos, so their timeline is exercised at all
      [B7]; the Angular demo gained permission and popover-behaviour selects plus the four
      resource-tree handlers.
- [x] All three demo pages' keymap docs updated for the popover, the year-view Enter change
      and the resource-column affordances.
- [x] New e2e in `apps/ng-bootstrap-demo-e2e/e2e/scheduler-views.spec.ts` — the FIRST
      browser coverage of the timeline in any framework: multi-day ghost (one box per
      column, plus the spanned-day count so a failure says which half broke), timeline
      two-axis scroll with the column staying pinned, the opt-in resource affordances
      appearing and actually appending a row, and the month popover's
      open -> focus-in -> Escape -> focus-return cycle. 4/4 green on Chromium AND Firefox,
      and the pre-existing scheduler e2e still passes.
- [ ] Still uncovered by e2e: timeline drag-create carrying its `resourceId`, and read-only
      mode end to end (both are covered by the unit suite's DOM assertions).
- [x] Edge auto-scroll during a drag, on both axes (M14).
- [ ] axe sweep beyond CI's `e2e-a11y` step.
- [ ] Device check: touch scrolling in timeline (M3) and week (unchanged) on Android.

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
2a8bad18 docs(scheduler): record the session handover and the outstanding M8-M10 work
762ad93e feat(scheduler)!: timeline resource affordances; one event surface (M8, M9)
4cabefe8 feat(scheduler): month day popover; demos exercise the new surfaces (M10)
```

M8–M10 landed after the compaction. Two latent bugs surfaced while building them and are
fixed in `762ad93e`: `syncPermissions()` never ran on the first connect (it sat inside the
`if (this.inputHandler)` guard), and `TimelineView.update()` never rebuilt on a `resources`
change, so a resource added after first paint was invisible.

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

M1–M10 are delivered; the as-built surface, the deliberate deviations and the two latent
bugs found on the way are recorded in PRD §11. What follows is everything still open, with
enough context to execute without the originating conversation.

## Verification that needs a browser or a device

- **No e2e coverage of the timeline exists in any framework**, and none of the M8–M10
  surfaces has a browser-level test. Worth adding, in this order: one ghost box per column
  for a 3-day create; a timeline drag-create carrying its `resourceId`; two-axis timeline
  scroll with the resource column staying pinned; the month popover's open → Escape →
  focus-return cycle. Reuse `loadSampleWeek` in
  `apps/ng-bootstrap-demo-e2e/e2e/scheduler-resize.spec.ts`, which uses deterministic
  readiness rather than `networkidle` (that flaked in Firefox under four workers).
- **Device re-check of timeline touch scrolling** after M3 — `scroll-blocked` and pan-mode
  now target the element that actually scrolls. **Do not raise `touchMoveThreshold`**; see
  the retracted B18 note in the PRD. It is coupled to the browser's touch slop.
- An axe pass over the new surfaces beyond CI's `e2e-a11y` step: the resource-column
  buttons, the colour input, and the popover dialog.

## Deliberate polish items, none of them a reported defect

- Per-resource **icon/glyph** plus a legend, for WCAG 1.4.1 — resource identity must not be
  colour-only. The same gap covers year view's `.has-events` dot, which still has no text
  equivalent. No surveyed component library ships this (Outlook "charms" are the only
  precedent anywhere), so it is a differentiator as well as a compliance item.
- `resource.allowOperations` per-item override (the file-manager three-layer pattern).
- Resource **rename** in the timeline. `resource-update`'s `changes` is typed
  `Partial<Resource & ResourceGroup>`, so adding `title` later is not a breaking change.
- Month view still has **no pointer create-drag** (`analyzeTarget` only recognises
  `.scheduler-time-slot, .scheduler-timeline-slot`). The day popover is the cheap
  substitute; marquee-selecting across month cells is a separate, larger feature.
