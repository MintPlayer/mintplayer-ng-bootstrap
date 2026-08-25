# PRD — per-component Bootstrap CSS, and the shadow boundary

**Status:** Proposed · 2026-08-25
Plan: [per-component-bootstrap-css-plan.md](./per-component-bootstrap-css-plan.md)
Spike harness: [`_spike-shadow-css-channels.html`](./_spike-shadow-css-channels.html)
Supersedes: `docs/prd/shadow-boundary-css.md` (deleted — its framing was wrong; see §1.1)

Grounded in a 4-agent survey of the workspace at `master@1277ff1e`, a
selector-by-selector read of Bootstrap 5.3.8 in `node_modules/`, real
`dart-sass 1.102.0 --style=compressed` size measurements, and ~20 browser spikes
run in Chromium 151 against the live demo and a blank page. Every number below
is measured. Where a claim is a code reading rather than a measurement, it says
so.

**Measurement discipline used throughout: assert on `background-color` only.**
Two earlier rounds produced wrong verdicts because `padding` was silently
supplied by a harness rule and `outline-width` reports `3px` (the initial
`medium`) even when `outline-style: none`. Background is transparent by default
and nothing else sets it.

## 1. The premise

**Bootstrap *component* stylesheets ship per-component. Only cross-cutting CSS is
global.** `libs/mintplayer-ng-bootstrap/_bootstrap.scss` deliberately comments
out 22 component partials (`card` :74, `accordion` :75, `badge` :78, `tables`
:38, …) and keeps `reboot`, `type`, `helpers` and the utilities API. A consumer
who never uses an accordion never downloads accordion CSS.

This is the project's reason to exist, not an implementation detail. Measured,
it is worth **104,365 B minified / 14,557 B gzipped** — 44.7% of full Bootstrap
minified, 46.4% gzipped (§15.4).

Each Bootstrap component's stylesheet therefore lives inside exactly one `mp-*`
web component's shadow root, and the framework wrappers (`bs-*`, React, Vue)
reconstruct the element tree rather than emitting Bootstrap classes.

### 1.1 What the superseded PRD got wrong

`shadow-boundary-css.md` concluded that `mp-card` and `bs-table` should be fixed
by **uncommenting their partials in `_bootstrap.scss`**. That is premise-level
wrong: it would ship card and table CSS to every consumer, which is precisely
what the project exists to avoid. It also framed the problem as "nesting web
components breaks styles", which is false (§3.1). Both errors are corrected
here, and the old document is deleted rather than amended.

## 2. The one rule

**A stylesheet reaches only its own tree.** Everything else follows.

- A shadow stylesheet styles its own shadow tree, plus directly-assigned slotted
  children through `::slotted()`.
- A document stylesheet styles the document tree, at **any depth**.
- Slotting never moves a node between trees. A slotted node stays a document
  node however deeply it is projected.

Breakage is always the same shape: **styles in one tree, the markup they target
in another.**

## 3. Current state

### 3.1 Nesting web components is NOT the problem

Measured (§15.1): `mp-badge` three slot hops deep inside a table family renders
identically to top level; a four-level chain of families each carrying its own
partial styles correctly at every level; tokens cross every boundary. Two
self-contained WCs nested arbitrarily deep are fine — a component's own
selectors never need to cross a boundary, because they are already inside with
the markup they style.

### 3.2 F1 — the reported bug: consumer content rendered into a shadow root

`<bs-badge>` inside a `<bs-datatable>` `*bsRowTemplate` renders unstyled. The
wrapper builds row DOM with `createEmbeddedView`
(`datatable.component.ts:342-373`) and the WC appends it into its shadow `<tr>`
(`mp-datatable.ts:1002-1024`). Measured, identical node inside vs outside:
`background-color` `rgba(0,0,0,0)` vs `rgb(220,53,69)`; `padding` `0px` vs
`4.2px 7.8px`; `border-radius` `0px` vs `6px`.

**21 of 22 Bootstrap utilities are dead** in a row template. Two are correctness
bugs, not cosmetics:

- **`d-none` renders content the consumer hid.**
- **`visually-hidden` computes `position: static`** — screen-reader-only text
  becomes visible.

`text-nowrap` is the only survivor, by accident: `datatable.styles.scss:84-92`
happens to declare `white-space: nowrap`. That coincidence is why this went
unnoticed for so long.

