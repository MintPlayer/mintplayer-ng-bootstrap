# S4 — published tarball (issue #432)

Date: 2026-10-14. `npm pack @mintplayer/web-components@2.19.0` into a fresh empty scratchpad dir,
extracted with `tar` into a further empty subdir. Nothing from it was executed; it was only grepped.

## `card/index.mjs`

- `RGBA(#`: **8 occurrences**, one per `$theme-colors` entry. Sample (line 216):
  `background-color: RGBA(#0d6efd, var(--bs-bg-opacity, 1)) !important;`
  This is invalid CSS: `rgba()` does not take a hex colour plus an alpha. The declaration is
  dropped, so `.text-bg-*` loses its background page-wide while the `!important` `color` (white)
  still applies.
- The private writer ships as built (lines 293-294):
  `document.createElement("style")` with `setAttribute("data-mp-card", "")` and
  `document.head.appendChild(r)`.

## `chunks/install-light-styles-*.mjs`

- **Exists** in the published package: `chunks/install-light-styles-DbCAGFOC.mjs`. It is absent
  from a local build.
- `text-bg`: 0. `RGBA(#`: 0. `document.head`: 3, all from the installer itself: the SSR guard,
  the SSR-copy `querySelector`, and the `<style>`-fallback `appendChild`.
- Imported by `chunks/mp-datatable-*.mjs`, `chunks/mp-treeview-*.mjs`, `file-manager`,
  `light-dom`, `query-builder` and `tree-select`. **Not** by `card`.
- So the installer is clean, and the bad CSS reaches the page only through card's own writer.

## Every document-level writer in the published build

| Pattern | Files |
|---|---|
| `RGBA(#` | `card/index.mjs` only |
| `createElement("style")` | `card/index.mjs`, `chunks/install-light-styles-DbCAGFOC.mjs` |
| `document.head.append*` | `card/index.mjs`, `chunks/install-light-styles-DbCAGFOC.mjs` |
| `document.adoptedStyleSheets =` | `chunks/install-light-styles-DbCAGFOC.mjs` |
| `insertRule` | none |

Other `document.head` mentions are not writers. `chunks/color-mode-warning-*.mjs` uses it only
as a guard (`!document.head`); `custom-elements.json` and `card/src/mp-card.element.d.ts` are
doc text.

**Answer to the issue's third question:** in what Spark installed (2.19.0) there are exactly two
document-level writers. One is the shared installer, which is clean. The other is
`mp-card`'s private `ensureCardStylesInjected`, the sole source of the unscoped
`.card-*`/`.text-bg-*` rules and of every `RGBA(#…)`.
