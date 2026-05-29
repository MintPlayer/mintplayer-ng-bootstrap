# PRD: SSR + Declarative Shadow DOM for Lit Web Components

## Status

Draft — open decisions in §10 must be resolved before implementation begins.

## Problem

Over the last several iterations the workspace has migrated complex Angular components onto a Lit-based web-component layer (`libs/mintplayer-web-components/`) so the same components can be shipped as React and Vue wrappers in addition to Angular (`memory/project_workspace_angular_only.md`). The migration delivers the framework-agnostic story, but it regressed the **JavaScript-disabled rendering experience** for a subset of components.

Today, with JS disabled:

- **Tab-control, carousel, navbar, priority-nav** still work fully — clicks navigate, hamburger opens — because the Angular wrapper template retains a parallel `@if (isServerSide) { ... } @else { <mp-…> }` branch that emits a radio/checkbox + `:checked` CSS state machine. Examples: `libs/mintplayer-ng-bootstrap/tab-control/src/tab-control/tab-control.component.html:1-45`, `libs/mintplayer-ng-bootstrap/carousel/src/carousel/carousel.component.html:1-44`, `libs/mintplayer-ng-bootstrap/navbar/src/navbar/navbar.component.html:7`, `libs/mintplayer-ng-bootstrap/priority-nav/src/priority-nav/priority-nav.component.html:2,6,27`.
- **Dock-manager, splitter, tile-manager, datatable, query-builder, file-manager, ribbon, scheduler** render as bare custom-element tags with their light-DOM children unprojected. With JS off, these are effectively invisible because the shadow DOM that positions them never gets created (`customElements.define` is a JS API; without JS the parser leaves `<mp-dock-manager>` as an unknown element).

Two distinct problems are entangled in the current state:

1. **Visibility-without-JS regression** for the complex components. Before WC conversion they were plain Angular templates emitted as real HTML by `@angular/ssr`; now they are empty custom-element tags.
2. **Duplication of the CSS-state-machine fallback** in the Angular wrapper templates. The radio+label markup is hand-maintained in each `*.component.html` file; future React and Vue wrappers would have to re-implement it. The WC itself has no SSR awareness — all SSR logic lives in the framework wrapper.

The fundamental constraint is unchanged: custom elements *require* JS to upgrade. But **Declarative Shadow DOM** (DSD — `<template shadowrootmode="open">`) lets a server emit shadow content as part of the HTML, which the browser attaches during parsing, before any JS runs. Pairing `@lit-labs/ssr` (which can produce DSD output for Lit elements in Node) with the existing `@angular/ssr` pipeline restores visibility for the complex components, **and** lets us move the CSS-state-machine fallback into the WC itself — collapsing the wrapper duplication.

## Goal

1. Every Lit web component in `libs/mintplayer-web-components/` renders **visible without JS** in the Angular demo app, via DSD emitted at server-render time.
2. Components whose interactivity can be expressed as a CSS state machine (tab-control, carousel, navbar, priority-nav, accordion) render **interactive without JS** via the same DSD pipeline — the radio/checkbox + `:checked` markup is emitted inside the WC's shadow DOM.
3. The CSS-state-machine markup moves from the Angular wrapper templates into the WCs themselves. Wrappers collapse to passthrough — single source of truth.
4. Lay framework-agnostic groundwork so the same DSD contract works under React SSR and Vue SSR when those demo apps adopt SSR later.
5. Set the stage for proper Angular hydration (non-destructive bootstrap), without committing to enable it in this PRD.

## Non-goals

- Enabling Angular's `provideClientHydration()` end-to-end (separate PRD; see §8 phase 5).
- Refactoring `mp-scheduler` to a fully declarative render path. Scheduler currently builds its body imperatively inside `firstUpdated` via `document.createElement(...)` (`libs/mintplayer-web-components/scheduler/src/components/mp-scheduler.ts:357+`), so its SSR output is an empty `.scheduler-container` shell. Restoring SSR fidelity requires a render-path refactor that belongs in its own PRD.
- Adding SSR to `apps/react-bootstrap-demo` and `apps/vue-bootstrap-demo`. They stay CSR; we only ensure the WC layer is *ready* for their future SSR.
- Touching `apps/api`.

