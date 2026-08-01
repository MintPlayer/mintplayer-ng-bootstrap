# Plan — Scheduler view-mode completeness

PRD: [scheduler-view-mode-completeness.md](./scheduler-view-mode-completeness.md)
Branch (phase 1): `fix/scheduler-preview-z-order` → PR
[#395](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/395), **merged to
`master` 2026-07-31** (on top of #394, the resize-glyphs PR). The final unit sweep on the
branch was 1593 tests green, plus the 10-test `scheduler-views` e2e on Chromium+Firefox.
Status: **Phase 1 merged (#395); phase 2 (M18–M26, R11–R20 — PRD §12) DELIVERED** on
`feat/scheduler-phase2` → PR
[#396](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/396). M18–M26 landed one
commit per milestone with a single batched sweep at the end (**1506 unit / 41 e2e**), and
were then followed by SIX review-driven fixes, each swept again: the two-state colour
checkbox (D12.8f), `<mp-checkbox>`, the in-shadow form styling and `<mp-select>` (D12.9),
`<mp-datetime-picker>` plus the Escape arbitration (D12.9b), B30, and B31/B32.

Latest local sweep (2026-08-01): **1512/1512 unit tests**, all four lib builds + all three
demo builds, and **45 passed / 1 pre-existing skip** across `scheduler-views` +
`scheduler-resize` e2e on Chromium AND Firefox. The final commit's e2e was deliberately
left to CI. Versions bumped for the breaking changes: web-components **2.6.0**,
ng-bootstrap **22.10.0**, react-bootstrap **19.12.0**, vue-bootstrap **3.13.0**
(`^2.0.0` peer ranges still hold).

**Testing lesson from B31, worth carrying into any WC with a form:** specs that assign
`input.value` or call `.click()` programmatically are DOM-poking, not user simulation —
they fire no `input` and no `mousedown`, and both omissions hid a defect that made the
feature unusable. Dispatch real events; click real buttons with a real mouse.
Still open from phase 1: the device verification items and deliberate polish items under
"Outstanding work, spelled out" — none a reported defect. **Open on top of phase 2**, all analysed and
decided but NOT started: **M27** (R21, range validity in the editor), **M28** (collapse the
resize capabilities — breaking, and the structural fix for B35), **M29** (one message, one
channel — B33/B34), and **M30** (datetime-picker bounds reaching the time list), which is
explicitly a SEPARATE PR because it changes shared components every picker consumer uses.

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
      anchor resolved lazily by date key. (`initialFocus` is a function — first
      `.popover-event`, else first `.popover-action` — not the `'first'` the plan
      originally said; `'first'` would land on the close button.)
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

## M17 — Month columns line up with their headers [R10]

- [x] The month grid takes the same per-column minimum as the day-name strip
      (`minmax(var(--scheduler-column-min-width), 1fr)` + `min-width: fit-content`), so the two
      sizing systems can no longer disagree and the view scrolls horizontally when narrow.
- [x] e2e at 1400 / 900 / 600px: equal column widths, equal offsets, overflow only when
      narrow. Chromium and Firefox.
- [x] Header-travels-while-scrolled verified interactively (sticky pins vertically only).

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

# Phase 2 — post-merge review (PRD §12). Delivered 2026-08-01.

Three things were found and fixed ALONGSIDE the planned work, worth knowing when reading
the diffs:

- **The Lit template never re-rendered on state changes**, so an open popover/editor froze
  at open time — a consumer deleting a popover row saw the list not shrink. The M22 spec
  caught it; `onStateChange` now requests an update while either surface is open.
- **The demo's `onEventDelete` swept only the flat array**, silently ignoring deletes of
  nested-authored sample events (the popover-delete e2e caught it) — same disease as B27,
  now fixed alongside it.
- e2e coordinate reads must **wait out Bootstrap's global smooth scrolling**
  (`scrollSchedulerIntoView` helper) or a drag lands rows away from its aim; and row titles
  must be read from `.resource-title`, not the rowheader cell, which also contains action
  glyphs under resource-admin.

Deviations: none of substance. M20's bucket row is keyboard-reachable only while it is
RENDERED (it holds events) — the pointer has the same constraint, there is no row to drop
onto. M24's F2 disambiguates by focus kind: event focused → the event editor, timeline
cell focused → rename that row.

Ordering: M19 before M20 (the tri-state `resourceId` decision shapes the keyboard fixes);
M18 and M22 are independent (M22 touches the same file as M18 — do M18 first to avoid
churn); M21 is small and can ride either; M23 (the event editor) before M22's spec pass
would let the delete specs cover both surfaces in one sitting, but is not a hard
dependency; M24 is independent; M25 (demos) after everything it demonstrates; M26 is the
single batched sweep at the end, per the standing rule.

## M18 — Month/year date surface [R12, D12.2, B23]

- [x] Year: mini-day click opens the **day-scoped** panel anchored on its month card —
      `popoverAnchorCell()` becomes view-aware (`#scheduler-cell-m-…` in month,
      `#scheduler-cell-y-YYYY-MM` in year). This *completes* the B23 leak instead of
      sealing it; the unpositioned-panel and dead-focus-return failure modes both go away
      because the card is a real focusable anchor.
- [x] Year: **Space** on a focused month card opens the **month-scoped** panel (events
      grouped by day, "New event" for the focused/first day, "Show month" drill). Enter
      keeps drilling. Announce the keymap change.
- [x] `dayClickAction` default flips `'none'` → `'popover'` [D12.2c] — breaking behaviour
      change, document it; `date-click` still emits first. Update the demo selects'
      defaults and the §11.1 as-built table.
- [x] "New event" gains an optional resource `<select>` when resources exist, riding
      `event-create.resourceId` [D12.2d]. No group creation — §8.4 non-goal 2 stands.
- [x] Year `.has-events` text equivalent: the month card's accessible name carries its
      event count [D12.2e]. Closes the WCAG 1.4.1 item open since M10.
- [x] New/changed `messages` keys for the month-scoped panel labels and the resource
      picker; keymap docs in all three demo pages.
- [x] Specs: view-aware anchoring (both views), Space-on-card, the completed click path
      under both `dayClickAction` values, focus return to the card, resource picker
      payload. Rewrite the "year view: no popover" spec rather than deleting it.

## M19 — Cross-resource pointer move [R13, D12.3]

- [x] `TimeSlot.resourceId` / `PreviewEvent.resourceId` → `string | null | undefined`
      tri-state [D12.3a]; bucket-row slots get a distinguishable marker;
      `getSlotFromElement` maps it to `null` (bucket) vs `undefined` (no axis).
      **Grep `resourceId ??` across the scheduler libs** — every one is suspect once
      `null` is meaningful.
- [x] `calculateMovePreview` carries the target row [D12.3b], with a comment marking the
      deliberate asymmetry against `calculateCreatePreview`'s row-pinning.
- [x] `handleDragComplete` `case 'move'`: apply `preview.resourceId` (mapping `null` →
      `resourceId: undefined` on the emitted event). Resize cases untouched.
- [x] Feedback [D12.3c]: `updateGreyedSlots` scoped to the target row; `.drop-target`
      highlight on the target row (new SCSS rule → **run codegen-wc**); verify the M16
      ghost relocates (its `rowKey` chain already starts at `previewEvent.resourceId`).
- [x] **B29 — dangling `resourceId` resolves to the bucket row** [D12.7]: an event whose
      `resourceId` matches no known resource renders in `(No resource)` instead of
      vanishing from the timeline; dev-warn once per event id (reuse the
      `requireEventResource` warn-once machinery). Spec: delete a resource from the
      `resources` input → its events appear in the bucket, week view unchanged.
- [x] Specs in `drag-state-machine.spec.ts` (pure, no DOM — where the coverage belongs):
      cross-row move carries the target; `null` target survives; resize never rewrites the
      row; a week-view slot (`undefined`) leaves the original resource intact.

## M20 — Keyboard + bucket parity [B25, B26, B28]

- [x] Rewrite `adjacentResource` to walk the same row list the view renders — visible leaf
      resources plus the bucket when present — returning a value that can distinguish "the
      bucket row" from "no move" [B25]. Fixes plain cell navigation too, not just
      move-mode.
- [x] `commitEventMoveMode` / `applyKeyboardMovePreview`: write `resourceId` explicitly
      instead of by truthiness, so a move **to** the bucket commits and previews [B26].
- [x] Timeline-specific `moveModeEntered` message (Up/Down = resource, Left/Right = time)
      [B28]; demo keymap bullets updated.
- [x] Specs: `nudgeKeyboardMoveResource` (currently untested at all), Down past the last
      resource lands in the bucket, commit emits with `resourceId` absent for a bucket
      drop, Escape restores the original row.

## M21 — Per-gesture pointer permission gate [B24]

- [x] Gate at pointer-down by target type: `'event'` → `can('moveEvent', ev)`,
      `'resize-handle'` → the matching edge capability, `'slot'` →
      `createEvent || selectRange`. Replaces the OR-of-four `isEditable` as the only
      pointer gate; keeps `resolveCapability` as the ONE resolver (see Landmarks).
- [x] Spec: `permissions: { moveEvent: false, createEvent: true }` refuses a pointer
      move-drag (the case that passes today) but still allows drag-create.

## M22 — Pointer delete affordance [R14, D12.4]

- [x] Day popover: a real delete `<button>` per event row, **sibling** of the event button
      (event boxes are `role="button"` in all four views — anything focusable inside one
      is a nested interactive). Named `"Delete {event}"` via a new `messages` key, rendered
      only when `can('deleteEvent', event)`, emits the existing `event-delete`, ≥24px
      target. Focus moves to the next row's button after the emit — never to `<body>`.
- [x] ~~An aria-hidden × on the selected event~~ — **dropped** [D12.4b revised]: the
      in-grid pointer delete is the event editor's delete button (M23), a real focusable
      control in a dialog instead of a pointer-only target.
- [x] Document that confirmation/undo is the consumer's job in the `event-delete` listener
      — the WC owns no data and no "are you sure" dialog.
- [x] Specs: button absent under `deleteEvent: false`; popover row delete emits and moves
      focus; axe over the popover with delete buttons present (nested-interactive +
      target-size).

## M23 — Built-in event editor [R20, D12.8]

Post-review additions, all on this branch: the colour field became two-state behind an
`<mp-checkbox>` (D12.8f), the start/end fields became `<mp-datetime-picker>`s once the
Escape arbitration was designed (D12.9b), and **B30** — moving the start refused to
commit instead of moving the event (D12.10).


- [x] `OverlayController` popover anchored to the event element by stable event id — same
      mechanics, traps and `$z-day-popover` rung as the day popover (lazy anchor,
      `role="dialog"`, non-modal, host-level Escape gate, focus back to the event box on
      close, local scroll listener).
- [x] Fields: title, start/end (`datetime-local`), optional colour input. Buttons: Save →
      existing `event-update` (with `oldEvent`), Delete → existing `event-delete` (the
      revised D12.4b home), Cancel. WC-side validation only `end > start` + non-empty
      title; everything richer belongs to the consumer's listener.
- [x] Openers: double-click / double-tap on the event; `contextmenu` (`preventDefault()`
      on event boxes only); F2 on the selected event. Enter stays move-mode. Keymap text
      gains the editor line, permission-gated (§6.4 rules).
- [x] Gating [D12.8c]: new `SchedulerPermissions.editEvent` (default `true`) for
      title/colour; start/end respect `moveEvent`/`resizeEventStart`/`resizeEventEnd`;
      delete button under `deleteEvent`; `readonly` and per-event `editable: false` kill
      it wholesale; the editor doesn't open when nothing is permitted.
- [x] `options.eventEditor?: boolean` default **`true`** [D12.8d], plus a first-class
      input on all three wrappers (Angular `[eventEditor]`, React `eventEditor`, Vue
      `:event-editor`).
- [x] New `messages` keys (field labels, Save/Cancel/Delete, dialog label); new SCSS →
      **run codegen-wc**.
- [x] **B31/D12.11**: the editor holds a working DRAFT (`editorDraft`) that is the single
      authority for both the render and the commit — a re-render can no longer reset a
      control, and Save never reads the DOM. Found in a browser: a mousedown on Save
      provokes a re-render that reset the pickers BETWEEN mousedown and click, and Save
      committed the stale values. Every existing spec missed it by clicking Save
      programmatically (no mousedown) and by assigning `input.value` (no `input` event);
      the specs now simulate real input.
- [x] **B32**: `updateEvent` re-points `state.selectedEvent` when ids match — the selection
      holds an object, so it kept a pre-edit copy and F2 reopened the editor on stale
      values. (`removeEvent` has the same gap; flagged in PRD §12.9b, deliberately not
      changed here.)
- [x] **B30/D12.10**: changing the START shifts the END by the same delta, live, so the
      editor moves an event the way every other path does (pointer move-drag and keyboard
      move-mode both preserve duration). Changing the end alone is still a resize, and an
      end explicitly before the start is still refused. Reproduced in a browser first —
      the picker was innocent, the `end <= start` guard was firing on the one gesture that
      should never have reached it.
- [x] Specs: open via all three openers; Save emits `event-update` with the edited
      fields; Delete emits and closes with focus handled (the event box is gone —
      restore by grid cell key); `eventEditor: false` restores the old double-click
      behaviour; field-level gating per capability; axe over the open editor.

## M24 — Resource column UX: resize, tooltips, rename [R15–R17, D12.5]

- [x] Column resize separator: `role="separator"`, focusable, vertical orientation,
      `aria-valuenow` percent, arrow-key steps (WAI-ARIA window-splitter, same pattern as
      the repo's splitter); pointer drag writes `--scheduler-resource-column-width` on the
      host; the AG-Grid `min(…, 100% - 50px)` guard keeps binding both channels. Lives
      outside the `role="grid"` (add-bar reasoning, §11.2). Retires D12.1c's
      capability-gated width tweak.
- [x] `title` attribute on every resource/group title span, unconditionally [D12.5b].
- [x] Rename [D12.5c], file-manager idiom: double-click the title (double-tap touch) or F2
      on the focused rowheader cell → inline `<input class="rename-input">`; Enter
      commits → `resource-update` `changes: { title }`; Escape cancels; blur commits;
      live-announced. Gated on `can('updateResource')` — denied means the triggers do
      nothing. Focus returns to the rowheader cell by stable key after the rebuild.
- [x] New `messages` keys + keymap docs; new SCSS → **run codegen-wc**.
- [x] Specs: separator keyboard resize clamps at both bounds; rename commit/cancel/blur;
      rename refused under `updateResource: false`; tooltip attribute present; F2
      disambiguation — event selected → editor (M23), rowheader focused → rename.

## M25 — Demos as the reference consumer

- [x] Demo `applyEventUpdate` re-parents on a cross-row move instead of rewriting in place
      [B27] — the demo is the reference consumer, it must model the honest mutation.
- [x] Demos start in `'resource-admin'` permission mode [D12.1b] so R11's surface is
      discoverable.
- [x] Colour data fixed in all three demos [D12.6]: sample resources get palette colours,
      sample events drop explicit colours (keep one or two to demonstrate the
      `event.color` override), `onEventCreate` stops stamping `'#3788d8'`. The WC is
      untouched.
- [x] `onResourceDelete` strips `resourceId` from events under the deleted subtree
      [D12.7] — the recommended consumer behaviour, documented as such.
- [x] The demo's own editor card is retired for the built-in one [D12.8e]; one toggle
      demonstrates `eventEditor: false` + a consumer-owned editor as the escape hatch.

## M26 — e2e + the one batched sweep

- [x] e2e (`scheduler-views.spec.ts`): drag row A → row B asserting the emitted
      `resourceId` and the re-parent; ghost sits in the target row mid-drag and only that
      row greys; drag into and out of the bucket row; a cross-row drag reaching an
      off-screen row via edge auto-scroll; year panel open → Escape → focus on the card;
      popover row delete click → event gone from the demo's data; event editor open →
      edit title → Save → chip text updates; column resize by drag persists across a view
      switch.
- [x] **One batched suite sweep at the end** (build + unit + e2e), then push once.
- [x] Device check rides along: vertical cross-row touch drag (600ms hold path — no
      `touch-action` on `.scheduler-timeline-event`) and the editor's double-tap opener,
      same Android pass as the open M3 item.


## M27 — Range validity in the editor [R21, D12.12]. DONE. (PRD §12.12)

Investigation in PRD §12.12. The request half-dissolved on contact: **the start direction
is already impossible**, because D12.10's duration-preserving shift makes validity an
invariant of any start change. What remains is the end field, one commit-time hole that no
picker bound can reach, and a set of adjacent defects.

Ordering: the two D12.12 items are independent and small; B33/B34 are worth doing in the
same pass since they touch the same six lines; B35/B36 are separate decisions.

**D12.12 — the fix proper**
- [x] `min = draft.start` on the END picker only. Date-granular, already plumbed, already
      APG-correct — it stops "an earlier day" without touching a shared component. Do NOT
      also bound the start picker: F1 proves it cannot invert. The START picker's *absence*
      of a `max` is now commented in place, so it does not read as an oversight.
- [x] Clamp in `onEditorEndChange`: `end = max(picked, draft.start + minutesPerSlot())`,
      announced via the live announcer. Handles the same-day case, backstops the picker's
      Today/Now escape hatches, and makes the Save-time guard unreachable from the pickers.
      New message key `editorEndClamped` (`'End adjusted to {end}, the earliest allowed.'`).
- [x] Keep the Save-time `end <= start` guard as the backstop for what the pickers cannot
      reach.
- [x] Specs: same-day earlier time clamps and announces; a later day is untouched and
      announces nothing; the end picker's `min` tracks the start as it moves; the start
      picker has no `max`.

**As-built note the specs had to absorb.** Two existing specs asserted that an inverted
range is *refused*; with the clamp, that path can no longer produce one, so both were
rewritten. The backstop's own spec now drives `editorDraft.end` directly — consumer data is
the only remaining way to reach it, and a degenerate event **cannot be constructed through
the UI at all**: `partGeometry` returns `null` for `end <= start`, so such an event never
renders and the editor can never be opened on it. That is a sharper statement of B36 than
the analysis had — the "cannot even be renamed" case needs the event to become degenerate
*while* the editor is open, or to arrive that way from a consumer's own update.

**Defects found on the way — worth fixing regardless**
- [ ] **B33**: the validation message double-announces (a `role="alert"` node AND the
      polite LiveAnnouncer receive the same string in one update). Keep the announcer; drop
      the alert role, or vice versa — but only one. Affects the range and title paths.
- [ ] **B34**: the message is orphaned (no `id`, no `aria-invalid` /
      `aria-errormessage` / `aria-describedby` on either picker, rendered after the colour
      field rather than beside Start/End) and a failed Save leaves focus on the Save
      button. `a11y/src/error-text.ts` `errorFeedback()` exists for this and is used by
      five WCs; `mp-datetime-picker` supports no error text at all, so this needs a small
      addition there.
- [ ] **B35**: asymmetric permissions can invert the COMMIT — `resizeEventStart` without
      `resizeEventEnd` applies `updated.start` while `updated.end` keeps the original.
      Decide: refuse to shift a draft edge that cannot be committed, or clamp
      `updated.start` against `original.end` at save. Also stop rendering movement in a
      disabled field.
- [ ] **B36**: the range guard runs unconditionally, so a degenerate stored event cannot
      even be RENAMED. Scope the check to edges the user can actually edit.
- [ ] The editor enforces no minimum duration at all — it will commit a 1-minute event on
      a 30-minute grid, which neither drag nor keyboard resize can produce. The clamp above
      fixes this for the end field; decide whether it should also hold at Save.

**Shared-component work — NOT scheduler scope, needs its own decision**

Each of these affects every consumer of the picker, so none belongs in this PR:
- [ ] `mp-datetime-picker` never forwards `min`/`max` to `mp-time-list` (its siblings
      `mp-datepicker` and `mp-timepicker` both do). Fixing it properly needs a
      **date-aware** bound semantic — `mp-time-list` compares time-of-day only and would
      otherwise grey out the same clock range on every day.
- [ ] The Today and Now footer buttons bypass min/max entirely.
- [ ] Nothing clamps: an out-of-range value set programmatically renders as a
      selected-but-disabled cell.
- [ ] `mp-calendar` and `mp-time-list` disagree on disabled semantics — `aria-disabled`
      and focusable (APG-correct) versus native `disabled` and skipped. One popover, two
      behaviours.
- [ ] `mp-time-list`'s PageUp/PageDown is a dead key at a bound: it `preventDefault()`s,
      then `moveTo` bails on the disabled target. Latent today, live the moment bounds are
      passed.
- [ ] React and Vue `BsDatetimePicker` expose no `min`/`max` at all, where Angular's does.


## M28 — Collapse the resize capabilities [D12.13, B35]. DONE. BREAKING.

PRD §12.12/D12.13. The per-edge split came from a misreading of FullCalendar and is what
made B35 constructible; deleting the axis beats guarding it.

- [x] `SchedulerPermissions`: `resizeEventStart` + `resizeEventEnd` → one `resizeEvent`
      (default `true`). `DEFAULT_PERMISSIONS` and the resolver switch updated.
- [x] Split the resolver: `resolveCapability('resizeEvent', …)` answers "resizable at
      all" (either edge); the new **`resolveResizeEdge('start' | 'end', …)`** serves the
      three direct-manipulation sites (`base-view.appendResizeHandles`, `allowsGesture`,
      `resizeKeyboardMoveEdge`), reached from the component through a matching private
      `canResizeEdge()`. Per-edge control now lives ONLY on `SchedulerEvent.resizable`'s
      `{ start, end }` form.
- [x] **The collapse alone is not the fix.** One private `editorTimeFields(event)` now
      answers every editor question at once — `canStart`, `canEnd`, `canTime`,
      `startIsMove` — and carries D12.13's matrix as its docblock. `saveEventEditor` has a
      SINGLE `if (…canTime)` writing both edges together, so the range commits whole or
      not at all rather than relying on two expressions staying textually equal.
- [x] Start-change semantic follows the permission granted: a move where `moveEvent` is
      allowed, otherwise a start-resize clamped to `end − minutesPerSlot()` and announced
      through a new `editorStartClamped` message — the mirror of D12.12's end clamp. The
      start picker also gains `max = draft.end` in that mode only (there is nothing to
      bound while it is a move).
- [x] The editor folds the per-item object form as BOTH edges, so
      `resizable: { start: false, end: true }` locks its time fields while the end handle
      keeps working.
- [x] Specs: "each resize edge is gated by ITS capability" now drives edges from
      `event.resizable`; a new one proves `resizeEvent: false` denies both edges without
      leaking into moving; and a four-test describe covers one row of the matrix each.
- [x] Version bumps: WC **2.7.0**, ng **22.11.0**, react **19.13.0**, vue **3.14.0**. The
      wrappers' `^2.0.0` peer range on the WC needed no change.
- Wrappers and demos needed NO code change, as predicted — they pass `options` through
  opaquely and set only resource capabilities.

**Migration for consumers:** replace `resizeEventStart` / `resizeEventEnd` in a
`permissions` object with the single `resizeEvent`. A consumer that genuinely wants one
edge locked moves that to the data, as `event.resizable: { start: false, end: true }` —
which now actually works on the handles, the pointer gesture and the keyboard, where
before only the boolean `=== false` branch was ever checked.

## M29 — One message, one channel [D12.14, B33, B34]. DONE.

PRD §12.12/D12.14. Ship B33 and B34 together: once the announcer is gone, focus movement
is the only thing that speaks the error.

- [x] **B33**: deleted `liveAnnouncer.announce(...)` on both editor failure paths and
      dropped the `role="alert"` node entirely. The announcer stays on the SUCCESS path.
- [x] **B34, title**: scheduler-local — `aria-invalid` + `is-invalid` on the title input
      plus an `errorFeedback()` node beside it, inside its own `<label>`.
- [x] **B34, range**: `invalid` + `errorText` (`error-text`) added to
      `mp-datetime-picker`, rendered through the shared `errorFeedback()` onto its display
      input, with `invalidFeedbackStyles` and an in-shadow `.is-invalid` border rule —
      Bootstrap's `forms/form-validation` does not cross the boundary, and the whole
      input-group is hand-drawn there anyway. Marks END only.
- [x] `editorError` is now `{ field: 'title' | 'end'; message: string } | null`, with a
      per-instance IDREF for the title message.
- [x] Focus moves to the offending control on a refused Save, via a new private
      `refuseSave(field, message)` that owns both halves — the state and the focus move —
      so a future failure path cannot add one without the other. It awaits the picker's
      OWN `updateComplete` as well as the scheduler's: `error-text` lands one microtask
      later, and focusing first would announce the control's name without the reason.
      `focus()` on `mp-datetime-picker` delegates to its display input (an override, NOT
      `delegatesFocus: true`, which would change click-focus for every consumer).
- [x] Validate-on-Save + clear-on-change kept; the clear is now per-field, so touching the
      end no longer makes a still-empty title look valid.
- [x] Replaced the `.editor-error` SCSS rule with an `.invalid-feedback` spacing rule;
      rewrote the spec that asserted on it.
- [x] "One message, one channel" added to CLAUDE.md's a11y list.

**Wrapper surface.** Angular needed explicit `invalid` / `errorText` inputs (it forwards
property-by-property through an `effect`). **React and Vue needed nothing** — `@lit/react`
routes any prop matching a prototype accessor as a property, and Vue's `v-bind="$attrs"`
reaches both, since each has an attribute. This is the D12.15 correction holding in
practice.

New specs: three on the picker (describes its input while invalid; renders nothing while
valid, because `aria-errormessage` is defined only on an `aria-invalid` control; `focus()`
lands on the display input) and four on the scheduler (title marked + focused; the live
region does NOT repeat the message; per-field clearing; a refused range focuses into the
END picker's display input rather than leaving focus on Save).

## M30 — Datetime-picker bounds reach the time list. SEPARATE PR — do NOT do it here.

PRD §12.12/D12.15. Four of the six shared-picker gaps are one change: the API, its two
consumers, the escape hatch it closes and the keyboard defect it would otherwise create.
Kept out of this PR because the scheduler passes no bounds, so it gains nothing here, and
each item has its own blast radius across every picker consumer.

- [ ] **#2 API first**: `mp-time-list` bounds become `minMinutes`/`maxMinutes:
      number | null` (time-of-day, explicit). `mp-datetime-picker` derives them per render
      for the day it is editing. The ONLY option that cannot break `mp-timepicker`, whose
      consumers legitimately pass `new Date(2020,0,1,18,0)` meaning "18:00" — teaching the
      list about dates would silently disable its entire list. The `number` type makes the
      confusion structurally impossible.
- [ ] **#1**: forward the derived bounds. A NAIVE forward visibly breaks the shipped ng
      demo (`boundsMax = new Date(2026,11,31)` is midnight → every slot but 00:00 disabled
      all year) and no spec or e2e would catch it — add one that would.
- [ ] **#5, mandatory with #1**: `mp-time-list` moves from native `disabled` to
      `aria-disabled` + roving (matching `mp-calendar` and the APG). Three coordinated
      edits, because `RovingFocus` skips both by default. Without it, bounds turn
      PageUp/PageDown into a swallowed keypress.
- [ ] **#3**: `Today` / `Now` must respect bounds — disable the buttons rather than
      silently no-op.
- [ ] Fix the demo's `boundsMax` to `new Date(2026, 11, 31, 23, 59)` if it means "all of
      2026".
- [ ] **#4 — LEAVE, deliberately.** A cell that is both `aria-selected` and
      `aria-disabled` is legal ARIA and the honest answer; clamping would fight Angular's
      CVA and Vue's `v-model`. Its one real half (the time list losing its tab stop on a
      disabled selection) is fixed by #5.
- [ ] **#6 — text only, already done in this PR.** The React claim was FALSE (`@lit/react`
      routes those props automatically); Vue's kebab-case gap is a repo-wide wrapper idiom
      question. Remaining code items: a bounds demo section for the React and Vue pages.

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
- ~~**Year-view popover**~~ — **superseded by M18** (new evidence: the premise was wrong —
  anchoring on the month card needs no focusable mini-day cells; PRD §12.2). What stays
  rejected is the *mini-day-granular focus* version, in both forms: roving tabindex (~500
  cells) AND `aria-activedescendant` (needs real roles on the mini-days → grid inside a
  `gridcell`, the §11.4 `aria-required-children` critical) [D12.2b].
- **Group creation from a month/year popup** — category error: `ResourceGroup` has no date
  dimension and those views don't render resources, so the popup can't say where in the tree
  it goes. **Re-confirmed in phase 2** (both views contain zero `Resource`/`ResourceGroup`
  references); the panel's optional resource picker [D12.2d] is the honest substitute.
- **Row-from-arithmetic in cross-row drags** (`y / rowHeight`) — rows have unequal heights
  since M12's track stacking; the row comes from hit-testing only [D12.3d]. Likewise
  **`setPointerCapture` for the move drag** — it would retarget events to the dragged
  element and break `elementsFromPoint` row resolution.
- **Split scroll panes for the timeline** — the industry norm, but week view already proves
  single-scroller + sticky works in this shadow root; revisit only if virtualization lands.
- **Raising `touchMoveThreshold`** — coupled to the browser's touch slop; see the retracted
  B18 note.

---

# Session handover — read this first if you are resuming

Everything needed to continue without the originating conversation, which was compacted.

## Where things stand — PHASE 2 (read this before the phase-1 notes below)

Branch `feat/scheduler-phase2` → PR
[#396](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/396), base `master`.
**CI green** on the last code commit (`22ec323a`, the B31/B32 draft refactor); the commits
after it are docs only.

Delivered: M18–M26 (the milestone sweep), then six review-driven fixes — D12.8f (two-state
colour), `<mp-checkbox>`, in-shadow form styling + `<mp-select>` (D12.9),
`<mp-datetime-picker>` + the Escape arbitration (D12.9b), B30, and B31/B32.

**Decided but NOT started**, in priority order: **M27** (R21 end-clamp, small), **M29**
(one message one channel — B33/B34, small but needs `error-text` on the shared picker),
**M28** (collapse the resize capabilities — BREAKING, another version bump), and **M30**
(picker bounds — explicitly a SEPARATE PR).

Versions already bumped on this branch: WC 2.6.0, ng 22.10.0, react 19.12.0, vue 3.13.0.
M28 would need another.

## Reproducing a reported bug in a browser — the technique that found B31

The user reported "the event doesn't move" twice. The first report was B30 (a real but
different bug); after fixing it the report repeated, and scripted tests kept passing. What
found the real defect was tracing ONE value across the gesture's phases:

```js
el.shadowRoot.addEventListener('mousedown', () => log(picker.value), true);
el.shadowRoot.addEventListener('click',     () => log(picker.value), true);
```

which produced `PRE-SAVE Jul 30 → MOUSEDOWN Jul 30 → CLICK Jul 28` — the value being reset
*between* the two phases. Lessons, both general:

- **A programmatic `.click()` fires no `mousedown`**, so it never triggers the re-render
  that a real press does. Any test that clicks that way is testing a different code path
  from the user's.
- **Assigning `input.value` fires no `input` event.** With a component that holds a draft,
  that means the model never sees the edit.
- When a user insists something is broken after you have "verified" it, **replay their
  exact gesture with real events** before doubting them. Both times, they were right.

## e2e authoring gotchas (all cost real time this session)

- **Bootstrap sets a global `scroll-behavior: smooth`**, so any rect read straight after a
  programmatic scroll is stale and a drag lands rows away from its aim. Use
  `scrollSchedulerIntoView(page)` (waits for `scrollY` to settle) and pass
  `behavior: 'instant'` to in-shadow `scrollIntoView` calls.
- **Read row titles from `.resource-title`**, never the rowheader cell's `textContent` —
  under `resource-admin` the cell also contains the action-button glyphs, so Bob reads
  `"Bob×"`.
- **Click Save with a real mouse** (`page.mouse.click` at its rect), not
  `evaluate(el => el.click())` — see above.
- **Playwright's CSS selectors pierce open shadow roots**, so
  `page.locator('mp-datetime-picker.editor-start-input button.date')` reaches two shadow
  roots deep with no special syntax.
- **The time list is 96 rows and overflows the viewport**: clicking a naive rect lands
  outside the editor and correctly dismisses it. `scrollIntoView` the option first.
- One Firefox test needs `test.slow()` — its closing axe scan alone takes ~45 s, which
  overruns the 60 s budget under four shared workers.
- The multi-day-ghost test (phase 1) is **timing-sensitive under parallel workers**; it has
  failed once and passed alone and on a full re-run. Not a regression — check before
  chasing it.

## Demo behaviours that exist for a reason (do not "simplify" them away)

- `applyEventUpdate` **re-parents**: a nested event whose `resourceId` changed moves to the
  flat store. Without it a cross-row move leaves the event in resource A's array claiming
  to be B's (B27).
- `onEventDelete` sweeps **both** stores. Sample events are authored nested, so a flat-only
  filter silently ignores deleting one.
- `onResourceDelete` strips `resourceId` from the deleted subtree's events (D12.7).
- Sample **resources carry the palette colours; most sample events carry none**, so
  resource colour is actually exercised (D12.6). Two events keep an explicit colour on
  purpose, to demonstrate that `event.color` outranks the resource.
- The demo starts in `resource-admin` permission mode so the resource affordances are
  visible on first visit (D12.1b) — an e2e drops it back to `default` to prove
  "off means absent".

## Where things stand — PHASE 1 (HISTORICAL; superseded by the phase-2 section above)

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
