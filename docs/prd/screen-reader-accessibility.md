# PRD — screen-reader accessibility across the four libraries

Status: **audit complete; decisions resolved; Phase A (shared primitives) landed and verified;
Phase 0 spikes and B–G outstanding** — 2026-07-27. Companion plan:
`docs/prd/screen-reader-accessibility-plan.md`. Decisions D1–D5 settled in §11; the cross-cutting
principle the programme is judged on is §11a. Phase A's as-built notes, including three defects its
targeted test run caught, are in the plan.

This supersedes neither `docs/prd/aria-accessibility-audit.md` (Angular-era, May 2026) nor
`docs/prd/wc-aria-accessibility.md` (four Lit WCs, May 2026) — both shipped what they promised.
It covers the surface those two never saw: the ~20 web components written *after* them, the
React and Vue wrapper libraries, the no-JS/SSR tiers, and the accessibility that was lost when
Angular templates were rewritten as Lit elements.

## 1. Problem

Between May 2026 and PR #392 the workspace went multi-framework: UI moved out of Angular
templates into framework-agnostic Lit web components, with hand-written Angular, React and Vue
wrappers over them. The May-2026 ARIA programme closed every Critical and Major item *of its
era*. It could not have covered what came next, and three things happened to accessibility in
the migration:

1. **Contracts were lost.** Seven accessibility regressions across four components, each
   traceable to a deleted Angular template that had the behaviour and a WC that does not
   (§4.1). None was caught by review, by unit tests, or by axe.
2. **New failure classes appeared** that light-DOM Angular could not have. A shadow root scopes
   IDREFs, so `aria-labelledby` silently stops resolving. A role placed on an inner shadow node
   cannot be named from outside. A `:checked` CSS state machine cannot update an ARIA attribute.
   A wrapper element interposed between the consumer and the custom element swallows ARIA.
3. **The shared primitives did not come along.** `libs/mintplayer-ng-bootstrap/a11y/` has five;
   `libs/mintplayer-web-components/a11y/` has one. Focus trapping, roving focus and the overlay
   dismiss stack were dropped, reimplemented divergently, or hand-rolled per component (§5.1).

The result is a library where a blind user cannot complete the core task of many components.
A representative sample, all verified in current code: the time-picker's listbox announces
nothing on any arrow key; the datatable cannot be sorted or resized without a mouse; the
tree-select is not a combobox at all and has no keydown handler; collapsed accordion panels and
the closed shell sidebar are read aloud and hold focus while invisible; the toast dismiss button
does not fire at all and the first toast blocks page scrolling for the session; `<bs-checkbox>`
cannot be labelled by the consumer's `<label>`; and the dock announces itself as an unnamed
`role="application"`, which takes its own pane content out of browse mode.

The audit is not evidence of neglect — the May-2026 work was real and much of it survived
intact (§4.4). It is evidence that **accessibility was not part of the WC migration's
definition of done**, and that nothing in the repo enforces it.

## 2. Goals

1. **Every component operable and perceivable by a screen-reader user, in every framework** —
   role, name, state, relationships, keyboard, focus, and status announcements, judged against
   WCAG 2.2 AA and the APG pattern for the widget.
2. **Exposed state is live at every moment, never a first-render snapshot** (§11a). This is the
   axis the programme is judged on: a stale attribute is worse than an absent one, because a blind
   user cannot detect that what they were told stopped being true. Acceptance criteria test
   transitions, not initial renders.
2. **Close all 41 Critical and ~100 Major findings** (§4), plus the Minor set where it rides
   along with work already being done.
3. **Fix the causes, not only the instances.** Six shared primitives in the WC a11y library
   (§5.1), one wrapper-transparency mechanism per framework (§5.2), and one stated rule per
   failure class (§6) — so the 31st component does not reintroduce the same defect.
4. **Make it enforceable.** An ARIA spec per element-bearing WC, a mechanical wrapper-passthrough
   guard in all three frameworks, a type-level guard for React, and an axe gate in CI including a
   no-JS pass (§7).
5. **Parity across frameworks.** An accessibility fix must not land in Angular only. Where a WC
   gains a label property, all three wrappers forward it.

## 3. Non-goals

- **Low-vision and motor accessibility beyond what overlaps.** Colour contrast, reflow at 400%,
  target size, and the theming palette are out of scope. Where a focus indicator is *absent* it
  is in scope (a blind-adjacent keyboard concern and a WCAG 2.4.7 failure); where it merely has
  poor contrast it is noted and deferred.
- **Cognitive accessibility, plain-language review, and content authoring guidance.**
- **Retrofitting a no-JS tier onto components that have none.** 21 of 26 element-bearing WCs ship
  no DSD chrome; pre-hydration their shadow content is simply absent. That is *missing* rather
  than *misdescribed*, it is the safer failure mode, and expanding the no-JS tier is its own
  project. This PRD fixes the five components that *do* ship a tier and currently mislead.
- **`ShadowRoot.referenceTarget`.** It would make plain `<label for>` work across a shadow
  boundary and is not shipped in any engine. Watch item, not a design input.
- **Screen-reader certification or a formal VPAT.** Out of scope; the exit criteria are the
  observable behaviours in §7, verified in NVDA/VoiceOver spot checks.

## 4. Findings

Method: ten parallel component-family audits covering all four layers of every component, then
eight cross-cutting sweeps and design spikes. Every finding cites `file:line` in current
`master` (`207d85f7`). Counts are deduplicated across slices.

**42 Critical · ≈110 Major · ≈75 Minor.**

Findings are organised by root cause, because that is how they should be fixed. Ten causes
account for all 42 Criticals.

### 4.1 Migration loss — a11y that shipped, then didn't

Seven regressions in four components, each diffed against the deleted template.

| Component | Lost | Old spec | New |
|---|---|---|---|
| datatable | header sort keyboard (`tabindex`, Enter, Space) | `13e1e03d~1:…/datatable.component.html` | `mp-datatable.ts:791-819` — zero `tabindex` in the whole WC |
| datatable | resize keyboard + `aria-valuenow/min/max` | `13e1e03d~1:…/datatable.component.ts:634-662` (Arrow ±10px, Shift ±1px, Home auto-fit) | `mp-datatable.ts:810-818` — `role="separator"` + `pointerdown` only |
| datatable | `selectionLabel` consumer naming API | old template's `aria-label` fallback chain | `mp-datatable.ts:870-874` — hardcoded `Select row N`; API deleted |
| carousel | prev/next as real `<button>` | `207d85f7~1:…/carousel.component.html:96-107` | `mp-carousel.ts:769-789` — `<label role="button">`, unfocusable |
| carousel | indicators as real `<button>` | same file, `:60-63` | `mp-carousel.ts:758-765` — role-less `<label>`, name discarded |
| navbar | real `<li>` list items | `17328c57~1:…/navbar-item.component.html:1` | `mp-navbar.ts:237` — `<ul>` with generic children; "list, 0 items" |
| tree-select | consumer `ariaLabel` input | `e5bc071e~1:…/searchbox.component.html:23` | no host `aria-label` support at all |

Plus one **re-litigated decision**: `role="grid"` was removed from the datatable in May 2026 for
conflicting with native `<table>` semantics (`aria-accessibility-audit.md:321`), and the WC
reinstated it (`mp-datatable.ts:718`) while dropping the keyboard support that would have
justified it — the exact inverse of what was reviewed. The tree row's keydown handler
(`mp-datatable.ts:1358-1373`) is consequently unreachable dead code. The reinstating comment
reasons about satisfying axe's `aria-required-children`: **axe-passing was treated as the bar,
and axe cannot see that a grid has no keyboard model.**

Two cautions for the fixes. The carousel and navbar losses share one root cause — the no-JS CSS
state machine legitimately needs `<label for>`, and the JS path re-used it instead of branching.
The navbar already remediated this in #391 (`d83e85cf`) by making the checkbox focusable and
giving it `role="button"` + Enter; **that is the precedent the carousel should follow**, and it
already has the `isBrowser` branch three lines away. And **do not blanket-restore**: the old
datatable spacer `<th aria-hidden>` was safe only by coincidence of authoring, and the old navbar
dropdown's `aria-labelledby` pointed at a literal id the library never emitted, so it resolved
for nobody.

### 4.2 Pointer-only interaction (Critical ×11)

Labelled but inoperable is the signature: the ARIA was written, the keyboard was not, so it
reads as finished.

- **datatable** — sortable headers; column resize (`role="separator"` + `pointerdown`, no
  `tabindex`); single-mode row selection (checkbox column renders only in `multiple`).
- **dock** — 8 floating-pane resizers, `role="separator"` + good `aria-label`, no `tabindex`, no
  keydown (`mint-dock-manager.element.ts:666-689`). The fix exists 140 lines away: the
  intersection handle at `:808-829` is focusable and arrow-operable.
