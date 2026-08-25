# PRD — consumer content inside a shadow root, and the CSS that never reaches it

**Status:** Proposed · 2026-08-25
Plan: [shadow-boundary-css-plan.md](./shadow-boundary-css-plan.md)

Grounded in a 4-agent survey of the workspace at `master@1277ff1e` plus live
browser measurement against the running demo at
`http://localhost:4200/enterprise/datatables` (Chromium, 2026-08-25). Every
number below is measured in that page, not estimated. Where a claim is a code
reading rather than a measurement it says so.

## 1. Problem

A `<bs-badge>` placed in a `<bs-datatable>` `*bsRowTemplate` renders as unstyled
text. The markup is correct — `<span class="badge bg-danger">` with the right
`_ngcontent` attributes — but nothing applies.

The row template's DOM ends up inside `mp-datatable`'s shadow root:

```
BS-BADGE < TD < TR < TBODY < TABLE < #shadow-root(MP-DATATABLE) < BS-DATATABLE
```

The Angular wrapper builds row DOM with `createEmbeddedView`
(`libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts:342-373`)
and hands the nodes to the WC as a `rowRenderer` callback; the WC renders them
into its shadow `<tr>`
(`libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts:1002-1024`).
Angular's emulated-encapsulation styles live in `document.head`, and so does
Bootstrap. **Neither crosses a shadow boundary.**

Cloning the identical node into `document.body` and measuring both:

| property | in the row template | same node in light DOM |
|---|---|---|
| `background-color` | `rgba(0,0,0,0)` | `rgb(220,53,69)` |
| `display` | `inline` | badge box |
| `padding` | `0px` | `4.2px 7.8px` |
| `border-radius` | `0px` | `6px` |
| `font-size` | `16px` | `12px` |

This is not a badge bug. Badge is the instance that got reported.

## 2. Baseline — what is actually broken

### F1 — Consumer utility classes are dead, 21 of 22 measured

Identical `<div>`s placed inside the datatable shadow root vs the light DOM:

| utility | in shadow root | light DOM |
|---|---|---|
| `m-3` | `margin: 0px` | `16px` |
| `p-2` | `padding: 0px` | `8px` |
| `mt-4` / `px-3` | `0px` | `24px` / `16px` |
| `d-flex` | `display: block` | `flex` |
| **`d-none`** | **`block` — visible** | `none` |
| `text-center` | `start` | `center` |
| `fw-bold` | `400` | `700` |
| `text-danger` | inherited | `rgb(220,53,69)` |
| `bg-primary` | transparent | `rgb(13,110,253)` |
| `rounded` / `border` | `0px` | `6px` / `1px` |
| `w-100` | `275px` | `1267px` |
| `fst-italic`, `small`, `gap-2`, `align-items-center`, `float-end`, `opacity-50` | all dead | all applied |
| **`visually-hidden`** | **`position: static`** | `absolute` |
| `text-nowrap` | `nowrap` ✅ | `nowrap` |

`text-nowrap` is the **only** survivor, and by accident:
`datatable.styles.scss:84-92` happens to declare `white-space: nowrap` on
`tbody td`. That single coincidence is why this went unnoticed — the demo's row
templates use `text-nowrap` throughout and appear to work.

Two of these are correctness bugs, not cosmetic ones:

- **`d-none` renders content that should be hidden.**
- **`visually-hidden` computes `position: static`** — screen-reader-only text
  becomes visible on screen. An accessibility regression.

### F2 — Five WCs inject consumer content into their own shadow root

| # | Component | API | Demo status |
|---|---|---|---|
| 1 | `mp-datatable` | `rowRenderer` (`mp-datatable.ts:1002`) | **broken today** — the reported repro |
| 2 | `mp-datatable` | `cellRenderer` (`:1027`) / `headerRenderer` (`:887`) | latent (Angular); demos pass strings |
| 3 | `mp-query-builder` | `editorRegistry` → `mp-query-condition.element.ts:144` | **broken today** |
| 4 | `mp-treeview` | `nodeRenderer` (`mp-treeview.ts:352`), `iconResolver` (`:353`, `unsafeHTML`) | **broken today** |
| 5 | `mp-tree-select` | 7 template properties (`mp-tree-select.ts:102-108`) | latent — zero demo coverage |
| 6 | `mp-select` | `optionRenderer` (`:453`, `unsafeHTML`, feature-gated) | no consumers |

`mp-query-builder` is the sharpest case: `mp-query-condition.element.scss:106-190`
fully styles the **built-in** editors, so a consumer-supplied editor sits in the
identical slot with none of it. The inconsistency is unmissable.

Verified **safe** (real slot projection, light DOM): `mp-timeline`,
`mint-dock-manager`, `mp-tile-manager`, the `mp-ribbon` family. Charts'
`*Formatter` callbacks return plain strings and are not exposures.

### F3 — The library ships this defect against itself

`mp-file-manager` builds `DatatableColumnDef`s whose `cellRenderer`s return
markup using `.row-cell`, `.row-icon`, `.rename-input`
(`mp-file-manager.ts:919-995`). Those classes are declared in
**`file-manager/src/styles/file-manager.styles.scss:226-246`** — i.e. in
`mp-file-manager`'s shadow sheet — and render inside **`mp-datatable`'s** shadow
root. Zero of them exist in the datatable's SCSS. It also sets
`cellClass: 'text-nowrap'` (`:925,933,940,947`), a global Bootstrap utility,
equally dead. Fixing this validates whatever mechanism we choose.

### F4 — `mp-card` has the same bug one level down

`mp-card.element.ts:56-71` injects `card-global.styles.scss` into `document.head`
at runtime, because `::slotted()` cannot reach a grandchild such as `.card-title`
inside a `.card-body`. A `<mp-card>` nested in another shadow root therefore
keeps its `:host` chrome (`--bs-*`-driven, correct) and **loses every interior
region and typography rule**. It has no `card/ssr/` directory and the injection
is JS-only, so SSR ships cards with no interior CSS until hydration.

The same shape affects `dropdown-menu` in all three frameworks: React/Vue
`dropdown-menu.css`, Angular inline `styles` at
`dropdown-menu.component.ts:45-62`. The `.dropdown-item` box survives (it is
`::slotted`-styled); the nested `<a>` fill does not.

### F5 — 46 Angular components are shadow-unsafe

