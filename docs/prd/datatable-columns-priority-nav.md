# PRD — Datatable column fixes (phantom scrollbar, column labels, per-column resize, touch resize) and priority-nav close-on-action

**Status:** Implemented (2026-10-07), pending the M9 sweep and the real-device check S4. The
recommendations in §4 were adopted as written, without a grilling round; spike verdicts are in §8.1 and
as-built deviations in §11.
**Plan:** [datatable-columns-priority-nav-plan.md](./datatable-columns-priority-nav-plan.md)
**Related issues:** #426 (this), MintPlayer.Spark generic query grid (consumer, ships stopgaps for items 2 and 4)

## 0. Summary

Issue #426 bundles four defects found by Spark. A fifth item comes from the maintainer: **column resizing barely
works on Android.** All five ship in one PR.

| # | Item | Kind | Where |
|---|---|---|---|
| 1 | Phantom horizontal scrollbar: measured column widths are rounded **up** | bug | WC |
| 2 | Generated accessible names use the column `name`, not its displayed label | bug (a11y) | WC + Angular |
| 3 | No per-column `resizable` flag | feature | WC + 3 wrappers |
| 4 | `bs-priority-nav` overflow menu stays open after an item is clicked | bug | Angular only |
| 5 | Column resize on touch: the gesture is lost, and the target is 6px and invisible | bug (a11y) | WC |

All line numbers are against `master` @ `d97acc89`. `DT` is short for
`libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts`. `SCSS` is short for
`libs/mintplayer-web-components/datatable/src/styles/datatable.light.scss`.

## 1. Problem

### 1.1 Phantom scrollbar (item 1)

- **When it runs.** `maybeMeasureInitialColumnWidths` (DT:1211-1245) runs once per element lifetime, latched
  by `_hasMeasuredInitial` (DT:399). It runs after the first real body row renders.
- **What it pins.** It pins **every** column into `_columnWidths` (DT:397). An explicit `col.width` is used
  as given. Otherwise the width comes from `measureColumnWidth`, which returns
  `Math.ceil(th.getBoundingClientRect().width)` (DT:1260).
- **How it is applied.** The widths are written as inline `width` + `min-width` on the row-1 `<th>`
  (DT:2203-2210). The table then gets `.measured`, which switches it to `table-layout: fixed` (SCSS:94-99) at
  `width: 100%`.
- **Effect.** Each fractional column gains up to 1px. In the issue's case the four data columns become
  297+274+379+107, plus the unpinned 40px checkbox cell (2.5rem), for **1097 px** in a **1094 px** scroller.
  That 3 px is a scrollbar.
- **Only the first measurement rounds.** Drag resize (DT:3296-3309, `column-resize.ts:13-14`) and keyboard
  resize (DT:3277-3285) already store fractional widths. The other rounding sites (DT:1182, :2246, :1205)
  only round `aria-valuenow` or the header height.
- **Why everything is pinned.** Pinning every column is intentional (comments DT:1171-1174, :1213-1218). Later
  virtual-scroll slices and pages must clip with an ellipsis instead of re-flowing the columns. **The bug is
  the inflation, not the pinning.**
- **A related latent defect.** Widths are never re-fitted. The ResizeObserver (DT:1140) only refreshes the
  virtual range. So the same phantom scrollbar comes back when the container narrows, or when a classic
  vertical scrollbar appears after measuring (virtual mode `max-height: 480px`, SCSS:33). This only affects
  measured widths. Widening is harmless because fixed layout distributes the surplus.

### 1.2 Column labels (item 2)

- **The WC side is already correct.** `DatatableColumnDef.label` exists (`types/column-def.ts:72`). Every
  generated string already reads `label ?? name`; the expression is repeated 9 times:
  - announcements DT:1540, :1590, :2978
  - filter panel / trigger DT:1916, :2163-2169
  - values and comparison panels DT:1983, :2003, :2020, :2060, :2082
  - resize handle DT:2244