- **dock** — a floated pane cannot be moved, resized or re-docked; `M`→`F` is a one-way trip.
- **file-manager** — upload. An accessible `<input type="file">` path exists
  (`openUploadPicker`, `:513-526`) but the button that calls it is gated on
  `matchMedia('(pointer: coarse)')`, so on desktop the only affordance is drag-and-drop.
- **file-manager** — context menu: Shift+F10 is wired and the `role="menu"` markup is correct,
  but focus never moves in, there is no key handler, and focus is not returned.
- **scheduler** — month-view events are bare `<div>`s with no role/tabindex/label, and the
  "+N more" overflow is a click-only `<div>`, so events past `dayMaxEvents` are unreachable.
- **scheduler** — year-view month drill-down is pointer-only.
- **timeline** — with the default `selectable="none"` items carry no `tabindex` and `onKeydown`
  returns early, while `item-click` is a documented output the demo wires up.
- **signature-pad** — pointer-only, and the canvas has no `tabindex`, so it cannot even be
  focused; `role="img"` + a label is the whole current contract.
- **tree-select** — no `@keydown` handler anywhere in the element.
- **query-builder** — the Alt+Arrow reorder shortcut is advertised on a drag handle whose
  keydown guard (`path[0] !== row`) rejects events from that very handle.

### 4.3 Shadow-boundary semantics (Critical ×5, Major ×12)

**Naming.** A role on an inner shadow node cannot be named from outside: `<label for>` and
`aria-labelledby` cannot reach in, and `aria-label` on a role-less host is ignored. Affected
with **no working naming path at all**: `mp-select` (unnamed by default), `mp-datepicker`,
`mp-timepicker`, `mp-tree-select`, `bs-typeahead`, `mp-datatable`, `mp-timeline`,
`mp-dropdown-menu`. `mp-datetime-picker.inputLabel` and `mp-otp-input.label` are the two
existing correct precedents — under two different names.

**Dead IDREFs — exactly 6 sites, not a general rot.** The sweep resolved all 26 IDREF sites:
`mp-time-list`'s `aria-activedescendant` (host → own shadow: the listbox's entire keyboard model
is inert); `mp-ribbon` ↔ `mp-ribbon-tab` in *both* directions (tab in shadow, panel in light DOM);
`mp-checkbox`'s two forwarded IDREFs; `mp-dropdown-menu`'s `label-id`, documented as "id of an
external label", wrapped in three frameworks and functional in none. Every one of the ~20 live
sites is live for the same structural reason — **both ends minted in one `render()`**.

**Native semantics lost.** Anything the browser did for free because elements were siblings in
one tree: radio-group `name` coordination (→ no `radiogroup`, no group name, no "2 of 5", no
arrow keys, N tab stops); `<label for>`; `<optgroup>` structure (`mp-select` silently drops
`<optgroup>` *and all its options*); `<form>` participation — **the `name` attribute on
`mp-checkbox`/`mp-radio`/`mp-select` submits nothing today**, so that shipped API is already
dead; real `<li>` list items.

### 4.4 Focus management (Critical ×6, Major ×4)

**Lost to `<body>`.** `mp-tree-select` on Escape (the `OverlayController` `trigger` option is
unset and the anchor is a non-focusable `div`, so `focus()` silently no-ops) and on chip removal;
`mp-query-builder` on node/sort removal (the keyboard-*move* path restores focus correctly, so
this is an oversight); `mint-dock-manager` on every layout rebuild — **zero `focus()` calls in a
4,200-line component**, so one ArrowLeft on an intersection handle resizes, rebuilds the handle
layer, and destroys the focused handle: keyboard resize is single-shot; `mp-splitter` when any
child change rebuilds the divider set; `bs-alert` on dismiss.

**Never entered.** `OverlayController.open()` never moves focus and no web component handles the
Tab key at all (`grep Tab` across the WC lib returns only comments) — so six `role="dialog"`
popups open behind the user's focus with no containment. Angular's `BsOverlayFocusDirective` does
exactly this correctly and was simply not ported.

**Trapped.** `bs-offcanvas` engages a CDK focus trap with no Escape handler and no default close
button, and `hasBackdrop` defaults to `false` — a keyboard trap (WCAG 2.1.2). It also hardcodes
`aria-modal="true"`, making the rest of the page invisible to AT while it stays visible and
clickable to everyone else.

### 4.5 Hidden but reachable (Critical ×4)

Content hidden geometrically stays in the accessibility tree and the tab order. **Three sites,
not the fifteen first suspected** — nine of eleven candidates hide correctly, several by not
rendering at all.

- **accordion** — collapsed panels are `grid-template-rows: 0fr` + `overflow: hidden` and nothing
  else, so every panel's content is read after a header announcing `aria-expanded="false"`; the
  nesting demo is four levels deep. **Closed by construction by decision D1**: `<details>` removes
  closed content from both trees natively, so this needs no CSS work.
- **shell** — the closed sidebar is `translateX(-100%)`; that is the entire mobile default.
- **carousel, no-JS tier** — all N slides' content exposed simultaneously with nothing marking
  boundaries or the current slide.
- **carousel, JS tier** — inactive slides are `aria-hidden="true"` while slotted content stays
  focusable, including two permanently-`aria-hidden` clone cells that a real slide is *teleported
  into* for the infinite-loop wrap.
- **priority-nav** — a full duplicate of every nav item, `aria-hidden`, in a 0×0
  `overflow: hidden` box: dead tab stops equal to the item count, on the normal JS path.

**The fix is already in this repo, commented.** `mp-navbar` hit this and solved it; the comment
at `navbar.styles.scss:196-204` diagnoses it in the same terms. `mp-accordion` shipped *after*
that fix without picking it up. The non-obvious half is that the `visibility` transition delay is
**directional** — the hide waits for the animation, the reveal must reset it to `0s`, which the
navbar's comment records was caught by an e2e test.

### 4.6 The no-JS tiers (Critical ×4)

**Tier 1 (`:checked` CSS machines) — CSS cannot update an ARIA attribute.** So state written only
from JS is frozen at its template literal. `mp-navbar`'s `role="button"` on the checkbox makes it
worse by suppressing the native `checked` state, which was the only channel left. `mp-shell`'s
`checked` is *inverted* above the breakpoint, so it actively misreports. Both Angular SSR
branches (`bs-tab-control`, `bs-priority-nav`) are worse still: `class="d-none"` on the
state-bearing input makes it unfocusable, leaving a `<label role="tab" tabindex="0">` /
`<label role="button" tabindex="0">` that **no key can activate** — mouse-only, while the JS
branch beside it is correct.

**Tier 2 (DSD chrome) — the chrome contains shadow markup only.** Measured from the built
artifacts: `MP_DROPDOWN_MENU_DSD_CHROME` contains **exactly one ARIA attribute in 10,303
characters** — `role="menu"` — because every item role comes from `#syncItems()` at runtime, and
the generator renders a bare `<mp-dropdown-menu></mp-dropdown-menu>`. A `menu` with no
`menuitem`s is invalid, not merely incomplete, and `mode="listbox"` server-renders as a menu.
This is a genuine outlier, not a pattern: accordion and carousel chrome ship count-correct roles
*with* working `aria-controls`↔`aria-labelledby` round-trips.

Two carousel Majors in the same tier: slides are assigned to `slot="s{i}"` in JS, so server-side
every slide falls through the default slot — **the N cells carrying `role="group"` and
`aria-label="2 of 3"` are empty and all content sits in one unlabelled cell**; and
`aria-current="true"` is baked onto indicator 1 and CSS cannot move it.

All three demos server-render and apply all five injectors, so this is the initial paint of every
page. The load-bearing population is not the racy hydration window but users where **JS never
runs**, for whom the static chrome is not a loading state but the only state, permanently.

### 4.7 Roles declared without their pattern (Critical ×2, Major ×8)

A role is a promise about keyboard behaviour and owned children.

- **datatable** `role="grid"`/`treegrid"` with no focusable rows (§4.1).
- **dock** `role="application"` on the host, unnamed — NVDA and JAWS leave browse mode inside it,
  so the pane *content*, which is prose and is the dock's entire purpose, becomes unreachable by
  virtual cursor. Tile-manager deliberately removed `role="application"` per an explicit decision;
  the dock kept it.
- **scheduler** — `role="gridcell"` in four of five views with **no `grid` or `row` ancestor**
  (orphan roles, discarded by AT), and in the fifth the `grid`→`row`→`gridcell` chain is broken by
  un-roled layout `<div>`s. The ~200 LOC spent buying grid navigation does not pay off.