**Five WCs do this**: `mp-datatable` (`rowRenderer`, `cellRenderer`,
`headerRenderer`), `mp-query-builder` (`editorRegistry` →
`mp-query-condition.element.ts:144`), `mp-treeview` (`nodeRenderer`,
`iconResolver`), `mp-tree-select` (7 template properties), `mp-select`
(`optionRenderer`). Three are visibly broken in the demos today.

Verified **safe** (real slot projection): `mp-timeline`, `mint-dock-manager`,
`mp-tile-manager`, `mp-ribbon`. Chart `*Formatter` callbacks return plain
strings and are not exposures.

### 3.3 F2 — the library commits the defect against itself

- **`mp-file-manager`** builds `DatatableColumnDef`s whose `cellRenderer`s use
  `.row-cell` / `.row-icon` / `.rename-input` (`mp-file-manager.ts:919-995`),
  declared in **its own** sheet (`file-manager.styles.scss:226-246`), rendered
  into **`mp-datatable`'s** shadow root. Plus `cellClass: 'text-nowrap'`, a
  global utility, equally dead.
- **`mp-timeline-item.icon`** renders a consumer-supplied Bootstrap-icons class
  **into its shadow root** (`mp-timeline-item.ts:233`). Shipped live in all
  three demos (`timeline.component.ts:61-64`, `TimelinePage.tsx:19-22`,
  `TimelineView.vue:17-20`).
- **`TimelineItem.cssClass`** — "extra class on the rendered row", applied to a
  shadow node (`mp-timeline.ts:331`). Structurally dead since written.

### 3.4 F3 — five premise violations shipping global CSS

| # | what | cost |
|---|---|---|
| **V1** | `_bootstrap.scss:2` (`bootstrap-utilities.scss`) already emits `root`+`helpers`+`utilities/api`; `:32`, `:93`, `:96` emit them **again** | **84,078 B min / 10,780 B gz wasted — 44.5% of the global sheet** |
| **V2** | `mp-card.element.ts:62-70` auto-injects card chrome **and `.text-bg-*` utilities with `!important`** into `document.head` | breaks consumer Bootstrap; the utility copy is functionally wrong (§3.5) |
| **V3** | `form.component.scss:1` is `/*:host*/ ::ng-deep` — `:host` **commented out**, shipping the whole Bootstrap forms family unprefixed | 10,924 B min / 2,375 B gz |
| **V4** | `dropdown-menu` ships unnamespaced `.dropdown-item > a` from three places (`dropdown-menu.component.ts:43` + React/Vue `dropdown-menu.css`) | hits any Bootstrap dropdown on the page |
| **V5** | `bootstrap/scss/buttons` compiled 5× — global `:40` plus `query-builder` ×3 and `toggle-button` | ~62 KB min of `.btn` CSS |

V1 is free to fix and is the single largest win in this PRD.

### 3.5 F4 — 19 hand-copied utilities, all drifted

No WC imports `utilities/api`; components hand-copy instead. **19 rule sites
across 9 files, 19/19 drifted, and 16 omit `!important`** — inverting a
utility's entire contract, since `$enable-important-utilities: true`.

`.visually-hidden` exists in **six** mutually different bodies, using **two
different clipping strategies** (`clip: rect()` vs `clip-path: inset(50%)`), one
of them (`trend-chart.styles.scss:120-127`) omitting the `margin: -1px` that is
Bootstrap's own twbs#25686 fix. A seventh is under the Bootstrap-4 name
`.sr-only` (`code-snippet.styles.scss:311-325`).

Worst: `card-global.styles.scss:97-102` re-implements `.text-bg-*` with
`RGBA($value, …)` — the **compile-time** colour — where Bootstrap emits
`RGBA(var(--bs-*-rgb), …)`. So it cannot retint at runtime and does not follow
dark mode. And per V2 it is injected globally, where it can shadow the
consumer's correct copy.

### 3.6 F5 — 46 shadow-unsafe Angular components, and why that number misleads

30 import a Bootstrap partial under `:host ::ng-deep`; 16 rely on global
utilities. **But after the fix in §5, almost none is reachable-broken**: a
`bs-*` component only loses its styles when it lands inside a shadow root, and
once consumer content is slotted, the only remaining doors are library-internal
and **every one of them accepts a string, not an element**. The overlay family
(modal, offcanvas, popover, tooltip, toast, context-menu) is a **false
positive** — verified: no custom `OverlayContainer` exists, so CDK attaches to
`document.body`, outside every shadow root. Only `bs-typeahead` is genuinely
broken there.