## Scope

### Demo apps in scope

| App | Path | Framework | Current SSR | Action this PRD |
|---|---|---|---|---|
| `ng-bootstrap-demo` | `apps/ng-bootstrap-demo/` | Angular 21.2 + signals + zoneless | `@angular/ssr` per-request, destructive bootstrap | Wire `@lit-labs/ssr` post-process |
| `react-bootstrap-demo` | `apps/react-bootstrap-demo/` | React + Vite | CSR only | None (groundwork only) |
| `vue-bootstrap-demo` | `apps/vue-bootstrap-demo/` | Vue 3 + Vite | CSR only | None (groundwork only) |
| `api` | `apps/api/` | .NET | n/a | None |

### Web components in scope

Full inventory from audit (files under `libs/mintplayer-web-components/<area>/src/`):

- **Static layout (Lit, no interactivity):** `mp-tab-page`, `mp-code-snippet`, `mp-calendar`, `mp-ribbon-contextual-tab-set`, and all 13 ribbon leaf items (`mp-ribbon-button`, `mp-ribbon-checkbox`, `mp-ribbon-toggle-button`, `mp-ribbon-split-button`, `mp-ribbon-dropdown-button`, `mp-ribbon-group-button`, `mp-ribbon-gallery`, `mp-ribbon-gallery-item`, `mp-ribbon-menu-item`, `mp-ribbon-menu-separator`, `mp-ribbon-combobox`, `mp-ribbon-color-picker`, `mp-ribbon-template-item`).
- **Static layout, non-Lit (already SSR-friendly via light DOM):** the 10 `mp-card*` siblings in `libs/mintplayer-web-components/card/`. Extend `HTMLElement` directly, render light-DOM Bootstrap markup, guard `document.head.appendChild` with `typeof document === 'undefined'`. **No DSD work needed.**
- **Simple interactive, no CSS-state-machine variant:** `mp-checkbox`, `mp-radio`, `mp-toggle-button`, `mp-pagination`, `mp-multi-range`, `mp-otp-input`, `mp-select`, `mp-treeview`, `mp-datepicker`, `mp-timepicker`, `mp-datetime-picker`, `mp-ribbon-group`, `mp-quick-access-toolbar`.
- **Interactive with CSS-state-machine variant (the consolidation targets):** `mp-tab-control`, `mp-carousel` *(implied by the carousel Angular component — confirm whether the WC exists or only the wrapper does)*, `mp-navbar` *(same)*, `mp-priority-nav` *(same)*, `mp-accordion` *(same)*. **These gain an SSR branch in their `render()` method this PRD.**
- **Complex interactive:** `mint-dock-manager`, `mp-splitter`, `mp-tile-manager`, `mp-datatable`, `mp-query-builder` (+ children `mp-query-condition`, `mp-query-group`, `mp-query-subquery`), `mp-file-manager`, `mp-ribbon`, `mp-ribbon-tab`. **DSD restores layout visibility; interactivity stays JS-only.**
- **Out of scope:** `mp-scheduler` (shell-only render path; needs separate refactor).

> Note: today's CSS-state-machine fallbacks live in Angular wrapper components — there may not yet be matching Lit WCs for carousel / navbar / priority-nav / accordion. Where the WC doesn't exist yet, the Angular wrapper's HTML is the starting point for the WC's `renderSsr()` method. Confirming the WC/wrapper mapping per component is the first task in phase 3.

## Architecture

### The `isServerSide` property contract

Every Lit WC in the workspace gains a property:

```ts
@property({ type: Boolean, attribute: 'is-server-side', reflect: true })
isServerSide = false;
```

Distribution: either via a shared `BaseWebComponent extends LitElement` class or a `SsrAwareMixin(LitElement)` mixin — see decision §10.1. The property reflects to the `is-server-side` attribute so the SSR HTML carries the flag through to the client.

**WCs with a CSS-state-machine variant** override `render()` to branch on the property:

```ts
override render() {
  return this.isServerSide ? this.renderSsr() : this.renderClient();
}

private renderClient() {
  return html`
    <ul class="nav nav-tabs" role="tablist">
      ${this.tabs.map(tab => html`<li @click=${this.activate(tab)}>${tab.label}</li>`)}
    </ul>
    <slot></slot>
  `;
}

private renderSsr() {
  return html`
    ${this.tabs.map(tab => html`
      <input type="radio" name=${this.groupName} id=${tab.id}
             ?checked=${tab.active} class="visually-hidden">
    `)}
    <ul class="nav nav-tabs" role="tablist">
      ${this.tabs.map(tab => html`
        <li><label for=${tab.id} class="nav-link">${tab.label}</label></li>
      `)}
    </ul>
    <slot></slot>
  `;
}
```

The CSS-state-machine `<style>` block goes in `static styles` and applies to both branches; the `:checked` selectors only fire in the SSR branch because that's the only one with `<input type="radio">` elements present.

**WCs without a CSS-state-machine variant** keep a single `render()` — the property is still present but unused.

### Server flow (`apps/ng-bootstrap-demo`)

```
HTTP request
  ↓
@angular/ssr → renders Angular components → HTML string
    (Angular wrappers pass [attr.is-server-side]="isServerSide" through to WC tags)
  ↓
lit-ssr post-process middleware (new):
  • parse HTML with parse5
  • for each tag in the CE manifest:
    • instantiate LitElementRenderer
    • reflect parsed attributes (including is-server-side) onto the renderer
    • call render() → collect RenderResult
    • splice <template shadowrootmode="open">…</template>
      as first child of the host
  ↓
Enriched HTML → response
```

The middleware lands in `apps/ng-bootstrap-demo/server.ts`, between `angularApp.handle(req)` and `writeResponseToNodeResponse` (`apps/ng-bootstrap-demo/server.ts:62-65`). Because `@lit-labs/ssr` calls the WC's `render()` and the WC has been told `isServerSide=true`, the DSD payload contains the radio+CSS state machine for branching components, or the normal render for the rest.

### Client flow

1. Browser parses HTML, sees `<template shadowrootmode="open">`, natively attaches the shadow root (or the DSD polyfill from `@webcomponents/template-shadowroot` does it for the ~6% of users on browsers that lack native support).
2. `@lit-labs/ssr-client/lit-element-hydrate-support.js` loads **before** any module that imports `lit`. It patches `LitElement.connectedCallback` to detect existing shadow roots and call `hydrate()` rather than `render()`.
3. WC class modules load and call `customElements.define(...)`. Upgrade triggers per-element `connectedCallback`.
4. **For non-branching WCs**, server and client produce identical shadow content → Lit hydrates cleanly, adopting the DSD without re-rendering.
5. **For branching WCs**, the SSR shadow content (radio buttons) does not match the client `render()` (interactive tab strip). Lit's silent hydration would bind reactive parts to the wrong nodes. The WC must opt out:

```ts
override connectedCallback() {
  if (this.hasAttribute('is-server-side')) {
    // SSR shadow content doesn't match client render — wipe and re-render.
    this.removeAttribute('is-server-side');
    this.isServerSide = false;
    this.shadowRoot?.replaceChildren();
  }
  super.connectedCallback();
}
```

That trades hydration for a brief WC-level FOUC (server-rendered radio buttons get replaced by the interactive tab strip on upgrade). Same flash already accepted at the Angular layer with destructive bootstrap.

### CE manifest source

The workspace already auto-generates `custom-elements.json` via CEM. A build step emits a typed `ce-manifest.ts` from CEM, imported by the post-process middleware. **No new hand-maintained registry** — reuse existing CEM output (cf. `memory/feedback_tooling_under_tools.md`).

### React + Vue groundwork (not enabled this PRD)

When those demo apps adopt SSR:

- **React:** `import '@lit-labs/ssr-react/enable-lit-ssr.js'` in the SSR entry. Monkey-patches `React.createElement` so registered CEs get DSD injected during `renderToString` / `renderToPipeableStream`. React wrappers pass `is-server-side` through as a prop.
- **Vue:** Per-WC `LitWrapper` Vue component (cf. `nuxt-ssr-lit` prior art). Same `is-server-side` attribute passthrough.

