# PRD — Headless core + four fronts for the whole catalog (#437)

**Status:** Proposed (2026-10-20). Spikes S1–S12 gate the design decisions marked *(spike)*.
**Issue:** #437. **Pilot:** #436 typeahead (`docs/prd/typeahead-wc-436.md`, PR #438).
**Plan:** `docs/prd/headless-catalog-437-plan.md`.
**Delivery:** one pull request, per the workspace rule. Milestones are committed separately and the PR is squashed.

## 1. Summary

Every component that is backed by a web component today is rebuilt the way the typeahead was:

- **The core.** A framework-neutral TypeScript class in `@mintplayer/ui-core/<name>`, extending `Machine<S>`. It owns state, transitions, keyboard intent, async lifecycles, ARIA attribute bags and the component's scoped stylesheet.
- **Four fronts.** An Angular component, a React component, a Vue SFC and a Lit element each render their **own** template from that core.
- **No more `<mp-*>` in the framework libraries.** The Angular, React and Vue libraries stop rendering `<mp-*>` elements.

The result:

- Angular SSR emits real, data-filled HTML for every component.
- Hydration attaches to that HTML.
- With JavaScript disabled, every page shows each component in its initial state, through native carriers: named inputs that submit, `<details>`, `:checked` radios, links, tables and `<select>`.

What gets deleted once nothing depends on it:

- the DSD chrome generators;
- the server-side injectors;
- the `data-js` gates;
- the `isPlatformServer` empty-render branches.

Because there is no shadow root any more, **Bootstrap CSS integration changes** (§6). Bootstrap becomes a page-level stylesheet, identical in all three frameworks and placed in a cascade layer. Component sheets carry only what Bootstrap lacks.

## 2. Problem

The facts are from issue #437 and the 2026-10-20 investigation:

- **No usable no-JS output for most components.** 30 of 83 Angular components wrap an `mp-*` element, and React and Vue wrap the same elements. Domino, Angular's server DOM, has no `customElements`, so each of these renders an empty tag on the server.
- **Only five components work without JS:** shell, navbar, carousel, accordion and dropdown-menu. They work through build-time DSD chrome, and that chrome grows a variant matrix: the accordion alone has 26 variants.
- **The light-tier components cannot be rendered by Lit SSR at all.** These are datatable, treeview, tree-select, file-manager and the query-builder family.
- **The Bootstrap baseline differs per framework.**
  - Angular ships only `root`, `reboot`, `type`, `images`, `buttons`, helpers and utilities globally (`libs/mintplayer-ng-bootstrap/_bootstrap.scss`).
  - The React and Vue demos load all of `bootstrap.min.css`.
  - Twenty WC sheets re-import Bootstrap partials into their own shadow roots.

## 3. Goals

- **G1.** Every component listed in §8 has a core plus four fronts. No Angular, React or Vue source renders an `<mp-*>` tag; a conformance spec enforces this.
- **G2.** Angular SSR output for every demo route contains the component's real markup. With JS off, nothing renders as an empty box, enforced by an SSR conformance spec per demo route. React and Vue SSR (`entry-server`) get the same property for free, because their fronts are now plain components.
- **G3.** No-JS behaviour per component as listed in the §8 *no-JS target* column:
  - Form controls submit under their `name`.
  - Disclosure widgets open.
  - Pagination and sort are links.
- **G4.** Hydration is clean: server and client produce identical DOM, there are no hydration-mismatch warnings, and text typed before hydration is kept.
  - The typeahead's `adoptPreHydrationText` becomes a shared helper for every text-entry control.
- **G5.** Bootstrap integration per §6. A consumer's unlayered CSS overrides any component's Bootstrap-derived look, in all three frameworks.
- **G6.** Accessibility at least as good as today. Every `*.aria.spec.ts` is ported to every front, and axe and axe-nojs stay green.
- **G7.** The dead infrastructure in §10 is deleted in the same PR.

## 4. Non-goals

- No-JS or SSR for the **Lit front**. Light-tier and slotted Lit elements stay client-rendered. The Lit front exists for non-framework consumers.
- New features. Behaviour and options stay as they are; APIs change only where the architecture forces it (§11).
- Bootstrap 6.

## 5. Architecture (inherits #436; deltas only)

The pilot's layout carries over unchanged:

- the core in `libs/mintplayer-ui-core/<name>`;
- the bridges (`machineSignal` + `[mpProps]` for Angular, `useMachine` for React and Vue, `MachineController` + `props()` for Lit);
- `<name>.scoped.scss`, which compiles to a `*.scoped.styles.ts` string;
- `data-mps` stamping;
- deterministic ids from a root id supplied by the front.

### D1. Compound components share one core *(spike S2)*

Today parent–child elements find each other by DOM. Examples are radio-group and radio, accordion and tab, navbar with item and dropdown, tab-control and page, splitter and pane, timeline and item, and ribbon with its 17 children.