30 import a Bootstrap partial under `:host ::ng-deep` (which still lands in
`document.head`); 16 more rely on global utilities alone. Only **2 of the 46**
have an existing WC to wrapper-ify into (`bs-navbar-toggler`,
`bs-tab-control`'s SSR branch). The rest need a new WC or self-contained SCSS.

Additionally 16 directives stamp a document-styled class into consumer markup —
`[color]` → `.btn`/`.btn-*` (`button-type.directive.ts:5,19`), `[bsRow]`,
`[col]`/`[xxs..xxl]`, `[bsFormGroup]`, the modal/popover body/header markers.
These are the mechanism by which the breakage reaches consumer templates.

### F6 — `card-classes.ts:1-12` is stale and actively misleading

It documents the mp-card family as plain `HTMLElement` + light DOM with a
warning against "consistency-fixing" it to LitElement. `mp-card.element.ts:29`
extends `LitElement` with **no `createRenderRoot` override**. The census found
**zero light-DOM web components** in the library; all 71 registered elements
render into a shadow root, and all 6 `createRenderRoot` overrides are DSD
handoff variants. The migration is done; the comment describes a world that no
longer exists.

### F7 — React and Vue have no badge, and no 30 other visual components

Both wrapper libs have an identical 34-directory set. Angular-only visual
components include **badge**, alert, breadcrumb, button-group, close, container,
list-group, modal, offcanvas, placeholder, popover, progress-bar, range, rating,
spinner, table, toast, tooltip, typeahead.

## 3. What the platform actually allows

The question this PRD exists to answer: *can document styles reach
consumer-specified content while shadow encapsulation is preserved for the
component's internals?*

**Yes — via real `<slot>` projection.** Slotted nodes stay in the document tree,
so document CSS reaches them; the shadow styles stay sealed. Measured, in the
running page:

### F8 — Slots deliver the exact semantics wanted

Slotting a consumer `<tr>` into a shadow `<tbody>`:

- consumer page utilities applied to the slotted cells — `p-2` → `8px`,
  `text-danger` → `rgb(220,53,69)`, `fw-bold` → `700`
- the component's `::slotted(tr)` rule applied
- the component's internal `td` rule did **not** leak onto consumer cells
  (`border-top-width: 0px`)

Encapsulation held in both directions.

### F9 — CSS table layout does not cross the flat tree; grid and flex do

The one thing that fails is layout, and only for `display: table-*`:

| host shape | slotted content laid out correctly? |
|---|---|
| `<slot>` for cells inside a shadow `<tr>` | ❌ cells render at `(0,0)`, outside the table, in their own anonymous table box — while the component's own `<td>` in that row takes the full width |
| `<slot>` for a whole `<tr>` inside a shadow `<tbody>` | ❌ row renders at `(0,0)`, `53px` wide, outside the table |
| `<slot>` inside a shadow **flex** row | ✅ same row as the component's own node, correct order |
| `<slot>` inside a shadow **grid** | ✅ cells align exactly to shadow-declared column tracks |

The slot is correctly *assigned* in every case (`assignedSlot` is non-null); it
is the table fixup algorithm that does not traverse the flat tree.

### F10 — Grid + subgrid satisfies every datatable requirement

The realistic shape — an outer grid owning the columns, each row a real element
with `grid-template-columns: subgrid`, containing the component's own cells plus
a per-row `<slot>`:

| requirement | measured |
|---|---|
| slotted cells land on the outer grid's tracks | ✅ col2 `x=151 w=299` ≡ header B; col3 `x=450 w=150` ≡ header C |
| rows stack in order below the header | ✅ |
| row is a real element with a real box | ✅ `598×40` |
| row-level state styling (`:hover`, `[data-selected]`) | ✅ `rgb(187,204,255)` |
| component-owned cells (checkbox, chevron) coexist | ✅ column 1 |
| consumer page CSS reaches slotted cells | ✅ `p-2`, `text-danger`, `fw-bold` |
| row height driven by the tallest cell | ✅ `40px` vs `36px` default |

### F11 — Bootstrap tokens already cross the boundary

`--bs-danger`, `--bs-danger-rgb`, `--bs-primary`, `--bs-border-radius`,
`--bs-body-bg/color` all resolve at full shadow depth inside `mp-datatable`.
Toggling `data-bs-theme` flips the theme-reactive ones live across the boundary
(`--bs-body-bg` `#212529` → `#fff`; `color-scheme` `dark` → `normal`).

**Caveat, so nobody overclaims it later:** `--bs-danger-rgb` and
`--bs-secondary-rgb` are *identical* in both themes — Bootstrap's solid theme
colours are theme-invariant by design. A component needing theme-reactive values
must use `--bs-*-bg-subtle` / `--bs-body-*`, not `--bs-{color}-rgb`.

## 4. Goals

- **G1** A consumer's Bootstrap utility classes (`m-3`, `p-2`, `d-none`,
  `visually-hidden`, …) work inside `*bsRowTemplate` exactly as they do outside it.
- **G2** A consumer's own components — library `bs-*` and their own — render
  identically inside and outside a renderer-hosted region.
- **G3** Shadow encapsulation is preserved: page CSS must not restyle a
  component's internals, and component CSS must not leak onto consumer content.
- **G4** The same mechanism covers every exposure in F2, not just the datatable.
- **G5** `mp-badge` exists as a self-contained WC with Angular, React and Vue
  wrappers, closing the F7 parity gap for the single most likely element in a cell.
- **G6** The library stops committing the defect against itself (F3, F4).
- **G7** The rule and its measured evidence are written down where the next
  author will hit it — `CLAUDE.md` and the stale comment in F6.
- **G8** Every remaining component in F5's census is converted to a
  WC-fronted component with Angular, React and Vue wrappers, in this PR.

> **On G8's justification — state it honestly.** G8 is *not* primarily a
> shadow-safety fix. D1/D8/D9 move all consumer content into the light DOM, and
> a `bs-*` component only loses its styles when it lands inside a shadow root —
> so most of F5's 46 stop being reachable-broken once the mechanism lands
> (§17 classifies exactly which). The durable reasons for G8 are:
>
> 1. **Framework parity (F7).** React and Vue are missing 30+ visual components.
>    Every conversion closes a real gap that no mechanism fix addresses.
> 2. **Defence in depth.** A self-contained component cannot be broken by a
>    future nesting we have not thought of. The reported bug existed because a
>    component depended on ambient CSS; removing that dependency removes the
>    class of bug, not just today's instance.
> 3. **Consistency.** `_bootstrap.scss` already keeps most component partials out
>    of the global sheet (§15.5). Components owning their own styles is the
>    stated direction; 46 components not following it is the anomaly.
>
> Recording this because "we did it to fix the badge bug" would be false, and the
> next reader deserves the real reason.

