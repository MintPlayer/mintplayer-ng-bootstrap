# #452 — Angular hosts that are only blocks because their parent is flex

Issue: https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/452

## Problem

Since #437 an Angular front's host often *is* the Bootstrap element (`<bs-card-body class="card-body">`).
A custom element is `display: inline` by default. Bootstrap never declares `display` on `.card-body`,
`.card-header`, `.card-footer` or `.accordion`, because upstream those classes sit on a `<div>`. The
hosts only render as blocks because a flex parent blockifies its items (`.card` is `display: flex`).

As soon as the parent stops being flex — a consumer puts `d-block` on `<bs-card>` (which since 22.29
lands on the `.card` itself) — the parts fall back to `inline`. An inline box paints its vertical
padding and margin without laying it out, so the content sits flush against the card edges. Seen in
production on coverage.mintplayer.com after 22.28 → 22.31.

React and Vue render the same classes on a `<div>`, and the Lit card is a shadow-root element, so
**only the Angular fronts are affected**.

## Audit — where else the pattern occurs

| Host | Bootstrap class on host | Own `display`? | Verdict |
|---|---|---|---|
| `bs-card-body` / `-header` / `-footer` | `.card-body` / `.card-header` / `.card-footer` | none | **fix** (the issue) |
| `bs-card-img` | `.card-img-top` / `-bottom` / `.card-img` (`width: 100%`) | none | **fix** — `width` is ignored on an inline box |
| `bs-card-title` / `-subtitle` / `-text` | `.card-title` … | `d-block` utility (`!important`) | **fix** — move to a layered rule so `d-none`/`d-flex`/consumer CSS win cleanly |
| `bs-accordion` | `.accordion` | none | **fix** — inline host: a consumer's vertical margin (`mb-*`, `my-*`) is ignored |
| `bs-tile-manager`, `bs-pagination`, `bs-progress`, `bs-slider` | — | `d-block` utility | **fix** — same `!important` fight, moved to `:host` |
| `bs-checkbox` / `bs-toggle-button` | — | `d-inline-block` utility | **fix** — same, moved to `:host` |
| `bs-list-group` | — (its `ul.list-group` is one level in) | none | **fix** — `:host { display: block }` |
| `bs-card-link` | `.card-link` | none | inline is correct (it is a link) |
| `bs-card` | `.card` | Bootstrap `display: flex` | nothing to do |
| `bs-card-group` | `.card-group` | intentionally none (its own comment) | nothing to do |
| `bs-list-group-item`, `bs-input-group`, `bs-progress-bar` | Bootstrap sets `display` | yes | nothing to do |
| D10-generated hosts (23 manifests) | root bag | every scoped sheet's root rule sets `display` | nothing to do |
| directives (`bsModalBody`, `bsPopoverBody`, …) | on the consumer's own element | n/a | nothing to do |

## Design

**Layered, not unlayered.** The display goes in a scoped sheet installed through `useScopedStyles`,
which lands in `@layer mp.components` (C3). That ordering is exactly the one the issue asks for:

- it beats the layered Bootstrap baseline (which declares nothing here anyway);
- a consumer's unlayered CSS beats it with no `!important` and no specificity games;
- Bootstrap's `!important` utilities (`d-none`, `d-flex`) beat it.

An Angular `styles: [':host { display: block }']` would be *unlayered* emulated CSS and tie with a
consumer's class rule on specificity — order-dependent. A `d-block` host utility is `!important` and
fights every other `d-*` by stylesheet order. Both rejected for the card and accordion hosts, which
carry Bootstrap classes and follow the scoped-sheet pattern (precedent: `mp-input-group { display:
block }`, tag-anchored and `@mps-global`).

- **Card** gets its first scoped sheet, `ui-core/card/src/styles/card.scoped.scss`, with one
  tag-anchored `@mps-global` rule for the Angular part hosts. Each part component calls
  `useScopedStyles(CARD_SCOPE, cardScopedStyles)` (installed once per page; SSR writes it to the head).
