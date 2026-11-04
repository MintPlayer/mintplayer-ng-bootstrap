# CLAUDE.md

Project-wide technical conventions for the `@mintplayer/*-bootstrap` workspace. Read this before adding components.

## INVARIANTS — owner decisions. Never change these; ask before touching anything near them

1. **Styles ship PER COMPONENT.** A component's CSS — its own sheet AND the Bootstrap partial its markup
   uses (`card`, `list-group`, `forms`, `table`, `nav`, `modal`, …) — ships with that component and
   nowhere else. A consumer who never renders a card must bundle none of `.card`.
2. **Only the essential, page-level Bootstrap is global.** The page baseline holds root, reboot, type,
   images, buttons, helpers and the utility API (with the workspace patches) — nothing else. No app's
   globally loaded stylesheet (Angular/React/Vue, the demos included) may bundle a component partial,
   and there is no "page-wide opt-in" for one. Raw Bootstrap markup in an app installs its partials from
   the component (or page component) that renders it. **"Make it global again" is never the fix** for a
   styling bug: fix it locally in the component's sheet. If you think global is the fix, stop and ask.
3. **No framework front consumes or wraps a web component.** Every component is ONE framework-neutral
   TypeScript core (state, commands, keyboard, ARIA bags, all essential logic) in `@mintplayer/ui-core`,
   consumed by four fronts — Angular, React, Vue and the Lit web component — each rendering its own
   template. An Angular/React/Vue front never renders an `<mp-*>` element. (See "Headless core + fronts".)
4. **Keep the app's main bundle minimal.** No component TypeScript and no component SCSS in an app's
   main/global bundle unless the app's shell itself renders that component. A component's code and its
   styles must be able to ride in the lazy-loaded chunk of the page that uses it, and load only when the
   user visits that page. Anything that forces them into the main bundle (a global stylesheet import, a
   side-effect import in a shared barrel, a root-level provider that pulls a component in) is a bug.