The real reasons to convert the 46 are **framework parity** (React and Vue are
missing 30+ visual components, badge included) and **killing the `::ng-deep`
pattern** — not shadow safety. §6 says so honestly.

## 4. The mechanism vocabulary

Measured. This is the complete toolkit; every design decision below picks from it.

| # | mechanism | reach | legal form |
|---|---|---|---|
| **M1** | `::slotted(X)` | directly-assigned children, **one level** | `X` a single **compound** — `:not()`, `:first-child`, `.a.b` OK; `>` `+` descendant **illegal** |
| **M2** | `:host(X)` | the host, evaluated in its **light** tree | `X` compound |
| **M3** | **inherited custom property** | **every** boundary, unlimited depth, cross-family | the real replacement for a descendant selector |
| **M4** | `:host(...) ::slotted(X)` | shadow compound + combinator, `::slotted` last | valid; **the most under-used tool here** |
| **M5** | JS `slotchange` stamping | anything | the escape hatch when CSS cannot express it |
| **M6** | container query | crosses shadow boundaries (measured, 3 engines) | replaces breakpoint-descendant blocks |

### What does NOT work

| attempted | result |
|---|---|
| document CSS into a shadow root | ❌ never, at any depth |
| `::slotted()` reaching a **grandchild** | ❌ nothing reaches |
| `::slotted(a + b)` — combinator inside | ❌ invalid, silently dropped |
| `:host(:has(x))` **and** `:host:has(x)` | ❌ **both fail** — `:has()` is supported, but a shadow rule cannot see light children |
| `:host-context()` | ❌ Chromium-only — reject |
| `[data-bs-theme]` ancestor selectors from inside a shadow root | ❌ use `color-scheme` + `light-dark()` |
| `@keyframes` crossing a boundary | ❌ tree-scoped; duplicate into each root |
| a `<slot>` inside `<tr>`, or `slot { display: table-row-group }` | ❌ table layout does not cross the flat tree |

### 4.1 The two positional traps

**`:host(:first-of-type)` is framework-conditional and fails loudly.** Measured
(§15.3): with direct children (React/Vue) → `FIRST, middle, LAST`. With an
Angular wrapper interposed → **`LAST, LAST, LAST`** — each `mp-item` is the only
child of its own `bs-item`, so `:first-of-type` *and* `:last-of-type` match
every item. `display: contents` on the wrapper does not help.

**`::slotted(mp-foo)` misses in Angular** — the wrapper host is what gets
slotted. Live instance, acknowledged in its own source:
`mp-quick-access-toolbar.element.ts:68-72`. It only looks fine because
`ribbon-button.component.ts:24` sets `:host { display: inline-flex }` and
accidentally compensates.

**Both have the same root cause and the same fix hierarchy:**

1. **Parent styles via `::slotted(:first-child)`** — matches the `bs-*` host
   correctly. Works in all three frameworks. **Default to this.**
2. `:host(:first-of-type)` on the child — React/Vue only. **Do not use.**
3. M5 stamping — always works.

So M5 is not a rare escape hatch; it is the fallback for **every** positional
Bootstrap rule under an Angular wrapper: list-group radii, breadcrumb
separators, card header/footer radii, accordion first/last, pagination ends.

## 5. Goals

- **G1** Bootstrap utilities and a consumer's own CSS work inside any wrapper's
  slots, at any depth.
- **G2** Every Bootstrap component's stylesheet lives in exactly one `mp-*`
  shadow root; nothing component-scoped is global.
- **G3** Wrappers nest freely (`bs-card` > `bs-accordion` > `bs-badge`) and stay
  styled, in all three frameworks.
- **G4** No component injects into `document.head`.
- **G5** The global layer is exactly: reboot, type, helpers, utilities, tokens —
  emitted **once**.
- **G6** The library stops committing the defect against itself (§3.3).
- **G7** The rules and their measured evidence are written where the next author
  will hit them: `CLAUDE.md`, plus a conformance guard that fails the build.

## 6. Non-goals

- **Converting all 46 F5 components in this PR.** The census is recorded so
  nothing is lost, and §10 orders it, but the mechanism plus the demonstrably
  broken components come first. Honest justification for eventual conversion is
  parity and killing `::ng-deep` — **not** shadow safety (§3.6).
