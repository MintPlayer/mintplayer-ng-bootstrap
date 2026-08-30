# PRD — Styling consumer-authored content that a web component mounts inside its shadow root

Status: **Proposed** (2026-08-30). Not started, no branch, no PR.
Plan: [shadow-adopted-content-styling-plan.md](./shadow-adopted-content-styling-plan.md)
Related: issue **#408**; the unmerged branch `feat/wc-style-encapsulation` and its
[wc-style-encapsulation.md](./wc-style-encapsulation.md) PRD (**not on `master`** — see §7).

Grounded in a 4-agent investigation (2026-08-30): the light-style registry audit on
`feat/wc-style-encapsulation`; Angular/React/Vue style-host mechanics read from the *installed*
`node_modules` (Angular 22.0.8); a platform-CSS/standards survey; and a full blast-radius map of the
repo. Every claim carries a `file:line` or a spec/bug link.

Direction set by the user during the investigation (2026-08-30), in two corrections that reshaped
the design — both recorded in §2 as goals:

> "That would load tons of unnecessary styles globally, even when someone never ever uses bootstrap's
> card.scss styles anywhere, they'll still be included in the main bundle. We can't do that." … "What
> I meant with *styles per component*."

> "I'm willing to compromise on the shadowDOM requirement. But I want to be absolutely certain that
> the bootstrap styles don't affect other angular components. If it's an option, we could replicate
> angular's ViewEncapsulation.Emulated system on our webcomponent library somehow to make sure the
> styles don't leak out."

## 1. Problem

Put a styled framework component inside a datatable row and it renders naked:

```html
<ng-container *bsRowTemplate="let artist">
  <td class="text-nowrap">
    {{ artist?.name }}
    <bs-badge [type]="colors.success">active</bs-badge>   <!-- unstyled -->
  </td>
</ng-container>
```

`apps/ng-bootstrap-demo/src/app/pages/enterprise/datatables/datatables.component.html:32-37`
reproduces it on `http://localhost:4200/enterprise/datatables`.

The mechanism is not a cascade subtlety, it is tree scope. `BsDatatableComponent` builds each row
with `this.vcr.createEmbeddedView(tpl.templateRef, context)`
(`libs/mintplayer-ng-bootstrap/datatable/src/datatable/datatable.component.ts:360`) and hands
`viewRef.rootNodes` to the web component as a `rowRenderer` callback (`:369-370`). `mp-datatable`
invokes that callback (`libs/mintplayer-web-components/datatable/src/components/mp-datatable.ts:1012`)
and lit binds the returned nodes into a `<tr>` **inside its shadow root** (`:1002-1003`).

Angular, meanwhile, put `BsBadgeComponent`'s compiled CSS in `document.head`. A document-level
stylesheet does not apply inside a shadow root. The nodes are correct, the selectors are correct, and
nothing matches.

### 1.1 The badge is the visible symptom, not the extent

The same page is already broken in four other places nobody noticed, because those failures degrade
layout instead of erasing content:

| Location | Inert CSS | Why |
|---|---|---|
| `datatables.component.html:33,38,39,93-95` | `text-nowrap` | inert, but **not visible**: the datatable's own `tbody td { white-space: nowrap }` (`datatable.styles.scss:89`) already supplies the effect. The class contributes nothing |
| `datatables.component.html:91,132-141` | `text-muted small fst-italic`, `font-monospace` | `datatable.styles.scss` declares no Bootstrap utilities (0 grep hits for `text-muted`/`utilities`) |
| `treeview.component.html:17-20` | `me-2` on the icon span | no spacing utility inside the treeview shadow root |
| `query-builder.component.html:29-35` | `.custom-date-editor` (`width:auto`) | page-level emulated rule; the editor renders full-width. `.form-control` *does* work — only because `mp-query-condition.element.scss:17` imports Bootstrap's form-control **into the shadow root** |

**Measured in Chromium against the running demo (2026-08-30)**, by inserting identical probe
elements inside the datatable's shadow root and in the light DOM and diffing computed styles:

| probe | inside shadow root | light DOM |
|---|---|---|
| `div.text-nowrap` → `white-space` | `normal` | `nowrap` |
| `span.me-2` → `margin-right` | `0px` | `8px` |
| `span.text-muted` → `color` | `rgb(222,226,230)` | `rgba(222,226,230,0.75)` |
| `span.fst-italic` → `font-style` | `normal` | `italic` |
| `span.font-monospace` → `font-family` | `system-ui, …` | `SFMono-Regular, Menlo, …` |
| `span.small` → `font-size` | `16px` | `14px` |

and the badge itself, in the shadow root: `background-color: rgba(0,0,0,0)`, `border-radius: 0px`,
`padding: 0px`, `display: inline` — against correct markup,
`<span _ngcontent-ng-c1756937229 class="badge bg-success">active</span>`. The DOM is right; only the
CSS is out of reach. This is the control experiment for the whole PRD: document CSS provably does
not enter the shadow root, and the failure is tree scope, not the cascade.

This drives the choice of fix. `text-nowrap` and `me-2` come from the app's global `styles.scss`,
which does not flow through Angular's component-style plumbing at all — so **any fix that only
transports *component* CSS leaves half the page broken.**

### 1.2 It is not a datatable bug — six components have it

| WC | API | Insertion point |
|---|---|---|
| `mp-datatable` | `rowRenderer`, `cellRenderer`, `headerRenderer` | `mp-datatable.ts:1002`, `:1031`, `:918` |
| `mp-treeview` | `nodeRenderer`, `iconResolver` | `mp-treeview.ts:350`, `:353` (`unsafeHTML`) |
| `mp-tree-select` | 7 template properties + a forwarded `nodeRenderer` | `mp-tree-select.ts:690,760,769,781,823,838,854,862,877` |
| `mp-query-condition` | `editorRegistry` → `EditorHandle.element` | **`mp-query-condition.element.ts:144`** — a direct `mount.appendChild(consumerElement)` |
| `mp-select` | `optionRenderer` | `mp-select.ts:454` (`unsafeHTML` inside `<option>`) |
| `mp-file-manager` | `iconResolver` | `:681`, forwarded into the nested treeview |

The ~30 slot-based WCs (accordion, card, carousel, navbar, ribbon, shell, tab-control, tile-manager,
timeline, …) are **not** affected and must stay that way: slotted nodes never leave the light DOM.

Wrapper asymmetry: only **Angular** bridges framework-rendered DOM into these callbacks (5
components), plus **Vue for `tree-select` alone** (`BsTreeSelect.vue:97-131`). Every React wrapper is
a bare `@lit/react` passthrough (0 hits for `createPortal` in the whole React lib). So today this is
overwhelmingly an Angular-facing defect — but the fix must not be Angular-shaped, because the React
and Vue wrappers will grow the same bridges.

## 2. Goals

1. Consumer content renders **identically** whether it lands in the light DOM or inside one of our
   components — their component styles, our `bs-*` styles, and Bootstrap utility classes alike.
2. One mechanism, shared by every render-callback component and every framework. Not per-component
   migration, not per-framework special cases.
3. **Our Bootstrap subset must not affect anything outside the component it belongs to.** This is the
   user's hard requirement and the acceptance bar for dropping shadow DOM: a rule shipped for
   `mp-card` must be *provably* incapable of matching an element in some unrelated Angular component.
4. **A component's CSS is bundled and loaded only where that component is used.** A page that never
   renders a card must not pay for `bootstrap/scss/card`. Note this is a *bundling* requirement, not
   a prohibition on document-level installation — see §4.1.
5. No CSS is duplicated: not across shadow roots, not between a document copy and a shadow copy, not
   between build outputs.
6. Shadow DOM is kept **where it is not the obstacle**. The user has explicitly relaxed this for the
   affected components; the ~30 slot-based components keep their shadow roots unchanged.

## 3. Non-goals

- Making `::part`/`exportparts` reach consumer DOM. It cannot, by spec — `::part(x)::part(y)` "never
  matches anything" ([CSS Shadow Parts](https://www.w3.org/TR/css-shadow-parts-1/)).
- Waiting for a platform feature (§4.5).
- Converting slot-based components. They do not have the problem.

## 4. Options considered

### 4.1 Correction: document-level installation is not the thing to avoid

An earlier draft rejected a document-installed shared sheet on Goal 4. That was wrong, and the
distinction matters for everything below.