In the new model the **parent owns the core, and children register with it**, each receiving a handle (`core.register(key, options) → ChildHandle`). The front supplies the channel:

| Front | Channel |
|---|---|
| Angular | DI: the parent component provides the core, children `inject()` it |
| React | context |
| Vue | `provide` / `inject` |
| Lit | `@lit/context`, already used by the query-builder |

Children render their own row, as in the existing rule that a child owns its row. The parent never re-projects children for layout.

SSR constraint: registration order must be deterministic on the server, so child ids are derived from the child's key, never from a registration counter.

### D2. Nested components compose cores *(spike S3)*

A component that renders another component composes the inner core instead of copying its logic. Examples: tree-select contains treeview; file-manager contains splitter, treeview and datatable; datatable contains pagination and checkbox.

There are two ways to do this, and S3 picks one:

- **(a) Sub-machine:** the outer core owns an inner core instance and forwards commands to it.
- **(b) Template composition:** the outer front renders the inner front and binds props.

The leaning is (b) for visual nesting such as file-manager, because the inner component stays independently styled and tested, and (a) where the outer behaviour drives the inner state. Tree-select is the (a) case: cascade selection runs over the treeview's expand set.

### D3. Consumer content is front-native

Each front takes consumer content in its own framework's idiom:

| Today (callback) | Angular | React | Vue | Lit |
|---|---|---|---|---|
| `nodeRenderer` / `rowRenderer` / `cellRenderer` / `itemRenderer` | `<ng-template>` directive + `ngTemplateOutlet` | render-prop returning `ReactNode` | scoped slot | the existing callback `(args) => Node` |
| `EditorFactory` (query-builder) | `<ng-template>` | render-prop | scoped slot | callback |

The Angular `createEmbeddedView` / `rootNodes` bridges are deleted. A nested override template keeps the default-outlet fallback (`consumerTpl ?? defaultTpl`).

### D4. No-JS carriers live in every front's template

- **No forks.** No front has an `isPlatformServer` (or equivalent) template branch. Server and client render the same tree, including hidden popups.
- **Native state carriers** are written into the template itself:
  - `<details name>` for accordion, treeview and the navbar dropdown;
  - a checkbox or radio `:checked` machine for shell, navbar toggle, tab-control and carousel;
  - native `<select>` and `<input>`.
- **JS-only enhancement attaches after hydration.** Examples: setting `indeterminate`, canvas drawing, measurement, and `aria-expanded` writes that a native element does not already own.
- **The `data-js` host attribute disappears.** Where CSS must differ with JS on, the core adds a stable attribute on hydration (`data-mp-hydrated`, `ui-core/store` `hydratedAttr`) on the front's root node, written through the bags. It is an attribute rather than a class because `class` stays the front's business and the bags only carry attributes (decided at M2).

### D5. URL state for no-JS navigation

- **Pagination and sort** accept `hrefFor(state) => string`. Without it, they render buttons, which do nothing without JS; the documentation states this.
- **The demos** wire `hrefFor` to query params, so the no-JS e2e can page and sort a datatable.
- **Fetch-driven components** (datatable `fetch`, tree-select, typeahead) take optional initial data (`initialPage` / `initialItems`), so a server that has the data can render it. Without it, the server renders the empty or loading state.

### D6. Form controls

- **The native input is the control.** Angular, React and Vue fronts render a real `<input>`, `<select>` or `<textarea>` with a native `name`.
- **Per-framework binding:** Angular implements a CVA, React a controlled `value` plus `onChange`, Vue `v-model`.
- **`FormAssociatedMixin` stays only in the Lit front.**
- **Properties with no attribute** (`indeterminate`, a canvas data URL) are written after hydration. A signature pad submits through a hidden input plus a typed-name fallback.

### D7. Measurement-driven layout

The server renders a **CSS-only initial layout**, and the client measures after hydration without changing DOM structure. Only geometry custom properties change, so hydration still matches. Per component *(spike S6)*:

- carousel: grid-stacked slides set the height;
- splitter: percentage `flex-basis`;
- charts: viewBox SVG at a fallback width;
- navbar-content: CSS height instead of the 58px `SSR_NAVBAR_HEIGHT` constant.

### D8. Shared infrastructure lifted to ui-core

The pilot did not lift any of this; it lands before the waves that need it.

