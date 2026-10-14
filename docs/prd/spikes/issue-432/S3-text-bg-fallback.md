# S3 — `.text-bg-*` without the card's copy (issue #432)

Measured 2026-10-14, `playwright_node` MCP (Chromium), dev demos, no files edited: the card sheet's
11 `text-bg-*` rules (8 theme colours + body/white/transparent) were removed at runtime with
`sheet.deleteRule` on `style[data-mp-card]`. Dark mode via the `bs-theme-mode` cookie (server renders
`<html data-bs-theme>`; confirmed `data-bs-theme` = light/dark).

## The bug, as the CSSOM sees it

`.text-bg-dark { color: rgb(255,255,255) !important; background-color: RGBA(#212529, var(--bs-bg-opacity, 1)) !important; }`

Because of the `var()`, the declaration parses (no parse-time rejection), then is
invalid-at-computed-value-time → `background-color` becomes `transparent`. Being `!important`, it
also beats Bootstrap's own `.text-bg-*` and the card sheet's cap background.

## Measurements (bg / fg)

Angular — real demo card "Header / footer colours independent of the root":

| | before (card copy present) | after deletion |
|---|---|---|
| light, header `text-bg-dark` | `transparent` / `#fff` (white on white) | `rgb(33,37,41)` / `#fff` |
| light, footer `text-bg-success` | `transparent` / `#fff` | `rgb(25,135,84)` / `#fff` |
| dark, header | `transparent` / `#fff` | `rgb(33,37,41)` / `#fff` |
| dark, footer | `transparent` / `#fff` | `rgb(25,135,84)` / `#fff` |
| `.text-bg-warning` div in a card body | `transparent` / `#000` | `rgb(255,193,7)` / `#000` (both modes) |

React — no header/footer colour sample on the page, so the wrapper's `applyColor` was emulated by
adding `text-bg-dark` / `text-bg-success` to the existing header/footer: identical results (before
`transparent`, after `rgb(33,37,41)` / `rgb(25,135,84)`, light and dark). The React footer's fg
after deletion was `rgba(33,37,41,.75)` light / `rgba(222,226,230,.75)` dark only because that demo
footer also carries `text-body-secondary`, which Bootstrap emits later — demo artefact, not a
regression. Vue page has the same shape as React (S1) and loads the same global CSS.

Screenshots (not committed): scratchpad `s3-ng-light-before.png` / `s3-ng-light-after.png`.

## Does each demo load Bootstrap's `.text-bg-*` globally?

Yes — a `.text-bg-warning` rule exists in a stylesheet other than the card sheet in **ng, React and
Vue** (Angular via `libs/mintplayer-ng-bootstrap/_bootstrap.scss` → helpers).

## WC-only consumer without Bootstrap

- `@mintplayer/web-components` `peerDependencies`: `lit`, `@lit/context`, `highlight.js` only.
  Bootstrap CSS is **not** a declared peer and the WC README does not state it as a requirement.
- Simulated in the React page by disabling every stylesheet except the card sheet (scratch HTML from
  dist skipped — bare `lit` specifiers need a bundler; the simulation answers the same question):
  header `text-bg-dark`: **with** card copy `transparent / #fff` (invisible text); **without**
  `rgba(0,0,0,.03) / rgb(33,37,41)` (the plain cap style, readable).
- Root-level card colour (`<mp-card color=…>`) does not use `text-bg-*` at all — it is
  `:host([color=…])` in the shadow SCSS — so it is unaffected either way.

## Recommendation (D3)

**No card-anchored fallback.** The copy never worked (bg always `transparent`) and actively breaks
the Bootstrap utility it shadows; deleting it fixes all three demos in both modes. In a no-Bootstrap
page, deletion degrades from "white text on nothing" to "plain cap header" — strictly better.
Header/footer colour without Bootstrap was never a working feature, so removing it is a fix, not a
break; document that `text-bg-*` on regions requires Bootstrap's utilities (a patch-level bump is
justified for this part).