- **The Angular wrapper never sets `label`.** `BsDatatableColumnDirective`
  (`libs/mintplayer-ng-bootstrap/datatable/src/datatable-column/datatable-column.directive.ts`) has no label
  input, and `effectiveColumns` (`datatable/datatable.component.ts:252-327`) never sets `label`. The header is
  delivered as a `headerRenderer` that stamps the consumer's template.
- **Our own demo shows it.** `datatables.component.html:48` declares `*bsDatatableColumn="'Name'">Artist`.
  Its resize handle says "Resize column Name", and its filter button says "Filter Name".
- **React and Vue pass `DatatableColumnDef[]` straight through, so `label` already works there.** A React
  or Vue consumer who uses `headerRenderer` without `label` has the same problem.

### 1.3 Per-column resizable (item 3)

- **Only a table-wide flag exists.** `resizableColumns` / `resizable-columns` (DT:1092-1123) gates three
  places: the handle render (DT:2238), the keyboard handler (DT:3270), and the pointer handler (DT:3290).
- **The column type has no `resizable` field.**

### 1.4 Priority-nav overflow (item 4)

- **Angular only.** The component is `libs/mintplayer-ng-bootstrap/priority-nav/`; there is no WC and no
  React or Vue wrapper.
- **Why it stays open.** `onDocumentClick` (`priority-nav.component.ts:195`) closes the menu only for a click
  outside the host.
- **Item rendering.** Items are `*bsPriorityNavItem` templates. Each is stamped three times: a measure strip,
  the inline strip, and the overflow panel (`priority-nav.component.html:16-24, :28-34, :61-72`).
- **ARIA pattern.** This is the APG **disclosure** pattern: a More `<button>` with `aria-expanded` and
  `aria-controls`, and no `role=menu`.
- **Second gap: focus is lost on close.** Closing sets the panel to `display:none`. When the focused item is
  inside it, focus falls to `<body>`. This happens on Escape (`onEscape`, :189-193) and would happen with
  the new close rule.

### 1.5 Touch resize (item 5)

All conclusions below come from reading the code. Spike S2 confirms or refutes them.

- **The handle.** It is a 6px-wide transparent `<span class="resize-handle" role="separator" tabindex="0">`
  (DT:2238-2250, SCSS:221-235) inside its own `<th>`. It is visible only on `:hover` and `.active`, so on
  touch it is never visible.
- **Most likely root cause: no `touch-action`.** There is no `touch-action` anywhere in SCSS.
  - `pointerdown` (DT:3289-3325) calls `preventDefault()` and `setPointerCapture`. Neither stops a pan in
    Chrome; only CSS `touch-action` does, and it is frozen at touchstart.
  - On a phone `.datatable-scroll` overflows horizontally (`overflow:auto`, SCSS:25-28). After the slop
    distance, the browser claims the pan and fires `pointercancel`. `onColumnResizeEnd` then ends the drag
    after a few pixels.
  - The dock tab had the same symptom (`docs/prd/dock-tab-drag-android-touch.md`).
- **Target size.** 6 px fails WCAG 2.2 **2.5.8** (24×24 minimum). The sort button touches the handle, so the
  spacing exception does not apply. A near-miss lands on `button.header-sort` and **sorts**, which reads as
  "resize does nothing".
- **No single-pointer alternative (WCAG 2.5.7).** The only alternative to dragging is ArrowLeft and
  ArrowRight ±10 px (DT:3269-3287). The scheduler PRD already decided (`scheduler-resize-glyphs.md` D6) that a
  keyboard path does not satisfy 2.5.7.
- **Minor.** A right-click or middle-click starts a resize because `event.button` is never checked.

## 2. Goals

- **G1.** Columns that fit never produce a horizontal scrollbar. This holds at first render, after the
  container narrows, and after a vertical scrollbar appears. Content that really is wider still scrolls
  horizontally (375 px phones).
- **G2.** Every generated accessible name and announcement uses the column's **displayed** label in all three
  frameworks. This holds even when the consumer sets nothing.