## 5. Non-goals

- ~~**Converting all 46 shadow-unsafe Angular components.** F5 is a programme, not
  a PR.~~ **Reversed 2026-08-25 by the user: fold them all into this PR**, per
  the one-PR rule. See G8 and the framing note below.
- **Adopting `document.styleSheets` into shadow roots.** Rejected on the
  evidence, see D4.
- **Changing `<table>` semantics for consumers.** The row-template API keeps its
  shape; consumers author cells, not grid tracks. See D2.
- **Reviving light-DOM web components.** F6 settles that; the migration is done.
- **A general "utility classes inside every WC" facility.** Utilities reach
  *slotted* content by construction (F8). Content a component renders itself is
  the component's own business and is styled by its own sheet.

## 6. Locked decisions

| # | Decision | Consequence |
|---|---|---|
| **D1** | Consumer-supplied content is **slotted**, never adopted into a shadow root. | The one mechanism that satisfies G1–G3 simultaneously (F8). Applies to all six exposures in F2. |
| ~~**D2**~~ | ~~`mp-datatable` moves from `<table>` to CSS **grid + subgrid**.~~ | ~~Forced by F9.~~ **Superseded by D8 — see §15.** |
| ~~**D3**~~ | ~~Explicit ARIA roles (`table`/`row`/`columnheader`/`cell`) replace the implicit table semantics.~~ | ~~A grid is not a table to AT.~~ **Moot under D8: the real `<table>` is kept, so implicit semantics are kept.** |
| **D4** | **Do not** copy `document.styleSheets` into shadow roots. | Breaks G3 (page CSS would restyle internals); `cssRules` throws on cross-origin sheets; Angular injects styles lazily so it needs a `MutationObserver`; and Bootstrap re-parsed per component instance is a real cost. No such escape hatch exists anywhere in the workspace today (`grep adoptedStyleSheets` → comments only). |
| **D5** | `mp-badge` is a shadow-DOM Lit element styled from `var(--bs-*)`, not a light-DOM class-carrier. | Makes it correct at any nesting depth. Measured: a shadow-DOM badge probe in the same broken `<td>` renders pixel-identical to the light-DOM reference (§7.3). |
| **D6** | Badge implements `text-bg-*` semantics (background **and** contrasting foreground), not today's `bg-*`. | Today's foreground comes from Bootstrap's `.badge` rule, which is exactly what does not arrive. |
| **D7** | `card-global.styles.scss` moves into `mp-card`'s shadow sheet; the light-DOM sub-parts become slotted content styled via `::slotted()`, or gain their own elements where a grandchild selector is unavoidable. | Closes F4 and its SSR hole. |
| **D8** | `mp-datatable` **keeps a real `<table>`**, and renders it into its **own light DOM**. The shadow root keeps only chrome (scroll container, footer, pagination) plus `::slotted(table)` rules. | Measured in S-C (§15.3): no boundary is crossed by the table structure, so native table layout and page CSS both work, and G1–G3 are all satisfied. Replaces D2/D3. |
| **D9** | Component-owned cells are **custom elements with their own shadow root** (`mp-td` family), not plain `<td>`s carrying library classes. | Measured in S-C2/S-C3 (§15.4): `:host { display: table-cell }` participates in the light-DOM table natively, self-styles from its own shadow, and page CSS does **not** leak into it. This is what makes D8 possible without a document-level sheet. |
| **D10** | Bootstrap table styling ships as an **`mp-table` element family** (`mp-table` / `mp-thead` / `mp-tr` / `mp-th` / `mp-td`), each self-styled in its own shadow root. `bs-table` becomes a wrapper over it, and `mp-datatable` composes it. | The user's proposal, and consistent with what the repo already does: `_bootstrap.scss:38` (`tables`) and `:78` (`badge`) are **deliberately commented out** of the global sheet, so component styles already live in components. Also fixes `bs-table`/`bs-table-styles` from F5 as a side effect. |
| **D12** | **A stamped Bootstrap class is a light-DOM contract.** The 16 class-stamping directives get **no code changes**; D1 is their entire fix. Enforced by a conformance guard, not by convention alone. | Measured reasoning in §18. A slotted subtree keeps its whole light-DOM ancestor chain, so a stamped class resolves at *any* depth once consumer content is light DOM. 14 of 16 are fixed for free; the other 2 are unrelated pre-existing bugs (§18.2). |
| **D13** | `_styles/buttons.styles.scss` is hoisted as a shared pass-through sheet; **no `mp-button` element**. | `bootstrap/scss/buttons` is currently imported independently by 4 elements (`mp-query-builder.element.scss:13`, `mp-query-condition.element.scss:12`, `mp-query-group.element.scss:15`, `toggle-button.styles.scss:20`) — 4 × 12.4 KB and 4 parses. One shared `CSSResult` is one parse and one copy: **net −37 KB**. The recorded `[color]`-on-a-plain-`<button>` API stands; an `mp-button` would reverse a standing user decision. |
| **D11** | Subgrid is **not** used. | It was only ever needed to replace table layout under the superseded D2. With D8's real `<table>`, column alignment between header and body is native — `mp-datatable` already uses a single table with a sticky `thead` (`datatable.styles.scss:36-45`), so there is nothing to align manually. Adding subgrid on top of a working `<table>` would be the exact sloppiness this decision set exists to avoid. |

## 7. Design

> **AMENDED 2026-08-25 (user decision, after the §15 spikes):** §7.1 below
> described the superseded D2/D3 design. The shipped design is §7.1b. §7.1 is
> retained because its analysis of the row-recycling and placeholder machinery
> still applies, and because the rejected shape must stay visible (see
> "Explicitly rejected" in the plan).

### 7.1b Datatable — a real `<table>`, in the component's own light DOM [D8, D9, D10]

```
<mp-datatable>                       ← host
  #shadow-root
    .datatable-shell                 component chrome only
      .datatable-scroll
        <slot></slot>                ← the table is projected back in
      .datatable-footer              pagination, per-page
    ::slotted(table) { … }           the component styles the table ELEMENT

  <mp-table>                         ← LIGHT DOM, built by the component
    <mp-thead> <mp-tr> <mp-th>…      component-owned, each self-styled
    <mp-tr data-selected>
      <mp-td class="checkbox-cell">  component-owned cell (checkbox / chevron)
      <td class="p-2 text-danger">   ← CONSUMER cell, plain <td>, page-styled
```

Why each piece is there:

- **The table is light DOM**, so no boundary is crossed by the table structure.
  Native table layout, and consumer cells are ordinary document nodes that page
  CSS reaches (S-C).
