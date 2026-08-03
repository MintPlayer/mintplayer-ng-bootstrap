# PRD — Scheduler: compact timeline column, sticky day labels, real localization, a11y re-audit

Status: **Implemented** on `feat/scheduler-compact-timeline-i18n` (2026-08-02), branched
from `master` at `a66f4439` (PR
[#396](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/396), phase 2).
Twenty-four commits; **1610 web-components + 533 ng-bootstrap tests**, plus **23 scheduler
e2e and 34 axe under `en-US`** and **22 firefox scheduler e2e** green locally; all library
builds and the Angular demo build clean, both real tsconfigs clean.
See §15 for what shipped and what is deliberately left; §16–§20 cover the five defects found
by review after the first sweep.

Versions bumped only where source changed: web-components **2.7.0 → 2.8.0** and ng-bootstrap
**22.11.0 → 22.12.0**. React (19.13.0) and Vue (3.14.0) are **deliberately unchanged** — zero
source changes, and their `@mintplayer/web-components: ^2.0.0` peer range already admits
2.8.0, so a bump would publish byte-identical artifacts. (#396 bumped them because they *did*
change there.)
Plan: [scheduler-compact-timeline-localization-plan.md](./scheduler-compact-timeline-localization-plan.md)
Predecessors — this PRD **re-opens a decision deliberately deferred by** the last two:
[scheduler-view-mode-completeness.md](./scheduler-view-mode-completeness.md) (#395/#396),
[scheduler-resize-glyphs.md](./scheduler-resize-glyphs.md) (#394),
[screen-reader-accessibility.md](./screen-reader-accessibility.md) (#393).

## 1. Goal

Make the scheduler usable on a phone in portrait, correct in a language other than English,
and genuinely operable by a blind user.

Three of the four asks are one defect seen from different angles: **the timeline spends its
horizontal budget on chrome instead of content.** The pinned resource column gives ~50px to
the resource title and ~102px to four icon buttons (§3.1); the day-header label is centred
in a box 2400px wide, so it is legible only when the middle of the day happens to be on
screen (§3.3). The fourth ask — localization — is one hardcoded default that has been
quietly forcing `en-US` on every consumer since the component was written (§3.4).

The a11y re-audit (§8) was asked for separately and turned out to be the most valuable
strand: it found **three blockers**, none of which this feature would otherwise touch.

## 2. Reported issues (from the user)

| # | Report | Analysis |
|---|---|---|
| R1 | On a phone in portrait, the timeline's sticky left column takes too large a portion of the screen | **confirmed and quantified** — the title gets ~50px of a 200px column (§3.1) |
| R2 | In small mode, stack "Add resource" / "Add group" vertically; keep them side by side on wide screens | **confirmed** — the bar is `flex-wrap: wrap` today, which wraps by accident of text width, not by decision (§3.2) |
| R3 | Narrow the column with an **ellipsis button** opening a dropdown that is always fully visible (CDK-overlay-like). Background = group colour; glyph black or white by lightness | **buildable from parts that exist** — but the panel must be a **dialog, not a menu** (§4.4) |
| R4 | That menu holds the actions removed from the cell (add group, add resource, change colour, remove) | **premise corrected**: nothing was ever removed — #395 *added* these inline, and #396 explicitly deferred the overflow-menu idea. This PRD reverts that layout choice (§3.5) |
| R5 | Preserve the expand/collapse arrow on groups, to the right of the ellipsis button | **kept**, and it gains the `data-action` it is missing today, which is a live focus bug (§8 B3) |
| R6 | The date is readable only when the centre of the day cell is on screen — anchor it to the edge | **confirmed** — `text-align: center` in a 2400px box (§3.3) |
| R7 | Localize as much as possible — the browser does this natively. Dutch should read "ma 27 okt" | **~95% already built**; the dates are pinned by one default (§3.4) |
| R8 | Re-audit blind-user accessibility | **3 blockers, 12 majors** (§8) |
| R14 | The ellipsis panel has no "Rename" entry, for either a resource or a group | **added** — rename existed but had no discoverable route (§20) |
| R13 | With a group and a resource, the row panel opens under the FIRST trigger clicked, not the one just clicked | **reproduced — an overlay-contract mismatch in my own M5 code** (§19) |
| R12 | Switching from a specific locale back to "browser locale" does nothing, with a console TypeError | **a crash in `BsSelectValueAccessor`** — not scheduler code (§18) |
| R11 | The "Resources" corner cell and the one below it should stick to the left like the add bar | **confirmed — a CSS override bug** (§17) |
| R10 | The scheduler scrolls back to (0,0) whenever its data/state changes | **confirmed and narrower than reported** — *resource* changes reset it, event changes do not; measured in Chromium (§16) |
| R9 | **Regression from #396**: on a smartphone, press-and-hold on an event used to drag it. Since the `contextmenu` handler shipped, the long-press opens the editor instead and touch users cannot drag at all | **confirmed, root cause found, small fix** — the browser's ~500ms long-press beats the scheduler's 600ms hold by ~100ms (§13) |

R1–R5 are one feature and ship together (repo rule: one user request, one release).

## 3. Current state — measured, with evidence

### 3.1 The pinned column's budget (R1, R3, R4)

The row-header cell is a flex row (`scheduler.styles.scss:1144-1160`): expand toggle (groups
only), title, then the action cluster (`views/timeline-view.ts:306-346`).

| Piece | Width | Evidence |
|---|---|---|
| Column | `min(200px, calc(100% - 50px))` | `scheduler.styles.scss:49` |
| Cell padding | 8px × 2 = **16px** | `scheduler.styles.scss:1148` |
| Cell `gap` × 2 | **16px** | `scheduler.styles.scss:1151` |
| `.expand-toggle` (groups) | **16px** | `scheduler.styles.scss:1171-1179` |
| `.scheduler-resource-actions` — 4 × 24px + 3 × 2px | **102px** | `scheduler.styles.scss:1183-1230` |
| **Left for `.resource-title`** | **≈50px** | remainder |

Fifty pixels is five characters on a control whose entire job is to say *which resource this
row is*. The title is already `text-overflow: ellipsis` (`:1161-1169`), so the failure is
silent: every resource reads "Meetin…".

The four controls come from `appendResourceActions` (`timeline-view.ts:538-581`):
`add-resource` (`+`), `add-group` (`⊞`), a native `<input type="color">`
(`createColorSwatch`, `:615-630`), `delete-resource` (`×`). All are permission-gated and
**absent when denied** (`can()`, `:518-521`).

### 3.2 The add bar (R2)

`createAddBar` (`timeline-view.ts:641-666`) renders a `role="toolbar"` **sibling of the
grid** (appended at `:214-215`), pinned to the column's foot
(`.scheduler-timeline-addbar`, `scheduler.styles.scss:1233-1245`). Being outside the grid is
deliberate and must stay (`:632-640`): a button-only row would fake a rowheader, inflate
`aria-rowcount` and put Tab stops in a roving-tabindex grid.

It is already `flex-wrap: wrap`, so the two buttons wrap *when the text happens not to fit*
— an accident of font metrics that will stop working the moment the column narrows or the
strings are translated shorter. R2 asks for the decision to be made explicitly.

### 3.3 The day header label (R6)

`timeline-view.ts:113-129` sets `dayHeader.textContent =
dateService.formatDateWithWeekday(day, options.locale)` on a box of
`daySlots × slotWidth`, with `text-align: center` (`scheduler.styles.scss:1042-1048`). At
the defaults (`--scheduler-slot-width: 50px`, `slotDuration: 1800`, midnight-to-midnight)
that is **48 × 50 = 2400px per day**, ~16,800px for the week — the label sits at its 1200px
centre and is off-screen almost always.

> **Trap.** `.scheduler-timeline-slot-header` is used for **both** the 7 day headers
> (`timeline-view.ts:123`) **and** the 336 per-slot time labels (`:163`) — distinguished
> today only by an inline `style.fontSize = '10px'` at `:167`. A sticky rule on that class
> would pin all 336 time labels. The fix needs a **new class**.

Everything else is in place: the scroller is `.scheduler-content`
(`scheduler.styles.scss:175-179`), the header block is one sticky wrapper (`:1005-1011`),
and the corner cell is already pinned on both axes (`:1020-1033`). No ancestor uses
`contain`/`content-visibility`/`will-change`; `.scheduler-timeline-body` deliberately has no
`overflow` (`:1050-1057`). **The timeline is not virtualized** — every cell is in the DOM —
so a pure-CSS fix is the right shape, and per-cell JS is not.

**Timeline-only.** Week/day cells are `flex: 1 0 var(--scheduler-column-min-width)` = min
120px (`:192-199`) — worst case 60px off-centre, cosmetic. Month/year render per-day cells.

### 3.4 Localization (R7)

**The static-string half is already built and good, and this answers the user's open
question directly: "Today", "Year", "Month" are already overridable — nothing new is
needed.** `SchedulerMessages` is a ~90-key catalogue with `DEFAULT_MESSAGES` and
`resolveMessages(options.messages)` (`scheduler-core/src/models/messages.ts:8-287`). A
repo-wide grep for hardcoded `aria-label`/`textContent`/`title` literals in the scheduler WC
returns **zero hits**. There are also **no hardcoded month or weekday-name arrays** — all
names go through `toLocaleDateString`.

The *date* half is broken by `scheduler-core/src/models/options.ts:178-185`:

```ts
locale: 'en-US',      // :178  ← the one that bites
firstDayOfWeek: 1,    // :179
timeFormat: '24h',    // :185
```

`DateService` compounds it with `locale: string = 'en-US'` **parameter defaults** at
`date.service.ts:247, 254, 261, 268` — the default is applied twice over. A Dutch browser
gets "Mon, Oct 27" where the platform would have produced "ma 27 okt" for free.
`formatDateWithWeekday` already *is* the user's example and already works — once `locale`
reaches it.

> **The scheduler is the only date component in the repo that hardcodes `en-US`.**
> `datepicker`, `datetime-picker`, `timepicker` and `calendar` all declare
> `locale: string | undefined = undefined` and apply `this.locale ?? undefined`
> (e.g. `datepicker/src/mp-datepicker.element.ts:41,60,136`). The precedent is unambiguous.

Four further defects:

- **B1 — `formatTime` is hand-rolled and takes no locale at all**
  (`date.service.ts:231-242`): `${hours}:${minutes}` and the literals `'AM'`/`'PM'`. **13
  production call sites** (gutter labels, event chips, slot headers, and every
  live-announcer sentence via `base-view.ts:28-29,89,108-109,132-133,153-154`). No locale
  can reach it; nl wants "a.m.", ja "午前", and some locales use `09.00`.
- **B2 — `detectTimeFormat` is dead code.** `date.service.ts:217-226` does the correct
  `Intl` probe; **zero callers**.
- **B3 — `firstDayOfWeek: 1` is a guess**, and `getWeekNumber` (`:366-372`) is hardcoded
  ISO-8601. `Intl.Locale.prototype.getWeekInfo()` supplies both — but **Firefox does not
  ship it**, so it needs feature-detection with a fallback. `getWeekNumber` has **no
  production caller** (only its spec), because `options.weekNumbers` is never read.
- **B4 — `weekNumbers` / `weekText: 'W'` are declared and never read**
  (`options.ts:105,107,206,207`). Dead options carrying an untranslatable English literal.

Locale-unsafe concatenation also exists — `${start} - ${end}` with an ASCII hyphen at
`week-view.ts:352` and `day-view.ts:261` but an en-dash at `base-view.ts:31`;
`${monthName} ${year}` at `mp-scheduler.ts:586` and `year-view.ts:105` (ja wants 2026年10月);
and the week title's hardcoded `" - "` at `mp-scheduler.ts:1685-1692`, for which
`Intl.DateTimeFormat.prototype.formatRange()` exists.

### 3.5 On "the previous PR removed things" (R4)

A pickaxe search settles this: `git log -S"appendResourceActions" --all` and
`-S"createColorSwatch" --all` return **adds only** (`762ad93e`, squashed as `9c70d175`/#395).
No commit deletes them. #394's only deletions are English literals replaced by
`options.messages`.

What actually happened is recorded in the predecessor PRD:

- §11.2 (`scheduler-view-mode-completeness.md:930-940`): "D5.1's per-group overflow menu
  ships as up-to-two permission-gated buttons per group row **instead of an overflow menu**
  … Revisit if a consumer grants all four capabilities and finds the column crowded."
- **D12.1c** (`:1078-1093`) then predicted this exact complaint — *"With expand toggle + four
  24px controls, a group title gets ≈50px of the 200px column"* — and **D12.5a**
  (`:1268-1269`) retired it by **widening** the column instead.

So the ask is a genuine reversal of D12.5a, on the trigger §11.2 itself named. The
capabilities are also **off by default** (all four `false`,
`scheduler-core/src/models/permissions.ts:50-56, 87-90`), which is why an ordinary
scheduler shows none of this — and why the apps that hit R1 are exactly the ones with many
resources.

## 4. Design — the row menu (R1, R3, R4, R5)

### D1 — One trigger replaces four inline controls; behaviour is unchanged

The cell becomes **[⋯ trigger] [▸ expander, groups only] [title]** — the order R3/R5 asked
for. `appendResourceActions` stops appending to the cell and becomes the builder of the
panel's contents; every action keeps its `data-action`, permission gate and emitted event,
so the `handleAction` switch (`mp-scheduler.ts:2201-2217`) is untouched.

New budget on a group row: 16 + 24 + 8 + 16 + 8 = **72px of chrome**, leaving ~128px for the
title at today's 200px column and making a ~120px column viable — which is R1.

### D2 — A third `OverlayController`, not a new mechanism and not `mp-dropdown-menu`

`OverlayController` (`libs/mintplayer-web-components/overlay/src/overlay-controller.ts`) is
an explicit Angular-CDK-parity port: ordered position candidates with first-fit flip
(`:413-430`), `'reposition' | 'block' | 'close' | 'noop'` scroll strategies, rAF-batched
reposition, an Escape dismiss stack with `isTopmost` arbitration (`:229-231`),
outside-mousedown close, and focus return **captured at `open()`** rather than read from a
configured trigger (`:236-245, 296-300`). That is exactly the "always fully visible, like the
CDK" the user asked for.

The scheduler already drives two — `dayPopover` (`mp-scheduler.ts:153-180`) and
`eventEditorOverlay` (`:199-215`). Both resolve their anchor **lazily by id**, because the
views destroy and rebuild all DOM on every state change; a captured element detaches under
the open panel. The row panel must copy that shape exactly.

`mp-dropdown-menu` is rejected twice over: its trigger contract is `<details>`/`<summary>`,
and it is **scoped menu-only** by an earlier decision — which D4 makes disqualifying.

### D3 — The panel lives outside the grid, as a top-level child of the shadow root

Two independent reasons, both binding:

1. **Layout.** The controller writes `position: fixed`, so no ancestor may introduce
   `transform`, `filter`, `contain` or `will-change` or it becomes the containing block.
   `.scheduler-day-popover` already records this in the stylesheet (`:580-583`).
2. **ARIA.** A panel nested `grid → row → rowheader → …` breaks the grid's owned-children
   contract — the same defect class as the column resizer (§8 M11). Associate with
   `aria-controls` instead of containment.

**Corollary: R2 must not be implemented with a CSS container query.**
`container-type: inline-size` computes to `contain: layout style inline-size`, which would
silently make that element the containing block for this panel. R2 reuses the existing JS
narrow signal (D6).

### D4 — The panel is a `role="dialog"`, not a `role="menu"` — because of the colour input

This is the design's one genuine constraint, and it overrides the user's word "dropdown
menu" for a concrete reason. `role="menu"` owns only `menuitem` / `menuitemradio` /
`menuitemcheckbox` / `group` / `separator`. A native `<input type="color">` inside a menu is
an **invalid owned child**, and it opens the platform colour dialog — a menu that is really
a dialog.

The panel holds add-resource, add-group, a colour control and a destructive delete. That is
a small **dialog**, and modelling it as one is both valid and honest. The trigger carries
`aria-haspopup="dialog"` + `aria-expanded` + `aria-controls`.

Rejected alternative: keep `role="menu"` and make colour a `menuitem` that opens a nested
dialog. Valid, but two nested overlays for one 24px control, and the Escape arbitration
doubles. Not worth it.

The colour control **stays a native `<input type="color">`** (PRD non-goal 5): it is
keyboard-operable, localized and SR-labelled by the platform for free
(`timeline-view.ts:615-630`).

### D5 — The trigger is a colour chip, and the contrast helper needs care

R3's "background = group colour, glyph black or white by lightness" makes the trigger do
double duty and closes a real gap: **a group's `color` is stored and editable but never
painted anywhere in the left column today** — group rows get a flat
`--scheduler-header-bg` (`scheduler.styles.scss:1079-1082, 1138-1142`), and `resolveEventColor`
is applied only to event fills (`base-view.ts:248-256`). The chip is the first time the
group's own colour becomes visible where it is set.

`getContrastColor` exists (`scheduler-core/src/utils/color.ts:27-42`) — but **it is already
in use**: `base-view.ts:255` sets **every event's text colour** with it, and four views
import it. It computes YIQ perceived brightness against a 0.5 threshold, **not** WCAG
relative luminance, so it does not guarantee 4.5:1; and it returns `#000000` on unparseable
input (`rgb()`, named colours) rather than signalling failure.

**Therefore: do not edit it in place.** Add a sibling `getReadableTextColor` that computes
sRGB-linearized relative luminance, picks whichever of black/white scores the higher
contrast ratio, and returns `null` when the input cannot be parsed so the caller can fall
back to the neutral surface. Use it for the new chip. Migrating `getContrastColor`'s
existing callers to it is a **separate, opt-in follow-up** — it changes event label colours
across all five views and deserves its own visual review, not a drive-by.

### D6 — Narrow mode reuses the existing signal, hoisted

`[data-narrow]` exists: a `ResizeObserver` on the header toggles it below
`NARROW_HEADER_WIDTH = 560` (`mp-scheduler.ts:1709-1734`), applied inside a
`requestAnimationFrame` because mutating layout in the RO callback trips the browser's
undelivered-notifications guard (`:1726-1728`). It observes **component width, not
viewport**, deliberately — the scheduler can sit in a dock pane far narrower than the screen.

It observes only `.scheduler-header`, so it is not reusable as-is. Hoist it: observe the
host, write the attribute on the shadow root's container, let both the header and the add bar
read it. One threshold, one source of truth, no container query (D3).

### D7 — Where the trigger sits in the grid focus model (**decided: hybrid**)

Today's four action buttons are plain `<button>`s with **no `tabindex`**
(`timeline-view.ts:587-603`), so they are default Tab stops *inside* `role="grid"`. Roving
tabindex covers only the slot cells (`:266-293`). A 50-resource timeline with all
capabilities granted therefore holds **up to 200 Tab stops inside the grid** — and the
codebase already treats this as an anti-pattern, having moved the add bar out for exactly
this reason (`:632-640`).

Collapsing four buttons into one is a 4× win for free. APG's answer is **zero**: Tab should
move *out of* a grid.

**Decided — both paths, because neither alone is sufficient:**

1. **The trigger joins the roving set.** ArrowLeft from a row's first slot focuses the row's
   ⋯ button; ArrowRight returns to the slots. Enter/Space opens. This is the *universal*
   path — it needs no OS-level support and works identically on every platform.
2. **The `contextmenu` event opens the panel and focuses the trigger.** Not a `Shift+F10`
   key listener — see D7a.

The trigger is `tabindex="-1"` throughout, so the grid keeps **exactly one** Tab stop.

Non-negotiable either way: `aria-haspopup` / `-expanded` / `-controls` written in the **same
render** as the visual state; the panel outside the grid subtree; the keymap added to
`gridInstructions` and the demo page.

> **Correction to an earlier draft of this PRD:** it claimed the roving change "also fixes
> M10". It does not. M10 is caused by `adjacentRow` filtering `isResource`
> (`mp-scheduler.ts:3029-3031`), so group rows are skipped by vertical arrow navigation
> regardless of what the rowheader does. That is a separate one-line fix, tracked in M9.

### D7a — Listen for `contextmenu`, never for the `Shift+F10` key

`Shift+F10` is a **Windows** convention. macOS has no equivalent keystroke, so a key
listener would ship a Windows-only affordance.

The `contextmenu` **event** is the platform-neutral hook — every OS fires it from its own
native gesture:

| Platform | Gesture that fires `contextmenu` |
|---|---|
| Windows | `Shift+F10`, the dedicated Menu/Application key, right-click |
| macOS | `Control`+click, right-click |
| macOS + VoiceOver | `VO+Shift+M` ("open shortcut menu") |
| Any | right-click / long-press on touch |

**The scheduler already does exactly this**, and the precedent is one branch away:
`handleContextMenu` (`mp-scheduler.ts:996-1010`) is bound on the shadow root, opens the
event editor when the target is inside an event box, and otherwise returns early — leaving
the native menu alone with the comment *"Ours now — the native menu on anything else (empty
grid, header, the panel's own inputs) stays untouched."* We add a second branch for the
resource cell and inherit the arbitration, the `preventDefault` discipline and the
composed-path handling for free.

Keyboard-fired `contextmenu` events target the focused element, which is what
`OverlayController` anchors to — so no coordinate handling is needed.

This also lands a genuinely nice desktop affordance for free: **right-clicking a resource row
opens its actions**, which is what a user tries first.

Note the residual gap that makes path 1 mandatory: a macOS keyboard user *without*
VoiceOver has no context-menu keystroke at all. ArrowLeft is their only route.

### D8 — Focus restoration is not optional

The timeline rebuilds imperatively whenever the resource set changes, so after any panel
action the trigger is a **different DOM element**. `captureActionFocus`/`restoreActionFocus`
(`timeline-view.ts:233-263`) already solves this — but only for nodes carrying
`data-action`. **The trigger must carry `data-action="row-menu"` + `data-resource-id`** and
it is covered for free. Omitting it reproduces the expand toggle's live bug exactly (§8 B3).

After "delete resource" the row is gone; the existing fallback is `.scheduler-add-button`
(`:261`). Extend the chain: next row's trigger → the grid's roving cell → never `<body>`.

## 5. Design — sticky day label (R6)

Wrap the text in a **new** element with a **new class** (§3.3's trap), and:

1. **Offset by the resource column, not zero.** `left: 0` slides the label under the pinned
   corner cell, which is `sticky; left: 0; z-index: $z-sticky-column`
   (`scheduler.styles.scss:1029-1032`) while day headers are `z-index: auto`. Use
   `left: var(--scheduler-resource-column-width)` — the same property the resizer rewrites
   at runtime (`timeline-view.ts:490-493`), so a user-dragged column keeps working for free.
   Prefer `inset-inline-start` for RTL.
2. **Drop `text-align: center`** on the new class; a box cannot be centred and pinned at once.
3. **Sticky-inside-sticky is fine** — the ancestor sticks on `top`, the label on `left`.

One edge case to note, not fix: `.scheduler-container.touch-drag-mode .scheduler-content`
sets `overflow: hidden` during a touch drag (`scheduler.styles.scss:1412-1413`), so sticky
degrades to static there. Harmless — the position is frozen anyway.

Week view is out of scope (§3.3). If ever wanted, it is the same change offset by
`var(--scheduler-time-gutter-width)` instead.

## 6. Design — localization (R7)

- **D9 — `locale: undefined` means "ask the browser", and becomes the default.** Change
  `DEFAULT_OPTIONS.locale` and the four `DateService` parameter defaults to `undefined`.
  Do **not** substitute `navigator.language`; that defeats the runtime's own resolution
  order. Matches the four sibling date components exactly (§3.4).
- **D10 — `formatTime` goes through `Intl`**, gains a `locale` parameter, and is
  **memoized** in a `Map` keyed by `locale|format`. It is called once per slot per day —
  hundreds of times per render — and a fresh `Intl.DateTimeFormat` per call is the classic
  perf trap. 13 call sites update.
- **D11 — `timeFormat` defaults through the already-written `detectTimeFormat`** (B2), with
  `'12h' | '24h'` staying as an explicit override.
- **D12 — `firstDayOfWeek` from `Intl.Locale…getWeekInfo()`**, feature-detected with a
  fallback to `1` — **Firefox does not ship it**, and it is a getter on some engines and a
  method on others. **`getWeekInfo` returns Sunday as `7`, while `Date.getDay()` uses `0`** —
  normalise before use. Gated on the §12 audit: the scheduler has never run with a
  Sunday-start week and must be made compatible first.
- **D13 — Range formatting.** Adopt `Intl.DateTimeFormat.prototype.formatRange()` for the
  week/timeline header title (`mp-scheduler.ts:1685-1692`) and normalise the
  hyphen/en-dash inconsistency in event chips. The datatable's `labels` API argues
  (`datatable/src/types/labels.ts:6-9`) that word order forces **formatter functions** over
  `{placeholder}` templates; that argument applies to the scheduler's `${start} - ${end}`
  concatenations, but converting the whole catalogue is out of scope — §11 Q3.
- **D14 — Delete `weekNumbers` / `weekText`** (B4), or wire them and move `weekText` into
  `messages`. They are dead and carry an untranslatable literal. Recommend deleting.
- **D15 — No new strings mechanism.** `options.messages` already covers everything; every
  new string in this feature goes through it. Note the inconsistency for a future PRD, not
  this one: file-manager, query-builder and datatable expose the table as a **top-level
  element property**, while the scheduler buries it at `options.messages` — so overriding one
  string means constructing an options object.
- **D16 — Demo it.** No demo passes `locale` or `messages` to the scheduler today (zero
  hits across all three demo apps). A translation surface nobody has exercised is one that
  does not work.

## 7. Non-goals

1. No translation catalogue ships with the library — English defaults + an override table.
2. No change to week/day/month/year label centring (§3.3).
3. No `mp-dropdown-menu` adoption (D2, D4); no new general-purpose menu WC.
4. No SSR/no-JS tier for the scheduler.
5. The colour control stays a native `<input type="color">` (D4).
6. Migrating `getContrastColor`'s existing callers to the WCAG helper (D5) — separate.
7. Converting the message catalogue to formatter functions (D13) — separate.

## 8. Accessibility re-audit (R8)

The #393/#394 programme held up: refused-Save is the best-implemented thing in the component
(one channel, delivered by moving focus, `error-text` crossing into the picker's shadow root
because an IDREF cannot, and an `updateComplete` await so the control is described before
the user lands on it); resize glyphs are correctly decorative; cross-resource drag has a
keyboard equivalent announcing a **view-appropriate** keymap.

**But the audit found three blockers this feature would not otherwise have touched.**

### Blockers

- **A-B1 — The scheduler cannot be named.** `applyGridRoles` writes `role="grid"` +
  `aria-describedby` and never `aria-label` (`base-view.ts:392`); there is no `label`
  attribute on `MpScheduler` (`:77-89`) and no label option. Week/day/month/year announce
  "grid" over hundreds of unnamed cells. A consumer's `aria-label` on `<bs-scheduler>` **is**
  forwarded correctly onto `<mp-scheduler>` and then **discarded**, because the host has no
  role and the grid is two levels into the shadow root — wrapper transparency is perfect and
  buys nothing. Violates CLAUDE.md's "a WC whose role lives on an inner node must accept a
  `label`". Fix: a `label` property + per-view default message.
- **A-B2 — Week and day view are transposed grids, so a focused cell is associated with the
  WRONG column header.** `week-view.ts:150-167` maps rows to `.scheduler-day-column` — 7 rows
  of 49 cells against 7 columnheaders. A user on Monday 11:00 sits in "row 1, column 6", and
  the 6th columnheader is **Friday**. Wrong context is worse than none: the user schedules
  against the wrong day. Fix: explicit `aria-colindex`/`aria-rowindex` decoupled from DOM
  order (which also resolves M4).
- **A-B3 — Focus falls to `<body>` on view switch and on group expand/collapse.**
  `renderView()` calls `container.innerHTML = ''` (`base-view.ts:305`) and nothing
  re-focuses. **Alt+M** from a focused cell, or **Enter on a group's expand toggle**, drops
  focus on `<body>`; since the keydown listener is bound to the host, every later keystroke
  is outside the widget. The toggle is missed by the existing restore because it carries only
  `data-group-id`, not `data-action` (`timeline-view.ts:233-238, 313-325`) — **which is
  precisely the mistake D8 must not repeat.**

### Majors (12)

M1 gridcells have **no accessible name** — row/time context exists only as an arrow-key
announcement, so Tab-in, click, view switch and focus restoration all announce "blank"
(`timeline-view.ts:363-373`, `week-view.ts:113-123`, `day-view.ts:85-94`) · M2 `aria-rowindex`
off by one, second header row unindexed (`timeline-view.ts:100-101, 141-144, 181-189`) ·
M3 first header row's slot container has no role, while its twin one row down is explicitly
`presentation` (`:111` vs `:149-152`) · M4 no column model at all — day headers span ~48 slot
columns with **no `aria-colspan`**, no `aria-colcount`/`-colindex` anywhere · M5 month-view
events lack `aria-pressed` + `aria-describedby` that all other views set
(`month-view.ts:206-212`) · M6 the announced keymap is wrong for month/year (promises Enter
creates an event; in year it drills in) and **Space — the only route to the day popover — is
documented nowhere** · M7 Page Up/Down are dead in month/year *and* don't `preventDefault`,
so the page scrolls off the widget · M8 the popover's resource picker is unnamed — a
`<label>` cannot label a custom element or reach into its shadow root; `mp-select` needs
`input-label`, which the editor passes 470 lines later but the popover does not
(`mp-scheduler.ts:626-634`) · M9 "click the day number to open that day" has no keyboard
equivalent in week/day · M10 group rows are a keyboard dead zone — a group row can hold the
grid's only tab stop, yet `adjacentRow` filters `isResource`, so the first arrow teleports
away · M11 the column resizer is a `separator` **inside** the grid despite a comment claiming
otherwise (`timeline-view.ts:423-434`) · M12 `handleKeyDown` returns unconditionally while a
**non-modal** dialog is open regardless of focus location, so Shift+Tab back to the grid
leaves every key dead (`mp-scheduler.ts:2306-2335`).

### Guards — must not regress

Names carry the row title (`timeline-view.ts:531-536`) · a denied action is **absent**, never
disabled (`:527-533, 580`) · expand/collapse is a `<button>` with live `aria-expanded` ·
refused Save speaks once, on the offending field, by moving focus · focus survives rebuilds
by stable id/key · Escape arbitration via `isTopmost` · neither dialog claims `aria-modal`
while the page stays operable · focus is never reported as selection in month/year · one
`:focus-visible` ring, **no `outline: none` anywhere** · `prefers-reduced-motion` honoured ·
wrapper transparency in all three frameworks.

### Spec coverage gaps

**A-B1, A-B2, A-B3, M1, M2, M5 and M6 all pass the current suites.** Unasserted: dialog
role/name/initial-focus/return for both dialogs; any grid name outside the timeline; header↔cell
alignment; any gridcell name; rowindex consistency; month-view event ARIA; focus after view
switch or group toggle; Page Up/Down in month/year; the popover picker's name; grouped-timeline
navigation entirely. The axe sweep never opens a dialog and never leaves the default view
(`apps/ng-bootstrap-demo-e2e/a11y/axe.spec.ts:53-64`).

## 9. Breaking changes and versioning

| Change | Impact |
|---|---|
| Row actions move from the cell into a panel | Visual + DOM. Consumer CSS/e2e targeting `.scheduler-resource-action` breaks; **the existing keyboard spec targets these selectors** (`mp-scheduler.keyboard.spec.ts:1140-1163`) and must be updated. |
| `DEFAULT_OPTIONS.locale` → `undefined` (D9) | Dates follow the browser instead of `en-US`. The headline of R7. |
| `timeFormat` → locale-derived (D11) | A US browser starts showing 12h. Pin with `timeFormat="24h"`. |
| `firstDayOfWeek` → locale-derived (D12) | US locales may start weeks on Sunday. Pin with `firstDayOfWeek`. |
| `weekNumbers`/`weekText` deleted (D14) | Dead options; no runtime behaviour changes. |
| `label` property added (A-B1) | Additive. |
| `aria-colindex`/`-rowindex` corrections (A-B2, M2, M4) | AT-visible only; may break specs asserting today's indices. |

Versions: web-components **2.7.0**, ng **22.11.0**, react **19.13.0**, vue **3.14.0**.

## 10. Test plan

Unit: panel open/close/Escape/focus-return; each action still emits its event with the same
detail; permission gating still removes entries; `getReadableTextColor` asserting a real
≥4.5:1 ratio across `DEFAULT_COLORS` and the mid-tones where YIQ and WCAG disagree;
`formatTime` under `nl-BE`/`en-US`/`ja-JP`; `locale: undefined` following the runtime;
`firstDayOfWeek` with `getWeekInfo` stubbed **present and absent** (Firefox).
ARIA: the guards above, plus the blocker fixes and every gap in §8's coverage list.
Keyboard: update the `.scheduler-resource-action` selectors; panel key containment; D7's
chosen model; Page Up/Down in month/year.
e2e: a 390×844 portrait project asserting the title is unclipped and the add bar stacks; a
horizontal-scroll assertion for the day label; extend the axe sweep to open both dialogs and
visit all five views.
**One batched sweep at the end**, per CLAUDE.md.

## 11. Decisions (settled 2026-08-02)

| # | Question | Decision |
|---|---|---|
| Q1 | How does a keyboard user reach the ⋯ panel? | **Both paths** — the trigger joins the roving set (ArrowLeft from the first slot focuses it) **and** the existing `contextmenu` handler gains a branch that focuses the trigger and opens the panel. Not a `Shift+F10` key listener; `contextmenu` is the platform-neutral hook (D7, D7a). |
| Q2 | How far do the locale defaults change? | **All three browser-derived** — `locale`, `timeFormat` **and** `firstDayOfWeek` (D9–D12). The scheduler has no production users yet, so a visible change for US consumers is acceptable. **Sunday-start correctness is not assumed** — it is being audited separately (§12) before implementation. |
| Q3 | Which a11y blockers ship here? | **All three** (A-B1, A-B2, A-B3), plus the cheap majors in M9. Commit granularity is free — the PR is squashed. |
| Q4 | Is the ⋯ panel unconditional? | **Yes, at every width.** One layout, one keyboard model, one test matrix. |

## 12. Sunday-start compatibility (Q2 follow-on)

Deriving `firstDayOfWeek` from the locale means the scheduler must actually *work* with a
Sunday-start week, and it has only ever run with `1`. **Audited 2026-08-02.** The *arithmetic*
is safe; the breakage is in the type/validation layer, in **where the derivation runs**, and
in one live defect in a component the scheduler embeds. Citations in the plan's M1b.

**Four things that must change:**

- **D12a — A `7` never reaches the correct math.** The `first-day-of-week` attribute handler
  guards `if (day >= 0 && day <= 6)` and **silently discards anything else**
  (`mp-scheduler.ts:312-321`). Nothing downstream works until this is fixed.
- **D12b — `DayOfWeek` spans two incompatible domains, so do not widen it.**
  `scheduler-core/src/models/types.ts:19` declares `0 | … | 6` and is used both for
  `firstDayOfWeek` (`options.ts:45`) *and* for `BusinessHours.daysOfWeek`
  (`options.ts:11-12`), whose doc comment pins it to the `getDay()` domain ("0 = Sunday").
  Widening it to `0..7` would silently admit a meaningless `7` into `businessHours`.
  **Decision: keep the public API in the `getDay()` 0-6 domain and normalise `Intl`'s output
  with `% 7` at the single derivation site.** That confines the 1-7 domain to a few lines and
  leaves `date.service.ts`, `mp-calendar`, all three Angular wrappers and the existing
  `firstDayOfWeek = 0` calendar specs untouched.
- **D12c — Derive from the *resolved* locale, never from `DEFAULT_OPTIONS.locale`.** That
  constant is the hardcoded `'en-US'` (`options.ts:178`), so a naive
  `derive(options.locale)` would hand **every user on earth a Sunday start**, Europe
  included. The derivation must run at state-creation time against
  `locale || navigator.language` — the pattern `detectTimeFormat` already uses
  (`date.service.ts:218`) — and D9 makes the default `undefined`, which `Intl.Locale` cannot
  take, so the fallback is mandatory rather than defensive.
- **D12d — `mp-calendar`'s week-number column is live and breaks.** Unlike the scheduler's
  own dead `getWeekNumber`, `mp-calendar` has its **own** ISO implementation
  (`mp-calendar.element.ts:162-167`) that feeds `week.number` (`:136`) and renders it as a
  real `<th scope="row" role="rowheader">` (`:389`). Reproduced for January 2026:

  | Monday-start | Sunday-start |
  |---|---|
  | week 1 — Dec 29 – Jan 04 | week 1 — Dec 28 – Jan 03 |
  | week 2 — Jan 05 – Jan 11 | **week 1** — Jan 04 – Jan 10 ← duplicate |
  | week 3 — Jan 12 – Jan 18 | week 2 — Jan 11 – Jan 17 ← off by one thereafter |

  Two consecutive rows labelled "week 1". **This surfaces inside the scheduler's own event
  editor**, which pushes `first-day-of-week` into two `mp-datetime-picker`s
  (`mp-scheduler.ts:1097, 1114`). Fix with `getWeekInfo().minimalDays` (ISO = 4, US = 1) or
  hide the column when the week does not start on Monday.

**Everything else checked out clean:**

**Everything else checked out clean:**

- `getWeekStart` is correct for every input 0-6 *and* tolerates `7` — verified over the full
  matrix; the `(day < firstDayOfWeek ? 7 : 0)` clamp handles it.
- **No weekday-header desync.** The classic failure — headers reading Mon..Sun over cells
  running Sun..Sat — cannot happen here: all three views build their headers from the actual
  generated first week (`month-view.ts:27-33`, `year-view.ts:81-88`, `week-view.ts:61-62`),
  not from a fixed sequence.
- **No weekend detection exists at all**, so none can break.
- **Month grids already vary between 4, 5 and 6 rows** under today's Monday default, and the
  CSS uses `grid-auto-rows`. Sunday-start changes which months get which count (15 of 48
  across 2024-2027) but introduces no new behaviour.
- The embedded `mp-calendar` uses proper modular arithmetic throughout.
- `date.service.spec.ts` **already tests `getWeekStart` with Sunday-start** (`:12-26`); only
  `getWeekDays` and `getMonthWeeks` still assume Monday.

Remaining decision: the **scheduler's** `getWeekNumber` is hardcoded ISO and has **no
production caller** — so deleting it with `weekNumbers`/`weekText` (D14) is cheaper than
making it locale-aware. This is separate from `mp-calendar`'s live copy (D12d), which must be
fixed rather than deleted.

**D12e — a stale-render gap worth fixing here.** `year-view.update` re-renders **only when
the year changes** (`year-view.ts:171-181`); it has none of the `optionsRequireRerender`
check the other three views carry (`month-view.ts:249-253`, `week-view.ts:234`,
`timeline-view.ts:1044`). That check watches `firstDayOfWeek` **and `locale`** — so a runtime
change to either leaves the year view's twelve mini-calendars stale. **This directly breaks
D16's locale-switch demo**: flipping the demo to Dutch while the year view is showing would
appear to do nothing.

## 13. The touch gesture model (R9 — regression from #396)

### 13.1 Root cause

Two timers race on the same gesture, and the browser's is shorter:

| | Delay | Source |
|---|---|---|
| Scheduler's hold-to-drag | **600 ms** | `DEFAULT_TOUCH_HOLD_DURATION = 600`, `input/input-handler.ts:52` |
| Browser long-press → `contextmenu` | **~500 ms** (Android Chrome; iOS Safari comparable) | platform |

`handleContextMenu` (`mp-scheduler.ts:996-1010`, bound on the shadow root at `:1588`)
inspects only the *target*, never the pointer type. So on touch the sequence is:
finger down → the scheduler arms its 600 ms timer → at ~500 ms the browser fires
`contextmenu` → the editor opens → the drag never arms. **Touch drag is unreachable, not
merely awkward.**

This is a pure regression: #396 added the handler for the desktop right-click affordance
(D12.8b) and nothing scoped it to mouse input.

### 13.2 The repo already has the proven recipe

`mint-dock-manager` runs the **same 600 ms long-press drag** successfully on touch
(`TOUCH_LONG_PRESS_MS = 600`, `mint-dock-manager.element.ts:77`). Two differences explain why
it works and the scheduler does not:

1. **The dock has no `contextmenu` handler at all** — nothing to collide.
2. `.dock-tab` carries the full suppression set — `touch-action: none; user-select: none;
   -webkit-user-select: none; -webkit-touch-callout: none;`
   (`mint-dock-manager.element.scss:327-332`), with a comment pointing at
   `docs/prd/dock-touch-long-press-drag.md`.

`.scheduler-event` has only `touch-action: none`
(`scheduler.styles.scss:331-335`) — **no `user-select`, no `-webkit-touch-callout`**. So even
once the handler is scoped, iOS can still raise the selection magnifier during the hold.

### 13.3 Mobile already has a route to the editor — it just isn't discoverable

`registerEventActivation` (`mp-scheduler.ts:2018-2032`) implements a **synthetic double-tap**
on a 500 ms window and calls `tryOpenEventEditor`, and it is wired into the **touch tap path**
(`:2177-2181`, whose own comment says so; the tap originates in
`input-handler.ts:388-399`). **Double-tapping an event on a phone already opens the editor
today.** No new gesture is required to keep touch users whole — only the long-press needs
giving back.

### 13.4 The model

Desktop is unchanged. Mobile becomes coherent:

| Intent | Desktop | Mobile |
|---|---|---|
| Select | click | tap |
| **Move / resize** | mousedown + move | **long-press 600 ms + move** (restored) |
| Open the editor | right-click · double-click · `F2` | **double-tap** (already works) · the ⋯ affordance (13.5) |
| Row actions | right-click · click ⋯ | tap ⋯ |
| Native context menu | replaced by ours, on events only | **suppressed** — we never show a browser menu on a draggable surface |

### 13.5 D17 — Scope `contextmenu` to non-touch, suppress the native menu, keep one idiom

Three changes:

1. **`handleContextMenu` returns early for touch/pen**, after calling `preventDefault()` so
   the *native* menu cannot appear mid-hold either. Detection must not rely on
   `PointerEvent.pointerType` alone — `contextmenu` is a `PointerEvent` in Chromium but a
   plain `MouseEvent` in Firefox and Safari. Track the last observed pointer type (the
   `InputHandler` already owns `touchHoldTimer` / `isTouchDragMode` / `touchHoldTarget` and
   can answer "is a touch gesture in flight") and consult that, with `pointerType` as a
   fast path. Note `preventDefault()` on `contextmenu` is unrelated to — and not forbidden
   by — the standing rule against `preventDefault()` on touch `pointerdown`.
2. **Complete the CSS suppression set on the event**, matching the dock's proven recipe:
   add `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` beside
   the existing `touch-action: none`.
3. **Add the ⋯ affordance to the selected event**, reusing the row idiom this PR already
   introduces (D1/D4). Selection-reveals-affordances is the established pattern here —
   `.scheduler-timeline-event.selected .resize-handle` widens to 24px
   (`scheduler.styles.scss:1359-1361`) — so a ⋯ button appearing on the selected event is
   consistent rather than novel, and it makes the editor discoverable on touch instead of
   relying on an undocumented double-tap. It also gives the whole component **one idiom:
   ⋯ means "actions for this thing"**, whether the thing is a resource row or an event.

**The new row-panel `contextmenu` branch (D7a) inherits this scoping automatically** and is
unaffected in practice: resource rows are not draggable, so nothing competes with a
long-press there, and mobile users reach the row panel by tapping the visible ⋯ — which is
the entire point of the D1 design.

### 13.5a Two constraints on the ellipsis affordance (D17.3)

Both found while walking the mobile flow end to end; both are load-bearing.

**It cannot live inside the event box.** `--scheduler-slot-height: 40px` over a 30-minute
default slot (`scheduler.styles.scss:30`) means a 30-minute event is **40px tall** and a
15-minute event is **20px** — smaller than the 24px WCAG 2.5.8 target the button needs, before
any room for the title. It must **straddle the box edge**, exactly as the resize glyphs do.
That is already possible and already intended: `.scheduler-event` sets `overflow: visible`
with the comment *"the box stays unclipped so the selected-state resize handles/glyphs can
straddle the top/bottom edges"*. Put the ellipsis on a corner by the same mechanism, sized
from its own custom property like `--scheduler-resize-glyph-size`.

**Long-pressing it must not start a drag.** The hold timer is armed for **every** touch target
(`input-handler.ts:316-322`), so without an exclusion a long-press on the ellipsis would drag
the event instead of doing nothing. The precedent to copy is immediately above it: a touch
starting on a resize handle of an already-selected event takes a fast path and skips the hold
entirely (`input-handler.ts:303-310`). The ellipsis needs the same treatment — activate on
tap, never arm a drag.

### 13.6 The suppression must cover the whole gesture surface — with one exception

The hold timer is armed for **every** touch target, not only events:
`input-handler.ts:316-322` sets it unconditionally, and the only fast path above it is a
resize handle on an already-selected event (`:303-310`). So a long-press on an empty grid
slot also arms drag-to-create.

Today's handler returns early for non-event targets **without** calling `preventDefault`
(`mp-scheduler.ts:1002`), so on Android a long-press on empty grid shows the native menu
*while* our drag-to-create arms underneath it. That is a second, pre-existing touch defect,
and the same fix cures it: on touch, suppress and do nothing, whatever the target.

**Exception — text-entry controls.** Blanket suppression would kill long-press-to-paste in
the editor's title field. The event must be left entirely alone — no `preventDefault`, no
early return — when the target is inside an `<input>`, `<textarea>` or
`[contenteditable]`. The handler already promises exactly this for mouse input ("the native
menu on anything else … the panel's own inputs stays untouched",
`mp-scheduler.ts:1006-1007`); the promise simply has to hold on touch as well.

### 13.7 Latent bug to check while in here

**B5 — the hold timer is not obviously cancelled when `contextmenu` fires.** Today
`contextmenu` opens the editor without touching `touchHoldTimer`, so the 600 ms timer can
still expire ~100 ms later and enter touch-drag mode *underneath an open editor*, against
event DOM the editor may have re-rendered. Whether this reproduces depends on whether the
browser's own `touchcancel` fires first. Scoping the handler (D17.1) removes the trigger, but
the teardown path should cancel any pending hold explicitly rather than depend on that.

### 13.8 Is double-tap a safe primary route to the editor? Yes, here.

The standard objection to double-tap is that it collides with the browser's
double-tap-to-zoom. It does not collide here, for two independent reasons:

1. **`touch-action: none` on the event** (`scheduler.styles.scss:331-335`) tells the browser
   to apply *no* default touch behaviour — including double-tap-to-zoom — for gestures that
   start on that element.
2. **The demos declare a responsive viewport**
   (`<meta name="viewport" content="width=device-width, initial-scale=1">`), which disables
   double-tap-to-zoom page-wide in mobile Chrome anyway.

Reason 1 holds even in a consumer app that forgets the viewport meta, so the guarantee is the
component's own, not the page's. Double-tap is nevertheless kept as the *secondary* route:
D17.3's visible ellipsis affordance is the discoverable one, because an undocumented
double-tap is not an affordance at all.

### 13.9 Haptic parity with the dock

The dock fires `navigator.vibrate(10)` the moment its long-press arms
(`mint-dock-manager.element.ts:2294-2296`), and its PRD records why: *"matches iOS/Android
native long-press conventions... a no-op on desktop and on devices without the vibration
API"*. The scheduler has visual hold feedback only (`.touch-hold-pending` /
`.touch-hold-active`, `scheduler.styles.scss:1418-1442`) and **no haptic**.

Add it, guarded exactly as the dock guards it. It matters more here than there: the user has
just waited 600 ms for an affordance that until now was interrupted at 500 ms by the browser,
so a positive "the drag is yours" signal is the difference between a gesture that feels
broken and one that feels deliberate. The dock's own PRD makes this argument for the visual
cue — *"without it, a 600 ms wait feels broken"* — and the haptic is the same argument on a
channel the user cannot miss.

### 13.8 Accessibility

No new pointer-only capability is introduced, so the repo's "every pointer gesture has a
keyboard equivalent" rule stays satisfied: the editor keeps `F2`
(`mp-scheduler.ts:2532-2536`), move/resize keeps move-mode. The ⋯ affordance on a selected
event is an additional, *named* control — a strict improvement over a gesture that had no
visible affordance at all. Its accessible name goes through `options.messages` like every
other string.

## 14. Spike findings

Three questions could not be settled by reading code, each able to invalidate a design
decision. Spiked 2026-08-02 as throwaway reproductions (plan §S); results below.

| # | Question | Gates | Result |
|---|---|---|---|
| S1 | Does a label `position: sticky` inside a *sticky* header inside a scroller pin correctly, offset by the resource column? | M4 / R6 | **PASS** |
| S2 | Does a `position: fixed` panel track a trigger inside a `position: sticky` cell during horizontal and vertical scroll? | M5 / D2 / D3 | **PASS**, with a caveat |
| S3 | Is `contextmenu` distinguishable as touch-originated, and what is its order relative to `touchcancel`? | M0 / B5 | **PARTIAL — the gesture is unreachable from CDP** |

Reproductions: `_spike-scheduler-sticky-overlay.html`, `_spike-scheduler-contextmenu.html`
(throwaway, per the `_spike-navbar-*` precedent). Measured in Chromium via Playwright.

### 14.1 S1 — the sticky day label works, including the handoff

Structure reproduced faithfully (7 days x 48 slots x 50px = **17,000px scroll width**, corner
column edge at 202px). Measured `getBoundingClientRect()` of day 0's label across a
horizontal scroll sweep:

| scrollX | label left | visible | within its own day cell |
|---|---|---|---|
| 0 | 210 (natural position) | yes | yes |
| 500 / 1200 / 2000 | **202 — pinned at the column edge** | yes | yes |
| 2350 | 184 (sliding out with its cell) | yes | yes |
| 2400 | 135 (passing under the corner) | yes | yes |
| 3000+ | off-screen; **day 1's label now pinned at 202** | — | yes |

So each day's label pins at the column edge while its day is on screen, then slides out with
its own cell as the day ends while the next day's label takes over. `withinCell` held true at
**every** sample — the label never bleeds into the neighbouring day.

The z-order is correct too, confirmed visually: at `scrollX 2380` the outgoing "Mon 27 Jul"
is painted **under** the pinned Resources column (only its last two characters protrude)
while "Tue 28 Jul" is pinned. The corner cell's `z-index: 7` beats the day headers' implicit
`auto` inside the `.scheduler-timeline-head` stacking context, exactly as §5 assumed.

**M4 is safe to build as specced.**

### 14.2 S2 — a fixed panel does track a sticky anchor

With the trigger inside a `position: sticky; left: 0` row-header cell and the panel a fixed
top-level child positioned from `getBoundingClientRect()`:

- **Horizontal scroll to 9,000px: `deltaX` stayed exactly 0.** `getBoundingClientRect()` on a
  sticky element reports its *visually pinned* position, which is precisely what the
  controller needs. This was the real unknown, and it is settled.
- **Vertical scroll: the anchor moved 158 → 58 → -42 → -103 and the panel followed with
  `deltaY` constant at 4.** Tracking is genuine, not vacuous.

**Caveat, and it argues for using the real controller rather than hand-rolling:** the spike's
naive stand-in happily followed the anchor *off-screen* (panel top -99 once the row scrolled
out of the scrollport). The real `OverlayController` already handles this — it pins the panel
to "its last in-viewport position (clamped to viewport edges) rather than disappearing with
the anchor" (`overlay-controller.ts:382-385`). The spike incidentally demonstrates **why**
that clamping exists. M5 must therefore use `OverlayController` as-is and must not
re-implement positioning.

Flip-on-overflow was **not** exercised (the anchor never sat close enough to the viewport
edge). Not a gap: flip is core controller logic already proven in production by the day
popover and the event editor.

### 14.3 S3 — the discriminator is confirmed; the gesture is not reproducible in CI

**Confirmed.** In Chromium a mouse right-click delivers `contextmenu` as a **`PointerEvent`
with `pointerType: "mouse"`** (event order: `pointermove` → `pointerdown` → `pointerup` →
`contextmenu`, all `button: 2`). So D17's fast path is real on Chromium. The spike also
confirmed the event element computes `user-select: auto` today — i.e. the dock's suppression
set really is absent, as §13.2 claimed.

**Not reproducible.** Three techniques failed to make the browser emit a long-press
`contextmenu`:

| Technique | Result |
|---|---|
| `Input.dispatchTouchEvent` hold, 1500 ms | `pointerdown`/`touchstart` → `pointerup`/`touchend` → `click`. **No `contextmenu`.** |
| Same, with a 1px jitter mid-hold | identical — no `contextmenu` |
| `Input.synthesizeTapGesture(duration: 1200)` | produced no events at all |

Touch emulation itself worked (`pointerType: "touch"` arrived correctly), so this is not a
setup failure: **CDP touch injection reaches the renderer but does not run the browser
process's long-press gesture recognizer.** Two consequences, both of which change how M0 is
built and verified:

1. **B5 cannot be settled in CI.** Whether `contextmenu` precedes `touchcancel` — and so
   whether the 600 ms hold timer can fire under an open editor — needs a real device. M0
   cancels the timer explicitly regardless, so this affects confidence, not correctness.
2. **No e2e test can regression-guard the gesture itself.** A spec can only verify our
   handler's *decision*, never its interaction with the native long-press. The spike
   confirmed the viable strategy: synthetic `PointerEvent('contextmenu', {pointerType})`
   round-trips faithfully for `'touch'` and `'mouse'`, and a bare
   `MouseEvent('contextmenu')` arrives with `pointerType` **absent** — which is exactly the
   Firefox/WebKit shape, and exactly the case that must fall through to tracked
   last-pointer-type. All three are unit-testable.

Firefox and WebKit were not measured (one browser was available). The tracked-pointer-type
design is engine-independent, so this does not block M0 — but the `pointerType` fast path
should be treated as an optimisation over the tracked value, never as the sole signal.

## 15. As built

Twenty-four commits on `feat/scheduler-compact-timeline-i18n`. Everything in §2 shipped except
where noted below. R10–R14 were reported during review, after the first full sweep, and are
written up in §16–§20.

### Deviations from the plan, and why

- **D7 dropped "pen counts as touch".** A stylus drives the mouse path — `mousedown` with
  its 5px threshold — and never the 600ms hold, so suppressing its `contextmenu` would have
  robbed pen users of the editor for no benefit. Only `pointerType === 'touch'` suppresses.
- **A-B2 is fixed by naming cells, not by re-indexing the grid.** Week and day view are
  day-major in the DOM, so a cell's positional column maps onto the wrong weekday. Making
  the ARIA honest would mean moving the day labels inside their rows to serve as rowheaders
  — a rewrite of week/day rendering, with the event positioning and drag systems attached.
  Instead every gridcell now states its own day, time and resource, using the string the
  live-region announcement already built. A cell that names itself does not depend on header
  association at all, which removes the *harm* (a user being told the wrong weekday) without
  the rewrite. Week cells additionally carry explicit `aria-colindex`, and their row carries
  the day name and `aria-rowindex`. **The structural rework remains open** and is the one
  substantive item this PR does not close.
- **`getWeekNumber` deleted rather than made locale-aware** (D14/M1b): no production caller,
  and its only spec asserted `1 ≤ n ≤ 53`, which is vacuous under any convention.
- **`minimalDays` is not available from `Intl`.** Measured: V8 reports only `firstDay` and
  `weekend`, so `mp-calendar` infers the rule from the week start (Sunday-start counts the
  week containing Jan 1, Monday-start follows ISO's four-day rule). Deriving both halves
  from one signal also keeps them consistent, which is what the duplicate "week 1" was.

### Found while building, fixed here, not in the original scope

- **Setting any attribute between `createElement` and `append` threw.** `updateUI`
  dereferenced `this.shadowRoot` unconditionally, and `attributeChangedCallback` fires while
  it is still null. That is idiomatic usage and what frameworks do when building elements
  imperatively.
- **The suites were silently relying on the `'en-US'` default for determinism.** With it
  gone they assert the *machine's* locale — passing in Belgium, failing in a US CI. Every
  scheduler spec mount now pins one explicitly.
- **`CSS.escape` is absent in jsdom**, so the row panel's anchor lookup threw on every open.
  It reads `dataset` instead, which is also correct for resource ids containing quotes.
- **My own type-checking was worthless for most of this branch.** `tsc -p tsconfig.json`
  targets a solution-style config with empty `files`/`include`, so it checked nothing.
  Re-running against `tsconfig.lib.json` immediately surfaced two missing imports. Use
  `tsconfig.lib.json` and `tsconfig.spec.json` directly.

### Found by review, after the first sweep

Five defects, each reproduced in a real browser before being touched — see §16–§20:

| | |
|---|---|
| R10 | Scroll position reset on any `resources` change. Narrower than reported: event edits were already fine. Made routine by M5, since every row-panel action is a `resources` change. |
| R11 | Both corner header cells were never sticky — a duplicate rule overrode `position: sticky` with `relative`, while its own comment claimed otherwise. |
| R12 | A placeholder `<option value="">` crashed `BsSelectValueAccessor`. **Outside the scheduler**, and it affects any consumer with a placeholder option. |
| R13 | The row panel opened under whichever trigger was clicked first — `open()` is a no-op while open, and the dismissal ignores anything inside the host. |
| R14 | Rename had no route from the panel, and none at all on a phone. |

Two more surfaced while verifying those and are fixed in the same commits: a runtime
`messages` change only reached the title, not the header buttons (they are built once in
`firstUpdated`); and the demo's own Language/Time-format selects rendered blank from mixing
`[ngValue]` with plain `value` attributes.

### Still open

- **The device verification M0 requires** (Android Chrome + iOS Safari). Spike S3 proved the
  browser's long-press gesture is unreachable from CDP, so CI cannot see it at all — the
  specs cover the handler's decision, never the gesture. This is the one item that cannot be
  closed from a keyboard.
- **A-B2's structural rework** (above).
- **React and Vue demos** have no language switch; the Angular one does. No wrapper change
  was needed — all three pass `options` as an object property — but the other two demos
  would exercise a derived week start more visibly, since only the Angular demo used to pin
  Monday.
- **The remaining audit majors are now closed** — M2/M3/M4 (the grid's row and column
  bookkeeping), M6 (per-view keymap text), M9 (the week-view drill-down), M10 (group rows in
  the arrow walk). See §21. Two qualifications:
  - **M11 turned out not to be a defect, only a false comment.** The resizer is inside the
    grid, as the audit said, but that is harmless here and the comment claiming otherwise was
    the actual error. §21 records what really protects it.
  - **Month view's day-number drill-down remains mouse-only.** Giving it week view's
    treatment would add a tab stop to each of 35-42 cells. That belongs with the A-B2
    follow-up, as a key on the focused cell.
- **Locale-derived behaviour makes tests machine-dependent, and that had to be pinned in two
  places.** Deriving formatting and the week start from the locale (D9–D12) means an
  unpinned test asserts whatever regional settings the machine happens to have: these specs
  passed in Belgium and failed in CI purely because one starts weeks on Monday and the other
  on Sunday. Every scheduler unit spec pins a locale, and so does the Playwright config.
  Anyone adding a spec here should assume the same.
- **The axe gate now opens the row panel** (M18). It was green while scanning none of this
  PR's ARIA, because its scheduler interaction only ever visited week view — a gate that does
  not look at the new surface is worse than no gate.
- **Overlay positioning and sticky offsets have no automated coverage.** jsdom does not lay
  out, so `getBoundingClientRect` is all zeroes and any such assertion would pass against
  broken CSS — including the exact bugs R11 and R13 turned out to be. The specs assert the
  state that drives position (panel ownership, which trigger claims `aria-expanded`); the
  geometry is browser-verified only. `scheduler-views.spec.ts` (Playwright) is the right home
  if this should be guarded.
- The `year-view` UTC date-key bug found incidentally by the Sunday-start audit
  (`toISOString()` where month-view deliberately uses local components) — a pre-existing
  timezone defect, unrelated to anything here.

## 16. Scroll position survives a rebuild (R10)

### 16.1 Measured, not assumed

Reproduced in Chromium against the built Angular demo, timeline view, scrolled to
`scrollLeft: 2400`:

| State change | Before | After |
|---|---|---|
| `events` reassigned | 2400 | 2400 |
| an event mutated — what a **resize** commits | 2400 | 2400 |
| `options` replaced | 2400 | 2400 |
| **`resources` reassigned** | 2400 | **0** |
| **a resource renamed** | 2400 | **0** |

So the report's "when data changes" is really **resource** changes only: event edits already
went through `TimelineView.update()`, which rebuilds event nodes and leaves the scroller
alone. A `resources` change takes the full `render()` path instead.

### 16.2 Cause

`this.container` in a view **is** `.scheduler-content`, the scroller itself. `clearContainer()`
starts with `innerHTML = ''`, which collapses `scrollWidth` from ~17,000px to nothing — so the
browser clamps `scrollLeft` to 0, and re-appending the content afterwards does not restore it.

### 16.3 Why it matters more after M5

Every request the row panel emits — rename, recolour, add resource, add group, delete — is a
`resources` change once the consumer applies it. On a default week the user is thrown ~17,000px
back to Monday 00:00 for having renamed a row. The feature that made those actions reachable
also made this defect routine.

### 16.4 Fix

`BaseView.clearContainer()` captures `scrollLeft`/`scrollTop` before emptying and restores them
in a **`queueMicrotask`**. Three details, the first of which cost a CI run:

- **A microtask, NOT a frame.** `render()` finishes synchronously after `clearContainer`, so a
  queued restore lands once the container is repopulated but still before the browser paints,
  and the offset never visibly passes through 0. The first implementation used
  `requestAnimationFrame`, which left exactly that window open — and it was observable: a
  caller that scrolls an element into view and then measures it (every drag gesture in the e2e
  suite does this) could have the grid slide back underneath the coordinates it had just
  recorded, so the press landed on the wrong element and the drag never armed. Three e2e specs
  failed on that, and the component looked innocent in every manual reproduction because a
  human never measures and clicks inside one frame.
- **A deliberate scroll always wins.** The restore is skipped if the offset has moved since the
  wipe — compared against what the browser clamped to when the content vanished. Restoring
  unconditionally would yank a user back who had scrolled during a refresh.
- **A view SWITCH still lands at the top-left.** `renderView` zeroes the scroller before
  constructing the new view when the view type actually changed, so the view captures `0` and
  restores `0`. Keeping the rule in one place beats threading a flag through: the view restores
  whatever it finds, and after a switch it finds nothing.

Over-restoring is safe — assigning past the new content's extent is clamped by the browser, so
a view that got shorter simply lands at its own end.

## 17. The two corner header cells were never sticky (R11)

Both `.scheduler-resource-header` cells — "Resources" and the empty one below it in the
time-label row — already declared `position: sticky; left: 0; z-index: $z-sticky-column`. They
still scrolled away, and measurement said why: they computed to **`position: relative`**.

A second rule 100 lines further down re-declared the same class:

```scss
/* Resource-column resize separator (R15) … Inside the sticky corner cell, so it
   pins with the column it resizes. */
.scheduler-resource-header { position: relative; }
```

Same specificity, later in the file, so `relative` won and silently un-stuck both cells. The
comment above it asserts the opposite — the author believed the cell was sticky and was
declaring `relative` only so the absolutely-positioned resizer had a containing block.

**It was never needed.** `position: sticky` is itself a positioned value and already
establishes the containing block an absolutely-positioned child wants. Deleting the override
restores the stickiness with no effect on the resizer.

Measured in Chromium, scrolled to `scrollLeft: 3000`, scrollport edge at 30px:

| Element | Before | After |
|---|---|---|
| "Resources" corner cell | −2370 | **30** |
| time-label row's empty cell | −2370 | **30** |
| first resource row cell | 30 | 30 |
| add bar | 30 | 30 |

The two header cells now hold the same 30px as the body rows and the add bar, which is what
R11 asked for.

### 17.1 Found alongside it: a runtime language change only half-reached the header

Exercising the new language switch showed the title translating while the buttons did not.
The header chrome is built imperatively once, in `firstUpdated`, so its text froze at whatever
`options.messages` held then — `updateTitle` ran on every state change and nothing re-applied
the button labels. `applyHeaderLabels()` now runs beside it. Eight string assignments; cheap
enough to redo unconditionally.

Verified live: switching to `nl-BE` turns the buttons into Vandaag / Jaar / Maand / Dag /
Tijdlijn. Switching to `ja-JP` renders the title as `2026/08/02～2026/08/08` — a *different
week*, because `ja-JP` starts on Sunday — while the buttons fall back to English, since the
demo ships only a Dutch table. That fallback is the contract working, not a gap.

## 18. A placeholder `<option>` crashed the select accessor (R12)

Reported against the new language switch: picking a specific locale worked, picking "Browser
locale" did nothing, and the console showed

```
TypeError: can't access property "split", valueString is null
    extractId  select-value-accessor.ts:85
```

Not scheduler code — `BsSelectValueAccessor` in `@mintplayer/ng-bootstrap/select`, and it
affects **any** consumer, not just this demo.

### 18.1 Chain

1. `<option value="">Browser locale</option>` is the idiomatic placeholder — "none", "auto",
   "follow the browser".
2. `mp-select` normalizes an empty selection to **`null`** on its host, and re-dispatches a
   *composed* `change` whose `target` is the element, not the inner `<select>` (native `change`
   does not cross a shadow boundary).
3. `hostOnChange` therefore reads `null` from the host and hands it to
   `extractId(valueString)`, which called `valueString.split(':')` with no guard.
4. The throw aborted the handler, so `ngModelChange` never fired and the model kept its
   previous value — the control looked frozen on the option the user had just left.

Measured: host value is `"ja-JP"` for a real option and `null` for the empty one, every time.

### 18.2 Fix

`extractId` returns `null` for a null/undefined input, and `getOptionValue` only consults
`optionMap` when it has a real id — so a placeholder selection reaches the model as `null`,
which is what "nothing chosen" should mean. Registered `[ngValue]` options and plain
`value="…"` options both behave exactly as before.

The demo's handlers accept `string | null` and collapse both `null` and `''` to `undefined`,
since the write-back path (`[ngModel]="locale() ?? ''"`) uses the empty string.

Verified in the browser: ja-JP → nl-BE → browser locale → ja-JP → browser locale round-trips
with zero runtime errors, the title following each locale and the buttons falling back to
English when the Dutch table is dropped.

**Worth noting for the PR description:** this is a fix to a shared library outside the
scheduler. Any app with a placeholder option in a `bs-select` was hitting it.

## 19. The row panel opened under the wrong trigger (R13)

Steps: add a resource, add a group, open the group's ⋯, then click the resource's ⋯. The
panel's *contents* changed to the resource's actions while its *position* stayed under the
group's button.

Measured before the fix — the panel sat at `top: 344` for both, which is the group trigger's
bottom edge (320 + 24), while the resource's trigger was at 361.

### 19.1 Two mechanisms had to coincide

1. **`OverlayController.open()` returns early when already open.** The anchor is resolved
   lazily by id — deliberately, because the timeline rebuilds its DOM — but nothing re-reads
   it, so `position()` never runs again. Changing `rowMenuResourceId` therefore re-rendered
   the panel's contents (Lit) without moving it (the controller).
2. **The outside-mousedown dismissal could not break the tie.** `onMouseDown` returns early
   when the event's composed path includes **the host**, and every trigger is inside the host.
   Correct for the day popover, whose anchor is a grid cell — but it means one trigger can
   never dismiss another's panel. Nothing was ever going to close it.

Either alone would have been survivable. Together, the panel was pinned to whichever row
opened it first.

### 19.2 Fix — a different row is a different dialog

`openRowMenu` now closes before opening when the requested row differs, rather than nudging
the position of a panel that is already open. That keeps the controller's own semantics —
`open()` means open, and everything it does on open (positioning, focus, the dismiss-stack
frame, the Escape return target) happens exactly once per row.

`close(false)` is deliberate: focus must **not** return to the old trigger. The user's focus
is already on the new one, so returning it would flicker, and the following `open()` captures
`deepActiveElement()` as its Escape target — it would have captured the wrong control.

Rejected alternatives, and why:

- **Call `position()` while open.** Cheapest, and it would have moved the panel. But it skips
  `moveFocusIn()`, so a keyboard user activating a different row would keep focus on the
  trigger while a differently-owned dialog appeared elsewhere. Half a re-open is worse than
  none.
- **Make `open()` reposition when already open.** Changes shared overlay behaviour for the day
  popover and the event editor to fix a scheduler bug, and muddies what `open()` means.

Clicking the open row's own trigger now toggles it closed — what a disclosure control should
do, and what `aria-expanded` on it already promised.

### 19.3 Verified

In Chromium, with a group, its child and a sibling resource, each panel opens **directly below
its own trigger** (gap 0–6px) and left-aligned to it, including the child's 16px indent —
where before all three rendered at the first trigger's position. Exactly one trigger reports
`aria-expanded="true"` at any time, and a second click on the open row closes it.

Position cannot be spec'd — jsdom does not lay out — so the specs assert the state that drives
it: which row owns the panel, and which single trigger claims expansion.

## 20. Rename belongs in the row panel (R14)

Rename already worked — double-click the title, or F2 on a cell in the row (#396's R17). Both
routes are invisible, and **neither exists on a phone**: there is no double-click and no F2.
When M5 made the panel the home for row actions, rename was the one that did not move, so the
column lost the only affordance it had for it.

`rename-resource` is now the panel's first entry, on groups and resources alike, gated on the
same `updateResource` capability that already gated the inline edit. It starts the *same*
inline edit the other two routes start — one implementation, three entry points — so the
emitted `resource-update` is unchanged and consumers need no work.

Two details:

- **The panel closes without returning focus.** `beginResourceRename` focuses the input it
  creates; handing focus back to the trigger first would be a visible detour on the way to
  typing. `close(false)` skips it, and the click handler skips its usual `closeRowMenu()` for
  this one action so the two do not fight.
- **`data-parent-id` / `data-resource-id` were re-split.** The add actions address a *parent*,
  everything else addresses the *row itself*; the previous ternary only special-cased delete,
  which would have sent rename the wrong id.

Panel contents now read: **group** — Rename, Add resource, Add subgroup, colour, Remove;
**resource** — Rename, colour, Remove.

Verified in the browser: clicking Rename closes the panel, the input appears and takes focus,
and Enter emits `resource-update` with `{ title: 'Alice Cooper' }`.

## 21. The deferred audit majors, closed

§15 listed five majors this PR did not close. Four are now closed, one turned out to be a
false comment rather than a defect, and one is deliberately left for the A-B2 follow-up. The
grouping matters because they are not all the same kind of problem.

### 21.1 The grid published coordinates that did not describe what it renders (M2, M3, M4)

Taken together these three meant the timeline's ARIA geometry was fiction. A screen reader
that tries to say "column 14 of 337, Tuesday 09:00" needs three things to agree: the grid's
declared size, each cell's own coordinates, and which header spans which columns. None of the
three was right.

**M2 — the rows were off by one against their own count.** `aria-rowcount` counted both
header rows, but only the first one carried an `aria-rowindex`, and the body started numbering
at 2 — so the first resource row claimed the time-label row's index and everything below was
shifted. Headers are now rows 1 and 2 and the body starts at 3, which is what the count always
assumed.

**M3 — one of three sibling containers was left roleless.** The day-label row's slot container
had no role while its twin one row down was explicitly `presentation`, so the day headers hung
off a bare generic inside a `row`. The second corner cell had the same shape of bug from the
other direction: no role at all, while its twin was a `columnheader`.

**M4 — there was no column model.** A day header spans ~48 slot columns and claimed exactly
one. The consequence is not a missing nicety: header/cell association is computed from these
numbers, so every column was associated with the wrong weekday. And with no `aria-colcount`,
the count is inferred from a single row's cell count — here 2, the rowheader plus the
presentational slots wrapper — so the whole timeline announced as a two-column grid.

The events overlay needed a decision. It is a `gridcell` stretched across the entire slot
strip rather than a column of its own, so it takes `aria-colindex="2"` with a colspan covering
every slot. Leaving it unindexed among indexed siblings would let a reader infer it sits one
column past the last slot — outside the declared `colcount`.

**One structural change came with it.** Slot computation is hoisted into a single `slotsByDay`
threaded through the headers and both row builders. It was previously recomputed per day per
row, but the reason to change it is correctness rather than cost: a column model needs one
authoritative answer, and a header index that disagreed with the cells beneath it would be
worse than publishing none at all.

### 21.2 Group rows were a keyboard dead zone (M10)

A group row renders real gridcells and can hold the grid's only tab stop — so a user can
easily be standing on one — yet the row walk filtered to leaf resources. `indexOf` then
returned -1 and the fallback sent them to the first resource: the first arrow press teleported
them somewhere unrelated.

The walk now takes `includeGroups` explicitly, because the two callers genuinely disagree.
Navigation includes group rows; move-mode must not, since a group row renders no events
container and could not accept the event being carried.

**The obvious fix alone would have been a different bug.** `getResourceTitle` looked rows up
through `getAllResources`, which returns leaves by design, so a group row would have announced
its time with no row name at all. That trades a teleport for a silent row. It now resolves
against the flattened tree, groups included.

### 21.3 The announced keymap was false, not merely vague (M6)

One global string described five views. In year view it promised that Enter creates an event,
where Enter opens the focused month — a user following the instructions gets a different
result. And Space went unmentioned in every view despite being the only route to the popover
in month and year, which is the one place a keyboard user reaches day-level detail.

Month and year now have their own strings. Year needs no read-only variant: Enter drills and
Space lists, so neither command is gated by a create capability and the text stays true under
any.

**Per-view text needed a re-render that was not happening.** The Lit template re-renders only
on an explicit `requestUpdate`, which the state handler issued only while a popover or the
editor was open. Per-view text would therefore have frozen at whichever view rendered first —
precisely the defect the header buttons had when they were built once in `firstUpdated`
(§17.1). A view change now requests an update.

### 21.4 Week view's drill-down existed in neither modality (M9)

The audit reported that "click the day number to open that day" had no keyboard equivalent in
week view. Measured, it was worse: week view's headers carry no `data-date`, so the click
delegation never matched there either. The feature was simply absent, not merely
keyboard-inaccessible.

The day number is now a named drill-down control in both modalities, following the existing
more-link precedent (role, tab stop, activation replayed through the scheduler-level
Enter/Space handler). Its accessible name is a localized "Open {date}" — the visible text is a
bare number, which says nothing about what activating it does.

Day view is untouched: there is nothing to drill into from it.

`toDayKey` moved to `base-view` as the single local-date wire format, replacing MonthView's
private copy. Local components rather than `toISOString()`, which is UTC and names the wrong
day either side of midnight for most of the world — the same latent defect §15 already noted
in year view.

### 21.5 M11 was a false comment, not a defect

The resizer does live inside the `role="grid"` subtree, as the audit said. But that is not a
problem here, and the real error was the comment claiming the opposite — a reader trusting it
would look for a protection that does not exist.

What actually makes it safe: `columnheader` places no restriction on its own descendants, so
no owned-children rule is broken; and `getFocusedKind()` matches on the cell and event classes
and returns `'other'` for the resizer, so the grid declines its arrow keys and only the
resizer's own listener runs. It is a deliberate second tab stop, not a trap.

Moving it out of the grid would mean rebuilding the containing block it positions against —
the sticky corner cell — for no accessibility gain. The comment now states the real reason.

### 21.6 Still open: month view's day-number drill-down

Month view has the same gap week view had, and it is not closed. Giving it the same treatment
would add a tab stop to each of 35-42 day cells, putting that many stops in front of the grid.
That is a worse regression than the gap it closes.

It needs a key on the focused cell rather than a tab stop per cell — a keymap addition, which
makes it a natural fit for the A-B2 follow-up rather than something to bolt on here.

## 22. Visual regression stays a local-only check (found while verifying this PR)

Unrelated to the scheduler, but found by reading this PR's CI logs closely enough to answer "did
Firefox actually run?", and settled here rather than left as a loose end.

### 22.1 The finding

`card.visual.spec.ts` and `ribbon.visual.spec.ts` are the only pixel-comparison tests in the repo,
and both carried `test.skip(process.platform !== 'win32', …)`. CI is `ubuntu-latest`, so **the
entire visual suite has never run in CI** — the one regression class it exists to catch was caught
only if a developer happened to run it locally on Windows.

It also cost something. `pull-request.yml` set `lfs: true` on checkout *specifically* to fetch
those baselines, and they are the only LFS objects in the repo, so every run paid LFS bandwidth
for PNGs it then skipped reading.

### 22.2 Why the obvious fix does not work

Committing a second `-chromium-linux` baseline set alongside the Win32 one — Playwright keys
snapshot filenames by platform, so both can coexist — was implemented, pushed, and **reverted**
after CI measured it:

| shot | baseline | received on `ubuntu-latest` |
|---|---|---|
| card | 864 × 10932 | **864 × 11004** — 72px taller, ratio 0.25 |
| ribbon × 4 | 1120 × 134/136 | same size, 4,492–5,102 px differ, **ratio 0.03–0.04** |

Two things that together rule the approach out:

1. **The Playwright container is not the runner.** Baselines generated in
   `mcr.microsoft.com/playwright:v1.60.0-noble` came out dimension-identical to the Win32 set, so
   that image rasterises like a Windows box; `ubuntu-latest` matched neither. A 72px height delta
   is text *wrapping* differently — a font-availability difference, not antialiasing — so
   regenerating in the same container cannot close it.
2. **Runner-generated baselines would be fragile anyway.** The ribbon diffs are 3–4× over the
   `maxDiffPixelRatio: 0.01` threshold on *fixed-size* images, i.e. pure rasterisation variance.
   GitHub refreshes runner images roughly fortnightly, so a font-package change would clear that
   threshold again and turn the suite red for reasons unrelated to the code.

Point 2 is what settles it: "generate them in CI and commit" is not a stable answer either.

### 22.3 The decision

**Visual regression remains local-only, and `lfs: true` is removed** so CI stops paying for
baselines it never reads. `fetch-depth: 0` stays — `nx affected` needs it.

The alternative was to *pin* the rasteriser rather than chase it: run the visual specs inside a
fixed container image in CI, giving one baseline set, immunity to runner drift, and
reproducibility on any machine with Docker. Costed at roughly **1.5 minutes on every PR run** for
pixel coverage of two surfaces, and judged not worth it — chrome drift on a component library is
what a human notices first, and these specs have never caught anything in CI because they have
never run there.

The full write-up, including the container recipe and the several non-obvious host-binding
gotchas, is in `apps/ng-bootstrap-demo-e2e/VISUAL-BASELINES.md` so the next person does not repeat
the attempt.

### 22.4 Why no other test has this problem

Everything else asserts structure and behaviour rather than pixels, which is font-agnostic by
construction. `dock.spec.ts` is the instructive case: named "captures a layout snapshot", it
actually clicks a button and asserts a heading appears, with a comment explaining the preference
for a stable behavioural boundary. Only a pixel comparison cares which fonts are installed, and
only two tests do that.