- **Shipping any component partial globally.** Explicitly rejected; it is the
  premise-level error of the superseded PRD.
- **A light-DOM `<table class="table">` authoring form.** Structurally
  impossible under the premise — see D6.
- **Adopting `document.styleSheets` into shadow roots.** Breaks G2 inward,
  throws on cross-origin sheets, needs a `MutationObserver` for Angular's lazy
  injection, and re-parses Bootstrap per instance.
- **`:host-context()`** anywhere. Chromium-only.

## 7. Decisions

| # | decision | consequence |
|---|---|---|
| **D1** | **Consumer-supplied content is slotted, never rendered into a shadow root.** | The whole of G1. Applies to all five exposures in §3.2. Enforced by the D9 guard, not by convention. |
| **D2** | **Prefer the monolith.** One element owns the whole shadow root; sub-elements are inert markers whose stylesheet is `:host { display: block }`. | Bootstrap's descendant selectors become ordinary intra-tree rules and **the problem disappears** rather than being solved. Reference: `mp-accordion` + `mp-accordion-tab`. |
| **D3** | **Children are recognised by marker ATTRIBUTE, never by tag name.** | Kills the `::slotted(mp-foo)` trap at the root: no selector names a tag, so a wrapper host can be the marker. `mp-accordion.ts:216-221`. |
| **D4** | Where a monolith will not do, use the **distributed** pattern: children import no partial and read the parent's `--bs-*` tokens (M3) with **literal** fallbacks. | Reference: `navbar`. Never `$bs-*` Sass vars as fallbacks — they are themselves `var(--bs-*)`. |
| **D5** | **Positional rules come from the parent via `::slotted(:first-child)`**, or from M5 stamping. Never `:host(:first-of-type)`. | §4.1. Framework-conditional failure that is invisible in React and Vue. |
| **D6** | **`mp-table` renders its table from a data model inside its own shadow root.** No `mp-tr`/`mp-td` family; no light-DOM `<table class="table">`. | Three independent reasons: the HTML parser ejects custom elements from a real table (§15.2); `::slotted()` cannot reach the cell layer three levels down; `_tables.scss` is *entirely* descendant selectors. `mp-datatable` already does this. |
| **D7** | **`mp-datatable` keeps its `<table>` in its own shadow root** and slots only cell *contents*. | Follows from D6. Consumer cell content is slotted, so G1 holds for what the consumer writes. |
| **D8** | **Anything shared by ≥2 elements goes in `_styles/<name>.styles.scss`** as a pass-through, composed into `static styles`. | One `CSSResult` → one parsed `CSSStyleSheet` → N roots. Verified in the built output: Rollup hoists multi-consumer sheets into one shared chunk. Fixes V5. |
| **D9** | **A conformance guard asserts the cause, not the symptom**: for every renderer-bearing WC, a probe node's `getRootNode() === document`. | D1 is otherwise a convention with no compile-time failure, guarding a bug that reads as cosmetic. §12 R1. |
| **D10** | **`_bootstrap.scss` imports config-only from `bootstrap-utilities`**, emitting `root`/`helpers`/`utilities/api` exactly once. | Fixes V1: −84,078 B min / −10,780 B gz. Note the second `utilities/api` pass is currently the only *complete* one (it includes the four custom utility sheets), so the dedup must keep that ordering. |
| **D11** | **`buttons` stays global at `:40`, with a comment explaining why.** | `BsButtonTypeDirective` puts `.btn` on the consumer's own light-DOM `<button>`; there is no `bs-button` and therefore no shadow root that could own it. The `--bs-primary` rebind at `:46-68` depends on it. Deliberate, currently undocumented, reads as drift. |
| **D12** | **A shared `_styles/utilities.styles.scss` of Sass mixins** replaces the 19 hand-copied utilities. | Mixins, not a `CSSResult`: a class-based sheet inside a shadow root resurrects the inward-leak problem. Model: `_styles/focus-ring.styles.scss`. |

## 8. Per-component architecture

From a selector-by-selector classification of Bootstrap 5.3.8 (§15.5).

| shape | components |
|---|---|
| **ONE element** | badge, alert, spinner, placeholder, close, progress, modal, dropdown(+item), tooltip, popover, offcanvas, carousel, button-group *(+M5)* |
| **SMALL FAMILY (2–3)** | breadcrumb, toast, list-group, pagination, accordion *(built)* |
| **LARGE FAMILY (5–6)** | card, nav, navbar *(partly built)* |
| **DATA-MODEL ONLY** | **tables** — D6 |