- **Component-owned cells are custom elements** with `:host { display: table-cell }`.
  They carry their own styling in their own shadow root, so the library needs no
  document-level stylesheet — and page CSS cannot reach into them (S-C2, S-C3).
  This is the piece that lets D8 keep encapsulation while giving up the shadow
  root for the table.
- **Consumer cells stay plain `<td>`** and get page CSS and Bootstrap utilities
  for free. A consumer who wants library cell chrome uses `<mp-td>` instead and
  still gets page utilities on the host — the page rule beats `:host` per the
  measured cascade order in `CLAUDE.md`.
- **`mp-table` is reusable on its own** (D10), which is what makes `bs-table` a
  thin wrapper instead of a `::ng-deep` Bootstrap import.

Consequences vs. the current implementation:

- The `rowRenderer` `Node[]` contract survives — the wrapper's
  `createEmbeddedView` root nodes are appended into a light-DOM `<mp-tr>`
  instead of being handed to the WC for shadow insertion. No slot names, no
  per-row slot bookkeeping. This is strictly less machinery than §7.1 proposed.
- `tbody td { white-space/overflow/text-overflow }` (`datatable.styles.scss:84-92`)
  moves onto `mp-td`'s `:host` so it applies to component-owned cells only.
  Consumer `<td>`s are the consumer's to style — that is G1.
- Virtual scrolling, windowed fetch, tree mode, column resize and the
  measure-once pass all keep operating on a real table. Nothing in that
  machinery changes shape.
- `colspan` keeps working. Sticky `thead` keeps working.
- ARIA: implicit table semantics are retained, so D3 is moot. `mp-th`/`mp-td`
  must set `role="columnheader"`/`"cell"` only if their custom tag names
  suppress the implicit role — spike S4.

### 7.1 (superseded) Datatable — grid, subgrid, and one slot per row

Shadow structure:

```
.grid                       grid-template-columns: <per-column tracks>
  .hcell × n                component-owned header cells
  .row[data-*]              display:grid; grid-template-columns:subgrid; grid-column:1/-1
    .rowown                 component-owned cells (checkbox, tree chevron)
    <slot name="row-<key>"> consumer cells, in the light DOM
```

The wrapper moves the `EmbeddedViewRef` root nodes into the WC's **light DOM**
with `slot="row-<key>"` instead of handing them over as a `Node[]`. Slot names
are keyed by the existing `rowKey`, so view recycling and the windowed-fetch
placeholder machinery keep working unchanged; stale light children are removed
when their row leaves.

Consequences to handle explicitly:

- `colspan` on placeholder rows becomes `grid-column: 1/-1`.
- `table-layout: fixed` + the measure-once pass becomes explicit track sizing;
  the existing measured-width logic feeds `grid-template-columns` instead.
- `tbody td { white-space:nowrap; overflow:hidden; text-overflow:ellipsis }`
  (`datatable.styles.scss:84-92`) currently masks F1. Under D1 it must **not**
  be reproduced as a `::slotted()` rule — consumer cells are the consumer's to
  style. Column-level ellipsis stays available via `cellClass`.
- Sticky header (`:36-45`) is `position: sticky` on grid items, which works, but
  needs re-verification with virtual scrolling.

### 7.2 The other four exposures

`mp-treeview` (`nodeRenderer`), `mp-query-builder` (`editorRegistry`),
`mp-tree-select` (7 templates) and `mp-select` (`optionRenderer`) all host their
injection point inside **flex or block** containers, which F9 shows already
project correctly. They need the same light-DOM + named-slot move but **no
layout change** — strictly cheaper than the datatable.

`mp-tree-select`'s derived `nodeRenderer` crosses two shadow roots (its own and
`mp-treeview`'s, `mp-tree-select.ts:690` → `:877`); slotting must be threaded
through both.

### 7.3 `mp-badge`

New `libs/mintplayer-web-components/badge/`, auto-discovered by
`vite.config.mts`. Styles from `var(--bs-*)` with literal fallbacks, per the
house pattern (`datatable.styles.scss:6-12`, `tree-select.styles.scss:11-15`).

Measured against a probe of this exact design, inserted into the same `<td>`
inside `mp-datatable`'s shadow root where `bs-badge` renders unstyled:

| | probe in shadow root | light-DOM reference |
|---|---|---|
| background | `rgb(220,53,69)` | `rgb(220,53,69)` |
| color | `rgb(255,255,255)` | `rgb(255,255,255)` |
| padding | `4.2px 7.8px` | `4.2px 7.8px` |
| radius | `6px` | `6px` |
| font-size / weight | `12px` / `700` | `12px` / `700` |

Porting details that bite:

- `.badge:empty { display:none }` cannot survive as-is — the inner span holds a
  `<slot>` and is never empty. It becomes `:host(:empty) { display: none }`.
- `unit` renders a visually-hidden span **inside the shadow root**, so it is
  immune to F1's `visually-hidden` failure.
- `decorative` sets `aria-hidden` on the host.

### 7.4 API changes

`bs-badge` keeps its selector and inputs — `[type]: Color`, `[unit]`,
`[decorative]` — so the 7 existing consumers do not change. The wrapper resolves
the numeric enum to a token with `Color[c]`, as `bs-card.component.ts:35` does.

| Angular | WC attribute |
|---|---|
| `[type]="Color.danger"` | `color="danger"` |
| `[unit]="'unread'"` | `unit="unread"` |
| `[decorative]="true"` | `decorative` |

New: `BsBadge` for React (`@lit/react` `createComponent`) and Vue (SFC with
`inheritAttrs: false` + `v-bind="$attrs"`).

`bs-datatable`'s public API is unchanged. `mp-datatable`'s `rowRenderer`
property is **replaced** by slot-based projection — a breaking change to the WC
surface, acceptable per house policy, and documented in §10.

## 8. Accessibility

- **D3 is the main risk.** Dropping `<table>` drops implicit table semantics.
  Every `role` must be explicit and asserted in `mp-datatable.aria.spec.ts`,
  including `aria-rowcount`/`aria-colindex` under virtual scrolling where the
  DOM holds a window rather than the full set.
- **F1's `visually-hidden` failure is an existing a11y bug** — screen-reader-only
  text in a row template is currently visible on screen. G1 fixes it.
- **F1's `d-none` failure** currently shows content the consumer hid.
- Slotted content is in the document's accessibility tree at its flattened
  position, which is what AT already expects — no IDREF crosses a boundary.

## 9. Spikes (gate — throwaway, verdicts recorded here)