Both share the same DSD output, the same hydration loader, and the same CE manifest. The `isServerSide` contract is framework-agnostic by construction.

## Per-component policy

| Group | Components | `isServerSide=true` render | `isServerSide=false` render | DSD output |
|---|---|---|---|---|
| Static layout (Lit) | tab-page, code-snippet, calendar, ribbon-contextual-tab-set, 13 ribbon leaves | normal render | normal render | trivial |
| Static layout (non-Lit) | 10 mp-card siblings | n/a — already light-DOM SSR | n/a | n/a |
| Simple interactive — no CSS variant | checkbox, radio, toggle-button, pagination, multi-range, otp, select, treeview, datepicker, timepicker, datetime-picker, ribbon-group, quick-access-toolbar | normal render | normal render | visible-but-inert |
| **Interactive with CSS-state-machine variant** | **tab-control, carousel, navbar, priority-nav, accordion** | **radio/checkbox + label + `:checked` markup** | **JS-interactive markup** | **interactive without JS** |
| Complex interactive | dock, splitter, tile-manager, datatable, query-builder (+children), file-manager, ribbon, ribbon-tab | normal render | normal render | visible-but-inert |
| Shell-only | mp-scheduler | out of scope | out of scope | — |

## Wrapper simplification (the second goal)

For each WC in the "Interactive with CSS-state-machine variant" group, the Angular wrapper template collapses. Concrete examples:

### Before: `libs/mintplayer-ng-bootstrap/carousel/src/carousel/carousel.component.html`

```html
@if (isServerSide) {
  <!-- 44 lines of radio inputs + carousel-items + label-based prev/next -->
} @else {
  <!-- JS-interactive carousel -->
}
```

### After

```html
<mp-carousel [attr.is-server-side]="isServerSide ? '' : null"
             [attr.orientation]="orientation()"
             [attr.aria-label]="ariaLabel()"
             ...>
  <ng-content></ng-content>
</mp-carousel>
```

The 44 lines of state-machine markup move into `MpCarouselElement.renderSsr()`. Same for:

- `libs/mintplayer-ng-bootstrap/tab-control/src/tab-control/tab-control.component.html`
- `libs/mintplayer-ng-bootstrap/navbar/src/navbar/navbar.component.html`
- `libs/mintplayer-ng-bootstrap/priority-nav/src/priority-nav/priority-nav.component.html`
- `libs/mintplayer-ng-bootstrap/tab-control/src/tab-page/tab-page.component.html`

Where the WC doesn't exist yet (carousel, navbar, priority-nav, accordion — confirm in phase 3), creating the WC is part of this PRD's phase 3 scope. The `renderSsr()` method is essentially the existing Angular SSR branch rewritten as a Lit `html` template.