| New ui-core entry | Replaces | Used by |
|---|---|---|
| `overlay` (placement with flip, dismiss stack, open state) | `web-components/overlay` | datatable, tree-select, datepicker family, scheduler, navbar dropdown, typeahead (fixes the pilot's no-flip deviation) |
| `roving` (pure index math: next/first/last enabled, typeahead-to-letter) | `a11y/roving-focus` | dropdown-menu, radio-group, tab-control, accordion, treeview, calendar, ribbon, file-manager |
| `announce` (an announcement as state; the front renders the live region) | `LiveAnnouncer` | everywhere a component announces today |
| `tree` (expand set, lazy load, flatten, cascade selection) | per-component copies | treeview, tree-select, datatable tree mode, file-manager |
| `virtual-window` (range, spacers, sparse page cache) | datatable internals | datatable, scheduler |
| `drag` (pointer drag primitive, cycle check, file-drop depth) | query-builder `drag-controller`, scheduler `DragStateMachine`, file-manager | query-builder, scheduler, tile-manager, dock, file-manager, tree-select chips |
| `focus` (trap, restore by key, inert regions) — DOM helpers that take an element, no framework | `a11y` focus utilities | dialogs, overlays, rebuilt lists |
| `forms` (`adoptPreHydrationText`, `errorFeedback` bag) | typeahead-private helper, `a11y/error-text` | all text-entry controls |
| moved as-is | `swiper-core`, `scheduler-core`, `timeline-core`, `charts/core`, `phone-core`, theming store/cookie, datatable sort, query-builder model | their components |

`HostAriaController` has no core equivalent. The bags replace it, and it survives only inside the Lit front if needed.

### D9. The Lit front

- **Tag names and public element APIs stay.** `mp-*` remains the Lit front, rebuilt on the core.
- **Every Lit front renders into the light DOM** (`createRenderRoot() { return this; }`), as the typeahead does. It stamps `data-mps` with `scopedHtml` and installs the same `<name>.scoped.styles.ts` sheet as the other three fronts. No front has a shadow root, so no front imports Bootstrap partials. The baseline reaches every node, and the shadow/light admission rule retires with the old elements in M7.
- Slot-like content (a card body, an accordion panel) is consumer children that the element moves into its own rendered container once, before the first render. The element owns those nodes, and Lit never manages them.

### D10. The component compiler: one source, four generated fronts *(owner request 2026-10-28; spikes S14–S19)*

S13 proved that a component's markup can be written once. D10 widens that to the whole component. A component is authored once, as a **component source**. A workspace library compiles it into all four fronts and writes each one into the right front library. Hand-written fronts become the exception.

**Requirements (owner, 2026-10-28):**
1. It ships as a library: `libs/mintplayer-component-compiler`. It is an Nx plugin, `@mintplayer/nx-component-compiler`, private until S19 says it can be published.
2. A component source holds:
   - TypeScript code: the core plus a manifest.
   - An IDE-interactive HTML template. Volar on `.vue` is the baseline; a VS Code extension is allowed if S18 shows a need.
   - Styles per component or per component **group**. For example, `accordion` ships one sheet scoped to the elements in both the `accordion` and the `accordion-tab` templates.
3. Angular, React, Vue and Lit components wrap this one TypeScript source.
4. Those wrappers are **generated**, and they land in the correct library and entry point.
5. It is a fully fledged library, delivered as an Nx plugin: inferred targets, a generator and an executor.
6. All code lives in, and works in, this workspace.

**Component source layout** (in `libs/mintplayer-ui-core/<group>/`):

```
<group>/
  src/
    <group>.ts                  core: Machine / connect() / attach(), as today (no DOM ownership changes)
    <group>.component.ts        manifest: defineComponentGroup({ components: [...] })
    templates/<el>.view.vue     one template per element of the group (S13 format)
    styles/<group>.scoped.scss  ONE sheet for the group, rescoped to [data-mps=<group>]
```

The manifest is plain TypeScript, so it is type-checked against the core. For each element it declares:
- the element name, which becomes `bs-<el>` / `Bs<El>` / `mp-<el>` per front;
- its template;
- **inputs**: name, type, default and attribute name;
- **outputs**: event names and their detail types;
- an optional **model**, giving Angular CVA, React `value` + `onChange`, Vue `defineModel` and Lit `value` + `change`;
- slots, which come from `defineSlots` in the template;
- the **parent** element, for groups (tab inside accordion), whose context travels by Angular DI, React context, Vue provide/inject and Lit `closest()`;
- the **lifecycle hooks** the core needs: `connect(state) → bags`, `attach(root, callbacks) → dispose`, and machine construction.

**Generation.** The compiler reads the manifest and the templates, then writes:
- the S13 template output;
- **the front component itself**: signal inputs and outputs, effects that drive the core, the bridge calls (`useHostProps` / `reactProps` / `v-bind` / `props()`), `installLightStyles` for the group sheet, SSR-stable ids and hydration flags.

It writes into `libs/<front-lib>/<group>/src/generated/` and keeps each entry point's `index.ts` exporting the generated files. When the front library has no entry point for the group yet, the compiler creates one: ng-packagr secondary entry, React/Vue vite entry, WC sub-entry. All output is gitignored, except the entry-point scaffolding, which the generator writes once.

**Escape hatch** (S16). Front-specific glue that a manifest cannot express goes into an optional hand-written `<el>.<front>.ts` *extension* next to the core. Examples: Angular `RouterLinkActive` as a host directive, React `forwardRef` imperative handles. The generated component composes it: an Angular `hostDirectives` entry, a React hook, a Vue composable, a Lit controller. When a component needs an extension in a front, that shows the manifest is missing a concept; each such case is listed in the verdict.

**Styles.**
- The group sheet compiles with the existing rescoping codegen.
- The template compiler stamps `data-mps=<group>` on every element in every template of the group, so authors no longer carry scope in bags.
- Bags keep only ARIA, state and classes.

**Nx integration.**
- A `createNodes` plugin infers a `compile-components` target on every project that holds `*.component.ts` manifests. Its inputs are the manifests, templates, sheets and the plugin source; its outputs are the generated directories.
- Each front library's `build`, `test` and `typecheck` targets `dependsOn` it, so `nx build mintplayer-react-bootstrap` regenerates first. The plugin cache keys on inputs.
- A generator, `nx g @mintplayer/nx-component-compiler:component <group> --elements=a,b`, scaffolds the source layout above.
- `--check` mode runs in CI as a stale-output guard.
- `tools/front-templates` (S13) is absorbed into the library and deleted.

**What stays hand-written.** The core logic (`ui-core/<group>/src/<group>.ts`) and the extensions stay hand-written. The manifest is the API: renaming an input there renames it in all four fronts.

## 6. Bootstrap CSS integration

### Facts measured on the branch

- The Angular global stylesheet ships a subset of Bootstrap. `forms`, `dropdown`, `nav`, `navbar`, `card`, `tables`, `pagination`, `list-group`, `accordion`, `badge`, `close`, `alert`, `progress`, `modal` and others are commented out, because each shadow-root WC imported its own copy.
- React and Vue load the full `bootstrap.min.css`.
- The typeahead's scoped sheet imports `forms/form-control` and `dropdown` and rescopes them. In React and Vue that ships those rules twice, and the rescoped copy (`.form-control[data-mps=typeahead]`) beats the page's `.form-control` on specificity. A consumer can no longer restyle the typeahead's input. This is the CLAUDE.md "do not re-import a partial the page already ships" trap, already live in the pilot.
- Without a shadow root, page CSS reaches component internals: `ViewEncapsulation.Emulated` semantics, accepted in CLAUDE.md.

### Decisions

- **C1. Bootstrap is a page-level prerequisite**, as in every Bootstrap component library. Front templates use plain Bootstrap classes (`form-control`, `form-select`, `form-check`, `dropdown-menu`, `nav-tabs`, `page-link`, `accordion-item`, `table`), and the page's Bootstrap styles them.
- **C2. One published baseline:** `@mintplayer/ui-core/styles/bootstrap.scss`, with a prebuilt `bootstrap.css`. It contains every Bootstrap partial the catalog uses, plus the existing workspace patches: the `--bs-primary` button re-binding, `color-mode.css`, the cursor, white-space, overflow and width utilities.
  - Angular's `_bootstrap.scss` becomes a thin re-export of it, which turns the commented-out partials on.
  - React and Vue consumers import the same file instead of `bootstrap.min.css`.
  - A consumer bringing their own compiled Bootstrap is supported; the baseline adds only the patches.
- **C3. Cascade layers** *(spike S1).* The baseline is emitted as `@layer mp.bootstrap { … }`, and every component scoped sheet as `@layer mp.components { … }`. The order is declared once (`@layer mp.bootstrap, mp.components;`) at the top of the baseline. The consequences:
  - Component additions beat Bootstrap regardless of specificity.
  - A consumer's **unlayered** CSS beats both. This removes the rescoped-copy-wins trap for good, and theming needs no `!important`.
  - Bootstrap's utilities are `!important`. Important declarations in *earlier* layers beat later layers and unlayered CSS, so a utility like `.d-none` still wins over everything, which is Bootstrap's intent. S1 confirms this.
  - A consumer who loads their own *unlayered* Bootstrap gets Bootstrap above our component additions. In that case component sheets must not lose on anything structural. They are kept to properties Bootstrap does not set, and the S1 decoy test asserts it.
- **C4. Component sheets carry only what Bootstrap lacks:**
  - layout;
  - state on native carriers (`details[open] > .dropdown-menu { display: block }`, because no Bootstrap JS runs);
  - component-specific parts;
  - focus rings where Bootstrap has none;
  - reduced motion.

  They still go through `[data-mps]` rescoping and `installLightStyles`, the single document-style writer. **They never import a Bootstrap partial; they may import functions, variables and mixins only.** A new conformance spec (`_conformance/no-bootstrap-partials-in-scoped.spec.ts`) fails if a scoped sheet's compiled CSS contains a selector from the Bootstrap partial list.
- **C5. No front has a shadow root** (D9), so no front imports partials. The Lit fronts get Bootstrap from the page baseline, exactly as the framework fronts do.
- **C6. Dark mode becomes page-level.** With no shadow boundary, `[data-bs-theme=dark]` on `<html>` reaches every framework front directly. The `light-dark()` / `color-scheme` workarounds and the `@container style(--mp-color-mode)` queries are removed from scoped sheets. They stay only where a shadow-tier Lit front still needs them.
- **C7. SSR delivery.**
  - Angular already writes scoped sheets into `DOCUMENT.head` on the server.
  - React and Vue SSR must do the same, or the first paint is unstyled *(spike S12)*. The registry gets `collectScopedStyles()` for `entry-server` to inline into `<head>`.
  - The baseline is a normal `<link>`, styled before any JS runs.
- **C8. Critical CSS.** Angular's `inlineCritical: false` requirement (dark-mode #420) stays, and S1 checks that beasties does not drop `@layer` blocks or reorder them.

## 7. Spikes

Each spike is small and throwaway, lives on a scratch branch or under `_spike-*/`, and writes its verdict into §7 of this PRD before the milestones it gates start.

| # | Question | Gates | Pass criterion |
|---|---|---|---|
| S1 | Bootstrap layering. (1) Does a consumer's unlayered `.form-control{border-radius:0}` override a front in all three demos? (2) Do `!important` utilities still win? (3) Does the Angular build plus beasties keep `@layer` order? (4) Do `@import url() layer()` and Sass emitting `@layer` both work in ng-packagr, Vite (React/Vue) and the WC build? | C1–C4, every wave | 4/4 measured in Chromium and Firefox |
| S2 | Parent and child cores in four fronts, built for radio-group plus radio and for accordion plus tab. Do SSR ids match on hydration? Does a child added or removed at runtime keep roving order? | D1, every compound component | clean hydration, aria specs pass in four fronts |
| S3 | tree-select over treeview: sub-machine or template composition? Prototype cascade selection both ways. | D2, tree-select, file-manager, datatable | a chosen rule written into D2 |
| S4 | A virtual window driving four templates. React and Vue scroll cost at 10k rows: frame time on scroll, no full-list reconciliation. | datatable, scheduler | ≤ 1 frame budget per scroll step in Chromium |
| S5 | Hydration with consumer templates (datatable cells as `ng-template`) and text typed before hydration in a generic control. | D3, D6 | no NG0500-series warnings; typed text kept |
| S6 | Measurement-free server layout for carousel height, splitter percentages and hierarchy label fit at a 420px fallback. Is there a layout jump after hydration? | D7 | CLS ≤ 0.05 on the demo page |
| S7 | Scheduler: can month and week views render as a static table with CSS-positioned events from `position.service`? Template weight × 4 fronts estimate. | scheduler | go/no-go written here; a no-go means the owner decides (the scheduler is in scope by default) |
| S8 | `select` with `appearance: base-select` plus `<selectedcontent>` under SSR: can feature detection avoid a hydration mismatch? | select, phone-input | clean hydration in Chromium; Firefox falls back natively |
| S9 | Navbar dropdown CSS-only open (`:focus-within` / `<details>`) in light DOM with JS off, and the same nodes once hydrated. | navbar | open with JS off; click-to-open with JS on, without re-render |
| S10 | Query-builder: the editor contract as front-native templates without regressing `query-builder.memory-leak.spec.ts`. | query-builder | leak spec green in four fronts |
| S11 | Theme toggle with the cookie read during SSR (no flash), and code-snippet highlighting on the server versus after hydration. | theme-toggle, code-snippet | no flash; no mismatch |
| S12 | React and Vue SSR: scoped sheets collected into `<head>` by `entry-server`. | C7 | no unstyled first paint |
| S13 | One template per component, declared in the core and compiled into the four fronts (owner request, 2026-10-28). Source: a `*.view.vue` SFC in `ui-core/<name>/src/templates` (Vue template syntax, typed by `defineProps` / `defineSlots`, so the Vue language tools give completion and type-checking). A build step reads it with `@vue/compiler-dom` and emits the Angular template, a React component, a Vue SFC and a Lit template function; the per-front glue (CVA, effects, refs, events) stays hand-written. Prototype on the navbar (+ dropdown, item, nav). | every M4–M6 front | the generated navbar fronts replace the hand-written templates with no behaviour change (navbar unit specs green in four fronts, Angular SSR output unchanged); go/no-go written here |
| S14 | D10 manifest → generated front components. Generate the navbar family (navbar, nav, item, dropdown) and dropdown-menu in all four fronts from manifests, and delete the hand-written fronts. | D10, every M4–M6 front | the generated fronts pass the existing navbar/dropdown unit specs and the navbar e2e unchanged; diff of public API vs the hand-written fronts is empty or listed |
| S15 | Group styles + compiler-stamped scope. One sheet per group (accordion + accordion-tab) and `data-mps` stamped by the compiler rather than carried in bags. | D10 styles | `_conformance` scoping specs green; no bag carries `data-mps` |
| S16 | Escape hatches. Express the navbar dropdown's `RouterLinkActive`, a form control's CVA (checkbox), and a React imperative handle without editing generated output. | D10 | each case is either a manifest concept or a `<el>.<front>.ts` extension; list the ones that needed an extension |
| S17 | Nx plugin. `createNodes` inference, cacheable `compile-components`, front builds `dependsOn` it, generator scaffolds a group, `--check` in CI. | D10 Nx | `nx build mintplayer-ng-bootstrap` from a clean tree regenerates and builds; second run is a cache hit; the generator's scaffold compiles |
| S18 | IDE. Volar on `*.view.vue` with props typed by type-only imports from the core. Can a template error (unknown bag key, wrong prop type) fail CI via vue-tsc, and is completion good enough without our own VS Code extension? | D10 IDE | a deliberate template type error fails `typecheck`; verdict on whether an extension is needed |
| S19 | Publishability. Build the plugin as an npm package and run it on a fixture workspace outside `libs/mintplayer-*` (paths and runtime modules all from config). | D10 req. 5 | the fixture generates and type-checks four fronts with no reference to this repo's paths |

### Verdicts

- **S1: pass, with one documented trade-off.**
  - Every scoped sheet begins with `@layer mp.bootstrap, mp.components;` and wraps its body in `@layer mp.components { … }`. The codegen does this in `wrapInComponentsLayer`, rescoping first.
  - The baseline is `ui-core/styles/bootstrap.scss`, which puts the whole stack in `mp.bootstrap`.
  - Unlayered consumer rules beat both layers at any specificity. The permanent `typeahead-suites.ts` probe pins this.
  - The trade-off: a consumer's unlayered `!important` loses to Bootstrap's layered `!important` utilities, because layer order inverts for important declarations. This is documented in the baseline file.
  - Tooling: lightningcss drops a bare order statement, so the order statement is repeated in every sheet rather than relying on one copy. esbuild keeps it. jsdom 27 parses both `CSSLayerStatementRule` and `CSSLayerBlockRule`, so `scoped-styles-scoping.spec.ts` asserts the shape.
  - Still open: question (3), Angular beasties keeping the order, is checked at the M9 demo build.
- **S8: native `<select class="form-select">` in every framework front.** `base-select` is progressive styling layered on top, not structure, so there is nothing to feature-detect on the server and no hydration mismatch.
- **S12: pass by design.**
  - Without a `document.head` (Node, or the lit-ssr shim), `installLightStyles` records the sheet.
  - `collectScopedStyles()` returns marker `<style>` tags. `server.mjs` splices them into `<!--app-head-->`.
  - The client registry treats the marker as already installed.
  - The record is per process: a superset of the current page's sheets, which is harmless because every sheet carries the layer order.
- **S2 (radio half): native carrier, context-only channel.**
  - Radios that share one `name` in one tree are a native set. The browser supplies one-of-N, the single tab stop, arrow move-and-select, posinset/setsize and form submission, with no JS. A roving-tabindex core would only re-implement that, worse.
  - The group-to-radio channel (Angular DI, React context, Vue `provide`, Lit `closest()`) carries only name, value, disabled, required and `select()`. Radios do not register with the group, so there is no runtime order to keep.
  - Ids are deterministic: `radioGroupName(rootId)` is `${rootId}-name`, with the root id from each front's SSR-stable id source, so server and client agree.
  - Registration is revisited with the accordion half, where tab panels need an order.
- **S5 (radio): pre-hydration choice kept.** `preHydrationChoice(root)` in `ui-core/forms` reads the checked input the server DOM holds. The Angular group adopts it in `afterNextRender(() => queueMicrotask(...))`, after hydration has finished patching attributes. Datatable `ng-template` cells are checked at the datatable.
- **S13: go (provisional until the M9 sweep runs the navbar specs and the no-JS e2e).**
  - The compiler is a workspace tool, `tools/front-templates` (`@mintplayer/front-templates`, private). It is config-driven: `libs/mintplayer-ui-core/front-templates.config.mjs` names each front's output dir and runtime module. It has a `--check` mode and is pinned by `front-templates.spec.ts`.
  - `mintplayer-ui-core:codegen` runs it. The outputs are gitignored.
  - The navbar, dropdown, item and nav templates generate cleanly for all four fronts. All four type-check with no new errors, and the hand-written navbar templates are deleted.
  - Each front keeps its own glue: Angular signals and DI, React state and context, Vue `provide`, and Lit properties.
  - Three runtime pieces made the shared template possible:
    - **Host element.** `mp-host` marks the root element as the host in Angular and Lit, applied via `useHostProps` / `applyHostProps`. React and Vue render that element instead.
    - **Uncontrolled form state.** `reactFormProps` turns a form control's `checked` / `value` into `defaultChecked` / `defaultValue`.
    - **Light-DOM children.** The Lit `LightChildren` controller captures them by `slot` attribute, so a light-DOM element can place them as binding values.
  - Limits are by design and listed in `tools/front-templates/README.md`: one bag per element, no functions or components, no `:style`. A template that needs more is a sign the logic belongs in the core.
  - The Lit navbar moved to the light DOM in the process, which retired its DSD chrome.
- **Deferred to the milestone that needs them:**
  - S2 accordion half at accordion (M3)
  - S3 at tree-select (M5)
  - S4 and S10 before M5
  - S7 before M6
  - S6, S9 and S11 at their components

## 8. Component catalog

LOC is element code only (the investigation, 2026-10-20).

### Wave A — infrastructure-light

| Component | LOC | Seed | Consumer content / composition | No-JS target | Risk |
|---|---|---|---|---|---|
| card | 66 | — | slots → projection | plain Bootstrap card markup; no core | L |
| input-group | 286 | — | slots | pure markup + scoped CSS; no core | L |
| checkbox / switch | 492 | — | label | `<input type=checkbox name value>` + `<label>`; indeterminate after hydration | L |
| toggle-button | 729 | — | label | checkbox `btn-check` + label (Angular gets a front; it has none today) | L |
| radio + radio-group | 428 + 268 | — | compound (D1) | `role="radiogroup"` element + native radios sharing `name` (S2) | M |
| pagination | 597 | — | labels | `<nav><ul>` of `hrefFor` links | L |
| shell | 795 | — | slots → projection | toggle checkbox + `<label for>` + `<aside>`, `:checked` rules | L |
| accordion (+tab) | 939 | — | compound | `<details name>` / `<summary>` | L |
| tab-control (+page) | 621 | Angular's existing server template | compound | radios + labels (generalised from today's `isServerSide` branch) | L |
| dropdown-menu | 925 | — | projected items | `<ul class=dropdown-menu>`; lands with the navbar dropdown | L |
| sparkline | 185 | `charts/core` | — | viewBox SVG | L |