Run and recorded in §15: **S-A** (partial), **S-C / S-C1 / S-C2 / S-C3** (pass),
**S-D** (fail). These resolved Q1 and produced D8–D11. Remaining:

- ~~**S1 — grid/subgrid under virtual scrolling.**~~ **Dropped with D2.**
- ~~**S2 — AT verdict on the role-based grid.**~~ **Dropped with D3** — the real
  `<table>` keeps its implicit semantics, so there is no role rewrite to audit.
  Replaced by the narrower S4.
- **S3 — Firefox and WebKit parity for §15.** Every measurement is Chromium 151.
  S-C and S-C2 are the load-bearing ones now: confirm that a custom element with
  `display: table-cell` participates in table layout, and that page CSS does not
  leak into its shadow root, in all three engines. FAIL in any engine → D9 is
  unsafe and the whole D8 design collapses back to the D2 fallback.
- **S4 — implicit ARIA role of a custom element with `display: table-cell`.**
  A `<mp-td>` is not a `<td>`; `display` does not confer a role. Measure what
  AT actually computes for the `mp-table` family and add explicit
  `role="cell"`/`"row"`/`"columnheader"` where the implicit role is absent.
  Cheaper than D3 was (roles on a structure that is genuinely a table) but not
  free. Gate for M5.

## 10. Testing

- WC unit specs (vitest + jsdom) for slot assignment and stale-slot cleanup.
- `mp-datatable.aria.spec.ts` extended for the explicit roles of D3, states
  included.
- A **regression spec asserting F1 directly**: a `p-2 d-none visually-hidden`
  probe inside a row template, asserting computed styles match the light DOM.
  This is the test that would have caught the original report.
- Wrapper specs in all three frameworks — drive inputs from a `signal()`, never
  a mutable field (`CLAUDE.md`).
- Keep the demo's `<bs-badge>` in the datatable row template as the live
  regression case.
- e2e: the existing datatable suites re-run against the grid structure.
- The usual: batch every suite into one final sweep; verify milestones by
  reading + `tsc --noEmit`.

## 11. Risks

- ~~**R1 — D2 is a large refactor of a 1846-line element.**~~ **Much reduced
  under D8.** The table, virtual scrolling, windowed fetch, tree mode, column
  resize and the measure-once pass all keep working on a real table; what
  changes is *where* the table is mounted (light DOM) and *what* the owned cells
  are (custom elements). Residual risk: the shadow→light move touches every
  `render()` path in a 1846-line element.
- **R2 — a custom element with `display: table-cell` may not expose an implicit
  cell role.** This is D3's cost in miniature and it is real. *Mitigation:* S4
  measures it before M5; roles are added where absent, on a structure that is
  genuinely a table so the mapping is unambiguous.
- **R7 — D8 gives up shadow encapsulation for the table subtree by design.**
  Page CSS can now restyle the datatable's rows. That is the point (G1), but it
  means a consumer's stray `td { … }` rule reaches library markup where it
  previously could not. *Mitigation:* D9 — everything the library actually owns
  is a custom element with its own sealed shadow root, so the blast radius is
  consumer cells only. Measured in S-C3.
- **R3 — consumer CSS can now reach slotted cells, so the datatable's own
  ellipsis/nowrap defaults stop applying.** This is intended (G1/G3) but is a
  visible behaviour change. *Mitigation:* documented in the migration note;
  `cellClass` remains the column-level channel.