- **G3.** Resizability can be set per column, in the WC and in all three wrappers.
- **G4.** Clicking an action in the priority-nav overflow closes it and returns focus correctly. Nested-menu
  triggers and form fields keep it open.
- **G5.** Column resize works with a finger on Android Chrome. The hit target meets 2.5.8 on every pointer
  type and is ~40 px on coarse pointers. A single-pointer non-drag path satisfies 2.5.7.

## 3. Non-goals

- Migrating `bs-priority-nav` to a Lit WC. It has an SSR checkbox path, a measure strip and template
  stamping, which makes migration a project of its own. Item 4 is a few lines in the existing component.
- Persisting or emitting column widths (no column-state API exists, and none is requested).
- A column chooser or column menu beyond what D7 needs.

## 4. Decisions

D1–D7 are proposed and need confirmation (grilling) before M1. Each lists the recommendation first.

### D1 — Rounding mode at measurement (item 1)

**Recommendation:** `Math.floor`. The floored sum is ≤ the natural layout, which already fit. Fixed layout at
`width:100%` then spreads the ≤N px of slack, so the result is pixel-identical to today minus the scrollbar.

Keeping fractional widths is "exact" in theory. However, 1/64 px (Chromium) and 1/60 px (Firefox) snapping
can still round `scrollWidth` up at fractional DPRs. **Spike S1 decides between floor and fractional.**

### D2 — Re-fit measured widths when the scroller resizes (item 1, latent defect)

**Recommendation:** yes. This requires tagging every width as **measured** or **user-set**.

- **Which widths change.** User resizes and explicit `col.width` are never touched.
- **When measured widths are re-fitted.** In the ResizeObserver callback (DT:1140), and only while the pinned
  sum fit the previous `clientWidth`. They are scaled proportionally to the new `clientWidth`, each one
  floored at the 40 px minimum.
- **When re-fitting stops.** Once the content genuinely overflows, which is the phone case. Re-fitting then
  stops, and the table scrolls as today.

**Spike S1b** measures whether the vertical-scrollbar case happens in practice, and whether a proportional
re-fit is visually acceptable.

### D3 — Label source (item 2)

**Recommendation:** an explicit label, then the rendered header text, then `name`.

1. **Explicit label.** It comes from a new `bsDatatableColumnLabel` input on the Angular directive, and from
   `label` in the column def for React and Vue. It covers icon-only headers and wording that should differ
   from the header.
2. **Rendered header text.** This is derived in the **WC**, not the wrapper, during `renderHeader`.
   - When `headerContent` is a `Node` or fragment, its `textContent.trim()` is cached in a
     `Map<name, string>`. Announcements and panels that run outside render read that cache.
   - The header text is already localized (i18n or the translate pipe), so this costs nothing extra.
   - It makes the zero-config case correct in all three frameworks.
   - It follows the datatable's own `rowLabel` → first-cell text → index precedent (DT:2327-2350).
3. **`name`**, the last resort.

A private `columnLabel(col)` helper replaces the 9 inline `label ?? name` sites.

**Why derive in the WC.** The wrapper cannot do it. Its computed would have to create header views, which is
the NG0600 trap documented at `datatable.component.ts:290-300`.

**Accepted consequence:** React and Vue `headerRenderer` users without `label` will hear the header text
instead of the internal name. This is a fix, and it is documented as a behaviour change.

### D4 — Per-column resizable precedence (item 3)

**Recommendation:** `col.resizable ?? table.resizableColumns`. The column's explicit value wins in both
directions, so "table off, only this column on" is expressible.

- **Trap.** The Angular input must be `input<boolean | undefined>(undefined)`. A default of `true` would
  silently override `[resizableColumns]="false"` on every column. A spec pins this.
- **Rejected alternative.** `table && (col.resizable ?? true)` makes the table flag a master switch, but then
  a single resizable column is impossible.

A single `isColumnResizable(col)` helper replaces the three gates. Non-resizable columns are still measured
and pinned, because fixed layout needs every width.

### D5 — Priority-nav close rule (item 4)

**Recommendation:** a dedicated `(click)` handler on the overflow panel. `onDocumentClick` is left
unchanged.