**The var channel is Bootstrap's own design, not a workaround.** Six partials
declare custom properties on a *container* that only *descendants* consume.
`.accordion` declares **22 vars and no properties at all** — it exists purely to
publish an inherited block. `.navbar-nav` re-declares 7 `--bs-nav-link-*` from
`--bs-navbar-*`: an explicit cross-component bridge. Copy this; invent nothing
where Bootstrap already has a var.

**Three partials declare zero custom properties** — `button-group`,
`placeholders`, `transitions` — so M3 does not exist for them and vars must be
invented. `button-group` is acute: its `.btn-check:checked + .btn` rules are
sibling-based and buttons have no shadow root, so there is **no pure-CSS
answer** — M5 is mandatory.

**Minimum invented-var set**: `--bs-badge-top`; `--bs-nav-link-active-color`;
`--bs-nav-tabs-border-width` defaulted to 0 on `.nav`; `--bs-dropdown-position`;
`--bs-btn-close-padding-x/-y` + `-margin-{top,right,bottom,left}`;
`--mp-placeholder-animation`; a `--bs-btn-*` block for button-group geometry.

**Existing opt-in hooks to reuse** (consumed by Bootstrap, never declared):
`--bs-breadcrumb-divider`, `--bs-dropdown-item-border-radius`,
`--bs-btn-close-filter`, `--bs-scroll-height`.

## 9. Wrapper reconstruction

An Angular component renders **inside its own host**, so `<bs-accordion-tab>`
cannot render `<mp-accordion-tab>` *and* be the slotted child — the element
would sit one level too deep. `accordion-tab.component.ts:16-21` records this.
Four patterns exist; pick per family.

| pattern | shape | used by |
|---|---|---|
| **A** — the `bs-*` host **is** the marker | host bindings only (`accordion-tab`, `[attr.slot]`, state attrs); template is `<ng-content>`; no `mp-child` | accordion, tab-control |
| **B** — nested host + `display: contents` | `bs-*` renders `mp-*`; `[attr.slot]` on the `bs-*` host | navbar, ribbon, card root |
| **C** — hoist a `TemplateRef` | child content must become a **sibling** in the parent's light DOM | accordion headers, tile-manager, timeline |
| **D** — class-bearing hosts + global sheet | **anti-pattern** — card's current route | card *(to be replaced)* |

**Pattern A is the default**, because it composes with D3: no tag is ever named,
so nothing can miss.

`display: contents` fixes **layout only** — the flat tree still assigns the
`bs-*` host, with `mp-*` one level deeper. It must be static CSS, never applied
from JS, or the no-JS SSR first paint differs (`navbar-nav.component.ts:14`).

React roots at the tag via `@lit/react`, so composition is naturally correct;
children contributing sibling nodes return a **fragment**. Vue SFCs are
multi-root and need no wrapper, but named slots on a custom element require the
literal `slot="name"` attribute, and parent numbering must flatten Fragment
vnodes first.

**Wrapper CSS budget: `:host { display: … }` and nothing else.** Target shape
confirmed — `bs-checkbox` carries zero CSS; `select.component.scss` is 6 lines
with the rationale in a comment. Current offenders: `tab-control.component.scss`
(**131 lines**, including a `::ng-deep` `nav` import), `tile-header.component.ts:6-25`
(gradient/border chrome), `file-manager.component.scss:5`.

**`bsForwardAria` is missing from ~25 wrappers** — every `bs-ribbon-*`, all
`bs-card*`, `bs-navbar-brand/item/nav`, `bs-tab-control`. Each is a dropped
consumer `aria-label`/`role`. Pattern-A children do not need it (their host *is*
the slotted element).

## 10. Scope and order

**Wave 0 — mechanism and free wins.** D10 dedup (−10.8 KB gz), D9 guard, the
`CLAUDE.md` rules, V3 (`:host` uncomment), the §3.3 self-inflicted bugs,
`_styles/buttons` hoist (D8, −37 KB), delete the orphan
`dropdown-divider` package, fix `[bsFormGroup]`'s `.form-group` (a class
Bootstrap 5 removed and nothing defines).

**Wave 1 — D1 slot projection** for the five §3.2 exposures. Treeview,
query-builder, tree-select and select need **no layout change** (flex/block
already project correctly); datatable is D7.

