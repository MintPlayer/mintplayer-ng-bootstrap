# PRD: Migrate `bs-shell` to a cross-framework Lit WC with no-JS SSR

## Problem

`bs-shell` (`libs/mintplayer-ng-bootstrap/shell/`) is still an Angular-only `@Component`. It has not been migrated to the workspace's "Lit WC + per-framework wrappers" model (dock / scheduler / timeline / treeview / tree-select are the precedent). Meanwhile the React and Vue demos carry an **improvised shell** hand-written into the app shell markup (`apps/react-bootstrap-demo/src/app/shell/AppShell.tsx`, `apps/vue-bootstrap-demo/src/app/App.vue`) — there is no shared shell across frameworks.

The blocker that has stalled the migration: a naïve port to a Lit web component **breaks no-JavaScript usage**. Without JS, `customElements.define()` never runs, so a Lit element renders as an inert, empty tag — the sidebar layout disappears. The repo's existing noscript pattern (hidden `<input>` + `<label for>` + `:checked ~` CSS, with `bsNoNoscript` adding `.noscript` server-side) is **Angular-component-only**: navbar, tab-control, accordion, and carousel all use `::ng-deep` over light DOM. None are web components, and that exact technique does not cross a shadow boundary.

The currently-shipped workaround for "WC + noscript" is the dual-template wrapper (`tab-control.component.html`: `@if (isServerSide) { …hand-written light-DOM fallback… } @else { <mp-tab-control> }`). That **duplicates the layout markup** — once as a light-DOM Angular template, once as the WC — and would triplicate across Angular + React + Vue. The user has explicitly ruled this out: *no HTML may be duplicated across the components.*

## Goals