- **Accordion**: `.accordion { display: block; }` in its existing sheet (rescoped to
  `.accordion[data-mps=accordion]`; harmless on the React/Vue `<div>`).
- **Tile manager, pagination, progress, slider, checkbox** carry no Bootstrap class on the host, so
  there is nothing layered to out-rank. Their `d-*` host utility becomes a component
  `:host { display: … }` rule (specificity 0,1,0 — overridable by any consumer class or utility,
  unlike the `!important` utility). The tile manager's shared sheet is NOT extended with
  `bs-tile-manager`: the Lit front registers that sheet, and the WC scoping conformance spec
  requires every compound to carry the scope or the `mp-` host tag.

## A list group in a card (regression found during review)

Before #437 a list group inside an Angular card had square corners and a `-1px` margin, so its
border overlapped the card's border and the neighbouring header/footer border. Two things broke that:

- Bootstrap's `.card > .list-group` rules never match in Angular, because the `ul.list-group` sits
  inside the `<bs-list-group>` host, a grandchild of the card.
- `bs-list-group` ships its own scoped copy of Bootstrap's list-group partial (`:host ::ng-deep`),
  so that the CSS is bundled only when a consumer uses the list group. That copy is unlayered, so a
  layered `mp.components` rule can never override it. Its template also carried a redundant `mt-0`
  (`!important`), which cancelled a negative top margin.

Fix, keeping every style shipped with the component that needs it:

- `bs-card.component.scss` (the card's own scoped sheet):
  `:host > ::ng-deep bs-list-group > .list-group { border-radius: 0; margin: -1px }`, which compiles to
  `[_nghost] > bs-list-group > .list-group` (0,2,2) and out-ranks the list group's
  `[_nghost] .list-group` (0,2,0).
- `bs-list-group`: keeps its scoped partial, gains `:host { display: block }` in that same sheet,
  and drops the redundant `mt-0` (reboot and `.list-group` already zero the margin).

React and Vue render `ul.list-group` directly under `div.card`, where Bootstrap's own
`.card > .list-group` rules apply.

Measured on `/basic/containers/card`: `ul.list-group` radius `0px`, margin `-1px`, first and last
item radius `0px`, single borders against the card, header and footer.

**Per-component shipping is a design rule here.** The `:host ::ng-deep { @import partial }` sheets
are deliberate: a consumer who never uses a card bundles none of the card's CSS. They are not
duplicates to remove. The card-part display rule follows the same principle: the ui-core card sheet
is imported only by the card part components.

## Per-component Bootstrap (owner decision, 2026-10-31)

**Goal.** Bootstrap CSS ships per component again: a consumer who never uses a card bundles none
of `.card`. #437 broke this. `ui-core/styles/_bootstrap-stack.scss` loaded EVERY partial into the
page baseline, because the components that used to carry their partial (inside a web component, or
the WC `_styles` copies) became headless and the partial had nowhere else to go.

**Global (page-level) stays global**, exactly the pre-#437 Angular set: config, `root`, `reboot`,
`type`, `images`, `buttons` (+ the `--bs-primary` re-bind), `helpers`, the utility API + the workspace
utility patches. Everything else ships with a component.

**Mechanism (chosen over per-front `:host ::ng-deep`):** one sheet per Bootstrap partial
(`ui-core/styles/parts/<partial>.bootstrap.scss` → codegen → `<partial>.bootstrap.styles.ts`, verbatim CSS
in `@layer mp.bootstrap`), exported as `BootstrapPart` objects (`bootstrapForms`, …) from a new
`@mintplayer/ui-core/bootstrap` entry. A front installs the parts
its markup uses through the existing registry (`useScopedStyles` in Angular, `installLightStyles`
elsewhere): once per page, SSR-written into the head, tree-shaken when unused. It works where
`:host ::ng-deep` cannot, on a host that IS the Bootstrap element (`bs-card` is `.card`:
`[_nghost] .card` never matches it), and it serves React, Vue and Lit too. The existing
`:host ::ng-deep @import` sheets of the Angular-only components stay as they are.

### What was built

1. **Part sheets + codegen.** 26 part sources under `ui-core/styles/parts/` (shipped with the package,
   so Sass consumers can load them too), sharing `_config.scss` (functions, variables, maps, mixins).
   Codegen suffix `.bootstrap.scss`: compiled verbatim (no rescoping; Bootstrap's classes are the
   contract) into `@layer mp.bootstrap`. The pagination target-size patch moved from the stack into
   the pagination part.
2. **The baseline shrank** to the page-level set. `bootstrap-baseline-superset.spec.ts` now checks
   baseline ∪ parts ⊇ stock Bootstrap, and that no component class is left in the baseline.
3. **Compiler:** `style: { scope, bootstrap: [...] }`; names are validated against the part list and
   installed in Bootstrap's own order, before the group's sheet, in all four emitters.
4. **Manifests**, from the classes each group's templates and bags actually emit (an inventory, then
   read by hand; a word like `row` or `popover` in a string is not a class):

   | Group | Parts |
   |---|---|
   | carousel | carousel |
   | datatable | forms (`form-check-input`, `form-text`), pagination (its pager) |
   | datepicker, datetime-picker, timepicker, otp-input, phone-input, select, signature-pad, scheduler | forms |
   | navbar | nav, navbar, dropdown |
   | query-builder | forms, button-group |

   Not given a part, on purpose: code-snippet and file-manager style their own `.toast` /
   `.breadcrumb-item` (they were shadow-root elements, never under Bootstrap's rules); the tree,
   dock, ribbon and calendar hits were `row` / `popover` / `placeholder` as words or attributes.
5. **Hand-written fronts:** accordion → accordion, dropdown-menu → dropdown, input-group → forms,
   tab-control → nav, typeahead → forms + dropdown (Angular, React, Vue, and the light-DOM Lit
   elements); card → card, pagination → pagination, checkbox / radio (toggle buttons render through
   them) → forms (Angular, React, Vue; Lit `mp-radio`). Angular-only: range, floating label, form →
   forms; `bsDropdownMenu` → dropdown. Shadow-root Lit elements keep their own `_styles` copies.
6. **Demos** use Bootstrap classes on plain markup (`.table`, `.form-select`, `.card`, …), which no
   component installs. They opt in page-wide with the new
   `@include bootstrap-parts.include(...)` (`@mintplayer/ui-core/styles/bootstrap-parts`), which is
   also what a consumer does for the same need.
7. **Docs:** CLAUDE.md C1, C2 and C4 rewritten to the per-component rule.

## Note for consumers (changelog)

`d-block` on `<bs-card>` is wrong regardless of this fix: it removes the card's flex column (and with
it `mt-auto` footers, `card-img-overlay` sizing, etc.). Drop it.

## Verification

- `bs-card-host-display.spec.ts`: the parts install the card sheet, it lives in `@layer mp.components`,
  it covers exactly the seven part tags, and no part carries a `d-*` utility. (jsdom applies neither
  adopted sheets nor `@layer` to `getComputedStyle`, so the cascade is measured in a browser.)
- Browser, Angular demo (`/basic/containers/card`, SSR): with `d-block` on the card, the card is
  89.6px tall with the sheet and 25.6px without it (body `inline`, padding collapsed). The sheet
  arrives as the SSR `<style data-mp-light-styles="card">`, so it holds with JS off.
- Browser, isolated cascade: with the sheet, `d-none` → `none`, `d-flex` → `flex`, a consumer's
  unlayered `display: inline` wins, and `bs-card-link` stays `inline`.
- Browser: every `bs-accordion` and `bs-tile-manager` computes `block`; the tile manager carries no class.
- Specs: the card, tile-manager, pagination, checkbox, progress-bar, color-picker and accordion
  suites (26 files) + `web-components/_conformance/light-styles-scoping.spec.ts`.

Checked and ruled out: in the accordion demo the nested accordion's computed margin is `0px`. The
`.accordion .accordion` rule does match, but the demo's `.multi-level` theme sets
`--bs-accordion-border-width: 0`, so `calc(-1 * 0)` is correct.