The `BsNoNoscriptDirective` (`libs/mintplayer-ng-bootstrap/no-noscript/src/no-noscript/no-noscript.directive.ts`) becomes redundant for these specific wrappers (no element-level noscript class-swap needed when the WC's shadow content already handles both modes). Other usages remain unaffected.

## Hydration story (this PRD)

This PRD does **not** enable Angular's `provideClientHydration()`. The Angular layer continues to bootstrap destructively.

- For **non-branching WCs**, server and client shadow content match → Lit's hydration claims the DSD without re-rendering. Clean.
- For **branching WCs**, hydration is explicitly opted out (the `connectedCallback` pattern shown in §5.3). The DSD content is visible during parsing, then briefly replaced by the JS-rendered version on upgrade. Same FOUC profile as Angular's destructive bootstrap, scoped to the few branching WCs.
- Angular's hydration claim walker (when later enabled) walks **light DOM only** and treats custom-element hosts as leaves — it doesn't descend into shadow roots. So phase 5 (`provideClientHydration()`) doesn't interact badly with DSD in WC shadow trees.

## Phasing

### Phase 1 — Foundation

1. Add dependencies (workspace root `package.json`): `@lit-labs/ssr`, `@lit-labs/ssr-client`, `@lit-labs/ssr-dom-shim`, `parse5`, `@webcomponents/template-shadowroot` (DSD polyfill).
2. Install the `@lit-labs/ssr-dom-shim` global early in `apps/ng-bootstrap-demo/src/main.server.ts` so WC modules that side-effect-register via `customElements.define()` don't crash on import.
3. Implement the `isServerSide` property — decide mixin vs base class (§10.1) and apply to every Lit WC. Default `false`. For non-branching WCs this is a no-op; just a property added.
4. Add post-process middleware in `apps/ng-bootstrap-demo/server.ts` between `angularApp.handle(req)` and `writeResponseToNodeResponse`. Middleware sets `is-server-side` on every WC host before rendering, then calls `LitElementRenderer`.
5. Wire `@lit-labs/ssr-client/lit-element-hydrate-support.js` as the **first** script in `apps/ng-bootstrap-demo/src/main.ts` (must precede any `lit` import).
6. Conditionally load the DSD polyfill: `if (!HTMLTemplateElement.prototype.shadowRoot) { import('@webcomponents/template-shadowroot'); }`.
7. Generate `ce-manifest.ts` at build time from existing CEM output.

**Exit criteria:** demo app builds + serves. No regressions to existing pages. Middleware is in place but no-ops if no Lit tags appear on a page. `isServerSide` property exists on every WC.

### Phase 2 — Static + simple interactive (non-branching)

Enable DSD emission for all components in the static + simple-interactive groups. ~24 components.

Per-component verification:

- Page renders visibly with JS disabled.
- Page hydrates cleanly with JS enabled — no console errors, no flash.
- Visual regression: existing Playwright `*.visual.spec.ts` files continue to pass.

### Phase 3 — Interactive with CSS-state-machine variant (consolidation)

For each of tab-control, carousel, navbar, priority-nav, accordion:

1. Confirm whether a Lit WC exists. If not, create one whose `renderClient()` mirrors the current `@else` branch of the Angular wrapper.
2. Implement `renderSsr()` from the current `@if (isServerSide)` branch of the Angular wrapper.
3. Add the hydration opt-out `connectedCallback` (§5.3).
4. Replace the Angular wrapper template's `@if (isServerSide)` block with the passthrough WC tag.
5. Validate: JS-off interactive (CSS state machine works); JS-on clean upgrade (brief flash acceptable).
6. Delete the now-unused `BsNoNoscriptDirective` applications on the affected wrappers.

Special attention for `mp-carousel`: the existing Angular template has 44 lines of intricate radio+label+indicator+prev/next markup (`libs/mintplayer-ng-bootstrap/carousel/src/carousel/carousel.component.html:1-44`). The Lit conversion must preserve this pixel-for-pixel under JS-off.

### Phase 4 — Complex interactive

Enable for `mint-dock-manager`, `mp-splitter`, `mp-tile-manager`, `mp-datatable`, `mp-query-builder` (+ children), `mp-file-manager`, `mp-ribbon`, `mp-ribbon-tab`.

Special attention for `mp-query-builder`: uses `@lit/context` providers/consumers (cf. `memory/reference_lit_context_recursive.md`). Context propagation pre-hydration relies on `context-request` events, which are JS-driven. The provider's `willUpdate` runs server-side and seeds initial values — verify children's DSD reflects those values rather than waiting on a context round-trip.

### Phase 5 — Hydration migration (deferred to a separate PRD)

- Switch from destructive bootstrap to `provideClientHydration()`.
- Confirm all remaining server/client DOM-mismatch patterns are removed (no `@if (isServerSide)` branches survive outside the WC layer).
- `mp-scheduler` declarative render refactor.

## Acceptance criteria

1. With JS disabled, the following demo routes render **visibly** (not empty boxes): dock, splitter, tile-manager, datatable, query-builder, file-manager, ribbon, all 13 ribbon-leaf demos, all simple-interactive demos. Scheduler renders an empty shell (known limitation; called out in demo page copy).
2. With JS disabled, tab-control, carousel, navbar, priority-nav, accordion routes render **and remain interactive** — clicking labels changes tab / slide / hamburger / accordion-section state via CSS only.
3. With JS enabled, all demo routes pass the existing e2e suite (`apps/ng-bootstrap-demo-e2e`). Existing `waitForLoadState('networkidle')` waits may become superfluous but are not required to be removed.
4. Angular wrapper templates for tab-control, carousel, navbar, priority-nav, tab-page collapse to ≤ 15 lines each (currently 45+ for several).
5. Lighthouse Performance score on the homepage is within 5 points of pre-PRD baseline.
6. No NG0500-class hydration errors in the console (hydration is not enabled, but the DSD content must not cause `ngExpressEngine` to emit warnings).

## Risks

- **`@lit-labs/ssr` is still in Labs (v4.0.0, May 2026).** No breaking changes expected before graduation, but the project explicitly carries the "may receive breaking changes" caveat. Mitigation: pin the exact version in `package.json`.
- **Hydration mismatch is silent**, not loud. If a non-branching WC's DSD doesn't exactly match what its `render()` produces post-hydration, Lit binds reactive parts to the wrong nodes — no console error, just broken updates. Mitigation: per-component visual regression test on each component touched in phases 2 and 4.
- **WC-level FOUC for branching components.** The hydration opt-out wipes and re-renders. Users see SSR markup → empty shadow → client markup. Mitigation in §10.2.
- **Per-request lit-ssr cost** — measured at ~1–5 ms per page on this CE inventory, but production traffic may differ. Mitigation: add a perf budget assertion in CI for the demo app.
- **`@lit/context` pre-hydration values.** Context values flow via DOM events post-hydration only; SSR must thread initial values through `RenderInfo` or via attributes. Spike during phase 4 will confirm whether query-builder needs extra plumbing.
- **CE registration in Node pollutes the global `customElements`.** Each request reuses the same registry — fine for prod, but workers/cluster mode may need per-request isolation. Mitigation: defer until measurably necessary.
- **Lit's `html` template doesn't natively express label-for matching across all branches.** If the same `id` value appears in two branches of an `?checked` `@for` loop, the Lit renderer may emit duplicate IDs. Mitigation: scope ids per WC instance (e.g. via a `BsIdService` equivalent or the `crypto.randomUUID()` available server-side as of Node 20).

## Open decisions

These must be resolved before phase 1 starts.

### 10.1 `isServerSide` distribution mechanism

Three implementation options for adding the property to every Lit WC:

- **(a)** A `SsrAwareMixin(LitElement)` mixin that each WC's class extends. Composable, no inheritance lock-in.
- **(b)** A `BaseWebComponent extends LitElement` base class that every WC inherits from. Simpler authoring; assumes no existing WC needs a different base.
- **(c)** Add the property by hand to each WC. Most explicit, most duplication.

Recommendation: **(b)** — base class. The workspace already has shared infrastructure per WC (LiveAnnouncerController etc.); a base class is the natural home. No WCs currently extend anything other than `LitElement` / `HTMLElement`.

### 10.2 FOUC mitigation for branching WCs

When the WC opts out of hydration and re-renders, users see a brief flash. Options:

- **(a)** Hide via `<host-tag>:not(:defined) { visibility: hidden; }` — slight delay to first paint, no flash. Used by Shoelace.
- **(b)** Accept the flash. JS-off users get a great experience; JS-on users see a transient flash, fixed in phase 5.
- **(c)** Block phase 3 on the phase 5 hydration migration, eliminating the FOUC entirely.

Recommendation: **(a)** for phases 3 and 4, then phase 5 removes the rule.

### 10.3 CE manifest generation

CEM (`custom-elements.json`) is the source of truth for component metadata. Two consumption modes:

- **(a)** Read CEM at server cold-start, build the manifest in-memory.
- **(b)** Add a build step that emits a typed `ce-manifest.ts` from CEM at build time, imported by `server.ts`.

Recommendation: **(b)** — type-safe, fails at build rather than at first render, fits the existing codegen-wc convention.

### 10.4 DSD polyfill scope

DSD reached 94% global support; the gap is Safari <16.4, Firefox <123, Chromium <111. Options:

- **(a)** Ship the polyfill unconditionally (~1 KB).
- **(b)** Feature-detect and lazy-load only when needed.

Recommendation: **(b)** — the conditional dynamic import is a one-liner and avoids the polyfill on 94% of page loads. Revisit when DSD hits Baseline Widely Available on 2026-08-20 and drop the polyfill entirely.

### 10.5 Per-request CE registry isolation

Lit elements call `customElements.define(...)` at import time. In Node these registrations pollute a global registry that persists across requests. Options:

- **(a)** Accept the global registry (single-process, no isolation).
- **(b)** Use `@lit-labs/ssr` per-request renderer isolation if/when worker-mode is adopted.

Recommendation: **(a)** for now; revisit if/when demo app moves to cluster/worker SSR.

### 10.6 Prerender opt-in

`ng build --prerender` could bake `/components/<x>` routes at build time, running lit-ssr offline.

- **(a)** Defer to phase 5; per-request lit-ssr is fast enough.
- **(b)** Bundle prerender into phase 1 as a performance backstop.

Recommendation: **(a)**. Adds complexity without clear demand pre-measurement.

### 10.7 Confirming the WC layer for branching components

Tab-control has a Lit WC (`mp-tab-control`). Carousel, navbar, priority-nav, accordion may not — confirm during phase 3 kickoff. For each missing WC, phase 3 adds its creation as a sub-task before applying the `renderSsr()` consolidation.

### 10.8 React/Vue groundwork — code or commentary?

Phase 1 lays the architectural groundwork (CE manifest is framework-agnostic, DSD output is identical, `isServerSide` contract is framework-agnostic). Two options:

- **(a)** Write *no* React/Vue code now; future SSR work for those apps imports the same manifest and adds their framework-specific wrapper layer.
- **(b)** Write the `enable-lit-ssr.js` import line and `LitWrapper.vue` skeleton now, even though they're inert (CSR apps don't call them).