- **file-manager** icon grid — `role="grid"` with `role="gridcell"` buttons as direct children, no
  `row` level, plus 201 tab stops for 200 files. It is a listbox, not a grid.
- **priority-nav** — `role="menu"` with non-focusable `role="menuitem"` spans wrapping the
  consumer's links, no roving tabindex, no arrow keys.
- **mp-dropdown-menu** — a `role="menuitem"` with no nested control is focusable but has no
  Enter/Space handling, and that is the library's own documented item shape.
- **`bs-tab-page`** — re-declares `role="tabpanel"` with a **duplicate id** and an
  `aria-labelledby` pointing from light DOM into the WC's shadow root: two tab stops, no name.
- **mp-ribbon-gallery** — `role="listbox"` in one shadow root, `role="option"` in each item's own
  shadow root, with a role-less host between them.

### 4.8 Status not announced (Major ×12)

Of the four WCs doing genuine network-latency work — `mp-datatable`, `mp-file-manager`,
`mp-tree-select`, `mp-treeview` — **zero** announce it. None imports `LiveAnnouncerController`,
which exists and is used correctly by five other components. Sorting, paging, filtering to zero
results, lazy row fetches, uploads (a full state machine with per-entry progress and error, never
rendered or announced), and lazy tree-node failures are all silent.

**"Present but inert" is this library's characteristic failure**, and it defeats attribute-level
tests: `bs-toast`'s live region is created together with its text (and on the first toast the
whole overlay attaches in one task, so no region pre-exists at any level);
`mp-file-manager`'s drop overlay is an `aria-live` region whose text never changes *and* whose
`aria-label` would override the announcement anyway; `bs-alert` is unconditionally `role="alert"`
so five static callouts fire five interruptions on load; `mp-code-snippet`'s copy toast is
`aria-hidden="false"` but is not a live region.

The implementation constraint that must be stated, or this gets "fixed" wrongly: **a status
container inserted into the DOM together with its text never announces.** Adding `aria-live` to an
existing conditional block is a non-fix that tests green. `mp-code-snippet:253` and
`mp-calendar:358` are the correct in-repo exemplars.

### 4.9 Validity, and three whole-library gaps (Critical ×2)

`aria-invalid` appears **twice** in the repo; `aria-required` and `aria-errormessage` **zero**
times. Of eight `ControlValueAccessor`s, one surfaces validity, and **four never call
`onTouched`** — so `touched` is permanently `false` and the universal
`@if (ctrl.touched && ctrl.invalid)` error idiom renders nothing, for sighted users too. Zero
form-associated custom elements exist. No `ElementInternals` anywhere.

Two more library-wide gaps: **44 screen-reader-only strings are hardcoded English** across 20
components, several concatenating English onto the consumer's already-localized label
(`` `${this.label} options` ``, `` `${label} group collapsed` ``) — while two components *ship*
message bundles and bypass them. And **`prefers-reduced-motion` is honoured in exactly one
Angular component**; `spinner` actively defeats Bootstrap's own reduce rule by re-declaring the
`animation` shorthand after the import, which discards the custom property Bootstrap uses to
implement it.

### 4.10 Documented but not implemented (Critical ×1, Major ×12)

A separate axis, found by cross-checking every accessibility *claim* in the repo — PRD phase
checklists, demo keymap panels, runtime announcement strings and doc comments — against the code.
This class is invisible to anyone auditing only the source, and it is worse than a silent gap: a
user who reads the keymap and presses the key learns not to trust the documentation.

- **`file-manager`: Enter does not activate anything, in any view.** The demo panel promises
  "Enter on a folder — navigate into it; on a file — open", and `activateNode` is reachable only
  from `@dblclick`. `onContentKeydown` handles ContextMenu, Delete, F2, Ctrl+X/C/V and
  Ctrl+Shift+N — **never Enter**. In icon view the card is a real `<button>`, so Enter merely
  *selects*. The file manager's primary action is double-click-only. **Critical**, and the panel
  also falsely promises arrow-key row focus, which lives in `mp-datatable` and does not exist.
- **`tile-manager`: three separate sources promise a revert that cannot happen** — the demo panel
  ("Esc — cancel and revert"), the move-mode entry announcement, and the cancel announcement
  itself. Every arrow press already mutated `this.tiles` and dispatched change events.
- **`dock`: `Pane X docked to Y.` is announced unconditionally after a `void` call with ≥5 silent
  failure paths.** The user is told a move succeeded when it may not have.
- **`wc-aria-accessibility.md` steps 5.7 and 8.3 are marked Done and are not shipped**: the
  four-view scheduler role mirror (only the *string* helpers were hoisted) and the
  `aria-describedby` keymap for dock and scheduler. `scheduler-keyboard-grid-nav.md`'s
  `aria-multiselectable` and instructions div likewise.
- **Four stale-documentation rows that must be fixed in prose, not code** — never by
  re-implementing a deleted API: `swiper-aria.md` describes `libs/mintplayer-ng-swiper`, which no
  longer exists (its contract *was* preserved inside `mp-carousel`); `BsReducedMotionDirective` is
  documented as consumed by the carousel and now has **zero** consumers; `navbar-noscript.md`
  describes `togglerCheckboxId`/`BsIdService` code that the WC rewrite deleted; the carousel's
  `*bsCarouselPlayPause` structural directive is now `slot="play-pause"`.

Two patterns worth carrying into the plan. **Missing implementation clusters in the last phase of
a PRD** — everything in Phases 0–7 of `wc-aria-accessibility.md` verified; the polish phase was
marked Done on the strength of the parts that were. And **stale documentation clusters where a
component was replaced rather than edited** — of five such rows, only one (tree-select's lost
result announcement) actually dropped behaviour. That is the reassuring half: the migration was
mostly faithful, and the prose simply went stale.

Twelve keymap panels and announcement sites were verified **honest**, several impressively so:
the scheduler's 13 documented keys are accurate key for key, its move-mode genuinely reverts (the
design tile-manager should have copied), and the ribbon is the best-documented component in the
repo including its announcement claims.

### 4.11 What is already good

Stated so the plan does not propose redoing solid work, and because several items are the
reference implementations the fixes should copy.

- **`mp-navbar`** is the reference for two separate failure classes at once: the only component
  that solved geometric hiding (with the directional `visibility` delay and a comment explaining
  the reveal-side reset), and the only `:checked` machine with role, state, focus ring and Enter
  all correct.
- **`mp-accordion`**'s two-tier `data-js` branch is the cleanest no-JS pattern in the repo and
  stays the reference for that *pattern* — even though decision D1 removes the accordion itself
  from it. Its DSD chrome ships genuinely usable pre-hydration semantics, including
  `aria-controls`↔`aria-labelledby` round-trips that the rewrite must preserve.
- **`mp-treeview`** is the reference shadow-DOM composite: roving tabindex, deferred `.focus()`,
  full `aria-level`/`-setsize`/`-posinset`/`-expanded`/`-selected`.
- **`mp-splitter`** is a faithful APG Window Splitter, and PR #392's restore did **not** regress
  it — #269 deleted only the Angular wrapper.
- **`mp-calendar`** carried the May-2026 keyboard work through the WC migration 1:1, with added
  min/max coverage. **`mp-pagination`** is the model for host-`aria-label` mirroring.
  **`mp-otp-input`** is the model for a decorative-boxes control. **`mp-ribbon`** is the most
  thoroughly ARIA'd component in the library and explicitly rejects `role="application"`.
- **`LiveAnnouncerController`** is correct and needs adopting, not rewriting: per-shadow regions,
  no document-level duplication, correct pre-render flush.
- **`BsComboboxDirective`**, **`BsOverlayFocusDirective`** and **`BsOverlayStackService`** are
  good Angular primitives. The work is porting them, not designing them.
- **Vue wrappers are the passthrough gold standard** — 47 of 48 correct.
- **The carousel gates JS-only ARIA out of its static chrome** (`aria-live`, `aria-keyshortcuts`,
  `tabindex` all render `nothing` without `data-js`) — the pattern the other four should follow.
- The May-2026 items spot-checked all held: calendar keyboard nav, `aria-rowcount`/`-rowindex`,
  indeterminate progress omitting `aria-valuenow`, breadcrumb `aria-current`, list-group list
  semantics, placeholder's "Loading complete", the swiper ARIA bundle (mostly), and
  `BsOverlayStackService`'s five clients.

## 5. Design

### 5.1 WC a11y primitives — the foundation

`libs/mintplayer-ng-bootstrap/a11y/` has five primitives; `libs/mintplayer-web-components/a11y/`
exports one. Resolution per primitive, and what to build:

