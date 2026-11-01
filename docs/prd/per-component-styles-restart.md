# Per-component styles — restart brief (issue #452)

Status: **superseded by `per-component-styles-452.md`** (2026-11-01), which holds the measurements, the
design and the owner's decisions. This file remains the record of the first attempt. A first attempt lives on branch
`fix/452-card-part-host-display` (PR #453). The owner chose to restart from master. Use that branch as
reference material, not as the plan. This file is the handoff: read it before touching any styling.

## The goal (owner, verbatim intent)

- **Styles per component.** A component ships its own CSS *and* the Bootstrap partial its markup uses.
- **Only essential Bootstrap is global.** Root, reboot, type, images, buttons, helpers and utilities only.
  The globally loaded stylesheet of the Angular, React and Vue apps (the demos too) must bundle **no**
  component partial. Owner: "The goal is to not have the angular/react/vue app's their globally loaded
  stylesheets bundle per-component styles."
- **No front wraps a web component.** Every component is one framework-neutral TypeScript core in
  `@mintplayer/ui-core` that the Angular, React, Vue and Lit fronts each consume.
- **Minimal Angular main bundle.** No component TypeScript or SCSS in the main bundle unless the app shell
  needs it. A component and its styles must be able to ship in the lazy chunk of the page that uses it,
  loaded only when the user visits that page.
- **The `:host ::ng-deep { @import partial }` Angular sheets are deliberate** (per-component shipping).
  Never delete them.

The rules are in `CLAUDE.md` → INVARIANTS.

## What is wrong on master

1. **Every Bootstrap partial is global.** #437 put them all into `libs/mintplayer-ui-core/styles/_bootstrap-stack.scss`
   (the page baseline). So a consumer bundles `.card`, `.table`, `.modal`… whether or not it uses them.
   Fixing this is the core of the work.
2. **#452 itself: Angular card part hosts are `display: inline`.** `<bs-card-body class="card-body">` is a
   custom element. Bootstrap never sets `display` on `.card-body` / `-header` / `-footer`. They are blocks
   only because `.card` is flex. Put `d-block` on the card and the vertical padding collapses (measured:
   card height 89.6px → 25.6px). The same pattern affects:
   - `bs-card-img` (`width: 100%` is ignored on an inline box);
   - `bs-card-title` / `-subtitle` / `-text`, which use a `d-block` utility (`!important`, so it fights
     `d-none`);
   - `bs-accordion` (inline host: the consumer's `mb-*` is ignored);
   - `bs-tile-manager`, `bs-pagination`, `bs-progress`, `bs-slider`, `bs-checkbox`, `bs-toggle-button`
     (`d-*` utilities on the host);
   - `bs-list-group` (no host display).

   React and Vue render the classes on a `<div>`, so only Angular is affected. The full audit table is in
   the branch's `docs/prd/host-display-452.md`.
3. **A list group inside a card** lost `border-radius: 0` and `margin: -1px` (a regression since #437).
   Owner: "this used to be the case before". Check at `/basic/containers/card`. The list group's
   `:host ::ng-deep` Bootstrap copy is UNLAYERED, so it beats any layered rule. Fix it on specificity, in
   the card's own sheet.
4. **Table:** a `.nowrap th, td` selector made every `td` of every `bs-table` nowrap. It should cover only
   the cells of a responsive table.

## Lessons from the first attempt (branch `fix/452-card-part-host-display`)

It worked, but it was found by trial and error. Each point below cost a round-trip with the owner.

- **Never "fix" by deleting a per-component sheet, or by making CSS global.** The first attempt deleted
  the list-group `:host ::ng-deep` sheet as a "duplicate of the baseline". The owner rejected it.
- **Splitting Bootstrap into separate sheets breaks its source order.** Bootstrap relies on source order
  between equal-specificity rules. Once the navbar partial arrived after the baseline,
  `.navbar { position: relative }` beat helpers' `.fixed-top { position: fixed }`, and the demo navbar
  stopped being fixed. The branch fixed this with one `@layer mp.bootstrap.<partial>` sublayer per
  partial, in stock `bootstrap.scss` import order, declared by the baseline and by every part sheet. Any
  design that ships partials separately needs an equivalent.
- **Removing partials from the global sheet exposes everything that silently depended on them:**
  - the grid directives (`bsRow`, `[col]`, `[md]`…) outside `bs-grid`;
  - `bsColFormLabel`;
  - about 17 Angular, 11 React and 10 Vue demo pages with raw Bootstrap markup (`.form-label`, `.table`,
    `.alert`, `.container`, …).

  Each needs its component or page component to ship the partial. An earlier "fix" re-added a page-wide
  opt-in for the demos, and the owner rejected it.
- **Measure, don't text-match.** Listing a stylesheet's classes with a regex over its text is fooled by
  layer names: `@layer mp.bootstrap.card` reads as `.card`. In the browser, walk
  `document.styleSheets` → `cssRules` (recursing into layer and media rules) → `selectorText`. In SSR,
  the head's `<style data-mp-light-styles="…">` tags show what a page installed (`curl` the route).
- **Demo routes:** the overlay pages are under `/overlays/…`, not `/overlay/…` (a 404 looked like a missing
  style).
- **Angular directive specs that `new` the directive** fail once its constructor injects (for example to
  install a sheet). Use `TestBed.runInInjectionContext(() => new X())`.

The branch's mechanism, for reference:
- one `ui-core/styles/parts/<partial>.bootstrap.scss` per partial, compiled to verbatim CSS in
  `@layer mp.bootstrap.<partial>`;
- installed through the scoped-style registry (`installLightStyles` keys `bootstrap-<partial>`; Angular
  `useBootstrap(...)`, others `installBootstrap(...)`; D10 manifests `style: { scope, bootstrap: [...] }`);
- SSR-written into the head;
- the page baseline split into `styles/baseline/_{base,buttons,helpers,utilities}.scss`.

It has not been checked against invariant 4 (lazy chunks / main bundle). The part sheets are TypeScript
string modules, so verify which chunk each one lands in.

## Investigation still to do (start here)

1. **Main bundle:** build the Angular demo with stats (`@angular/build` `--stats-json`, i.e. the esbuild
   metafile) and list which component TypeScript, `*.scoped.styles.ts` and Bootstrap CSS end up in
   `main` / `styles.css` instead of a page's lazy chunk. Do the same for the React and Vue demos (Vite
   build manifest). This is the baseline measurement for invariant 4.
2. **Global CSS:** list the component classes in each app's global stylesheet. The target is none.
3. **Shared barrels / root providers** that pull components into `main`, such as a `provideX()` in
   `app.config.ts`, or a barrel with side-effect imports (e.g. `customElements.define`).
4. Then design how a partial ships per component (part sheet vs `:host ::ng-deep` vs …). Keep the
   Bootstrap source order intact, and fix issues 2–4 above in the same PR.