- **Finding the target.** The handler walks `event.composedPath()` from the target up to the panel. It must
  be `composedPath`, because a nested `mp-*` trigger lives in a shadow root (`mp-navbar-dropdown.ts:215-216`).
- **What closes it.** The first interactive element on that path decides. These close it:
  - `a[href]`
  - `button`
  - `[role=button|link|menuitem|menuitemcheckbox|menuitemradio]`
- **What keeps it open.**
  - The element has `aria-haspopup` (≠ "false") or `aria-expanded`, is a `summary`, or is disabled /
    `aria-disabled="true"`.
  - Nothing interactive is hit: padding, text, `input`/`select`/`textarea`/`label`.
- **Implementation.** A pure `isClosingActivation(path, panel)` next to `overflow.ts`, so it can be
  unit-tested like `computeOverflowIds`.
- **Nested `bs-dropdown`.** Its menu is a CDK overlay on `body`, so its item clicks are already "outside" and
  close the More panel through `onDocumentClick`. Only its toggle needs the keep-open rule.
- **Documented limitation.** An item handler that calls `stopPropagation()` prevents the close.

### D6 — Priority-nav focus on close (item 4)

**Recommendation:** when the panel closes because of an activation or Escape, focus goes to the More button,
but only if `document.activeElement` is still inside the panel (checked synchronously in the handler). If
the action already moved focus (a synchronous dialog, `autofocus`), focus is left where it is.

### D7 — Touch resize design (item 5)

**Recommendation**, pending S2–S4:

1. **`touch-action: none`** (and `-webkit-touch-callout: none`) on `.resize-handle`. Because the handle is a
   leaf, the effective touch-action needs no ancestor changes.
2. **Hit area inside the column, never across the border.**
   - Size: 24 px wide on all pointers, ~40 px under `@media (pointer: coarse)`, capped at `max-width: 50%`
     (the column minimum is 40 px).
   - The visible line is a 2–4 px `::before` pinned to `right:0`.
   - On coarse pointers a resting grip is always shown.
   - Why not across the border: in virtual mode every `thead th` is `position:sticky; z-index:1` (SCSS:37-41),
     so the neighbouring header would paint over any overhang (S3 proves this). An overhang on the last column
     would also widen `scrollWidth`.
3. **Ignore non-primary mouse buttons** (`pointerType === 'mouse' && button !== 0`).
4. **A single-pointer non-drag alternative (2.5.7).** Tapping or clicking a handle without moving opens a
   small popover anchored to it, positioned with the existing `OverlayController`. The popover contains:
   - **Narrower** and **Wider** step buttons (±10 px, the same step as the keyboard)
   - **Fit to content**
   - **Reset**

   Its buttons have localized names (`mergedLabels`). The keymap is announced on handle focus. A tap is a
   pointerup within the slop distance with no drag. Mouse users get it too, which keeps it framework- and
   pointer-neutral. Double-tap auto-fit is **rejected**: it is not discoverable, and it conflicts with the
   browser's double-tap zoom.

This alternative is not a follow-up: per CLAUDE.md, a gesture without a non-drag path is a release blocker.

### D8 — Scope boundary

The scope is one PR, all five items, and all three frameworks where applicable. Spark removes its two
stopgaps after the release; that removal is tracked in Spark, not here.

## 5. Design

### 5.1 WC — `mp-datatable`

- **Item 1.**
  - `measureColumnWidth` applies the D1 rounding.
  - `_columnWidths` becomes `Map<string, { width: number; source: 'measured' | 'user' | 'explicit' }>`, or a
    parallel `Set` of user-set names, whichever is the smaller diff.
  - The ResizeObserver re-fits measured widths per D2.
- **Item 2.**
  - Add a `columnLabel(col)` helper and a `_derivedLabels: Map<string,string>` filled in `renderHeader`.
  - All 9 sites read the helper.
  - The header text is re-derived on every header render, so a language switch is picked up on the next
    render.