**Wave 2 — `mp-badge`** + three wrappers. Smallest partial (564 B), one element,
closes the parity gap, and is the reported bug's component.

**Wave 3 — the ONE-element components**: spinner, close, alert, progress,
placeholder, button-group (+M5).

**Wave 4 — the small families**: breadcrumb, toast, list-group, pagination.

**Wave 5 — card** (V2 + the large family), then nav/navbar.

**Wave 6 — the overlay family**, which is a *parity* project, not a styling one:
it must move off Angular CDK onto the workspace's own `OverlayController` before
React/Vue wrappers are possible. Gap list and ordering exist; treat as a
successor PRD unless explicitly folded in.

## 11. Testing

- **The D9 conformance guard** — per renderer-bearing WC, assert a probe node's
  `getRootNode() === document`. Catches the cause; symptom-level assertions are
  defeated by coincidental coverage.
- **A computed-style regression spec** — `p-2 d-none visually-hidden text-danger`
  probes in a row template, asserted against the same nodes in the light DOM.
  This is the test that would have caught the original report.
- Per-WC `*.aria.spec.ts` including **states**, not just initial render.
- A wrapper-transparency spec per framework: `aria-label`/`role`/`id`/`tabindex`
  on the `bs-*` must land on the `mp-*`.
- **A `!important` lint on `_styles/utilities.styles.scss`** — 16 of 19 hand
  copies dropped it; the mixin must not.
- A size assertion on the built global sheet, so V1 cannot regress.
- Drive wrapper spec inputs from a `signal()`, never a mutable field.
- The usual: batch every suite into one final sweep; verify milestones by
  reading + `tsc --noEmit`.

## 12. Risks

- **R1 — D1 is a convention with no compile-time failure**, guarding a bug that
  reads as cosmetic. The original survived because one utility worked by
  accident. *Mitigation:* D9, and it is not optional.
- **R2 — the positional traps are invisible in two frameworks out of three**
  (§4.1). *Mitigation:* D5 plus a three-framework spec per family.
- **R3 — per-framework slot semantics differ.** Vue tree-select renders scoped
  slots into *detached* containers; React roots at the tag; Angular interposes a
  host. *Mitigation:* validate three times, never once.
- **R4 — `.list-group-numbered` uses CSS counters across a boundary**
  (`_list-group.scss:35-44`). Counter propagation across shadow roots is not
  reliable. *Mitigation:* prototype before committing; fallback is JS ordinals.
- **R5 — a shared sheet duplicated across two entrypoint chunks silently becomes
  two `CSSStyleSheet`s**, with no visual symptom. *Mitigation:* assert on the
  built output.
- **R6 — `@keyframes` are tree-scoped** and must be duplicated into every
  animating shadow root (`progress-bar-stripes`, `spinner-border`,
  `spinner-grow`, `placeholder-glow`, `placeholder-wave`). Easy to miss; the
  animation simply does not run.
- **R7 — Chromium-only evidence.** Every measurement is Chromium 151. Subgrid,
  container queries and `::slotted()` semantics need Firefox + WebKit
  confirmation (S1).
- **R8 — scope.** Six waves is a programme. §6 and §10 keep it visible; the
  first two waves stand alone.

## 13. Versioning

Breaking: `mp-card`'s sub-parts become elements; `bs-table`/`bs-table-styles`
lose their `::ng-deep` import; every converted component's `::ng-deep` Bootstrap
import is deleted, so consumers relying on it leaking onto their own markup lose
it. `mp-datatable`'s `rowRenderer` becomes slot-based.

Non-breaking: the V1 dedup, the D9 guard, `mp-badge` and the other new elements,
the `_styles` hoists.

Documented, no shims, per house policy.

## 14. References

- Spike harness: `docs/prd/_spike-shadow-css-channels.html` — open in a browser,
  no build. All colour-based.
