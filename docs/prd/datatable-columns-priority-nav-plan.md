# Plan — Datatable column fixes + priority-nav close-on-action (#426)

**PRD:** [datatable-columns-priority-nav.md](./datatable-columns-priority-nav.md)
**Status:** Proposed (2026-10-07). It waits on grilling D1–D7, then the spikes.

| Milestone | Scope | PRD |
|---|---|---|
| G | Grill D1–D7 and record the outcomes in the PRD | §4 |
| S | Spikes S1, S1b, S2, S3 (S4 needs a real device and runs with M9) | §8 |
| M1 | WC: rounding (D1) + measured/user width tagging + ResizeObserver re-fit (D2) | §1.1, §5.1 |
| M2 | WC: `columnLabel()` helper + header-text derivation (D3) | §1.2, §5.1 |
| M3 | WC: `resizable` column field + `isColumnResizable()` (D4) | §1.3, §5.1 |
| M4 | WC: touch resize, i.e. `touch-action`, hit area, grip, button check (D7.1–7.3) | §1.5, §5.1 |
| M5 | WC: tap → resize popover (non-drag path, 2.5.7) + keymap announcement + new labels (D7.4) | §6 |
| M6 | Angular: `bsDatatableColumnLabel` / `bsDatatableColumnResizable` inputs | §5.2 |
| M7 | Angular: priority-nav `onOverflowClick` + `isClosingActivation` + focus restore (D5, D6) | §1.4, §5.2 |
| M8 | Demos in ng / react / vue, plus specs: WC, Angular, React/Vue conformance, e2e incl. CDP touch | §9 |
| M9 | Batched sweep: 4 lib builds, unit, e2e (3 apps), axe, S4 on a real Android device | §10 |

## Conventions

- Branch `fix/datatable-columns-426` off `master`. Create it only with permission.
- One PR for everything, including any bugs found on the way.
- Commit per milestone. Verify between milestones with `tsc --noEmit` and by reading the code. **No test
  runs before M9.** The exception is the spikes, which are measurements, not test runs.
- After any `datatable.light.scss` edit, run `npx nx run mintplayer-web-components:codegen-wc`.
- Light-tier rules apply: `scopedHtml('datatable')`, rescoped SCSS, `renderRoot`, and `stampScope` before
  any consumer content. The popover is our own DOM, so it is stamped.
- No backticks inside comments within `html`/`css` tagged templates.

## Spikes (S)

The spike pages are throwaway files under `docs/prd/_spike-datatable-*.html`, or an ad-hoc flag on the ng
demo that is reverted before M1. Results go into PRD §8 as a verdict table, as in `datatable-selection.md`.

- **S1.** Use the 5-column + checkbox table from the issue. Run the ceil / floor / fractional matrix over
  containers × DPR (1 / 1.25 / 1.5) × Chromium, Firefox and WebKit. Record `scrollWidth - clientWidth`.
- **S1b.** Classic scrollbars on Windows. Start in virtual mode, add rows until the vertical scrollbar
  appears, then narrow the window by 100 px. Measure the overflow with and without a prototype re-fit.
- **S2.** Pixel 7 emulation with CDP `Input.dispatchTouchEvent`, dragging the handle +80 px:
  1. as-is
  2. with `touch-action:none` injected
  3. at border offsets of 0, 4, 8, 12, 16 and 24 px, to see whether the touch lands on the handle or sorts

  Record Δwidth, `pointercancel` and `scrollLeft`.
- **S3.** Virtual mode: `elementFromPoint` at border + 6 px. This confirms the decision to keep the hit area
  inside the column.

**If S2 refutes the `touch-action` hypothesis:** stop and re-open D7 with the measured cause before M4.

## M1 — rounding + re-fit

1. `measureColumnWidth` (DT:1260): apply `Math.floor`, or the S1 verdict.
2. Tag widths by source:
   - **measured:** `maybeMeasureInitialColumnWidths`
   - **user:** pointer and keyboard resize (DT:3277-3309)
   - **explicit:** `col.width`
3. In the ResizeObserver callback (DT:1140): while the measured set fit the previous `clientWidth`, scale the
   measured widths proportionally to the new `clientWidth`, flooring each and clamping at 40. Never touch
   user or explicit widths. Request one render.
4. jsdom spec stubs: deferred to M8 (written now if trivial, but not run).

## M2 — labels

1. Add a private `columnLabel(col) = col.label ?? this._derivedLabels.get(col.name) ?? col.name`.
2. In `renderHeader`, when `headerContent` is a `Node` or `DocumentFragment`, store a non-empty
   `textContent.trim()` in `_derivedLabels`. When the column set changes, delete the entries for columns that
   are gone.
3. Replace the 9 `label ?? name` sites (DT:1540, :1590, :1916, :1983, :2003, :2020, :2060, :2082,
   :2163-2169, :2244, :2978). Re-grep before replacing, since line numbers drift after M1.

## M3 — per-column resizable

1. `types/column-def.ts`: add `resizable?: boolean`, with a doc comment that gives the precedence
   `col.resizable ?? table.resizableColumns`.
