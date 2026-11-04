# PRD — Bootstrap partials ship per component, attribute-scoped (issue #452)

Status: **accepted, implementation in progress** (2026-11-01; owner decisions in §5). Branch `fix/452-per-component-styles`, from master.
Supersedes the plan section of `per-component-styles-restart.md` (that file stays as the history of the
first attempt, PR #453).

## 1. Goal

The owner's invariants in `CLAUDE.md`:

- A component ships its own CSS and the Bootstrap partial its markup uses, and nothing else ships it.
- The global stylesheet of every app (Angular, React, Vue, the demos too) holds only the page-level
  baseline. That is root, reboot, type, images, buttons, helpers and utilities.
- Component code and component CSS ride the lazy chunk of the page that uses them.
- The mechanism is the same for all three framework fronts (and the Lit front).

The owner also asked for **encapsulation that works the same in every framework**, like Angular's emulated
view encapsulation. Our Bootstrap rules must match only DOM that a `@mintplayer` component rendered. They
must not match a consumer's own `.card` or `.table` elsewhere on the page.

## 2. Baseline (measured on master, 2026-11-01)

Measured with Angular `--stats-json` (the esbuild metafile) and Vite `--manifest`. CSS was parsed with
postcss and counted by selector, not by text match.

**Initial JS is already clean**, apart from one barrel leak:

| App | Components in initial JS |
|---|---|
| Angular | navbar, dropdown-menu, theming (the shell renders them) |
| React | shell, theme-toggle |
| Vue | shell, theme-toggle |

The leak: `@mintplayer/ng-bootstrap/a11y` re-exports `control-validity.directive`, which pulls about 45 kB
of `@angular/forms` into Angular's `main`.

**The global CSS is the problem.** Every component partial is in it:

| App | Global stylesheet |
|---|---|
| Angular | `styles.css`, 225 kB |
| React | 298 kB (includes bootstrap-icons) |
| Vue | 298 kB (includes bootstrap-icons) |

Selectors per partial family:

| Family | Selectors |
|---|---|
| grid | 423 |
| forms | ~205 |
| offcanvas | 94 |
| navbar | 88 |
| dropdown | ~65 |
| list-group | 62 |
| modal | 56 |
| popover | 49 |
| button-group | 41 |
| card | 41 |
| carousel | 39 |
| nav | 31 |
| tables | 28 |
| containers | 27 |
| accordion | 24 |
| tooltip | 21 |
| pagination | 13 |
| alert | 13 |
| progress | 9 |
| toasts | 8 |
| spinners | 8 |
| placeholders | 7 |
| close | 6 |
| breadcrumb | 4 |
| transitions | 3 |
| badge | 2 |

The scripts live in the session scratchpad. §8 makes them a repeatable check.

## 3. Design

### 3.1 One compiled module per partial, in ui-core

`libs/mintplayer-ui-core/styles/parts/<partial>.bootstrap.scss` contains `@import "config";
@import "bootstrap/scss/<partial>";`, where config holds functions, variables and mixins only. The
existing ui-core `codegen` target compiles each one into a TypeScript string module (gitignored, like
`*.scoped.styles.ts`). The module exports two variants:

- **`bootstrap<Partial>`**: attribute-scoped (§3.2). Every component installs this one.
- **`bootstrap<Partial>Page`**: verbatim. Only for raw Bootstrap markup that a page component renders.

Both variants are wrapped in `@layer mp.bootstrap.components` (§3.3) and share **one registry key**,
`bootstrap-<partial>`. **A page never holds two copies of a partial.** The verbatim variant matches a
superset of what the scoped one matches, with identical specificity (§3.2). So installing `…Page` when the
scoped copy is already present replaces the copy's text, and the reverse is a no-op. SSR collects the
same way: one tag per key, verbatim if anything on the page asked for it. The registry gets this one
"upgrade" rule, with a spec.

### 3.2 Attribute scoping

This is the owner's "view encapsulation across all three frameworks". The compiler already stamps
`data-mps="<group>"` on every native element of a D10 group's templates and on the Angular and Lit host.
The Bootstrap copy is rewritten so that it matches only stamped elements.

1. **Scope by attribute presence, `[data-mps]`, not by value.** Partials cross component boundaries. The
   navbar renders `.dropdown-menu`, `.nav-link` and `.container` on its *own* elements (stamped `navbar`).
   The datatable renders pagination and form controls. Scoping per value would need several scopes on one
   element. "Rendered by a @mintplayer component" is the boundary that matters.
2. **Wrap the attribute in `:where()`.** For example `.card:where([data-mps])`. This keeps every selector's
   specificity identical to stock Bootstrap, so:
   - Bootstrap's own source-order semantics are unchanged;
   - the scoped and verbatim variants are interchangeable on one page;
   - a consumer's unlayered CSS still wins (cascade layers already guarantee that).
3. **Scope only the leftmost compound that carries a class the partial owns.** "Owned" comes from a
   reviewable per-partial prefix table, e.g. card owns `card*`. Measured on Bootstrap 5.3: 26 partials,
   about 1,300 selectors. Many are cross-component, so the choice of compound matters:

   | Stock | Scoped | Why |
   |---|---|---|
   | `.card > .list-group` | `.card:where([data-mps]) > .list-group` | the list group belongs to another component (issue 3) |
   | `.btn-group > .btn` | `.btn-group:where([data-mps]) > .btn` | the buttons are consumer content |
   | `.was-validated .form-control:invalid` | `.was-validated .form-control:where([data-mps]):invalid` | `.was-validated` is the consumer's form; state classes are not owned |
   | `.table > :not(caption) > * > *` | `.table:where([data-mps]) > …` | |
   | `.navbar-text a` | `.navbar-text:where([data-mps]) a` | |
   | `[data-bs-theme=dark] .form-select` | `[data-bs-theme=dark] .form-select:where([data-mps])` | |

   A rule with no owned compound (a `:root` token block, `@keyframes`) ships verbatim. Those are not
   component selectors.
4. **Superseded by #458 §4.1 (the anchored guard).** A sub class now matches inside a stamped root of its
   own partial (`.card-title:where([data-mps], .card[data-mps] *)`), so `<h5 class="card-title">` projected
   into `bs-card-body` IS styled, and the `…Page` stopgaps for that case can go. The original text:
   **The limitation is accepted.** It is the same as Angular emulated encapsulation. Consumer markup that
   uses a component's *sub*-classes directly, such as `<h5 class="card-title">` projected into `bs-card-body`,
   is unstamped and gets no card styles. The consumer either uses the provided part (`bs-card-title`) or
   installs the `…Page` variant from their page. Descendants of an owned anchor (consumer buttons in a button
   group, an `<hr>` in a card) are still styled.
5. A **conformance spec** compiles every part and checks two things. Each selector carries exactly one
   `:where([data-mps])`, on an owned compound, except the listed verbatim rules. No scoped selector matches a
   decoy tree of unstamped elements that use our class names (the existing light-styles decoy approach).

### 3.3 Order: one shared components layer, part sheets kept in stock order

Splitting Bootstrap into separate sheets breaks the source order it relies on. The first attempt hit this:
`.navbar { position: relative }` beat `.fixed-top`. So the baseline declares, once, at its top:

```
@layer mp.bootstrap.base, mp.bootstrap.components, mp.bootstrap.helpers, mp.bootstrap.utilities;
```

(followed by `mp.components`). Every part sheet repeats the statement, so its position is fixed even if it
loads first. One codegen constant (`BOOTSTRAP_SUBLAYERS`) is the source of truth; a spec checks the baseline.

**Why not one sublayer per partial.** That was the first version of this PRD. It is wrong: a later layer
beats an earlier one *regardless of specificity*, while stock Bootstrap is one sheet in which a more
specific rule of an earlier partial beats a less specific one of a later partial. Measured on 5.3, a layer
per partial breaks about 96 such overrides: navbar > offcanvas 84 (`.navbar-expand-lg .offcanvas`),
forms > buttons 6, dropdown > nav 3, card > list-group 2 (`.card > .list-group`, issue 3), alert > close 1.

So every part (and the baseline's buttons) sits in ONE layer, `mp.bootstrap.components`, where specificity
decides as it does in stock Bootstrap. What is left to source order is the equal-specificity ties between
partials (`.card-header-tabs` after `.nav-tabs`, `.navbar-nav .nav-link` after `.nav-link`, offcanvas after
navbar). Each part carries `order`, its index in stock `bootstrap.scss` (`BOOTSTRAP_PARTIAL_ORDER`), and the
registry inserts part sheets in that order whatever order components install them:

- in the browser, a part is adopted at its sorted position among the adopted sheets; if a server-rendered
  part `<style data-mp-order>` with a higher order is already in the head, it is written as a `<style>`
  right before that tag instead (adopted sheets cascade after every `<style>`);
- Angular SSR writes into `DOCUMENT.head` at the sorted position; React/Vue `collectScopedStyles(render)`
  emits the render's sheets sorted, with `data-mp-order`;
- `adoptLightStyles` mirrors into a shadow root in the same order.

The baseline's buttons (stock order 4) never tie with a part at equal specificity, so they need no
ordering.

### 3.4 Install: the existing registry, identical in every front

The install calls `installLightStyles(part.key, part.css)` from `ui-core/scoped-styles`. It installs once
per page per key and is safe across bundles. SSR is already wired:

- Angular writes the sheet into `DOCUMENT.head` through `useScopedStyles`.
- React and Vue servers wrap the render in `collectScopedStyles(render)` and emit its tags into the head.
  The record is **per render**, not per process: the first version emitted every sheet any earlier request
  had installed, so `/` carried the card part once `/card` had been served, which defeats per-component
  styles. A front must therefore install while it renders (component body, Vue `setup`), never at module
  scope; the React card files and demo pages were moved for this.

How each kind of component gets it:

- **D10 manifests** gain `style: { scope, bootstrap: ['card', 'nav'] }`. The compiler emits the install
  before the group's own sheet, in all four fronts.
- **Hand-written fronts** call `useBootstrap(...)` (Angular) or `installBootstrap(...)` (React, Vue, Lit),
  and **stamp their own DOM** with the scope attribute:
  - the Angular-only components (alert, badge, breadcrumb, button-group, close, container, grid,
    list-group, modal, offcanvas, placeholder, popover, progress, spinner, table, toast, tooltip, …);
  - the hand-written parts of accordion, tab-control, input-group, shell, typeahead, dropdown-menu.

**Each part is its own subpath entry**, `@mintplayer/ui-core/bootstrap/<partial>`; `@mintplayer/ui-core/bootstrap`
holds only `installBootstrap`, `bootstrapInstallOptions` and the `BootstrapPart` type. A barrel of per-part
modules was enough for Rollup but not for esbuild: Angular's application builder assigns modules to chunks by
file reachability, and the shell reaches the barrel through `useBootstrap`, so every part the app used
anywhere landed in an initial chunk (measured in a minimal consumer repo, card + nav + navbar in `main`).
Breaking, accepted: no compatibility barrel.

  Stamping means writing the attribute on their host and their own template elements, never on projected
  consumer content (the existing `stampScope` rule). The attribute name and the helpers live in
  `ui-core/scoped-styles`, so every front uses one implementation. Every component then uses the scoped
  variant (owner, Q2).
- **Angular directives that put Bootstrap classes on consumer elements** (`bsRow`, `[col]`,
  `bsColFormLabel`, `bsFormControl`) stamp the element they are applied to, through a host binding. They
  own that class, so stamping it is not stamping consumer content.

**Chunking follows from the imports.** The part module is imported only by the component module that
installs it, so it lands in that component's lazy chunk. A part used by several lazy pages goes into a
shared lazy chunk, which is still not `main`. Only the shell's parts are in initial JS: navbar, nav,
dropdown and containers for Angular; whatever `bs-shell` uses for React and Vue.

### 3.5 Page baseline

`_bootstrap-stack.scss` is replaced by `styles/baseline/_{base,buttons,helpers,utilities}.scss`, each in its
sublayer. The `--bs-primary` button re-bind and the utility patches stay.

### 3.6 Raw Bootstrap markup in the demos

These pages install the `…Page` variants from their own page component, never globally (invariant 2):

- about 17 Angular, 11 React and 10 Vue pages;
- mostly forms, plus tables, alert, badge, spinners, button-group, containers, card, nav, modal and
  offcanvas.

The inventory is in §9.

## 4. The four observed issues

1. **Global partials.** Fixed by §3.
2. **Angular card part hosts render `display: inline`.** `bs-card-header` / `-body` / `-footer` /
   `-title` / `-subtitle` / `-text` / `-img` get `:host { display: block }` in the component's own styles.
   The subtitle, text and title lose the `d-block` utility, which used `!important` and fought `d-none`.
3. **A list group in a card** lost `border-radius: 0` and `margin: -1px`. Stock `.card > .list-group`
   (0,2,0) beats `.list-group` (0,1,0) again because both now sit in the one shared layer (§3.3). (The
   first version claimed the card partial follows list-group in stock order; it does not. Stock
   list-group comes after card, and only specificity makes the card rule win.) In Angular the rule could
   not match at all: `bs-list-group` rendered `<ul class="list-group">` inside its host, so the list was
   a grandchild of `.card` (on master too). Its host is now the `.list-group` (`role="list"`), as
   `bs-list-group-item`'s host is the item, so the DOM nests as stock Bootstrap expects. No card rule
   knows about list groups.
4. **Table nowrap.** `.nowrap th, td` becomes `.table-responsive.nowrap :is(th, td)` (exact selector to
   check against the table's markup), so only the cells of a responsive table are affected.

Also in this PR: split the `ng-bootstrap/a11y` barrel. `BsControlValidityDirective` (and with it
`@angular/forms`) moves to the nested entry `@mintplayer/ng-bootstrap/a11y/forms`.

## 5. Owner decisions (2026-11-01)

- **Q1. The 19 Angular `:host ::ng-deep { @import partial }` sheets are replaced** by the component
  installing its part. These are alert, badge, breadcrumb, button-group, close, container, grid,
  list-group, modal, offcanvas, placeholder, popover, progress, progress-bar, spinner, table, toast,
  toast-container and tooltip.

  Owner: "Avoid duplicating code and shipping duplicated code. This library shouldn't have to know how the
  consumer uses/wraps the components."

  The partial still ships with that component and in its chunk, now layered and in order. INVARIANTS 5 is
  rewritten to match. Issue 3 is NOT fixed by a card rule that knows about list groups. Stock
  `.card > .list-group` in its stock layer position fixes it.
- **Q2. Every component is stamped and uses the scoped variant** (§3.4). The scope attribute, the stamping
  helpers and the part modules all live in `@mintplayer/ui-core`.

  Converting the Angular-only components into full D10 cores is a separate task, with an issue to be
  filed. In this PR they only gain stamping and a part install.
- **Q3. One shared components layer + an ordered registry** (§3.3), replacing the layer per partial.
- **Q4. Breaking changes, documented in the CHANGELOG:**
  - `@mintplayer/ng-bootstrap/container` and `/table-styles` are deleted: `bs-grid` / `bs-table`
    install the containers and tables parts; raw markup installs `bootstrapContainersPage` /
    `bootstrapTablesPage`;
  - `BsControlValidityDirective` moves to `@mintplayer/ng-bootstrap/a11y/forms`;
  - Bootstrap's component partials are no longer in the global stylesheet.
- **Q5. React/Vue SSR collect a per-process superset (accepted).** The registry is process-wide, so a
  React or Vue SSR response carries every part an earlier request installed. That is correct, only
  heavier. Angular writes into each request's `DOCUMENT` and is exact. A per-request collector is a
  later improvement.

`mp-card` (a slot-based Lit element) installs `bootstrapCardPage`: its children are raw consumer markup
(`<div class="card-body">`), which no component stamps.

## 6. Docs updated in this PR

- `CLAUDE.md`:
  - INVARIANTS 5 (per Q1);
  - remove the "known violation" note;
  - rewrite the "Styles" bullet ("No styleUrls, no ::ng-deep") and "Bootstrap layering" C1–C6 to describe
    this design;
  - the light-tier "do not `@import` a partial" rule becomes "use the compiled part, never `@import`".
- Root and library READMEs, wherever they say every partial is global.
- `per-component-styles-restart.md`: status points here.

## 7. Milestones

1. Part codegen (both variants, the scoping rewriter, the layer order) plus the conformance spec.
2. Install API (`useBootstrap` / `installBootstrap`), compiler `bootstrap:` support, the manifests.
3. Baseline split; hand-written fronts and the Angular-only components (per Q1 and Q2); the grid directives.
4. Demo pages with raw markup.
5. Issues 2, 3 and 4; the a11y barrel.
6. Docs (§6).
7. One verification pass at the end (§8).

## 8. Acceptance

- **Bundle gate:** rebuild the three demos with stats.
  - The global CSS has **0** selectors in any component family.
  - Initial JS holds only the shell's components and their parts.
  - `@angular/forms` is no longer in `main`.
- **Visual:** the card, list-group-in-card, table, navbar `fixed-top`, forms and modal pages in all three
  demos, with JS on and with JS off. SSR HTML carries the part `<style>` tags.
- **Specs:** the scoping conformance spec, the layer-order spec and the registry order specs; the existing scoped-style and passthrough
  suites; one run of the unit and e2e sweep at the end.

## 9. Inventory: which partials each component needs

| Partials | Components |
|---|---|
| accordion | accordion |
| card | card (+ nav for `card-header-tabs`/`-pills`) |
| carousel | carousel |
| navbar, nav, dropdown | navbar (+ ng navbar-toggler: navbar) |
| nav | tab-control |
| pagination | pagination |
| pagination, forms | datatable |
| dropdown | dropdown-menu |
| dropdown, forms | typeahead |
| forms | checkbox, radio, toggle-button, select, input-group, datepicker, datetime-picker, timepicker, phone-input, otp-input, signature-pad, scheduler; ng form / `bsFormControl` / floating-labels / range |
| forms, button-group | query-builder |
| grid | ng grid directives |
| containers | ng grid (`bs-grid`; the `container` entry is deleted) |
| tables | ng table (the `table-styles` entry is deleted) |

The Angular-only components alert, badge, breadcrumb, button-group, close, list-group, progress, spinner,
placeholder and tooltip each need their own partial. A few need more:

| Component | Partials |
|---|---|
| modal | modal, transitions |
| offcanvas | offcanvas, modal |
| popover | popover, transitions |
| toast | toasts, transitions |