- `CLAUDE.md` — the `::slotted()` cascade order, the "never name `mp-*` tags"
  trap (#400), `container-type` host collapse, Bootstrap `color-scheme` /
  `light-dark()`.
- `libs/mintplayer-web-components/accordion/` — the D2/D3 reference.
- `libs/mintplayer-web-components/navbar/` — the D4 reference.
- `libs/mintplayer-web-components/_styles/form-check.styles.scss:1-7` — the D8
  shared-`CSSResult` mechanics, stated in the source.
- `libs/mintplayer-web-components/input-group/src/styles/input-group.styles.scss:44-129`
  — the definitive cascade-order document, and the 0px-control post-mortem.
- Bootstrap 5.3.8 in `node_modules/bootstrap/scss/`.

## 15. Measured evidence

### 15.1 Nesting works (§3.1)

`x-card > x-card-body > x-accordion > x-acc-tab > consumer`, each element
carrying its own partial, nothing global but utilities:

| check | result |
|---|---|
| every element styled from its own shadow sheet | ✅ |
| `bg-primary text-white rounded border` on consumer content **4 slot hops deep** | `rgb(13,110,253)`, `#fff`, `6px`, `1px` |
| the deeply-slotted consumer node's root | **`document`** |
| accordion token → its tab; card token → card-body | ✅ `rgb(150,0,150)`, `16px` |
| document stylesheets added by components | **0** |

`mp-badge` three slot hops deep: own shadow styling RED, page CSS on its host
GREEN, ancestor `:host([striped])` token reaching the cell — all ✅.

### 15.2 The HTML parser forbids mixing custom elements with a real table

Authored as HTML **source**, so the tree-construction algorithm runs:

| shape | result |
|---|---|
| `<mp-table-el><mp-tr><mp-td>` — all custom | ✅ survives intact |
| `<table><tbody><tr><mp-td>` | ❌ `mp-td` **foster-parented out** of the table |
| `<mp-tr><td>` | ❌ the `<td>` **start tag is dropped**; only its text survives |

Mutually exclusive. `createElement` avoids it, but SSR output is re-parsed by
the browser. This is D6's first reason.

### 15.3 The positional trap

| shape | result |
|---|---|
| direct children (React/Vue) | `FIRST`, `middle`, `LAST` |
| Angular wrapper interposed | **`LAST`, `LAST`, `LAST`** |

### 15.4 Sizes (dart-sass 1.102.0, `--style=compressed`, gzip -9)

| scenario | min | gzip |
|---|---:|---:|
| Full `bootstrap/scss/bootstrap` | 233,479 | 31,399 |
| All 22 component partials — what per-component avoids | **104,365** | **14,557** |
| Current `_bootstrap.scss` output (with V1's double emission) | 189,014 | 25,388 |
| Deduplicated (D10) | **104,936** | **14,608** |

`utilities/api` alone is 68,977 / 7,803 — **66% of the remaining global sheet**.
Utilities, not components, are what the global layer costs.

Largest component partials: buttons 12,397 · list-group 12,287 · offcanvas
11,147 · navbar 10,010 · tables 6,984 · dropdown 6,631 · popover 6,226 · modal
5,839 · accordion 5,303 · card 4,447. Smallest: badge **564** · placeholders 625
· breadcrumb 994 · spinners 1,241.

### 15.5 Selector classification

Per-partial counts and the unreachable selectors are in the investigation
record; the verdicts are §8. The three shapes that force a decision:

- **descendant/multi-level** (`.accordion-item .accordion-button`,
  `.card-body .card-title`, `.table > * > * > *`) — unreachable from an
  ancestor's shadow sheet; forces monolith or family.
- **sibling** (`.breadcrumb-item + .breadcrumb-item`, `.btn-check:checked + .btn`)
  — `::slotted()` forbids combinators; forces D5.
- **var-only** (`.alert-#{$state}`, `.list-group-item-#{$state}`,
  `.table-active`) — free via M3.

## 16. Open questions

- **Q1** Wave 6 (overlay family off Angular CDK): in this PR, or a successor?
  It is a parity project, not a styling one, and it is the largest single item.
- **Q2** `.list-group-numbered` (R4) — prototype counters, or go straight to JS
  ordinals?
- **Q3** `bs-container` has one consumer and `display: contents` makes it
  unstyleable — delete it and fold `containers` into `bs-grid`, or keep?
- **Q4** `bs-floating-label`: Bootstrap's float mechanic is sibling-state CSS
  (`.form-control:focus ~ label`) that `::slotted()` cannot express. Converting
  means JS state mirroring plus re-implementing `:-webkit-autofill` detection,
  and a no-JS regression. Recommend **not** converting — confirm.
- **Q5** `images` at `_bootstrap.scss:35` puts `.figure*` (a component) in the
  cross-cutting sheet. 369 B — fix the classification or accept the wrinkle?