- **R4 — three frameworks project slots differently.** Vue tree-select renders
  scoped slots into *detached* containers (`BsTreeSelect.vue:83-119`); React
  uses `@lit/react`; Angular's wrapper hosts `bs-*` one level above the `mp-*`
  element. *Mitigation:* validate per framework, never once (this is the same
  trap that shipped the 0px-wide control in #400).
- **R5 — Chromium-only evidence.** See S3.
- **R6 — scope creep into F5.** *Mitigation:* §5 names it a non-goal and the
  census in §2 keeps it visible.

## 12. Versioning

Breaking: `mp-datatable`'s table subtree moves from its shadow root into its
light DOM, and component-owned cells become `mp-*` elements — so any consumer
CSS authored against the shadow structure, or any `::part()` reaching into it,
breaks. `rowRenderer` keeps its `Node[]` contract (D8 needs no slot names), so
that part of the surface is **not** breaking after all. `bs-datatable`'s Angular
API is unchanged.

Breaking: `bs-table` / `bs-table-styles` become wrappers over `mp-table` (D10);
the `::ng-deep` Bootstrap import is removed, so consumers relying on it leaking
onto their own markup lose it.

Minor: new `mp-badge`, new `mp-table` family, plus wrappers for both in three
frameworks. Documented, no shims, per house policy.

## 13. References

- Repro and all measurements: `http://localhost:4200/enterprise/datatables`,
  Chromium, 2026-08-25, at `master@1277ff1e`.
- `CLAUDE.md` — "Bootstrap utility classes do not cross the shadow boundary";
  the `::slotted()` cascade order; the "never name `mp-*` tags in `::slotted()`"
  trap from #400.
- `docs/prd/phone-input-wc.md` — the `container-type` / `::slotted` precedents.
- `libs/mintplayer-web-components/tab-control/src/styles/tab-control.styles.scss:20,61-89`
  — the existing hand-re-declared-utilities precedent, and why `utilities/_api`
  is not imported wholesale.

## 15. Spike results (2026-08-25) — and the design they overturned

Run in Chromium 151 against the live demo. Each spike is reproduced in full so
the verdict can be re-derived rather than trusted.

### 15.1 S-D — can a `display: table-*` slot rescue `<table>`? **FAIL**

If flat-tree table fixup honoured a slot's display type, `<table>` and slots
could coexist and none of the rest would be needed. It does not.

```js
sr.innerHTML = `<style>
  table{width:100%;border-collapse:collapse}
  td{border:1px solid #999;padding:4px}
  slot[name=rows]{display:table-row-group}
</style>
<table><tbody><tr id="nat"><td>N1</td><td>N2</td></tr></tbody>
<slot name="rows"></slot></table>`;
// light DOM: <tr slot="rows"><td class="p-2">D1</td><td>D2</td></tr>
```

```
nativeRow  { x:1, y:41, w:599, h:33 }
slottedRow { x:0, y:0,  w:58,  h:40 }   ← outside the table
inTable: false
```

Verdict: **FAIL.** `display: table-row-group` on the slot changes nothing. The
table fixup algorithm does not traverse the flat tree. Confirms F9.

### 15.2 S-A — can `mp-table`'s shadow style a *slotted* table's `tr`/`td`? **PARTIAL**

```js
sr.innerHTML = `<style>
  ::slotted(table){border:3px solid green;width:100%}
  ::slotted(table) td{background:red}   /* cannot reach descendants */
</style><slot></slot>`;
// light DOM: <table><tbody><tr><td class="p-2 text-danger">A1</td>…
```

```
tableBorder:       "3px"                ← ::slotted(table) DOES apply
tdBackground:      "rgba(0,0,0,0)"      ← descendants NOT reachable (per spec)
tdConsumerPadding: "8px"                ← page CSS DOES reach the cell
tdConsumerColor:   "rgb(220,53,69)"
```

Verdict: **PARTIAL.** A wrapper element can style the table box but never its
rows or cells — the same grandchild limitation that forced F4's `document.head`
injection in `mp-card`. This is why D9 exists: rows and cells must be **their own
elements**, not descendants to be reached from outside.

### 15.3 S-C — component renders the `<table>` into its OWN light DOM. **PASS**

```js
// shadow: chrome + a slot; the component appends its table to `this`
sr.innerHTML = `<style>
  .chrome{border:2px dashed #888;padding:4px}
  ::slotted(table){width:100%;border-collapse:collapse}
</style><div class="chrome"><slot></slot></div>`;
const t = document.createElement('table');
t.innerHTML = '<tbody><tr id="crow"><td class="own-cell">chk</td></tr></tbody>';
this.appendChild(t);                       // LIGHT DOM
// then a consumer cell is appended to #crow:
//   <td class="p-2 text-danger fw-bold">CONSUMER</td>
```

```
ownCell        { x:6,   y:126, w:118, h:40 }
consumerCell   { x:124, y:126, w:470, h:40 }
sameRow: true
consumerPadding: "8px"   consumerColor: "rgb(220,53,69)"   consumerWeight: "700"
tableStyledByShadow: "collapse"          ← ::slotted(table) still applies
```

Verdict: **PASS.** Native table layout, consumer page CSS applies, and the
component still styles the table element from its shadow root. This is D8.

### 15.4 S-C2 / S-C3 — a custom element as a table cell. **PASS**

The remaining question after S-A: if `::slotted()` cannot reach cells, how does
the library style its own?

```js
customElements.define('mp-td-probe', class extends HTMLElement {
  connectedCallback(){
    this.attachShadow({mode:'open'}).innerHTML =
      '<style>:host{display:table-cell;padding:.5rem .75rem;' +
      'border-bottom:1px solid #999;vertical-align:middle}' +
      '.chk{accent-color:#0d6efd}</style><input class="chk" type="checkbox">';
  }
});
// inserted as the first cell of a light-DOM <tr> that also holds a consumer <td>
```

```
display:        "table-cell"             ← participates in the table natively
padding:        "8px 12px"               ← self-styled from its own shadow
borderBottom:   "1px"
rect            { x:0,  y:26, w:44, h:41 }
consumerCell    { x:44, y:26, w:25, h:41 }
sameRow: true    isFirstColumn: true

// S-C3: page CSS must NOT leak into the owned cell's shadow root.
// `.chk` was given class="p-2 d-none":
innerPadding: "0px"          ← p-2 did not apply
innerDisplay: "inline-block"  ← d-none did not apply
```

Verdict: **PASS.** Component-owned cells are self-styling and sealed, while
sitting in the same light-DOM row as page-styled consumer cells. This is D9, and
it is what makes D8 safe.

### 15.5 S-C1 — is Bootstrap's `.table` available globally? **NO**

```
tdBorderBottom: "0px"    stylesApply: false    --bs-table-color: ""
```

`libs/mintplayer-ng-bootstrap/_bootstrap.scss:38` — `// @import "~bootstrap/scss/tables";`
is **commented out**, as is `:78` `// @import "~bootstrap/scss/badge";`. Neither
is global in this workspace by deliberate choice. The 8px padding observed came
from the consumer's own `p-2`, and `th` boldness from the UA sheet.

This is the evidence for D10: the repo already holds that component styles live
in components, so `mp-table` owning the Bootstrap table rules — and `mp-badge`
owning the badge rules — continues an existing policy rather than inventing one.

### 15.7 S-P — the HTML parser forbids mixing custom elements with a real table. **D8 FAILS**

Harness: `docs/prd/_spike-table-badge-shadow.html`. Three shapes authored as HTML
**source** (so the parser's tree-construction algorithm runs), not `createElement`:

| # | authored markup | result |
|---|---|---|
| A | `<mp-table-el><mp-tr><mp-td>` | ✅ survives intact — no real table elements, so no table insertion mode |
| B | `<table><tbody><tr><mp-td>…</mp-td><td>…</td>` | ❌ `<mp-td>` **foster-parented out** of the table; only the plain `<td>` remains |
| C | `<mp-table-el><mp-tr><td>…</td><mp-td>…` | ❌ the `<td>` **start tag is dropped**; only its text survives as a bare text node |

**Verdict: the two are mutually exclusive.** A real `<table>` accepts only
`<td>`/`<th>`; outside a real table, a `<td>` start tag is ignored entirely.

This breaks **D8/§7.1b as specified**, which mixed all three: a real `<table>`,
`mp-td` for owned cells (case B), and plain `<td>` for consumer cells (case C).
It composes only when every node is built with `createElement` — true for Angular
templates, JSX and compiled Vue SFCs, but **false for hand-authored HTML, Vue
in-DOM templates, and SSR output, which the browser re-parses**. Given this repo
ships DSD/SSR paths, that is not an acceptable constraint to hide in a component.

Note the parser is also the reason `::slotted()` experiments must use
`createElement`: F9's early "slot inside `<tr>`" tests were only measurable that
way.

### 15.8 Where this leaves the datatable

| | D2 — shadow + grid + slots | D8 — light-DOM real table |
|---|---|---|
| consumer CSS reaches cells | ✅ (F10) | ✅ (S-C) |
| nothing leaks out | ✅ | ✅ (S-C3, and the harness measures 0 document sheets) |
| authorable in HTML / SSR-safe | ✅ no table elements involved | ❌ **S-P** |
| implicit ARIA table semantics | ❌ needs explicit roles | ✅ |
| consistent with the other 71 elements | ✅ | ❌ only light-DOM element |
| framework owns host children | ✅ not an issue | ⚠️ component self-appends into its host |
| Lit `render()` clobbering hazard | ✅ none | ⚠️ real (`mp-card.element.ts:13-16`) |

**D2 now wins on four criteria and loses on one.** D8's single advantage —
retaining implicit table semantics — is bought at the cost of an SSR-unsafe
structure, and S4 shows the custom-element family would have needed explicit
roles anyway (a `<mp-td>` is not a `<td>`). Recommendation: **revert to D2**,
which was rejected for being more expensive, not for being wrong.

### 15.6 What this overturned

D2 (drop `<table>` for grid) and D3 (hand-written ARIA roles) were both premised
on F9 being unavoidable. S-C shows it is avoidable: the boundary only has to be
crossed if the component insists on owning the table inside its shadow root. It
does not have to. The cheaper, more conservative design keeps the real table,
keeps implicit accessibility semantics, keeps every existing layout mechanism,
and needs no per-row slot bookkeeping.

Subgrid (D11) goes with it — it was a replacement for table layout, and there is
now no table layout to replace.

## 19. Locked design (2026-08-25) — supersedes the decision churn above

This section is authoritative. §6's table records how the design was reached,
including two reversals; where they conflict, §19 wins.

### 19.1 The one mechanism

**Consumer-supplied content is slotted. Always. Nothing else.** A slotted node
stays a document node at every depth, so page CSS reaches it and the component's
shadow styles stay sealed. Measured in both directions (§15, and the harness at
`docs/prd/_spike-table-badge-shadow.html`).

| decision | state |
|---|---|
| **D1** slot all consumer content | **LOCKED** |
| **D2** datatable → CSS grid + `subgrid`, cells slotted | **REINSTATED** — was superseded by D8, now restored |
| **D3** explicit ARIA roles on the grid | **REINSTATED** with D2 |
| **D5/D6** `mp-badge`, shadow-styled, `text-bg-*` semantics | LOCKED |
| **D7** `mp-card` global sheet → shadow | LOCKED |
| ~~**D8**~~ light-DOM real table | **RETIRED** — §15.7 (SSR-unsafe) + §15.8 (page CSS wins over its own nodes) |
| ~~**D9**~~ owned cells as custom elements *in a real table* | **RETIRED with D8.** The self-styling-element idea survives inside D10. |
| **D10** `mp-table` element family | **LOCKED, reshaped** — see 19.3 |
| ~~**D11**~~ subgrid not used | **RETIRED** — subgrid returns with D2 |
| **D12/D13** directives need no work; hoist `_styles/buttons` | LOCKED |

### 19.2 Why D8 lost, in one line each

- **§15.7** — the HTML parser forbids mixing custom elements with a real
  `<table>`; D8's structure cannot survive being re-parsed, which SSR does.
- **§15.8 / the harness** — a component's own light-DOM node loses to an
  identically-named page rule. Styles don't leak *out* of D8; they leak *in*.
- **S4** — a `<mp-td>` is not a `<td>`, so D8 needed explicit ARIA roles anyway.
  Its one advantage over D2 was never real.

### 19.3 `mp-table` is a family of self-styling elements, not a wrapper

**You cannot `@import` `bootstrap/scss/tables` into `mp-table` and have it
work.** Measured on background-colour alone, on a blank page:

| shadow rule in `mp-table` | wanted | got |
|---|---|---|
| `:host > :not(caption) > * > *` (Bootstrap's cell rule) | `rgb(255,0,255)` | **`rgba(0,0,0,0)`** |
| `::slotted(tbody)` — depth-1 control | applied | applied |

Every rule in `_tables.scss` is a descendant or child selector rooted at
`.table` (`.table > :not(caption) > * > *`,
`.table-striped > tbody > tr:nth-of-type(odd) > *`,
`.table-hover > tbody > tr:hover > *`). A shadow sheet reaches shadow-tree nodes
plus **depth-1** assigned nodes via `::slotted()`, which takes a compound
selector and no combinators. Slotted `<tbody>` is reachable; `<tr>` and `<td>`
inside it are not. The import compiles fine and styles nothing — no error, no
warning.

Re-importing the partial into `mp-tr`/`mp-td` does not help either: the
selectors still expect a `.table` ancestor that is not in their tree. **The
rules must be re-expressed as `:host` rules.** Measured working:

| mechanism | result |
|---|---|
| `mp-td`: `:host { display: table-cell; background: var(--mp-cell-bg, transparent) }` | ✅ |
| striping via `:host(:nth-of-type(odd))` **on the row** | ✅ row 0 `rgb(240,240,240)`, row 1 transparent |
| row → cell channel by inherited custom property | ✅ |
| row hover via `:host(:hover) { --mp-cell-bg: … }` | ✅ |
| consumer's own `<td>` still page-styled alongside | ✅ |

`:nth-of-type` works because it is evaluated against the host in **its own**
tree, so a row knows its position without the table telling it. Variant flags
(`striped`, `bordered`, `sm`) travel the same way: `mp-table` sets a custom
property on `:host([striped])` and it inherits through every boundary.

The shared sheet lives in `_styles/table.styles.scss` and is adopted by all
three elements — one `CSSResult`, one parsed `CSSStyleSheet`, N roots
(`_styles/form-control.styles.scss` precedent).

**R8 — this is a hand-rewrite of Bootstrap's table CSS, not a pass-through.** It
drifts on every Bootstrap upgrade with nothing to catch it — the same objection
§18.5 raises against `tab-control`'s hand-copied utilities, and the reason
`_styles/form-check.styles.scss:9-11` chose pass-through. Here pass-through is
structurally unavailable. *Mitigation:* pin the Bootstrap minor, and add a
visual-diff test against a plain `.table`.

### 19.4 Measurement discipline (learned the hard way, twice)

**Assert on `background-color` only.** In this codebase's probes, `padding` was
silently supplied by a harness `td` rule, and `outline-width` reported `3px`
because `medium` is the *initial computed value* even when `outline-style: none`
— both produced a wrong verdict before being caught. Background is transparent
by default and nothing else sets it. Any future spike here follows the same rule,
and the harness already does.

## 18. The 16 class-stamping directives — why they need no work

### 18.1 The platform fact that settles it

**A slotted subtree, and a custom element's own light-DOM subtree, remain
document nodes at every depth.** §15.3 measured depth-1 (`p-2`, `text-danger` on
a consumer `<td>`); the same holds for a `<div bsRow>` five levels inside that
cell, because no part of it is in a shadow tree. Document CSS reaches shadow
content *never* and light content *always*.

So once D1/D8 put consumer content in the light DOM, every stamped class
resolves again. 14 of the 16 are fixed with **zero code changes**:
`[color]`→`.btn`, `[bsRow]`, `[col]`, `[xxs..xxl]`, `[bsColFormLabel]`,
`[class.form-control]`, the modal/popover/placeholder markers, `label[bsFor]`,
and the dropdown markers (already solved — see 18.3).

### 18.2 Two genuine bugs found on the way, neither about shadow DOM

- **`[bsFormGroup]` stamps `.form-group`, which is defined nowhere.** Bootstrap 5
  removed it; it is not in `node_modules/bootstrap/scss/**` nor in this repo
  (`form-group.directive.ts:6`). Dead today. Define it or delete the directive.
- **`libs/mintplayer-ng-bootstrap/dropdown-divider/` is an orphan duplicate** of
  `dropdown-menu/src/directives/dropdown-divider.directive.ts`. Only the latter
  is styled (`dropdown-menu/src/styles/…:115`). Delete the legacy package.

### 18.3 The working precedent, already in the repo

`dropdown-menu/src/styles/dropdown-menu.styles.scss:72-128` re-expresses every
Bootstrap dropdown rule as `::slotted(.dropdown-item)` etc., with a comment at
`:62-71` explaining why. Marker classes are direct slot children by
construction, which is the one place `::slotted()`'s depth-1 limit is
sufficient. When modal/popover/placeholder become WCs they follow this, **not**
an `mp-modal-body` element.

### 18.4 Facts that correct the F5 census

- **`.row`/`.col-*` are not global.** `_bootstrap.scss:37` comments out
  `bootstrap/scss/grid`; they come only from `bs-grid`'s `:host ::ng-deep` block,
  i.e. descendant rules keyed on a `bs-grid` ancestor. They still work under D1
  because selector matching uses the flat tree, in which a light-DOM ancestor
  outside the component is still an ancestor of slotted content.
  *Caveat to write down:* Bootstrap's `.row > *` gutter rule is a **child**
  combinator, so it survives only while a `.row` is slotted as one unit. **Never
  slot the columns of a row individually.**
- **`form.component.scss:1` is `/*:host*/ ::ng-deep`** — `:host` is commented
  out, so `.form-control` compiles to a fully unscoped document rule that Angular
  inserts *lazily*, only once a `<bs-form>` has been instantiated. Pre-existing
  and unrelated to shadow DOM, but fragile enough to deserve a comment before
  someone "fixes" it into a regression.

### 18.5 Why the tab-control pattern must not be extended

`tab-control.styles.scss:20-21` hand-copies eight Bootstrap utilities rather than
importing `utilities/_api`, citing ~50 KB. Measured: the full utilities build is
68,977 B minified / 7,825 B gzip; `responsive:false, print:false` drops it to
28,400 B / 4,084 B.

The size premise assumes **per-component injection**. Under the `_styles/`
shared-`CSSResult` model it is false — one `CSSResult` is one `CSSStyleSheet`
adopted by N roots: one parse, one copy, N references.

But the sheet is still the wrong shape, for reasons independent of size:

1. It resurrects **D4** in disguise — a utility a component uses internally
   becomes silently overridable, and `.border { … !important }` fights the
   component's own rules.
2. It fixes only *Bootstrap's* utilities. A consumer's own `.my-app-chip` still
   dies. G1/G2 need the general case, which only D1 delivers.
3. Hand-copies drift silently. `tab-control.styles.scss:37-39` re-implements
   `.border` with its own `!important` and fallback, and nothing asserts it
   matches Bootstrap's output. Note `_styles/form-check.styles.scss:9-11` and
   `form-control.styles.scss:13-14` explicitly chose **pass-through** for exactly
   this reason. The repo currently holds both policies; pass-through wins.

Keep tab-control's eight rules; do not grow them. A second consumer promotes
them to `_styles/` as a pass-through.

### 18.6 The risk in D12, stated plainly

D12 is a **convention with no compile-time failure mode**, guarding a bug that
reads as cosmetic. Every other decision here is structural — D8 either lays out
or it doesn't. D12 depends on a reviewer noticing that a new `xRenderer` appends
into a shadow root.

The original bug survived precisely this way: `datatable.styles.scss:84-92`
coincidentally declared `white-space: nowrap`, so the one utility the demos used
appeared to work while 21 of 22 were dead — and the two that are correctness
bugs (`d-none` showing hidden content, `visually-hidden` computing
`position: static`) are invisible by definition. Nobody screenshots a class whose
job is to be invisible.

**Mitigation is not optional:** a conformance guard that asserts the *cause*, not
the symptom — for every renderer-bearing WC, pass in a probe node and assert
`probe.getRootNode() === document`. Symptom-level assertions are exactly what
coincidental coverage defeats.

## 16. Open questions

- ~~**Q1** Does D2 (table → grid) get taken now…~~ **Resolved 2026-08-25 by the
  user: no.** The user rejected dropping `<table>` and proposed an `mp-table` WC
  holding the Bootstrap table styles, reusable inside `mp-datatable`. Spiked in
  §15; it works and is cheaper. D2/D3 superseded by D8–D10.
- ~~**Q1b** Use subgrid to line body columns up with header columns.~~
  **Approved by the user, then made moot by the resolution of Q1** — see D11.
  With a real `<table>` there is nothing to align manually.
- ~~**Q2** F5's 46 components: successor PRD, or does a first wave belong in this
  one?~~ **Resolved 2026-08-25 by the user: fold them all into this PR.** See G8
  for the honest justification (parity and defence in depth, not shadow safety)
  and §17 for the classification that scopes it.
- ~~**Q5** The 16 class-stamping **directives** cannot become web components…~~
  **Resolved 2026-08-25 by investigation, not by preference: they need no work
  at all.** D1 fixes 14 of 16 for free; the other 2 are unrelated pre-existing
  bugs. See D12/D13 and §18. The `[color]`-on-a-plain-`<button>` API stands.
- **Q6** Does the overlay family (`bs-modal`, `bs-offcanvas`, `bs-popover`,
  `bs-tooltip`, `bs-toast`) get converted off **Angular CDK**? React and Vue
  cannot use CDK, so wrappers for them require moving onto the workspace's own
  `overlay/` `OverlayController`. That is the single largest item in G8 and it
  is invisible in the F5 census.
- **Q3** Does `mp-datatable` expose `mp-td` to consumers as the "give me library
  cell chrome" opt-in, or stay plain-`<td>`-only for consumer cells? §7.1b assumes
  the former; it costs one exported element and no extra machinery.
- **Q4** Does the `mp-table` family cover the full Bootstrap table surface
  (`table-striped`, `-bordered`, `-hover`, `-sm`, responsive) in this pass, or
  only what `mp-datatable` and the current `bs-table` demo consume?