| Angular primitive | What happened WC-side | Action |
|---|---|---|
| `BsLiveAnnouncerService` | **Ported** → `LiveAnnouncerController`, 5 consumers | adopt in 4 more |
| `BsOverlayStackService` | **Reimplemented divergently** → `OverlayController.openStack` | unify (below) |
| `BsIdService` | **Dropped correctly** — shadow roots scope ids | none |
| `BsRovingFocusDirective` | **Hand-rolled 14×**, with drift (some wrap, some clamp) | `RovingFocusController` |
| `BsOverlayFocusDirective` | **Dropped entirely** — no WC focus trap exists | `FocusTrapController` |

`wc-aria-accessibility.md:399` deferred a shared WC-a11y package "until a third WC consumer
appears". Five have appeared. That is this PRD's stated trigger.

Six additions, all in `libs/mintplayer-web-components/a11y/src/`:

1. **`HostAriaController`** (`host-aria.ts`) — `attachInternals()`; puts the role and reflected
   state on the **host**, so consumer ARIA on the host applies to the right node; resolves host
   `aria-labelledby`/`-describedby` IDREFs **in the host's own tree** into
   `internals.ariaLabelledByElements` / `ariaDescribedByElements`. **Build first** — the Angular
   wrapper fix (§5.2) has nowhere to deliver attributes without it.
2. **`FocusTrapController`** (`focus-trap.ts`) — ported from `BsOverlayFocusDirective`; shadow-
   and slot-aware (a naïve `querySelectorAll` in one root misses slotted content).
3. **`dismissStack`** (`dismiss-stack.ts`) — one document-scoped LIFO. `OverlayController` and a
   rewritten `BsOverlayStackService` both delegate, so a `bs-tree-select` inside a `bs-modal`
   stops consuming one Escape for two overlays.
4. **`RovingFocus`** (`roving-focus.ts`) — one Arrow/Home/End/wrap model with an items callback
   spanning shadow **and** `assignedElements()`. Migrate opportunistically; the value is that the
   next component does not hand-roll a fifteenth variant. Three decisions taken while building it:
   - **The pure index arithmetic is extracted** (`nextEnabledIndex`, `firstEnabledIndex`,
     `lastEnabledIndex`) and shared with Angular's `BsRovingFocusDirective`, which had an
     independently identical copy already drifted on the wrap-vs-clamp default. Phase E deletes the
     Angular duplicates.
   - **The two are not collapsed into one class.** The directive writes `tabindex` through a host
     binding on each item directive while the controller writes `el.tabIndex` imperatively, so
     delegating wholesale would put two writers on one attribute — the hazard already documented at
     `otp-input.component.ts:124-131`. Angular keeps its content-query discovery and signals.
   - **No `aria-activedescendant` mode**, unlike the directive. Inside a shadow root the attribute
     cannot resolve, which is why `mp-time-list` announces nothing. That is a constraint of shadow
     DOM, not a verdict on the pattern: the directive's light-DOM consumers (`bs-typeahead`,
     `bs-dropdown`'s combobox) use it correctly and keep it. **Consequence for later phases:** the
     combobox work in C cannot reach for activedescendant either, so its popup and input must end up
     in the same tree.
5. **`FocusRestore`** (`focus-restore.ts`) — capture-and-restore across an imperative rebuild, by
   stable key rather than index, resolving through nested shadow roots. Four design points carry
   real weight. **Capture is scoped**, using `ShadowRoot.activeElement` as both the cheap check
   and the correctness guarantee — a naïve "re-focus after render" helper would hijack focus from
   elsewhere on the page every time an unrelated data change re-rendered the component, which is
   worse than the bug it fixes. **Announce only on the fallback path**, never when the exact node
   survived, or the live region says something on every keystroke and users learn to tune it out.
   **Restore synchronously**, not in a `requestAnimationFrame` — after `replaceChildren` the nodes
   are already focusable, and the scheduler's existing rAF is a workaround for calling `focus()`
   from the wrong place; dropping it removes a frame in which focus genuinely sits on `<body>`. A
   nested not-yet-upgraded custom element gets one bounded `queueMicrotask` retry, never a loop.
   It must **not import `lit`** — three of the four rebuilds are triggered from plain non-Lit
   classes (`BaseView` subclasses have no host reference), so the Lit `ReactiveController` is thin
   sugar over a bare object, the inverse of `live-announcer.ts`. The scheduler's four hand-rolled
   copies are the de-facto specification and collapse into it. This is a safety net, not a licence:
   for the dock the primary fix remains to reposition handles by `data-key` instead of rebuilding.
6. **`inertRegions`** (`inert-regions.ts`) — gated on spike 0.4, because jsdom does not implement
   `inert`'s focusability effect and so cannot verify the claim the choice rests on. Writes `inert`
   **and** `aria-hidden` together so they
   cannot desync; callers declare the **current hidden set**, never deltas, so an interrupted
   animation cannot leave a stale `inert`; `suspend()`/`resume()` is reference-counted for
   transitions, because during one **both** the outgoing and incoming region must be non-inert;
   moves focus out before hiding, so applying `inert` cannot trade "silent focus" for "lost
   focus". `inert` propagates down the **flat tree**, which is what makes it reach slotted content
   where a `tabindex` sweep cannot.

Plus a `--mp-focus-ring` token and mixin in `libs/mintplayer-web-components/_styles/`, since
Bootstrap's focus-ring utility cannot cross the boundary.

**`OverlayController` changes** (one primitive, six dialogs fixed): add
`initialFocus?: HTMLElement | 'first' | 'self' | 'none'` (default `'none'` — it also backs menus
and comboboxes, where APG requires focus to stay on the trigger) and `modal?: boolean` gating Tab
containment; **capture the return target in `open()`** from the composed active element rather
than reading a configured `trigger`. That last change is the important one: it deletes the
misconfiguration class entirely (5 of 9 consumers omit `trigger` today and 4 of them work only by
coincidence), and it makes focus restoration LIFO for free, so unwinding nested overlays walks
focus back out one level at a time — which a fixed `trigger` cannot do. `aria-modal` and
background `inert` stay **out** of the controller: it cannot know whether its host is a modal
dialog or a menu, and `aria-modal="true"` on a non-modal popup hides the page from AT.
`mint-dock-manager.element.ts:565-570` models the honest case.

Two implementation constraints that only surfaced once it was built and tested, both non-obvious
enough to state here rather than leave in the code:

- **`document.body` must be excluded from the captured target.** It is what `activeElement` reports
  when nothing is focused, and it *is* an `HTMLElement`, so a naive capture takes it and then beats
  the configured `trigger` — reproducing the exact "stranded on `<body>`" failure the capture exists
  to fix. A programmatic open with no prior focus must fall through to the trigger. Caught by a
  pre-existing overlay test, which was right and the new code wrong.
- **The return target must be read *before* the panel is hidden.** Removing `data-menu-open` applies
  the consumer's `display: none` synchronously, which blurs anything focused inside the panel to
  `<body>` — so reading the target afterwards reads the wrong answer.

### 5.2 Wrapper transparency

**Angular — 0 of 19 wrappers are transparent to ARIA.** *Measured, superseding the audit's estimate;
see the correction below.* Every wrapper is a nested host: `<bs-checkbox>` renders `<mp-checkbox>` as
a child, so a consumer's `aria-label` lands on a role-less `bs-*` element and is ignored, and
`tabindex="0"` adds a dead tab stop *in front of* the real control.

Fix: one shared `BsForwardAriaDirective` in `@mintplayer/ng-bootstrap/a11y` copying an allow-list
(`aria-*`, `role`, `id`, `tabindex`, `title`, `lang`, `dir`) from the `bs-*` host onto the `mp-*`
child, plus `MutationObserver` for later changes, plus `role="presentation"` on the wrapper host so
it is invisible to AT rather than a mislabelled generic. One PR fixes all 19.

> **Correction — the audit's numbers here were wrong, and the guard found it.** The audit reported
> "22 of 24 wrappers discard consumer ARIA; only `carousel` and `navbar` forward anything, and only
> `aria-label`". The Phase B passthrough guard (`97f8e734`) measured it instead, and the real state
> is different in both directions:
>
> - **The population is 19**, being the wrappers whose template root is an `mp-*`/`mint-*` element.
> - **`bs-checkbox` and `bs-radio` *do* mirror `aria-*`**, via a `MutationObserver` on the wrapper
>   host — which the audit missed entirely. Neither forwards `role`, `id` or `tabindex`.
> - **`bs-carousel` and `bs-navbar` do *not* forward `aria-label`.** They accept a bespoke
>   `[ariaLabel]` **input**, which is a different thing: a consumer who writes the natural
>   `aria-label="…"` attribute gets `null` on the inner element. So the audit's two "exceptions"
>   were not exceptions to the attribute problem at all — worse than reported, not better.
>
> Recorded because it is the clearest argument in this programme for guard-before-fix: written
> against the audit's numbers, `BsForwardAriaDirective` would have been built believing two wrappers
> already worked and two others needed nothing beyond `aria-*`.