Angular does precisely this: component CSS is injected into `document.head` on first instantiation,
and it satisfies "styles per component" because **the CSS lives in the component's own chunk**. A
lazy route keeps it out of `main.js`; a page that never instantiates the component never installs it.

So Goal 4 is a statement about *where the bytes are bundled*, not about *where the sheet is
installed*. `installLightStyles` (`light-dom/src/install-light-styles.ts:83-95`) — which appends a
`<style data-mp-light-styles="key">` to `document.head` from the component's own module, guarded and
idempotent — satisfies Goal 4 exactly as Angular does. What would violate Goal 4 is putting these
partials in the app's global `styles.scss`, which nothing here proposes.

What document-level installation *does* cost is encapsulation — which is Goal 3, and is the entire
subject of §4.6.

### 4.2 Rejected as primary: bridge Angular's `SharedStylesHost`

Angular 22.0.8 exposes a 4-method style host — `addStyles`/`removeStyles`/`addHost`/`removeHost`
(`node_modules/@angular/core/types/core.d.ts:7347-7376`, exported as `ɵSharedStylesHost`) — wired as
an overridable DI provider (`platform-browser/fesm2022/_browser-chunk.mjs:345-351`). `addHost(node)`
replays every registered style into that node and keeps replaying later ones
(`_dom_renderer-chunk.mjs:236`, `:204-214`); Angular's own `ShadowDomRenderer` uses it (`:698`).

Replaying is safe: emulated encapsulation attribute-qualifies every rule (`[_nghost-ng-cXXX] .badge`),
and the compiler scopes only the part *before* `::ng-deep` (`compiler.mjs:7190-7212`).

Two things stop it being the answer:

- **It cannot carry the global layer.** `styles.scss` is emitted by the builder as a `<link>` and
  never enters `SharedStylesHost`, so `text-nowrap` / `me-2` stay broken (§1.1).
- **It is per-framework.** React and Vue have no style host — their CSS is bundler-owned — so each
  framework needs its own bridge, against Goal 2.

Retained as an optional escape hatch (§6), not the mechanism.

### 4.3 Rejected: `ViewEncapsulation.ShadowDom` on the wrappers

