# CLAUDE.md

Project-wide technical conventions for the `@mintplayer/*-bootstrap` workspace. Read this before adding components.

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
  elements), for consumers without a framework. Most are generated; a few slot-based ones (checkbox, toggle
  button, tab control, pagination, shell…) are hand-written shadow-root elements.
- `libs/mintplayer-component-compiler` — the component compiler (PRD D10) and its Nx plugin.
- Demo apps: `apps/{ng,react,vue}-bootstrap-demo` (+ `-e2e` Playwright projects).
- Backend for data-driven demos: `apps/api` (ASP.NET Core + EF Core).

**A framework front never renders an `<mp-*>` element.** Angular SSR runs on domino (no `customElements`), so a
wrapper around a custom element server-renders an empty tag; every front renders real HTML instead.

## Hand-written Lit elements (`@mintplayer/web-components`)

This section applies to the hand-written `mp-*` elements. A component with a D10 manifest has its Lit front
generated into `<name>/src/generated/` — never hand-write or edit it. Each hand-written WC lives at
`libs/mintplayer-web-components/<name>/` with this shape:

```
<name>/
  index.ts                       → export * from './src'
  (no ng-package.js — the WC lib builds with Vite; the 5 stray ng-package.js files in older WC dirs are inert)
  src/
    index.ts                     → public API barrel
    components/<el>.ts           → the LitElement (calls customElements.define at the bottom)
    styles/<name>.styles.scss    → hand-written styles  ──┐ codegen input
    styles/<name>.styles.ts      → GENERATED, do not edit ◄┘ (exports `<camelName>Styles`)
    types/ , providers/ , ...
```

Some larger components instead use `<el>.element.html` + `<el>.element.scss` → a GENERATED `<el>.element.template.ts` (exports `template` + `styles`). Either pattern is fine; inline `html\`\`` in `render()` suits dynamic templates, the `.element.html` pattern suits mostly-static structure.

### SCSS / template codegen (important)

`.styles.scss` and `.element.html`/`.element.scss` are **compiled into TypeScript** by `tools/scripts/build-web-components.mjs`. The element imports the *generated* `.ts`, never the `.scss` directly. So:

- **After editing any `.styles.scss`, `.element.scss`, or `.element.html`, re-run codegen or the change is invisible:**
  ```bash
  npx nx run mintplayer-web-components:codegen-wc
  # watch mode:
  npx nx run mintplayer-web-components:codegen-wc-watch
  ```
- `nx build mintplayer-web-components` runs `codegen-wc` + `cem` (custom-elements manifest) automatically as `dependsOn`.
- Generated files (`*.styles.ts`, `*.element.template.ts`, `custom-elements.json`) are **gitignored build artifacts** (`.gitignore`: `libs/**/*.styles.ts` etc.) — never stage or hand-edit them; only the `.scss`/`.html` sources are tracked.

### Light tier — emulated encapsulation, no shadow DOM

A component that mounts **consumer-authored DOM** (a render callback like `rowRenderer` /
`cellRenderer` / `nodeRenderer`, or a direct `appendChild` of a consumer element) must render in the
**light DOM**. Inside a shadow root that content is starved: the page's stylesheets — the consumer's
own Angular/React/Vue component CSS *and* Bootstrap's global utilities — cannot cross the boundary,
so a `<bs-badge>` in a datatable row renders as bare text and `me-2` does nothing (issue #408).
Every D10-generated front is light DOM by construction (the host is the render root and the core's bags
carry `data-mps`), so these rules now bite only a **hand-written** element; `mp-typeahead` is the remaining
hand-written light-tier reference.

**The admission rule is mechanical:** mounts consumer DOM ⇒ light tier. Takes content only through
real `<slot>`s ⇒ keep the shadow root (slotted nodes never leave the light DOM, so they are already
fine). Do not convert a slot-based component.

Encapsulation is preserved at build time instead of by the boundary, the way Angular's
`ViewEncapsulation.Emulated` does it:

- `<name>.light.scss` → codegen emits `<name>.light.styles.ts` with the CSS **rescoped**: `:host`
  becomes the tag name, every other compound gains `[data-mps=<scope>]`. `::slotted` /
  `:host-context` / `:root` / `html` / `body` subjects are hard codegen errors. A rule that must
  ship verbatim is preceded by `/*! @mps-global */` and authored in FINAL form.
- The element uses `scopedHtml('<scope>')` — **never lit's bare `html`**; an unstamped element is an
  unstyled element. `unsafeHTML` output and imperative DOM need `stampScope` — and **`stampScope`
  recurses, so call it BEFORE consumer content is appended**, never after. Stamping a subtree that
  already holds a consumer's node brands their DOM with your scope and lets your rules (a bare
  `button[data-mps=…]`, say) match their content. The decoy suite cannot catch this: it only tests
  UNSTAMPED elements. `_conformance/consumer-dom-boundary.spec.ts` pins it.