Recommendation: **(a)**. Avoid dead code; rely on the architectural shape being right.

## Test plan

- **Per-component visual regression:** existing Playwright `*.visual.spec.ts` files cover most demos. Add JS-disabled variants for the phase 2, 3, and 4 components.
- **Interactive-without-JS verification:** Playwright with `javaScriptEnabled: false` for tab-control, carousel, navbar, priority-nav, accordion. Assertions: click label → state changes.
- **E2E:** existing `*.spec.ts` files must continue to pass with hydration off (this PRD's scope).
- **Perf budget:** add CI check on `apps/ng-bootstrap-demo` build that homepage HTML size grows by ≤ 30% (DSD content is included in the page payload).
- **Manual:** smoke-test every demo page with JS off in Firefox (default browser for `memory/feedback_firefox_flex_shrink.md` testing).

## Sources

- `@lit-labs/ssr` 4.0.0 — https://www.npmjs.com/package/@lit-labs/ssr
- Lit SSR docs — https://lit.dev/docs/ssr/overview/
- Defer-hydration community protocol — https://github.com/webcomponents-cg/community-protocols/issues/16
- `@lit-labs/ssr-react` — https://www.npmjs.com/package/@lit-labs/ssr-react
- `nuxt-ssr-lit` — https://github.com/prashantpalikhe/nuxt-ssr-lit
- Angular SSR + custom elements gap — https://github.com/angular/angular/issues/48746
- DSD Baseline status — https://caniuse.com/declarative-shadow-dom
- Companion memory: `memory/feedback_noJS_interactivity_tiers.md`, `memory/project_wc_ssr_isserverside.md`, `memory/project_workspace_angular_only.md`, `memory/project_e2e_destructive_bootstrap.md`, `memory/reference_lit_context_recursive.md`
- Existing PRDs that touch the same surface: `docs/prd/navbar-noscript.md`, `docs/prd/tab-control-noscript.md`, `docs/prd/carousel.md`, `docs/prd/priority-navigation.md`, `docs/prd/accordion-multi.md`
