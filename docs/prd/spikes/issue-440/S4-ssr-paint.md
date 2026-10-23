# S4: SSR paint via container queries (CSS half)

Date: 2026-10-23. Engines: Chromium and Firefox (Playwright MCP). **WebKit not run**: no WebKit
MCP is available, so check it in M9's e2e matrix.

## Setup
A static page with no JS. It contains the three-layer tree from PRD D14:
- `.mp-tile-manager` has `min-inline-size: 16rem`;
- inside it, `.tile-container` has `container-type: inline-size`;
- inside that, `.tile-grid` and four `.tile`s.

There are two breakpoints, authored as the server would emit them:

```css
@container (min-width: calc(2 * 16rem + 1rem)) { .tile-grid[data-mps=tile-manager] { grid-template-columns: repeat(2, minmax(0, 1fr)); } .tile[data-mps=tile-manager][data-tile-id=a] { grid-column: 1 / span 2; grid-row: 1 / span 1; } … }
@container (min-width: calc(4 * 16rem + 3rem)) { … repeat(4, …) … }
```

The page has no `style` attributes anywhere (`querySelectorAll('[style]').length === 0`). A second board sits inside an
`inline-block` (shrink-to-fit) parent.

## Results (identical in both engines)

| Container width | Tracks | Placement |
|---|---|---|
| 390 | 1 | a, b, c, d stacked |
| 527 | 1 | stacked |
| 529 | 2 | a spans 2; b and c side by side; d spans 2 |
| 768 | 2 | same |
| 1071 | 2 | same |
| 1073 | 4 | a spans 2, then b and c on row 1; d spans 4 on row 2 |
| 1280 | 4 | same |

- The board in the shrink-to-fit parent measures **256 px**, which is the 16rem floor, not 0. The
  floor works because it sits on the uncontained board.
- `calc()` with `rem` inside a `@container` condition is exact: the thresholds are 528 px and
  1072 px at a 16 px root size.

## Decides
- **D14's three-layer tree works.** Container rules on `.tile-container` set the descendant grid's
  `grid-template-columns` and every tile's position with no JS. Keeping the floor on the board
  prevents the zero-size collapse.
- **This answers S2's units question:** the SSR rules can keep `calc(n * minColumnWidth + (n−1) * gap)`
  in the consumer's own units (rem included). There is no need to resolve them to px on the server.

## Still open (needs the M5 Angular front)
- Angular SSR plus hydration: no NG0500, no visible reflow, and inline values appearing only after
  the first `measure()`. This is re-run in M5 against the real front.