5. **One copy of a partial, shipped by the component, in every framework.** A component ships its partial
   by installing the compiled Bootstrap PART (`@mintplayer/ui-core` `bootstrap<Partial>`, through the
   scoped-style registry — see "Bootstrap layering"). That works the same in Angular, React, Vue and Lit.
   Nothing else may ship a second copy: no `:host ::ng-deep { @import partial }` sheet (the 19 Angular ones
   were replaced by parts in #452), no `@import` of a partial into a scoped sheet, no global copy. A
   component never contains rules that depend on how a consumer nests or wraps it ("the card knows about
   list groups") — Bootstrap's own cross-component rules, in Bootstrap's order, do that.

**Docs precedence.** `CLAUDE.md`, the root README and the library READMEs describe the current
architecture. `docs/prd/*` and `docs/issue_*` are historical decision records: many describe the
retired model (framework components wrapping `<mp-*>` web components, shadow-root components, all of
Bootstrap global). Where they conflict with these invariants, the invariants win.

**Styling design: `docs/prd/per-component-styles-452.md`** (#452) — attribute-scoped Bootstrap parts,
one shared `mp.bootstrap.components` layer kept in stock order by the registry, installed per component.
Read it before changing any styling. `docs/styles-mechanism.md` walks the whole chain for one component
(SCSS → codegen → part module → manifest → generated fronts → registry → SSR head and lazy chunk).
(`docs/prd/per-component-styles-restart.md` is the history of the first attempt.)

## What this workspace is

A multi-framework Bootstrap component system. Since #437 (2026-10) every component is **a framework-neutral
core plus four fronts that each render their own template** (see "Headless core + fronts" below):

- **`@mintplayer/ui-core`** (`libs/mintplayer-ui-core`) — the cores, the shared infrastructure (store, overlay,
  focus, roving, drag, virtual window, scoped styles), the Bootstrap baseline, and — for most components — the
  single component source (core + `.view.vue` template + manifest) the compiler generates the fronts from.
- **`@mintplayer/ng-bootstrap`** (`libs/mintplayer-ng-bootstrap`) — the Angular fronts.
- **`@mintplayer/react-bootstrap`** (`libs/mintplayer-react-bootstrap`) — the React fronts.
- **`@mintplayer/vue-bootstrap`** (`libs/mintplayer-vue-bootstrap`) — the Vue fronts.
- **`@mintplayer/web-components`** (`libs/mintplayer-web-components`) — the **Lit** fronts (`mp-*` custom
  elements), for consumers without a framework, generated like the other three (light DOM, no shadow root).
- `libs/mintplayer-component-compiler` — the component compiler (PRD D10) and its Nx plugin.
- Demo apps: `apps/{ng,react,vue}-bootstrap-demo` (+ `-e2e` Playwright projects).
- Backend for data-driven demos: `apps/api` (ASP.NET Core + EF Core).

**A framework front never renders an `<mp-*>` element.** Angular SSR runs on domino (no `customElements`), so a
wrapper around a custom element server-renders an empty tag; every front renders real HTML instead.

## Lit fronts (`@mintplayer/web-components`)

Since #458 every `mp-*` element is **generated** from a D10 source into `<name>/src/generated/` — never
hand-write or edit one. A generated element is light DOM (`createRenderRoot()` returns `this`), so the
page's CSS, Bootstrap's utilities and a consumer's own component styles reach everything it renders; its
group sheet and its Bootstrap parts install through the shared registry like every other front's.
`<name>/src/index.ts` re-exports `./generated` plus the core's public types. No hand-written element is
left (the last, `mp-dropdown-menu`, became a D10 group in #458 M6).

**History.** Until #458 (2026-11) a dozen elements were hand-written: shadow-root, slot-based elements
(accordion, card, checkbox, pagination, shell, tab control, …) that re-declared Bootstrap from
`web-components/_styles`, and "light tier" elements (`scopedHtml`, `.light.scss`, `adoptLightStyles`
mirrors into any shadow host that nested one). #458 M4 generated the last of them and deleted the
`_styles` copies and the light-styles-nesting rule. The PRDs under
`docs/prd/` record that era; the rules below are the ones that outlive it.

### Document-level CSS and scoped sheets

- **Every document-level sheet goes through the registry** (`installScopedStyles` /
  `installLightStyles`). Issue #432: the card appended its own `<style>` instead, no spec saw it, and its
  unanchored `.text-bg-*` copy — with a Sass-printed `RGBA(#hex, var(…))` that computes to transparent —
  blanked every badge on the page. `_conformance/document-style-writers.spec.ts` enforces the single
  writer (the `<instance-style>` directive is its one listed exemption), `light-styles-scoping.spec.ts`
  checks every REGISTERED sheet (not a filename glob), and `no-invalid-css-values.spec.ts` rejects hex
  inside a colour function in sheets and in the dist.
- **Styling DOM the rewriter cannot stamp** (`v-html` output, a consumer's node, another component's
  rendered content) is done by anchoring on a scoped ANCESTOR, marked `/*! @mps-global */` and authored
  in final form — `.treeview-icon[data-mps=treeview] svg`, not `.treeview-icon svg`. The match still
  requires an element we stamped, so nothing outside can be hit. Prefer this over having one component
  stamp another's scope, which would couple it to that component's internals.
- **Encapsulation is one-directional.** Page CSS reaches a component's internals — the same property
  `ViewEncapsulation.Emulated` has everywhere else. Accepted deliberately; document it rather than
  fighting it. There are no `::part()` hooks; consumers style a component with ordinary CSS.
- **Lit in the light DOM is safe for nodes passed as binding values** (measured): a keyed dynamic
  template survives re-render, reorder, whole-page key replacement, template *shape* change and
  zero-rows recovery with node identity intact. The trap is different — it bites *pre-existing light
  children the host owns but lit does not manage* (the generated `LightChildren` capture handles them).
- A spec that walks an element's descendants to settle or search them covers the whole rendered tree in
  the light DOM: **filter to custom elements**, or one suite goes from ~8s to 18-22s per test.

### Lit and CSS gotchas (measured)

- **Do not shadow read-only DOM properties.** `HTMLElement` already defines `scrollHeight`, `title`,
  `lang`, etc. as typed members — an input of that name fails to compile (`TS2416`). Pick a non-clashing
  name (e.g. `panelScrollHeight` with attribute `scroll-height`).
- **No backticks inside a comment inside ANY tagged template** — `css\`\`` *and* `html\`\`` (an HTML
  comment is still inside the JS template literal, so a backtick there terminates it and the build fails
  somewhere confusing). Use bare names in both.
- **Every dynamic `import()` specifier in lib source must be a static string literal.** A computed one
  (`` import(`./x/${k}.js`) ``, even with `/* @vite-ignore */`) survives into the published `.mjs` and then
  either hard-fails an esbuild consumer's build **or — worse, silently — globs the whole target directory
  into their bundle**. Generate a static loader map instead (`flags/src/flag-loaders.generated.ts` is the
  pattern).
- **A media query cannot see a narrow host; a container query can.** Use `container-type: inline-size` on
  the host and `@container` instead of `@media` whenever a component can be narrow inside a wide viewport
  (sidebar, modal, grid cell). The container must be the host, never the flex container you are styling
  — an element cannot be its own container. **`container-type` no longer establishes a containing block**
  (an acknowledged spec mistake, removed in Chromium 129 and matched since). `getComputedStyle().contain`
  reports `none` while `containerType` reports `inline-size`, so assert on the latter.
- **A host with `container-type: inline-size` contributes ZERO intrinsic inline size**, so it can never
  size itself from its own content: in a shrink-to-fit context (an un-flexed flex item, a float,
  `width: fit-content`) it collapses to 0px wide (measured across 3 engines). Give such a component an
  inline size from its context; when one renders at zero width, suspect containment before the obvious
  sizing bug. `display: contents` on an interposed wrapper does **not** rescue it.
- **A nested component's own container query silently outranks an enclosing container's pairing.** Where
  a contract offers both a specific and a general custom property (`--x-top-start` before `--x-start` in
  a `var()` fallback chain), an `@container` rule inside the inner component that sets the *specific* one
  defeats the outer component's *general* one, with no diagnostic. Check the fallback order before
  assuming an inherited channel reached its consumer.
- **In flex, `min-width: 0` cannot prevent wrapping** — line-breaking uses each item's *hypothetical main
  size* and shrinking happens only after the line is chosen. An intrinsically wide item (a native
  `<select>` sizes to its **widest option**) takes a whole line no matter what its `min-width` says; only
  `flex-wrap: nowrap` or a real `flex-basis` (`flex: 1 1 0`, not `1 1 auto`) changes that, and `nowrap`
  alone can move the overflow to the page. **The corollary is the useful tool:** because `min-width`
  *clamps* the hypothetical main size, `flex: 1 1 auto; width: 1%; min-width: 6rem` gives "shrink to
  readable, then wrap" (measured on the input group: one row at 1280px, 107px controls at 390px, where
  Bootstrap's literal `min-width: 0` crushes them to 27px on one line at every width).
- **Never address a composed child by its `mp-*` tag name in CSS or JS.** Angular renders `<bs-foo>`,
  React and Vue no host at all, Lit `<mp-foo>`: a tag-named rule works in one front and is invisibly
  absent in the others (this once shipped a control collapsed to 0px wide). Select on a class the core's
  bag writes, or use an inherited custom property. In JS, `'BS-SELECT'.includes('-')` is true too.
- **`input[type=tel|url|email]` is UA-forced to `direction: ltr`, even inside `dir="rtl"`.** A logical
  property on such an input resolves against *its* direction, not its container's, so `border-start-*` /
  `margin-inline-*` land on the wrong side. Use physical properties under `:dir()` guards when styling one
  from a container.
- Composition over reinvention: reuse the overlay (`ui-core/overlay`) for popups and the treeview core for
  trees.

### Module resolution

`tsconfig.base.json` maps `@mintplayer/web-components/*` → `libs/mintplayer-web-components/*` (wildcard). A new `<name>/src/index.ts` is auto-discovered as a sub-entrypoint by `vite.config.mts` and resolves in dev/build with no extra config.

## Headless core + fronts (the architecture; pilot #436, programme #437)

Every component is **a framework-neutral core in `@mintplayer/ui-core` + four fronts that each render their
own template** (Angular, React, Vue, Lit). Reason: Angular SSR runs on domino (no `customElements`), so a
wrapper around a WC emitted an empty element and 24 of 30 WC-backed components showed nothing with JS off;
light-tier elements could not be Lit-SSR'd at all. Every front now server-renders the same tree it hydrates,
so there is no DSD chrome, no `@lit-labs/ssr` and no post-render HTML injection anywhere. **New components
are written as a D10 source** (below); the navbar is the reference, the dock / ribbon / scheduler the
heaviest examples. PRD: `docs/prd/headless-catalog-437.md`.

- **Core** (`ui-core/<name>`): a class extending `Machine<S>` (`ui-core/store`: immutable snapshot,
  `subscribe`, batched `update`). Commands, keyboard (`keydown(key) → consumed`), async via
  `SupersedingRequest` (`ui-core/async`: debounce, abort previous, stale-drop). `connect(snapshot, id)` returns
  **attribute bags per node** — the only place ARIA is written. Deterministic ids from a front-supplied root id
  so SSR and client agree. No DOM, no reactivity library.
- **Bridges** (one per lib, `machine/` entry): Angular `machineSignal()` + `[mpProps]` (diffing attribute
  setter via `Renderer2`, SSR-safe, refuses URL/script names) + `useScopedStyles()`; React
  `useMachine`/`useSnapshot` (`useSyncExternalStore`) + `reactProps()`; Vue `useMachine` (`shallowRef`);
  Lit `MachineController` + the `props()` element-part directive.
- **Styles**: one `<name>.scoped.scss` in the core → a plain-string `*.scoped.styles.ts` (ui-core `codegen`
  target; no lit import), rescoped with `[data-mps=<name>]` like a light sheet, and installed through the shared
  registry (`ui-core/scoped-styles`, which `web-components/light-dom` re-exports). Angular writes it into
  `DOCUMENT.head` on the server — no string post-processing. No `styleUrls`, no `::ng-deep`. **S15: one scope
  and one sheet per D10 group** (`style: { scope: '<name>' }` in the manifest). The compiler stamps
  `data-mps="<scope>"` on every native element of the group's templates (partials too) and on the Angular/Lit
  host, so a D10 core's bags carry **no** `data-mps` (`_conformance/no-scope-in-compiled-bags.spec.ts`), and a
  template may not write one. A group that renders another core's markup `@use`s that core's sheet with its own
  scope (`tree-select` → treeview, `navbar` → dropdown-menu, `datepicker` → calendar); a reusable sheet takes
  `$scope: <name> !default` for its final-form selectors. The Bootstrap partials a group's markup uses are listed in the manifest
  (`style: { scope, bootstrap: ['card', 'nav'] }`); the compiler emits their install in every front.
- **Component compiler** (PRD D10, `libs/mintplayer-component-compiler`, `@mintplayer/nx-component-compiler`):
  a component is written ONCE in ui-core as a core (`ComponentCore`, `ui-core/component`), a Vue-syntax view
  (`<name>/src/templates/*.view.vue`) and a plain-data manifest (`<name>/src/<name>.component.ts`, `import type`
  only — Node loads it with types stripped). The compiler GENERATES the whole Angular / React / Vue / Lit
  component into each front's `<entry>/src/generated/` (gitignored), via the inferred Nx target
  `mintplayer-ui-core:compile-components` (`-check` fails on stale output). Never hand-write a front for a
  component that has a manifest; a front-specific need goes in an extension file next to the entry
  (`<element>.angular.ts`: `hostDirectives` / `providers` / `extendInputs`; React `useExtendInputs`). Two-way
  inputs are `model: true` (Angular `model()`, Vue `update:x`, Lit property write-back). Scaffold a new group
  with `nx g ./libs/mintplayer-component-compiler:component <name>`. The template subset is in the lib's
  README; the navbar is the reference.
- **Directives** (`kind: 'directive'`, PRD #458 §4.3): a group lists them under `directives: {…}` beside
  `components`. A directive core's `view` returns the bag for **the consumer's element** (it opted in, so
  stamping `data-mps` there is legitimate). Fronts: an Angular `@Directive`, a React `useBs<Name>()` hook
  returning mergeable props, a Vue custom directive (with `getSSRProps`), a Lit element-part directive.
  `overlay: '<panel component>'` renders that panel into a body host while `props.overlay` is non-null
  (tooltip, popover, `[bsDropdown]`). No hand-written directive path remains.
- **Angular front SSR**: render the whole tree (including hidden popups) so server and client DOM are
  identical; hydration then attaches to the same nodes. Drive everything from signals under OnPush.
  **Overlays are the exception** (#458 §4.4): modal, offcanvas, tooltip, popover and dropdown panels render
  into a body host, a `div` at the end of `<body>` (copying `data-bs-theme`, `dir`, `lang`), so no
  clipping ancestor can cut them. Angular renders a detached embedded view there (the client replaces the
  server's host), Vue `<Teleport>` and React `createPortal` only on the client, Lit `render()`. Without
  JS a closed overlay cannot open, so nothing depends on its server copy.
- **Fronts are transparent** to `aria-*`, `id`, `tabindex` — but never forward a consumer `role` onto a node
  whose role is part of the core's contract (the React passthrough guard has `fixedRole` for this). Where a
  host-rooted template's role lives on an inner `mp-attrs` node, Angular (`useHostAttrs` + `[mpHostAttrs]`)
  and Lit (`takeHostAttrs` + `forwardHostAttrs`) move `id` / `tabindex` and copy `aria-*` onto it; an `id`
  the core writes there itself wins, and the consumer's goes back to the host.

### What a generated front looks like (and how to test it)

- **The root bag lands on the host in Angular and Lit** (`bs-foo` / `mp-foo` carries `class="foo"`,
  `data-mps`, the role); React and Vue render it on a `div.foo`. In a spec, query the host itself, not
  `.foo` inside it.
- **Outputs are lowercased** everywhere: Angular `(layoutchange)`, Vue `@layoutchange`, Lit a
  `layoutchange` CustomEvent; React `onLayoutChange` receives the payload, not an event. **Angular outputs
  are `output()`s, not DOM events** — an e2e cannot listen for them; observe the committed DOM instead
  (expose `data-*` hooks in the core's bags, as the scheduler's `data-start` / `data-end` do).
- **Two-way models** (`model: true`) write back only when the core calls `api.setState(patch)` with the
  model's own key; `api.emit` dispatches an output and nothing else.
- **Readiness:** a core that attaches behaviour writes `hydratedAttr()` (`data-mp-hydrated`, from
  `ui-core/store`) on its root. It is never in server HTML, so e2e waits on it rather than on markup the
  server already rendered.
- **Consumer content** is front-native: slots (`<ng-template>` directive / render prop / scoped slot /
  `slot=`), never a render callback returning DOM. A slot must be an identifier and never share an input's
  name (React and Vue would pass the slot as the input: hence `iconTemplate`, `labelTemplate`). Content that
  must survive a move is teleported into core-owned hosts (`<teleport :to>`, the dock); nested children read
  as declarations go through a manifest `content:` query (the ribbon), so the parent can server-render chrome
  for them.
- **Front-specific needs** go in an extension file next to the entry, never into the generated output:
  Angular `<element>.angular.ts` (`hostDirectives`, `providers` — e.g. the CVA, `extendInputs`), React
  `useExtendInputs`. Every form control is a `ControlValueAccessor` in Angular and `v-model` in Vue.
- **Stale manifests fake failures:** after a core or template change rerun the compiler
  (`nx run mintplayer-ui-core:compile-components`); after a Lit front's inputs change, `custom-elements.json`
  goes stale and the WC conformance specs misreport — rerun `nx run mintplayer-web-components:cem
  --skip-nx-cache`.
- **Import lists go stale on every conversion:** `no-custom-elements-in-fronts` and the scoping specs list
  components explicitly; prune or extend them in the same commit.

### Bootstrap layering (#452, `docs/prd/per-component-styles-452.md`)

- **C1. Bootstrap ships PER COMPONENT, as compiled parts.** Templates use plain Bootstrap classes
  (`form-control`, `dropdown-menu`, `nav-tabs`, `table`, …). Each component partial is compiled once in
  ui-core (`styles/parts/<partial>.bootstrap.scss` → a generated string module) and the component that
  renders it installs it (`useBootstrap(...)` in Angular, `installBootstrap(...)` elsewhere, or the
  manifest's `bootstrap: [...]`) through the scoped-style registry: once per page, written into the head
  during SSR, imported only by that component so it rides the component's lazy chunk. **Never add a
  component partial to the page baseline, and there is no global opt-in.**
- **C1a. Attribute scoping.** A part matches only DOM a @mintplayer component rendered: the leftmost
  compound carrying a class the partial owns gets `:where([data-mps])` (presence, not value — partials
  cross components; `:where` — specificity stays stock). Every component stamps its own elements (the
  compiler for D10 groups, by hand elsewhere), never projected consumer content. Raw Bootstrap markup on a
  consumer's page installs the verbatim `bootstrap<Partial>Page` from that page; it replaces the scoped
  copy under the same registry key, so a page never holds two copies.
  **The anchored guard** (#458 §4.1): a partial's ROOT classes stay strict (`.table:where([data-mps])`),
  but a SUB class (documented content: `.table-active`, `.modal-title`, `.form-label`, `.nav-link`)
  matches when it is stamped itself OR sits inside a stamped root of its partial —
  `.modal-title:where([data-mps], .modal-content[data-mps] *)`. So consumer content projected into a
  component gets Bootstrap's sub-class styling without being stamped. One classification table per
  partial (root / sub / anchors) is fail-closed: an owned class in neither list is a codegen error.
- **C2. The page baseline** `@mintplayer/ui-core/styles/bootstrap.scss` holds only the PAGE-LEVEL partials:
  root, reboot, type, images, buttons (+ the `--bs-primary` re-bind), helpers and the utility API with the
  workspace patches (`styles/baseline/*`). Angular's `_bootstrap.scss` re-exports it; React and Vue apps
  import it instead of `bootstrap.min.css`.
- **C3. Cascade layers.** The baseline declares the order once: `mp.bootstrap.{base, components, helpers,
  utilities}`, then `mp.components`; every part repeats the statement. **Every part (and the baseline's
  buttons) shares the ONE `mp.bootstrap.components` layer**, so specificity between partials decides as in
  stock Bootstrap (`.card > .list-group` beats `.list-group`; a layer PER partial broke ~96 such overrides,
  measured). Equal-specificity ties follow stock order because the registry inserts part sheets sorted by
  `part.order` (`BOOTSTRAP_PARTIAL_ORDER`): `<style>` tags, adopted sheets, SSR output and shadow mirrors
  alike. Helpers and utilities stay later layers (a `.fixed-top` beats `.navbar`). Component rules beat Bootstrap regardless of specificity, a
  consumer's unlayered CSS beats both (theming needs no `!important`), and Bootstrap's `!important`
  utilities still win.
- **C4. A scoped sheet carries only what Bootstrap lacks** — layout, state on native carriers
  (`details[open] > .dropdown-menu`), component parts, host `display`, focus rings, reduced motion — and
  **never imports a Bootstrap partial** (functions, variables and mixins only): the part ships it.
  `ui-core/_conformance/no-bootstrap-partials-in-scoped.spec.ts` enforces it.
- **C5. No front has a shadow root** — the Lit elements included, since #458 — so no front `@import`s
  partials anywhere, and no Angular component has a `:host ::ng-deep` partial sheet.
- **C6. Dark mode is page-level**: `[data-bs-theme]` on `<html>` reaches every front. The baseline still
  publishes `--mp-color-mode` for a consumer's own shadow roots; no front queries it.

## Accessibility

Non-negotiable for new components and for edits to existing ones. WCAG 2.2 AA + the WAI-ARIA
Authoring Practices pattern for the widget. Prefer a native element that owns its own state over
an ARIA attribute you have to remember to update — `<details>`, a real `<button>`, a `:checked`
input stay correct with no write path; `aria-expanded` on a `<div>` is correct only while every
code path remembers it.

- **Role and name.** Every interactive element exposes a role and a non-empty accessible name.
  Icon-only buttons, close/clear buttons, sort toggles, paginator arrows, drag handles, resize
  grips and chip-remove buttons are where this is always missed.
- **State on the role.** `aria-expanded` / `-selected` / `-checked` / `-current` / `-sort` /
  `-valuenow` belong on the element carrying the role, and must update in the same render as the
  visual change. State written only from an event handler is stale in SSR output — see the no-JS
  rules.
- **IDREFs never cross a shadow boundary.** `aria-labelledby` / `-describedby` / `-controls` /
  `-activedescendant` resolve only within their own tree. Never copy an IDREF from the host onto a
  node in the shadow root, and never point a host attribute into the shadow root. Use
  `ElementInternals` reflected element references (`ariaLabelledByElements`) or move the role to
  the host.
- **A WC whose role lives on an inner node must accept a `label`.** Expose a `label` (or
  `aria-label`) attribute and render it onto the role-bearing node. A consumer cannot reach inside
  a shadow root, and `aria-label` on a roleless host is ignored by browsers.
- **Fronts are transparent.** A consumer's `aria-*`, `id` and `tabindex` on a front must reach the
  role-bearing node (a consumer `role` only where the core's contract leaves it free). The compiler's
  `mp-attrs` routing does this in React and Vue; in Angular and Lit the root bag is on the host. The
  `_conformance/attribute-passthrough` / `aria-passthrough` specs in each lib enforce it.
- **Every pointer gesture has a keyboard equivalent.** Drag to resize, drag to reorder and swipe
  are each a keyboard-operable command too, with the keymap announced on entry via the live
  announcer. No keyboard path is a release blocker, not a follow-up.
- **Focus ring inside the shadow root.** Bootstrap's focus-ring utilities do not cross the
  boundary, so `outline: none` needs a `:focus-visible` replacement declared in the component's own
  SCSS. A background-colour change shared with `:hover` is not a focus indicator.
- **Hidden means hidden from both trees.** Content hidden visually must be out of the tab order and
  out of the accessibility tree (or in neither). Never `aria-hidden` a focusable element or an
  ancestor of one; never leave an off-screen panel's controls tabbable.
- **Accessible names are localized strings.** A name that only exists as a hard-coded English
  literal in a template is a translation bug. Route it through the same mechanism as visible text.
- **Focus survives a rebuild.** When a list, tree or grid is rebuilt imperatively, restore focus by
  stable item key, not by index or DOM position. Focus falling to `<body>` loses a keyboard user's
  place entirely.
- **Reduced motion.** Auto-advancing or animating widgets honour
  `@media (prefers-reduced-motion: reduce)` in their own SCSS.
- **One message, one channel.** A string goes to *either* a live region *or* a described-by node
  — never both, or screen readers speak it twice, often at two urgencies. A live region is for
  transient events the user need not revisit; it self-clears, so it cannot hold anything
  re-readable. A **validation message must persist**, so it belongs in an `errorFeedback()` node
  referenced by `aria-errormessage` + `aria-describedby` from the **role-bearing** control, and is
  spoken by *moving focus there* — which means a refused submit must move focus, or the message is
  silent. Never announce by INSERTING a node that already carries `role="alert"`: a region mounted
  in the same task as its text is unreliably announced. And a validation message for a control
  whose role lives inside a WC's shadow root **must** travel in as `error-text` —
  `aria-describedby` on the roleless host reaches nothing.

### No-JS: two tiers, and the rules differ

Declare which tier a component targets, in the core's doc comment.

**Tier 1 — CSS `:checked` state machine (interactive with no JS).** The `<input>` *is* the state, so
it MUST keep its native role — `role="button"` on a checkbox suppresses the only state AT can read.
It MUST carry `aria-controls` naming the region it reveals, MUST be named by a `<label for>` or
`aria-label` that reads correctly in both positions, and `checked` MUST mean *revealed* with no
viewport- or mode-dependent inversion. Reference implementation:
the accordion, `libs/mintplayer-ui-core/accordion/src/templates/accordion.view.vue` (native
`<details name>` rows).

**Tier 2 — server-rendered, inert until hydrated (visible with no JS).** The server renders the same
tree the client hydrates. So: a role whose ARIA contract only holds once JS runs (a `tablist` with a
roving tabindex, `role="menu"` with `menuitem`s) is written by the core only in its enhanced/hydrated
state, with a degradation that is valid without it (the tab control's radios + labels); and never
render a control as enabled when it cannot function (the file manager's toolbar is disabled until live).

Both tiers: `aria-expanded` (or any state) written only from an event handler is frozen at its
server value. State belongs in the core's snapshot and its bags, so the server HTML tells the truth.

### Before you open the PR

1. Tab through it, keyboard only. Every control reachable, visibly focused, no trap, Escape closes.
2. Every pointer gesture has a keyboard equivalent, and the demo page documents the keymap.
3. Roles/names/state asserted in a `*.aria.spec.ts` — the states too, not just the initial render.
4. `aria-label` / `role` / `id` / `tabindex` set on the front land on the role-bearing node, in all
   four fronts.
5. View it with JS disabled and check the tier rules above.
6. No `outline: none` without a `:focus-visible` replacement in the same stylesheet.

## Build & test

**In an Angular front's spec, drive inputs from a `signal()`, never a mutable field.** Change detection is
signal-driven: a plain-field write on the test host notifies nothing, so `fixture.detectChanges()`
does not re-evaluate the binding and the child's `input()` silently keeps its old value. A literal
binding and a signal host both propagate correctly — a mutated field does not, and the spec fails
looking like a component bug.

**Run test suites only once ALL milestones of a task are implemented — never after each one.**
The suites here are slow (`nx test mintplayer-ng-bootstrap` alone is ~2.5 min, a full
cross-app e2e sweep far longer), so a per-milestone run costs more time than it saves.
Verify intermediate work by reading the code and type-checking; commit per milestone if you
like, but batch the build + unit + e2e sweep into a single pass at the end.

```bash
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap        # ng-packagr secondary entries
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components        # vitest + jsdom
# backend (no migration unless entities change):
dotnet build apps/api/Api.csproj -c Debug
```

Issue branches target **`master`** (not `development`). Breaking changes are acceptable when documented — the libraries favor a clean API over back-compat shims.

**All pull requests are squashed into `master`.** No intermediate commit ever lands on the default
branch, so a commit part-way through a PR does **not** have to build or pass tests — only the final
state of the branch does. Commit freely at each milestone to keep the work reviewable and revertable;
don't hold back a commit because the suite is mid-refactor, and don't spend a run proving an
intermediate commit green. This is the other half of the batching rule above: verify by reading and
type-checking as you go, and run the suites once at the end.

A corollary for commit messages: since they are squashed away, the durable record of *why* is the PR
description and the docs under `docs/prd/` — put reasoning that outlives the branch there, not only in
a commit body.

### Pushing costs money — commit freely, push rarely

**Every push triggers the GitHub workflow, and every workflow run is billed** (money or included
credits). So:

- **Commit** at every milestone — commits are free and keep the work reviewable and revertable.
- **Push only when a feature is fully implemented, or a review/update flow is fully finished.**
  Never push "so CI can have a look" mid-feature, and never push a follow-up commit two minutes
  after the last one — batch them.
- A push that lands while a run is in flight **cancels that run** (concurrency group), so rapid
  pushes don't just cost extra, they also throw away the verdict you were waiting for. Several
  cancelled runs in a row means you paid for nothing.
- Verify locally instead: type-check, the targeted specs you are iterating on, and the batched
  suite sweep at the end (above). Push once, then read the single run.