### Wave B — form and layout controls

| Component | LOC | Seed | No-JS target | Risk |
|---|---|---|---|---|
| navbar (+brand, item, dropdown) | 1443 | — | toggle checkbox; dropdown via S9 | M |
| select | 688 | — | `<select name>` with real options (mirroring and MutationObserver removed) | M |
| otp-input | 671 | — | `<input name inputmode=numeric autocomplete=one-time-code>` | M |
| multi-range | 611 | — | two `<input type=range name>` | M |
| calendar | 614 | — | a grid of day links/buttons; roving focus after hydration | M |
| datepicker / timepicker / datetime-picker (+time-list) | 355 + 705 + 786 | calendar core | `<input type=date / time / datetime-local name>` | M–H |
| signature-pad | 411 | — | typed-name `<input name>`; canvas after hydration | M |
| theme-toggle | 747 | theming store/cookie | server reads cookie; no-JS: a `<form>` posting the mode, or hidden | M |
| code-snippet | 1322 | highlighter | escaped `<pre><code>` (S11 decides on server highlighting) | M |
| phone-input | 889 | phone-core (2949) | `<select name=country>` + `<input type=tel name autocomplete=tel>` | H |
| splitter | 1284 | `SplitterStateManager` | percentage panes, not resizable | M |
| timeline (+item) | 1182 | timeline-core | full CSS layout | M |
| trend-chart | 512 | `charts/core` | viewBox SVG | M |
| carousel | 1461 | swiper-core | N radios + labels from the template loop; grid-stacked height (S6) | H |
| typeahead (React, Vue) | — | — | verify the React and Vue fronts render their own template (the inventory saw `mp-typeahead` consumers); if not, finish them | L |

