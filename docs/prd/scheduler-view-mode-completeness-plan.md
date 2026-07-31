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