Attaches a shadow root **per instance** (`_dom_renderer-chunk.mjs:694`) — one per badge cell in a
virtualized table — *and* in v21+ still calls `addHost`, so each root receives a copy of every app
component style ([angular#35039](https://github.com/angular/angular/issues/35039)). Silently
downgraded to Emulated during SSR (`:407-412`), so server and client trees diverge. Fails Goals 5
and 2.

### 4.4 Rejected: copy the document's `<style>`/`<link>` nodes into each shadow root

Rejected on encapsulation, not performance. (Performance is a non-issue: all three engines dedupe —
Blink keys a `text_to_sheet_cache_` off style text
([style_engine.h](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/core/css/style_engine.h)),
WebKit caches inline styles and shares the resolver across identical shadow trees
([bug 270521](https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg211411.html)), Gecko
shares `CascadeData` ([bug 1707116](https://bugzilla.mozilla.org/show_bug.cgi?id=1707116)).) It drags
the entire page's CSS inside a component built to be encapsulated, gives two sources of truth, and
cannot read a cross-origin CDN stylesheet (`cssRules` throws `SecurityError`).

### 4.5 Rejected: wait for the platform

- `attachShadow({mode:'open-stylable'})` — [WICG/webcomponents#909](https://github.com/WICG/webcomponents/issues/909), open since Dec 2020, no spec text, no implementation.
- `@sheet` + declarative `adoptedstylesheets` on DSD — [csswg-drafts#11509](https://github.com/w3c/csswg-drafts/issues/11509), [whatwg/html#10673](https://github.com/whatwg/html/issues/10673). Most active line of work; **no Chrome Platform Status entry, no blink-dev Intent** as of Aug 2026.
- `:host-context()` — **deprecated**, removed after vendor opposition, never shipped in Firefox.
- `@scope` — Baseline Dec 2025, measured **not** to cross the shadow boundary
  ([Adobe's shadow-DOM CSS matrix](https://shadow-dom-css.adobe.com/features/scope)). It is a
  light-DOM tool — relevant only in §4.6's world, as a possible future simplification of the scoping
  transform.

### 4.6 **Recommended: emulated encapsulation for the six affected components**

Drop the shadow root on the six components that adopt consumer DOM, and replace the boundary with a
build-time scoping transform — Angular's `ViewEncapsulation.Emulated`, implemented for our WCs.

Once those components render in the light DOM, the problem **ceases to exist rather than being
worked around**: consumer content is in the document tree, so the page's stylesheets, the consumer's
own component CSS, `bs-badge`'s Bootstrap import and every utility class apply to it by ordinary
cascade. Nothing is transported, mirrored, re-parsed or duplicated.

| Goal | How |
|---|---|
| 1 — identical rendering | The content never leaves the tree whose stylesheets style it |
| 2 — one mechanism | One transform + one install helper, framework-agnostic |
| 3 — no leakage out | The scoping transform; see the guarantee below |
| 4 — per-component bundling | CSS ships in the component's module and installs on first use, exactly as Angular does |
| 5 — no duplication | One sheet per component, installed once, idempotent by key |
| 6 — shadow DOM kept where possible | The ~30 slot-based components are untouched |

**The transform already exists.** `feat/wc-style-encapsulation` built `rescopeCss`
(`tools/scripts/lib/rescope-css.mjs`, postcss + postcss-selector-parser, both already workspace
dependencies): every compound selector gains `[data-mps=<scope>]`, `:host` forms map to the element's
tag name, and the loud-failure contract throws on `::slotted`, `:host-context`, and `:root`/`html`/
`body` subjects rather than emitting dead rules. Templates stamp the attribute via `scopedHtml(scope)`;
imperative DOM uses `stampScope`. `[data-mps="card"]` is the same device as `[_ngcontent-c3]`.

This PRD's contribution is to **generalize it from two leaves (badge, card) to real components**, and
to make the no-leak property a verified guarantee rather than a code-review promise (§5.2).

**The honest risks**, all of which M0 must settle before any component is converted:

1. ~~**Lit in the light DOM.**~~ **RESOLVED — spiked in Chromium 2026-08-30, passes.** A
   `LitElement` with `createRenderRoot() { return this; }` rendering a dynamic keyed table, with
   stable consumer-authored nodes supplied by a render callback, survived every transition
   `mp-datatable` performs: forced re-render, reorder/sort, whole-page key replacement, **template
   shape change** (table → empty-state `<div>` → table), and zero-rows → recover. Consumer node
   count, DOM order and **node identity** were correct at every step, with no duplication or
   orphaning. The consumer span computed `background-color: rgb(25,135,84)` (Bootstrap's global
   `.bg-success`) and its `<td class="text-nowrap">` computed `white-space: nowrap` — i.e. **global
   utilities reach consumer content once it is in the light DOM**, which is the entire thesis.

   The CLAUDE.md trap (a render value transition clears everything after lit's marker) does **not**
   apply to this design, and the distinction matters for the rewritten admission rule: it bites
   *pre-existing light children that the host owns but lit does not manage*. Consumer nodes here are
   passed **as binding values** through the render callback, so lit tracks them in its own parts and
   moves them correctly. `rowRenderer` already has exactly this shape.

   Residual: the spike models the datatable's render patterns, not its literal template (no virtual
   scroll, tree mode, or `unsafeHTML`). M3 must re-verify against the real component.
2. **Leak *in*, not out.** Emulated encapsulation is one-directional: page CSS now reaches our
   internals. Angular has the same property and it is broadly accepted, but a Bootstrap-styled page
   restyling a datatable's internal `<table>` is a real behavioural change that must be documented,
   not discovered.
3. **`@extend` from `:host` does not unify into compounds** (recorded on the other branch), so rules
   like `.badge:empty` need restating as `:host(:empty)`. Applies to every stylesheet converted.
4. **SSR/DSD.** None of the six has an `ssr/` chrome today (only accordion, carousel, dropdown-menu,
   navbar, shell do), so nothing regresses — but the light-DOM path changes what the SSR markup looks
   like and needs its own emission of the scoped `<style>`.

## 5. Design

### 5.1 Per-component pipeline

For each converted component `<name>`:

- `<name>.light.scss` → codegen emits `<name>.light.styles.ts` carrying the **rescoped** CSS, via the
  existing `rescopeCss`. Generated, gitignored, never hand-edited.
- The element calls `installLightStyles('<scope>', sheet)` immediately before `customElements.define`
  — idempotent per key, SSR-guarded on `document.head` (not `typeof document`: Angular's SSR DOM shim
  provides a `document` with no usable head — the trap already hit once, commit `3cb27877`).
- The element's template uses `scopedHtml('<scope>')`, never bare `html`. Imperative DOM uses
  `stampScope`.
- `createRenderRoot() { return this; }`.

### 5.2 The no-leak guarantee (Goal 3)

The user's requirement is certainty, so this is enforced in three independent places rather than by
convention:

1. **Transform-level.** `rescopeCss` appends `[data-mps=<scope>]` to *every* compound it emits; a
   selector it cannot scope meaningfully throws at build time. Opting a rule out requires an explicit
   `/*! @mps-global */` comment and authoring it in final form.
2. **Build-level conformance test.** A test parses every generated `*.light.styles.ts` and asserts
   that every selector either contains the component's own scope attribute / tag name, or is inside
   an explicitly-marked global escape. No exceptions, no allowlist that grows silently. This is the
   artefact that makes the guarantee checkable on every CI run instead of trusted.
3. **Runtime test.** A spec renders each converted component adjacent to a set of decoy Angular
   components carrying colliding class names (`.badge`, `.card`, `.table`, `.form-control`) and
   asserts their computed styles are byte-identical with and without our component on the page.

Together these answer "am I certain the Bootstrap styles don't affect other Angular components?" with
a build failure and a red test, not a review comment.

### 5.3 Scope of conversion

Convert the six components in §1.2 that adopt consumer DOM. Leave every slot-based component on
shadow DOM — they do not have the problem, and converting them would trade a working encapsulation
boundary for an emulated one for no benefit.

`mp-select` and `mp-file-manager` likely need no change at all (string-returning resolvers, own
styles); confirm and record rather than convert.

### 5.4 Invariants

- Every element a converted component renders carries the scope attribute, in all three frameworks —
  including JS that decorates consumer content.
- The component's stylesheet may not style consumer-authored content except through documented class
  contracts marked `@mps-global`.
- `adoptedStyleSheets`, not injected `<style>` nodes, for anything still shadow-rooted: six
  components call `shadowRoot.replaceChildren()` during destructive DSD handoff (`mp-carousel.ts:114`,
  `mp-accordion.ts:137`, `mp-dropdown-element.ts:25`, `mp-navbar.ts:59`, `mp-navbar-element.ts:14`,
  `mp-shell.ts:61`).
- Tier L follows the page's theme: it expects Bootstrap `:root` tokens and must not re-declare them.

## 6. Escape hatch (same PR)

For a consumer who hands us a detached element they built themselves and expects our component to
style it, document the §4.2 bridge as an opt-in: an `ɵSHARED_STYLES_HOST` override minting one
constructed sheet per registered component style into a registry that adopting roots mirror —
registry-only, never `document.adoptedStyleSheets`. Ship it only if M0 shows a converted component
still cannot cover a real case; otherwise record it as a considered-and-unneeded option.

## 7. Relationship to `feat/wc-style-encapsulation`

That branch is **not on `master`** (`git ls-files` returns nothing for `light-dom/`; the
`*.light.styles.ts` and `ssr/` files in the working tree are untracked build leftovers). It already
contains: the `light-dom` entrypoint (`installLightStyles`, `adoptLightStyles`, `scopedHtml`,
`stampScope`), `rescopeCss` + its spec, the codegen wiring in `build-web-components.mjs` and
`project.json`, SSR emission, and CLAUDE.md's light-tier authoring rules.

**This PRD should be built on that branch, not beside it.** It keeps the branch's transform and
install machinery wholesale and changes its *strategy*: from "migrate admissible leaves to Tier L,
and bridge the rest by mirroring sheets into shadow roots" to "convert the components that adopt
consumer DOM, so there is nothing to bridge." Concretely, `adoptLightStyles` and its two call sites
(`mp-datatable.ts:645`, `mp-treeview.ts:86`) become unnecessary for the converted components, and the
Tier-L admission rule in CLAUDE.md must be **rewritten** — its current form (`render()` is `nothing`
or a single static wrapper) excludes exactly the components this PRD converts, and can only be
relaxed if M0's lit-in-light-DOM spikes pass.

## 8. Migration and documentation

- CLAUDE.md: rewrite the light-tier admission rule; document the leak-*in* direction (§4.6 risk 2) as
  a supported property with guidance.
- A migration note per framework: what changes for consumers of the six components (chiefly that
  page CSS now reaches component internals, and `::part` selectors targeting them stop applying).
- `treeview-node-template.directive.ts:16` documents `<span class="badge bg-secondary">` as
  recommended usage — doubly dead today; update it.
- Demo pages keep the `<bs-badge>` from this investigation as the visible regression canary.

## 9. Decisions (settled with the user, 2026-08-30)

1. **Leak-in is accepted**, on the grounds that it is exactly what `ViewEncapsulation.Emulated` does
   everywhere else in a consumer's app. Page CSS reaching a converted component's internals is a
   documented, supported property, not a defect. §8's migration note carries the surface, measured
   by S5.
2. **Scope: all six** components that adopt consumer DOM (§1.2), including confirming that
   `mp-select` and `mp-file-manager` need no change.
3. **Base: fresh from `master`**, porting `rescopeCss` and the codegen wiring across. The badge/card
   Tier-L migrations and `adoptLightStyles` on `feat/wc-style-encapsulation` are **not** carried
   over — this design makes them unnecessary (see below).
4. **Fallback if the light-DOM approach had failed** (delegated to the implementer, now moot since
   S1 passed): cell-granularity slotting, **not** the §4.2 bridge. Rationale, and the user's own
   framing of it: a bridge that transports component CSS still cannot deliver *global* utility
   classes into a shadow root, so it fails the actual bar. Slotting is the only alternative that
   keeps shadow DOM and still lets utilities apply, because the content never crosses the boundary.

### 9.1 CORRECTION (2026-08-30, found by measurement): the nesting rule

An earlier draft of this PRD said `adoptLightStyles` becomes unnecessary. **That was wrong**, and
the browser caught it right after M3. A light-tier component's sheet is installed at *document*
level, so a component that keeps its shadow root but renders a light-tier component **inside** it
starves that child — the same #408 failure, one level up. Measured: `mp-datatable` inside
`mp-file-manager`'s shadow root computed `block` / `visible` / `700` instead of `flex` / `auto` /
`600`.

The corrected rule, now enforced by `_conformance/light-styles-nesting.spec.ts`:

> **Any shadow-DOM component that renders a light-tier component inside its shadow root must mirror
> the registry with `adoptLightStyles(this.renderRoot)`**, and dispose on disconnect.

`mp-file-manager` is the only such host in the repo today. This is also why converting a component
can force its *ancestors* to be considered: a light-tier component nested in a shadow root is
unstyled unless that ancestor mirrors.

### 9.2 Consequence: the badge migration is no longer needed

`feat/wc-style-encapsulation` converts `bs-badge` into a Tier-L web component and strips its
`::ng-deep` Bootstrap import, specifically so it survives inside a datatable. Once the datatable is
light-DOM, **the existing Angular `bs-badge` works untouched** — as does every one of the 23
Angular wrapper stylesheets that import a Bootstrap partial. That branch's per-component migration
path collapses from "23 components, one at a time" to "zero". This is the strongest argument for the
approach and should be stated in the PR description.

## 10. Verification

- **M0 spikes decide the design.** Nothing is converted until lit-in-light-DOM is measured in three
  engines.
- The §5.2 triple guarantee: transform throws, conformance test, decoy-component runtime test.
- e2e: `<bs-badge>` in a datatable row has non-default computed `background-color` **and**
  `border-radius`, in all three demo apps; plus the four latent utility breakages from §1.1.
- axe pass on datatable / treeview / tree-select after conversion — removing a shadow root changes
  the accessibility tree's shape, and IDREF resolution (`aria-labelledby` etc.) changes meaning when
  a boundary disappears. This is a **feature** for a11y (IDREFs now work across what used to be a
  boundary) but must be verified, not assumed.
- Firefox smoke pass.