### Wave C — data components

| Component | LOC | Seed | No-JS target | Risk |
|---|---|---|---|---|
| treeview | 1004 | `tree` (D8) | nested `<ul role=tree>` with `<details>`; lazy nodes collapsed | M |
| tree-select | 1637 | treeview core (S3) | `<select multiple name>` with optgroups, or a checkbox `<fieldset>` | M–H |
| datatable | 5118 | sort, filter types, `virtual-window` | `<table>` of the first or initial page; sort headers and pagination as `hrefFor` links | H |
| query-builder (+group, condition, subquery) | 5108 | `model/*` (~1k pure) | nested `<fieldset>` of named controls | M–H |
| hierarchy-chart | 1461 | `charts/core` | viewBox SVG at fallback width (S6) | H |

### Wave D — composites and the heaviest

| Component | LOC | Depends on | No-JS target | Risk |
|---|---|---|---|---|
| file-manager | 2120 | splitter, treeview, datatable | breadcrumb + listing table with folder links + multipart upload form | H |
| tile-manager | 1654 | `drag` | a static tile grid — **done on master (#441)** | H |
| dock (`mint-dock-manager`) | 5565 | `drag`, splitter | a static panel layout | H |
| ribbon (+17) | 4249 | roving, dropdown-menu | static tabs (radio) + buttons | H |
| scheduler | 11617 | scheduler-core, `virtual-window`, `drag`, `overlay` | S7: static grid with positioned events | H |

**Out of the catalog:** badge (a styles-only stub, folded into the baseline), flags (an SVG loader library, unchanged), and `mp-overlay-container` (replaced by `ui-core/overlay`).

Charts have no Vue wrapper today. A Vue front is added, because parity is a goal.

## 9. Acceptance criteria

1. Conformance spec: no `<mp-` or `mint-` tag, and no `@mintplayer/web-components/*` element import, in `libs/mintplayer-{ng,react,vue}-bootstrap/**` (ARIA and type-only imports from ui-core are fine).
2. SSR conformance spec per Angular demo route: the server HTML for each component's container is non-empty and contains its role-bearing node.
3. No-JS e2e per component (`*-nojs.spec.ts`, Chromium, `javaScriptEnabled: false`), asserting the §8 target: form submits carry the name, details open, links navigate.
4. Hydration: no Angular hydration warnings on any demo route (a console listener in the shared e2e fixture).
5. A11y: every existing `*.aria.spec.ts` ported to the core (bags) and to each front; axe and axe-nojs green in all three demos.
6. Bootstrap: the S1 override probe runs as a permanent e2e in all three demos, and the `no-bootstrap-partials-in-scoped` conformance spec is green.
7. Every item in §10 is deleted, with no remaining references.
8. CHANGELOG `### Breaking` lists every API change in §11. Versions are planned by the publish workflow (#445), not bumped by hand.

## 10. Removed infrastructure

- `tools/lit-ssr-utils/gen-{shell,navbar,dropdown,carousel,accordion}-chrome.mjs`, `lib/chrome-module.mjs`, their specs, `gen-light-styles-chrome`, and `lit-renderer.mjs` if it becomes unused.
- `libs/mintplayer-web-components/*/ssr/**` (injectors, generated chrome, specs) and the `light-dom` SSR injector.
- The Nx targets `codegen-*-chrome` and `codegen-ssr-chrome`, and their `dependsOn` entries in the three demo `project.json` files.
- The DSD injector chain in `apps/ng-bootstrap-demo/server.ts` and the imports in `apps/vue-bootstrap-demo/src/entry-server.ts`.
- `isServerSide` (tab-control), `SSR_NAVBAR_HEIGHT` (navbar-content), the `isPlatformServer` guards in the datatable wrapper, and every "bare tag for DSD injection" lazy-import comment.
- All `data-js` CSS gates.
- Angular `createEmbeddedView` / `rootNodes` render-callback bridges and `bsForwardAria`, if no front still needs it.
- WC-lib infrastructure moved into ui-core (D8). `web-components/light-dom` stays as a re-export of `ui-core/scoped-styles` for the Lit fronts.
- The CLAUDE.md sections that only describe the removed mechanisms: SSR chrome codegen, "Bootstrap utilities do not cross the shadow boundary" for framework fronts, and the `::slotted(mp-*)` wrapper traps. They are rewritten for the new architecture.

## 11. Public API impact (breaking; documented, no shims)

- **Compound components.** Angular children become components that inject the parent, instead of directives on `<mp-*>` children. React and Vue get `Bs<Parent>.<Child>` / `<BsParentChild>` compound components. The names are fixed per component during its milestone.
- **Render callbacks.** Each framework now takes consumer content in its own idiom (D3): templates in Angular, render props in React, scoped slots in Vue. The old callback props are removed from the Angular, React and Vue fronts.
- **`::part()` hooks** are gone from the framework fronts. Consumers style with ordinary CSS.
- **Bootstrap import.** Consumers import `@mintplayer/ui-core/styles/bootstrap.css` (or `.scss`) once. The Angular `_bootstrap.scss` path keeps working as a re-export.
- **`hrefFor` and `initial*` inputs** are added; they are additive.

## 12. Risks

- **Size.** About 75k LOC of element code, with templates written four times. PRD #436 §15 measured 140–260 lines per front for a small component, and template weight dominates. The scheduler and dock alone exceed the rest of Wave D. Mitigation: shared infrastructure first (D8), the S7 gate, and waves ordered by dependency.
- **A long-lived branch.** One PR (workspace rule) means master drifts underneath it. Mitigation: rebase at each wave boundary; the waves are committed and revertable.
- **Visual regressions** from the baseline change (C2), because Angular pages gain partials they did not have globally. The S1 probe and the existing visual e2e catch these. Each turned-on partial is checked against the pure-Angular components that currently style themselves.
- **Unlayered consumer Bootstrap** (C3, last bullet) is a configuration we support but cannot fully protect. It is documented.

## 13. Open questions (owner)

- **Q1.** Scheduler, dock, ribbon and tile-manager are in scope. Do they stay in scope if S7 is a no-go, or does the owner want them kept as Lit-only components (an explicit exception)? The default is in scope.
- **Q2.** Should the theme toggle's no-JS form post to a demo endpoint, or should the toggle simply be hidden without JS?