- `createRenderRoot()` returns `this`; `installLightStyles('<scope>', sheet)` runs right before
  `customElements.define`. The SSR guard checks `document.head`, not `typeof document` — Angular's
  SSR DOM shim provides a `document` with no usable head.
- `_conformance/light-styles-scoping.spec.ts` enforces the no-leak property on every build: each
  compound must carry its own scope, and no selector may match a decoy tree of elements sharing our
  class names. Exemptions are listed explicitly in that file, never added silently.

**Two rules that are easy to get wrong, both found by measurement:**

- **Nesting.** A light-tier component's sheet is installed at DOCUMENT level, and document CSS does
  not cross a shadow boundary — so a component that KEEPS its shadow root but renders a light-tier
  component inside it starves it (issue #408 again, one level up). Any such host must mirror the
  registry: `adoptLightStyles(this.renderRoot)` in `connectedCallback`, disposing on disconnect.
  `mp-accordion` and `mp-shell` do it. `_conformance/light-styles-nesting.spec.ts` enforces it.
- **Do not import a Bootstrap partial into a component sheet at all** (C4 under "Bootstrap
  layering" below). The page ships the whole baseline, so a rescoped copy is a duplicate that
  silently WINS on specificity (`.btn[data-mps=…]` beats `.btn`) and makes the page's own theming
  unoverridable. Only a shadow-root element, which the page's CSS cannot reach, re-declares what it
  needs (the `_styles/*.styles.scss` partial copies).
- **Every document-level sheet goes through `installLightStyles` — light tier or not.** A slot-based
  component that needs document CSS for its slotted content (`mp-card`: `::slotted()` cannot reach
  `.card-title` inside a body, nor out-rank Bootstrap's `.card-header`) installs it through the
  registry too, with every rule anchored on its host tag (`mp-card > .card-header`). Issue #432: the
  card appended its own `<style>` instead, no spec saw it, and its unanchored `.text-bg-*` copy —
  with a Sass-printed `RGBA(#hex, var(…))` that computes to transparent — blanked every badge on the
  page. `_conformance/document-style-writers.spec.ts` enforces the single writer,
  `light-styles-scoping.spec.ts` checks every REGISTERED sheet (not a filename glob), and
  `no-invalid-css-values.spec.ts` rejects hex inside a colour function in sheets and in the dist.

Styling DOM the rewriter cannot stamp (`unsafeHTML` output, a consumer's node, another component's
rendered content) is done by anchoring on a scoped ANCESTOR, marked `/*! @mps-global */` and
authored in final form — `.treeview-icon[data-mps=treeview] svg`, not `.treeview-icon svg`. The
match still requires an element we stamped, so nothing outside can be hit. Prefer this over having
one component stamp another's scope, which would couple it to that component's internals.

Consequences to design around:

- **Encapsulation is one-directional.** Page CSS now reaches the component's internals — the same
  property `ViewEncapsulation.Emulated` has everywhere else. Accepted deliberately; document it
  rather than fighting it.
- `::part()` and `::slotted()` no longer apply to a converted component. Its `part=` hooks, if any,
  are removed; consumers style it with ordinary CSS.
- Queries move from `shadowRoot` to `renderRoot`, and focus reads from `document.activeElement`
  rather than a shadow root's `activeElement` — under a shadow root, `document.activeElement` was
  the *host* because focus is retargeted at the boundary.
- **Lit in the light DOM is safe for nodes passed as binding values** (measured): a keyed dynamic
  template survives re-render, reorder, whole-page key replacement, template *shape* change and
  zero-rows recovery with node identity intact. The trap is different — it bites *pre-existing light
  children the host owns but lit does not manage*.
- `@extend` from `:host` does not unify into compounds; restate such rules as `:host(...)`.
- Converting a component breaks its specs in four predictable ways, and each has a faithful
  translation rather than a weakening: `el.shadowRoot` → `el.renderRoot`; `shadowRoot.activeElement`
  → `document.activeElement`; `document.activeElement === host` →
  `host.contains(document.activeElement)` (the equality was asserting shadow focus RETARGETING, not
  focus location); and any helper that walks `el.shadowRoot` to settle or search descendants must
  use `el.shadowRoot ?? el` **and filter to custom elements** — in the light DOM that walk covers the
  whole rendered tree, which took one suite from ~8s to 18-22s per test.

### WC gotchas

- `static get observedAttributes()` must be a **static getter** (spread `super.observedAttributes`), not a static array.
- **Do not shadow read-only DOM properties.** `HTMLElement` already defines `scrollHeight`, `title`, `lang`, etc. as typed members — defining a same-named accessor fails to compile (`TS2416`). Pick a non-clashing name (e.g. `panelScrollHeight` with attribute `scroll-height`).
- **Bootstrap utility classes do not cross the shadow boundary.** `p-0`, `d-flex`, reboot defaults — none reach inside a WC's shadow root. Re-declare every rule you need in the component's own SCSS.
- Per-component templates that vary per row must be **render-callback functions** (see `mp-treeview.nodeRenderer`), not slots — slots can't be per-node in a dynamic tree.
- Composition over reinvention: reuse `OverlayController` (`libs/.../overlay`) for popups and `mp-treeview` for trees.
- **No backticks inside a comment inside ANY tagged template** — `css\`\`` *and* `html\`\`` (an HTML comment is still inside the JS template literal, so a backtick there terminates it and the build fails somewhere confusing). Use bare names in both.
- **Every dynamic `import()` specifier in lib source must be a static string literal.** A computed one (`` import(`./x/${k}.js`) ``, even with `/* @vite-ignore */`) survives into the published `.mjs` and then either hard-fails an esbuild consumer's build **or — worse, silently — globs the whole target directory into their bundle**. Generate a static loader map instead (`flags/src/flag-loaders.generated.ts` is the pattern).
- **Styling a slotted `mp-*` control from an outer WC: `::slotted()` is the weakest link in the cascade.** Measured order for one slotted element: `::slotted()` normal **<** the control's `:host` normal **<** the tree the element lives in (page CSS / the composing element) **<** `::slotted()` `!important`. So a container cannot restyle a slotted control's geometry with a plain rule when the page already sets that property (Bootstrap's `.form-control { border-radius }`, `width: 100%`) — the selector matches while the declaration silently loses. Mark container geometry `!important`, let a control size itself from `:host`, and reach *inside* a control only through inherited custom properties.
- **A container query can reach into a shadow root; a media query cannot see a narrow host.** `container-type: inline-size` on a WC's `:host` is matched by `@container` rules authored **inside a nested WC's own shadow root** — container-query ancestor lookup crosses shadow boundaries (measured, 3 engines). Use it instead of `@media` whenever a component can be narrow inside a wide viewport (sidebar, modal, grid cell). The container must be the host, never the flex container you are styling — an element cannot be its own container. **`container-type` no longer establishes a containing block** (that was an acknowledged spec mistake, removed in Chromium 129 and matched since): measured byte-identical geometry for a top-layer `::picker(select)` under containment. Note `getComputedStyle().contain` reports `none` while `containerType` reports `inline-size`, so assert on the latter.
- **In flex, `min-width: 0` cannot prevent wrapping** — line-breaking uses each item's *hypothetical main size* and shrinking happens only after the line is chosen. An intrinsically wide item (a native `<select>` sizes to its **widest option**) takes a whole line no matter what its `min-width` says; only `flex-wrap: nowrap` or a real `flex-basis` (`flex: 1 1 0`, not `1 1 auto`) changes that. And `nowrap` alone can be *worse* than the wrap it fixes: if a sibling cannot shrink, the overflow moves to the page (measured: a 26px-wide input and 131px of horizontal page scroll). Constrain the wide item's basis first. **The corollary is the useful tool:** because `min-width` *clamps* the hypothetical main size, a non-zero floor is how you get "shrink to readable, then wrap" — `flex: 1 1 auto; width: 1%; min-width: 6rem` holds a 6-control toolbar on one row at 1280px and wraps it to 107px controls at 390px, where Bootstrap's literal `min-width: 0` crushes it to 27px controls on a single line at every width (measured, `mp-input-group`).
- **A `::slotted(mp-foo)` selector is dead whenever a framework wrapper is what gets slotted.** Angular wrappers render `<mp-foo>` *inside their own template*, so `<bs-input-group><bs-select/></bs-input-group>` assigns `<bs-select>` to the slot and the `mp-*` element sits one level deeper. React (`@lit/react` roots at the tag) and Vue (no host element) slot the element directly — so a tag-named rule works in two frameworks out of three and its absence is invisible in the third. This shipped a control collapsed to 0px wide. **Never address slotted children by `mp-*` tag name**: select on what they are *not* (`::slotted(:not(.addon):not(button))`), or use the inherited-custom-property channel, which cannot care what an element is called. Same trap for JS that walks `this.children`: `'BS-SELECT'.includes('-')` is true, and an attribute written on a wrapper host reaches nothing, because an Angular signal input does not observe a runtime `setAttribute`.
- **A host with `container-type: inline-size` contributes ZERO intrinsic inline size, so it can never size itself from its own content.** Inline-axis size containment means max-content resolves to 0, so the moment such a component lands in a shrink-to-fit context (an un-flexed flex item, a float, `width: fit-content`) it collapses to 0px wide rather than merely being narrow — measured across 3 engines, and the *amplifier* that turned a missed flex rule into an invisible control. Any WC that declares `container-type` must be given an inline size by its context; when one renders at zero width, suspect containment before the obvious sizing bug. `display: contents` on an interposed wrapper does **not** rescue it (it also stops `::slotted()` matching anything).
- **A nested WC's own container query silently outranks an enclosing container's pairing.** Where a contract offers both a specific and a general custom property (`--x-top-start` before `--x-start` in a `var()` fallback chain), an `@container` rule inside the inner component that sets the *specific* one defeats the outer component's *general* one — the enclosing container's value is still inherited and still correct, and loses anyway with no diagnostic. Check the fallback order before assuming an inherited channel reached its consumer.
- **`input[type=tel|url|email]` is UA-forced to `direction: ltr`, even inside `dir="rtl"`.** A logical property on such an input resolves against *its* direction, not its container's, so `border-start-*` / `margin-inline-*` land on the wrong side. Use physical properties under `:host(:dir())` guards when styling one from a container. (Elements whose whole chain inherits `rtl` — a slotted `<select>`, an overlay in your own shadow root — keep logical properties.)

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
  target; no lit import), rescoped with `[data-mps=<name>]` like a light sheet. Every front writes
  `data-mps="<name>"` on its own nodes (it is in the bags) and installs the sheet through the shared registry
  (`ui-core/scoped-styles`, which `web-components/light-dom` re-exports). Angular writes it into `DOCUMENT.head`
  on the server — no string post-processing. No `styleUrls`, no `::ng-deep`.
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
- **Angular front SSR**: render the whole tree (including hidden popups) so server and client DOM are
  identical; hydration then attaches to the same nodes. Drive everything from signals under OnPush.
- **Fronts are transparent** to `aria-*`, `id`, `tabindex` — but never forward a consumer `role` onto a node
  whose role is part of the core's contract (the React passthrough guard has `fixedRole` for this).

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

### Bootstrap layering (PRD §6, C1–C6)

- **C1. Bootstrap is a page-level prerequisite.** Templates use plain Bootstrap classes (`form-control`,
  `dropdown-menu`, `nav-tabs`, `table`, …) and the page's Bootstrap styles them.
- **C2. One baseline:** `@mintplayer/ui-core/styles/bootstrap.scss` (every partial the catalog uses, plus the
  workspace patches and utilities). Angular's `_bootstrap.scss` re-exports it; React and Vue apps import it
  instead of `bootstrap.min.css`.
- **C3. Cascade layers.** The baseline is `@layer mp.bootstrap`, every scoped sheet `@layer mp.components`,
  ordered once at the top of the baseline. Component rules beat Bootstrap regardless of specificity, a
  consumer's unlayered CSS beats both (theming needs no `!important`), and Bootstrap's `!important`
  utilities still win.
- **C4. A scoped sheet carries only what Bootstrap lacks** — layout, state on native carriers
  (`details[open] > .dropdown-menu`), component parts, focus rings, reduced motion — and **never imports a
  Bootstrap partial** (functions, variables and mixins only). `ui-core/_conformance/no-bootstrap-partials-in-scoped.spec.ts`
  enforces it.
- **C5. No front has a shadow root**, so no front imports partials. (The hand-written shadow-root Lit
  elements are the exception and re-declare what they use from `web-components/_styles`.)
- **C6. Dark mode is page-level**: `[data-bs-theme]` on `<html>` reaches every front. `@container
  style(--mp-color-mode)` queries exist only for shadow-root elements.

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

Declare which tier a component targets, in the element's class comment.

**Tier 1 — CSS `:checked` state machine (interactive with no JS).** The `<input>` *is* the state, so
it MUST keep its native role — `role="button"` on a checkbox suppresses the only state AT can read.
It MUST carry `aria-controls` naming the region it reveals, MUST be named by a `<label for>` or
`aria-label` that reads correctly in both positions, and `checked` MUST mean *revealed* with no
viewport- or mode-dependent inversion. Reference implementation:
`libs/mintplayer-web-components/accordion/src/components/mp-accordion.ts` (native `<details name>` rows).

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

**In a wrapper spec, drive inputs from a `signal()`, never a mutable field.** Change detection is
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
