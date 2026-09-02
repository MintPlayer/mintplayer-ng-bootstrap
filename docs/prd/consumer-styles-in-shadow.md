# PRD — Consumer styles inside web-component shadow roots: `adoptedStyleSheets` vs the light-DOM branch

Status: **Decided — O3** (2026-09-02). D0 (§6) resolved in favour of the light-DOM branch
`feat/light-dom-emulated-encapsulation`, which this document now lives on; O1 is rejected on the
measurements in §3, O2 is recorded as the shadow-preserving fallback and its plan is not executed.
§9 records the live verification of the branch and the defect it surfaced.
Plan: [consumer-styles-in-shadow-plan.md](./consumer-styles-in-shadow-plan.md)
Evidence: [spikes/consumer-styles-in-shadow/](./spikes/consumer-styles-in-shadow/README.md) — a live
Playwright repro against coverage.mintplayer.com and a three-engine `adoptedStyleSheets` spike
(Chromium 151, Firefox 153, WebKit 26.5), both run 2026-09-02 by a three-agent investigation
(live repro / repo + branch archaeology / measured spike).
Related: issue **#408** (open), `feat/wc-style-encapsulation` (2026-08-25, unpushed),
**`feat/light-dom-emulated-encapsulation`** (2026-08-30, pushed, implemented and verified — its PRD
is `docs/prd/shadow-adopted-content-styling.md` on that branch), `feat/badge-web-component`
(row-slots spike), the Eisenberg article
[Debunking Web Component Myths and Misconceptions](https://eisenbergeffect.medium.com/debunking-web-component-myths-and-misconceptions-ea9bb13daf61).

## 0. Summary for the impatient

1. **The live bug is confirmed and precisely explained** (§1). The `(i)` icon in the datatable header
   is the same Angular component, with the same markup, as the one in the tab-control. The
   tab-control's copy stays in the document tree (slotted); the datatable's copy is physically
   moved into `mp-datatable`'s shadow root by the header render-callback. Every rule it needs
   (`.bi-info-circle::before`, `.btn-link`, the `[_ngcontent-…]` trigger styles) still *matches*
   by selector but lives in document sheets, so none *applies*. Even the font-family falls back
   to Arial.
2. **The proposal as stated — every WC adopts a shared constructed sheet compiled from
   `_bootstrap.scss` — does not fix that bug.** The compiled subset contains no bootstrap-icons
   rules, no Angular emulated-encapsulation rules and none of the consumer's `styles.scss`. It would
   fix Bootstrap *utilities* inside shadow roots (the first half of #408) and nothing else. It also
   carries four measured traps (§3.2): `:root` never matches inside a shadow root, `@font-face` in
   an adopted sheet is ignored by Chromium and Firefox, the "subset" is 84 % of full Bootstrap and
   currently imports an Angular CDK file, and it cannot be expressed in Declarative Shadow DOM.
3. **The article's claim is true but narrower than it reads.** "Create sheets from
   `document.styleSheets` and use them in your Shadow DOM" works for same-origin sheets at one
   instant. Measured: it throws on cross-origin `<link>`s, misses sheets appended later unless a
   `MutationObserver` re-mirrors, is blind to `insertRule()`, and the article itself concedes
   `@font-face` cannot live in a shadow root.
4. **Two options actually fix the bug** (§4): **O2** keep shadow DOM and mirror the *document's*
   stylesheets into the four consumer-DOM-adopting components (the article's approach, done
   properly); **O3** the already-built `feat/light-dom-emulated-encapsulation` branch, which
   renders those components in the light DOM with emulated scoping so the problem does not arise.
   §5 compares them; §6 is the decision.

## 1. Problem — measured on the live site

Page: https://coverage.mintplayer.com/po/account/Accounts%2F48772716 (public, HTTP 200, no login).
Probe: `spikes/consumer-styles-in-shadow/live-repro.probe.mjs`.

Both icons are one Angular component from `@mintplayer/ng-spark`,
`spark-attribute-description`, emitting identical markup with the identical
`_ngcontent-ng-c1363157765` marker:

```html
<button class="btn btn-link p-0 ms-1 align-baseline spark-attribute-description-trigger" aria-label="…">
  <spark-icon name="info-circle"><i class="bi bi-info-circle"></i></spark-icon>
</button>
```

| | tab-control instance | datatable-header instance |
|---|---|---|
| composed path | `bs-tab-control > mp-tab-control > bs-tab-page[slot=…-content] > … > dt > spark-attribute-description` | `bs-datatable > mp-datatable > #shadow-root > … > th > button.header-cell > span > div > spark-attribute-description` |
| `getRootNode()` | `document` | `ShadowRoot(mp-datatable)` |
| `assignedSlot` | ancestor `bs-tab-page` is slotted | `null` — moved, not slotted; `mp-datatable` has **zero** light-DOM children |
| `<i>` `::before` content / font | `""` / `bootstrap-icons` | `none` / **Arial** (UA default — even Bootstrap's reboot font is gone) |
| `<i>` box | 14 × 21 px | **0 × 0 px** |
| matching rules | `.bi::before`, `.bi-info-circle::before`, `.btn`, `.btn-link`, `.p-0`, `.ms-1` (app bundle `styles-*.css`) + `.spark-attribute-description-trigger[_ngcontent-ng-c1363157765]` (Angular `<style>`) | **same rules match by selector, none applies** — all live in document sheets |
| shadow root's own sheets | 1 adopted (tab-control chrome) | 1 adopted (46 rules, datatable chrome, `styleSheets.length = 0`) |

Mechanism in this repo (unchanged on `master`):
`libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts:184-203` creates an
`EmbeddedViewRef` per header `ng-template` and returns `rootNodes` from `headerRenderer`;
`libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts:892` interpolates that
Node into the shadow `<th>`. Rows take the same path (`datatable.component.ts:355-372`,
`mp-datatable.ts:1002-1030`), so every `*bsRowTemplate` cell in Spark (chips, swatches, progress
bars, `class="text-nowrap"`) is equally unstyled. `mp-tab-control` never receives its content: the
wrapper leaves children in light DOM with `slot` attributes and the shadow renders only
`<slot name="…">` (`mp-tab-control.ts:188, 219`).

Where the failing CSS comes from (Spark / Coverage): the header template is
`MintPlayer.Spark/libs/node_packages/ng-spark/grid/src/spark-query-grid.component.html:43-46`; the
icon font is bundled from `bootstrap-icons/font/bootstrap-icons.css` via Coverage's `angular.json`
into the document-level `styles-*.css`; the trigger styles are emulated-encapsulation `styles` in
`ng-spark/attribute-description/src/spark-attribute-description.component.ts:38-57`.

### 1.1 Which components have this shape

| WC | mechanism | consumer DOM inside shadow? |
|---|---|---|
| `mp-datatable` | `cellRenderer` / `headerRenderer` / `rowRenderer` → `Node` | **yes** |
| `mp-treeview` | `TreeNodeRenderer => Node`, `iconResolver` via `unsafeHTML` | **yes** |
| `mp-tree-select` | `NodeTemplate` / `ValueTemplate` / `PanelTemplate => Node` | **yes** |
| `mp-query-condition` | `EditorFactory` → `mount.appendChild()` | **yes** |
| `mp-file-manager` | nests datatable/treeview in its own shadow | nesting host only |
| `mp-select` | option renderer returns text | text only |
| tab-control, dock, carousel, splitter, accordion, navbar, shell, ribbon, card, timeline | named slots | slotted — page CSS reaches them |

`OverlayController` never reparents to `document.body` (it positions the host-owned panel
`fixed`; body is only touched for scroll-blocking), so overlays are *not* an extra case.

## 2. Goals and non-goals

Goals:

- G1 — Consumer content mounted by the four components above receives **all** the CSS it would
  receive in the document: Bootstrap utilities/reboot/buttons, the consumer app's global styles
  (icon fonts included) and Angular emulated-encapsulation component styles.
- G2 — Component styles never leak **out** into the page (the user's original fear about light
  DOM). Leak-**in** of page CSS into component internals is accepted and desired (user, 2026-08-30
  and 2026-09-02).
- G3 — No new third-party dependency. Shared machinery lives in `libs/mintplayer-web-components`
  and is framework-agnostic; all three wrappers behave the same.
- G4 — No regression to the five DSD/no-JS components (accordion, carousel, dropdown-menu, navbar,
  shell), which do not adopt consumer DOM and are out of scope for the fix itself.

Non-goals: making `_bootstrap.scss` itself a published CSS artifact (it is exported as SCSS source
and `@forward`ed by consumers — README §Getting started); restyling component chrome to match
Bootstrap partials (that is `feat/wc-style-encapsulation` Tier S, a separate concern); waiting for
`open-stylable` / declarative `adoptedstylesheets` (no spec text or Intent as of 2026-08).

## 3. The proposal under test: "every WC adopts the compiled `_bootstrap.scss`" (O1)

### 3.1 What it would and would not deliver

Measured (spike S1): once the compiled subset is adopted into a shadow root that already sits in a
Bootstrap-loaded document, `.btn`, `.text-bg-danger`, reboot `p`/`h1` and `.text-primary` all
apply inside the shadow, in all three engines. That is exactly the first table in #408 (utilities)
fixed. **Nothing else changes**: the `[_ngcontent-x]` rule from a document `<style>` still does not
apply (spike S1), the bootstrap-icons class rules are not in the sheet, and the app's
`styles.scss` is not in the sheet. The live icon stays 0 × 0 px. Spark's cell renderers stay
unstyled. So O1 alone fails G1 for the very case that motivated it.

### 3.2 Measured traps (spike, three engines unless stated)

| # | trap | measurement | consequence |
|---|---|---|---|
| T1 | `:root` never matches inside a shadow root | S2: adopted-only, no document Bootstrap → `--bs-*` empty, `.text-primary` black, `.btn-primary` **transparent background, white text, radius 0**. S2b: textual `:root`→`:host` rewrite fixes it. `html{}`/`body{}` match nothing. | Either rewrite `:root`→`:host` in the shipped sheet, or make "the consumer must load Bootstrap globally" a hard requirement (true for every current consumer — variables then inherit across the boundary, S0). |
| T2 | `@font-face` in an adopted sheet is **ignored by Chromium and Firefox** (WebKit loads it) | S1 font-face matrix: adopted-only → tofu, `document.fonts` empty. Document-level or runtime-injected `<style>` in `head` works everywhere. | Icon fonts can never be delivered through a shadow sheet. Any design must leave `@font-face` in the document. |
| T3 | The "subset" is 84 % of full Bootstrap | 231,482 B raw / 27.2 KB gzip / 11.2 KB brotli (full: 276,927 B). It imports `bootstrap-utilities` **and** repeats `utilities/api` (every `.d-flex` emitted twice, two `:root` blocks), imports `@angular/cdk/a11y-prebuilt` (Angular-only, cannot ship in a framework-agnostic WC sheet), and has **no `.badge`** (module commented out). | A WC-shipped sheet needs its own SCSS entry (dedupe, drop CDK) and roughly doubles the published `@mintplayer/web-components` CSS payload. Parse cost is paid once if the `CSSStyleSheet` object is shared (S3: 6–9 ms). |
| T4 | Not expressible in Declarative Shadow DOM | MDN / Edge explainer / WICG #939: proposal only. S6: a `<link rel=stylesheet>` *inside* `<template shadowrootmode>` works in all three engines and is fetched once for many roots (51 B per instance); inlining costs 231 KB per instance and gzip cannot dedupe across instances (×3 = 81 KB gzip). | Irrelevant for the four affected components (none has an SSR path; `BsDatatable` skips server rendering). Relevant only if the five DSD components ever adopted it. |
| T5 | Cascade position | S4: adopted sheets sort after shadow `<style>` and win ties; among adopted sheets the last wins. Lit's `static styles` are adopted too, so **order in the array decides** whether Bootstrap or the component wins ties. **Chromium does not restyle on a pure reorder of the array** (clear, then reassign). Bootstrap's `!important` utilities beat component styles regardless of order. | Compose the array once, Bootstrap **before** the component's own styles, so chrome rules win ties. |
| T6 | Slotted content is unaffected | S5: an adopted `.btn` never reaches a slotted light-DOM child; the document sheet does. No leak-out to the document. | A slotted header and a moved header would be styled from two different sources. |

Verdict on O1: **rejected as the fix**. It is a partial answer to #408 that misses the reported
defect and every Spark renderer. Its one durable idea — a shared `CSSStyleSheet` object adopted by
many roots — is reused by O2.

## 4. Options that fix the bug

### 4.1 O2 — keep shadow DOM; mirror the document's stylesheets into the four components

The article's approach, made complete:

- A framework-agnostic module `libs/mintplayer-web-components/document-styles/` owns **one**
  mirror per document: for each `document.styleSheets[i]` with readable `cssRules`, one
  constructed `CSSStyleSheet` (rules flattened — `CSSImportRule` is not allowed in constructed
  sheets, so recurse into `rule.styleSheet.cssRules`; `@font-face` rules are dropped, they are
  inert in a shadow root and the document copy keeps working). Cached in a `WeakMap` keyed by the
  source sheet, so the parse cost is paid once per document sheet, not per shadow root.
- A `MutationObserver` on `document.head` and `document.body` (`childList`, `subtree`,
  `characterData`) plus a `load` listener on late `<link>`s picks up Angular's emulated
  `<style>` tags as they are appended, swapped and removed on route changes. Blind spot,
  documented: `CSSStyleSheet.insertRule()` on an existing sheet. Angular does not use it; a
  consumer that does can call `refresh()` explicitly.
- Cross-origin `<link>`s throw `SecurityError` on `cssRules` (measured, all engines). Documented
  consumer guidance: serve Bootstrap from the app bundle (every current consumer does) or add
  `crossorigin` + CORS headers.
- The four components call `adoptDocumentStyles(this.renderRoot)` in `connectedCallback` and
  dispose in `disconnectedCallback`, behind an `isolate-styles` opt-out attribute (same shape as
  M4 on the two 2026-08 branches, whose `adoptLightStyles` registry already implements 80 % of
  the plumbing — reuse it, generalise the source from "registered sheets" to "document sheets").
- Array composition: `[...mirroredDocumentSheets, ...litStyles]` set once via a
  `createRenderRoot` override, so the component's chrome wins ties (T5). Later mirror updates
  rebuild the array (never reorder in place — Chromium).
- Also ships the #408 option 2 API: `styleSheets: CSSStyleSheet[]` property appended after the
  mirror, for consumers who want to hand in a specific sheet instead of the whole document.

Cost measured (S3, full Bootstrap ≈ 277 KB, shared sheet objects): 1 / 50 / 500 shadow roots =
Chromium 8.6 / 10.9 / 80 ms, Firefox 6 / 12 / 46 ms, WebKit 16 / 11 / 51 ms. Per-root
construction instead would be 35–80× slower at 500 roots — sharing is mandatory. Memory cannot be
measured from JS (CSSOM is off-heap); all three engines dedupe identical sheet text internally.

What O2 does to G2: perfect — component CSS stays inside the shadow root. What it does to
encapsulation *inward*: every page rule now also applies to the component's own chrome (Bootstrap
reboot `table`/`th`/`button`, the app's global `styles.scss`). The user has declared this desired;
spike S-O2.3 in the plan screenshots the datatable/treeview/tree-select/query-builder demo pages
with and without the mirror to catch chrome regressions before they ship.

### 4.2 O3 — `feat/light-dom-emulated-encapsulation` (built 2026-08-30, verified, unmerged)

The six consumer-DOM-adopting components render in the **light DOM**; their compiled styles are
rescoped at codegen time to a `data-mps` attribute stamped on template elements (the Angular
`_ngcontent` model) and installed once in the document, so component CSS cannot leak out (the
branch's "no-leak guarantee", tested) while page CSS reaches consumer content by ordinary cascade.
Verified on that branch: four lib + three demo builds, 3225/3226 unit tests, e2e Chromium +
Firefox, axe, SSR with zero NG05xx. Nesting rule (`mp-file-manager` hosting light-tier children
in its shadow) already handled with `adoptLightStyles`. Rejected there in §4.4 was exactly O2 —
"on encapsulation, not performance" — an objection the user has since withdrawn by declaring
leak-in desirable, which is why O2 is back on the table here rather than dismissed.

### 4.3 O4 — per-row / per-header named slots (spike on `feat/badge-web-component`)

Consumer rows stay in light DOM as `<tr slot="row-N">`; the shadow `<tbody>` renders
`<slot name="row-N">`. Measured in three engines: table layout intact, utilities apply, 200 window
recycles in 2.7–11 ms. Blocker: the HTML parser drops raw `<tr>`/`<td>` inside a custom element,
so raw-HTML and SSR/DSD consumers need the `display:contents` `<table>` wrapper variant. Only the
datatable was spiked; treeview / tree-select / query-condition would each need their own slot
protocol. Kept as the fallback if O2 fails its spikes and O3 is not wanted.

## 5. Comparison

| | O1 shipped Bootstrap sheet | O2 document mirror (shadow kept) | O3 light DOM + emulated scoping | O4 slots |
|---|---|---|---|---|
| fixes the live icon / Spark renderers (G1) | **no** | yes | yes | yes |
| Bootstrap utilities in cells | yes | yes | yes | yes |
| Angular emulated styles in cells | no | yes (via observer) | yes (native) | yes |
| icon fonts | no (T2) | yes (font-face stays in document) | yes | yes |
| no leak-out (G2) | yes | yes | yes (rescoped, tested) | yes |
| runtime machinery | shared sheet | observer + mirror + per-root adopt | none at runtime; codegen rescoper | slot protocol per component |
| known blind spots | everything not in the sheet | cross-origin `<link>`, `insertRule()`, two sources of truth | Lit light-DOM render vs consumer children (handled per branch PRD) | raw-HTML/SSR parser |
| payload | +190 KB CSS in the WC package | 0 | 0 | 0 |
| state today | spike only | registry exists on two branches; mirror not written | **implemented, verified, pushed** | datatable spike only |
| effort remaining | n/a (rejected) | M1–M4 of the plan (~4 milestones + 4 spikes) | review + merge | 4 slot protocols |

## 6. Decisions

- **D0 (decided 2026-09-02): O3.** The user took `feat/light-dom-emulated-encapsulation` to review
  and merge. Rationale as recommended: it is complete, verified, has no runtime sync machinery
  and no blind spots, and the leak-out fear is answered by the tested rescoper. O2 stays
  documented as the fallback for a future component that genuinely cannot leave the shadow DOM
  (`adoptLightStyles` is the same registry both need for nesting, so nothing is wasted).
- **D1 (settled by measurement): O1 is not the fix.** Do not ship a compiled `_bootstrap.scss` as
  a WC-adopted sheet on its own. If a Bootstrap-only sheet is ever wanted (e.g. React/Vue consumers
  who load Bootstrap from a CDN and hit the cross-origin gap in O2), it needs its own deduplicated
  SCSS entry without `@angular/cdk`, a `:root`→`:host` rewrite, and placement before the
  component's styles (T1, T3, T5).
- **D2: `@font-face` stays in the document, always** (T2). Documented as a consumer rule.
- **D3: leak-in is accepted**, as on 2026-08-30. Chrome regressions caused by page CSS reaching
  component internals are caught by the screenshot spike, not by adding scoping.
- **D4: one shared `CSSStyleSheet` object per source sheet**, never per root (S3).
- **D5: no new third-party libraries** ([[no-third-party-libraries]]).

## 7. Spikes (detailed in the plan)

Already run (2026-09-02, results in `spikes/consumer-styles-in-shadow/`): live repro; S0–S7 of the
adoptedStyleSheets spike. Remaining, all gating O2:

- **S-O2.1 Angular churn** — mirror + observer against the running Angular demo: navigate five
  routes, count style-node add/remove events, measure re-mirror time per event and total, confirm
  no stale rules linger after removal and no duplicate application.
- **S-O2.2 `@import` flattening and `@layer`** — a document sheet with `@import` and `@layer`
  blocks; verify the flattened constructed sheet keeps layer order and that `CSSImportRule` never
  reaches `replaceSync`.
- **S-O2.3 Chrome regression screenshots** — datatable, treeview, tree-select, query-builder demo
  pages with and without the mirror under (a) the Angular demo's trimmed subset and (b) the
  React/Vue demos' full `bootstrap.min.css`; pixel-diff, list every changed rule.
- **S-O2.4 Nested roots and file-manager** — datatable inside file-manager's shadow: does the
  inner mirror see the document sheets (it should — the mirror reads `document.styleSheets`, not
  the parent root), and does the double adoption (file-manager's `adoptLightStyles` + datatable's
  mirror) double-apply anything.

## 8. Migration and documentation

- README: "Bootstrap and icon fonts must be loaded in the document, same-origin (or with
  `crossorigin` + CORS). Inside datatable/treeview/tree-select/query-builder content, page CSS
  applies as it does anywhere else in your app." Remove the inline-`style` workaround advice.
- CLAUDE.md: add T1, T2, T5 as WC gotchas (they hold regardless of D0).
- #408: close with the D0 outcome; Spark's `spark-query-grid` needs no change either way.
- Version bump: minor for the four WC packages under O2 (behaviour change, additive API); O3's
  bump is already on its branch.

## 9. Verification of O3 on the running Angular demo (2026-09-02, Chromium via Playwright)

Checked on `feat/light-dom-emulated-encapsulation` with `npm start`:

| page | result |
|---|---|
| `/enterprise/datatables` | three datatables in light DOM (no shadow root, 83–183 stamped elements each); `<bs-badge>` in a row template fully styled (6px radius, `bg-success`); `.text-nowrap` applies; body font is the Bootstrap stack. #408 fixed. Console errors are the external mintplayer.com API blocked by CORS from localhost. |
| `/basic/treeview` | light DOM, roles / `aria-expanded` / roving `tabindex` correct, SVG icons sized; ArrowDown / ArrowLeft move focus per the APG pattern. |
| `/basic/tree-select` | light DOM; panel opens as a fixed overlay (z-index 1056, flips above the input); nested treeview loads 50 items; Escape closes and returns focus to the search input. |
| `/enterprise/query-builder` | light DOM; exactly one `.btn` rule applies (Bootstrap not shipped twice). |
| `/enterprise/file-manager` | keeps its shadow root and adopts all seven registry sheets; nested datatable + treeview are light-tier and fully styled — the nesting rule holds. |
| `/basic/badge` | unchanged wrapper, styled. |

**Defect found and fixed (commit `66ccac2d`):** consumer-authored `<td>`s from a `rowRenderer`
carry no `data-mps` stamp, so the rescoped `tbody[data-mps] td[data-mps]` rules matched only the
WC-rendered checkbox cell. Consumer cells lost padding, bottom border and `nowrap` (rows pulled
left, no separators), and the checkbox cell's `text-overflow: ellipsis` rendered ".." beside the
20px checkbox. Fix: the `td` rules are authored in final form under `/*! @mps-global */`, anchored
on `tbody[data-mps=datatable] > tr[data-mps=datatable] > td` (child combinator, so a nested
consumer table is untouched); the checkbox cell is anchored the same way to out-rank them and
clips instead of showing an ellipsis. `_conformance/light-styles-scoping` still passes (15/15).

**Rule this adds to the light tier:** when a component mounts consumer elements as *direct
children of its own chrome* (cells in a row, editors in a mount point), every rule for those
elements must be written in anchored final form — the rewriter cannot stamp them, and a rescoped
selector on their tag silently matches nothing. The branch's e2e suites did not catch this because
the demo's assertions target the rendered content, not the cell chrome; a computed-style check on
a consumer `<td>` (padding, border) belongs in the datatable e2e.

## 10. References

- Spike results: `spikes/consumer-styles-in-shadow/adopted-stylesheets.results.md`
- MDN `ShadowRoot.adoptedStyleSheets`; Chromium issue 41085401 and Rob Dodson,
  "@font-face doesn't work in shadow DOM"; Edge Declarative Shadow DOM explainer; WICG
  webcomponents #939 (declarative adopted sheets), #909 (`open-stylable`); csswg-drafts #11509
  (`@sheet`).
- Eisenberg, *Debunking Web Component Myths and Misconceptions* — the `adoptedStyleSheets`
  section (claim verified for same-origin sheets; silent on cross-origin, later sheets, `:root`,
  cascade order and DSD; concedes `@font-face`).
