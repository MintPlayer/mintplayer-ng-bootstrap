# S1 — selector form across frameworks (issue #432)

Measured 2026-10-14 with the `playwright_node` MCP (Chromium), on the dev demos at branch
`fix/432-card-global-styles`, before any code change: ng `:4200/basic/containers/card` (37 `mp-card`s),
React `:4000/basic/card` (6), Vue `:4100/basic/card` (6).

## Parent chains (element → … → nearest `mp-card`)

| Class | Angular | React | Vue |
|---|---|---|---|
| `.card-header` | `bs-card-header` host carries the class, **direct child** (5/5) | `div`, direct child | `div`, direct child |
| `.card-footer` | `bs-card-footer` host, direct child (3/3) | `div`, direct | `div`, direct |
| `.card-body` | `bs-card-body` host, direct child (34/35); **1 nested**: `bs-card-body ← div.col-md-8 ← div.row.g-0 ← div.container ← bs-container ← bs-grid ← mp-card` (horizontal card) | `div`, direct (6/6) | `div`, direct (6/6) |
| `.card-img-top/-bottom` | `bs-card-img` host direct (5) **and** the inner `<img>` also carries the class (`img ← bs-card-img`); horizontal card: `bs-card-img ← div.col-md-4 ← … ← bs-grid` | `img`, direct | `img`, direct |
| `.card-title` / `.card-text` / `.card-subtitle` | `bs-card-title` etc. `← bs-card-body.card-body`; also `← div.card-img-overlay ← bs-card-img.card-img` and inside the grid | `div ← div.card-body` | `div ← div.card-body` |
| `.card-link` | `a ← bs-card-link ← bs-card-body` | — | — |
| `.list-group` | `ul ← bs-list-group` | — | — |
| `.card-header-tabs` | `ul ← bs-card-header.card-header` | — | — |

So Angular does NOT put an extra element between `mp-card` and the region: the class sits on the
`bs-card-*` wrapper host. `el.matches('mp-card > .card-header')` is **true in all three** for header,
footer and the standard body/img. It is **false** for: the Angular horizontal card's body and image
(inside `bs-grid`), the inner `<img>` of `bs-card-img`, and every typography class (always nested).
`mp-card .X` (descendant) is true everywhere.

## Plain Bootstrap `.card` injected (header/body/title/text/footer)

Rules of `style[data-mp-card]` that match (identical in ng/React/Vue): `.card-header`, `.card-body`,
`.card-footer`, `.card-title`, `.card-text` (+ `.card-text:last-child`) — **both** inside an
`mp-card .card-body` and directly in `document.body`. Today's sheet is fully unscoped.

Computed header (light unless noted):

| | inside mp-card body | in document.body | Bootstrap alone (card sheet disabled) |
|---|---|---|---|
| React/Vue bg | `rgb(248,249,250)` (mp cap-bg token inherited) | `rgba(0,0,0,0.03)` (sheet fallback) | `rgba(33,37,41,0.03)` |
| React/Vue padding | `8px 16px` | `8px 16px` | `8px 16px` |
| Angular bg (dark page) | `rgb(43,48,53)` | `rgba(0,0,0,0.03)` | `transparent`, padding `0` — the ng demo does not ship Bootstrap's card partial globally |

So the leak is real (a foreign `.card-header` anywhere on the page gets the card sheet's background /
borders), and a descendant-anchored rule still captures a plain `.card` nested in an `mp-card` body
(gets mp's cap-bg instead of Bootstrap's).

## Recommendation (D2)

- **Regions `.card-header`, `.card-footer`** → child combinator `mp-card > .card-header`. Direct child
  in all three frameworks; excludes nested foreign cards.
- **`.card-body`, `.card-img`, `.card-img-top/-bottom`** → descendant `mp-card .card-body` …
  (Angular horizontal-card layout puts them inside `bs-grid`; the child form would drop their
  padding / `width:100%` there). Optionally `mp-card > .card-body, mp-card .row .card-body` — not
  worth it; document the descendant choice.
- **Typography / deep (`.card-title`, `.card-subtitle`, `.card-text`, `.card-link`,
  `.card-header-tabs/-pills`, `.card-group`)** → descendant `mp-card .card-title` (never a direct child
  in any framework).
- Accepted residue: a plain Bootstrap `.card` nested inside an `mp-card` body still receives the
  descendant rules (body padding, title/text margins — values equal to Bootstrap's, so harmless),
  but not the header/footer colours once those use the child combinator.