**React — 10 of 67 exports defective, and the shape is not what it looks like.** TypeScript
exempts hyphenated JSX attribute names from excess-property checking, so `aria-*` and `data-*`
pass through a narrowed props type **silently** while `role`, `id` and `tabIndex` are rejected.
So no name was ever unreachable — **host identity was**, which is what a consumer needs to point
an external `aria-labelledby` or `aria-controls` at the component. Eight wrappers are
compile-time-only defects; **two (`BsAccordionItem`, `BsTimeline`) spread nothing and drop every
undeclared attribute at runtime.** Fix: extend `React.HTMLAttributes<I>` on both the public *and*
the private inner props type (fixing only the public one leaves attributes rejected one level
down), and add `...rest` to the two. **The guard must probe `role`/`id`/`tabIndex`, never
`aria-*`** — a type-test written against `aria-label` passes vacuously on every broken wrapper.

**Vue — no action** beyond one ordering fix: `v-bind="$attrs"` placed *before* an explicit
`:aria-label` binding lets an undefined prop overwrite a consumer's attribute.

### 5.3 Naming shadow-encapsulated controls — two tiers

**Tier 1: a label property on every WC whose role lives on an inner node.** Standardise on
`inputLabel` (attribute `input-label`), which self-documents that the value lands on the inner
control and avoids collision with `<option label>`/`<optgroup label>` semantics — decisive for
`mp-select`, where those elements are literally in play. Requires renaming
`mp-otp-input.label` → `inputLabel` and its `[label]` input across all three wrappers: a
documented breaking change on a public input, taken because the alternative is permanent
two-name inconsistency in the API this PRD exists to standardise.

Both tiers rest on an assumption worth naming, because it is the widest-blast-radius unproven claim
in this document and **CI cannot reach it**: that `internals.role` makes a host nameable at all, so
that `aria-label` on a role-less-by-attribute host is exposed rather than dropped under ARIA's
prohibition on naming `role="generic"`. jsdom implements `attachInternals()` and the ARIA state
properties but not the element-reference properties, so the whole cross-root story is verified only
by spike 0.2 in three real engines. If 0.2a fails, the role must be expressed as a `role`
*attribute* on the host instead, and ~18 components change shape.

**Tier 2: host-attribute → element-reference translation, as a shared mixin.** The consumer keeps
writing idiomatic `aria-labelledby="my-label"` on the **host**; the WC resolves the ids in the
host's own tree scope (where they *do* resolve) and assigns the resolved **elements** to the
inner control's `ariaLabelledByElements` / `ariaDescribedByElements`. IDREF in, element reference
out, boundary crossed legally — reflected ARIA element references may target the same scope **or
a parent scope**, and inner→outer is exactly that direction. Baseline since **April 2025**. This
repairs `mp-checkbox`'s existing *intent*; only its mechanism was wrong. `textContent`-copying is
strictly dominated and is not built.

Tier 2 may be deferred by **exactly one phase, and no further**: tier 1 alone can be made
conformant, but it duplicates strings that drift silently, breaks under i18n, and — decisively —
cannot express `aria-describedby` at all, so the error-message story has no landing place.
Deferring is unusually cheap because there is **no API churn**: a consumer setting
`aria-labelledby` on a host today writes correct-looking code that silently does nothing, so
making it work later is a pure bug fix.

`bs-floating-label` needs **both**. Widening its `<ng-content select="input">` to match WC
controls stops content vanishing but creates no association — a widened floating-label would look
correct and still ship an unnamed control. It must resolve the projected `<label>`, mint an id
with `BsIdService`, and set `aria-labelledby` on the control's host for the tier-2 mixin to
translate.

### 5.4 Validity and form association — deliberately decoupled

**`aria-invalid` does not depend on form association.** It is a plain attribute; `mp-otp-input`
proves it end to end with no `ElementInternals` in the repo. So the WCAG-blocking half of the
validation story — an `invalid`/`required` attribute pair on each WC, mirrored from
`NgControl.invalid && touched` — is cheap and must **not** be scheduled behind FACE.

**Prerequisite that is easy to miss:** the mirror is dead on arrival without the `onTouched` fix.
Four of eight CVAs never call it, so `touched` never becomes true and an `invalid && touched`
mirror would never fire once. Same phase or earlier, never after.

**`aria-errormessage` cannot ship before the tier-2 mixin** — the message element lives in light
DOM and there is no legal way to point at it from inside the shadow root until then.

**Form association (`static formAssociated` + `attachInternals`) lands last, but is in scope for
this pull request** (decision D5). It is Baseline since March 2023 — the *more* mature of the two
APIs — and it repairs shipped API rather than
adding a feature: the `name` attribute on `mp-checkbox`/`mp-radio`/`mp-select` submits nothing
today. It coexists with `ControlValueAccessor` (orthogonal channels; removing the CVAs would
break every `[(ngModel)]` consumer for no gain), with one real conflict to design around:
`formDisabledCallback` and CVA's `setDisabledState` are two writers on one piece of state, and
`otp-input.component.ts:124-131` documents having already been bitten by that exact shape. One
internal `#disabled` source of truth, both funnelling into it, neither writing the DOM directly.
Deferring FACE costs native submission, `:invalid`, `<fieldset disabled>` and state restoration —
none of which is what stops a blind user completing a form today.

### 5.5 The radio group

Build **`<mp-radio-group>`** as a WC, not an Angular-only fix: React and Vue have no group
primitive at all, the container must wrap the radios in the DOM to own the roving tabindex, and
the group is the natural form-associated element later (one `name`, one `value`), which sidesteps
N radios competing for one name. `[bsRadioGroup]` stays as the Angular CVA adapter over it.

Two traps for the plan. **`delegatesFocus` defeats a naïve roving tabindex** — `tabindex="-1"` on
an `<mp-radio>` *host* does not remove its inner `<input>` from the tab order, so the group must
drive `tabindex` on the inner input, which means `mp-radio` must expose it first (sequence with
the `aria-*` forwarding fix). And **an unset value must not empty the tab order** — `bs-rating`
is the cautionary tale: with `value` outside `1..max` every star gets `tabindex="-1"` and the
whole radiogroup becomes unreachable.

State plainly that this **substantially but not fully** substitutes for native grouping. Restored:
group name, position, single tab stop, arrow move-and-select, `aria-checked`/`-required`/
`-orientation`. Not restored: the mutual-exclusion *invariant* (the platform made two-checked
unrepresentable; JS merely maintains it), no-JS coordination, native group `required` validation,
and cross-radio CSS.

**The checkbox group is a much smaller job — keep it that way.** Native checkboxes were never
coordinated, so nothing was lost; APG wants a labelled `role="group"` and nothing more, and each
checkbox keeping its own tab stop is correct. `[bsCheckboxGroup]` needs `role` + a label input. No
`<mp-checkbox-group>` WC — it would own one role and one label, a shallow module by `CLAUDE.md`'s
own test.

### 5.6 Hidden content — one CSS rule, plus optional hardening

Per collapsing region, two declarations:

```scss
.region            { transition: <geometry> .35s ease, visibility 0s var(--region-hide-delay, 0s);
                     visibility: hidden; --region-hide-delay: .35s; }  /* collapsed */
.region--revealed  { visibility: visible; --region-hide-delay: 0s; }   /* reveal */
```

`visibility: hidden` is load-bearing: it removes content from **both** trees, it inherits so it
reaches slotted light DOM, and unlike `display: none` it does not destroy the box the geometry is
animating. The delay is **directional** — the reveal must reset it to `0s` or the region's links
stay unfocusable for the whole opening animation.

**No shared Sass mixin.** The reveal selector is structurally different at every site
(`:checked ~`, `.accordion-item.open >`, a generated per-index rule, a custom-property matrix), so
a mixin would have to take the selector as an argument and would hide nothing. Consistency comes
from the `CLAUDE.md` rule. `inert` (via `inertRegions`) is defence-in-depth for the JS tier only —
`mp-navbar` ships with no `inert` and is correct.

`mp-shell` is the exception: its open state is a *custom-property value* and CSS cannot select on
one without `@container style()`, which lacks Firefox support. Mirror the existing state-matrix
selectors a second time to set `visibility` — mechanical, ugly, and keeps the no-JS tier working.

### 5.7 The no-JS tiers — two normative rules

**Tier 1.** *The input is the control; the label is decoration.* Clip the state-bearing input
with `visually-hidden` — **never** `display: none`/`d-none`, which destroys focusability and with
it the entire no-JS keyboard surface. Put the role, name and state (`aria-expanded`,
`aria-selected`, `aria-controls`) on the **input**. The `<label>` takes no `role` and no
`tabindex`, because a `<label>` cannot be activated from the keyboard; paint its focus ring via a
sibling selector. In the JS tier render a real `<button>` instead of the pair. Every Tier-1
defect found is a violation of one clause, and `mp-navbar` satisfies all of them.

