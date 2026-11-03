# How a component's styles reach the page — one component, end to end

This is a walkthrough of the styling mechanism (#437 fronts, #452 per-component Bootstrap), traced for
**one component: the carousel**. It goes in reverse: from the CSS rule on the page back to the SCSS it
came from, and then forward again through bundling and loading. The design and its reasons are in
`docs/prd/per-component-styles-452.md`; the rules are in `CLAUDE.md` ("Bootstrap layering").

The carousel is a D10 component (a manifest the compiler generates the four fronts from). A hand-written
front (the accordion is one) differs in a single step; see [Hand-written fronts](#hand-written-fronts-the-accordion).

## The two sheets a component installs

Every carousel on a page needs two stylesheets, and installs both itself:

| Sheet | What is in it | Source | Registry key |
|---|---|---|---|
| **Bootstrap part** | Bootstrap's own `.carousel*` rules, untouched apart from scoping | `bootstrap/scss/carousel` | `bootstrap-carousel` |
| **Scoped sheet** | What Bootstrap lacks: the no-JS radio state machine, grid stacking, focus rings, reduced motion | `carousel/src/styles/carousel.scoped.scss` | `carousel` |

Neither one is in any global stylesheet. The page baseline (below) holds only page-level Bootstrap.

---

## Reverse: from the page back to the source

### 1. On the page: one `<style>` (or adopted sheet) per key

After a carousel has rendered, the document carries:

```html
<style data-mp-light-styles="bootstrap-carousel" data-mp-order="23">@layer mp.bootstrap, mp.components;
@layer mp.bootstrap.base, mp.bootstrap.components, mp.bootstrap.helpers, mp.bootstrap.utilities;
@layer mp.bootstrap.components { .carousel:where([data-mps]) { position: relative; } … }</style>
<style data-mp-light-styles="carousel">@layer mp.bootstrap, mp.components;
@layer mp.components { .carousel[data-mps=carousel] { display: block; … } … }</style>
```

On a client-only install it is an adopted `CSSStyleSheet` (`document.adoptedStyleSheets`) instead of a
`<style>` tag, with the same text. Either way there is **one copy per key**, however many carousels render.

What the selectors mean:

- `.carousel:where([data-mps])` matches only an element that some @mintplayer component rendered and
  stamped with `data-mps`. A consumer's own `<div class="carousel">` is not matched. `:where()` adds no
  specificity, so the rule weighs exactly what stock Bootstrap's `.carousel` weighs.
- `.carousel[data-mps=carousel]` (scoped sheet) matches only the carousel's own elements, and is meant to
  win over Bootstrap: it is in the later layer `mp.components`.
- The layer statements fix the cascade order no matter which sheet reaches the page first:
  `mp.bootstrap.base` < `mp.bootstrap.components` < `helpers` < `utilities` < `mp.components` <
  any unlayered consumer CSS.
- `data-mp-order="23"` is the carousel's position in Bootstrap's stock import order. Every part shares the
  ONE `mp.bootstrap.components` layer, so between two parts the normal cascade decides: specificity first,
  then source order. The registry inserts part sheets sorted by this number, so an equal-specificity tie
  between two partials resolves exactly as it does in stock `bootstrap.css`.

### 2. Who wrote it: the scoped-style registry

`libs/mintplayer-ui-core/scoped-styles/src/install-scoped-styles.ts`:

- `installLightStyles(key, css, { order, replace })` (alias `installScopedStyles`) is the **only** writer of
  document-level component CSS. It keeps one entry per key (in a `globalThis` registry, so two bundled
  copies of ui-core still share it), and:
  - skips a key that is already installed, including one the server already wrote into `<head>`;
  - inserts an ordered sheet at its sorted position (before the first `<style data-mp-order>` with a higher
    order, or at the sorted index in `adoptedStyleSheets`);
  - with `replace`, upgrades the existing copy in place. This is how a page's verbatim part
    (`bootstrapCarouselPage`) replaces the scoped one under the same key, so a page never holds two copies.
- With no usable `document.head` (React/Vue server render) it records the sheet into every render in
  progress instead; `collectScopedStyles(render)` runs one render and returns the `<style>` tags of what
  that render installed, for the server's `<head>`.
- `writeScopedStyleTag(doc, …)` writes into a given document: Angular SSR uses it with the request's
  `DOCUMENT`.
- `adoptLightStyles(shadowRoot)` mirrors every installed sheet, in order, into a shadow root (for the few
  hand-written shadow-root Lit elements that render a light-tier component inside them).

### 3. Who called the registry: the generated front

Each front's generated component installs both sheets **when it is created**, before its first render:

| Front | File (generated, gitignored) | The call |
|---|---|---|
| Angular | `libs/mintplayer-ng-bootstrap/carousel/src/generated/carousel.component.generated.ts` | in the constructor: `useScopedStyles(bootstrapCarousel.key, bootstrapCarousel.css, { order: bootstrapCarousel.order }); useScopedStyles('carousel', carouselScopedStyles);` |
| React | `libs/mintplayer-react-bootstrap/carousel/src/generated/BsCarousel.generated.tsx` | in the function body: `installLightStyles(bootstrapCarousel.key, …); installLightStyles('carousel', carouselScopedStyles);` |
| Vue | `libs/mintplayer-vue-bootstrap/carousel/src/generated/BsCarousel.generated.vue` | in `<script setup>`: same two calls |
| Lit | `libs/mintplayer-web-components/carousel/src/generated/mp-carousel.generated.ts` | at module level, before `customElements.define`: same two calls |

Each imports `bootstrapCarousel` from `@mintplayer/ui-core/bootstrap/carousel` and `carouselScopedStyles` from
`@mintplayer/ui-core/carousel`.

Angular's `useScopedStyles` (`libs/mintplayer-ng-bootstrap/machine/src/scoped-styles.ts`) is a thin
platform switch: on the server it calls `writeScopedStyleTag(inject(DOCUMENT), …)`, so the tag is in the
server HTML; in the browser it calls `installLightStyles`, which finds that tag and does not add a second
copy.

The same generated code also **stamps the markup**: the compiler adds `data-mps="carousel"` to every
native element in the carousel's templates and to the Angular/Lit host (`hostBag: … 'data-mps': 'carousel'`).
That stamp is what both sheets' selectors match.

> **The extension file is not involved.** `libs/mintplayer-ng-bootstrap/carousel/src/carousel.angular.ts`
> only adds a host directive and an extra input (the slide count). It is imported BY the generated
> component; styles never pass through it.

### 4. Who decided which parts: the manifest

`libs/mintplayer-ui-core/carousel/src/carousel.component.ts` (the D10 manifest):

```ts
style: { scope: 'carousel', bootstrap: ['carousel'] },
```

- `scope` names the scoped sheet (`carouselScopedStyles`) and the `data-mps` value.
- `bootstrap` lists the Bootstrap partials the templates' classes come from.

The manifest does not import anything: it is plain data (`import type` only; Node loads it with the types
stripped). The **component compiler** reads it (`libs/mintplayer-component-compiler/src/components/model.mjs`):

- `groupStyle()` turns `bootstrap: ['carousel']` into the import name `bootstrapCarousel` from
  `@mintplayer/ui-core/bootstrap/carousel` (one subpath entry per part);
- `styleImports()` emits that import in every front;
- `styleInstall()` emits the install calls: the parts first, each with its `order`, then the scoped sheet.

The compiler runs as the Nx target `mintplayer-ui-core:compile-components` and writes into each front's
`src/generated/`.

### 5. The part object: `libs/mintplayer-ui-core/bootstrap/src/parts/carousel.part.ts`

```ts
import { carouselBootstrapPageStyles, carouselBootstrapStyles } from '../../../styles/parts/carousel.bootstrap.styles';
import type { BootstrapPart } from '../bootstrap-part';

export const bootstrapCarousel: BootstrapPart = { key: 'bootstrap-carousel', css: carouselBootstrapStyles, page: false, order: 23 };
export const bootstrapCarouselPage: BootstrapPart = { key: 'bootstrap-carousel', css: carouselBootstrapPageStyles, page: true, order: 23 };
```

- `bootstrapCarousel` is the **scoped** variant that components install.
- `bootstrapCarouselPage` is the **verbatim** variant (plain `.carousel`) for a page that renders raw
  Bootstrap markup of its own. It shares the key, and `page: true` becomes `replace: true` at install
  (`bootstrapInstallOptions` in `install-bootstrap.ts`), so it supersedes the scoped copy instead of adding one.
- `order: 23` is the index of `'carousel'` in `BOOTSTRAP_PARTIAL_ORDER`
  (`tools/scripts/lib/wc-codegen.mjs`), Bootstrap's own import order.

There is **one module and one subpath entry per part**: `bootstrap/<partial>/index.ts` re-exports
`bootstrap/src/parts/<partial>.part.ts` and is published as `@mintplayer/ui-core/bootstrap/<partial>`. There
is no barrel of parts; `@mintplayer/ui-core/bootstrap` holds only the install functions and the type. That
matters for bundling (see [Forward](#forward-bundling-and-loading)). `_conformance/bootstrap-parts-scoping.spec.ts`
checks that each part sits in its own module and entry, with the right key and stock order.

### 6. The CSS strings: `libs/mintplayer-ui-core/styles/parts/carousel.bootstrap.styles.ts` (generated)

```ts
// AUTO-GENERATED — do not edit by hand.
export const carouselBootstrapStyles = `@layer mp.bootstrap, mp.components; … .carousel:where([data-mps]) { … }`;
export const carouselBootstrapPageStyles = `@layer mp.bootstrap, mp.components; … .carousel { … }`;
```

Plain strings, no lit import, gitignored (`libs/**/*.styles.ts`). It is generated from…

### 7. The source: `libs/mintplayer-ui-core/styles/parts/carousel.bootstrap.scss`

```scss
@import "config";                     // functions, variables, maps, mixins: emits no CSS
@import "bootstrap/scss/carousel";    // Bootstrap's own partial, unmodified
```

### How step 7 becomes step 6: the ui-core `codegen` target

`nx run mintplayer-ui-core:codegen` runs `tools/scripts/build-web-components.mjs` over ui-core. For every
`*.bootstrap.scss` it calls `processBootstrapStyles()`:

1. **Compile** the SCSS with Sass (`compileScss`): this produces stock Bootstrap carousel CSS.
2. **Scope** it (`scopeBootstrapPart(css, 'carousel')`, `tools/scripts/lib/scope-bootstrap.mjs`): in every
   selector, the leftmost compound carrying a class the partial owns (`OWNED_CLASSES.carousel =
   /^carousel(-|$)/`) gets `:where([data-mps])` right after that class. Presence, not value: a part is
   shared by every component that renders that markup. A selector with no owned class is an error at build
   time, not a silent global rule.
3. **Layer** both variants (`wrapInLayer(…, 'mp.bootstrap.components')`): the two order statements, then
   the rules inside `@layer mp.bootstrap.components`.
4. **Write** the module (`buildBootstrapPartModule`) only if its bytes changed, so Nx and Vite caches stay warm.

The scoped sheet takes the parallel route: `processScopedStyles()` compiles `carousel.scoped.scss`, rescopes
it with `[data-mps=carousel]` (`rescopeCss`, the value this time), wraps it in `@layer mp.components` and
writes `carousel.scoped.styles.ts` exporting `carouselScopedStyles`.

`codegen` is a `dependsOn` of the ui-core build and test targets, so it never has to be run by hand except
while iterating on SCSS.

---

## Forward: bundling and loading

### What is global, and how it gets there

Only the **page baseline**: `libs/mintplayer-ui-core/styles/bootstrap.scss`. It declares the layer order
and holds root, reboot, type, images, buttons, helpers and the utility API. Nothing in it mentions a
carousel.

| App | How the baseline is loaded |
|---|---|
| Angular | `apps/ng-bootstrap-demo/src/styles.scss` → `@forward` of `libs/mintplayer-ng-bootstrap/_bootstrap.scss` → `@use '@mintplayer/ui-core/styles/bootstrap'`. Built into `styles.css`. |
| React / Vue | `src/bootstrap.scss` → `@use` of the same file, linked from `index.html` ahead of `styles.css`. |
| No build step | the prebuilt `@mintplayer/ui-core/styles/bootstrap.css`. |

`_conformance/bootstrap-baseline-superset.spec.ts` keeps the baseline page-level only.

### Where the carousel's CSS is bundled: in JavaScript, in the carousel's chunk

The two sheets are **JS string constants**, so they are bundled wherever the code that imports them goes:

1. A demo page that renders a carousel is a lazily loaded route.
2. That page imports the front's component, e.g. `BsCarouselComponent`.
3. The generated component imports `bootstrapCarousel` (→ `carousel.part.ts` → `carousel.bootstrap.styles.ts`)
   and `carouselScopedStyles`.
4. The bundler (esbuild for Angular, Vite/Rolldown for React and Vue) puts those modules in **that route's
   chunk**. ui-core is `"sideEffects": false` and each part is its own entry, so importing
   `@mintplayer/ui-core/bootstrap/carousel` pulls in that one part and none of the other 25.

So the carousel's CSS is downloaded only when a user visits a page with a carousel, and a consumer who never
renders one bundles none of `.carousel`.

**Why one module per part matters:** bundlers assign whole *modules* to chunks. When all parts lived in one
module, the first chunk that needed any part (the app shell's) received every part's CSS: 390 KB in the
React entry chunk. With one module per part, it is 265 KB, holding only the parts the shell renders.

**Why one ENTRY per part, not a barrel of part modules:** Rollup (React, Vue) tree-shakes a barrel's
re-exports per module, but esbuild (Angular's application builder) assigns modules to chunks by file-level
reachability. The Angular machine entry imports the barrel for `useBootstrap`, the shell reaches the machine
entry (the theme toggle), so every part the app used anywhere was reachable from the shell and landed in an
initial chunk: the card, nav and navbar CSS were in the main bundle of a minimal SSR app (measured in the
proof repo). With one entry per part and a part-free `@mintplayer/ui-core/bootstrap`, nothing the shell
imports reaches a part it does not install.

The published library keeps this property. `libs/mintplayer-ui-core/vite.config.mts` adds every
`bootstrap/<partial>/index.ts` as its own build entry and subpath export (`bootstrap/<partial>/index.mjs`).

### When it is loaded: at component creation, and in the server HTML

- **Browser, client navigation:** the chunk loads → the component is created → `installLightStyles` adopts
  the two sheets (once) → the first render already has its styles.
- **Angular SSR:** the server creates the component → `useScopedStyles` writes both `<style>` tags into
  the response's `<head>`, the part at its stock position (the head is walked with `childNodes`, because
  Angular's server DOM does not make `children` iterable). On hydration the client's install finds the tags
  by `data-mp-light-styles` and adds nothing.
- **React / Vue SSR:** `entry-server` wraps its render in `collectScopedStyles(() => …)`, which opens a
  collector for that render; every install the render makes lands in it, and the returned tags go into
  `<!--app-head-->` ahead of the transfer state. The record is **per render**: `/` never carries the card
  part because `/card` was rendered first. Renders that overlap in time (both awaiting a lazy route) see each
  other's installs: a superset, never a miss. The rule this puts on a front: **install while rendering** (the
  component body, Vue `setup`), never once at module scope — a module-scope install runs before any
  collector exists, and no page would get that sheet.
- **No JavaScript:** the server HTML already carries the `<style>` tags, so the page looks the same.

### Raw Bootstrap markup on a page

A page that writes its own `<div class="carousel">` (not `bs-carousel`) installs the verbatim part from
the page component itself: Angular `useBootstrap(bootstrapCarouselPage)` in the constructor;
React/Vue/plain `installBootstrap(bootstrapCarouselPage)`. It rides that page's chunk, and replaces a scoped
copy if a component installed one first. There is no global opt-in.

---

## Hand-written fronts (the accordion)

The accordion's fronts are hand-written, not generated, so there is no manifest `bootstrap:` list and no
compiler step. Each front makes the same call itself:

- Angular `libs/mintplayer-ng-bootstrap/accordion/src/accordion/accordion.component.ts`:
  `useBootstrap(bootstrapAccordion)` in the constructor, plus `useScopedStyles(…)` for its scoped sheet,
  and it stamps `data-mps` on its own elements.
- React `BsAccordion.tsx` and Lit `mp-accordion.ts`: `installBootstrap(bootstrapAccordion)`.

`useBootstrap` / `installBootstrap` are the same `installLightStyles` call with `bootstrapInstallOptions(part)`
(`{ replace: part.page, order: part.order }`). Everything from step 1 and from step 5 down is identical.

---

## The chain at a glance

```
bootstrap/scss/carousel                                  (npm: bootstrap)
  └─ styles/parts/carousel.bootstrap.scss                 @import config + the partial
       └─ [nx codegen → build-web-components.mjs]         compile → scope :where([data-mps]) → layer
            └─ styles/parts/carousel.bootstrap.styles.ts  (generated) scoped + page strings
                 └─ bootstrap/src/parts/carousel.part.ts  bootstrapCarousel / …Page, key + order 23
                      └─ re-exported by @mintplayer/ui-core/bootstrap
carousel/src/carousel.component.ts                        manifest: style { scope, bootstrap: ['carousel'] }
  └─ [nx compile-components → model.mjs styleInstall]
       └─ <front>/carousel/src/generated/*                imports bootstrapCarousel + carouselScopedStyles,
                                                          installs both on creation, stamps data-mps
            └─ useScopedStyles (Angular) / installLightStyles (React, Vue, Lit)
                 └─ scoped-style registry                 one copy per key, stock order, SSR <head>
                      └─ the page                         <style data-mp-light-styles="bootstrap-carousel" data-mp-order="23">
```

## Guard rails

| Spec | What it pins |
|---|---|
| `libs/mintplayer-ui-core/_conformance/bootstrap-baseline-superset.spec.ts` | the baseline holds page-level partials only; its layer list matches `BOOTSTRAP_SUBLAYERS` |
| `libs/mintplayer-ui-core/_conformance/bootstrap-parts-scoping.spec.ts` | every part is scoped, one module per part, stock order |
| `libs/mintplayer-ui-core/_conformance/no-bootstrap-partials-in-scoped.spec.ts` | a scoped sheet never `@import`s a Bootstrap partial (the part ships it) |
| `libs/mintplayer-ui-core/scoped-styles/src/install-scoped-styles.spec.ts` | ordered inserts, replace in place, SSR collection, shadow mirror |
| `tools/scripts/lib/scope-bootstrap.spec.ts` | the selector scoping rules |
