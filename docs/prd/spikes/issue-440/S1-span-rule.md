# S1: span rule when projecting down (D6)

Date: 2026-10-23. Chromium (Playwright MCP). The page is a static scratch page with the same
`pack()` semantics as `tile-manager/src/utils/pack.ts`: place tiles in reading order (in place if
they fit, otherwise first fit), then slide them up.

## Setup
The stored layout is a 6-column dashboard (`colStart, rowStart, colSpan×rowSpan`):

| Tile | Position |
|---|---|
| Revenue, Orders, Customers (KPI) | 1,1 / 2,1 / 3,1 · 1×1 |
| Sales per month (chart) | 4,1 · 3×2 |
| Open invoices (datatable) | 1,2 · 3×3 |
| By region (chart) | 4,3 · 2×2 |
| Churn, NPS (KPI) | 6,3 / 6,4 · 1×1 |

It was projected down to 4 columns at 1280 px, 3 at 1000, 2 at 768 and 1 at 390, using two rules:
- **A, edge-scaling:** `s' = round(s·n/6)`, `e' = round(e·n/6)`, `span = max(1, e' − s')`.
- **B, plain cap:** `span = min(colSpan, n)`.

Variant C adds `rowSpan ≤ 2` to rule B at 2 and 1 columns.

## Results

| n | A: edge-scaling | B: plain cap |
|---|---|---|
| 4 @ 1280 | Dense, no holes. Datatable 2×3 (~600 px), sales 2×2, region 1×2 | Datatable and sales stay 3 wide; **1-column holes** beside them and beside region (2×2) |
| 3 @ 1000 | Dense. Datatable 2×3, both charts 1×2 | Sales and datatable full width, region 2×2 next to Churn/NPS. No holes |
| 2 @ 768 | **Datatable 1×3 (~360 px, cramped)**, charts 1×2 | Datatable and charts full width (2), KPIs paired: the usual tablet dashboard |
| 1 @ 390 | identical stack | identical stack |

- **Variant C (rowSpan ≤ 2):** truncates the datatable to 5 visible rows. Every chart is ≤ 2
  already, so it gains nothing. **rowSpan is never capped**: a row is a fixed height (it doesn't
  narrow with the width), so the design-time height stays right at every count.

## Reading
- Edge-scaling wins near the design width: it keeps proportions and leaves no holes.
- The cap wins at tablet width: wide content stays wide, and a datatable is not squeezed to half
  the width.
- At 1 column the two rules are the same.

Projection is only a fallback. Once a user arranges and saves a count, `layouts[n]` replaces it,
and per D5 the narrower counts cascade from it. So the rule mostly affects first contact with a
count nobody has saved yet.

## Decides
- `rowSpan` is kept unchanged when projecting down.
- **The colSpan rule is the plain cap.** The owner chose it on 2026-10-23. It amounts to wrapping:
  widths are kept, and tiles are placed in reading order. A literal `grid-auto-flow` was rejected,
  because it ignores stored positions (which breaks the D5 cascade) and never back-fills holes.
  Edge-scaling stays upward-only (D7).
  Screenshots: `.playwright-mcp/s1-{6col-2560-design,4col-1280,3col-1000,2col-768,1col-390}.jpeg`
  (gitignored, local only).