**Tier 2.** Emit no role whose ARIA contract depends on attributes JS assigns to **light-DOM**
children; gate any such role behind `data-js` with a degradation valid without it; parameterise
the chrome generator on every attribute that changes ARIA **state**, not only structure; never
render a control as enabled when it cannot function. **When a value cannot be correct in the
static tier, omit it** — static-and-wrong misleads, static-and-absent degrades honestly, and the
codebase contains a clean example of each.

A house rule that is mechanically checkable and would have prevented four findings: **any ARIA
whose value depends on runtime state must be gated on `data-js`.** Only two of five elements do
this today.

**Where the ARIA lives determines the fix mechanism**, and it is a hard line. Inside the shadow
root → the generator can parametrise it. On a light-DOM child → only the **injector** or the
wrappers can reach it, and chrome variants are *structurally incapable* however many you
generate. So `dropdown-menu`'s item roles and the carousel's `slot="s{i}"` stamping go in the
injectors — which is an existing pattern, not an invention: `stampHostA11y`
(`inject-mp-carousel-dsd.ts:48-57`) already carries the comment *"Stamp the APG region semantics
connectedCallback would set — JS never runs here"*, and `markSubmenus` does the same. Caveat: the
injectors are careful regex over serialised HTML, and extending them to *write* attributes onto
consumer markup is a step up in risk from reading it — `inject-mp-dropdown-dsd.ts` has no spec at
all and needs one first.

**The accordion is exempt from Tier 1 entirely** — decision D1 moves it to `<details name>` +
`<summary>` in *both* tiers, so it has no `:checked` machine to govern and its expanded state is
UA-owned and live. It remains the reference for the `data-js` two-tier *pattern* for other
components, but stops being an instance of it. The remaining Tier-1 machines are `mp-navbar`,
`mp-shell`, `mp-carousel`, `bs-tab-control` and `bs-priority-nav`.

### 5.8 Announcements

Adopt `LiveAnnouncerController` in `mp-datatable`, `mp-file-manager`, `mp-tree-select`,
`mp-treeview` and `mp-scheduler`'s loading path. Announce the *outcome*, not the event: "Sorted by
Name ascending", "Page 3 of 7, showing rows 41 to 60 of 138", "Belgium removed, 2 selected",
"Could not load Documents: timeout". On the Angular side, route `bs-toast` through
`BsLiveAnnouncerService` (which owns a persistent region) rather than relying on per-toast
attributes, make `bs-alert`'s `role` opt-in, and announce `[bsCopy]` completion in the directive
so consumers get it for free.

Interpolated announcements take a **formatter function, not a prefix/suffix string** — word order
does not survive concatenation, and `typeahead`/`searchbox` already established that shape.

## 6. Normative rules (`CLAUDE.md`)

`CLAUDE.md` currently contains **zero** accessibility content, and every finding in this audit is
a rule nobody wrote down. Add an `## Accessibility` section after `## Framework wrappers`: twelve
rules (role and name; **state is live, never a snapshot** — §11a, stated first because it is the
one the programme is judged on; state on the role-bearing element; IDREFs never cross a shadow
boundary; a `label` property where the role is on an inner node; wrappers are transparent; every
pointer gesture has a keyboard equivalent; focus ring inside the shadow root; hidden means hidden
from both trees; accessible names are localized strings; focus survives a rebuild; reduced
motion), the two no-JS tier rules from §5.7, and a six-item pre-PR checklist. Full proposed text
is in the plan's Phase G.

One rule earns its place from §11a and is worth spelling out for contributors: **prefer a native
element that owns its own state over an ARIA attribute you have to remember to update.**
`<details>`/`<summary>`, a real `<button>`, and a `:checked` input that keeps its native role all
stay correct without a write path; `aria-expanded` on a `<div>` is correct only for as long as
every code path remembers it.

Deliberately excluded to protect the word budget: colour contrast (the design system owns the
palette, not component authors) and screen-reader test-matrix guidance (belongs in §7).

## 7. Test and CI strategy

**The strongest single argument in the audit:** of the eight components that went through a WC
migration, the four that came out *better* all have ARIA specs; the four that **regressed have
none.** That correlation, not any individual finding, is the case for the gate.

### What CI structurally cannot reach

Established while building Phase A, and it shapes every guard below: three of this programme's
load-bearing claims are **not verifiable in a unit-test environment at all**, for reasons that no
future jsdom release changes.

- **Tab order.** Sequential focus navigation is not a DOM API — there is no `focusNext()` to call.
  The user agent performs it from its own input pipeline, off events whose `isTrusted` flag it set
  itself, and it never treats a constructed event as input. So a synthetic
  `KeyboardEvent({key:'Tab'})` moves focus in **no** environment, real browsers included. Note the
  asymmetry: `preventDefault()` on a *real* Tab keydown does suppress the move, so it is cancellable
  by script but not causable by it. Only WebDriver/CDP injection produces a trusted event. A
  userland simulator (`userEvent.tab()`) is not a substitute here — it computes order from
  `tabIndex` with its own copy of the same rules our code applies, so it would check our arithmetic
  against our arithmetic. (`jsdom/jsdom#2102` asks this and was closed the day it was filed.)
- **`inert`'s focusability effect.** jsdom does not implement it, so `inertRegions` can only be
  unit-tested to the point of "the attribute landed". Spike 0.4.
- **Cross-root ARIA element references.** jsdom implements `attachInternals()` and the
  `ElementInternals` ARIA *state* properties but not `ariaLabelledByElements`, so
  `HostAriaController.syncReferences()` has a path CI will never exercise. Spike 0.2.

The consequence is that Phase 0's spikes are not a preamble to the real work — for these three
claims they are the **only** verification that will ever exist, which is why each carries an explicit
fail-path. And it is why the keyboard walkthrough below is a Playwright artifact rather than a unit
suite.

Four guards, each catching a class the others cannot:

1. **`*.aria.spec.ts` per element-bearing WC.** 20 of 30 have none; 9 have no spec file at all,
   including `dropdown-menu`, `select`, `treeview`, `datatable`, `shell` and `timeline`. Assert
   role, name and **each state transition** — not just the initial render.
2. **A wrapper passthrough spec per framework** — written in **Phase B, before** the 22 Angular
   wrappers are touched, not in Phase G. A regression net authored after the work it guards is not a
   net: it must fail on the defective wrappers first, then go green as they are fixed, so
   "forwarded" is proven rather than assumed. Enumerated with `import.meta.glob` so a new
   wrapper is covered with zero edits. The load-bearing assertion is that the element receiving
   the probe `id` has a tag matching `MP-`/`MINT-` — that is what distinguishes "forwarded" from
   "sitting on a wrapper `<div>` where ARIA is ignored". React and Vue have **no test target at
   all** today; Angular needs the same spec and is the lib that fails it. No new dependencies.
   **Boundary:** this asserts attributes reach the `mp-*` host and stops there. Whether the WC
   re-exposes them onto the role-bearing shadow node is the *WC's* contract and belongs in its own
   spec — conflating them reports a WC bug as a wrapper bug.
3. **A `tsc --noEmit` type-test target for React**, probing `role`/`id`/`tabIndex` per exported
   wrapper. A runtime spec cannot catch the type defect, and — the least obvious thing in this
   document — **a type-test probing `aria-*` passes vacuously**, because TypeScript exempts
   hyphenated JSX attribute names from excess-property checking.
4. **An axe gate in CI.** `@axe-core/playwright ^4.11.3` is **already installed** and covers 3 of
   99 demo pages, Angular only, with no gate — and none of the three components Phase 8.2 asked
   for. Table-drive one spec per demo app over a route list (so a new page is one line), across
   **all three** apps, `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'])`,
   failing on `critical` + `serious`, two states per route (load, plus one interaction), **plus a
   `javaScriptEnabled: false` pass** against the DSD chrome — reusing the no-JS contexts that
   already exist. Run as a separate `e2e-a11y` target so `nx affected` cannot silence it.
   Expect a baseline; allow-list per route with a comment and an issue link rather than lowering
   the threshold.

**Where conformance specs live, and why not in e2e.** Two rules, both learned in Phase B:

- **Never inside the entry point they guard.** The Angular passthrough spec imports 19 sibling
  secondary entry points. `a11y` is itself published, and the wrappers already import *from* it
  (`dropdown`, `modal`, `offcanvas`, `file-upload` today; **all 19** once `BsForwardAriaDirective`
  lands there), so hosting the spec in `a11y/src/` pointed the primitives entry point at its own
  consumers — a cycle between published entry points, masked only by `tsconfig.lib.json` excluding
  `*.spec.ts` from the build. Latent, and a build failure the moment a helper moves from a spec into
  `src/`. These live in `libs/mintplayer-ng-bootstrap/_conformance/`, which has no `ng-package.js`
  and therefore cannot be published — the `_spike-lit-context/` arrangement. Same rule for the React
  and Vue passthrough specs.
- **Unit vs e2e is decided by whether a browser adds signal, not by how integration-ish the test
  feels.** Attribute forwarding is a plain DOM fact, so it stays in vitest even though it renders 19
  real components. The three checks that genuinely need a browser are the ones no unit environment
  can reach at all (above): Tab order, `inert` focusability, cross-root ARIA references. Putting a
  19-wrapper conformance *matrix* in Playwright would need a bespoke demo page and couple the guard
  to demo content for no extra signal.

Two shared helpers worth more than their size: **`expectIdrefResolves(el, attr)`**, resolving each
token against `el.getRootNode()` — the *holder's* root, which is what the browser uses. It fails
on exactly the six dead references today, and three currently-green tests assert IDREF *strings*
while the relationship resolves to nothing. And a **keyboard-only Playwright walkthrough** per
interactive component, asserting that every control a mouse user can see is focusable and
activatable — which is what would have caught all seven migration regressions.

That walkthrough must also assert the **inverse**, which the plan originally missed: that a composite
widget is exactly **one** tab stop. "Every control is reachable" is necessary and not sufficient — a
widget where *every* item is tabbable satisfies it and is still broken, and that is literally the
`mp-time-list` 97-tab-stops and `file-manager` 201-tab-stops findings. Nothing in the repo asserts
this invariant today. For components adopting `RovingFocus` it lands as a shared parameterised suite
(`tools/e2e-shared/roving-focus-suites.ts`, matching the existing accordion/carousel shape), written
per consumer as the primitive is adopted rather than against a synthetic fixture — a harness page
would test the author's assumptions instead of real usage.

**Acceptance criteria must be observable — what is spoken, where focus lands — never "attribute X
is set".** "Present but inert" is this library's characteristic failure and it passes
attribute-level assertions by construction. Note too that axe would have caught **none** of the
data-display Criticals; it is a floor, not the gate.

## 8. Rollout

A spike phase then seven implementation phases, ordered by dependency and by accessibility gained
per hour. Detail, file lists and per-phase acceptance criteria are in
`docs/prd/screen-reader-accessibility-plan.md`.