1. `mp-shell` becomes a framework-agnostic **Lit web component** with hand-written Angular / React / Vue wrappers, consistent with the workspace convention.
2. **The layout HTML exists in exactly one place** — `mp-shell`'s `render()`. No light-DOM twin, no per-framework fallback branch.
3. The shell is fully usable with **JavaScript disabled**, including an **interactive hamburger toggle** to open/close the sidebar (a capability today's shell does *not* have — today the toggle is JS-driven in the parent).
4. **All three demos server-render** the shell (Angular, React, Vue) — in the demo apps *and* when hosted in the Docker engine behind Traefik.
5. The React and Vue demos drop their improvised shells and consume the real wrapper.

## Non-goals

- Building a generic SSR framework for arbitrary third-party components. We add a single shared render path that the three demo servers reuse; broadening it is out of scope.
- Server-side data fetching / API SSR. The demos render layout + routed views; data-loading strategy is unchanged.
- Migrating other components to DSD-SSR in this effort (though the infrastructure created here makes that a follow-up).

## Implementation status (2026-06-02)

**Done + verified (in this branch):**
- ✅ **`mp-shell` Lit WC** — `libs/mintplayer-web-components/shell/`. Shadow chrome + `sidebar`/default/`toggle`/`hamburger` slots; `state`/`breakpoint`/`size` attrs (+ `--mp-shell-size`), `toggle()`, `open`, `statechange`. Sidebar keeps **fixed width** and **slides** via negative `margin-inline-start` (lever `--mp-shell-margin`) — no reflow/word-wrap. `nx build mintplayer-web-components` passes.
- ✅ **Angular `bs-shell` wrapper** — `libs/mintplayer-ng-bootstrap/shell/`. Single `<mp-shell>` (no dual-template), client-only WC define; keeps `[state]`/`[breakpoint]`/`setSize()`. `bsShellSidebar` is now an attribute directive → `slot="sidebar"` (breaking). `nx build mintplayer-ng-bootstrap` passes.
- ✅ **SSR DSD injection** — reusable `injectMpShellDsd(html)` + generated `MP_SHELL_DSD_CHROME` exported from `@mintplayer/ng-bootstrap/shell`; generator `tools/lit-ssr-utils/gen-shell-chrome.mjs`. Wired into `apps/ng-bootstrap-demo/server.ts`.
- ✅ **Deps** — `@lit-labs/ssr`/`ssr-client`/`ssr-dom-shim` in `package.json`.
- ✅ **End-to-end verified** on `/overlays/shell` (SSR injects DSD; destructive client bootstrap upgrades the WC; `auto`/`setSize()`/`[state]`/slide all correct; 0 console errors) and the full no-JS matrix via the Phase-0 spikes (Chromium).

**Remaining:** Phase 4 (React SSR + wrapper), Phase 5 (Vue SSR + wrapper), Phase 6 (Docker/Traefik), Phase 7 (tests + demo pages). Smaller follow-ups: external-trigger **global** bridge stylesheet (+ outer-vs-`:host` cascade check), a **codegen Nx target** to own the chrome regen (currently a manual script), and **Firefox** parity. Phase-0/1 spike scratch files live under `docs/prd/_spike-*` (throwaway, not committed).

## Locked decisions (confirmed with the user)

| # | Decision | Consequence |
|---|---|---|
| 1 | No-JS path must support an **interactive** hamburger toggle, not just a static responsive layout. | The toggle is a CSS state machine (`<input type=checkbox>` + `<label for>` + `:checked ~`) living **inside** the shadow root. |
| 2 | `mp-shell` uses **shadow DOM + named slots** (like `mp-tab-control` / `mint-dock-manager`). | DSD *is* serialized shadow DOM, so this is required anyway. Bootstrap mixins/utilities don't cross the boundary, so the shell's SCSS is re-expressed inside the shadow `static styles`. |
| 3 | **React and Vue must SSR too** (demo apps + Docker), not just Angular. | The unifying mechanism must be framework-agnostic → Declarative Shadow DOM via `@lit-labs/ssr`. |
| 4 | **No HTML duplication.** | Drop the `@if(isServerSide)` dual-template; the WC template is the single source for SSR + no-JS. |
| 5 | Libraries are allowed; prioritise a professional, future-proof implementation. | Adopt `@lit-labs/ssr` family rather than hand-rolling DSD. |
| 6 | Ship as **one feature branch / one PR** (created only on explicit go-ahead). | Phasing below is for internal sequencing, not separate PRs. |

## Core architecture: one template, DSD everywhere

The layout markup lives only in `mp-shell.render()`. `@lit-labs/ssr` serializes that template to `<template shadowrootmode="open">` — identical output for all three frameworks. **DSD is a feature of the HTML _parser_, not of JavaScript:** when a DSD-capable browser parses `<template shadowrootmode="open">` during initial page load, it attaches the shadow root and applies the inlined `<style>` *before and independent of any script*. So with JS disabled the in-shadow `<input>`+`<label>`+`:checked ~ .sidebar` state machine toggles the sidebar with zero scripting. (That is the entire reason DSD exists — imperative `attachShadow()` needs JS, DSD does not.)

⚠️ **Parser-path only.** DSD attaches during initial HTML parsing (and via `setHTMLUnsafe()`/`parseHTMLUnsafe()`), but deliberately **not** when content is assigned via `.innerHTML` (a security decision). This does not affect the no-JS page-load case, but it is the pass/fail criterion for the Angular integration: the `<template shadowrootmode>` bytes must arrive in the **server/prerender HTML output**, not be injected client-side via an innerHTML-style mechanism.

DSD is Baseline: Chrome/Edge 111+, Safari 16.4+, Firefox 123+ — these attach it with **no JS**. On a browser *older* than that with JS *also* disabled, `<template shadowrootmode>` is treated as an inert `<template>` (content not rendered) and the `@webcomponents/template-shadowroot` polyfill that would rescue it needs JS — so the no-JS guarantee is "any DSD-capable (Baseline 2024+) browser", degrading on the ancient-and-no-JS combination to slotted light-DOM content rendering unstyled/unlaid-out. The polyfill (for the JS-enabled hydration path on old browsers) must attach shadow roots **before** Lit hydration runs.

### Why this satisfies "no duplication"

- The light-DOM `@if(isServerSide)` fallback used by `tab-control`/`carousel` is **deleted** for the shell — the WC's own DSD provides the SSR/no-JS HTML.
- Each wrapper renders a single `<mp-shell>` with slotted content; none re-declares the sidebar/content structure.
- The only per-framework code is the attribute/event/slot bridge (already the established wrapper style) plus the SSR server entry.

## Component design — `mp-shell` Lit WC

Location: `libs/mintplayer-web-components/shell/` (standard WC shape: `index.ts`, `ng-package.js`, `src/index.ts`, `src/components/mp-shell.ts`, `src/styles/shell.styles.scss` → generated `shell.styles.ts`).

Shadow template (single source of truth), conceptually:

```
<input type="checkbox" id="<uid>-toggle" class="shell-toggle" />   <!-- built-in toggle (self-contained mode) -->
<label for="<uid>-toggle" class="shell-hamburger" part="hamburger" aria-label="Toggle sidebar">…</label>
<div class="sidebar-root" part="sidebar-root">
  <aside class="sidebar" part="sidebar"><slot name="sidebar"></slot></aside>
  <div class="content" part="content"><slot></slot></div>
</div>
<slot name="toggle"></slot>   <!-- external trigger mode: consumer slots a light-DOM checkbox here -->
```

- **Slots:** named `sidebar` slot + default content slot (replaces the `[bsShellSidebar]` `TemplateRef` directive) + a `toggle` slot for external-trigger mode. Slotted content is light DOM and visible without JS.
- **State machine (restored `breakpoint`/`auto` + interactive toggle):** the original `shell.component.scss` behaviour is re-expressed in the shadow `static styles`. **The sidebar keeps a fixed width (`--mp-shell-size`) and open/close _slides_ it via a negative `margin-inline-start`** (the original `margin-left` behaviour, RTL-correct) — contents never reflow/word-wrap, and the main content reclaims the freed space. Everything funnels through one lever, `--mp-shell-margin` (`0` = open, `calc(-1 * size)` = closed); `.sidebar-root` is `overflow: hidden` to clip the sidebar as it slides past the edge. Three layers:
  - **`state` input override (consumer-declarative):** reflected to a host attribute, shadow-visible. `:host([state="show"])` forces open, `:host([state="hide"])` forces closed — these win over everything and work no-JS (SSR reflects the input).
  - **`auto` (default / `state="auto"`): responsive, the untouched no-JS state.** `@media` rules on the **unchecked** toggle collapse the sidebar below `breakpoint` and expand it at/above — pure CSS. Breakpoint px values are inlined (Bootstrap mixins don't cross the shadow boundary). ✅ spike-verified at 500px (collapsed) and 1100px (expanded), no JS.
  - **interactive toggle:** the `:checked` state means *"the inverse of the `auto` default for the current viewport"* — `@media`+`:checked` rules flip it. So below `breakpoint` the toggler expands, at/above it collapses. ✅ spike-verified (wide-toggled→collapsed, narrow-toggled→expanded), no JS.
  - **Indeterminate note:** a 3-state model (indeterminate = auto, checked = absolute-open, unchecked = absolute-closed) would make a toggled sidebar survive a cross-breakpoint resize, but `indeterminate` is **JS-only** (no HTML attribute), so it can't be the initial no-JS state. It is therefore a **post-hydration enhancement** layered on the CSS baseline above, not the no-JS mechanism. The CSS baseline's one trade-off: a `checked` sidebar carried across the breakpoint inverts (it encodes "inverse of default", not an absolute state).
- **Public API (preserved + extended):**
  - `state` attribute/property: `'auto' | 'show' | 'hide'`.
  - `breakpoint` attribute/property (Bootstrap breakpoint name).
  - `--size` CSS custom property for sidebar width (custom properties pierce the shadow boundary, so this works for theming).
  - `toggle()` method and a `statechange` `CustomEvent`.
  - `observedAttributes` as a **static getter** (spreading `super.observedAttributes`) per workspace WC rules.
- **No async `render()`** — `@lit-labs/ssr` does not support async render; keep it synchronous.

### Toggle placement — built-in vs external trigger (no-JS in both modes)

A hamburger in a consumer navbar lives *outside* `mp-shell`'s shadow root, and neither `<label for>` nor `:checked ~` crosses a shadow boundary. So `mp-shell` supports two modes that share **one** set of sidebar CSS — only the source of the `:checked` state differs, so no layout is duplicated:

- **Self-contained (default):** the built-in `<input>` + `<label>` hamburger live in the shadow; sidebar reacts via `.shell-toggle:checked ~ .sidebar-root`. For consumers who don't need an external trigger.
- **External trigger (navbar):** the consumer slots a hidden `<input type=checkbox slot="toggle">` as a **light-DOM child of `<mp-shell>`** and places a `<label for="<id>">` hamburger anywhere in the same tree (e.g. a navbar). This works with **no JS** — **verified in the Phase 0 spike (`_spike-shell-dsd.html`), toggle on _and_ off, with no `<script>` on the page and the element never `define`d** — by this exact mechanism:
  - `<label for>` ↔ `<input id>` association holds across the whole light-DOM tree — slotted content is light DOM, so the label outside `<mp-shell>` and the input slotted inside it are in the same tree (no shadow crossing). ✅
  - ❌ **A shadow stylesheet CANNOT see the slotted checkbox's `:checked` state.** The intuitive `:host(:has([slot=toggle]:checked))` rule **does not match** (spike-confirmed: the navbar click checked the box, but the in-shadow rule never restyled the sidebar). Selectors inside a shadow root can't reach light-DOM/slotted state.
  - ✅ **The working bridge** is a **document-level rule keyed on the tag** that flips a **CSS custom property on the host**, which then **inherits across the shadow boundary**:
    ```css
    /* global stylesheet shipped with the shell — present in the SSR/no-JS HTML */
    mp-shell:has(> input[slot="toggle"]:checked) { --mp-shell-margin: 0; }
    ```
    ```css
    /* shadow stylesheet (the WC's static styles) — fixed width, slide via margin */
    .sidebar { inline-size: var(--mp-shell-size); margin-inline-start: var(--mp-shell-margin, calc(-1 * var(--mp-shell-size))); }
    ```
    Light-DOM `:has()` on the host works (spike-confirmed: `host.matches(':has([slot=toggle]:checked)') === true` and a document rule applied), and the custom property inherits into the shadow (`--mp-shell-sidebar-size` read as `220px` on the in-shadow `.sidebar`), driving its size — live, on every toggle, no JS.
  - Built-in hamburger suppression in external mode uses a **host attribute** (shadow-visible, unlike slotted state): `<mp-shell external-toggle>` → `:host([external-toggle]) .shell-hamburger { display: none }`.
  - **Cost of external mode:** that one small global rule must be present (shipped as the shell's global CSS and/or emitted by SSR). Self-contained mode needs **no** global CSS — its checkbox, label, and `:checked ~` all live in the shadow.

The same `--mp-shell-margin` custom property is the single lever that the built-in `:checked` rule, the external `:has()` bridge, **and** the responsive `auto`/`breakpoint` `@media` rules all write to — so there is one slide mechanism, not three.

The hydrated (JS) path uses the same checkbox as source of truth in both modes (see reconciliation below), so the navbar hamburger keeps working identically before and after hydration. A consumer who only cares about the JS path may alternatively call `mpShell.toggle()` from a click handler, but the checkbox is what makes it work without JS.

### Hydration reconciliation (the subtle part)

On the client, `@lit-labs/ssr-client/lit-element-hydrate-support.js` patches `LitElement` to **reuse** the existing DSD shadow root (calling `hydrate()`, skipping `render()`). Because the checkbox carries the open/closed state in the DOM, a `willUpdate()` (or reactive effect) reads `inputEl.checked` into the reactive `state`/`open` property on first client update so the JS-driven path and the no-JS checkbox stay in sync across the boundary.

**Client boot order is load-bearing:**
1. `import '@lit-labs/ssr-client/lit-element-hydrate-support.js';`
2. (Firefox/legacy) ensure the `template-shadowroot` polyfill has attached shadow roots.
3. import the component module(s) — which call `customElements.define`.

Violating this order makes Lit create a fresh shadow root and duplicate the DSD content.

## Shared SSR render path

Add `tools/lit-ssr-utils/` (tooling lives under `tools/`, per convention) exporting one helper that wraps `@lit-labs/ssr` (`render` / `renderThunked` + `RenderResultReadable` / `collectResult`) to produce a DSD HTML string for a given tag + attributes. All three framework servers import this one module — a single rendering code path, no per-framework reimplementation.

### Per-framework integration

- **Angular** (`bs-shell` wrapper, `libs/mintplayer-ng-bootstrap/shell/`):
  - Delete the `@if(isServerSide)` dual-template; the wrapper template is a single `<mp-shell>` (with `CUSTOM_ELEMENTS_SCHEMA`), identical for server and client, keeping today's `[state]` / `[breakpoint]` / `setSize()` API so the ng demo is unchanged. (No layout duplication: the wrapper never re-declares the shell structure.)

  **Grounded design (confirmed against `apps/ng-bootstrap-demo/server.ts` + `app.config.ts`):**
  - `server.ts` runs `@angular/ssr`'s `AngularNodeAppEngine` (request-time SSR). `app.config.ts` has **no `provideClientHydration()`** → the client bootstrap is **destructive** (Angular discards SSR DOM and re-renders). This removes the hardest concern (DSD-template-vs-Angular-hydration mismatch) for the demo.
  - **`mp-shell`'s DSD is static chrome** (toggle + `.sidebar-root` + slots + styles); the consumer's sidebar/main is slotted light DOM. So the `<template shadowrootmode="open">` is rendered **once** by the shared `@lit-labs/ssr` util (an empty `mp-shell`) and cached as a constant — *derived from the single source element, not hand-written*.
  - **Recommended mechanism — post-render injection in `server.ts`:** after `AngularNodeAppEngine` produces the HTML, insert the cached DSD-chrome string immediately after each `<mp-shell …>` open tag (the response is HTTP bytes → the browser parser attaches the shadow root → no-JS works). **Do not run `@lit-labs/ssr` inside `@angular/ssr`** — lit-ssr's global DOM shim collides with Angular's Domino globals.
  - **Why this is safe, not a hack:** (1) the injected `<template shadowrootmode>` is consumed by the browser parser into the shadow root and *removed* from the light DOM, so Angular's light-DOM children are untouched; (2) Angular never traverses shadow roots, so it neither re-renders nor mis-hydrates the chrome — the approach is robust whether the app stays destructive or later enables `provideClientHydration()`; (3) on the client, importing the WC module defines `mp-shell`, and Lit renders its shadow normally (destructive) or hydrates it (if hydration is later enabled, via `lit-element-hydrate-support`). It is a targeted constant-string insert, not a general HTML rewriter.
  - **Rejected alternatives:** hand-writing the DSD in an `@if(isServerSide)` branch (re-duplicates the WC's shadow into the wrapper — violates the no-duplication rule); running lit-ssr inside the Angular render pass (DOM-shim/global conflict).
  - ✅ **Validated in-app (2026-06-02).** Wired the constant injection into the demo's `server.ts` and added a throwaway `/shell-spike` route (`apps/ng-bootstrap-demo/src/app/shell-spike/*`). Results: `curl /shell-spike` shows `@angular/ssr` rendering `<mp-shell>` + Angular's slotted sidebar content **and** the injected `shadowrootmode` chrome (route resolved, not the wildcard). In-browser (destructive bootstrap, JS on): `mp-shell` upgrades to its class, **single `.sidebar-root` (no duplication)**, responsive `auto` correct (`220px` at 1100px wide), slotted content projected, the hamburger toggles (wide→`0px`), **0 console errors** (only the benign "Lit dev mode" notice). The post-render constant injection + destructive bootstrap + client `customElements.define` compose exactly as designed.
    - Minor impl note surfaced: the Angular WC class needs `override` on `static styles` / `render()` under the app's `noImplicitOverride`.
- **React** (`libs/mintplayer-react-bootstrap/shell/` + demo): `@lit-labs/ssr-react/enable-lit-ssr.js` imported **first** in the server entry monkey-patches `createElement` so `<mp-shell>` auto-emits its DSD during `renderToPipeableStream`. The existing `@lit/react` `createComponent` wrapper needs no layout code.
- **Vue** (`libs/mintplayer-vue-bootstrap/shell/` + demo): Vue SSR emits the custom-element *tag only*, so the server entry invokes the shared `@lit-labs/ssr` util explicitly for the `<mp-shell>` subtree (the documented `nuxt-ssr-lit` approach, ported minimally to raw Vite + Vue). Existing Vue wrappers gain `import.meta.env.SSR` guards so element-property assignment defers to the client (`onMounted`).

## Hosting / Docker / CI

- **Angular today:** the build uses `outputMode: "server"` (SSR + build-time **prerendering**), but `apps/ng-bootstrap-demo/Dockerfile` copies only `dist/.../browser/browser` and serves it via nginx — so production ships the **prerendered (SSG)** HTML, not request-time SSR. (That is why `view-source` of the live site already shows rendered content like "Signal-first APIs": it was prerendered at build, then served static.) **Decision (user-approved 2026-06-02): drop the static/prerender deploy and run a real Node SSR server for Angular**, matching React and Vue — so all three frameworks uniformly emit the WC's DSD at **request time** via the shared render path, with one consistent hosting model.
- **React & Vue** move from static-nginx to a Node SSR server. Add Vite SSR entries per app: `entry-client.*`, `entry-server.*`, `server.ts` (Express/Hono), per Vite's SSR guide; split build output into `browser/` + `server/`; add `build:server` Nx targets.
- **Dockerfiles:** React & Vue switch stage 2 from `nginx:*-alpine` to `node:*-alpine` running the Express server; Angular likewise runs its server bundle.
- **Traefik / docker-compose:** routing stays Host-header based; each service exposes its Node port (the loadbalancer port labels are updated to match the Express bindings). Three Node processes increase the VPS memory footprint — note for capacity.
- **CI** (`.github/workflows/publish-master.yml`): no structural change (each Dockerfile builds independently); wall-clock may rise modestly due to server bundles.

## Risks & mitigations

- **Angular `@angular/ssr` + lit-ssr DSD interop** — highest uncertainty. *Mitigation:* Phase 0 spike gates the project; pick the cleanest validated approach, reject post-processing hacks.
- **`@lit-labs/ssr*` are `labs`/pre-release.** *Mitigation:* pin exact versions; gate minor bumps on the no-JS + hydration test suite.
- **Firefox DSD + hydration ordering.** *Mitigation:* include the `template-shadowroot` polyfill, attach before hydration; explicit Firefox test in Phase 0.
- **lit-ssr DOM shim is minimal** — WCs touching `window`/`addEventListener`/`getAssignedSlots()` in `connectedCallback` fail server-side. *Mitigation:* keep `mp-shell` server-render purely structural; guard browser-only work behind `isConnected`/first-update on client.
- **Hydration mismatch** if reactive state and DSD checkbox diverge. *Mitigation:* `willUpdate()` reads the DOM checkbox before first client render.
- **Static styles must be truly static** (top-level `static styles`) or a tree-shaker may drop them from SSR output.

## Phased plan (single branch, internal sequencing)

- **Phase 0 — de-risk spike (GATE).** Minimal `mp-shell` + `tools/lit-ssr-utils`. Prove:
  - ✅ **(a) DONE** — built-in (self-contained) sidebar toggles with no JS in a hand-authored DSD page (`docs/prd/_spike-shell-dsd.html`, Chromium via Playwright: `0px → 220px → 0px`, no `<script>`, element never defined).
  - ✅ **(b) DONE (mechanism corrected)** — external-trigger mode works with no JS via the document-level `:has()` → custom-property → shadow `var()` bridge (the original `:host(:has())` idea was disproven here). Toggle on/off verified in Chromium.
  - ✅ **(a2) DONE — `breakpoint`/`auto` responsive + toggle** — full no-JS matrix verified via Playwright `browser_resize` on the no-script page: narrow-untouched→collapsed, wide-untouched→expanded, wide-toggled→collapsed, narrow-toggled→expanded (`@media` on `:not(:checked)` for auto, `@media`+`:checked` for the inverse toggle). Confirms the dropped `breakpoint` behaviour is restorable in pure CSS.
  - ✅ **(c) DONE** — a real Lit `mp-shell` (`docs/prd/_spike-mp-shell.mjs`) rendered by **`@lit-labs/ssr`** (`_spike-ssr-render.mjs`) emits `<template shadowroot="open" shadowrootmode="open">` with `static styles` inlined as `<style>`; on the served output both modes toggle with no JS (Mode A `220px`, built-in hamburger visible; Mode B `220px`, built-in hamburger `display:none` via `:host([external-toggle])`).
  - ✅ **(d) DONE (Chromium)** — `@lit-labs/ssr-client/lit-element-hydrate-support.js` + the element bundle hydrate the server DSD with **no console errors**, the host upgrades to `MpShell`, the shadow keeps **exactly one** `.sidebar-root` (reused, not re-rendered), and both toggles still work after hydration. *Not yet exercised:* checkbox↔reactive-`state` reconciliation (the `willUpdate`/effect sync) — low-risk, the element currently has no JS-driven state mutation.
  - ⬜ **(b/c/d-firefox)** — re-confirm no-JS toggles + hydration in Firefox (DSD + `:has()` + `template-shadowroot` polyfill path).
  - ✅ **(e-angular) DONE** — `@angular/ssr` request-time DSD via post-render constant injection in `server.ts`, validated in the live demo (`/shell-spike`): SSR injects the chrome, destructive client bootstrap + client `define` renders the shadow, toggle + responsive `auto` work, 0 errors. No innerHTML hack, no lit-ssr-inside-Angular.
  - ⬜ **(e-react / e-vue)** — `@lit-labs/ssr-react` and the Vue `@lit-labs/ssr` bridge (the React/Vue SSR servers don't exist yet).

  **The CSS/DSD/lit-ssr/hydration mechanism AND the Angular server interop are now de-risked in Chromium.** Remaining gate items: Firefox parity, and React/Vue SSR server wiring.
- **Phase 1 — build `mp-shell` WC:** 🟢 **largely DONE** — real component lives at `libs/mintplayer-web-components/shell/` (mirrors the `treeview` WC layout: `index.ts`, `ng-package.js`, `src/{index,components,styles,types}`). Shadow template with `sidebar`/default/`toggle`/`hamburger` slots; CSS state machine in `shell.styles.scss` (codegen → `shell.styles.ts`); `state`/`breakpoint`/`size` attributes + `--mp-shell-size` var; `toggle()` method, `open` getter, `statechange` event; manual `observedAttributes` getter per convention. `nx build mintplayer-web-components` passes (`shell/index.mjs` 6.8 kB). **Verified no-JS via `@lit-labs/ssr` DSD of the *built* element:** `auto`@`md` narrow→`0`/wide→`240px`/wide-toggled→`0`, `state="show"`→always `240px`, `state="hide"`→always `0`. *Remaining for Phase 1:* the external-trigger **global** bridge stylesheet (document `:has()` → custom prop) + verifying its outer-vs-`:host` cascade; optional checkbox↔reactive-state niceties.
- **Phase 2 — shared SSR util + deps:** 🟢 **DONE (Angular slice)** — `@lit-labs/ssr@^4.1.0`, `@lit-labs/ssr-client@^1.1.8`, `@lit-labs/ssr-dom-shim@^1.6.0` added to `package.json` (`@lit-labs/ssr-react` deferred to Phase 4). `tools/lit-ssr-utils/gen-shell-chrome.mjs` renders the built `<mp-shell>` → `libs/mintplayer-ng-bootstrap/shell/src/ssr/mp-shell-chrome.generated.ts`; the reusable `injectMpShellDsd(html)` helper + the chrome constant are exported from `@mintplayer/ng-bootstrap/shell`. *(Follow-up: a codegen Nx target should own the regen instead of the manual script.)*
- **Phase 3 — Angular wrapper:** 🟢 **DONE + verified.** `bs-shell` now renders a single `<mp-shell>` (no dual-template) with `CUSTOM_ELEMENTS_SCHEMA` + a **client-only** (`afterNextRender`) WC import, keeping `[state]`/`[breakpoint]`/`setSize()`. `bsShellSidebar` is now an attribute directive setting `slot="sidebar"` (was a structural `TemplateRef` — documented breaking change); `shell-sidebar.directive.ts`, `shell.component.{ts,html,scss}` rewritten; old `sidebarTemplate` path removed. `server.ts` uses `injectMpShellDsd`. The only consumer (`/overlays/shell` demo) updated (`*bsShellSidebar` → `bsShellSidebar`). Throwaway `/shell-spike` route + dir removed. **Verified on the live `/overlays/shell`:** `curl` shows `bs-shell`→`mp-shell` + injected `shadowrootmode` + `slot="sidebar"` + sidebar content; in-browser (destructive bootstrap) the WC upgrades (single `.sidebar-root`), wide `auto`→`240px`, `setSize(20)`→`320px`, `[state]="hide"`→`0`, **0 console errors**. `nx build mintplayer-ng-bootstrap` (ng-packagr) passes.
- **Phase 4 — React SSR:** entry-client/entry-server/server + `enable-lit-ssr.js`; React `BsShell` wrapper; replace `AppShell.tsx` layout.
- **Phase 5 — Vue SSR:** entry-client/entry-server/server + explicit lit-ssr DSD; Vue `BsShell` wrapper; `import.meta.env.SSR` guards; replace `App.vue` layout.
- **Phase 6 — Docker/Traefik/CI:** Node SSR runtime for all three apps (React+Vue new; Angular switched off static/prerender nginx), Traefik port labels per Express binding.
- **Phase 7 — tests + docs:** JS-disabled Playwright (toggle works no-JS), hydration handoff, ARIA (hamburger label, sidebar landmark), demo pages on all three (demo-before-snippet order).

## Files (created / modified)

**Created**
- `libs/mintplayer-web-components/shell/` — full WC (`index.ts`, `ng-package.js`, `src/index.ts`, `src/components/mp-shell.ts`, `src/styles/shell.styles.scss`, generated `shell.styles.ts`).
- `tools/lit-ssr-utils/index.ts` — shared DSD render helper + types.
- `libs/mintplayer-react-bootstrap/shell/` and `libs/mintplayer-vue-bootstrap/shell/` — wrappers.
- React: `apps/react-bootstrap-demo/src/entry-client.tsx`, `entry-server.tsx`, `server.ts`.
- Vue: `apps/vue-bootstrap-demo/src/entry-client.ts`, `entry-server.ts`, `server.ts`.

**Modified**
- `libs/mintplayer-ng-bootstrap/shell/` — wrapper to single `<mp-shell>`; remove `shell-sidebar.directive.ts` template-ref path in favour of the `sidebar` slot (keep `[state]`/`[breakpoint]`/`setSize()` surface).
- `apps/ng-bootstrap-demo/server.ts` + `Dockerfile` — emit WC DSD at request-time SSR; run the Node server bundle (drop static/prerender nginx deploy).
- React/Vue `vite.config.mts`, `project.json`, `Dockerfile` — SSR build outputs + Node runtime.
- `apps/react-bootstrap-demo/src/app/shell/AppShell.tsx`, `apps/vue-bootstrap-demo/src/app/App.vue` — consume `BsShell`.
- `docker-compose.yml` — Traefik loadbalancer ports.
- root `package.json` — `@lit-labs/ssr*` deps (pinned).

## Testing

- **No-JS (the headline):** Playwright with JavaScript disabled — sidebar visible and correctly laid out at wide/narrow viewports; clicking the hamburger opens/closes the sidebar in **both** the built-in mode and the external-trigger mode (a navbar `<label for>` toggling the slotted checkbox); verify on Chromium **and** Firefox (DSD + `:host(:has())` path).
- **Hydration handoff:** with JS enabled, the server DSD hydrates without console hydration errors; the reactive `state` reflects the server checkbox; `toggle()` and `statechange` work post-hydration.
- **API parity:** ng demo behaves as before (`[state]`/`[breakpoint]`/`setSize()`).
- **Cross-framework:** React and Vue demos render the shell server-side (view-source shows `<template shadowrootmode>`), hydrate, and toggle.
- **ARIA:** hamburger has an accessible label; sidebar is a landmark; checkbox is `visually-hidden` but focusable; keyboard toggle works.
- **Build:** `nx build mintplayer-web-components` (codegen-wc + cem), the three wrapper builds, and the three SSR server builds all pass.

## Open questions

1. Final Angular DSD-emission mechanism — decided by the Phase 0 spike.
2. SSR response caching (per-render `@lit-labs/ssr` cost) — likely unnecessary for demo traffic; revisit only if render latency shows up.
3. ~~Whether `mp-shell` should expose a slot for a consumer-supplied hamburger.~~ **Resolved:** yes — `mp-shell` exposes a `toggle` slot so the hamburger can live in a navbar, working with **no JS** via a slotted light-DOM checkbox + `:host(:has([slot=toggle]:checked))` (see "Toggle placement"). Both built-in and external-trigger modes ship, sharing one set of sidebar CSS. The `:host(:has())` cross-boundary behavior is on the Phase 0 spike.
4. Exact `@lit-labs/ssr*` versions to pin at implementation time (current: `@lit-labs/ssr` 4.x, `@lit-labs/ssr-react` 0.3.x; verify at build).

## References

- Repo noscript precedent (Angular-only, for contrast): `docs/prd/navbar-noscript.md`, `docs/prd/tab-control-noscript.md`; `libs/mintplayer-ng-bootstrap/no-noscript/`.
- Light-DOM WC precedent (Bootstrap selectors can't cross shadow): `mp-card` (`createRenderRoot` override).
- Lit SSR docs: lit.dev `/docs/ssr/` (server-usage, client-usage, overview); `@lit-labs/ssr-react` design doc; `nuxt-ssr-lit` for the Vue-side bridge pattern.