- **Item 3.**
  - Add `resizable?: boolean` to `DatatableColumnDef`, with a doc comment that states the precedence.
  - Add an `isColumnResizable(col)` helper used by the three gates.
- **Item 5.**
  - SCSS: `touch-action`, the hit area, the `::before` line, and the coarse-pointer grip.
  - Pointer handling: the button check, plus tap detection that opens the resize popover.
  - New `mergedLabels` keys: `narrowerColumn`, `widerColumn`, `fitColumn`, `resetColumn`,
    `resizeColumnHint`. The light-tier rules apply: `scopedHtml`, rescoped SCSS, `renderRoot`, and stamping
    before any consumer content.
- **Class comment.** Update it ("6px handle" at DT:230).

### 5.2 Angular

- **`BsDatatableColumnDirective`.**
  - Add `bsDatatableColumnLabel = input<string | undefined>()`.
  - Add `bsDatatableColumnResizable = input<boolean | undefined>(undefined)`.
  - `effectiveColumns` forwards both values only when they are defined.
- **`BsPriorityNavComponent`.**
  - Bind `(click)="onOverflowClick($event)"` on the overflow `<div>`.
  - Restore focus per D6 in that handler and in `onEscape`.

### 5.3 React and Vue

- No wrapper code changes; the column defs pass straight through.
- Add documentation and spec cases for `label` and `resizable`.
- Demos gain a non-resizable actions column.

## 6. Accessibility

- **Separator and labels.**
  - The handle keeps `role="separator"` + `aria-valuenow`. Add `aria-valuemin` (40); there is no
    `aria-valuemax`, because widths are unbounded.
  - Its accessible name uses the D3 label.
  - The keymap ("Arrow keys resize; Enter opens resize options") is announced on first focus through the live
    announcer.
- **Non-resizable column.** The handle is not rendered at all, so nothing focusable is left behind.
- **Resize popover.**
  - Pattern: an APG dialog, non-modal, with a label naming the column.
  - Focus moves into it on open and returns to the handle on close.
  - Escape closes it.
  - Its buttons are real `<button>`s with localized names.
- **Focus ring.** The `:focus-visible` ring on the handle and the popover is declared in the light SCSS.
- **Target size.** At least 24 px everywhere (2.5.8), ~40 px on coarse pointers.
- **Priority-nav.** It stays a disclosure, not a menu. Focus returns to More (D6), and `aria-expanded` updates
  in the same change.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Floor makes columns 1 px narrower and truncates a header by an ellipsis | The surplus is redistributed by fixed layout. S1 compares screenshots |
| Re-fit fights a user resize | Only `measured` widths re-fit, and they stop re-fitting once anything genuinely overflows |
| Derived label picks up sort-arrow or icon text | The sort arrows are `::before`/`::after` (not in `textContent`). Icon fonts with ligature text are covered by the explicit label |
| A 40 px coarse hit area covers most of a narrow column's sort target | Cap at 50 % of the column. S2 measures mis-sorts at border offsets |
| Angular `resizable` default `true` silently overrides the table flag | `undefined` default, pinned by a spec |
| A synthetic `TouchEvent` e2e passes while real touch fails | The regression e2e uses CDP `Input.dispatchTouchEvent`, which goes through compositor gesture arbitration (S2/S5) |

## 8. Spikes

| ID | Question | Method | Decides |
|---|---|---|---|
| S1 | Do floor and fractional widths both give `scrollWidth === clientWidth` across engines and DPRs? | Demo page with the issue's 5 columns + checkbox. Compare ceil / floor / fractional at 1094/1095/1097-wide containers × DPR 1 / 1.25 / 1.5, in Chromium, Firefox and WebKit. Record `scrollWidth - clientWidth` and Σ th rect | D1 |
| S1b | Does overflow come back after a vertical scrollbar appears or the window narrows, and does a proportional re-fit look right? | Virtual mode and paged growth with classic scrollbars (Windows Chromium + Firefox). Narrow the window by 100 px after measuring | D2 |
| S2 | Is the Android failure `touch-action` (pan steals the gesture) or target size? | Playwright Chromium with `devices['Pixel 7']`, CDP `Input.dispatchTouchEvent` drag of +80 px on the handle. Record Δwidth, `pointercancel` and `scrollLeft`. Repeat with `touch-action:none` injected, then at offsets 0–24 px from the border (handle vs mis-sort) | D7.1, D7.2 |
| S3 | Does a handle that overhangs the border get painted over in virtual mode? | `elementFromPoint(border + 6px)` with virtual scroll on | D7.2 (confirms the inside-the-column choice) |
| S4 | Does it work on a real device? | Real Android Chrome via `chrome://inspect`, thumb drag before and after the fix. Log `pointerType`, `pointercancel` and `scrollLeft` | Acceptance for item 5 |