| Phase | Content | Why here |
|---|---|---|
| **0** | Four spikes: `<details>` visual/UX parity (**gates D**), host naming via `ElementInternals` (**gates all of B**), `formDisabledCallback` vs CVA (**gates F**), `inert` through slots (**gates D's carousel**) | Each covers a platform behaviour CI structurally cannot reach. 0.2 must pass before B, and Phase A already shipped code written against it |
| **A** | WC a11y primitives (§5.1) + `OverlayController` focus/dismiss changes | Blocks B, D, E. Six `role="dialog"` popups and five focus-loss bugs fall out of it |
| **B** | Naming + wrapper transparency (§5.2, §5.3 tier 1) + localization | Most user-visible gain per hour; unblocks the validity mirror |
| **C** | Keyboard operability — the 11 pointer-only Criticals + focus restore | The largest Critical class; several fixes already exist elsewhere in the same file |
| **D** | Hidden content + both no-JS tiers + SSR chrome (§5.6, §5.7) + the accordion's `<details>` rewrite (D1) | Independent of B/C. The accordion rewrite is the largest single item and *removes* code |
| **E** | State, structure, roles and live regions (§4.7, §4.8) + validity (§5.4) + `<mp-radio-group>` (§5.5) + the datatable role rule (D2) | Depends on A (roving focus), B (tier-2 mixin for `aria-errormessage`) |
| **F** | Form association (§5.4) | Last in order, **in scope for this PR** (D5); Baseline-safe; repairs the dead `name` API |
| **G** | Guards, CI gate, `CLAUDE.md` rules, demo keymap parity | Specs land *with* each phase; the gate and docs close it out |

Per `CLAUDE.md`, the build + unit + e2e sweep runs **once** at the end, not per phase.

## 9. Risks

| Risk | Mitigation |
|---|---|
| `HostAriaController` moves the role from an inner node to the host — behaviour change for consumers styling `::part`/inner nodes | Adopt per component with its aria spec written first; the role move is invisible to CSS, only to AT |
| Injector stamping writes attributes onto consumer markup via regex | `inject-mp-dropdown-dsd.ts` gets a spec before any stamping; reuse the existing attribute-value-safe tokenisers, which already handle quoted `>` and self-closing tags |
| **`<details>` in both tiers loses `role="heading"` on accordion headers**, so they leave the heading rotor / H-key navigation — a primary skim mechanism | Accepted under D1 and flagged there. Phase D includes an NVDA + VoiceOver check on exactly this point; reversal is localized to `#renderJsItem` |
| **`<summary>` cannot be `disabled`**, and `toggle` is not cancellable, so a disabled accordion tab may flash open | Spike 0.1 gates D1 on resolving this; failure narrows D1 to the no-JS tier |
| `<details>` cannot reproduce Bootstrap's accordion chrome exactly (marker removal, `display`, chevron, focus ring, double-click text selection) | Spike 0.1 is a three-engine screenshot comparison against the current component, at the maintainer's direction |
| `<details>` cannot animate its collapse outside Chromium | Moot — animation was explicitly waived under D1, and the `grid-template-rows` animation is dropped in both tiers |
| The accordion rewrite touches the destructive DSD handoff, nested recursive close, and the toggle event contract | All three have existing specs (`mp-accordion.spec.ts`, the `[multi]×[count]` chrome, the shared e2e suite); rewrite the specs first, then the element |
| Two writers on `disabled` once FACE lands | One internal source of truth; the shape is already documented at `otp-input.component.ts:124-131` |
| The axe baseline is large enough to be ignored | Per-route allow-list with issue links, never a lowered threshold; axe is a floor, and the keyboard walkthrough is the real gate |
| `role="listitem"`/other fixes added in `connectedCallback` are absent from the DSD | The `data-js` rule (§5.7) plus per-phase no-JS checks; `mp-navbar-item` is the known instance |
| Scope: 41 Criticals + ~100 Majors is a large programme | Phases are independently shippable and each is a coherent PR; A, B and C alone close the majority of user-visible impact |

## 10. Out of scope, explicitly

Restated because auditors checked these and found them **correct** — changing them would be a
regression: `mp-tab-control`, `mp-ribbon`, `mp-treeview` and `mp-datatable` use `aria-selected`
and `aria-sort`, which are the right tokens (not `aria-current`); `mp-card` is a clean WC
migration; `bs-list-group` should stay a list, not become a listbox; `bs-trust-html` and the
markdown pipes preserve consumer semantics; `parallax` is `background-attachment: fixed` with no
animation, so WCAG 2.3.3 does not apply; `bs-toast` has no auto-dismiss, so WCAG 2.2.1 is
satisfied by construction; `navbar-dropdown`'s no-JS `:focus-within` reveal deliberately keeps
collapsed links focusable (the first Tab *opens* the menu) and must not be "fixed"; menu-divider
`role="separator"` elements are correctly non-focusable.

## 11. Decisions — resolved 2026-07-27

All five settled by the maintainer. Two carry consequences that go beyond the question asked; both
are recorded here rather than discovered during implementation.

**D1 — `<details>`/`<summary>` for the accordion: RESOLVED, and widened.** Not just the no-JS
tier — **`mp-accordion` uses `<details name>` + `<summary>` in *both* tiers, always.** Animation
is explicitly not a requirement, so the Chromium-only `::details-content` limitation is moot and
the `grid-template-rows` animation is dropped outright. The maintainer also waived the
single-open-cannot-close concern; `<details name>` permits closing anyway, so it resolves either
way.

This is a **simplification**, not just a swap. It collapses `#renderJsItem` and `#renderNoJsItem`
into one template, deletes the clipped-input machine and every `:checked` selector, removes the
`data-js` branch from this component, and — because `<details>` natively removes closed content
from the accessibility tree *and* the tab order — **closes the accordion half of §4.5's Critical
by construction, with no CSS work.** `aria-expanded` becomes live and UA-owned in both tiers,
which is exactly what a statically-rendered DSD could never provide.

> **Consequence not in the question: heading navigation is lost.** The current JS tier wraps its
> header `<button>` in `role="heading" aria-level="2"`, and the DSD chrome ships that too
> (measured: `role="heading"` ×3 + `aria-level="2"` ×3 per variant). With `<details>`, a heading
> cannot wrap `<summary>` — `<summary>` must be the `<details>`' first child — and a heading
> *inside* `<summary>` is dropped by ARIA's presentational-children rule, because `<summary>` maps
> to a button. So accordion headers stop appearing in the heading rotor / H-key navigation, which
> is a primary skim mechanism for screen-reader users. Judged worth trading for live native state
> in both tiers plus one template instead of two — but flagged because it was not part of the
> question. **Reversal is cheap and localized** if SR testing disagrees: restore
> `role="heading"` + `<button aria-expanded>` in `#renderJsItem` only, keeping `<details>` for the
> no-JS tier (the original D1 recommendation). Phase D should include an NVDA/VoiceOver check on
> this specific point.

**Gated on a spike** (plan Phase 0.1), at the maintainer's direction: `<details>`/`<summary>` must
reproduce the current Bootstrap accordion *exactly*, with no user-experience change, before the
rewrite proceeds. Two risks that spike must resolve, both surfaced while planning rather than in
the original question:

- **`<summary>` cannot be `disabled`.** `mp-accordion` supports disabled tabs today via `?disabled`
  on the header `<button>`. The only workaround is `pointer-events: none` + `aria-disabled` + a
  swallowed key handler — and because the `toggle` event is **not cancellable**, any path that
  still opens a disabled tab can only be corrected by closing it again, which flashes. If a
  disabled tab cannot be made inert without a visible flash, that is grounds to narrow D1 back to
  the no-JS tier.
- **`toggle` fires after the state change and cannot be prevented**, so `#closeNested`, the
  `is-active` markers and `mp-accordion-tab-toggle` must all be driven from a *post-hoc* signal,
  including when the UA itself closes a sibling through `name` exclusivity.

One offsetting win worth confirming in the same spike: the DSD chrome can express initial state as
a plain `[open]` attribute, which the current radio machine **cannot** — the generator has no
active tab at generation time (§4.6), so today's no-JS accordion renders every panel closed
regardless of the authored state.

Integration work this pulls in: the destructive DSD handoff currently reads pre-upgrade `:checked`
state back onto the light-DOM `is-active` markers and must read `[open]` instead; `#setActive`,
`closeAll` and the nested recursive close must be driven from `toggle` events rather than clicks;
`mp-accordion-tab-toggle` must still fire with the same detail. The `[multi] × [count]` chrome
matrix survives in shape — index-named slots still need count variants — but `multi` reduces to
the presence or absence of `name` on the `<details>`. Bootstrap styling is preserved by
`display: flex` + `list-style: none` + `::marker { content: '' }` on `<summary>` (plus
`::-webkit-details-marker { display: none }`); `.accordion-button`'s `::after` chevron is
unaffected, and the collapse/body boxes stay author-controlled inside the `<details>`.

**D2 — the datatable's role: RESOLVED as "pick the correct implementation", placement immaterial.**
Neither of the two options I offered was quite right, because both keyed the decision on
flat-vs-tree when the honest predicate is **interactivity**. A role is a promise about keyboard
behaviour, so:

| Configuration | Role | Keyboard |
|---|---|---|
| flat, no row selection | **none** — plain `<table>` | none; `<td>` maps to `cell`, so SRs stay in simple table-reading mode, which is what a data table wants |
| flat, rows selectable | **`role="grid"`** | roving tabindex over rows, Arrow/Home/End/PageUp/PageDown, Space/Enter to select, `aria-selected` |
| tree (`[tree]`) | **`role="treegrid"`** | the same, plus ArrowRight/ArrowLeft expand/collapse and `aria-expanded` on the focused row |

`aria-rowcount`/`aria-rowindex` are valid on a plain `<table>`, so the no-role case loses nothing.
This honours the May-2026 decision where it applies (a non-interactive table should not claim a
grid) while making the role legitimate wherever it is kept — and it revives the currently dead
`onRowKeydown` (`mp-datatable.ts:1358-1373`) and closes the pointer-only single-select Critical
(§4.2) in the same change. Placement stays on the inner `<table>`, per the existing comment at
`connectedCallback` about axe checking `aria-required-children` against the host's direct
children; the maintainer confirmed placement is immaterial, so the cheaper option stands.

`aria-colcount`/`aria-colindex` remain a **prerequisite** for any future column hiding, reordering
or column virtualisation, unchanged by this decision.

**D3 — the `inputLabel` rename: RESOLVED, take it.** `mp-otp-input.label` → `inputLabel` across
the WC, all three wrappers and the demos, as a documented breaking change.

**D4 — the move-mode key: RESOLVED, accept both on the scheduler.** Add `M`/`m` to
`handleEventKeyDown` alongside the existing `Enter`; document **`M` as canonical** since
tile-manager and dock already use it. Verified no conflict: the scheduler's letter shortcuts live
in `handleAltShortcut` and are Alt-gated, so bare `m` on a focused event is currently unbound.
Project memory's "`M` library-wide" note is corrected rather than stale.

**D5 — form association: RESOLVED, in scope and in this pull request.** Phase F stays last in the
ordering (nothing WCAG-blocking waits on it) but is no longer droppable.

## 11a. Cross-cutting principle — exposed state must be live

Stated separately at the maintainer's direction, because it is the axis the whole programme is
judged on: **an ARIA attribute must be correct at every moment, not merely at first render.** A
snapshot that goes stale is worse than an absent attribute, because a blind user has no way to
detect that what they were told is no longer true.

This is not a new rule so much as the single thread through §4.6, §4.7 and §4.8. Every one of
these is the same defect: `aria-expanded` frozen at `"false"` in DSD chrome because only JS writes
it; `aria-current="true"` baked onto carousel indicator 1 where CSS cannot move it;
tile-manager's `keyboardState` kept off the reactive `properties` map, so entering move mode
re-renders nothing; `aria-pressed` written only when `true`, correct today only because the
element is torn down and rebuilt; `mp-dropdown-menu`'s item ARIA computed once in `firstUpdated`
and left stale when a consumer toggles the `.active` class; the Angular no-JS tab strip's
`aria-selected` being a server-time snapshot that never updates as the user clicks.

Three consequences for implementation, which the phases already encode but which are worth naming
once:

1. **Prefer a native element that owns its own state** over an ARIA attribute the component has to
   remember to update — this is the strongest argument for D1's `<details>` and for keeping a
   `:checked` input's native role (§5.7 Tier 1).
2. **State must be derived in `render()` from reactive state**, never written imperatively from an
   event handler as a side effect. Where a component renders imperatively, the state write belongs
   in the same function as the DOM write.
3. **Where a value cannot be kept correct, omit it.** Static-and-absent degrades honestly;
   static-and-wrong misinforms. The carousel's `isBrowser ? … : nothing` gating is the idiom.

Acceptance criteria in §7 are written to test transitions, not initial renders, for this reason.

## 12. References

**Raw audit reports — `.a11y-audit/` (untracked, local only).** 20 per-slice and per-sweep reports
with `file:line` for every finding, plus `INDEX.md` describing each. Deliberately gitignored rather
than committed: this PRD carries all 42 Criticals and the ten root causes, but the ~110 Majors and
~75 Minors keep their citations only there, and Phases D–G are where that long tail lives. If the
folder is missing, the PRD and plan are self-sufficient for A–C; D–G will need findings re-derived.



Prior PRDs: `aria-accessibility-audit.md` (§13 follow-ups), `wc-aria-accessibility.md` (§12; and
line 399, the deferral this PRD triggers), `aria-review-fixes.md`, `swiper-aria.md`,
`scheduler-keyboard-grid-nav.md`, `scheduler-controlled-selection.md`, `timeline.md`,
`tab-control-noscript.md`, `navbar-noscript.md`, `splitter-accordion-wc.md` (§3, decision D1),
`carousel-wc.md`, `shell-wc-ssr.md`.

Migration commits used as the accessibility spec: `13e1e03d` (#341), `51e23166` (#361),
`eb645e53` (#269), `e5bc071e` (#342), `0e54db37` (#377), `17328c57` (#390), `d83e85cf` (#391),
`207d85f7` (#392), `a4abc015` (#387).

Reference implementations to copy rather than redesign: `mp-navbar` (Tier-1 machine, geometric
hiding), `mp-accordion` (`data-js` two-tier branch, DSD chrome), `mp-treeview` (shadow composite),
`mp-splitter` (APG Window Splitter), `mp-calendar` (date grid), `mp-pagination` (host-`aria-label`
mirroring), `mp-datetime-picker` (parameterised labels, `LiveAnnouncerController`),
`mp-code-snippet:253` and `mp-calendar:358` (persistent live regions), `BsComboboxDirective`,
`BsOverlayFocusDirective`, `BsOverlayStackService`, `inject-mp-carousel-dsd.ts:48-57`
(`stampHostA11y`).
