# PRD: virtual-datatable — fill the container when content is narrower than viewport

**Status:** **Shipped 2026-05-13** — closed out via a CSS + spacer-cell hybrid that sidesteps the proportional-distribution concerns the original options analysis raised. See "Shipped implementation" below for what was actually built and why it differs from the recommended Option A. **Acceptance criteria 1–9 verified in `apps/ng-bootstrap-demo` at `/advanced/datatables` and in `libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.spacer.spec.ts`.**

**Shipped implementation (departure from recommended Option A).** Rather than JS-driven proportional surplus distribution inside `setupColumnWidthSync`, the fix is CSS + DOM-only:

- The table gets `table-layout: fixed; width: max-content; min-width: 100%` (note: `width: 100%; min-width: max-content` was tried first and triggered a layout loop with CDK's `cdk-virtual-scroll-content-wrapper` — `position: absolute; min-width: 100%` — that blew the wrapper to 800,000px wide; the inverted order avoids it).
- A trailing `.bs-datatable-spacer` cell (`aria-hidden="true"`, no explicit width) is appended to every header and body row. Under `table-layout: fixed`, the unsized spacer absorbs any leftover space *without* redistributing it across pinned columns — that's the freeze-semantics-preserving alternative to the proportional surplus algorithm Option A would have computed.
- The bs-table wrapper gets unconditional `overflow-x: auto` in resizable mode so wider-than-host pinned widths scroll inside the table region instead of expanding the body.
- The footer `<td colspan>` was bumped from `numberOfColumns()` to `numberOfColumns() + 1` so the pagination row spans the spacer too.

**Why this beats the original Option A recommendation.** The proportional surplus algorithm Option A would have implemented is now done by the browser's `table-layout: fixed` engine instead — and because only the spacer cell lacks an explicit width, *all* the surplus lands in one place by construction. No per-column rounding-remainder bookkeeping, no `ResizeObserver` for stretch math (CSS handles container reflow automatically), and the `scrollLeft`-preservation concern (Open question #5 / Constraint #3) is moot because no measurement runs on every scroll. The `maxWidths[]` / `setupColumnWidthSync` machinery this PRD's Option A would have augmented is also gone — replaced by the measure-once-then-pin model in `docs/prd/datatable-virtual-merge-and-selection.md`. Regression coverage: `datatable.spacer.spec.ts` asserts the spacer DOM contract on both modes; CHANGELOG entry under `[Unreleased]`.

**Author:** Pieterjan
**Date:** 2026-05-11 (proposal) / 2026-05-13 (shipped)
**Library:** `@mintplayer/ng-bootstrap/virtual-datatable`
**Component:** `<bs-virtual-datatable>`
**Branch context:** follows `feat/aria-accessibility`, after the alignment specificity fix `224cc97b`.
**Related prior commits:**
- `224cc97b` — header/body width-override specificity fix (current behaviour: both tables `max-content`).
- `6a537c19` — column-width bloat fix; introduced `maxWidths[]` accumulator and inline `width: max-content !important` measurement.
- `bb99f0c2` — measure across all visible rows; clear stale `min-width` on every row before measuring.
- `ab7adbc2` — preserve `scrollLeft` around measurement; `reset()` now re-fetches without emitting empty array.
- `55621981` — always re-apply tracked max widths after measurement (was guarded behind a `changed` flag).
- `a2ecdb92` — switch from `table-layout: fixed` to `auto` + JS column-width sync.
**Audit cross-link:** `aria-accessibility-audit.md` row 84 (`virtual-datatable`); current behaviour preserves the existing `aria-rowcount` / `aria-rowindex` work landed in `2283818b`.

---

## 1. Why now

Today both header and body tables size to `width: max-content` and are aligned column-by-column. That is correct when content is wider than the container — the body's `cdk-virtual-scroll-viewport` scrolls horizontally and the header is JS-synced. But on narrow data sets (few short columns inside a wide container), the table now visibly under-fills its container: the rightmost column ends mid-viewport with empty space to its right.

The user's stated preference is the inverse: when natural content widths sum to *less than* the container width, both tables should stretch to 100% (still column-aligned). Only when content overflows should the table fall back to today's `max-content` + horizontal-scroll behaviour. Earlier attempts in this area produced the alignment regression that `224cc97b` just fixed, so the fill behaviour was deliberately not extended in that commit — it is logged here for a follow-up.

## 2. Goal

When the sum of natural column widths is less than the container width, header and body tables both stretch to fill the container, with extra space distributed across columns symmetrically so the two tables stay pixel-aligned. When the sum is greater than the container width, today's behaviour is preserved verbatim: both tables size to `max-content`, the body scrolls horizontally, the header tracks via `setupScrollSync`, and `setupColumnWidthSync` keeps columns aligned and only-grow.

## 3. Constraints (these are the catches earlier attempts hit)

These are not abstract concerns — each one corresponds to a regression that has already been observed and fixed. Any design must explicitly compose with them.

1. **Placeholder rows from unloaded pages.** `VirtualDatatableDataSource` builds the full data array with `undefined` slots so the virtual scroll viewport can reserve correct vertical space (`virtual-datatable-data-source.ts:98–112`). Real rows arrive *after* the column widths have been measured for the first time. `setupColumnWidthSync` solves this by accumulating per-column maxima in a `maxWidths[]` array — columns can grow as new pages load but never shrink mid-session (see commits `6a537c19` and `55621981`; `bb99f0c2` was the failed shrink-allowed variant that bloated columns on scroll). **Any new fill behaviour must reconcile with this:** if today's `maxWidths` says column C is 180px but the new "stretch to fill" math wants to give column C 240px, the stretch math has to win for the *applied* width while still being recomputable when later pages introduce content that pushes the natural width past 240px. Resetting `maxWidths` on every viewport scroll is not allowed — it caused the bloat regression `6a537c19` reverted.

2. **Horizontal scroll must remain functional.** When the natural column widths sum to greater than the container, the body's viewport scrolls horizontally; the header is JS-synced via `setupScrollSync`. This is the entire reason the team moved off `table-layout: fixed` (commit `a2ecdb92`). A naive `width: 100%` rule breaks this: with `table-layout: auto`, `width: 100%` is treated as a *target* — narrower content is stretched, but **wider content is also clamped to 100% and column widths are squeezed to fit**, with no horizontal overflow. The fix has to be conditional on "natural widths fit", not unconditional.

3. **Vertical scrolling must NOT reset horizontal scroll.** Commit `ab7adbc2` saved/restored `scrollLeft` on both the header container and the viewport around the measurement cycle in `setupColumnWidthSync`, because clearing inline `min-width` momentarily shrinks the table and the browser clamps `scrollLeft` to 0. The `MutationObserver` in `setupColumnWidthSync` fires on every CDK virtual-scroll row swap — i.e. on every vertical scroll. So whatever new logic this PRD adds, **it runs once per vertical scroll event** and must preserve `scrollLeft` exactly the way the existing measurement does. This is the catch the user explicitly flagged.

4. **Header and body are two separate `<table>` elements.** The header `<table>` lives inside `<bs-table>` (outside the `cdk-virtual-scroll-viewport`) so it can stay sticky; the body `<table>` is inside the viewport. Their column widths are kept aligned by setting `min-width` on every header `<th>` and on every visible body `<td>` (not just the first row — see `bb99f0c2`'s rationale and `6a537c19`'s "all rows" fix). This is also why the alignment bug `224cc97b` fixed bit only the header: a Bootstrap `width: 100%` rule beat the original specificity-too-low override on `bs-table`'s side but lost on the body's side. **Whatever stretch behaviour ships must apply symmetrically to both `<table>` elements**, or alignment breaks again.

5. **Don't break `aria-rowcount` / `aria-rowindex`.** Just landed in `2283818b`. The `<tr>` carrying `[attr.aria-rowindex]="i + 2"` is exactly the element whose inline `min-width` styles `setupColumnWidthSync` rewrites, but the ARIA contract is on `<tr>` and `<td>` — the rewrite touches `<td>` `min-width`, leaving the `<tr>`'s ARIA attributes alone. That invariant has to hold.

6. **Don't break sorting.** `BsVirtualDatatableComponent extends DatatableSortBase`; sortable headers add `.sort` / `.sort-asc` / `.sort-desc` classes and have keyboard activation per `aria-accessibility-audit.md` row B-27. After a sort, rows are replaced — `setupColumnWidthSync` already handles this (`MutationObserver` on `tbody`), but the new fill math must not interfere with the click target on `<th>` (no inline-styles that change pointer behaviour, no wrapper that swallows the click).

## 4. Design options considered

Three candidates worth comparing. None is obviously correct — the recommendation is option A but options B and C bring real trade-offs and should not be dismissed without code-level prototyping.

### Option A — JS-driven conditional stretch in `setupColumnWidthSync`

Inside the existing measurement cycle, after measuring natural widths into `maxWidths[]`, also compute `naturalSum = sum(maxWidths)` and compare to the container's `clientWidth`. Then:

- If `naturalSum >= containerWidth`: behave exactly as today. Apply `min-width: maxWidths[i]px` to every `<th>` and `<td>`. Tables stay at `width: max-content`, body scrolls horizontally.
- If `naturalSum < containerWidth`: distribute the surplus `containerWidth - naturalSum` proportionally across columns, computing `appliedWidths[i] = maxWidths[i] + (maxWidths[i] / naturalSum) * surplus` (or any deterministic formula). Apply `min-width: appliedWidths[i]px` to both `<th>` and every visible `<td>`. Set both `<table>` elements to `width: 100%` (or leave at `max-content` — they will already span the container because the per-column `min-width` totals add up to it).

**Pros.** Composes cleanly with `maxWidths[]`: the accumulator still tracks natural per-column maxima; only the *applied* widths are stretched. When a fresh page arrives and a natural width exceeds the previous applied width, the next measurement pass naturally promotes it (the column grows, surplus shrinks, other columns lose some surplus). Stays in one method — easy to reason about and test. Already running outside Angular's zone via the existing `MutationObserver`.

**Cons.** More math in `setupColumnWidthSync`; needs care around `scrollLeft` preservation (which is why constraint #3 is called out). The proportional algorithm has to be deterministic and identical for both tables, or alignment breaks. The `containerWidth` is itself a measurement and must be read at a stable moment (before clearing widths to measure naturals — otherwise the container can momentarily shrink with the table).

**Risks.** If the proportional surplus distribution drifts by sub-pixel between header and body (because `min-width` accepts fractional pixels but the rendered cell widths round differently), alignment could be off by 1 px. Mitigation: round each column's applied width to integer pixels and compute the last column as `containerWidth - sum(prevColumns)` so rounding errors land in one place.

### Option B — CSS flex wrapper, let the browser solve stretch

Wrap each `<table>` in a `display: flex; flex: 1` parent and let CSS solve the "narrower than container ⇒ stretch" case naturally. Keep `table-layout: auto`. The `setupColumnWidthSync` machinery still runs to keep header and body column widths aligned via `min-width` on each cell.

**Pros.** Stretch-when-narrower is free — no JS math, no per-column distribution algorithm. The browser already does the right thing for a single `<table>` inside a flex parent.

**Cons.** Harder to keep header and body in sync **without** measurement: the two tables are in different flex parents (header in `<bs-table>`, body in `<cdk-virtual-scroll-viewport>`), and even if both stretch to fill, they will distribute extra space differently the moment one column has a longer content string than the other. So measurement is still needed — and once it's needed, the stretch case has to be coordinated by JS anyway, which collapses option B back into option A.

**Risks.** Looks attractive but probably doesn't actually save any code; the CSS-only stretch only "works" for a single isolated table.

### Option C — CSS-only `min-width: 100%` on both tables

Add `min-width: 100%` to both `<table>` elements alongside `table-layout: auto`. The browser then takes `max(natural-content-width, container-width)` for the table's overall width: when content is narrower the table stretches, when wider the table overflows.

**Pros.** Zero new JS. Smallest possible diff. CSS-only behaviour also means it composes with browser zoom and font-size changes without re-running measurement.

**Cons.** Suspect interaction with the per-column `min-width` accumulator: when the table is forced to `min-width: 100%` but each `<td>` carries a `min-width` from `setupColumnWidthSync`, browsers must distribute the surplus `(table width - sum of cell min-widths)` across columns somehow, and that distribution is `table-layout: auto`'s heuristic — i.e. the same heuristic that produced the original `width: 100%` bug `6a537c19` worked around. Header and body could redistribute the surplus differently if their content distributions differ (e.g. body has a wider data row in column 2 than the placeholder rows the header was measured against), reproducing the exact misalignment the team has spent four commits eliminating.

**Risks.** Could pass on the demo data set and silently break on a real-world data set with one wide column. Needs an explicit Playwright smoke test on multiple width regimes before being trusted.

### Recommendation

**Option A.** It composes cleanly with the `maxWidths[]` accumulator (constraint #1), it keeps both tables in sync by *applying the same widths* via JS (constraint #4), and it lets us preserve `scrollLeft` with the same save/restore pattern already in `setupColumnWidthSync` (constraint #3). Options B and C either devolve into A or risk re-opening the alignment regression.

The one hard new piece is the proportional distribution algorithm — that should land with explicit tests on at least three regimes:
1. Natural sum << container (stretch with surplus).
2. Natural sum ≈ container ± a few pixels (boundary).
3. Natural sum >> container (fall back to today's behaviour).

## 5. Open questions

The implementer of this PRD should resolve at least the following before coding.

1. **Where does the proportional-stretch math live?** Inline inside `syncWidths` (one more block at the bottom), or extracted into a pure helper `distributeSurplus(naturalWidths: number[], containerWidth: number): number[]` that can be unit-tested without a DOM? The pure-helper option is preferable for testability but adds a file. Choose based on whether the inline version stays under ~20 LoC.

2. ~~**Opt-in input or always on?**~~ **Resolved 2026-05-11.** Always on. No new input. Backward-compat is not a constraint here — see `feedback_breaking_changes_ok`. Existing consumers running into the under-fill look will get the new stretch behaviour for free.

3. **Interaction with `isResponsive()`.** When `isResponsive()` is true the body table gets `.nowrap` (no text wrapping), which means natural content widths can be very large and the "natural sum < container" case is rarer. When `isResponsive()` is false, content can wrap, and natural widths are bounded by the wrap point of the longest cell. Does the stretch logic behave the same in both regimes, or do we want different rules (e.g. only stretch when not responsive)? Probably the same logic works; flag this for explicit verification.

4. **Surplus distribution policy.** Proportional to natural width (wider columns get more surplus), uniform per column (every column gets the same delta), or weighted by an explicit hint? Proportional is the obvious default and matches what `table-layout: auto` would do unconstrained. Document the chosen policy in code comments per the *comments capture what code can't* principle.

5. ~~**`ResizeObserver` for container width changes.**~~ **Resolved 2026-05-11.** Yes — add a `ResizeObserver` on `.virtual-datatable-container` so window/flex-parent reflows re-run the stretch math. Coalesce with the existing `MutationObserver` path via `requestAnimationFrame` so we never measure twice in the same frame; both observers should funnel into a single `scheduleSync()` helper.

6. ~~**Sub-pixel rounding.**~~ **Resolved 2026-05-11.** The distribution policy must be deterministic: identical inputs must produce identical applied widths, and **header column widths must always equal body column widths to the pixel**, even as `maxWidths[]` grows during vertical scroll (e.g. when a fresh page loads a longer cell value and column 2's natural width grows from 148 to 162 mid-session, the next sync must re-apply identical 162-px-derived integer widths to both header and body cells in the same frame). Implementation: floor each column's stretched width to an integer, then add the accumulated rounding remainder to the **last** column so total width hits `containerWidth` exactly. The same rounding routine runs for both tables from the same source `appliedWidths[]` array — there is no separate header-vs-body math path.

## 6. Acceptance criteria

A reviewer running the demo at `/advanced/datatables` (and any narrow-data variant) must confirm:

1. With a data set whose natural column widths sum to less than the container, the body and header tables both span 100% of the container width. The rightmost column's right edge meets the container's right edge to the pixel.
2. With a data set whose natural column widths exceed the container, today's behaviour is preserved: tables sit at `max-content`, body scrolls horizontally, header tracks via `setupScrollSync`. No regression versus `224cc97b`.
3. **Vertical scrolling does not reset horizontal scroll** (constraint #3). Steps: scroll horizontally to mid-table, then scroll vertically several pages — header and body must remain at the same `scrollLeft` they had before the vertical scroll.
4. **Horizontal scroll still works when content overflows** (constraint #2). Drag the body horizontally, header tracks; drag the header (if its scrollbar is visible per `60e0625d`'s gutter logic), body tracks.
5. **No alignment drift between header and body**, in either regime, through one full session of scrolling, sorting, and `dataSource.reset()`.
6. **Column widths only grow** when new pages load real content (constraint #1 — `maxWidths[]` accumulator semantics preserved). Specifically: if page 1 produces narrow placeholders and the table stretches them, then page 2 loads with longer content that exceeds the stretched widths, columns grow to accommodate (no truncation). If page 2 content is shorter than the stretched widths, columns do **not** shrink mid-session.
7. `aria-rowcount` and `aria-rowindex` attributes from `2283818b` remain on `<tr>` and unchanged.
8. Sortable headers from `DatatableSortBase` still respond to click and to keyboard activation; sort indicator classes and the `sort-priority` badge render correctly across both regimes.
9. Existing unit tests in `libs/mintplayer-ng-bootstrap/virtual-datatable/` still pass. New Playwright e2e at minimum covers: narrow regime → assert width parity; wide regime → assert horizontal scroll parity; vertical scroll preserves `scrollLeft`.

## 7. Non-goals

- Reordering or resizing columns interactively. Out of scope.
- Changing the sort UI — the existing `DatatableSortBase` flow is untouched.
- Changing `pageSize` or virtual-scroll buffer / item-size strategy.
- Changing `<bs-table>` (the non-virtual sibling). Stretch behaviour for the regular datatable is a separate concern and not part of this PRD.
- Replacing `table-layout: auto` with `fixed` again (commit `a2ecdb92` already ruled this out — fixed layout cannot size to content).
- Removing `setupColumnWidthSync` in favour of a CSS-only solution. Option C above documents why that's risky; option A keeps the measurement machinery and only adds to it.
- Touching the `scrollbar-gutter: stable` rule from `60e0625d` or the header's `overflow-x: hidden` rule.

## 8. Related files

- `libs/mintplayer-ng-bootstrap/virtual-datatable/src/virtual-datatable/virtual-datatable.component.ts` — `setupColumnWidthSync` (lines 88–190) is the primary edit site. `setupScrollSync` (lines 56–86) is unchanged but cited because the new logic must coexist with it.
- `libs/mintplayer-ng-bootstrap/virtual-datatable/src/virtual-datatable/virtual-datatable.component.html` — structural; no changes anticipated unless an opt-in input is added.
- `libs/mintplayer-ng-bootstrap/virtual-datatable/src/virtual-datatable/virtual-datatable.component.scss` — the override block on `.virtual-datatable-container ... table` (lines 30–34) may swap from `width: max-content` to a conditional class, depending on which option is implemented.
- `libs/mintplayer-ng-bootstrap/virtual-datatable/src/virtual-datatable-data-source.ts` — read-only reference; explains why placeholders exist (constraint #1).
- `libs/mintplayer-ng-bootstrap/table/src/component/table.component.html` and `libs/mintplayer-ng-bootstrap/table/src/table-styles/table-styles.component.scss` — the source of Bootstrap's `.table { width: 100% }` rule that 224cc97b had to overpower.
- `apps/ng-bootstrap-demo/src/app/pages/advanced/datatables/` — verification surface.
- `docs/prd/aria-accessibility-audit.md` row 84 + row B-27 — ARIA contract that the implementation must not break.