2. Add `isColumnResizable(col)`, used at DT:2238 (render), :3270 (keyboard) and :3290 (pointer).
3. Leave the measurement code unchanged; non-resizable columns are still pinned.

## M4 — touch resize

1. `datatable.light.scss` `.resize-handle`:
   - `touch-action: none; -webkit-touch-callout: none`
   - `width: 24px`; under `@media (pointer: coarse)`, `width: 40px`; `max-width: 50%`
   - Transparent background. The visible line is a `::before` 2–4 px wide at `right:0`, shown on hover,
     `.active` and `:focus-visible`, and always shown under `pointer: coarse` (the resting grip).
   - A `:focus-visible` outline replacement.
   - Respect `prefers-reduced-motion` (the existing rule at SCSS:652-656).
2. Check that the sort button's 2rem right padding (SCSS:195) still leaves the sort arrows visible. They
   sit in the area the handle now covers, but they only display state.
3. In `onColumnResizeStart`, return early for `pointerType === 'mouse' && button !== 0`.
4. Update the class comment ("6px handle", DT:230).
5. Run `codegen-wc`.

## M5 — non-drag resize path

1. Detect a tap: a pointerup with total movement under the slop distance (reuse the dock or scheduler slop
   constant if one exists, else 4 px) and no width change. Do not open the popover if a drag happened.
2. Add a popover anchored to the handle through `OverlayController`. It is a non-modal dialog whose label
   names the column. Its buttons are Narrower, Wider, Fit to content and Reset.
   - **Fit to content** measures the scrollWidth of the cells in that column.
   - **Reset** removes the user width, so the column becomes measured again.
3. Enter on a focused handle opens the same popover, so the keyboard and pointer paths share one surface.
4. Focus moves into the popover on open and returns to the handle on close; Escape closes it.
5. Add `mergedLabels` keys: `narrowerColumn`, `widerColumn`, `fitColumn`, `resetColumn`,
   `resizeColumnOptions`, `resizeColumnHint`.
6. Announce the keymap once on the first handle focus through the live announcer.
7. Add `aria-valuemin="40"`.

## M6 — Angular datatable inputs

1. `datatable-column.directive.ts`:
   - `bsDatatableColumnLabel = input<string | undefined>()`
   - `bsDatatableColumnResizable = input<boolean | undefined>(undefined)`
2. `effectiveColumns` (`datatable.component.ts:252-327`): spread `label` and `resizable` only when they are
   defined.

## M7 — priority-nav

1. `overflow.ts`: export the pure function `isClosingActivation(path: EventTarget[], panel: Element):
   boolean`, following PRD D5.
2. `priority-nav.component.html:61`: add `(click)="onOverflowClick($event)"`.
3. `onOverflowClick`:
   - Skip unless `button === 0` and `isClosingActivation(event.composedPath(), panel)`.
   - Then set `isMoreOpen` to false.
   - If `document.activeElement` is inside the panel, focus the More button.
4. `onEscape`: apply the same focus restore.
5. Demo (`apps/ng-bootstrap-demo/src/app/pages/advanced/priority-nav/`): add `<button>` action items and a
   nested `bs-dropdown` item. The bare `href="#"` items leave the route, per the anchor memory.

## M8 — demos + specs

- **Demos:**
  - ng `datatables.component.html`: add a `bsDatatableColumnLabel` example, a non-resizable actions column,
    and the keymap text.
  - React `DatatablePage.tsx` and Vue `DatatableView.vue`: the same.
  - Each demo shows the live example before its code snippet.
- **Specs:** the list in PRD §9. Files:
  - WC `datatable/src/components/mp-datatable.{resize,aria,keyboard,filter-aria}.spec.ts`
  - ng `datatable.component.spec.ts` / `datatable-filter.spec.ts` (signal host)
  - ng `priority-nav.component.spec.ts` + `overflow.spec.ts`
  - react and vue `_conformance/behaviour/BsDatatable.spec.*`
  - e2e `apps/{ng,react,vue}-bootstrap-demo-e2e/e2e/datatable-columns.spec.ts`
  - e2e `apps/ng-bootstrap-demo-e2e/e2e/priority-nav.spec.ts`
- **CDP touch e2e:** Chromium-only, using `newCDPSession` + `Input.dispatchTouchEvent`. Never a synthetic
  `new TouchEvent()`, because that bypasses the gesture arbitration and cannot catch a regression.

## M9 — batched sweep

Write logs raw to files and check each exit code; never pipe the only copy.

1. `nx build` for `mintplayer-web-components`, `mintplayer-ng-bootstrap`, `mintplayer-react-bootstrap` and
   `mintplayer-vue-bootstrap`.
2. `nx test` for those libraries (vitest `--pool=threads` if the plugin worker flakes on Windows).
3. e2e: datatable + priority-nav + axe in the three demo apps.
4. **S4, on a real Android device.** Serve the demo on the LAN and use `chrome://inspect`. The maintainer does
   the thumb drag; the logged `pointerType`, `pointercancel` and `scrollLeft` go into the PRD.
5. A keyboard-only walk of the datatable and priority-nav demos via the playwright MCP.
6. Update the PRD Status to Implemented, with an as-built deviations section.