No spike is needed for items 2, 3 and 4; the code fully determines them.

### 8.1 Verdicts (2026-10-07)

The spike pages are `docs/prd/_spike-datatable-rounding.html` and `_spike-datatable-touch-resize.html`,
standalone replicas of the datatable's layout and handle logic, driven by Playwright 1.62.

**S1 — rounding (→ D1: `Math.floor`).** Horizontal overflow right after measuring:

| mode | 1094 / 1095 / 1097 px, fractional containers | 254 px phone |
|---|---|---|
| ceil (before) | 1–3 px in every cell | scrolls |
| floor | 0 | scrolls |
| fractional | 0 | scrolls |

The results were identical in Chromium, Firefox and WebKit at DPR 1, 1.25 and 1.5; DPR has no effect
because layout is in CSS px.

Fractional also passes, but it overflows as soon as the container shrinks by 1 px after measuring.
Floor absorbs that jitter with its ≤N px of slack.

**S1b — re-fit (→ D2: needed).**

- After measuring, a classic vertical scrollbar brings back 13 px of overflow in Chromium and 15 px in
  Firefox. WebKit on Windows only has overlay scrollbars, so it could not be tested.
- Narrowing the window by 100 px gives 98–99 px of overflow.
- A proportional re-fit clears both to 0, and nothing oscillates.

Three pitfalls shaped the implementation:

1. Re-fitting inside the ResizeObserver callback, or in a microtask, reports "ResizeObserver loop completed
   with undelivered notifications" to `window.onerror`. A `requestAnimationFrame` deferral avoids that.
2. Scaling from the previous result ratchets the widths down, because each pass floors again. The re-fit
   therefore always scales from the measured base.
3. Unbounded scaling crushes a desktop table at phone width to 40 px columns, and those still overflow.
   The scale is therefore bounded at **0.75** (`MIN_REFIT_SCALE`). Below that the columns keep 75 % and the
   table scrolls.

   This bound was **decided during implementation, not grilled.** It is continuous: there is no jump back
   to the full widths at the threshold.

**S2 — touch (→ D7.1 and D7.2 confirmed).** The test uses a Pixel 7 emulation with CDP touch input and
drags +80 px:

| variant | Δwidth | pointercancel | Δ scrollLeft |
|---|---|---|---|
| as-is | ±16 | yes, after 2 moves | 65 (the scroller panned) |
| hit area only | ±16 | yes | 65 |
| `touch-action: none` | ±80 | no | 0 |

So the root cause is `touch-action`. The target size is an independent second problem:

- **Today:** a touch landing 12 px or more from the border misses the handle.
- **With the 40 px coarse handle:** touches from 0 to 40 px all land on the handle, with zero mis-sorts.
  Beyond 48 px the touch sorts, as it should.

A tap fires `pointerdown → pointerup → click` with no `pointercancel`. A 1.2 s long-press produces the same
sequence, so a long-press without movement also opens the options dialog. This is accepted: a user who
pressed and held without moving gets the non-drag alternative.

**S3 — overhang (→ the hit area stays inside the column).** In virtual mode a 12 px overhang across the
border is painted over by the neighbouring sticky `th`. `elementFromPoint` returns the next column's sort
button, and a touch there does not resize.

**Found by S2: a dead zone in every sortable header.** The ↑/↓ sort arrows are `::before`/`::after` on the
`th` and paint over the sort button. A click 12–24 px from the right edge therefore hit the `th`, which has
no listener, and did not sort. This affected the mouse too, and is fixed with `pointer-events: none`.

## 9. Testing

- **WC (vitest/jsdom).**
  - **Rounding.** Stub `getBoundingClientRect` (296.43, …) and assert `th.style.width` follows D1.
  - **Re-fit.** Fake a ResizeObserver callback and assert that measured widths re-fit and user widths do not.
  - **Labels.** `columnLabel` precedence: explicit label, then a Node header's text, then name. Cover the
    resize, filter and announcement strings.
  - **Resizable.** Per-column `resizable` in both precedence directions. The keyboard and pointer handlers do
    nothing on a non-resizable column.
  - **Pointer.** Non-primary buttons are ignored. A tap opens the popover; a drag does not.
  - **Popover.** The popover's ARIA, focus and Escape behaviour.
- **Angular.**
  - Directive forwarding of label and resizable, including `undefined`, with a signal-driven host.
  - **Priority-nav.** These close it: a button, `a[href]`. These keep it open:
    - an `aria-haspopup` trigger
    - an `aria-expanded` trigger
    - an input or label
    - padding
    - an `aria-disabled` item
    - a shadow-DOM trigger reached via `composedPath`

    Focus returns to More after an activation and after Escape. The pure `isClosingActivation` gets its own
    spec.
- **React and Vue** conformance behaviour specs: `label` and `resizable` reach the element.
- **e2e (Playwright).**
  - Datatable at 1440×900 asserts `scrollWidth === clientWidth`; at 375×800 it asserts
    `scrollWidth > clientWidth` (ng, react, vue).
  - CDP touch-drag resize (Chromium, S5).
  - Keyboard + popover resize.
  - Priority-nav keyboard activation and focus return.
  - The axe specs stay green.

## 10. Acceptance

- [ ] 1440×900, columns that fit: `.datatable-scroll` has `scrollWidth === clientWidth`, also after
      narrowing the window by 100 px and after a vertical scrollbar appears.
- [ ] 375×800, wider content: the grid still scrolls horizontally.
- [ ] `bsDatatableColumnLabel` sets the label. Without it, the rendered header text is used. Resize, filter,
      panel and announcement strings all use it, in ng, react and vue.
- [ ] A per-column resizable flag removes that column's handle only, with the D4 precedence, in all three
      frameworks.
- [ ] Clicking an action in the priority-nav overflow closes it and returns focus to More. Nested-menu
      triggers and form fields keep it open.
- [ ] On Android Chrome (real device, S4), a thumb drag on the handle resizes the column without scrolling the
      grid. The hit target is ≥ 24 px (≥ ~40 px on coarse pointers), and a tap opens the non-drag resize
      popover.
- [ ] The demo pages in all three frameworks show the label, a non-resizable column and the resize keymap.

## 11. As-built deviations

- **Header-text labels stay live.** A wrapper's header view can change its text in place (an Angular
  language switch) without any property of the element changing. So `mp-datatable` observes `thead` with a
  `MutationObserver` and re-renders when a header's text differs from the name it derived.
  - The observer is gated on that difference. A renderer that returns fresh nodes on every call mutates the
    header on every render, and an ungated observer would loop on it.
- **The handle carries no `aria-haspopup` or `aria-expanded`.** Neither is allowed on `role="separator"`. Enter
  is announced as part of the keymap instead (`resizeColumnHint`).
- **The resize dialog's width readout is an `<output>`.** Its implicit status role is the one channel that
  announces each new width, because the step buttons keep focus.
- **Reset** returns a column to its measured base and lets it rejoin the re-fit.
- **The `isClosingActivation` helper lives in its own file**, `overflow-activation.ts`. `overflow.ts` is
  documented as pure number functions, so the helper does not go there.
- **The priority-nav demo gains an "Actions in the overflow" section.** It holds button items under
  `collapseAt='sm'`, which is the e2e target.
